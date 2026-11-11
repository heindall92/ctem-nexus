/* El plan voraz incremental (1.3.0) da exactamente el mismo plan que el anterior, y en milisegundos. */
import { describe, expect, it } from 'vitest';
import { isActive, prioritize } from './engine';
import { pathsBrokenBy } from './impact';
import { fixPlan, type FixPlan, type PlanStep } from './simulate';
import type { Asset, EngineInput, EngineResult, Finding, ManualEdge } from './types';

/** La implementación de la 1.2.1, tal cual: la referencia. */
function fixPlanAnterior(result: EngineResult, findings: Finding[], limit = 10): FixPlan {
  const g = result.graph;
  const score = new Map(result.scored.map((s) => [s.id, s.score]));
  const active = new Set(findings.filter(isActive).map((f) => f.id));
  const chosen: string[] = [];
  const steps: PlanStep[] = [];
  const allCut = pathsBrokenBy(g, active);
  let broken = 0;
  const groups = new Map<string, string[]>();
  for (const id of active) groups.set(id, [id]);
  for (const e of g.edges) {
    if (e.manual || e.findingIds.length < 2 || !e.findingIds.every((id) => active.has(id))) continue;
    const ids = [...e.findingIds].sort();
    groups.set(ids.join('+'), ids);
  }
  while (steps.length < limit && broken < allCut) {
    let best: { ids: string[]; gain: number; score: number } | null = null;
    for (const ids of groups.values()) {
      const fresh = ids.filter((id) => !chosen.includes(id));
      if (!fresh.length) continue;
      const gain = pathsBrokenBy(g, [...chosen, ...fresh]) - broken;
      if (gain <= 0) continue;
      const sc = Math.max(...fresh.map((id) => score.get(id) ?? 0));
      const better = !best || gain / fresh.length > best.gain / best.ids.length || (gain / fresh.length === best.gain / best.ids.length && sc > best.score);
      if (better) best = { ids: fresh, gain, score: sc };
    }
    if (!best) break;
    chosen.push(...best.ids);
    broken += best.gain;
    steps.push({ ids: best.ids, newlyBroken: best.gain, cumulativeBroken: broken, score: best.score });
  }
  for (const s of result.scored) {
    if (steps.length >= limit) break;
    if (!active.has(s.id) || chosen.includes(s.id)) continue;
    chosen.push(s.id);
    steps.push({ ids: [s.id], newlyBroken: 0, cumulativeBroken: broken, score: s.score });
  }
  return { steps, totalPaths: g.paths.length, unbreakable: g.paths.length - allCut };
}

/** Grafo aleatorio reproducible: aristas de uno o varios hallazgos (algunos inactivos) y aristas manuales. */
function aleatorio(semilla: number, nA: number, nF: number): EngineInput {
  let s = semilla;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (n: number) => Math.floor(rnd() * n);
  const assets: Asset[] = Array.from({ length: nA }, (_, i) => ({
    id: `a${i}`, name: `A${i}`, type: 'servidor', ip: `10.0.0.${i}`, owner: 'x',
    criticality: (i % 7 === 0 ? 5 : 1 + (i % 4)) as Asset['criticality'], internetExposed: rnd() < 0.25, tags: [],
  }));
  const estados: Finding['status'][] = ['abierto', 'abierto', 'abierto', 'validado', 'mitigado', 'no_explotable', 'aceptado'];
  const findings: Finding[] = Array.from({ length: nF }, (_, i) => {
    const desde = pick(nA);
    return {
      id: `f${i}`, title: `F${i}`, kind: 'cve', cvss: 3 + rnd() * 7, epss: rnd(), kev: rnd() < 0.1, exploitPublic: rnd() < 0.2,
      assetId: `a${desde}`, status: estados[pick(estados.length)], remediation: 'generic',
      // Varios hallazgos sobre la misma arista: así hay grupos que solo cortan juntos.
      edgeFrom: `a${desde}`, leadsTo: rnd() < 0.7 ? [`a${(desde + 1 + pick(3)) % nA}`] : [],
    };
  });
  const edges: ManualEdge[] = Array.from({ length: Math.floor(nA / 4) }, (_, i) => ({ id: `m${i}`, from: `a${pick(nA)}`, to: `a${pick(nA)}`, technique: 'manual' }));
  return { assets, findings, edges };
}

describe('plan voraz incremental', () => {
  it('da el mismo plan que la versión anterior en 300 grafos aleatorios', () => {
    let conRutas = 0;
    for (let semilla = 1; semilla <= 300; semilla++) {
      const input = aleatorio(semilla, 6 + (semilla % 14), 10 + (semilla % 40));
      const r = prioritize(input);
      if (r.graph.paths.length) conRutas++;
      for (const limite of [3, 10]) expect(fixPlan(r, input.findings, limite), `semilla ${semilla}, límite ${limite}`).toEqual(fixPlanAnterior(r, input.findings, limite));
    }
    expect(conRutas).toBeGreaterThan(150);   // la mayoría de los casos tienen rutas que cortar
  });

  it('con 5.000 hallazgos y cientos de rutas tarda milisegundos, no segundos', () => {
    const input = aleatorio(7, 300, 5000);
    const r = prioritize(input);
    expect(r.graph.paths.length).toBeGreaterThan(100);
    const t = performance.now();
    const plan = fixPlan(r, input.findings, 10);
    const ms = performance.now() - t;
    expect(plan.steps).toHaveLength(10);
    expect(ms).toBeLessThan(500);
  });
});
