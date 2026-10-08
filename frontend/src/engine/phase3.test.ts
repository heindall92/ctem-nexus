/* Simulación, plan de corrección, instantáneas, cumplimiento de SLA y exportaciones a Jira y GitHub. */
import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { slaCompliance } from './compliance';
import { prioritize } from './engine';
import { snapshotOf, trendOf } from './history';
import { pathsBrokenBy } from './impact';
import { githubIssues, jiraCsv, reportMarkdown, type Snapshot } from './io';
import { fixPlan, simulate } from './simulate';
import type { EngineInput, Finding } from './types';

const input: EngineInput = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES };
const base = prioritize(input);
const TODAY = new Date('2026-10-08T10:00:00Z');

describe('simulación', () => {
  it('sin nada marcado es idéntica al motor', () => {
    expect(simulate(input, []).summary).toEqual(base.summary);
  });
  it('corregir Log4Shell baja el índice y las rutas, sin tocar los datos de entrada', () => {
    const snapshot = JSON.stringify(DEMO_FINDINGS);
    const after = simulate(input, ['H-001']);
    expect(after.summary.exposureIndex).toBeLessThan(base.summary.exposureIndex);
    expect(after.summary.attackPaths).toBe(base.summary.attackPaths - pathsBrokenBy(base.graph, ['H-001']));
    expect(JSON.stringify(DEMO_FINDINGS)).toBe(snapshot);
  });
  it('ignora IDs inexistentes y hallazgos ya cerrados', () => {
    expect(simulate(input, ['NO-EXISTE', 'H-017']).summary).toEqual(base.summary);
  });
});

describe('plan de corrección voraz', () => {
  const plan = fixPlan(base, DEMO_FINDINGS, 10);
  it('rompe todas las rutas rompibles y el acumulado nunca baja', () => {
    const breaking = plan.steps.filter((s) => s.newlyBroken > 0);
    expect(breaking.at(-1)!.cumulativeBroken).toBe(plan.totalPaths - plan.unbreakable);
    for (let i = 1; i < plan.steps.length; i++) expect(plan.steps[i].cumulativeBroken).toBeGreaterThanOrEqual(plan.steps[i - 1].cumulativeBroken);
    expect(simulate(input, breaking.flatMap((s) => s.ids)).summary.attackPaths).toBe(plan.unbreakable);
  });
  it('propone juntos los hallazgos que solo cortan su arista a la vez (los dos de Citrix)', () => {
    const together = plan.steps.find((s) => s.ids.length > 1);
    expect(together?.ids.sort()).toEqual(['H-003', 'H-004']);
    expect(pathsBrokenBy(base.graph, ['H-003'])).toBe(0);
  });
  it('no repite hallazgos, solo usa activos y respeta el límite', () => {
    const ids = plan.steps.flatMap((s) => s.ids);
    expect(new Set(ids).size).toBe(ids.length);
    const active = new Set(DEMO_FINDINGS.filter((f) => f.status === 'abierto' || f.status === 'validado').map((f) => f.id));
    for (const id of ids) expect(active.has(id)).toBe(true);
    expect(fixPlan(base, DEMO_FINDINGS, 3).steps).toHaveLength(3);
  });
  it('sin rutas, ordena por puntuación', () => {
    const noJewels = { ...input, assets: DEMO_ASSETS.map((a) => ({ ...a, criticality: Math.min(a.criticality, 4) as 1 | 2 | 3 | 4 })) };
    const r = prioritize(noJewels);
    const p = fixPlan(r, DEMO_FINDINGS, 3);
    expect(p.totalPaths).toBe(0);
    expect(p.steps.map((s) => s.ids[0])).toEqual(r.scored.filter((s) => ['abierto', 'validado'].includes(DEMO_FINDINGS.find((f) => f.id === s.id)!.status)).slice(0, 3).map((s) => s.id));
  });
});

describe('instantáneas y tendencia', () => {
  it('la instantánea refleja el resumen del motor', () => {
    const s = snapshotOf(base, DEMO_FINDINGS, 'defecto', TODAY, ' Ciclo 1 ');
    expect(s).toMatchObject({ at: '2026-10-08', label: 'Ciclo 1', exposureIndex: base.summary.exposureIndex, open: base.summary.openFindings, attackPaths: base.summary.attackPaths, accepted: 1 });
  });
  it('la tendencia compara los dos últimos cierres', () => {
    const a: Snapshot = { at: '2026-09-08', label: '', profile: 'defecto', exposureIndex: 80, open: 15, byBand: { critica: 6, alta: 4, media: 3, baja: 2 }, kev: 8, attackPaths: 9, accepted: 0, overdue: 5, mttrDays: 12 };
    const b: Snapshot = { ...a, at: '2026-10-08', exposureIndex: 71.26, open: 12, byBand: { ...a.byBand, critica: 3 }, kev: 6, attackPaths: 7, overdue: 2, mttrDays: 9, profile: 'banca' };
    expect(trendOf([a])).toBeNull();
    expect(trendOf([a, b])).toMatchObject({ exposureIndex: -8.7, open: -3, critical: -3, kev: -2, attackPaths: -2, overdue: -3, mttrDays: -3, profileChanged: true });
  });
});

describe('cumplimiento de SLA', () => {
  const k = slaCompliance(DEMO_FINDINGS, DEMO_ASSETS, base, TODAY);
  it('cuenta abiertos, validados y mitigados con fecha; no los aceptados ni los no explotables', () => {
    const counted = DEMO_FINDINGS.filter((f) => f.status === 'abierto' || f.status === 'validado' || (f.status === 'mitigado' && f.resolvedAt)).length;
    expect(k.overall.total).toBe(counted);
    expect(k.overall.closedOnTime + k.overall.closedLate + k.overall.openInTime + k.overall.openOverdue).toBe(counted);
    const sumBands = Object.values(k.byBand).reduce((n, b) => n + b.total, 0);
    expect(sumBands).toBe(counted);
    expect(k.byOwner.reduce((n, o) => n + o.bucket.total, 0)).toBe(counted);
  });
  it('un hallazgo cerrado tarde e incumple; uno abierto vencido aparece en la lista', () => {
    const f: Finding[] = [
      { ...DEMO_FINDINGS[0], id: 'X1', status: 'mitigado', detectedAt: '2026-08-01', resolvedAt: '2026-09-30' },
      { ...DEMO_FINDINGS[0], id: 'X2', status: 'abierto', detectedAt: '2026-08-01', resolvedAt: null },
      { ...DEMO_FINDINGS[0], id: 'X3', status: 'abierto', detectedAt: '2026-10-07', resolvedAt: null },
    ];
    const r = prioritize({ assets: DEMO_ASSETS, findings: f, edges: [] });
    const c = slaCompliance(f, DEMO_ASSETS, r, TODAY);
    expect(c.overall).toMatchObject({ total: 3, closedLate: 1, openOverdue: 1, openInTime: 1, compliance: 0.333 });
    expect(c.overdueList.map((x) => x.id)).toEqual(['X2']);
    expect(c.aging).toEqual({ d0_7: 1, d8_30: 0, d31_90: 1, d90: 0 });
  });
});

describe('exportaciones a Jira y GitHub', () => {
  it('Jira: una fila por ticket, prioridad de Jira, fecha ISO y fórmulas neutralizadas', () => {
    const hostile: Finding[] = [{ ...DEMO_FINDINGS[1], id: 'H-X', title: '=HYPERLINK("http://malo")', status: 'abierto' }];
    const csv = jiraCsv(hostile, DEMO_ASSETS, prioritize({ assets: DEMO_ASSETS, findings: hostile, edges: [] }), 'es', TODAY);
    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines[0]).toMatch(/^Summary,Issue Type,Priority,Due Date,Labels,Labels,Labels,Labels,Description/);
    expect(csv).toContain('[Crítica] H-X · =HYPERLINK');
    expect(csv).not.toMatch(/(^|,)"?=HYPERLINK/m);
    const full = jiraCsv(DEMO_FINDINGS, DEMO_ASSETS, base, 'es', TODAY);
    expect(full).toMatch(/,Highest,2026-\d\d-\d\d,ctem-nexus,ctem-critica,cve-2021-44228,log4shell,/);
  });
  it('GitHub: título, cuerpo con casillas y etiquetas; nada se ejecuta', () => {
    const issues = githubIssues(DEMO_FINDINGS, DEMO_ASSETS, base, 'es', TODAY);
    const active = DEMO_FINDINGS.filter((f) => f.status === 'abierto' || f.status === 'validado').length;
    expect(issues).toHaveLength(active);
    const log4 = issues.find((i) => i.title.includes('H-001'))!;
    expect(log4.labels).toEqual(['ctem-nexus', 'prioridad:critica', 'kev']);
    expect(log4.body).toContain('- [ ] ');
    expect(log4.body).toContain('**CVE:** CVE-2021-44228');
  });
});

describe('informe ejecutivo', () => {
  it('incluye perfil, catálogos, tendencia, cinco acciones y riesgos aceptados', () => {
    const prev: Snapshot = { at: '2026-09-08', label: 'Ciclo 1', profile: 'defecto', exposureIndex: 95, open: 18, byBand: { critica: 7, alta: 5, media: 4, baja: 2 }, kev: 9, attackPaths: 9, accepted: 0, overdue: 5, mttrDays: 12 };
    const md = reportMarkdown({ name: 'P', demo: true, profile: 'banca', intel: { kev: { version: '2026.10.07', released: '2026-10-07', count: 9, importedAt: '2026-10-08' } }, snapshots: [prev] }, DEMO_FINDINGS, DEMO_ASSETS, base, TODAY, '', 'es');
    expect(md).toContain('Perfil de ponderación: banca y finanzas · CISA KEV 2026.10.07');
    expect(md).toContain('## Tendencia');
    expect(md).toContain('Frente al cierre del 2026-09-08 (Ciclo 1)');
    expect(md).toContain('El perfil de ponderación cambió');
    expect(md).toContain('## Cinco acciones');
    expect(md).toMatch(/1\. H-001 · Log4Shell/);
    expect(md).toContain('## Riesgos aceptados');
    expect(md).toContain('H-019');
  });
});
