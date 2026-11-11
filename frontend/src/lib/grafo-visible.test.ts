import { describe, expect, it } from 'vitest';
import { prioritize } from '../engine/engine';
import type { Asset, Finding } from '../engine/types';
import { grafoVisible, MAX_NODOS_GRAFO } from './grafo-visible';

function red(n: number) {
  const assets: Asset[] = Array.from({ length: n }, (_, i) => ({ id: `A${i}`, name: `Nodo ${i}`, type: 'servidor', ip: '', owner: '', criticality: (i % 25 === 0 ? 5 : 2) as Asset['criticality'], internetExposed: i % 10 === 1, tags: [] }));
  const findings: Finding[] = Array.from({ length: n * 2 }, (_, i) => ({ id: `F${i}`, title: 'x', kind: 'cve', cvss: 9, epss: 0.5, kev: false, exploitPublic: true, assetId: `A${i % n}`, status: 'abierto', remediation: '', leadsTo: [`A${(i % n + 1 + (i % 3)) % n}`] }));
  return prioritize({ assets, findings, edges: [] }).graph;
}

describe('grafo visible con redes grandes', () => {
  it('con pocos nodos, el grafo tal cual', () => {
    const g = red(40);
    expect(grafoVisible(g, null)).toEqual({ graph: g, resumido: false, rutas: g.paths.length });
  });

  it('con muchos, como mucho MAX_NODOS_GRAFO nodos, con rutas enteras y aristas entre nodos visibles', () => {
    const g = red(800);
    expect(g.nodes.length).toBeGreaterThan(MAX_NODOS_GRAFO);
    const v = grafoVisible(g, null);
    expect(v.resumido).toBe(true);
    expect(v.graph.nodes.length).toBeLessThanOrEqual(MAX_NODOS_GRAFO);
    expect(v.rutas).toBeGreaterThan(0);
    const ids = new Set(v.graph.nodes.map((n) => n.id));
    expect(ids.has('internet')).toBe(true);
    expect(v.graph.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    expect(v.graph.paths.every((p) => p.nodes.every((n) => ids.has(n)))).toBe(true);
    // Empieza por las rutas más cortas.
    const corta = Math.min(...g.paths.map((p) => p.length));
    expect(v.graph.paths.some((p) => p.length === corta)).toBe(true);
  });

  it('siempre incluye la ruta seleccionada, aunque sea de las largas', () => {
    const g = red(800);
    const larga = [...g.paths].sort((a, b) => b.length - a.length)[0];
    const v = grafoVisible(g, new Set(larga.nodes));
    const ids = new Set(v.graph.nodes.map((n) => n.id));
    expect(larga.nodes.every((n) => ids.has(n))).toBe(true);
  });
});
