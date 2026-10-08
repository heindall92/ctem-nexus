import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import {
  buildCoverage, inferAttack, isLive, TACTICS, TECHNIQUES, tacticSummary, techniqueExposure, techniquesOf, techniqueUrl, toNavigatorLayer,
} from './attack';
import { prioritize } from './engine';
import { GUIDES } from './remediation';
import type { Finding } from './types';

const base: Finding = {
  id: 'X-1', title: 'x', kind: 'configuracion', cve: null, cvss: 5, epss: null, kev: false, exploitPublic: false,
  assetId: 'a01', status: 'abierto', remediation: 'weak_config', detectedAt: '2026-10-01', leadsTo: [],
};

describe('catálogo', () => {
  it('cada táctica tiene técnicas, sin ID repetidos y con formato válido', () => {
    for (const t of TACTICS) expect(TECHNIQUES.some((x) => x.tactic === t.id), t.id).toBe(true);
    const ids = TECHNIQUES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^T\d{4}(\.\d{3})?$/);
  });
  it('enlace oficial también para subtécnicas', () => {
    expect(techniqueUrl('T1190')).toBe('https://attack.mitre.org/techniques/T1190/');
    expect(techniqueUrl('T1558.003')).toBe('https://attack.mitre.org/techniques/T1558/003/');
  });
});

describe('inferencia', () => {
  it('cada guía específica de remediation.ts produce al menos una técnica', () => {
    for (const key of Object.keys(GUIDES)) {
      if (key === 'patch_cve' || key === 'weak_config') continue;
      expect(inferAttack('—', null, 'configuracion', key).length, key).toBeGreaterThan(0);
    }
  });
  it('guías de la demo', () => {
    expect(inferAttack('Log4Shell', 'CVE-2021-44228', 'cve', 'log4shell')).toEqual(expect.arrayContaining(['T1190', 'T1059']));
    expect(inferAttack('Cuenta con SPN', null, 'identidad', 'kerberoast')).toContain('T1558.003');
    expect(inferAttack('Sin preautenticación', null, 'identidad', 'asrep_roast')).toContain('T1558.004');
    expect(inferAttack('LLMNR y NBT-NS habilitados', null, 'configuracion', 'llmnr')).toEqual(expect.arrayContaining(['T1557.001', 'T1040']));
    expect(inferAttack('Cola de impresión en el DC', null, 'configuracion', 'print_spooler')).toContain('T1543.003');
  });
  it('títulos de escáner en inglés y del analista en español', () => {
    expect(inferAttack('SMB Signing not required', null, 'configuracion', 'weak_config')).toContain('T1557.001');
    expect(inferAttack('Firma SMB no obligatoria', null, 'configuracion', 'weak_config')).toContain('T1557.001');
    expect(inferAttack('Reflected XSS in search', null, 'configuracion', 'weak_config')).toEqual(expect.arrayContaining(['T1059.007', 'T1189']));
    expect(inferAttack('Secreto expuesto: AWS Access Key', null, 'identidad', 'identity_generic')).toContain('T1552.001');
    expect(inferAttack('Git repository exposed (.git/config)', null, 'configuracion', 'weak_config')).toContain('T1552.001');
    expect(inferAttack('Microsoft Office: RCE mediante documentos', 'CVE-2023-36884', 'cve', 'patch_cve')).toEqual(expect.arrayContaining(['T1203', 'T1566']));
    expect(inferAttack('Copias de seguridad del ERP sin cifrar', null, 'configuracion', 'weak_config')).toContain('T1005');
  });
  it('sin falsos positivos por subcadenas', () => {
    expect(inferAttack('Brute force protection disabled', null, 'configuracion', 'weak_config')).not.toContain('T1059');
    expect(inferAttack('Resource exhaustion in source parser', null, 'configuracion', 'weak_config')).not.toContain('T1059');
    expect(inferAttack('Max depth not enforced', null, 'configuracion', 'weak_config')).not.toContain('T1550.002');
  });
  it('CVE sin más pistas → explotación de aplicación expuesta; configuración genérica no se adivina', () => {
    expect(inferAttack('Algo raro', 'CVE-2024-1234', 'cve', 'patch_cve')).toEqual(['T1190']);
    expect(inferAttack('Algo raro', null, 'configuracion', 'weak_config')).toEqual([]);
    expect(inferAttack('Algo raro', null, 'identidad', 'identity_generic')).toEqual(expect.arrayContaining(['T1078']));
  });
  it('tope de 6 y solo IDs del catálogo', () => {
    const ids = inferAttack('RCE XSS SSTI SMB signing kerberoast secret phishing web shell backup', 'CVE-2021-44228', 'cve', 'log4shell');
    expect(ids.length).toBeLessThanOrEqual(6);
    const valid = new Set(TECHNIQUES.map((t) => t.id));
    for (const id of ids) expect(valid.has(id)).toBe(true);
  });
});

describe('techniquesOf', () => {
  it('las fijadas por el analista mandan; las desconocidas se ignoran', () => {
    expect(techniquesOf({ ...base, title: 'Log4Shell', attack: ['T1133'] })).toEqual(['T1133']);
    expect(techniquesOf({ ...base, title: 'SMB signing', attack: ['T9999'] })).toContain('T1557.001');
  });
});

describe('exposición', () => {
  it('cuenta solo hallazgos vivos (los aceptados siguen contando)', () => {
    expect(isLive({ status: 'aceptado' })).toBe(true);
    expect(isLive({ status: 'mitigado' })).toBe(false);
    expect(isLive({ status: 'no_explotable' })).toBe(false);
    const cov = buildCoverage([
      { ...base, id: 'A', attack: ['T1190'] },
      { ...base, id: 'B', attack: ['T1190'], status: 'mitigado' },
      { ...base, id: 'C', attack: ['T1190'], status: 'aceptado' },
    ]);
    expect(cov.get('T1190')).toMatchObject({ count: 2, findingIds: ['A', 'C'] });
  });
  it('la demo expone técnicas en varias tácticas y la peor banda manda', () => {
    const result = prioritize({ assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES });
    const exp = techniqueExposure(DEMO_FINDINGS, result.scored);
    expect(exp.length).toBeGreaterThan(10);
    const t1190 = exp.find((e) => e.technique.id === 'T1190')!;
    expect(t1190.band).toBe('critica');
    expect(exp[0].band).toBe('critica');
    // H-017 (TLS) está mitigado: no aporta T1040 por sí solo.
    expect(buildCoverage(DEMO_FINDINGS).get('T1040')?.findingIds ?? []).not.toContain('H-017');
    const per = tacticSummary(buildCoverage(DEMO_FINDINGS));
    expect([...per.values()].filter((v) => v.covered > 0).length).toBeGreaterThanOrEqual(5);
    for (const v of per.values()) expect(v.covered).toBeLessThanOrEqual(v.total);
  });
});

describe('capa de ATT&CK Navigator', () => {
  it('formato 4.5, puntuación con tope 3, comentario con hallazgos y sin táctica fija', () => {
    const findings = ['A', 'B', 'C', 'D'].map((id) => ({ ...base, id, attack: ['T1190'], cve: id === 'A' ? 'CVE-2021-44228' : null }));
    const layer = toNavigatorLayer([...findings, { ...base, id: 'E', attack: ['T1040'] }], { today: '2026-10-08', name: 'Prueba' });
    expect(layer).toMatchObject({ name: 'Prueba', domain: 'enterprise-attack', versions: { layer: '4.5' } });
    const t = layer.techniques.find((x) => x.techniqueID === 'T1190')!;
    expect(t.score).toBe(3);
    expect(t.comment).toContain('A (CVE-2021-44228)');
    expect(t).not.toHaveProperty('tactic');
    expect(layer.techniques.find((x) => x.techniqueID === 'T1040')?.score).toBe(1);
    expect(layer.description).toContain('2026-10-08');
    expect(toNavigatorLayer([], { lang: 'en', today: '2026-10-08' }).name).toBe('CTEM-Nexus · Exposure by technique');
  });
});
