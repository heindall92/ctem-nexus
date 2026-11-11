import { describe, expect, it } from 'vitest';
import type { Project } from '../engine/io';
import { proyectoComoBlob, UMBRAL_EXPORTAR } from './exportar';

const proyecto = (n: number): Project => ({
  format: 'ctem-nexus', version: 1, name: 'Exportación "con comillas"', demo: false, ranges: [], edges: [{ id: 'e1', from: 'a', to: 'b', technique: 'x' }],
  assets: [{ id: 'A', name: 'A', type: 'servidor', ip: '', owner: '', criticality: 3, internetExposed: false, tags: [] }],
  findings: Array.from({ length: n }, (_, i) => ({ id: `H${i}`, title: `Fallo ${i} é`, kind: 'cve', cve: null, cvss: 5, epss: null, kev: false, exploitPublic: false, assetId: 'A', status: 'abierto', remediation: '' })),
  progress: { H1: [0, 1] },
});

describe('exportar el proyecto', () => {
  it('con pocos hallazgos, el JSON legible de siempre', async () => {
    const p = proyecto(3);
    expect(await (await proyectoComoBlob(p)).text()).toBe(JSON.stringify(p, null, 2));
  });

  it('con muchos, por partes y sin perder nada (mismo contenido, mismo orden de claves)', async () => {
    const p = proyecto(UMBRAL_EXPORTAR * 3 + 17);
    const texto = await (await proyectoComoBlob(p)).text();
    expect(texto).toBe(JSON.stringify(p));
    expect(JSON.parse(texto)).toEqual(p);
  });

  it('un proyecto grande sin hallazgos no rompe', async () => {
    const p = { ...proyecto(0) };
    expect(JSON.parse(await (await proyectoComoBlob(p)).text())).toEqual(p);
  });
});
