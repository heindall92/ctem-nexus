/* Los ficheros de ejemplo de shared/samples/ se pueden importar tal cual. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parseBloodHoundJson } from './bloodhound';
import { parseNmapXml } from './nmap';

it('el Nmap de ejemplo (con el DOCTYPE real de Nmap) produce activos, activo crítico y hallazgos', () => {
  const xml = readFileSync(resolve(__dirname, '../../../shared/samples/nmap-ejemplo.xml'), 'utf8');
  const r = parseNmapXml(xml);
  expect(r.totalHosts).toBe(3);
  expect(r.assets.find((a) => a.ip === '10.20.0.10')?.criticality).toBe(5);
  expect(r.assets.find((a) => a.ip === '198.51.100.25')?.internetExposed).toBe(true);
  expect(r.findings.some((f) => f.cve === 'CVE-2023-4966')).toBe(true);
  expect(r.findings.some((f) => /telnet/i.test(f.title))).toBe(true);
});

it('el BloodHound de ejemplo produce el DC como activo crítico, delegación, kerberoasting y AS-REP roasting', () => {
  const json = readFileSync(resolve(__dirname, '../../../shared/samples/bloodhound-ejemplo.json'), 'utf8');
  const r = parseBloodHoundJson(json);
  expect(r.assets.some((a) => a.criticality === 5 && /DC01/i.test(a.name))).toBe(true);
  const titulos = r.findings.map((f) => f.title).join(' | ');
  expect(titulos).toMatch(/Kerberoasting/);
  expect(titulos).toMatch(/AS-REP|preautenticaci/i);
  expect(titulos).toMatch(/[Dd]elegaci/);
});
