/* rutasRotasPorSolo da, para todos los hallazgos a la vez, lo mismo que pathsBrokenBy de uno en uno. */
import { describe, expect, it } from 'vitest';
import { prioritize } from './engine';
import { pathsBrokenBy, rutasRotasPorSolo } from './impact';
import type { Asset, Finding, ManualEdge } from './types';

function red(semilla: number) {
  let s = semilla;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const n = 8 + (semilla % 12);
  const assets: Asset[] = Array.from({ length: n }, (_, i) => ({ id: `a${i}`, name: `A${i}`, type: 'servidor', ip: '', owner: '', criticality: (i % 5 === 0 ? 5 : 2) as Asset['criticality'], internetExposed: rnd() < 0.3, tags: [] }));
  const findings: Finding[] = Array.from({ length: 10 + (semilla % 30) }, (_, i) => {
    const d = Math.floor(rnd() * n);
    return { id: `f${i}`, title: 'x', kind: 'cve', cvss: 8, epss: 0.5, kev: false, exploitPublic: true, assetId: `a${d}`, status: rnd() < 0.8 ? 'abierto' : 'mitigado', remediation: '', leadsTo: rnd() < 0.7 ? [`a${(d + 1 + Math.floor(rnd() * 3)) % n}`] : [] };
  });
  const edges: ManualEdge[] = [{ id: 'm1', from: 'a0', to: `a${n - 1}`, technique: 'manual' }];
  return { assets, findings, edges };
}

describe('rutas rotas por un solo hallazgo', () => {
  it('coincide con pathsBrokenBy en 200 redes aleatorias', () => {
    let conRotas = 0;
    for (let semilla = 1; semilla <= 200; semilla++) {
      const input = red(semilla);
      const g = prioritize(input).graph;
      const indice = rutasRotasPorSolo(g);
      for (const f of input.findings) expect(indice.get(f.id) ?? 0, `semilla ${semilla}, ${f.id}`).toBe(pathsBrokenBy(g, [f.id]));
      if (indice.size) conRotas++;
    }
    expect(conRotas).toBeGreaterThan(100);   // la mayoría de las redes tienen hallazgos que rompen rutas
  });

  it('se calcula una sola vez por grafo', () => {
    const g = prioritize(red(3)).graph;
    expect(rutasRotasPorSolo(g)).toBe(rutasRotasPorSolo(g));
  });
});
