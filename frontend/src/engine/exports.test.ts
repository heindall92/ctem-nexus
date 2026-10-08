/* Exportaciones en el idioma activo: el informe y los tickets en inglés no arrastran texto de la interfaz en español. */
import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { prioritize } from './engine';
import { reportMarkdown, ticketsCsv, ticketsMarkdown } from './io';

const r = prioritize({ assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES });
// Quita los datos del caso (nombres, títulos, responsables): son del usuario y van en su idioma.
const sinDatos = (t: string) => [...DEMO_ASSETS.flatMap((a) => [a.name, a.owner]), ...DEMO_FINDINGS.map((f) => f.title), 'Ejemplo'].sort((a, b) => b.length - a.length).reduce((acc, d) => acc.split(d).join(' '), t);

describe('exportaciones ES/EN', () => {
  it('el informe en inglés usa títulos, bandas y cifras en inglés', () => {
    const md = reportMarkdown({ name: 'Demo', demo: true }, DEMO_FINDINGS, DEMO_ASSETS, r, new Date('2026-10-08'), '', 'en');
    expect(md).toContain('# Executive exposure report · Demo');
    expect(md).toContain('| Exposure index | ');
    expect(md).toMatch(/\| Critical \| 92\.5 \|/);
    expect(sinDatos(md)).not.toMatch(/[áéíóúñ]|Informe|Hallazgo|Riesgos|Recomendación|Puntuación/);
  });

  it('los tickets en inglés traen la guía, el motivo y el vencimiento en inglés', () => {
    const md = ticketsMarkdown(DEMO_FINDINGS, DEMO_ASSETS, r, 'en');
    expect(md).toContain('# Remediation tickets · CTEM-Nexus');
    expect(md).toContain('### Remove Log4Shell (Log4j 2)');
    expect(md).toMatch(/\*\*Due:\*\* \d{4}-\d{2}-\d{2}/);
    expect(md).toContain('**Reason:** Critical priority (92.5/100).');
    const csv = ticketsCsv(DEMO_FINDINGS, DEMO_ASSETS, r, 'en');
    expect(csv.replace(/^\uFEFF/, '').split(/\r?\n/)[0]).toBe('id,titulo,cve,activo,responsable,prioridad,puntuacion,sla_dias,pasos,verificacion,explicacion');
    expect(csv).toContain('Upgrade log4j-core to 2.17.1');
    expect(csv).toContain(',Critical,');
  });

  it('en español no cambia nada respecto al motor', () => {
    const md = ticketsMarkdown(DEMO_FINDINGS, DEMO_ASSETS, r);
    expect(md).toContain('# Tickets de remediación · CTEM-Nexus');
    expect(md).toContain(`**Motivo:** ${r.scored[0].explanation}`);
  });
});
