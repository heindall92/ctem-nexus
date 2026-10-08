import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { prioritize } from './engine';
import { edgesCutBy, pathsBrokenBy } from './impact';

const input = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES };
const g = prioritize(input).graph;

describe('impacto de corregir hallazgos', () => {
  it('coincide con recalcular el grafo sin esos hallazgos', () => {
    for (const f of DEMO_FINDINGS) {
      const sin = prioritize({ ...input, findings: DEMO_FINDINGS.map((x) => (x.id === f.id ? { ...x, status: 'mitigado' as const } : x)) }).graph;
      expect(pathsBrokenBy(g, [f.id]), f.id).toBe(g.paths.length - sin.paths.length);
    }
  });

  it('una arista que también sostiene otro hallazgo no se corta con uno solo', () => {
    const doble = g.edges.find((e) => e.findingIds.length > 1 && !e.manual);
    if (doble) {
      expect(edgesCutBy(g, [doble.findingIds[0]]).has(doble.id)).toBe(false);
      expect(edgesCutBy(g, doble.findingIds).has(doble.id)).toBe(true);
    }
    expect(pathsBrokenBy(g, [])).toBe(0);
  });
});
