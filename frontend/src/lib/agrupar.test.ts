import { describe, expect, it } from 'vitest';
import type { Finding, ScoredFinding } from '../engine/types';
import { agrupar } from './agrupar';

const f = (id: string, cve: string | null, assetId: string, extra: Partial<Finding> = {}): Finding => ({ id, title: `T ${cve ?? id}`, kind: 'cve', cve, cvss: 7, epss: null, kev: false, exploitPublic: false, assetId, status: 'abierto', remediation: '', ...extra });
const s = (id: string, score: number): ScoredFinding => ({ id, score, band: 'alta', factors: [], explanation: '', hopsToCrown: null, onAttackPath: id === 'b', slaDays: 30 });

const hallazgos = [f('a', 'CVE-1', 'x'), f('b', 'CVE-2', 'x'), f('c', 'CVE-1', 'y', { kev: true, epss: 0.4 }), f('d', null, 'y'), f('e', 'CVE-1', 'z', { status: 'mitigado', cvss: 9.8 })];
const fById = new Map(hallazgos.map((x) => [x.id, x]));
const filas = [s('b', 90), s('a', 80), s('d', 70), s('c', 60), s('e', 10)];

describe('agrupación por CVE', () => {
  it('el mismo CVE en varios activos es una fila, en el lugar de su mejor miembro', () => {
    const { elementos, grupos } = agrupar(filas, fById, new Set());
    expect(grupos).toBe(1);
    expect(elementos.map((e) => (e.tipo === 'grupo' ? `G:${e.g.cve}` : e.s.id))).toEqual(['b', 'G:CVE-1', 'd']);
    const g = elementos[1].tipo === 'grupo' ? elementos[1].g : null;
    expect(g).toMatchObject({ activos: 3, abiertos: 2, kev: true, exploit: false, cvss: 9.8, epss: 0.4, enRuta: false });
    expect(g!.miembros.map((m) => m.id)).toEqual(['a', 'c', 'e']);
  });

  it('desplegado, sus miembros van debajo en orden de puntuación', () => {
    const { elementos } = agrupar(filas, fById, new Set(['CVE-1']));
    expect(elementos.map((e) => (e.tipo === 'grupo' ? `G:${e.abierto}` : `${e.s.id}${e.grupo ? '·' : ''}`))).toEqual(['b', 'G:true', 'a·', 'c·', 'e·', 'd']);
  });

  it('un CVE en un solo hallazgo, o sin CVE, no se agrupa', () => {
    const { elementos, grupos } = agrupar([s('b', 90), s('d', 70)], fById, new Set());
    expect(grupos).toBe(0);
    expect(elementos.every((e) => e.tipo === 'fila')).toBe(true);
  });

  it('con 50.000 hallazgos agrupa en milisegundos', () => {
    const muchos = Array.from({ length: 50000 }, (_, i) => f(`H${i}`, `CVE-2024-${i % 3000}`, `A${i % 2000}`));
    const m = new Map(muchos.map((x) => [x.id, x]));
    const t = performance.now();
    const { grupos, elementos } = agrupar(muchos.map((x, i) => s(x.id, 100 - i / 1000)), m, new Set());
    expect(performance.now() - t).toBeLessThan(500);
    expect(grupos).toBe(3000);
    expect(elementos).toHaveLength(3000);
  });
});
