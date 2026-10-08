/* KEV y EPSS por fichero con las muestras de shared/samples/. */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_FINDINGS } from '../data/demo';
import { applyIntel, gunzipText, parseEpss, parseKev } from './intel';

const sample = (f: string) => readFileSync(resolve(__dirname, '../../../shared/samples', f), 'utf8');

describe('CISA KEV', () => {
  const kev = parseKev(sample('kev-ejemplo.json'));
  it('lee versión, fecha y CVE', () => {
    expect(kev).toMatchObject({ version: '2026.10.07', released: '2026-10-07', count: 9 });
    expect(kev.entries.get('CVE-2021-44228')?.ransomware).toBe(true);
  });
  it('marca como KEV los hallazgos cuyo CVE (principal o relacionado) está en el catálogo y nunca desmarca', () => {
    const findings = DEMO_FINDINGS.map((f) => (f.id === 'H-003' ? { ...f, kev: false } : f.id === 'H-015' ? { ...f, kev: true } : f));
    findings.push({ ...DEMO_FINDINGS[0], id: 'X-1', cve: 'CVE-2099-0001', relatedCves: ['CVE-2017-0144'], kev: false });
    const r = applyIntel(findings, { kev });
    expect(r.kevAdded.sort()).toEqual(['H-003', 'X-1']);
    expect(r.findings.find((f) => f.id === 'H-015')?.kev).toBe(true);
  });
  it('rechaza lo que no es el catálogo', () => {
    expect(() => parseKev('{"hola":1}')).toThrow(/KEV/);
    expect(() => parseKev('{"vulnerabilities":[{"cveID":"nada"}]}')).toThrow(/válidos/);
  });
});

describe('FIRST EPSS', () => {
  const epss = parseEpss(sample('epss-ejemplo.csv'));
  it('lee modelo, fecha y puntuaciones', () => {
    expect(epss).toMatchObject({ model: 'v2025.03.14', scoreDate: '2026-10-07', count: 11 });
    expect(epss.scores.get('CVE-2024-21410')).toEqual({ epss: 0.33014, percentile: 0.9701 });
  });
  it('actualiza el EPSS con el valor más alto de los CVE del hallazgo y cuenta los que faltan', () => {
    const r = applyIntel(DEMO_FINDINGS, { epss });
    expect(r.findings.find((f) => f.id === 'H-013')?.epss).toBe(0.33014);
    expect(r.epssUpdated).toContain('H-013');
    expect(r.epssMissing).toBe(0);
    expect(r.findings.find((f) => f.id === 'H-005')).toBe(DEMO_FINDINGS.find((f) => f.id === 'H-005'));
  });
  it('acepta CSV sin línea de modelo y descarta valores fuera de rango', () => {
    const e = parseEpss('cve,epss\nCVE-2024-0001,0.5\nCVE-2024-0002,7\nmal,0.1\n');
    expect(e.count).toBe(1);
    expect(() => parseEpss('a,b\n1,2')).toThrow(/EPSS/);
  });
  it('descomprime el CSV oficial en .gz', async () => {
    const gz = gzipSync(Buffer.from(sample('epss-ejemplo.csv')));
    const text = await gunzipText(gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer);
    expect(parseEpss(text).count).toBe(11);
  });
});
