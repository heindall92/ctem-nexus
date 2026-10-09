/* Importadores de validación ofensiva: OWASP ZAP (JSON), Burp Suite (XML de issues), PingCastle (XML healthcheck) y
 * Certipy (`find -json`). Producen el mismo `ScanParse` neutro que los escáneres, así que pasan por el mismo plan previo
 * y la misma deduplicación (merge.ts).
 *
 * Entrada hostil: JSON sin claves de prototipo, XML sin entidades (la DTD inerte de Burp, que solo declara elementos, se
 * retira antes de analizar), textos recortados y sin HTML, y nunca se guardan peticiones ni respuestas completas: pueden
 * llevar cookies, tokens o contraseñas. */
import { safeJsonParse } from './io';
import { isPrivateIp } from './nmap';
import type { ScanHost, ScanItem, ScanParse } from './scanners';
import type { AssetType, FindingKind } from './types';
import { child, childrenOf, descendants, parseXml, textOf } from './xml';

const MAX_ITEMS = 5000;
const clip = (s: unknown, max = 300) => (typeof s === 'string' ? s : s == null ? '' : String(s)).replace(/\s+/g, ' ').trim().slice(0, max);
/** Quita etiquetas HTML y entidades básicas de las descripciones de ZAP y Burp. */
export const stripHtml = (s: unknown, max = 600) => clip(clip(s, 20000).replace(/<[^>]*>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'), max);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : null;
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIp = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;
const cvesIn = (...t: unknown[]) => [...new Set(t.flatMap((x) => [...clip(x, 20000).matchAll(CVE_RE)].map((m) => m[0].toUpperCase())))].sort();

function webHost(url: string, ipHint = ''): ScanHost {
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch { hostname = clip(url, 120).replace(/^https?:\/\//, '').split(/[/:]/)[0]; }
  const ip = isIp(ipHint) ? ipHint : isIp(hostname) ? hostname : '';
  const exposed = ip ? !isPrivateIp(ip) : !/^(localhost|.*\.(local|lan|internal|corp|intra))$/i.test(hostname) && !!hostname;
  return { key: (hostname || ip || url).toLowerCase(), ip, name: hostname || ip || url, type: 'aplicacion_web', exposed };
}

/** Guía para hallazgos de aplicación web, por CWE o por nombre. */
export function webRemediation(name: string, cwe: number | null): string {
  const t = name.toLowerCase();
  if (cwe === 79 || /cross.site.script|\bxss\b/.test(t)) return 'web_xss';
  if ([89, 77, 78, 94, 611, 917, 918, 502].includes(cwe ?? -1) || /sql.?inject|command inject|code inject|\bxxe\b|\bssrf\b|deseriali|template inject|\bssti\b|path traversal|remote file inclusion/.test(t)) return 'web_injection';
  if (/log4j|log4shell/.test(t)) return 'log4shell';
  if (/vulnerable (js|javascript) library|outdated|components? with known|cve-\d{4}/.test(t)) return 'patch_cve';
  return 'web_hardening';
}

const WEB_CVSS: Record<number, number> = { 3: 8, 2: 5.5, 1: 3 };

/* ───────────────────────── OWASP ZAP ───────────────────────── */

export function isZapJson(o: unknown): boolean {
  return isObj(o) && Array.isArray(o.site) && (typeof o['@programName'] === 'string' || typeof o['@version'] === 'string' || o.site.some((s) => isObj(s) && Array.isArray(s.alerts)));
}

/** Informe JSON «tradicional» de ZAP (`-J`, «Traditional JSON Report»). */
export function parseZap(text: string): ScanParse {
  const o = safeJsonParse<Record<string, unknown>>(text);
  if (!o || !isZapJson(o)) throw new Error('No es un informe JSON de OWASP ZAP (falta «site» con «alerts»).');
  const hosts: ScanHost[] = [];
  const items: ScanItem[] = [];
  let skipped = 0;
  for (const site of (o.site as unknown[]).slice(0, 500)) {
    if (!isObj(site)) continue;
    const base = clip(site['@name'], 300);
    const h = webHost(base);
    if (!hosts.some((x) => x.key === h.key)) hosts.push(h);
    for (const a of (Array.isArray(site.alerts) ? site.alerts : []).slice(0, MAX_ITEMS)) {
      if (!isObj(a)) continue;
      const risk = Math.round(num(a.riskcode) ?? 0);
      const confidence = Math.round(num(a.confidence) ?? 2);
      if (risk <= 0 || confidence === 0 || items.length >= MAX_ITEMS) { skipped++; continue; } // informativo o falso positivo
      const name = clip(a.alert ?? a.name, 200);
      const cwe = num(a.cweid);
      const inst = (Array.isArray(a.instances) ? a.instances : []).filter(isObj);
      const urls = [...new Set(inst.map((i) => clip(i.uri, 200)).filter(Boolean))];
      const params = [...new Set(inst.map((i) => clip(i.param, 60)).filter(Boolean))];
      const kind: FindingKind = cvesIn(name, a.reference).length ? 'cve' : 'configuracion';
      const cves = cvesIn(name, a.otherinfo, a.reference);
      items.push({
        hostKey: h.key, title: name, cve: cves[0] ?? null, relatedCves: cves.slice(1),
        cvss: WEB_CVSS[Math.min(3, risk)], epss: null, kev: false, exploitPublic: risk >= 3 && confidence >= 3,
        kind, remediation: webRemediation(name, cwe),
        description: stripHtml(a.desc),
        evidence: [
          `ZAP ${clip(a.pluginid, 12)}${cwe && cwe > 0 ? ` · CWE-${cwe}` : ''} · confianza ${['falso positivo', 'baja', 'media', 'alta', 'confirmada'][Math.max(0, Math.min(4, confidence))]}`,
          urls.length ? `${urls.slice(0, 3).join(' · ')}${urls.length > 3 ? ` (+${urls.length - 3})` : ''}` : '',
          params.length ? `Parámetros: ${params.slice(0, 5).join(', ')}` : '',
        ].filter(Boolean).join('\n'),
        ref: `zap:${clip(a.pluginid, 12)}:${clip(a.alertRef, 20)}`,
      });
    }
  }
  return { source: 'zap', tool: `OWASP ZAP${o['@version'] ? ` ${clip(o['@version'], 12)}` : ''}`, hosts, items, skipped };
}

/* ───────────────────────── Burp Suite ───────────────────────── */

/** Burp exporta con una DTD interna que solo declara elementos. Se retira si no contiene entidades (las entidades,
 * en cualquier parte del fichero, se siguen rechazando). */
export function stripInertDoctype(xml: string): string {
  if (/<!ENTITY/i.test(xml)) return xml; // que lo rechace el analizador
  return xml.replace(/<!DOCTYPE\s+issues\s*\[[\s\S]*?\]\s*>/i, '');
}

const BURP_SEV: Record<string, number> = { high: 8, medium: 5.5, low: 3 };

export function parseBurp(xml: string): ScanParse {
  const doc = parseXml(stripInertDoctype(xml));
  const root = descendants(doc, 'issues')[0];
  if (!root) throw new Error('No es una exportación XML de Burp Suite (falta <issues>).');
  const hosts: ScanHost[] = [];
  const items: ScanItem[] = [];
  let skipped = 0;
  for (const is of childrenOf(root, 'issue')) {
    const sev = textOf(is, 'severity').toLowerCase();
    const conf = textOf(is, 'confidence').toLowerCase();
    if (!(sev in BURP_SEV) || conf === 'false positive' || items.length >= MAX_ITEMS) { skipped++; continue; }
    const hostEl = child(is, 'host');
    const h = webHost(textOf(hostEl), hostEl?.attrs.ip ?? '');
    if (!hosts.some((x) => x.key === h.key)) hosts.push(h);
    const name = clip(textOf(is, 'name'), 200);
    const cweM = /CWE-(\d+)/i.exec(textOf(is, 'vulnerabilityClassifications'));
    const cwe = cweM ? Number(cweM[1]) : null;
    const cves = cvesIn(name, textOf(is, 'issueDetail'), textOf(is, 'references'));
    items.push({
      hostKey: h.key, title: name, cve: cves[0] ?? null, relatedCves: cves.slice(1),
      cvss: BURP_SEV[sev], epss: null, kev: false, exploitPublic: sev === 'high' && conf === 'certain',
      kind: cves.length ? 'cve' : 'configuracion', remediation: webRemediation(name, cwe),
      description: stripHtml(textOf(is, 'issueDetail') || textOf(is, 'issueBackground')),
      // Nunca la petición ni la respuesta: pueden llevar cookies, tokens o contraseñas.
      evidence: [`Burp ${clip(textOf(is, 'type'), 12)}${cwe ? ` · CWE-${cwe}` : ''} · certeza ${conf || '—'}`, clip(textOf(is, 'location') || textOf(is, 'path'), 200)].filter(Boolean).join('\n'),
      ref: `burp:${clip(textOf(is, 'type'), 12)}:${clip(textOf(is, 'path'), 80)}`,
    });
  }
  return { source: 'burp', tool: `Burp Suite${root.attrs.burpversion ? ` ${clip(root.attrs.burpversion, 20)}` : ''}`, hosts, items, skipped };
}

/* ───────────────────────── PingCastle ───────────────────────── */

/** Regla de PingCastle → guía, técnica ATT&CK y tipo. Se mira el identificador y, si no basta, el texto. */
export function pingCastleRule(riskId: string, rationale: string): { remediation: string; attack: string[]; kind: FindingKind } {
  const t = `${riskId} ${rationale}`.toLowerCase();
  if (/kerberoast|spn/.test(t)) return { remediation: 'kerberoast', attack: ['T1558.003'], kind: 'identidad' };
  if (/asrep|preauth/.test(t)) return { remediation: 'asrep_roast', attack: ['T1558.004'], kind: 'identidad' };
  if (/delegation/.test(t)) return { remediation: 'unconstrained_delegation', attack: ['T1558', 'T1134.001'], kind: 'identidad' };
  if (/certificate|cert(temp|enroll)|adcs|esc\d/.test(t)) return { remediation: 'adcs_esc1', attack: ['T1649'], kind: 'identidad' };
  if (/laps/.test(t)) return { remediation: 'laps', attack: ['T1552', 'T1550.002'], kind: 'configuracion' };
  if (/spooler/.test(t)) return { remediation: 'print_spooler', attack: ['T1068'], kind: 'configuracion' };
  if (/smb.?sign|smbv?1|smb-v1/.test(t)) return { remediation: 'smb_signing', attack: ['T1557.001'], kind: 'configuracion' };
  if (/llmnr|netbios|nbt/.test(t)) return { remediation: 'llmnr', attack: ['T1557.001'], kind: 'configuracion' };
  if (/dcsync|replication|dsreplication/.test(t)) return { remediation: 'identity_generic', attack: ['T1003.006'], kind: 'identidad' };
  if (/gpo|grouppolicy/.test(t)) return { remediation: 'weak_config', attack: ['T1484.001'], kind: 'configuracion' };
  if (/password|pwd|krbtgt/.test(t)) return { remediation: riskId.toLowerCase().includes('krbtgt') ? 'identity_generic' : 'weak_credentials', attack: riskId.toLowerCase().includes('krbtgt') ? ['T1558'] : ['T1110'], kind: 'identidad' };
  if (/ntlm|ldap.?sign|channel.?binding/.test(t)) return { remediation: 'weak_config', attack: ['T1557'], kind: 'configuracion' };
  if (/audit/.test(t)) return { remediation: 'weak_config', attack: ['T1562'], kind: 'configuracion' };
  return /^p-|privileged|admin/.test(t) ? { remediation: 'identity_generic', attack: ['T1078'], kind: 'identidad' } : { remediation: 'ad_hygiene', attack: [], kind: 'configuracion' };
}

/** Puntos de PingCastle por regla → CVSS equivalente (orientativo: PingCastle puntúa de 0 a 100 por regla). */
export const pingCastleCvss = (points: number) => (points >= 30 ? 9 : points >= 15 ? 7.5 : points >= 5 ? 5 : 3);

export function parsePingCastle(xml: string): ScanParse {
  const doc = parseXml(xml);
  const root = descendants(doc, 'healthcheckdata')[0];
  if (!root) throw new Error('No es un informe XML de PingCastle (falta HealthcheckData).');
  const domain = clip(textOf(root, 'domainfqdn'), 120) || 'Active Directory';
  const h: ScanHost = { key: domain.toLowerCase(), ip: '', name: domain, type: 'controlador_dominio', exposed: false };
  const items: ScanItem[] = [];
  let skipped = 0;
  for (const r of descendants(child(root, 'riskrules') ?? root, 'healthcheckriskrule')) {
    const points = num(textOf(r, 'points')) ?? 0;
    const riskId = clip(textOf(r, 'riskid'), 60);
    if (!riskId || points <= 0 || items.length >= MAX_ITEMS) { skipped++; continue; }
    const rationale = clip(textOf(r, 'rationale'), 400);
    const rule = pingCastleRule(riskId, rationale);
    const details = childrenOf(child(r, 'details'), 'string').map((d) => clip(textOf(d), 120)).filter(Boolean);
    items.push({
      hostKey: h.key, title: rationale || riskId, cve: null, relatedCves: [],
      cvss: pingCastleCvss(points), epss: null, kev: false, exploitPublic: points >= 30,
      kind: rule.kind, remediation: rule.remediation, description: rationale,
      evidence: [`PingCastle ${riskId} · ${clip(textOf(r, 'category'), 40)} / ${clip(textOf(r, 'model'), 40)} · ${points} puntos`, details.length ? `${details.slice(0, 5).join(' · ')}${details.length > 5 ? ` (+${details.length - 5})` : ''}` : ''].filter(Boolean).join('\n'),
      ref: `pingcastle:${riskId}`, attack: rule.attack,
    });
  }
  const score = num(textOf(root, 'globalscore'));
  return { source: 'pingcastle', tool: `PingCastle${textOf(root, 'engineversion') ? ` ${clip(textOf(root, 'engineversion'), 20)}` : ''}${score !== null ? ` · puntuación ${score}/100` : ''}`, hosts: [h], items, skipped };
}

/* ───────────────────────── Certipy ───────────────────────── */

export function isCertipyJson(o: unknown): boolean {
  return isObj(o) && (isObj(o['Certificate Templates']) || isObj(o['Certificate Authorities']));
}

const ESC_CRITICAL = new Set(['ESC1', 'ESC4', 'ESC6', 'ESC8', 'ESC15']);

/** `certipy find -json`: plantillas y CA con su sección «[!] Vulnerabilities». */
export function parseCertipy(text: string): ScanParse {
  const o = safeJsonParse<Record<string, unknown>>(text);
  if (!o || !isCertipyJson(o)) throw new Error('No es la salida JSON de «certipy find» (faltan «Certificate Templates» o «Certificate Authorities»).');
  const cas = Object.values(isObj(o['Certificate Authorities']) ? o['Certificate Authorities'] : {}).filter(isObj);
  const hosts: ScanHost[] = [];
  const caHost = (ca: Record<string, unknown> | undefined): ScanHost => {
    const name = clip(ca?.['DNS Name'] ?? ca?.['CA Name'], 120) || 'AD CS';
    const h: ScanHost = { key: name.toLowerCase(), ip: '', name, type: 'pki', exposed: false };
    if (!hosts.some((x) => x.key === h.key)) hosts.push(h);
    return h;
  };
  const items: ScanItem[] = [];
  let skipped = 0;
  const add = (h: ScanHost, owner: string, vulns: Record<string, unknown>, who: string) => {
    for (const [esc, why] of Object.entries(vulns)) {
      const id = clip(esc, 8).toUpperCase();
      if (!/^ESC\d{1,2}$/.test(id) || items.length >= MAX_ITEMS) { skipped++; continue; }
      items.push({
        hostKey: h.key, title: `AD CS ${id} en ${owner}`, cve: null, relatedCves: [],
        cvss: ESC_CRITICAL.has(id) ? 9 : 8, epss: null, kev: false, exploitPublic: true,
        kind: 'identidad', remediation: 'adcs_esc1', description: clip(why, 600),
        evidence: [`Certipy · ${id}`, who ? `Pueden inscribirse: ${who}` : ''].filter(Boolean).join('\n'),
        ref: `certipy:${owner}:${id}`, attack: ['T1649', 'T1068'],
      });
    }
  };
  for (const ca of cas) {
    const v = ca['[!] Vulnerabilities'];
    if (isObj(v)) add(caHost(ca), clip(ca['CA Name'], 80) || 'la CA', v, '');
  }
  for (const tpl of Object.values(isObj(o['Certificate Templates']) ? o['Certificate Templates'] : {}).filter(isObj)) {
    const v = tpl['[!] Vulnerabilities'];
    if (!isObj(v)) continue;
    const caName = Array.isArray(tpl['Certificate Authorities']) ? clip(tpl['Certificate Authorities'][0], 80) : '';
    const ca = cas.find((c) => clip(c['CA Name'], 80) === caName) ?? cas[0];
    const perms = isObj(tpl.Permissions) && isObj(tpl.Permissions['Enrollment Permissions']) ? tpl.Permissions['Enrollment Permissions']['Enrollment Rights'] : [];
    const who = (Array.isArray(perms) ? perms : []).map((p) => clip(p, 80)).slice(0, 4).join(', ');
    add(caHost(ca), `la plantilla ${clip(tpl['Template Name'], 80) || '—'}`, v, who);
  }
  return { source: 'certipy', tool: 'Certipy', hosts, items, skipped };
}

export type { AssetType };
