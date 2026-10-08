import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { prioritize } from './engine';
import { explanationIn, factorsIn, reasonsIn } from './explain';

const r = prioritize({ assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES });
const caso = (id: string) => {
  const s = r.scored.find((x) => x.id === id)!;
  const f = DEMO_FINDINGS.find((x) => x.id === id)!;
  return [s, f, DEMO_ASSETS.find((a) => a.id === f.assetId)] as const;
};

describe('explicación en el idioma activo', () => {
  it('en español devuelve exactamente lo que produce el motor (paridad con Python intacta)', () => {
    for (const s of r.scored) {
      const f = DEMO_FINDINGS.find((x) => x.id === s.id)!;
      const a = DEMO_ASSETS.find((x) => x.id === f.assetId);
      expect(explanationIn('es', s, f, a)).toBe(s.explanation);
      expect(factorsIn('es', s, f, a)).toBe(s.factors);
    }
  });

  it('en inglés reconstruye los mismos motivos, en el mismo orden, para todos los hallazgos', () => {
    for (const s of r.scored) {
      const f = DEMO_FINDINGS.find((x) => x.id === s.id)!;
      const a = DEMO_ASSETS.find((x) => x.id === f.assetId);
      const es = s.explanation.split('. ').slice(1).join('. ').split('; ').length;
      const en = explanationIn('en', s, f, a);
      expect(en).toMatch(/^(Critical|High|Medium|Low) priority|^Mitigated; reference score/);
      expect(en.split('. ').slice(1).join('. ').split('; ').length).toBe(es);
      // Sin texto en español salvo el nombre del activo (dato del usuario, entre paréntesis).
      expect(en.replace(/\([^)]*\)/g, '')).not.toMatch(/[áéíóúñ]|Prioridad|Criticidad|saltos?\b/);
    }
  });

  it('Log4Shell: KEV, criticidad 4/5 y validado', () => {
    const [s, f, a] = caso('H-001');
    expect(explanationIn('en', s, f, a)).toBe('Critical priority (92.5/100). CVSS 10.0; In the CISA KEV catalog: active exploitation confirmed; Business criticality 4/5 (Portal web de clientes); Validated as exploitable.');
    expect(reasonsIn('en', s, f, a)).toMatch(/^CVSS 10\.0; /);
    expect(factorsIn('en', s, f, a).map((x) => x.label)).toEqual(['Severity', 'Exploitability', 'Asset criticality', 'Exposure', 'Proximity', 'Validation']);
  });
});
