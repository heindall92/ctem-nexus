/* Correspondencia hallazgo → controles: cobertura de todas las guías, identificadores bien formados y sin texto ISO. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { argosFor, argosUrl, CONTROLS, controlsFor, REMEDIATION_CONTROLS } from './controls';
import { GUIDE_KEYS } from './remediation';

describe('controles', () => {
  it('cada guía de remediación tiene controles y todos existen', () => {
    for (const k of GUIDE_KEYS) {
      expect(REMEDIATION_CONTROLS[k], k).toBeDefined();
      for (const c of REMEDIATION_CONTROLS[k]) expect(CONTROLS[c], `${k} → ${c}`).toBeDefined();
    }
  });
  it('identificadores con el formato de cada marco', () => {
    for (const c of Object.values(CONTROLS)) {
      expect(c.id).toMatch(/^[A-Z]{3}-\d{2}$/);
      for (const x of c.ens) expect(x).toMatch(/^(org|op|mp)\.[a-z]+(\.\d+)?$/);
      for (const x of c.iso27001) expect(x).toMatch(/^A[5-8]\.\d{1,2}$/);
      for (const x of c.nis2) expect(x).toMatch(/^\d{1,2}(\.\d{1,2})?(\.\d\.[a-j])?$/);
      for (const x of c.nist) expect(x).toMatch(/^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$/);
      for (const x of c.dora) expect(x).toMatch(/^\d{1,2}$/);
    }
  });
  it('no contiene texto de normas ISO (solo números de control)', () => {
    const src = readFileSync(resolve(__dirname, 'controls.ts'), 'utf8');
    // Ningún literal largo junto a un identificador ISO: los títulos son los de Rosetta, redactados por el autor.
    expect(src).not.toMatch(/A\d\.\d+[^'\n]{0,4}'[^']{60,}'/);
    expect(src).not.toMatch(/shall|should be|organization shall/i);
  });
  it('controles por tipo cuando la guía no está en la tabla', () => {
    expect(controlsFor({ remediation: 'x', kind: 'cve' })).toEqual(['OPE-04', 'OPE-05']);
    expect(controlsFor({ remediation: 'x', kind: 'identidad' })).toEqual(['ACC-01', 'ACC-03']);
    expect(controlsFor({ remediation: 'x', kind: 'configuracion', sources: ['trivy'] })).toEqual(['OPE-05', 'DES-09']);
    expect(controlsFor({ remediation: 'x', kind: 'configuracion' })).toEqual(['OPE-01', 'OPE-02']);
  });
  it('ARGOS: cada guía lleva a una máquina y la URL va a la vista de máquina', () => {
    for (const k of GUIDE_KEYS) expect(argosFor({ remediation: k, kind: 'cve' }).length, k).toBeGreaterThan(0);
    expect(argosFor({ remediation: 'kerberoast', kind: 'identidad' })[0].id).toBe('m-directorio');
    expect(argosUrl('m-directorio')).toBe('https://heindall92.github.io/argos-grc/#maquina/m-directorio');
  });
});
