/* Fase 6: importadores de validación ofensiva (ZAP, Burp, PingCastle, Certipy), validación y retest. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ANCHOR, DEMO_ASSETS, DEMO_FINDINGS } from '../data/demo';
import { techniqueById } from './attack';
import { CONTROLS, REMEDIATION_CONTROLS } from './controls';
import { parseProject } from './io';
import { planImport } from './merge';
import { parseBurp, parseCertipy, parsePingCastle, parseZap, pingCastleCvss, pingCastleRule, stripHtml, stripInertDoctype, webRemediation } from './offensive';
import { GUIDES, guideIn } from './remediation';
import { parseValidation, retestStats, statusForValidation, validateValidation, withStatus } from './retest';
import { detectFormat, parseScan } from './scanners';
import type { Finding } from './types';

const sample = (f: string) => readFileSync(resolve(__dirname, '../../../shared/samples', f), 'utf8');

describe('detección de los formatos ofensivos', () => {
  it('reconoce cada ejemplo y lo encamina al importador unificado', () => {
    expect(detectFormat(sample('zap-ejemplo.json'))).toBe('zap');
    expect(detectFormat(sample('burp-ejemplo.xml'))).toBe('burp');
    expect(detectFormat(sample('pingcastle-ejemplo.xml'))).toBe('pingcastle');
    expect(detectFormat(sample('certipy-ejemplo.json'))).toBe('certipy');
    expect(parseScan(sample('zap-ejemplo.json')).source).toBe('zap');
  });
});

describe('OWASP ZAP', () => {
  const p = parseZap(sample('zap-ejemplo.json'));
  it('omite informativos y falsos positivos, y clasifica por CWE', () => {
    expect(p.tool).toBe('OWASP ZAP 2.15.0');
    expect(p.items.map((i) => i.remediation)).toEqual(['web_injection', 'web_xss', 'web_hardening']);
    expect(p.skipped).toBe(2);
    expect(p.items[0]).toMatchObject({ cvss: 8, kind: 'configuracion' });
    expect(p.hosts).toEqual([{ key: 'portal.meridiano.example', ip: '', name: 'portal.meridiano.example', type: 'aplicacion_web', exposed: true }]);
  });
  it('la evidencia trae URL, parámetro y CWE, pero nunca la carga del ataque', () => {
    expect(p.items[1].evidence).toContain('CWE-79');
    expect(p.items[1].evidence).toContain('Parámetros: q');
    expect(p.items.map((i) => i.evidence).join(' ')).not.toMatch(/<scr/i);
    expect(p.items[0].description).toBe('SQL injection may be possible.');
  });
  it('rechaza lo que no es ZAP y sanea HTML y prototipos', () => {
    expect(() => parseZap('{"hola":1}')).toThrow(/OWASP ZAP/);
    const hostil = parseZap('{"@programName":"ZAP","site":[{"@name":"http://10.0.0.5","__proto__":{"x":1},"alerts":[{"alert":"<img src=x onerror=alert(1)>XSS","riskcode":"3","confidence":"3","cweid":"79","desc":"<script>evil()</script>Texto"}]}]}');
    expect(hostil.items[0].description).toBe('evil() Texto');
    expect(hostil.hosts[0]).toMatchObject({ ip: '10.0.0.5', exposed: false });
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(stripHtml('<b>a</b> &amp; b')).toBe('a & b');
  });
});

describe('Burp Suite', () => {
  const p = parseBurp(sample('burp-ejemplo.xml'));
  it('acepta la DTD inerte de Burp, omite informativos y usa la IP del host', () => {
    expect(p.items).toHaveLength(2);
    expect(p.skipped).toBe(1);
    expect(p.items[0]).toMatchObject({ title: 'SQL injection', cvss: 8, remediation: 'web_injection', exploitPublic: true });
    expect(p.hosts[0]).toMatchObject({ ip: '203.0.113.10', exposed: true });
  });
  it('nunca guarda la petición ni la respuesta (pueden llevar cookies)', () => {
    const all = JSON.stringify(p);
    expect(all).not.toContain('R0VUIC9wZWRpZG9z');
    expect(all).not.toMatch(/session=SECRETO/);
  });
  it('sigue rechazando entidades aunque vengan en una DTD de Burp', () => {
    const malo = '<?xml version="1.0"?><!DOCTYPE issues [<!ENTITY x "a">]><issues><issue><name>&x;</name><severity>High</severity></issue></issues>';
    expect(stripInertDoctype(malo)).toBe(malo);
    expect(() => parseBurp(malo)).toThrow(/entidades/);
  });
  it('se funde con el portal de la demo por su IP', () => {
    const plan = planImport(p, { assets: DEMO_ASSETS, findings: DEMO_FINDINGS }, { today: DEMO_ANCHOR });
    expect(plan.newAssets).toHaveLength(0);
    expect(plan.newFindings.every((f) => f.assetId === 'a01' && f.id.startsWith('BRP-'))).toBe(true);
  });
});

describe('PingCastle', () => {
  const p = parsePingCastle(sample('pingcastle-ejemplo.xml'));
  it('cada regla con puntos es un hallazgo del dominio, con su técnica', () => {
    expect(p.tool).toBe('PingCastle 3.3.0.1 · puntuación 70/100');
    expect(p.hosts[0]).toMatchObject({ name: 'meridiano.local', type: 'controlador_dominio' });
    expect(p.items.map((i) => i.remediation)).toEqual(['kerberoast', 'laps', 'print_spooler', 'smb_signing', 'weak_config']);
    expect(p.skipped).toBe(1);
    expect(p.items[0]).toMatchObject({ cvss: 9, attack: ['T1558.003'] });
    expect(p.items[0].evidence).toContain('Account: svc_sql');
  });
  it('puntos → CVSS orientativo y reglas desconocidas a la guía de higiene', () => {
    expect([pingCastleCvss(50), pingCastleCvss(15), pingCastleCvss(5), pingCastleCvss(1)]).toEqual([9, 7.5, 5, 3]);
    expect(pingCastleRule('S-Inactive', 'Inactive computers').remediation).toBe('ad_hygiene');
    expect(pingCastleRule('P-DCSync', 'DCSync rights').attack).toEqual(['T1003.006']);
  });
});

describe('Certipy', () => {
  const p = parseCertipy(sample('certipy-ejemplo.json'));
  it('una CA y una plantilla vulnerables; la plantilla sana no cuenta', () => {
    expect(p.items.map((i) => i.title)).toEqual(['AD CS ESC8 en meridiano-PKI-CA01', 'AD CS ESC1 en la plantilla UserAuth']);
    expect(p.items.every((i) => i.remediation === 'adcs_esc1' && i.attack?.includes('T1649') && i.cvss === 9)).toBe(true);
    expect(p.items[1].evidence).toContain('Domain Users');
    expect(p.hosts).toEqual([{ key: 'pki-ca01.meridiano.local', ip: '', name: 'pki-ca01.meridiano.local', type: 'pki', exposed: false }]);
  });
  it('rechaza lo que no es Certipy e ignora ESC inventados', () => {
    expect(() => parseCertipy('[]')).toThrow(/certipy/i);
    expect(parseCertipy('{"Certificate Templates":{"0":{"Template Name":"X","[!] Vulnerabilities":{"ESC99x":"no"}}}}').items).toHaveLength(0);
  });
});

describe('guías nuevas', () => {
  it('web y AD tienen guía en los dos idiomas, controles y técnicas válidas', () => {
    for (const k of ['web_injection', 'web_xss', 'web_hardening', 'ad_hygiene']) {
      expect(GUIDES[k], k).toBeDefined();
      expect(guideIn('en', k).title, k).not.toBe(GUIDES[k].title);
      expect(REMEDIATION_CONTROLS[k].every((c) => CONTROLS[c])).toBe(true);
    }
    expect(webRemediation('Remote OS Command Injection', 78)).toBe('web_injection');
    expect(webRemediation('Missing Anti-clickjacking Header', 1021)).toBe('web_hardening');
    for (const p of [parsePingCastle(sample('pingcastle-ejemplo.xml')), parseCertipy(sample('certipy-ejemplo.json'))]) {
      for (const it of p.items) for (const id of it.attack ?? []) expect(techniqueById(id), id).toBeDefined();
    }
  });
});

describe('validación y retest', () => {
  const base: Finding = { ...DEMO_FINDINGS[0], sources: ['nessus'], status: 'abierto' };
  it('validación: reglas, estado resultante y saneado', () => {
    expect(validateValidation({ result: 'explotado', at: '2026-09-10', by: 'Red team', technique: 'T1190', proof: 'curl con payload ${jndi}' }, '2026-09-16')).toEqual([]);
    expect(validateValidation({ result: 'x' as never, at: '2026-09-20', by: '', technique: 'TX', proof: 'corto' }, '2026-09-16')).toEqual(['resultado', 'responsable', 'futura', 'tecnica', 'prueba']);
    expect([statusForValidation('explotado'), statusForValidation('no_explotable'), statusForValidation('mitigado_control')]).toEqual(['validado', 'no_explotable', 'no_explotable']);
    expect(parseValidation({ result: 'explotado', at: '2026-09-10', by: 'a', technique: 't1190', proof: 'p' })?.technique).toBe('T1190');
    expect(parseValidation({ result: 'otro', at: '2026-09-10' })).toBeNull();
  });
  it('mitigar deja la corrección pendiente; reabrir la quita', () => {
    const m = withStatus(base, 'mitigado', '2026-09-16');
    expect(m.retest).toEqual({ state: 'pendiente', since: '2026-09-16' });
    expect(m.resolvedAt).toBe('2026-09-16');
    expect(withStatus(m, 'abierto', '2026-09-17').retest).toBeUndefined();
  });
  it('un escaneo de la misma herramienta que no lo ve lo verifica; otra herramienta no', () => {
    const m = withStatus(base, 'mitigado', '2026-09-16');
    const otros = DEMO_FINDINGS.filter((f) => f.id !== m.id);
    const scanOtro = { source: 'nessus' as const, tool: 'Nessus', hosts: [{ key: 'h', ip: DEMO_ASSETS[0].ip, name: 'x', type: 'servidor' as const, exposed: true }], items: [], skipped: 0 };
    expect(planImport(scanOtro, { assets: DEMO_ASSETS, findings: [m, ...otros] }).verifiedIds).toEqual([m.id]);
    expect(planImport({ ...scanOtro, source: 'nuclei' }, { assets: DEMO_ASSETS, findings: [m, ...otros] }).verifiedIds).toEqual([]);
    const otraIp = { ...scanOtro, hosts: [{ ...scanOtro.hosts[0], ip: '198.51.100.99' }] };
    expect(planImport(otraIp, { assets: DEMO_ASSETS, findings: [m, ...otros] }).verifiedIds).toEqual([]);
  });
  it('estadísticas: pendientes, verificados, reabiertos y tasa', () => {
    const fs: Finding[] = [
      { ...base, id: 'A', status: 'mitigado', retest: { state: 'pendiente', since: '2026-09-02' } },
      { ...base, id: 'B', status: 'mitigado', retest: { state: 'verificado', since: '2026-09-01', verifiedAt: '2026-09-10' } },
      { ...base, id: 'C', status: 'mitigado', retest: { state: 'verificado', since: '2026-09-01', verifiedAt: '2026-09-10' } },
      { ...base, id: 'D', status: 'mitigado', retest: { state: 'pendiente', since: '2026-09-01' } },
    ];
    expect(retestStats(fs, [{ reopened: 1 }, { reopened: 1 }])).toEqual({ pending: 2, verified: 2, reopened: 2, reopenRate: 0.5, pendingList: [{ id: 'D', since: '2026-09-01' }, { id: 'A', since: '2026-09-02' }] });
    expect(retestStats([]).reopenRate).toBeNull();
  });
  it('el proyecto guarda validación y retest, y descarta el retest de lo que no está mitigado', () => {
    const p = parseProject(JSON.stringify({ format: 'ctem-nexus', version: 1, name: 'x', assets: DEMO_ASSETS, findings: [
      { ...base, id: 'V', status: 'validado', validation: { result: 'explotado', at: '2026-09-10', by: 'Red', technique: 'T1190', proof: 'prueba larga' }, retest: { state: 'pendiente', since: '2026-09-10' } },
      { ...base, id: 'M', status: 'mitigado', resolvedAt: '2026-09-11', retest: { state: 'verificado', since: '2026-09-11', verifiedAt: '2026-09-12', by: 'Nessus' } },
    ] }))!;
    expect(p.findings[0].validation?.result).toBe('explotado');
    expect(p.findings[0].retest).toBeUndefined();
    expect(p.findings[1].retest).toEqual({ state: 'verificado', since: '2026-09-11', verifiedAt: '2026-09-12', by: 'Nessus' });
  });
});
