/* Importación, validación y exportación (sin DOM): CSV, JSON de proyecto, informe y tickets en Markdown/CSV. */
import { BAND_LABEL } from './constants';
import { fmt } from './engine';
import { guideFor } from './remediation';
import type { Asset, AssetType, EngineResult, Finding, FindingKind, FindingStatus, ManualEdge, NetworkRange } from './types';

export interface Project {
  format: 'ctem-nexus';
  version: 1;
  name: string;
  demo: boolean;
  assets: Asset[];
  ranges: NetworkRange[];
  findings: Finding[];
  edges: ManualEdge[];
}

const ASSET_TYPES: AssetType[] = ['servidor', 'estacion', 'aplicacion_web', 'base_datos', 'controlador_dominio', 'pki', 'perimetro', 'nube', 'identidad'];
const KINDS: FindingKind[] = ['cve', 'configuracion', 'identidad'];
const STATUSES: FindingStatus[] = ['abierto', 'validado', 'no_explotable', 'mitigado'];
const CVE_RE = /^CVE-\d{4}-\d{4,7}$/i;

/* ───────────── Utilidades seguras ───────────── */

/** JSON.parse que nunca lanza y descarta claves peligrosas (__proto__, constructor, prototype). */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v)) as T;
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const s = str(v).toLowerCase();
  return ['1', 'true', 'si', 'sí', 'yes', 'y', 's', 'x'].includes(s);
};
const pick = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T => {
  const s = str(v).toLowerCase().replace(/\s+/g, '_') as T;
  return allowed.includes(s) ? s : dflt;
};
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)) : str(v).split(/[;|]/)).map((s) => s.trim()).filter(Boolean);

/** Valida una dirección IPv4 o un bloque CIDR IPv4/IPv6 sencillo. */
export function isIpOrCidr(s: string): boolean {
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/(3[0-2]|[12]?\d))?$/;
  const v6 = /^[0-9a-f:]+(\/(12[0-8]|1[01]\d|[1-9]?\d))?$/i;
  return v4.test(s.trim()) || (s.includes(':') && v6.test(s.trim()));
}

/* ───────────── CSV ───────────── */

/** Neutraliza la inyección de fórmulas: celdas de texto que empiezan por = + - @ tab o CR se prefijan con '. */
export function csvCell(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Parser CSV (RFC 4180) con detección de separador , o ; */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  titulo: 'title', título: 'title', nombre: 'title', tipo: 'kind', activo: 'assetId', asset: 'assetId', asset_id: 'assetId',
  assetid: 'assetId', estado: 'status', exploit: 'exploitPublic', exploit_publico: 'exploitPublic', exploitpublic: 'exploitPublic',
  remediacion: 'remediation', remediación: 'remediation', tecnica: 'technique', técnica: 'technique', leadsto: 'leadsTo',
  lleva_a: 'leadsTo', edgefrom: 'edgeFrom', desde: 'edgeFrom', descripcion: 'description', descripción: 'description',
  detectado: 'detectedAt', detectedat: 'detectedAt',
};

export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => {
    const k = h.trim().replace(/^'/, '');
    const low = k.toLowerCase();
    return HEADER_ALIASES[low] ?? (['id', 'cve', 'cvss', 'epss', 'kev', 'kind', 'title', 'status'].includes(low) ? low : k);
  });
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export const CSV_TEMPLATE = toCsv([
  ['id', 'title', 'kind', 'cve', 'cvss', 'epss', 'kev', 'exploitPublic', 'assetId', 'status', 'remediation', 'technique', 'edgeFrom', 'leadsTo'],
  ['H-100', 'Ejemplo: Log4Shell', 'cve', 'CVE-2021-44228', 10, 0.944, 'sí', 'sí', 'a01', 'abierto', 'log4shell', 'RCE y pivote', '', 'a04'],
]);

/* ───────────── Normalización ───────────── */

export function normalizeAsset(raw: Record<string, unknown>, i: number): Asset | null {
  const name = str(raw.name ?? raw.nombre, 120);
  if (!name) return null;
  const crit = Math.round(num(raw.criticality ?? raw.criticidad) ?? 3);
  return {
    id: str(raw.id, 40) || `a${String(i + 1).padStart(2, '0')}`,
    name,
    type: pick(raw.type ?? raw.tipo, ASSET_TYPES, 'servidor'),
    ip: str(raw.ip, 60),
    owner: str(raw.owner ?? raw.responsable, 80),
    criticality: Math.min(5, Math.max(1, crit)) as Asset['criticality'],
    internetExposed: bool(raw.internetExposed ?? raw.expuesto),
    tags: list(raw.tags ?? raw.etiquetas).slice(0, 12),
  };
}

/** Normaliza un hallazgo importado. Resuelve el activo por id, nombre o IP. Devuelve null si no es válido. */
export function normalizeFinding(raw: Record<string, unknown>, i: number, assets: Asset[]): Finding | null {
  const title = str(raw.title, 200);
  const cveRaw = str(raw.cve, 20).toUpperCase();
  const cve = CVE_RE.test(cveRaw) ? cveRaw : null;
  if (!title && !cve) return null;
  const assetRef = str(raw.assetId, 120).toLowerCase();
  const asset = assets.find((a) => a.id.toLowerCase() === assetRef || a.name.toLowerCase() === assetRef || a.ip === assetRef);
  const epss = num(raw.epss);
  const resolveRef = (ref: string) => assets.find((a) => a.id.toLowerCase() === ref.toLowerCase() || a.name.toLowerCase() === ref.toLowerCase())?.id;
  const leadsTo = list(raw.leadsTo).map(resolveRef).filter((x): x is string => !!x);
  const edgeFromRef = str(raw.edgeFrom, 120);
  return {
    id: str(raw.id, 40) || `IMP-${String(i + 1).padStart(3, '0')}`,
    title: title || cve!,
    kind: pick(raw.kind, KINDS, cve ? 'cve' : 'configuracion'),
    cve,
    cvss: Math.min(10, Math.max(0, num(raw.cvss) ?? 5)),
    epss: epss === null ? null : Math.min(1, Math.max(0, epss > 1 ? epss / 100 : epss)),
    kev: bool(raw.kev),
    exploitPublic: bool(raw.exploitPublic),
    assetId: asset?.id ?? str(raw.assetId, 40),
    status: pick(raw.status, STATUSES, 'abierto'),
    remediation: str(raw.remediation, 40),
    description: str(raw.description, 1000) || undefined,
    detectedAt: /^\d{4}-\d{2}-\d{2}/.test(str(raw.detectedAt)) ? str(raw.detectedAt).slice(0, 10) : undefined,
    resolvedAt: /^\d{4}-\d{2}-\d{2}/.test(str(raw.resolvedAt)) ? str(raw.resolvedAt).slice(0, 10) : null,
    technique: str(raw.technique, 160) || null,
    edgeFrom: edgeFromRef ? resolveRef(edgeFromRef) ?? null : null,
    leadsTo,
  };
}

export interface ImportResult { findings: Finding[]; rejected: number }

/** Importa hallazgos desde texto JSON (array u objeto con findings) o CSV. */
export function importFindings(text: string, assets: Asset[]): ImportResult {
  const trimmed = text.trim();
  let rows: Record<string, unknown>[] = [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = safeJsonParse<unknown>(trimmed);
    const arr = Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as { findings?: unknown }).findings) ? (data as { findings: unknown[] }).findings : [];
    rows = arr.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  } else {
    rows = csvToObjects(trimmed);
  }
  const findings: Finding[] = [];
  let rejected = 0;
  rows.slice(0, 5000).forEach((r, i) => {
    const f = normalizeFinding(r, i, assets);
    if (f) findings.push(f); else rejected++;
  });
  return { findings, rejected };
}

/** Valida y sanea un proyecto completo importado desde JSON. */
export function parseProject(text: string): Project | null {
  const data = safeJsonParse<Record<string, unknown>>(text);
  if (!data || typeof data !== 'object' || data.format !== 'ctem-nexus') return null;
  const arr = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);
  const assets = arr('assets').map(normalizeAsset).filter((a): a is Asset => !!a);
  const findings = arr('findings').map((f, i) => normalizeFinding(f, i, assets)).filter((f): f is Finding => !!f);
  const ranges: NetworkRange[] = arr('ranges').map((r, i) => ({ id: str(r.id, 40) || `r${i + 1}`, cidr: str(r.cidr, 60), label: str(r.label, 120), inScope: r.inScope !== false })).filter((r) => r.cidr);
  const edges: ManualEdge[] = arr('edges').map((e, i) => ({ id: str(e.id, 40) || `e${i + 1}`, from: str(e.from, 40), to: str(e.to, 40), technique: str(e.technique, 160) || 'Movimiento lateral' })).filter((e) => e.from && e.to);
  return { format: 'ctem-nexus', version: 1, name: str(data.name, 120) || 'Proyecto importado', demo: data.demo === true, assets, ranges, findings, edges };
}

/* ───────────── Informe y tickets ───────────── */

const mdEsc = (s: string) => s.replace(/[|\\`*_[\]<>]/g, (c) => `\\${c}`).replace(/\r?\n/g, ' ');

export function buildTickets(findings: Finding[], assets: Asset[], result: EngineResult) {
  const fById = new Map(findings.map((f) => [f.id, f]));
  const aById = new Map(assets.map((a) => [a.id, a]));
  return result.scored
    .filter((s) => { const f = fById.get(s.id); return f && (f.status === 'abierto' || f.status === 'validado'); })
    .map((s) => {
      const f = fById.get(s.id)!;
      const a = aById.get(f.assetId);
      const g = guideFor(f.remediation, f.kind);
      return { finding: f, scored: s, asset: a, guide: g, owner: a?.owner ? `${g.owner} · ${a.owner}` : g.owner };
    });
}

export function ticketsCsv(findings: Finding[], assets: Asset[], result: EngineResult): string {
  const rows: unknown[][] = [['id', 'titulo', 'cve', 'activo', 'responsable', 'prioridad', 'puntuacion', 'sla_dias', 'pasos', 'verificacion', 'explicacion']];
  for (const t of buildTickets(findings, assets, result)) {
    rows.push([t.finding.id, t.finding.title, t.finding.cve ?? '', t.asset?.name ?? t.finding.assetId, t.owner, BAND_LABEL[t.scored.band], t.scored.score, t.scored.slaDays, t.guide.steps.map((s, i) => `${i + 1}. ${s}`).join(' '), t.guide.verify, t.scored.explanation]);
  }
  return toCsv(rows);
}

export function ticketsMarkdown(findings: Finding[], assets: Asset[], result: EngineResult): string {
  const out: string[] = ['# Tickets de remediación · CTEM-Nexus', ''];
  for (const t of buildTickets(findings, assets, result)) {
    out.push(`## [${BAND_LABEL[t.scored.band]}] ${mdEsc(t.finding.id)} · ${mdEsc(t.finding.title)}`, '');
    out.push(`- **Activo:** ${mdEsc(t.asset?.name ?? t.finding.assetId)}`);
    if (t.finding.cve) out.push(`- **CVE:** ${t.finding.cve}`);
    out.push(`- **Responsable:** ${mdEsc(t.owner)}`, `- **Puntuación:** ${fmt(t.scored.score)}/100 · **SLA:** ${t.scored.slaDays} días`, `- **Motivo:** ${mdEsc(t.scored.explanation)}`, '');
    out.push(`### ${mdEsc(t.guide.title)}`, '', ...t.guide.steps.map((s, i) => `${i + 1}. ${mdEsc(s)}`), '', '**Verificación:**', '', '```', t.guide.verify, '```', '');
  }
  return out.join('\n');
}

export function reportMarkdown(project: { name: string; demo: boolean }, findings: Finding[], assets: Asset[], result: EngineResult, date = new Date()): string {
  const s = result.summary;
  const fById = new Map(findings.map((f) => [f.id, f]));
  const aById = new Map(assets.map((a) => [a.id, a]));
  const top = result.scored.filter((x) => { const f = fById.get(x.id); return f && (f.status === 'abierto' || f.status === 'validado'); }).slice(0, 10);
  const out = [
    `# Informe ejecutivo de exposición · ${mdEsc(project.name)}`, '',
    `Fecha: ${date.toISOString().slice(0, 10)} · Motor ${result.engine === 'ts' ? 'local' : 'API'} v${result.version}`, '',
  ];
  if (project.demo) out.push('> **Datos de ejemplo.** Este informe se ha generado con el conjunto de demostración de CTEM-Nexus.', '');
  out.push('## Indicadores', '',
    '| Indicador | Valor |', '|---|---:|',
    `| Índice de exposición | ${fmt(s.exposureIndex)}/100 |`,
    `| Hallazgos abiertos | ${s.openFindings} |`,
    `| Críticos / Altos / Medios / Bajos | ${s.byBand.critica} / ${s.byBand.alta} / ${s.byBand.media} / ${s.byBand.baja} |`,
    `| En CISA KEV | ${s.kevOpen} |`,
    `| Activos en riesgo | ${s.assetsAtRisk} |`,
    `| Rutas de ataque hacia joyas de la corona | ${s.attackPaths} |`,
    `| Puntos de estrangulamiento | ${s.chokePoints} |`,
    `| MTTR (días) | ${s.mttrDays === null ? '—' : fmt(s.mttrDays)} |`, '',
    '## Riesgos principales', '', '| # | Hallazgo | Activo | Prioridad | Puntuación | SLA |', '|---:|---|---|---|---:|---:|',
    ...top.map((x, i) => {
      const f = fById.get(x.id)!;
      return `| ${i + 1} | ${mdEsc(f.id)} · ${mdEsc(f.title)}${f.cve ? ` (${f.cve})` : ''} | ${mdEsc(aById.get(f.assetId)?.name ?? f.assetId)} | ${BAND_LABEL[x.band]} | ${fmt(x.score)} | ${x.slaDays} d |`;
    }), '',
    '## Puntos de estrangulamiento', '',
    ...(result.graph.chokePoints.length
      ? result.graph.chokePoints.map((c) => `- **${mdEsc(c.label)}** (${c.kind}): presente en ${c.paths} de ${s.attackPaths} rutas (${Math.round(c.share * 100)} %).`)
      : ['- No se han identificado puntos de estrangulamiento.']), '',
    '## Recomendación', '',
    'Corregir primero los hallazgos que coinciden con puntos de estrangulamiento: cortan el mayor número de rutas hacia las joyas de la corona con el menor esfuerzo.', '');
  return out.join('\n');
}
