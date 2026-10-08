/* CTEM-Nexus · motor de priorización y rutas de ataque (sin DOM, sin dependencias).
 *
 * Es la referencia del cálculo. backend/app/engine/prioritization.py es una traducción línea a línea:
 * mismas constantes, mismo orden de operaciones, mismo redondeo y mismos textos. La paridad se comprueba
 * con shared/golden-demo.json en las pruebas de los dos lados. Fórmula documentada en docs/SCORING.md. */
import {
  BAND_LABEL, BAND_THRESHOLDS, CHOKE_MIN_PATHS, CHOKE_SHARE, DEFAULT_PROFILE, ENGINE_VERSION, EXPLOIT_PUBLIC_FLOOR,
  INTERNET_ID, MAX_PATHS, MAX_PATH_DEPTH, NOT_EXPLOITABLE_FACTOR, PROFILES, PROXIMITY_HOPS, SLA_DAYS,
  VALIDATED_BONUS, WEIGHTS, type Weights,
} from './constants';
import type {
  Asset, AttackPath, Band, ChokePoint, EngineInput, EngineResult, Factor, Finding, GraphAnalysis,
  GraphEdge, GraphNode, ProfileId, ScoredFinding, Summary,
} from './types';

/** Redondeo a una décima, «mitad hacia arriba» (igual que math.floor(x * 10 + 0.5) / 10 en Python). */
export const r1 = (x: number): number => Math.floor(x * 10 + 0.5) / 10;
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
/** Número con coma decimal y una cifra: 7.5 → «7,5». */
export const fmt = (x: number): string => r1(x).toFixed(1).replace('.', ',');

export const isActive = (f: Finding): boolean => f.status === 'abierto' || f.status === 'validado';
const enablesMovement = (f: Finding): boolean => f.status !== 'mitigado' && f.status !== 'no_explotable';

export function bandFor(score: number): Band {
  for (const [band, min] of BAND_THRESHOLDS) if (score >= min) return band;
  return 'baja';
}

/* ───────────────────────── Grafo ───────────────────────── */

export function buildGraph(input: EngineInput): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const ids = new Set(input.assets.map((a) => a.id));
  const nodes: GraphNode[] = [
    { id: INTERNET_ID, label: 'Internet', type: 'internet', criticality: 0, entry: false, crown: false },
    ...[...input.assets]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((a) => ({ id: a.id, label: a.name, type: a.type, criticality: a.criticality, entry: a.internetExposed, crown: a.criticality === 5 })),
  ];
  const map = new Map<string, GraphEdge>();
  const add = (from: string, to: string, technique: string, findingId: string | null, manual: boolean) => {
    if (from === to) return;
    if (from !== INTERNET_ID && !ids.has(from)) return;
    if (!ids.has(to)) return;
    const id = `${from}->${to}`;
    let e = map.get(id);
    if (!e) { e = { id, from, to, techniques: [], findingIds: [], manual: false }; map.set(id, e); }
    if (!e.techniques.includes(technique)) e.techniques.push(technique);
    if (findingId && !e.findingIds.includes(findingId)) e.findingIds.push(findingId);
    if (manual) e.manual = true;
  };
  for (const a of input.assets) if (a.internetExposed) add(INTERNET_ID, a.id, 'Expuesto a Internet', null, false);
  for (const f of input.findings) {
    if (!enablesMovement(f) || !f.leadsTo || f.leadsTo.length === 0) continue;
    const from = f.edgeFrom || f.assetId;
    for (const to of f.leadsTo) add(from, to, f.technique || f.title, f.id, false);
  }
  for (const m of input.edges) add(m.from, m.to, m.technique, null, true);
  const edges = [...map.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, edges };
}

function adjacency(edges: GraphEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  for (const list of adj.values()) list.sort();
  return adj;
}

/** Saltos mínimos desde cada nodo hasta la joya de la corona más cercana (BFS inverso multiorigen). */
export function hopsToCrown(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const rev = new Map<string, string[]>();
  for (const e of edges) {
    const list = rev.get(e.to) ?? [];
    list.push(e.from);
    rev.set(e.to, list);
  }
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) if (n.crown) { dist.set(n.id, 0); queue.push(n.id); }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const d = dist.get(cur)!;
    for (const prev of (rev.get(cur) ?? []).slice().sort()) {
      if (prev === INTERNET_ID || dist.has(prev)) continue;
      dist.set(prev, d + 1);
      queue.push(prev);
    }
  }
  return dist;
}

export function analyzeGraph(input: EngineInput): GraphAnalysis {
  const { nodes, edges } = buildGraph(input);
  const crown = new Set(nodes.filter((n) => n.crown).map((n) => n.id));
  const adj = adjacency(edges);
  const paths: AttackPath[] = [];
  let truncated = false;

  // DFS de rutas simples desde Internet; se registra cada llegada a una joya de la corona y se sigue explorando.
  const stack: string[] = [INTERNET_ID];
  const onPath = new Set<string>([INTERNET_ID]);
  const dfs = (cur: string): void => {
    if (truncated) return;
    for (const next of adj.get(cur) ?? []) {
      if (onPath.has(next)) continue;
      stack.push(next);
      onPath.add(next);
      if (crown.has(next)) {
        if (paths.length >= MAX_PATHS) { truncated = true; }
        else paths.push({ nodes: [...stack], target: next, length: stack.length - 1 });
      }
      if (!truncated && stack.length - 1 < MAX_PATH_DEPTH) dfs(next);
      stack.pop();
      onPath.delete(next);
      if (truncated) return;
    }
  };
  if (crown.size > 0) dfs(INTERNET_ID);

  const nodePathCount: Record<string, number> = {};
  const edgePathCount: Record<string, number> = {};
  for (const p of paths) {
    for (let i = 1; i < p.nodes.length - 1; i++) nodePathCount[p.nodes[i]] = (nodePathCount[p.nodes[i]] ?? 0) + 1;
    for (let i = 0; i < p.nodes.length - 1; i++) {
      const id = `${p.nodes[i]}->${p.nodes[i + 1]}`;
      edgePathCount[id] = (edgePathCount[id] ?? 0) + 1;
    }
  }
  const total = paths.length;
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  const chokePoints: ChokePoint[] = [];
  const isChoke = (count: number) => total > 0 && count >= CHOKE_MIN_PATHS && count / total >= CHOKE_SHARE;
  for (const id of Object.keys(nodePathCount).sort()) {
    const c = nodePathCount[id];
    if (isChoke(c)) chokePoints.push({ id, kind: 'nodo', label: label.get(id) ?? id, paths: c, share: r1((c / total) * 1000) / 1000 });
  }
  for (const id of Object.keys(edgePathCount).sort()) {
    const c = edgePathCount[id];
    if (isChoke(c)) {
      const [from, to] = id.split('->');
      chokePoints.push({ id, kind: 'arista', label: `${label.get(from) ?? from} → ${label.get(to) ?? to}`, paths: c, share: r1((c / total) * 1000) / 1000 });
    }
  }
  chokePoints.sort((a, b) => b.paths - a.paths || (a.kind === b.kind ? 0 : a.kind === 'nodo' ? -1 : 1) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { nodes, edges, paths, truncated, chokePoints, nodePathCount, edgePathCount };
}

/* ───────────────────────── Puntuación ───────────────────────── */

function exploitDetail(f: Finding, epss: number): string {
  if (f.kev) return 'En el catálogo CISA KEV: explotación activa confirmada';
  if (f.exploitPublic && EXPLOIT_PUBLIC_FLOOR >= epss) {
    return epss > 0 ? `Exploit público disponible (EPSS ${fmt(epss * 100)} %)` : 'Exploit público disponible';
  }
  if (epss > 0) return `EPSS ${fmt(epss * 100)} % de probabilidad de explotación en 30 días`;
  return 'Sin indicios de explotación';
}

/** Perfil válido (cualquier otro valor cae en el de por defecto). */
export const profileOf = (p: unknown): ProfileId => (typeof p === 'string' && Object.prototype.hasOwnProperty.call(PROFILES, p) ? (p as ProfileId) : DEFAULT_PROFILE);

export function scoreFinding(f: Finding, asset: Asset | undefined, hops: number | null, onAttackPath: boolean, W: Weights = WEIGHTS): ScoredFinding {
  const cvss = clamp(f.cvss, 0, 10);
  const epss = clamp(f.epss ?? 0, 0, 1);
  const e = Math.max(f.kev ? 1 : 0, f.exploitPublic ? EXPLOIT_PUBLIC_FLOOR : 0, epss);
  const crit = asset ? asset.criticality : 1;
  const exposed = asset ? asset.internetExposed : false;
  const p = hops === null ? 0 : Math.max(0, 1 - hops / PROXIMITY_HOPS);

  const sev = (cvss / 10) * W.severidad;
  const expl = e * W.explotabilidad;
  const crt = ((crit - 1) / 4) * W.criticidad;
  const exp = exposed ? W.exposicion : 0;
  const prox = p * W.proximidad;
  const base = sev + expl + crt + exp + prox;

  const factors: Factor[] = [
    { key: 'severidad', label: 'Severidad', points: r1(sev), max: W.severidad, detail: `CVSS ${fmt(cvss)}` },
    { key: 'explotabilidad', label: 'Explotabilidad', points: r1(expl), max: W.explotabilidad, detail: exploitDetail(f, epss) },
    { key: 'criticidad', label: 'Criticidad del activo', points: r1(crt), max: W.criticidad, detail: `Criticidad de negocio ${crit}/5${asset ? ` (${asset.name})` : ' (activo desconocido)'}` },
    { key: 'exposicion', label: 'Exposición', points: r1(exp), max: W.exposicion, detail: exposed ? 'Expuesto a Internet' : 'Solo accesible desde la red interna' },
    {
      key: 'proximidad', label: 'Proximidad', points: r1(prox), max: W.proximidad,
      detail: hops === null ? 'Sin ruta conocida hacia una joya de la corona'
        : hops === 0 ? 'Afecta directamente a una joya de la corona'
          : `A ${hops} ${hops === 1 ? 'salto' : 'saltos'} de una joya de la corona`,
    },
  ];

  let raw = base;
  if (f.status === 'validado') {
    raw = base + VALIDATED_BONUS;
    factors.push({ key: 'validacion', label: 'Validación', points: VALIDATED_BONUS, max: VALIDATED_BONUS, detail: 'Validado como explotable' });
  } else if (f.status === 'no_explotable') {
    raw = base * NOT_EXPLOITABLE_FACTOR;
    factors.push({ key: 'validacion', label: 'Validación', points: r1(raw - base), max: 0, detail: `Validado como no explotable (×${String(NOT_EXPLOITABLE_FACTOR).replace('.', ',')})` });
  }
  const score = Math.min(100, r1(raw));
  const band = bandFor(score);

  const ranked = factors
    .slice(0, 5)
    .map((fa, i) => ({ fa, i }))
    .filter(({ fa }) => fa.points > 0)
    .sort((a, b) => b.fa.points - a.fa.points || a.i - b.i)
    .slice(0, 3)
    .map(({ fa }) => fa.detail);
  const tail = factors.length > 5 ? [factors[5].detail] : [];
  const reasons = [...ranked, ...tail];
  const prefix = f.status === 'mitigado' ? 'Mitigado; puntuación de referencia'
    : f.status === 'aceptado' ? 'Riesgo aceptado; puntuación de referencia'
      : `Prioridad ${BAND_LABEL[band]}`;
  const explanation = `${prefix} (${fmt(score)}/100). ${reasons.length ? reasons.join('; ') : 'Sin factores de riesgo relevantes'}.`;

  return { id: f.id, score, band, factors, explanation, hopsToCrown: hops, onAttackPath, slaDays: SLA_DAYS[band] };
}

/* ───────────────────────── Resumen ───────────────────────── */

const dayMs = 86_400_000;

/** Índice de exposición: 0,5 × la peor puntuación + 0,5 × la media de las cinco peores (hallazgos activos). */
export function exposureIndexOf(activeScores: number[]): number {
  if (!activeScores.length) return 0;
  const scores = [...activeScores].sort((a, b) => b - a);
  const top = scores.slice(0, 5);
  const mean = top.reduce((acc, x) => acc + x, 0) / top.length;
  return r1(0.5 * scores[0] + 0.5 * mean);
}
const dateOnly = (s: string): number => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);

export function summarize(input: EngineInput, scored: ScoredFinding[], graph: GraphAnalysis): Summary {
  const byId = new Map(input.findings.map((f) => [f.id, f]));
  const open = scored.filter((s) => { const f = byId.get(s.id); return f ? isActive(f) : false; });
  const byBand: Record<Band, number> = { critica: 0, alta: 0, media: 0, baja: 0 };
  for (const s of open) byBand[s.band] += 1;
  const exposureIndex = exposureIndexOf(open.map((s) => s.score));
  const atRisk = new Set<string>();
  for (const s of open) if (s.band === 'critica' || s.band === 'alta') atRisk.add(byId.get(s.id)!.assetId);
  const resolved = input.findings.filter((f) => f.status === 'mitigado' && f.detectedAt && f.resolvedAt);
  let mttrDays: number | null = null;
  if (resolved.length) {
    const total = resolved.reduce((acc, f) => acc + (dateOnly(f.resolvedAt!) - dateOnly(f.detectedAt!)) / dayMs, 0);
    mttrDays = r1(total / resolved.length);
  }
  return {
    exposureIndex,
    openFindings: open.length,
    byBand,
    kevOpen: open.filter((s) => byId.get(s.id)!.kev).length,
    assetsAtRisk: atRisk.size,
    chokePoints: graph.chokePoints.filter((c) => c.kind === 'nodo').length,
    attackPaths: graph.paths.length,
    mttrDays,
    accepted: input.findings.filter((f) => f.status === 'aceptado').length,
  };
}

/* ───────────────────────── Entrada principal ───────────────────────── */

export function prioritize(input: EngineInput): EngineResult {
  const profile = profileOf(input.profile);
  const W = PROFILES[profile];
  const graph = analyzeGraph(input);
  const hops = hopsToCrown(graph.nodes, graph.edges);
  const onPath = new Set<string>();
  for (const p of graph.paths) for (const n of p.nodes) if (n !== INTERNET_ID) onPath.add(n);
  const assets = new Map(input.assets.map((a) => [a.id, a]));
  // Saltos del hallazgo: los del activo afectado o, si habilita movimiento, 1 + los del destino al que da acceso.
  const findingHops = (f: Finding): number | null => {
    let best = hops.has(f.assetId) ? hops.get(f.assetId)! : null;
    if (enablesMovement(f)) {
      for (const t of f.leadsTo ?? []) {
        if (hops.has(t) && (best === null || hops.get(t)! + 1 < best)) best = hops.get(t)! + 1;
      }
    }
    return best;
  };
  const scored = input.findings
    .map((f) => scoreFinding(f, assets.get(f.assetId), findingHops(f), onPath.has(f.assetId), W))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { engine: 'ts', version: ENGINE_VERSION, profile, scored, graph, summary: summarize(input, scored, graph) };
}
