/* Importadores de escáneres con los ficheros de ejemplo de shared/samples/ y casos hostiles. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_FINDINGS } from '../data/demo';
import { planImport } from './merge';
import { detectFormat, guessRemediation, parseNessus, parseNuclei, parseOpenVas, parseSarif, parseScan, parseTrivy } from './scanners';
import { parseXml } from './xml';

const sample = (f: string) => readFileSync(resolve(__dirname, '../../../shared/samples', f), 'utf8');
const demo = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS };

describe('detección de formato', () => {
  it('reconoce cada muestra y los catálogos de inteligencia', () => {
    expect(detectFormat(sample('nessus-ejemplo.nessus'))).toBe('nessus');
    expect(detectFormat(sample('openvas-ejemplo.xml'))).toBe('openvas');
    expect(detectFormat(sample('nuclei-ejemplo.jsonl'))).toBe('nuclei');
    expect(detectFormat(sample('trivy-ejemplo.json'))).toBe('trivy');
    expect(detectFormat(sample('sarif-ejemplo.sarif'))).toBe('sarif');
    expect(detectFormat(sample('nmap-ejemplo.xml'))).toBe('nmap');
    expect(detectFormat(sample('kev-ejemplo.json'))).toBe('kev');
    expect(detectFormat(sample('epss-ejemplo.csv'))).toBe('epss');
    expect(() => parseScan(sample('nmap-ejemplo.xml'))).toThrow(/Nmap/);
    expect(() => parseScan('hola')).toThrow(/no reconocido/);
  });
});

describe('Nessus', () => {
  const r = parseNessus(sample('nessus-ejemplo.nessus'));
  it('lee hosts, CVE, CVSS v3, exploit y KEV; omite lo informativo', () => {
    expect(r.hosts.map((h) => h.ip)).toEqual(['203.0.113.10', '10.10.20.15', '10.10.40.20']);
    expect(r.hosts[0]).toMatchObject({ name: 'portal.meridiano.example', exposed: true });
    expect(r.hosts[1].exposed).toBe(false);
    const log4 = r.items.find((i) => i.cve === 'CVE-2021-44228')!;
    expect(log4).toMatchObject({ cvss: 10, kev: true, exploitPublic: true, relatedCves: ['CVE-2021-45046'], remediation: 'log4shell' });
    expect(log4.title).toBe('Apache Log4j 2.x < 2.16.0 RCE (Log4Shell)');
    expect(r.skipped).toBe(1);
    expect(r.items.find((i) => i.cve === 'CVE-2017-0143')?.exploitPublic).toBe(true);
    expect(r.items.filter((i) => /SMB Signing/.test(i.title)).every((i) => i.remediation === 'smb_signing')).toBe(true);
  });
  it('rechaza entidades y DTD (XXE)', () => {
    const xxe = '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><NessusClientData_v2><Report><ReportHost name="&e;"/></Report></NessusClientData_v2>';
    expect(() => parseNessus(xxe)).toThrow(/entidades|DTD/);
  });
});

describe('OpenVAS / Greenbone', () => {
  const r = parseOpenVas(sample('openvas-ejemplo.xml'));
  it('cuenta una vez el resultado repetido del informe anidado y omite «Log»', () => {
    expect(r.items).toHaveLength(2);
    expect(r.skipped).toBe(1);
    const ps = r.items.find((i) => i.cve === 'CVE-2021-34473')!;
    expect(ps).toMatchObject({ relatedCves: ['CVE-2021-34523'], cvss: 9.8, exploitPublic: true, remediation: 'proxyshell' });
    expect(ps.evidence).toContain('443/tcp');
    expect(r.hosts.find((h) => h.ip === '10.10.30.12')?.name).toBe('erp-db');
  });
});

describe('Nuclei', () => {
  const r = parseNuclei(sample('nuclei-ejemplo.jsonl'));
  it('lee JSONL, normaliza CVE, toma KEV de las etiquetas y omite «info»', () => {
    expect(r.items).toHaveLength(3);
    expect(r.skipped).toBe(1);
    const l = r.items.find((i) => i.cve === 'CVE-2021-44228')!;
    expect(l).toMatchObject({ kev: true, exploitPublic: true, cvss: 10 });
    expect(l.epss).toBeCloseTo(0.94358);
    expect(r.items.find((i) => i.cve === 'CVE-2023-4966')?.kev).toBe(true);
    expect(r.hosts.find((h) => h.ip === '203.0.113.10')?.type).toBe('aplicacion_web');
  });
  it('acepta también el JSON de -json-export y descarta claves peligrosas', () => {
    const arr = `[{"template-id":"x","__proto__":{"polluted":1},"info":{"name":"Prueba","severity":"high"},"host":"https://h.example","ip":"192.0.2.9"}]`;
    const p = parseNuclei(arr);
    expect(p.items).toHaveLength(1);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('Trivy', () => {
  const r = parseTrivy(sample('trivy-ejemplo.json'));
  it('crea el artefacto como activo, lee vulnerabilidades, configuración y secretos; omite UNKNOWN y PASS', () => {
    expect(r.hosts).toHaveLength(1);
    expect(r.hosts[0]).toMatchObject({ name: 'registry.meridiano.example/portal:2.4.1', type: 'nube', exposed: false });
    expect(r.items.filter((i) => i.cve === 'CVE-2021-44228')).toHaveLength(2);
    expect(r.items.some((i) => /root/.test(i.title))).toBe(true);
    expect(r.skipped).toBe(2);
  });
  it('nunca guarda el valor del secreto', () => {
    const secret = r.items.find((i) => i.title.startsWith('Secreto expuesto'))!;
    expect(secret.kind).toBe('identidad');
    expect(JSON.stringify(r)).not.toContain('EJEMPLO-NO-REAL');
    expect(secret.evidence).toContain('application.properties:12');
  });
});

describe('SARIF', () => {
  const r = parseSarif(sample('sarif-ejemplo.sarif'));
  it('usa el repositorio como activo y security-severity como CVSS; omite nivel «none»', () => {
    expect(r.hosts[0].name).toBe('git.meridiano.example/web/portal');
    expect(r.items).toHaveLength(3);
    expect(r.skipped).toBe(1);
    expect(r.items[0]).toMatchObject({ cvss: 8.8, kind: 'configuracion' });
    expect(r.items.find((i) => /Contraseña/.test(i.title))?.kind).toBe('identidad');
    expect(r.tool).toBe('Semgrep OSS 1.90.0');
  });
});

describe('deduplicación e incorporación (planImport)', () => {
  it('Nessus: funde el mismo plugin en dos puertos y casa activos por IP; crea el host nuevo', () => {
    const plan = planImport(parseNessus(sample('nessus-ejemplo.nessus')), demo, { today: '2026-10-08' });
    expect(plan.matchedAssets).toBe(2);
    expect(plan.newAssets).toHaveLength(1);
    expect(plan.newAssets[0]).toMatchObject({ id: 'a09', ip: '10.10.40.20', name: 'fs01.meridiano.example', tags: ['nessus'] });
    expect(plan.duplicatesInFile).toBe(1);
    // Log4Shell ya existía como H-001 en el portal: se actualiza, no se duplica.
    const h1 = plan.updatedFindings.find((f) => f.id === 'H-001')!;
    expect(h1.sources).toEqual(['manual', 'nessus']);
    expect(h1.relatedCves).toEqual(['CVE-2021-45046']);
    expect(h1.status).toBe('validado');
    // «SMB Signing not required» = H-008 «Firma SMB no obligatoria» (misma guía específica en el mismo activo).
    expect(plan.updatedFindings.some((f) => f.id === 'H-008')).toBe(true);
    expect(plan.newFindings.map((f) => f.id)).toEqual(['NES-001', 'NES-002']);
    expect(plan.newFindings.find((f) => f.cve === 'CVE-2017-0143')?.assetId).toBe('a09');
  });
  it('OpenVAS: ProxyShell casa con H-002 por CVE', () => {
    const plan = planImport(parseOpenVas(sample('openvas-ejemplo.xml')), demo, { today: '2026-10-08' });
    expect(plan.updatedFindings.map((f) => f.id)).toEqual(['H-002']);
    expect(plan.updatedFindings[0].relatedCves).toEqual(['CVE-2021-34523']);
    expect(plan.newFindings[0]).toMatchObject({ id: 'OVS-001', assetId: 'a08', sources: ['openvas'] });
  });
  it('Nuclei: casa con H-001 y H-003 y añade la exposición de .git', () => {
    const plan = planImport(parseNuclei(sample('nuclei-ejemplo.jsonl')), demo, { today: '2026-10-08' });
    expect(plan.updatedFindings.map((f) => f.id).sort()).toEqual(['H-001', 'H-003']);
    expect(plan.newFindings).toHaveLength(1);
    expect(plan.newFindings[0].assetId).toBe('a01');
  });
  it('Trivy: el mismo CVE en dos JAR es un único hallazgo con las dos evidencias; se puede asignar a un activo existente', () => {
    const plan = planImport(parseTrivy(sample('trivy-ejemplo.json')), demo, { today: '2026-10-08', targetAssetId: 'a01' });
    expect(plan.newAssets).toHaveLength(0);
    expect(plan.duplicatesInFile).toBe(1);
    const h1 = plan.updatedFindings.find((f) => f.id === 'H-001')!;
    expect(h1.evidence).toContain('app/lib/log4j-core-2.14.1.jar');
    expect(h1.evidence).toContain('app/lib/legacy/log4j-core-2.14.1.jar');
    expect(plan.newFindings.every((f) => f.id.startsWith('TRV-') && f.assetId === 'a01')).toBe(true);
  });
  it('SARIF: dos resultados de la misma regla son un hallazgo; el repositorio es un activo nuevo', () => {
    const plan = planImport(parseSarif(sample('sarif-ejemplo.sarif')), demo, { today: '2026-10-08' });
    expect(plan.newAssets).toHaveLength(1);
    expect(plan.duplicatesInFile).toBe(1);
    expect(plan.newFindings).toHaveLength(2);
    expect(plan.newFindings[0].evidence?.split('\n')).toHaveLength(2);
  });
  it('un hallazgo mitigado que vuelve a aparecer se reabre (regresión)', () => {
    const findings = DEMO_FINDINGS.map((f) => (f.id === 'H-001' ? { ...f, status: 'mitigado' as const, resolvedAt: '2026-09-20' } : f));
    const plan = planImport(parseNuclei(sample('nuclei-ejemplo.jsonl')), { assets: DEMO_ASSETS, findings }, { today: '2026-10-08' });
    const h1 = plan.updatedFindings.find((f) => f.id === 'H-001')!;
    expect(plan.reopened).toBe(1);
    expect(h1).toMatchObject({ status: 'abierto', resolvedAt: null });
    expect(h1.evidence).toMatch(/Reaparece tras la mitigación/);
  });
  it('una IP dentro del CIDR de un activo se asigna a ese activo', () => {
    const p = parseNuclei('{"template-id":"t","info":{"name":"Panel expuesto","severity":"medium"},"host":"http://10.10.50.33","ip":"10.10.50.33"}');
    const plan = planImport(p, demo, { today: '2026-10-08' });
    expect(plan.newAssets).toHaveLength(0);
    expect(plan.newFindings[0].assetId).toBe('a05');
  });
  it('importar dos veces el mismo fichero no duplica nada', () => {
    const parse = parseNessus(sample('nessus-ejemplo.nessus'));
    const first = planImport(parse, demo, { today: '2026-10-08' });
    const assets = [...DEMO_ASSETS, ...first.newAssets];
    const byId = new Map(DEMO_FINDINGS.map((f) => [f.id, f]));
    for (const f of [...first.updatedFindings, ...first.newFindings]) byId.set(f.id, f);
    const second = planImport(parse, { assets, findings: [...byId.values()] }, { today: '2026-10-09' });
    expect(second.newAssets).toHaveLength(0);
    expect(second.newFindings).toHaveLength(0);
    expect(second.updatedFindings.length).toBeGreaterThan(0);
  });
});

describe('analizador XML', () => {
  it('decodifica entidades predefinidas y numéricas, CDATA y espacios de nombres', () => {
    const doc = parseXml('<a:root xmlns:a="u"><b x="1 &amp; 2">&lt;ok&gt; &#241;<![CDATA[<crudo>]]></b><c/></a:root>');
    const root = doc.children[0];
    expect(root.name).toBe('root');
    expect(root.children[0].attrs.x).toBe('1 & 2');
    expect(root.children[0].text).toBe('<ok> ñ<crudo>');
    expect(root.children[1].name).toBe('c');
  });
  it('no se rompe con etiquetas mal cerradas', () => {
    expect(() => parseXml('<a><b></a><c>')).not.toThrow();
  });
});

it('guía de remediación por palabras clave', () => {
  expect(guessRemediation('SMB Signing not required', null, 'configuracion')).toBe('smb_signing');
  expect(guessRemediation('SSL Version 2 and 3 Protocol Detection', null, 'configuracion')).toBe('tls_hardening');
  expect(guessRemediation('Algo sin clasificar', 'CVE-2024-1234', 'cve')).toBe('patch_cve');
});
