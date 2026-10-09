/* Importadores de escáneres: Nessus (.nessus), OpenVAS/Greenbone (XML), Nuclei (JSONL/JSON), Trivy (JSON) y SARIF 2.1.0.
 *
 * Todo se analiza en el navegador, sin red. Cada importador produce un `ScanParse` neutro (hosts + elementos);
 * `planImport` (merge.ts) lo convierte en activos y hallazgos del proyecto con deduplicación entre fuentes.
 * Entrada hostil por defecto: XML sin DTD, JSON sin claves peligrosas, textos recortados y número máximo de elementos. */
import { safeJsonParse } from './io';
import { isPrivateIp } from './nmap';
import type { AssetType, FindingKind, FindingSource } from './types';
import { child, childrenOf, descendants, parseXml, textOf, type XNode } from './xml';
import { parseBurp, parseCertipy, parsePingCastle, parseZap } from './offensive';

export type ScanSource = Extract<FindingSource, 'nessus' | 'openvas' | 'nuclei' | 'trivy' | 'sarif' | 'adauditor' | 'zap' | 'burp' | 'pingcastle' | 'certipy'>;
export type DetectedFormat = ScanSource | 'nmap' | 'bloodhound' | 'kev' | 'epss' | 'proyecto' | 'desconocido';

export interface ScanHost {
  /** Clave estable dentro del fichero (IP, nombre o artefacto). */
  key: string;
  ip: string;
  name: string;
  type: AssetType;
  exposed: boolean;
}

export interface ScanItem {
  hostKey: string;
  title: string;
  cve: string | null;
  relatedCves: string[];
  cvss: number;
  epss: number | null;
  kev: boolean;
  exploitPublic: boolean;
  kind: FindingKind;
  remediation: string;
  description: string;
  /** Evidencia corta (puerto, URL, paquete, fichero y línea). */
  evidence: string;
  /** Identificador de la regla en la herramienta (plugin, NVT, plantilla, regla). */
  ref: string;
  /** Técnicas ATT&CK explícitas (cuando el origen las conoce, como ENS AD Auditor). */
  attack?: string[];
}

export interface ScanParse {
  source: ScanSource;
  /** Nombre y versión de la herramienta, si el fichero los declara. */
  tool: string;
  hosts: ScanHost[];
  items: ScanItem[];
  /** Resultados informativos u omitidos (severidad 0, «Log», «PASS»…). */
  skipped: number;
}

export const MAX_ITEMS = 5000;
const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;
const CVE_ONE = /^CVE-\d{4}-\d{4,7}$/i;
const clip = (s: unknown, max = 300) => (typeof s === 'string' ? s : s == null ? '' : String(s)).replace(/\s+/g, ' ').trim().slice(0, max);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : null;
};
const clampCvss = (x: number) => Math.min(10, Math.max(0, x));
const cvesIn = (...texts: unknown[]): string[] => {
  const set = new Set<string>();
  for (const t of texts) for (const m of clip(t, 20000).matchAll(CVE_RE)) set.add(m[0].toUpperCase());
  return [...set].sort();
};
const isIp = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) || (s.includes(':') && /^[0-9a-f:]+$/i.test(s));

/** Severidad textual → CVSS equivalente cuando la herramienta no da puntuación. */
export const SEVERITY_CVSS: Record<string, number> = { critical: 9.5, high: 8, medium: 5.5, moderate: 5.5, low: 3, info: 0, informational: 0, none: 0, unknown: 0 };

/** Guía de remediación por palabras clave (las claves existen en remediation.ts). */
export function guessRemediation(title: string, cve: string | null, kind: FindingKind): string {
  const t = `${title} ${cve ?? ''}`.toLowerCase();
  if (/log4j|log4shell|cve-2021-44228|cve-2021-45046/.test(t)) return 'log4shell';
  if (/proxyshell|cve-2021-34473|cve-2021-34523|cve-2021-31207/.test(t)) return 'proxyshell';
  if (/citrix bleed|cve-2023-4966|cve-2023-3519|netscaler/.test(t)) return 'citrix_bleed';
  if (/smb signing|firma smb|signing not required|smb2? .*sign/.test(t)) return 'smb_signing';
  if (/llmnr|nbt-ns|netbios name service/.test(t)) return 'llmnr';
  if (/spooler|printnightmare|cola de impresi/.test(t)) return 'print_spooler';
  if (/kerberoast/.test(t)) return 'kerberoast';
  if (/as-rep|preauth/.test(t)) return 'asrep_roast';
  if (/adcs|esc[1-9]\b|certificate template/.test(t)) return 'adcs_esc1';
  if (/\b(ssl|tls)\b.*(weak|deprecated|obsolet|1\.0|1\.1|cipher|sweet32|poodle|beast|rc4)|(weak|deprecated).*\b(ssl|tls)\b|sslv[23]|ssl version [23]|tls version 1\.[01]/.test(t)) return 'tls_hardening';
  if (/default (credential|password|account)|weak password|contraseña débil|credenciales por defecto|blank password|anonymous (login|access)/.test(t)) return 'weak_credentials';
  if (kind === 'cve') return 'patch_cve';
  return 'weak_config';
}

function host(key: string, ip: string, name: string, type: AssetType = 'servidor'): ScanHost {
  return { key, ip, name: name || ip || key, type, exposed: !!ip && isIp(ip) && !isPrivateIp(ip) };
}

/* ───────────────────────── Detección ───────────────────────── */

export function detectFormat(text: string, filename = ''): DetectedFormat {
  const head = text.slice(0, 4000).replace(/^﻿/, '').trimStart();
  const lower = head.toLowerCase();
  const fn = filename.toLowerCase();
  if (head.startsWith('<')) {
    if (lower.includes('<nessusclientdata_v2')) return 'nessus';
    if (lower.includes('<nmaprun')) return 'nmap';
    if (/<issues[\s>]/.test(lower) && /burp/i.test(head)) return 'burp';
    if (lower.includes('<healthcheckdata')) return 'pingcastle';
    if (/<report[\s>]/.test(lower) || lower.includes('<get_reports_response')) return 'openvas';
    if (/<issues[\s>]/.test(lower)) return 'burp';
    return 'desconocido';
  }
  if (lower.startsWith('#model_version') || /^cve,epss(,percentile)?\s*$/m.test(lower.split('\n').slice(0, 2).join('\n'))) return 'epss';
  if (head.startsWith('{') || head.startsWith('[')) {
    if (/"\$schema"\s*:\s*"[^"]*sarif/i.test(head) || (/"runs"\s*:/.test(head) && /"version"\s*:\s*"2\.1\.0"/.test(head))) return 'sarif';
    if (/"SchemaVersion"\s*:/.test(head) && /"(ArtifactName|Results)"\s*:/.test(text.slice(0, 20000))) return 'trivy';
    if (/"template-id"\s*:/.test(head) || /"template"\s*:\s*"[^"]+\.ya?ml"/.test(head)) return 'nuclei';
    if (/"catalogVersion"\s*:/.test(head) && /"vulnerabilities"\s*:/.test(text.slice(0, 20000))) return 'kev';
    if (/"format"\s*:\s*"ctem-nexus"/.test(head)) return 'proyecto';
    if (/"@programName"\s*:\s*"ZAP"/i.test(head) || (/"site"\s*:/.test(head) && /"alerts"\s*:/.test(text.slice(0, 20000)))) return 'zap';
    if (/"Certificate (Templates|Authorities)"\s*:/.test(head)) return 'certipy';
    if (/"(meta|data)"\s*:/.test(head) && /"(computers|users|groups|domains)"/i.test(text.slice(0, 20000))) return 'bloodhound';
  }
  if (fn.endsWith('.sarif')) return 'sarif';
  if (fn.endsWith('.nessus')) return 'nessus';
  if (fn.endsWith('.jsonl')) return 'nuclei';
  return 'desconocido';
}

/* ───────────────────────── Nessus ───────────────────────── */

const NESSUS_SEV = [0, 3, 5.5, 8, 9.5];

export function parseNessus(xml: string, opts: { includeInfo?: boolean } = {}): ScanParse {
  const doc = parseXml(xml);
  const rootEl = descendants(doc, 'nessusclientdata_v2')[0];
  if (!rootEl) throw new Error('No es un fichero .nessus (falta NessusClientData_v2).');
  const hosts: ScanHost[] = [];
  const items: ScanItem[] = [];
  let skipped = 0;
  const policy = textOf(child(rootEl, 'policy'), 'policyname');
  for (const rh of descendants(rootEl, 'reporthost')) {
    const props: Record<string, string> = {};
    for (const tag of childrenOf(child(rh, 'hostproperties'), 'tag')) if (tag.attrs.name) props[tag.attrs.name] = textOf(tag);
    const ip = props['host-ip'] || (isIp(rh.attrs.name ?? '') ? rh.attrs.name : '');
    const name = props['host-fqdn'] || props['hostname'] || props['netbios-name'] || rh.attrs.name || ip;
    const os = (props['operating-system'] || '').toLowerCase();
    const type: AssetType = /windows (server|20\d\d)/.test(os) ? 'servidor' : /windows (10|11|7|8)/.test(os) ? 'estacion' : 'servidor';
    const h = host(ip || name, ip, name, type);
    hosts.push(h);
    for (const ri of childrenOf(rh, 'reportitem')) {
      const sev = Math.max(0, Math.min(4, Math.round(num(ri.attrs.severity) ?? 0)));
      if (sev === 0 && !opts.includeInfo) { skipped++; continue; }
      if (items.length >= MAX_ITEMS) { skipped++; continue; }
      const cves = [...new Set(childrenOf(ri, 'cve').map((c) => textOf(c).toUpperCase()).filter((c) => CVE_ONE.test(c)))].sort();
      const score = num(textOf(ri, 'cvss3_base_score')) ?? num(textOf(ri, 'cvss_base_score')) ?? NESSUS_SEV[sev];
      const epssRaw = num(textOf(ri, 'epss_score'));
      const title = clip(ri.attrs.pluginname || textOf(ri, 'plugin_name') || textOf(ri, 'synopsis'), 200);
      const cve = cves[0] ?? null;
      const kind: FindingKind = cve ? 'cve' : 'configuracion';
      const port = ri.attrs.port && ri.attrs.port !== '0' ? `${ri.attrs.port}/${ri.attrs.protocol ?? 'tcp'}` : '';
      items.push({
        hostKey: h.key,
        title: title || `Plugin ${ri.attrs.pluginid ?? ''}`.trim(),
        cve,
        relatedCves: cves.slice(1),
        cvss: clampCvss(score),
        epss: epssRaw === null ? null : epssRaw > 1 ? epssRaw / 100 : epssRaw,
        kev: !!textOf(ri, 'cisa-known-exploited'),
        exploitPublic: /^true$/i.test(textOf(ri, 'exploit_available')) || /exploits are available/i.test(textOf(ri, 'exploitability_ease')),
        kind,
        remediation: guessRemediation(title, cve, kind),
        description: clip(textOf(ri, 'synopsis') || textOf(ri, 'description'), 1000),
        evidence: [port && `${port}${ri.attrs.svc_name ? ` (${ri.attrs.svc_name})` : ''}`, `Nessus ${ri.attrs.pluginid ?? ''}`.trim()].filter(Boolean).join(' · '),
        ref: `nessus:${ri.attrs.pluginid ?? title}`,
      });
    }
  }
  return { source: 'nessus', tool: policy ? `Nessus · ${policy}` : 'Nessus', hosts, items, skipped };
}

/* ───────────────────────── OpenVAS / Greenbone ───────────────────────── */

const THREAT_SKIP = new Set(['log', 'none', 'debug', 'false positive']);

function openvasTags(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split('|')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function parseOpenVas(xml: string, opts: { includeInfo?: boolean } = {}): ScanParse {
  const doc = parseXml(xml);
  const results = descendants(doc, 'result').filter((r) => child(r, 'nvt'));
  if (!results.length && !descendants(doc, 'report').length) throw new Error('No es un informe XML de OpenVAS/Greenbone.');
  const seen = new Set<string>();
  const hostMap = new Map<string, ScanHost>();
  const items: ScanItem[] = [];
  let skipped = 0;
  // Los informes de GMP repiten <report> anidado: un mismo resultado (id) cuenta una vez.
  for (const r of results) {
    const rid = r.attrs.id ?? '';
    if (rid && seen.has(rid)) continue;
    if (rid) seen.add(rid);
    const nvt = child(r, 'nvt')!;
    const threat = textOf(r, 'threat').toLowerCase();
    const sevResult = num(textOf(r, 'severity'));
    if ((THREAT_SKIP.has(threat) || (sevResult !== null && sevResult <= 0)) && !opts.includeInfo) { skipped++; continue; }
    if (items.length >= MAX_ITEMS) { skipped++; continue; }
    const hostEl = child(r, 'host');
    const ip = textOf(hostEl).split(/\s+/)[0] ?? '';
    const hostname = textOf(hostEl, 'hostname');
    const key = ip || hostname || 'openvas-host';
    if (!hostMap.has(key)) hostMap.set(key, host(key, isIp(ip) ? ip : '', hostname || ip));
    const tags = openvasTags(textOf(nvt, 'tags'));
    const refs = childrenOf(child(nvt, 'refs'), 'ref');
    const cves = [...new Set([
      ...refs.filter((x) => (x.attrs.type ?? '').toLowerCase() === 'cve').map((x) => (x.attrs.id ?? '').toUpperCase()),
      ...clip(textOf(nvt, 'cve'), 5000).split(/[\s,]+/).map((c) => c.toUpperCase()),
    ].filter((c) => CVE_ONE.test(c)))].sort();
    const sevV3 = descendants(nvt, 'severity').map((s) => num(textOf(s, 'value')) ?? num(textOf(s, 'score'))).find((x) => x !== null);
    const score = sevResult ?? sevV3 ?? num(textOf(nvt, 'cvss_base')) ?? SEVERITY_CVSS[threat] ?? 5;
    const title = clip(textOf(nvt, 'name') || textOf(r, 'name'), 200);
    const cve = cves[0] ?? null;
    const kind: FindingKind = cve ? 'cve' : 'configuracion';
    const port = textOf(r, 'port');
    items.push({
      hostKey: key,
      title: title || `NVT ${nvt.attrs.oid ?? ''}`.trim(),
      cve,
      relatedCves: cves.slice(1),
      cvss: clampCvss(score),
      epss: null,
      kev: false,
      exploitPublic: /exploit (code )?(is )?(publicly )?available|exploit-db|metasploit/i.test(`${tags.summary ?? ''} ${tags.insight ?? ''} ${tags.vuldetect ?? ''}`),
      kind,
      remediation: guessRemediation(title, cve, kind),
      description: clip(tags.summary || tags.insight || textOf(r, 'description'), 1000),
      evidence: [port && !/^general\//.test(port) ? port : '', `NVT ${nvt.attrs.oid ?? ''}`.trim(), textOf(child(r, 'qod'), 'value') ? `QoD ${textOf(child(r, 'qod'), 'value')} %` : ''].filter(Boolean).join(' · '),
      ref: `openvas:${nvt.attrs.oid ?? title}`,
    });
  }
  return { source: 'openvas', tool: 'OpenVAS / Greenbone', hosts: [...hostMap.values()], items, skipped };
}

/* ───────────────────────── Nuclei ───────────────────────── */

const hostOfUrl = (u: string): string => {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(\[[^\]]+\]|[^/:?#]+)/i.exec(u.trim());
  if (m) return m[1].replace(/^\[|\]$/g, '').toLowerCase();
  return u.trim().split(/[/:]/)[0].toLowerCase();
};

export function parseNuclei(text: string, opts: { includeInfo?: boolean } = {}): ScanParse {
  const trimmed = text.replace(/^﻿/, '').trim();
  let rows: unknown[] = [];
  if (trimmed.startsWith('[')) {
    const arr = safeJsonParse<unknown>(trimmed);
    rows = Array.isArray(arr) ? arr : [];
  } else {
    for (const line of trimmed.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const o = safeJsonParse<unknown>(line);
      if (o && typeof o === 'object') rows.push(o);
    }
  }
  const hostMap = new Map<string, ScanHost>();
  const items: ScanItem[] = [];
  let skipped = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') { skipped++; continue; }
    const r = raw as Record<string, unknown>;
    const info = (r.info && typeof r.info === 'object' ? r.info : {}) as Record<string, unknown>;
    const cls = (info.classification && typeof info.classification === 'object' ? info.classification : {}) as Record<string, unknown>;
    const severity = clip(info.severity, 20).toLowerCase() || 'unknown';
    if ((severity === 'info' || severity === 'unknown') && !opts.includeInfo) { skipped++; continue; }
    if (items.length >= MAX_ITEMS) { skipped++; continue; }
    const tagsArr = (Array.isArray(info.tags) ? info.tags.map((t) => clip(t, 40)) : clip(info.tags, 400).split(',')).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const target = clip(r['matched-at'] ?? r.host ?? r.url, 400);
    const ip = clip(r.ip, 60);
    const hostname = hostOfUrl(clip(r.host, 400) || target);
    const key = ip || hostname || 'nuclei-target';
    if (!hostMap.has(key)) hostMap.set(key, host(key, isIp(ip) ? ip : isIp(hostname) ? hostname : '', hostname || ip, 'aplicacion_web'));
    const cveList = cvesIn(Array.isArray(cls['cve-id']) ? (cls['cve-id'] as unknown[]).join(' ') : cls['cve-id']);
    const score = num(cls['cvss-score']) ?? SEVERITY_CVSS[severity] ?? 5;
    const epss = num(cls['epss-score']);
    const title = clip(info.name, 200) || clip(r['template-id'], 120);
    const cve = cveList[0] ?? null;
    const kind: FindingKind = cve ? 'cve' : 'configuracion';
    items.push({
      hostKey: key,
      title,
      cve,
      relatedCves: cveList.slice(1),
      cvss: clampCvss(score),
      epss: epss === null ? null : epss > 1 ? epss / 100 : epss,
      kev: tagsArr.includes('kev') || tagsArr.includes('vkev'),
      exploitPublic: tagsArr.some((t) => t === 'rce' || t === 'kev' || t === 'exploit' || t === 'oast'),
      kind,
      remediation: guessRemediation(`${title} ${tagsArr.join(' ')}`, cve, kind),
      description: clip(info.description, 1000),
      evidence: [target, `Nuclei ${clip(r['template-id'], 120)}`].filter(Boolean).join(' · '),
      ref: `nuclei:${clip(r['template-id'], 120) || title}`,
    });
  }
  if (!rows.length) throw new Error('No hay resultados de Nuclei (se espera JSONL de -jsonl o JSON de -json-export).');
  return { source: 'nuclei', tool: 'Nuclei', hosts: [...hostMap.values()], items, skipped };
}

/* ───────────────────────── Trivy ───────────────────────── */

export function parseTrivy(text: string): ScanParse {
  const data = safeJsonParse<Record<string, unknown>>(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.Results)) throw new Error('No es un informe JSON de Trivy (falta Results).');
  const artifact = clip(data.ArtifactName, 200) || 'Artefacto analizado con Trivy';
  const artifactType = clip(data.ArtifactType, 40);
  const type: AssetType = /container|image/i.test(artifactType) ? 'nube' : /repo|filesystem|fs/i.test(artifactType) ? 'aplicacion_web' : 'servidor';
  const h = host(`trivy:${artifact}`, '', artifact, type);
  const items: ScanItem[] = [];
  let skipped = 0;
  for (const res of data.Results as unknown[]) {
    if (!res || typeof res !== 'object') continue;
    const r = res as Record<string, unknown>;
    const target = clip(r.Target, 200);
    for (const v of Array.isArray(r.Vulnerabilities) ? (r.Vulnerabilities as Record<string, unknown>[]) : []) {
      const sev = clip(v.Severity, 20).toLowerCase();
      if (sev === 'unknown' || !v || typeof v !== 'object') { skipped++; continue; }
      if (items.length >= MAX_ITEMS) { skipped++; continue; }
      const id = clip(v.VulnerabilityID, 40).toUpperCase();
      const cve = CVE_ONE.test(id) ? id : null;
      const cvssObj = (v.CVSS && typeof v.CVSS === 'object' ? v.CVSS : {}) as Record<string, Record<string, unknown>>;
      const v3 = Object.values(cvssObj).map((o) => (o && typeof o === 'object' ? num(o.V3Score) ?? num(o.V40Score) : null)).filter((x): x is number => x !== null);
      const title = clip(v.Title, 160) || `${id} en ${clip(v.PkgName, 80)}`;
      const fixed = clip(v.FixedVersion, 80);
      items.push({
        hostKey: h.key,
        title: cve ? `${clip(v.PkgName, 80)}: ${title}`.slice(0, 200) : title,
        cve,
        relatedCves: [],
        cvss: clampCvss(v3.length ? Math.max(...v3) : SEVERITY_CVSS[sev] ?? 5),
        epss: null,
        kev: false,
        exploitPublic: false,
        kind: cve ? 'cve' : 'configuracion',
        remediation: guessRemediation(`${title} ${clip(v.PkgName, 80)}`, cve, cve ? 'cve' : 'configuracion'),
        description: clip(v.Description, 1000),
        evidence: [`${clip(v.PkgName, 80)} ${clip(v.InstalledVersion, 60)}${fixed ? ` → ${fixed}` : ' (sin versión corregida)'}`, target].filter(Boolean).join(' · '),
        ref: `trivy:${id}`,
      });
    }
    for (const m of Array.isArray(r.Misconfigurations) ? (r.Misconfigurations as Record<string, unknown>[]) : []) {
      if (!m || typeof m !== 'object' || clip(m.Status, 10).toUpperCase() === 'PASS') { skipped++; continue; }
      if (items.length >= MAX_ITEMS) { skipped++; continue; }
      const sev = clip(m.Severity, 20).toLowerCase();
      const title = clip(m.Title, 200) || clip(m.ID, 40);
      items.push({
        hostKey: h.key, title, cve: null, relatedCves: [], cvss: SEVERITY_CVSS[sev] ?? 5, epss: null, kev: false, exploitPublic: false,
        kind: 'configuracion', remediation: guessRemediation(title, null, 'configuracion'),
        description: clip(m.Description || m.Message, 1000),
        evidence: [target, `${clip(m.AVDID || m.ID, 40)}`, clip(m.Resolution, 200)].filter(Boolean).join(' · '),
        ref: `trivy:${clip(m.AVDID || m.ID, 40)}`,
      });
    }
    for (const s of Array.isArray(r.Secrets) ? (r.Secrets as Record<string, unknown>[]) : []) {
      if (!s || typeof s !== 'object') continue;
      if (items.length >= MAX_ITEMS) { skipped++; continue; }
      const sev = clip(s.Severity, 20).toLowerCase();
      // Nunca se guarda el valor del secreto (campo Match): solo la regla, el fichero y la línea.
      items.push({
        hostKey: h.key, title: `Secreto expuesto: ${clip(s.Title || s.RuleID, 160)}`, cve: null, relatedCves: [], cvss: SEVERITY_CVSS[sev] ?? 8,
        epss: null, kev: false, exploitPublic: true, kind: 'identidad', remediation: 'identity_generic',
        description: 'Credencial o clave en claro dentro del artefacto. Revócala y rótala antes de borrarla del historial.',
        evidence: `${target}${num(s.StartLine) !== null ? `:${num(s.StartLine)}` : ''} · ${clip(s.RuleID, 60)}`,
        ref: `trivy:secret:${clip(s.RuleID, 60)}`,
      });
    }
  }
  return { source: 'trivy', tool: `Trivy${artifactType ? ` · ${artifactType}` : ''}`, hosts: [h], items, skipped };
}

/* ───────────────────────── SARIF 2.1.0 ───────────────────────── */

const SARIF_LEVEL: Record<string, number> = { error: 8, warning: 5.5, note: 3, none: 0 };

export function parseSarif(text: string, opts: { includeInfo?: boolean } = {}): ScanParse {
  const data = safeJsonParse<Record<string, unknown>>(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.runs)) throw new Error('No es un fichero SARIF (falta runs).');
  const hosts: ScanHost[] = [];
  const items: ScanItem[] = [];
  let skipped = 0;
  const tools: string[] = [];
  (data.runs as unknown[]).forEach((runRaw, runIdx) => {
    if (!runRaw || typeof runRaw !== 'object') return;
    const run = runRaw as Record<string, unknown>;
    const driver = ((run.tool as Record<string, unknown> | undefined)?.driver ?? {}) as Record<string, unknown>;
    const toolName = clip(driver.name, 80) || 'SARIF';
    tools.push(`${toolName}${driver.version ? ` ${clip(driver.version, 20)}` : ''}`);
    const rules = new Map<string, Record<string, unknown>>();
    const ruleList = Array.isArray(driver.rules) ? (driver.rules as Record<string, unknown>[]) : [];
    ruleList.forEach((r) => { if (r && typeof r === 'object' && typeof r.id === 'string') rules.set(r.id, r); });
    const vcs = Array.isArray(run.versionControlProvenance) ? (run.versionControlProvenance[0] as Record<string, unknown> | undefined) : undefined;
    const repo = clip(vcs?.repositoryUri, 200).replace(/^https?:\/\/(www\.)?/, '').replace(/\.git$/, '');
    const name = repo || `Código analizado con ${toolName}`;
    const key = `sarif:${name}:${repo ? '' : runIdx}`;
    let h = hosts.find((x) => x.key === key);
    if (!h) { h = host(key, '', name, 'aplicacion_web'); hosts.push(h); }
    for (const resRaw of Array.isArray(run.results) ? (run.results as unknown[]) : []) {
      if (!resRaw || typeof resRaw !== 'object') continue;
      const res = resRaw as Record<string, unknown>;
      const ruleId = clip(res.ruleId, 120) || (typeof res.ruleIndex === 'number' ? clip(ruleList[res.ruleIndex]?.id, 120) : '');
      const rule = rules.get(ruleId) ?? (typeof res.ruleIndex === 'number' ? ruleList[res.ruleIndex] : undefined) ?? {};
      const props = (rule.properties && typeof rule.properties === 'object' ? rule.properties : {}) as Record<string, unknown>;
      const level = clip(res.level ?? (rule.defaultConfiguration as Record<string, unknown> | undefined)?.level, 10).toLowerCase() || 'warning';
      const secSev = num(props['security-severity']);
      const score = secSev ?? SARIF_LEVEL[level] ?? 5.5;
      if (score <= 0 && !opts.includeInfo) { skipped++; continue; }
      if (items.length >= MAX_ITEMS) { skipped++; continue; }
      const msg = clip((res.message as Record<string, unknown> | undefined)?.text, 1000);
      const short = clip((rule.shortDescription as Record<string, unknown> | undefined)?.text, 200);
      const cves = cvesIn(ruleId, short);
      const cve = cves[0] ?? null;
      const loc = Array.isArray(res.locations) ? (res.locations[0] as Record<string, unknown> | undefined) : undefined;
      const phys = (loc?.physicalLocation ?? {}) as Record<string, unknown>;
      const uri = clip((phys.artifactLocation as Record<string, unknown> | undefined)?.uri, 200);
      const line = num((phys.region as Record<string, unknown> | undefined)?.startLine);
      const title = (short || msg || ruleId).slice(0, 200);
      const kind: FindingKind = cve ? 'cve' : /secret|password|credential|token|api[-_ ]?key/i.test(`${ruleId} ${title}`) ? 'identidad' : 'configuracion';
      items.push({
        hostKey: h.key,
        title,
        cve,
        relatedCves: cves.slice(1),
        cvss: clampCvss(score),
        epss: null,
        kev: false,
        exploitPublic: false,
        kind,
        remediation: kind === 'identidad' ? 'identity_generic' : guessRemediation(title, cve, kind),
        description: msg,
        evidence: [uri && `${uri}${line !== null ? `:${line}` : ''}`, `${toolName} ${ruleId}`].filter(Boolean).join(' · '),
        ref: `sarif:${toolName}:${ruleId || title}`,
      });
    }
  });
  return { source: 'sarif', tool: tools.join(', ') || 'SARIF', hosts, items, skipped };
}

/** Analiza el fichero con el importador que corresponda a su formato. */
export function parseScan(text: string, filename = '', opts: { includeInfo?: boolean } = {}): ScanParse {
  const fmt = detectFormat(text, filename);
  switch (fmt) {
    case 'nessus': return parseNessus(text, opts);
    case 'openvas': return parseOpenVas(text, opts);
    case 'nuclei': return parseNuclei(text, opts);
    case 'trivy': return parseTrivy(text);
    case 'sarif': return parseSarif(text, opts);
    case 'zap': return parseZap(text);
    case 'burp': return parseBurp(text);
    case 'pingcastle': return parsePingCastle(text);
    case 'certipy': return parseCertipy(text);
    case 'nmap': throw new Error('Es un escaneo de Nmap: usa «Importar Nmap».');
    case 'bloodhound': throw new Error('Es una exportación de BloodHound: usa «Importar BloodHound».');
    case 'kev': case 'epss': throw new Error('Es un catálogo de inteligencia (KEV/EPSS): impórtalo en «Señales de inteligencia».');
    case 'proyecto': throw new Error('Es un proyecto de CTEM-Nexus: impórtalo en Ajustes.');
    default: throw new Error('Formato no reconocido. Se admiten Nessus (.nessus), OpenVAS/Greenbone (XML), Nuclei (JSONL), Trivy (JSON), SARIF 2.1.0, OWASP ZAP (JSON), Burp Suite (XML), PingCastle (XML) y Certipy (JSON).');
  }
}

export const SOURCE_LABEL: Record<FindingSource, string> = {
  manual: 'Manual', csv: 'CSV', nmap: 'Nmap', bloodhound: 'BloodHound', nessus: 'Nessus', openvas: 'OpenVAS', nuclei: 'Nuclei', trivy: 'Trivy', sarif: 'SARIF', adauditor: 'ENS AD Auditor', zap: 'OWASP ZAP', burp: 'Burp Suite', pingcastle: 'PingCastle', certipy: 'Certipy',
};

export type { XNode };
