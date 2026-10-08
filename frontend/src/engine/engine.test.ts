import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { BAND_THRESHOLDS, WEIGHTS } from './constants';
import { analyzeGraph, bandFor, prioritize, r1, scoreFinding } from './engine';
import { csvCell, importFindings, parseCsv, parseProject, reportMarkdown, safeJsonParse, ticketsCsv } from './io';
import { GUIDES, guideFor } from './remediation';
import type { Asset, EngineInput, Finding } from './types';

const demo: EngineInput = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES };
const asset = (p: Partial<Asset> = {}): Asset => ({ id: 'x', name: 'X', type: 'servidor', ip: '10.0.0.1', owner: '', criticality: 3, internetExposed: false, tags: [], ...p });
const finding = (p: Partial<Finding> = {}): Finding => ({ id: 'F', title: 'F', kind: 'cve', cvss: 5, epss: 0, kev: false, exploitPublic: false, assetId: 'x', status: 'abierto', remediation: 'patch_cve', ...p });

describe('fórmula de puntuación', () => {
  it('los pesos suman 100', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('caso máximo: CVSS 10, KEV, criticidad 5, expuesto y sobre la joya → 100', () => {
    const s = scoreFinding(finding({ cvss: 10, kev: true }), asset({ criticality: 5, internetExposed: true }), 0, true);
    expect(s.score).toBe(100);
    expect(s.band).toBe('critica');
  });
  it('caso mínimo: CVSS 0, sin explotación, criticidad 1, interno, sin ruta → 0', () => {
    const s = scoreFinding(finding({ cvss: 0 }), asset({ criticality: 1 }), null, false);
    expect(s.score).toBe(0);
    expect(s.band).toBe('baja');
  });
  it('cálculo intermedio documentado en docs/SCORING.md', () => {
    // CVSS 8 → 24; EPSS 0,2 vs exploit público 0,6 → 15; criticidad 3 → 10; interno → 0; 2 saltos → 7,5 ⇒ 56,5
    const s = scoreFinding(finding({ cvss: 8, epss: 0.2, exploitPublic: true }), asset({ criticality: 3 }), 2, true);
    expect(s.score).toBe(56.5);
    expect(s.band).toBe('media');
    expect(s.factors.map((f) => f.points)).toEqual([24, 15, 10, 0, 7.5]);
  });
  it('validado suma 5 puntos y no supera 100; no explotable multiplica por 0,25', () => {
    const base = scoreFinding(finding({ cvss: 8 }), asset(), null, false).score;
    expect(scoreFinding(finding({ cvss: 8, status: 'validado' }), asset(), null, false).score).toBe(r1(base + 5));
    expect(scoreFinding(finding({ cvss: 8, status: 'no_explotable' }), asset(), null, false).score).toBe(r1(base * 0.25));
    expect(scoreFinding(finding({ cvss: 10, kev: true, status: 'validado' }), asset({ criticality: 5, internetExposed: true }), 0, true).score).toBe(100);
  });
  it('umbrales de banda', () => {
    expect(BAND_THRESHOLDS.map(([b]) => b)).toEqual(['critica', 'alta', 'media', 'baja']);
    expect([80, 79.9, 60, 59.9, 40, 39.9].map(bandFor)).toEqual(['critica', 'alta', 'alta', 'media', 'media', 'baja']);
  });
  it('la explicación es legible y en español', () => {
    const s = scoreFinding(finding({ cvss: 10, kev: true }), asset({ name: 'DC01', criticality: 5 }), 0, true);
    expect(s.explanation).toMatch(/^Prioridad Crítica \(\d+,\d\/100\)\. /);
    expect(s.explanation).toContain('CISA KEV');
  });
});

describe('grafo y rutas de ataque', () => {
  const g = analyzeGraph(demo);
  it('encuentra rutas desde Internet hasta las joyas de la corona', () => {
    expect(g.paths.length).toBeGreaterThan(3);
    for (const p of g.paths) {
      expect(p.nodes[0]).toBe('internet');
      expect(['a06', 'a08']).toContain(p.target);
      expect(new Set(p.nodes).size).toBe(p.nodes.length); // rutas simples
    }
  });
  it('identifica los puntos de estrangulamiento (nodos en la mayoría de rutas)', () => {
    const nodes = g.chokePoints.filter((c) => c.kind === 'nodo').map((c) => c.id);
    expect(nodes).toContain('a05');
    expect(nodes).toContain('a04');
  });
  it('un hallazgo no explotable o mitigado no genera aristas', () => {
    const findings = DEMO_FINDINGS.map((f) => (f.id === 'H-010' ? { ...f, status: 'mitigado' as const } : f));
    const g2 = analyzeGraph({ ...demo, findings });
    expect(g2.edges.find((e) => e.id === 'a04->a08')).toBeUndefined();
  });
  it('sin joyas de la corona no hay rutas', () => {
    const assets = DEMO_ASSETS.map((a) => ({ ...a, criticality: Math.min(a.criticality, 4) as Asset['criticality'] }));
    expect(analyzeGraph({ ...demo, assets }).paths).toHaveLength(0);
  });
});

describe('priorización de los datos de demo', () => {
  const r = prioritize(demo);
  it('ordena por puntuación descendente y Log4Shell queda arriba', () => {
    const scores = r.scored.map((s) => s.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(r.scored.slice(0, 3).map((s) => s.id)).toContain('H-001');
  });
  it('el resumen es coherente', () => {
    const s = r.summary;
    expect(s.openFindings).toBe(DEMO_FINDINGS.filter((f) => f.status === 'abierto' || f.status === 'validado').length);
    expect(s.byBand.critica + s.byBand.alta + s.byBand.media + s.byBand.baja).toBe(s.openFindings);
    expect(s.kevOpen).toBeGreaterThanOrEqual(6);
    expect(s.exposureIndex).toBeGreaterThan(80);
    expect(s.mttrDays).toBe(10);
  });
  it('todas las guías referenciadas existen', () => {
    for (const f of DEMO_FINDINGS) expect(GUIDES[f.remediation], f.remediation).toBeDefined();
    expect(guideFor('desconocida', 'identidad').key).toBe('identity_generic');
  });
});

describe('importación y exportación', () => {
  it('neutraliza la inyección de fórmulas en CSV', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(-3)).toBe('-3');
    const csv = ticketsCsv(DEMO_FINDINGS, DEMO_ASSETS, prioritize(demo));
    for (const row of parseCsv(csv).slice(1)) for (const cell of row) expect(cell).not.toMatch(/^[=+\-@]/);
  });
  it('importa CSV con ; y cabeceras en español, resolviendo activos por nombre', () => {
    const csv = 'id;titulo;cve;cvss;epss;kev;exploit;activo;estado\nX1;Prueba;cve-2021-44228;9,8;94;sí;no;Exchange OWA;validado\n;;;;;;;;';
    const { findings, rejected } = importFindings(csv, DEMO_ASSETS);
    expect(rejected).toBe(0);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ id: 'X1', cve: 'CVE-2021-44228', cvss: 9.8, epss: 0.94, kev: true, exploitPublic: false, assetId: 'a02', status: 'validado' });
  });
  it('importa JSON y rechaza filas sin título ni CVE', () => {
    const { findings, rejected } = importFindings(JSON.stringify([{ title: 'A', cvss: 7, assetId: 'a01' }, { cvss: 3 }]), DEMO_ASSETS);
    expect(findings).toHaveLength(1);
    expect(rejected).toBe(1);
  });
  it('safeJsonParse no lanza y elimina __proto__', () => {
    expect(safeJsonParse('{mal')).toBeNull();
    const o = safeJsonParse<Record<string, unknown>>('{"__proto__":{"x":1},"a":1}')!;
    expect(o.a).toBe(1);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
  it('el proyecto exportado se vuelve a importar igual', () => {
    const p = { format: 'ctem-nexus', version: 1, name: 'Demo', demo: true, assets: DEMO_ASSETS, ranges: [], findings: DEMO_FINDINGS, edges: DEMO_EDGES };
    const back = parseProject(JSON.stringify(p))!;
    expect(back.assets).toEqual(DEMO_ASSETS);
    expect(prioritize(back).scored).toEqual(prioritize(demo).scored);
    expect(parseProject('{"format":"otro"}')).toBeNull();
  });
  it('el informe Markdown avisa de los datos de ejemplo', () => {
    const md = reportMarkdown({ name: 'Demo', demo: true }, DEMO_FINDINGS, DEMO_ASSETS, prioritize(demo), new Date('2026-10-07'));
    expect(md).toContain('Datos de ejemplo');
    expect(md).toContain('Puntos de estrangulamiento');
  });
});

describe('progreso de remediación en el proyecto', () => {
  it('se conserva al reimportar y se sanea: ids desconocidos, índices no válidos y duplicados fuera', () => {
    const p = parseProject(JSON.stringify({
      format: 'ctem-nexus', name: 'P', assets: [{ id: 'a1', name: 'A', type: 'servidor', criticality: 3 }],
      findings: [{ id: 'H-1', title: 'T', assetId: 'a1', cvss: 5 }],
      progress: { 'H-1': [2, 0, 2, -1, 1.5, 'x', 99], 'H-9': [0], __proto__: { x: [1] } },
    }));
    expect(p?.progress).toEqual({ 'H-1': [0, 2] });
  });
});
