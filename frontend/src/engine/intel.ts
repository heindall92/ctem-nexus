/* Señales de inteligencia sin conexión: catálogo CISA KEV (JSON público) y puntuaciones FIRST EPSS (CSV, también .gz).
 *
 * El usuario descarga los ficheros oficiales y los importa: la app nunca los pide por red. Se guardan la versión y la
 * fecha del catálogo usado para que el informe diga con qué datos se priorizó. KEV solo añade marcas (un hallazgo que el
 * analista marcó como KEV no se desmarca); EPSS se actualiza con el valor más alto de los CVE del hallazgo. */
import { safeJsonParse } from './io';
import type { Finding } from './types';

const CVE_ONE = /^CVE-\d{4}-\d{4,7}$/;
const MAX_ROWS = 400_000;

export interface KevCatalog {
  version: string;
  released: string;
  count: number;
  entries: Map<string, { dateAdded: string; ransomware: boolean; name: string }>;
}

export interface EpssCatalog {
  model: string;
  scoreDate: string;
  count: number;
  scores: Map<string, { epss: number; percentile: number | null }>;
}

/** Metadatos que se guardan en el proyecto y aparecen en el informe. */
export interface IntelMeta {
  kev?: { version: string; released: string; count: number; importedAt: string };
  epss?: { model: string; scoreDate: string; count: number; importedAt: string };
}

const s = (v: unknown, max = 200) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);

export function parseKev(text: string): KevCatalog {
  const data = safeJsonParse<Record<string, unknown>>(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.vulnerabilities)) {
    throw new Error('No es el catálogo CISA KEV (se espera known_exploited_vulnerabilities.json).');
  }
  const entries = new Map<string, { dateAdded: string; ransomware: boolean; name: string }>();
  for (const raw of (data.vulnerabilities as unknown[]).slice(0, MAX_ROWS)) {
    if (!raw || typeof raw !== 'object') continue;
    const v = raw as Record<string, unknown>;
    const cve = s(v.cveID, 20).toUpperCase();
    if (!CVE_ONE.test(cve)) continue;
    entries.set(cve, { dateAdded: s(v.dateAdded, 10), ransomware: /^known$/i.test(s(v.knownRansomwareCampaignUse, 20)), name: s(v.vulnerabilityName, 200) });
  }
  if (!entries.size) throw new Error('El catálogo KEV no contiene CVE válidos.');
  const released = s(data.dateReleased, 40);
  return { version: s(data.catalogVersion, 40) || released.slice(0, 10), released: /^\d{4}-\d{2}-\d{2}/.test(released) ? released.slice(0, 10) : '', count: entries.size, entries };
}

export function parseEpss(text: string): EpssCatalog {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  let model = '';
  let scoreDate = '';
  let i = 0;
  if (lines[0]?.startsWith('#')) {
    for (const part of lines[0].slice(1).split(',')) {
      const [k, ...rest] = part.split(':');
      const v = rest.join(':').trim();
      if (k.trim() === 'model_version') model = v.slice(0, 40);
      if (k.trim() === 'score_date') scoreDate = /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '';
    }
    i = 1;
  }
  const header = (lines[i] ?? '').toLowerCase().split(',').map((h) => h.trim());
  const ci = header.indexOf('cve');
  const ei = header.indexOf('epss');
  const pi = header.indexOf('percentile');
  if (ci < 0 || ei < 0) throw new Error('No es un CSV de EPSS (se espera la cabecera cve,epss,percentile).');
  const scores = new Map<string, { epss: number; percentile: number | null }>();
  for (let k = i + 1; k < lines.length && scores.size < MAX_ROWS; k++) {
    const cols = lines[k].split(',');
    const cve = (cols[ci] ?? '').trim().toUpperCase();
    const epss = Number(cols[ei]);
    if (!CVE_ONE.test(cve) || !Number.isFinite(epss) || epss < 0 || epss > 1) continue;
    const pct = pi >= 0 ? Number(cols[pi]) : NaN;
    scores.set(cve, { epss, percentile: Number.isFinite(pct) && pct >= 0 && pct <= 1 ? pct : null });
  }
  if (!scores.size) throw new Error('El CSV de EPSS no contiene puntuaciones válidas.');
  return { model, scoreDate, count: scores.size, scores };
}

export interface IntelResult {
  findings: Finding[];
  /** Hallazgos que pasan a KEV con este catálogo. */
  kevAdded: string[];
  /** Hallazgos cuyo EPSS cambia. */
  epssUpdated: string[];
  /** Hallazgos con CVE que no aparecen en el CSV de EPSS. */
  epssMissing: number;
}

const cvesOf = (f: Finding) => [f.cve, ...(f.relatedCves ?? [])].filter((c): c is string => !!c);

export function applyIntel(findings: Finding[], intel: { kev?: KevCatalog | null; epss?: EpssCatalog | null }): IntelResult {
  const kevAdded: string[] = [];
  const epssUpdated: string[] = [];
  let epssMissing = 0;
  const out = findings.map((f) => {
    const cves = cvesOf(f);
    if (!cves.length) return f;
    let next = f;
    if (intel.kev && !f.kev && cves.some((c) => intel.kev!.entries.has(c))) {
      next = { ...next, kev: true };
      kevAdded.push(f.id);
    }
    if (intel.epss) {
      const vals = cves.map((c) => intel.epss!.scores.get(c)?.epss).filter((x): x is number => x !== undefined);
      if (!vals.length) epssMissing++;
      else {
        const best = Math.max(...vals);
        if (best !== f.epss) { next = { ...next, epss: best }; epssUpdated.push(f.id); }
      }
    }
    return next;
  });
  return { findings: out, kevAdded, epssUpdated, epssMissing };
}

/** Descomprime .gz en el navegador (DecompressionStream) sin dependencias. */
export async function gunzipText(buf: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede descomprimir .gz: descomprímelo antes.');
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
