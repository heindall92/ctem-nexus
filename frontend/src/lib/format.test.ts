import { describe, expect, it } from 'vitest';
import { pct, wrapLabel } from './format';

describe('formato', () => {
  it('parte los nombres largos del grafo en dos líneas por palabras, sin perder la primera', () => {
    expect(wrapLabel('Exchange OWA', 24)).toEqual(['Exchange OWA', '']);
    expect(wrapLabel('Servidor de aplicaciones APP01', 24)).toEqual(['Servidor de aplicaciones', 'APP01']);
    expect(wrapLabel('Estaciones de trabajo (VLAN 50)', 24)).toEqual(['Estaciones de trabajo', '(VLAN 50)']);
    const [a, b] = wrapLabel('Entidad de certificación PKI-CA01 con un nombre larguísimo de verdad', 21);
    expect(a.length).toBeLessThanOrEqual(21);
    expect(b.length).toBeLessThanOrEqual(21);
    expect(b.endsWith('…')).toBe(true);
    expect(wrapLabel('Supercalifragilisticoespialidoso', 10)[0]).toBe('Supercali-');
  });

  it('los porcentajes usan espacio duro para no partirse en la tabla', () => {
    expect(pct(0.944)).toBe('94,4 %');
    expect(pct(null)).toBe('—');
  });
});
