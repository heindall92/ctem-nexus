/* Integración con el ecosistema (sin DOM): sobre JSON común «yrd-ecosistema», detección de ficheros de las herramientas
 * hermanas, importadores (KAIROS, ENS AD Auditor, Compliance Studio, Rosetta, Norvik) y exportadores.
 *
 * Principio: el usuario mueve ficheros; las herramientas no hablan entre sí por red. Todo fichero se trata como hostil:
 * JSON sin claves de prototipo, textos recortados, listas con tope y valores fuera de catálogo descartados. */
import { BAND_LABEL } from './constants';
import { slaCompliance } from './compliance';
import { CONTROLS, controlsFor } from './controls';
import { isActive } from './engine';
import { csvToObjects, safeJsonParse } from './io';
import { normTitle } from './merge';
import type { ScanHost, ScanItem, ScanParse } from './scanners';
import { slaInfo } from './sla';
import type { Asset, Band, EngineResult, Finding, SlaPolicy } from './types';

export const ECO_FORMAT = 'yrd-ecosistema';
export const ECO_VERSION = 1;
export const ECO_MAX_ITEMS = 20000;

export const ECO_TOOLS = ['ctem-nexus', 'rosetta', 'compliance-studio', 'kairos', 'ens-ad-auditor', 'argos', 'norvik'] as const;
export type EcoTool = (typeof ECO_TOOLS)[number];
export const ECO_TYPES = ['hallazgos', 'activos', 'controles', 'bia', 'soa', 'indicadores', 'responsables'] as const;
export type EcoType = (typeof ECO_TYPES)[number];

export interface Envelope<T = unknown> {
  format: typeof ECO_FORMAT;
  version: typeof ECO_VERSION;
  origen: { herramienta: EcoTool; version: string; generado: string };
  tipo: EcoType;
  /** Nombre del proyecto u organización de origen (opcional). */
  proyecto?: string;
  datos: T[];
  /** Resumen libre del origen (indicadores agregados). Opcional. */
  resumen?: Record<string, unknown>;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : null;
};
const arr = (v: unknown, max = ECO_MAX_ITEMS): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const strList = (v: unknown, max = 50, len = 60): string[] => arr(v, max).map((x) => str(x, len)).filter(Boolean);
const ISO_TS = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Crea un sobre con la fecha actual. */
export function makeEnvelope<T>(tipo: EcoType, datos: T[], appVersion: string, extra: { proyecto?: string; resumen?: Record<string, unknown> } = {}, now: Date = new Date()): Envelope<T> {
  return {
    format: ECO_FORMAT, version: ECO_VERSION,
    origen: { herramienta: 'ctem-nexus', version: appVersion, generado: now.toISOString().replace(/\.\d{3}Z$/, 'Z') },
    tipo, ...(extra.proyecto ? { proyecto: extra.proyecto.slice(0, 120) } : {}), datos, ...(extra.resumen ? { resumen: extra.resumen } : {}),
  };
}

/** Valida la cabecera del sobre. Los datos se sanean después, según el tipo. */
export function parseEnvelope(v: unknown): Envelope<Record<string, unknown>> | null {
  if (!isObj(v) || v.format !== ECO_FORMAT || v.version !== ECO_VERSION || !isObj(v.origen) || !Array.isArray(v.datos)) return null;
  const herramienta = str(v.origen.herramienta, 40) as EcoTool;
  const tipo = str(v.tipo, 20) as EcoType;
  if (!ECO_TOOLS.includes(herramienta) || !ECO_TYPES.includes(tipo)) return null;
  const generado = str(v.origen.generado, 40);
  return {
    format: ECO_FORMAT, version: ECO_VERSION,
    origen: { herramienta, version: str(v.origen.version, 20), generado: ISO_TS.test(generado) ? generado : '' },
    tipo, ...(str(v.proyecto, 120) ? { proyecto: str(v.proyecto, 120) } : {}),
    datos: arr(v.datos).filter(isObj),
    ...(isObj(v.resumen) ? { resumen: v.resumen } : {}),
  };
}

/* ───────────── Detección ───────────── */

export type EcoDetected =
  | { kind: 'sobre'; envelope: Envelope<Record<string, unknown>> }
  | { kind: 'kairos'; project: Record<string, unknown>; name: string; others: number }
  | { kind: 'studio'; project: Record<string, unknown>; name: string; others: number }
  | { kind: 'adauditor'; report: Record<string, unknown> }
  | { kind: 'rosetta'; project: Record<string, unknown>; name: string }
  | { kind: 'responsables-csv'; rows: Array<Record<string, string>> }
  | { kind: 'desconocido' };

const kairosProject = (o: Record<string, unknown>) => Array.isArray(o.funciones) && Array.isArray(o.activos) && isObj(o.meta);
const studioProject = (o: Record<string, unknown>) => isObj(o.soa) && Array.isArray(o.categorizacion);
const rosettaProject = (o: Record<string, unknown>) => isObj(o.controles) && isObj(o.alcance);

/** Reconoce un fichero de cualquier herramienta del ecosistema (o un CSV de responsables). */
export function detectEcosystem(text: string, name = ''): EcoDetected {
  const t = text.replace(/^﻿/, '').trim();
  if (!t.startsWith('{') && !t.startsWith('[')) {
    const rows = csvToObjects(t);
    const keys = rows[0] ? Object.keys(rows[0]).map((k) => k.toLowerCase()) : [];
    if (rows.length && keys.some((k) => /activo|asset|ip|host/.test(k)) && keys.some((k) => /responsable|owner/.test(k))) return { kind: 'responsables-csv', rows: rows.slice(0, 5000) };
    return { kind: 'desconocido' };
  }
  const o = safeJsonParse<unknown>(t);
  if (!isObj(o)) return { kind: 'desconocido' };
  const env = parseEnvelope(o);
  if (env) return { kind: 'sobre', envelope: env };
  if (kairosProject(o)) return { kind: 'kairos', project: o, name: str((o.meta as Record<string, unknown>).organizacion ?? (o.meta as Record<string, unknown>).nombre, 120) || name, others: 0 };
  if (o.app === 'kairos' && Array.isArray(o.proyectos)) {
    const ps = arr(o.proyectos, 300).filter(isObj).map((p) => p.state).filter((s): s is Record<string, unknown> => isObj(s) && kairosProject(s));
    if (ps.length) return { kind: 'kairos', project: ps[0], name: str((ps[0].meta as Record<string, unknown>).organizacion, 120) || name, others: ps.length - 1 };
  }
  if (studioProject(o)) return { kind: 'studio', project: o, name: str(isObj(o.proyecto) ? o.proyecto.organizacion ?? o.proyecto.nombre : '', 120) || name, others: 0 };
  if (o.kind === 'ens-studio-backup' && Array.isArray(o.projects)) {
    const ps = arr(o.projects, 300).filter(isObj).map((p) => p.state).filter((s): s is Record<string, unknown> => isObj(s) && studioProject(s));
    if (ps.length) return { kind: 'studio', project: ps[0], name: str(isObj(ps[0].proyecto) ? ps[0].proyecto.organizacion : '', 120) || name, others: ps.length - 1 };
  }
  if (Array.isArray(o.alerts) && ('counts_by_risk' in o || 'generated_at' in o || 'total_alerts' in o)) return { kind: 'adauditor', report: o };
  if (rosettaProject(o)) return { kind: 'rosetta', project: o, name: str(isObj(o.proyecto) ? o.proyecto.nombre ?? o.proyecto.organizacion : '', 120) || name };
  return { kind: 'desconocido' };
}

/* ───────────── Emparejamiento de activos por nombre ───────────── */

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'para', 'con', 'the', 'and', 'of', 'servidor', 'server', 'sistema', 'system']);
export const tokens = (s: string) => new Set(normTitle(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w)));

/** Similitud 0–1 entre dos nombres (coeficiente de Dice sobre palabras significativas). */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common++;
  return (2 * common) / (ta.size + tb.size);
}

export const MATCH_THRESHOLD = 0.34;

/** Activo de CTEM-Nexus más parecido: primero por etiqueta explícita (`<prefijo>:<id>`), luego por IP y por nombre. */
export function bestAsset(assets: Asset[], ref: { id?: string; name: string; ip?: string }, tagPrefix: string): { assetId: string | null; score: number } {
  if (ref.id) {
    const tagged = assets.find((a) => a.tags.includes(`${tagPrefix}:${ref.id}`));
    if (tagged) return { assetId: tagged.id, score: 1 };
  }
  if (ref.ip) {
    const byIp = assets.find((a) => a.ip === ref.ip);
    if (byIp) return { assetId: byIp.id, score: 1 };
  }
  let best: { assetId: string | null; score: number } = { assetId: null, score: 0 };
  for (const a of assets) {
    const s = Math.max(nameSimilarity(ref.name, a.name), a.name.toLowerCase() === ref.name.toLowerCase() ? 1 : 0);
    if (s > best.score) best = { assetId: a.id, score: Math.round(s * 100) / 100 };
  }
  return best.score >= MATCH_THRESHOLD ? best : { assetId: null, score: best.score };
}

/* ───────────── KAIROS (BIA) → criticidad de los activos ───────────── */

export interface KairosFunction { id: string; name: string; rto: number | null; mtpd: number | null; level: Asset['criticality'] }
export interface KairosItem {
  kid: string;
  name: string;
  owner: string;
  /** Criticidad propuesta (1–5) según la función más exigente a la que da soporte. */
  criticality: Asset['criticality'];
  /** Funciones a las que da soporte (directa o indirectamente, por dependencias entre activos). */
  functions: KairosFunction[];
  match: string | null;
  score: number;
}
export interface KairosPlan { project: string; functions: number; items: KairosItem[]; unsupported: number }

/** Criticidad por objetivo de recuperación: RTO ≤ 4 h → 5; ≤ 24 h → 4; ≤ 72 h → 3; más → 2. Sin RTO se usa el MTPD. */
export function levelFromRecovery(rto: number | null, mtpd: number | null): Asset['criticality'] {
  const h = rto ?? mtpd;
  if (h === null) return 2;
  if (h <= 4) return 5;
  if (h <= 24) return 4;
  if (h <= 72) return 3;
  return 2;
}

export function kairosPlan(project: Record<string, unknown>, assets: Asset[], name = ''): KairosPlan {
  const kAssets = arr(project.activos, 2000).filter(isObj).map((a) => ({ id: str(a.id, 40), name: str(a.nombre, 160), owner: str(a.responsable, 120), dependsOn: strList(a.dependeDe, 50, 40) })).filter((a) => a.id && a.name);
  const kById = new Map(kAssets.map((a) => [a.id, a]));
  const fns = arr(project.funciones, 2000).filter(isObj).map((f) => {
    const rto = num(f.rto), mtpd = num(f.mtpd);
    const dep = isObj(f.dependencias) ? f.dependencias : isObj(f.dep) ? f.dep : {};
    return { id: str(f.id, 40), name: str(f.nombre, 160), rto: rto !== null && rto >= 0 ? rto : null, mtpd: mtpd !== null && mtpd >= 0 ? mtpd : null, assets: strList((dep as Record<string, unknown>).activos, 200, 40) };
  }).filter((f) => f.id);
  // Cierre transitivo: si una función usa A-01 y A-01 depende de A-02, A-02 también la soporta.
  const supports = new Map<string, KairosFunction[]>();
  for (const f of fns) {
    const fn: KairosFunction = { id: f.id, name: f.name, rto: f.rto, mtpd: f.mtpd, level: levelFromRecovery(f.rto, f.mtpd) };
    const seen = new Set<string>();
    const stack = [...f.assets];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id) || !kById.has(id)) continue;
      seen.add(id);
      supports.set(id, [...(supports.get(id) ?? []), fn]);
      stack.push(...kById.get(id)!.dependsOn);
    }
  }
  const items: KairosItem[] = [];
  let unsupported = 0;
  for (const a of kAssets) {
    const functions = (supports.get(a.id) ?? []).sort((x, y) => y.level - x.level || (x.rto ?? 1e9) - (y.rto ?? 1e9));
    if (!functions.length) { unsupported++; continue; }
    const m = bestAsset(assets, { id: a.id, name: a.name }, 'kairos');
    items.push({ kid: a.id, name: a.name, owner: a.owner, criticality: functions[0].level, functions, match: m.assetId, score: m.score });
  }
  const meta = isObj(project.meta) ? project.meta : {};
  return { project: str(meta.organizacion ?? meta.nombre, 120) || name, functions: fns.length, items, unsupported };
}

/** Aplica las parejas elegidas: criticidad, etiqueta `kairos:<id>` y responsable si estaba vacío. */
export function applyKairos(assets: Asset[], pairs: Array<{ item: KairosItem; assetId: string }>): { assets: Asset[]; changed: number } {
  const byAsset = new Map<string, KairosItem[]>();
  for (const p of pairs) byAsset.set(p.assetId, [...(byAsset.get(p.assetId) ?? []), p.item]);
  let changed = 0;
  const out = assets.map((a) => {
    const its = byAsset.get(a.id);
    if (!its) return a;
    const criticality = Math.max(...its.map((i) => i.criticality)) as Asset['criticality'];
    const tags = [...new Set([...a.tags.filter((t) => !t.startsWith('kairos:')), ...its.map((i) => `kairos:${i.kid}`)])].slice(0, 12);
    const owner = a.owner || its.find((i) => i.owner)?.owner || '';
    if (criticality !== a.criticality || owner !== a.owner || tags.join() !== a.tags.join()) changed++;
    return { ...a, criticality, tags, owner };
  });
  return { assets: out, changed };
}

/* ───────────── ENS AD Auditor → hallazgos de identidad ───────────── */

interface AdRule { remediation: string; attack: string[]; kind: Finding['kind'] }
/** Tipo de hallazgo de ENS AD Auditor → guía de CTEM-Nexus y técnicas ATT&CK. */
export const AD_RULES: Record<string, AdRule> = {
  kerberoasting: { remediation: 'kerberoast', attack: ['T1558.003'], kind: 'identidad' },
  asrep_roasting: { remediation: 'asrep_roast', attack: ['T1558.004'], kind: 'identidad' },
  unconstrained_delegation: { remediation: 'unconstrained_delegation', attack: ['T1558', 'T1134.001'], kind: 'identidad' },
  constrained_rbcd_delegation: { remediation: 'unconstrained_delegation', attack: ['T1134.001'], kind: 'identidad' },
  adcs_esc: { remediation: 'adcs_esc1', attack: ['T1649'], kind: 'identidad' },
  smb_signing_disabled: { remediation: 'smb_signing', attack: ['T1557.001'], kind: 'configuracion' },
  laps_not_deployed: { remediation: 'laps', attack: ['T1552', 'T1550.002'], kind: 'configuracion' },
  weak_password_policy: { remediation: 'weak_credentials', attack: ['T1110'], kind: 'identidad' },
  weak_lockout_policy: { remediation: 'weak_credentials', attack: ['T1110'], kind: 'identidad' },
  krbtgt_password_age: { remediation: 'identity_generic', attack: ['T1558'], kind: 'identidad' },
  protected_users_gap: { remediation: 'identity_generic', attack: ['T1550.002'], kind: 'identidad' },
  admin_with_spn: { remediation: 'kerberoast', attack: ['T1558.003'], kind: 'identidad' },
  stale_privileged_account: { remediation: 'identity_generic', attack: ['T1078'], kind: 'identidad' },
  ldap_signing_not_required: { remediation: 'weak_config', attack: ['T1557'], kind: 'configuracion' },
  ldap_channel_binding_weak: { remediation: 'weak_config', attack: ['T1557'], kind: 'configuracion' },
  trust_sid_filtering: { remediation: 'identity_generic', attack: ['T1134'], kind: 'identidad' },
  machine_account_quota: { remediation: 'identity_generic', attack: ['T1098'], kind: 'identidad' },
  acl_control_path: { remediation: 'identity_generic', attack: ['T1003.006', 'T1098'], kind: 'identidad' },
  cleartext_secret_attr: { remediation: 'identity_generic', attack: ['T1552'], kind: 'identidad' },
  gpo_weak_setting: { remediation: 'weak_config', attack: ['T1484.001'], kind: 'configuracion' },
  audit_policy_gap: { remediation: 'weak_config', attack: ['T1562'], kind: 'configuracion' },
};
/** Riesgo ENS (MAGERIT) → CVSS equivalente: el mismo criterio que ENS AD Auditor usa al exportar a Compliance Studio. */
export const AD_RISK_CVSS: Record<string, number> = { Critico: 9, Alto: 7.5, Medio: 5, Bajo: 2.5 };

export interface AdParse extends ScanParse { domain: string; sample: boolean; daPath: number; rejected: number }

/** Convierte el informe JSON de ENS AD Auditor en el formato neutro de los escáneres (lo funde planImport). */
export function parseAdAuditor(report: Record<string, unknown>): AdParse {
  const domain = str(report.domain, 120) || 'Active Directory';
  const host: ScanHost = { key: domain.toLowerCase(), ip: '', name: domain, type: 'controlador_dominio', exposed: false };
  const items: ScanItem[] = [];
  let daPath = 0, rejected = 0;
  for (const raw of arr(report.alerts, 5000)) {
    if (!isObj(raw) || !isObj(raw.finding)) { rejected++; continue; }
    const fi = raw.finding;
    const type = str(fi.finding_type, 60);
    const title = str(fi.title, 200);
    const risk = str(raw.risk, 10);
    if (!type || !title || !(risk in AD_RISK_CVSS)) { rejected++; continue; }
    const rule = AD_RULES[type] ?? { remediation: 'identity_generic', attack: [], kind: 'identidad' as const };
    const da = raw.da_path === true;
    if (da) daPath++;
    const ens = arr(raw.ens_controls, 12).filter(isObj).map((c) => str(c.id, 20)).filter((c) => /^op\.acc\.\d+$|^[a-z]{2}\.[a-z]{2,4}\.\d+$/.test(c));
    const target = str(fi.target, 160);
    items.push({
      hostKey: host.key, title: target ? `${title} (${target})` : title, cve: null, relatedCves: [],
      cvss: AD_RISK_CVSS[risk], epss: null, kev: false, exploitPublic: da || /kerberoast|asrep|adcs|delegation|acl_control/.test(type),
      kind: rule.kind, remediation: rule.remediation,
      description: [str(raw.non_compliance, 600), str(fi.detail, 600)].filter(Boolean).join(' · '),
      evidence: [`ENS AD Auditor · ${str(raw.rule_id, 40) || type}`, ens.length ? `ENS: ${ens.join(', ')}` : '', da ? 'Ruta hacia Domain Admins' : '', str(fi.evidence, 400)].filter(Boolean).join('\n'),
      ref: type, attack: rule.attack,
    });
  }
  return { source: 'adauditor', tool: 'ENS AD Auditor', hosts: [host], items, skipped: 0, domain, sample: report.is_sample === true, daPath, rejected };
}

/* ───────────── Compliance Studio (ENS) ───────────── */

export type EnsCategory = 'BÁSICA' | 'MEDIA' | 'ALTA';
const ENS_LV: Record<string, 1 | 2 | 3> = { BAJO: 1, MEDIO: 2, ALTO: 3 };
const ENS_ALIAS: Record<string, string> = { B: 'BAJO', BAJ: 'BAJO', BAJA: 'BAJO', BASICA: 'BAJO', 'BÁSICA': 'BAJO', M: 'MEDIO', MED: 'MEDIO', MEDIA: 'MEDIO', A: 'ALTO', ALT: 'ALTO', ALTA: 'ALTO' };
const ensLevel = (v: unknown): 1 | 2 | 3 | null => { const s = str(v, 12).toUpperCase().replace(/\.$/, ''); return ENS_LV[s] ?? ENS_LV[ENS_ALIAS[s] ?? ''] ?? null; };

/** Categoría del sistema (RD 311/2022, art. 40 y Anexo I): la del nivel más alto de cualquier dimensión. */
export function ensCategoryOf(categorizacion: unknown): { category: EnsCategory | null; levels: Record<string, string> } {
  const max: Record<string, number> = {};
  for (const row of arr(categorizacion, 500).filter(isObj)) {
    for (const d of ['D', 'I', 'C', 'A', 'T']) { const l = ensLevel(row[d]); if (l && l > (max[d] ?? 0)) max[d] = l; }
  }
  const name = (l: number) => (l === 3 ? 'ALTO' : l === 2 ? 'MEDIO' : 'BAJO');
  const levels = Object.fromEntries(Object.entries(max).map(([d, l]) => [d, name(l)]));
  const vals = Object.values(max);
  if (!vals.length) return { category: null, levels };
  const top = Math.max(...vals);
  return { category: top === 3 ? 'ALTA' : top === 2 ? 'MEDIA' : 'BÁSICA', levels };
}
export const SLA_FOR_CATEGORY: Record<EnsCategory, SlaPolicy> = { 'BÁSICA': 'ens_basica', MEDIA: 'ens_media', ALTA: 'ens_alta' };

export interface StudioInfo { name: string; category: EnsCategory | null; levels: Record<string, string>; assets: Array<{ id: string; name: string }>; findings: number }
export function studioInfo(project: Record<string, unknown>, name = ''): StudioInfo {
  const { category, levels } = ensCategoryOf(project.categorizacion);
  const assets = arr(project.activos, 2000).filter(isObj).map((a) => ({ id: str(a.id, 40), name: str(a.nombre, 160) })).filter((a) => a.id);
  return { name, category, levels, assets, findings: arr(project.hallazgos).length };
}

/** Categoría de hallazgo de Compliance Studio (catálogo hallazgo_categorias) para cada hallazgo de CTEM-Nexus. */
export function studioCategory(f: Pick<Finding, 'kind' | 'remediation' | 'cve'>): string {
  const byGuide: Record<string, string> = {
    log4shell: 'OUTDATED', proxyshell: 'OUTDATED', citrix_bleed: 'OUTDATED', patch_cve: 'OUTDATED',
    kerberoast: 'AUTH_MFA', asrep_roast: 'AUTH_MFA', adcs_esc1: 'AUTH_MFA', weak_credentials: 'BRUTE',
    unconstrained_delegation: 'IDOR', identity_generic: 'IDOR', laps: 'DEFCREDS',
    smb_signing: 'TLS', tls_hardening: 'TLS', llmnr: 'NETSEG', print_spooler: 'NETSEG', weak_config: 'NETSEG',
    web_injection: 'SQLI', web_xss: 'XSS', web_hardening: 'INFOLEAK', ad_hygiene: 'IDOR',
  };
  return byGuide[f.remediation] ?? (f.cve || f.kind === 'cve' ? 'OUTDATED' : f.kind === 'identidad' ? 'IDOR' : 'NETSEG');
}

/** Exportación al formato de evidencia técnica de Compliance Studio («ens-studio-hallazgos», el mismo que ENS AD Auditor). */
export function toStudio(findings: Finding[], assets: Asset[], result: EngineResult, target: { id: string; name: string }, project: string) {
  const aById = new Map(assets.map((a) => [a.id, a]));
  const sc = new Map(result.scored.map((s) => [s.id, s]));
  const hallazgos = findings.filter((f) => isActive(f) || f.status === 'mitigado').map((f) => {
    const a = aById.get(f.assetId);
    const s = sc.get(f.id);
    return {
      id: `CN-${f.id}`.replace(/[^\w.-]/g, '-').slice(0, 40),
      titulo: `${f.title}${a ? ` · ${a.name}` : ''}`.slice(0, 300),
      categoria: studioCategory(f),
      cvss: Math.round(f.cvss * 10) / 10,
      activoId: target.id,
      estado: f.status === 'mitigado' ? 'cerrado' : 'abierto',
      fuente: `CTEM-Nexus${s ? ` · prioridad ${BAND_LABEL[s.band].toLowerCase()} (${s.score}/100)` : ''}`,
      ens: [...new Set(controlsFor(f).flatMap((c) => CONTROLS[c]?.ens ?? []))],
      objetivo: a?.ip ?? '',
    };
  });
  return {
    formato: 'ens-studio-hallazgos', is_sample: false, origen: 'CTEM-Nexus', proyecto: project,
    activo_sugerido: target,
    nota: `Importa este JSON en ENS Compliance Studio → Evidencia técnica. El activo ${target.id} debe existir en el proyecto de Studio.`,
    hallazgos,
  };
}

/* ───────────── Rosetta Multinorma ───────────── */

export interface ControlEvidence {
  control: string;
  titulo: string;
  ens: string[]; iso27001: string[]; nis2: string[]; nist: string[]; dora: string[];
  abiertos: number;
  porBanda: Record<Band, number>;
  kev: number;
  vencidos: number;
  peor: number;
  hallazgos: Array<{ id: string; titulo: string; cve: string | null; banda: Band; puntuacion: number; activo: string; estado: Finding['status']; vence: string }>;
}

/** Hallazgos agregados por control de Rosetta (solo los activos: abiertos o validados). */
export function controlEvidence(findings: Finding[], assets: Asset[], result: EngineResult, today: Date = new Date()): ControlEvidence[] {
  const aById = new Map(assets.map((a) => [a.id, a]));
  const sc = new Map(result.scored.map((s) => [s.id, s]));
  const by = new Map<string, ControlEvidence>();
  for (const f of findings) {
    const s = sc.get(f.id);
    if (!s || !isActive(f)) continue;
    const due = slaInfo(f.detectedAt, s.slaDays, today);
    for (const cid of controlsFor(f)) {
      const c = CONTROLS[cid];
      if (!c) continue;
      const e = by.get(cid) ?? { control: cid, titulo: c.title, ens: c.ens, iso27001: c.iso27001, nis2: c.nis2, nist: c.nist, dora: c.dora, abiertos: 0, porBanda: { critica: 0, alta: 0, media: 0, baja: 0 }, kev: 0, vencidos: 0, peor: 0, hallazgos: [] };
      e.abiertos++;
      e.porBanda[s.band]++;
      if (f.kev) e.kev++;
      if (due.state === 'vencido') e.vencidos++;
      e.peor = Math.max(e.peor, s.score);
      e.hallazgos.push({ id: f.id, titulo: f.title, cve: f.cve ?? null, banda: s.band, puntuacion: s.score, activo: aById.get(f.assetId)?.name ?? f.assetId, estado: f.status, vence: due.due });
      by.set(cid, e);
    }
  }
  return [...by.values()]
    .map((e) => ({ ...e, hallazgos: e.hallazgos.sort((a, b) => b.puntuacion - a.puntuacion || a.id.localeCompare(b.id)) }))
    .sort((a, b) => b.peor - a.peor || a.control.localeCompare(b.control));
}

export const ROSETTA_STATES = ['implantado', 'parcial', 'pendiente', 'no-aplica'] as const;
export type RosettaState = (typeof ROSETTA_STATES)[number];
export interface RosettaLink {
  /** Fecha del fichero importado (ISO) y proyecto de origen. */
  generado: string;
  proyecto: string;
  estados: Record<string, RosettaState>;
}

/** Estados de los controles desde un sobre «controles» de Rosetta o desde su fichero de proyecto. */
export function rosettaStates(src: { envelope?: Envelope<Record<string, unknown>>; project?: Record<string, unknown>; name?: string }): { link: RosettaLink; evidence: Array<Record<string, unknown>> } {
  const estados: Record<string, RosettaState> = {};
  const evidence: Array<Record<string, unknown>> = [];
  const ok = (v: unknown): v is RosettaState => typeof v === 'string' && (ROSETTA_STATES as readonly string[]).includes(v);
  const CID = /^[A-Z]{2,3}-\d{2}$/;
  if (src.envelope) {
    for (const d of src.envelope.datos) {
      const id = str(d.control, 10);
      if (CID.test(id) && ok(d.estado)) estados[id] = d.estado;
      if (CID.test(id) && isObj(d.ctem)) evidence.push(d.ctem);
    }
    return { link: { generado: src.envelope.origen.generado, proyecto: src.envelope.proyecto ?? '', estados }, evidence };
  }
  const ctl = isObj(src.project?.controles) ? src.project!.controles : {};
  for (const [id, c] of Object.entries(ctl)) if (CID.test(id) && isObj(c) && ok(c.estado)) estados[id] = c.estado;
  return { link: { generado: '', proyecto: src.name ?? '', estados }, evidence };
}

export interface Contradiction { control: string; estado: RosettaState; findings: string[]; worst: Band }
/** Controles que Rosetta da por implantados mientras hay hallazgos críticos o altos abiertos que los contradicen. */
export function contradictions(evidence: ControlEvidence[], link: RosettaLink | undefined): Contradiction[] {
  if (!link) return [];
  return evidence
    .filter((e) => link.estados[e.control] === 'implantado' && (e.porBanda.critica + e.porBanda.alta) > 0)
    .map((e) => ({ control: e.control, estado: 'implantado' as const, findings: e.hallazgos.filter((h) => h.banda === 'critica' || h.banda === 'alta').map((h) => h.id), worst: e.porBanda.critica ? 'critica' as const : 'alta' as const }));
}

/* ───────────── KAIROS ← riesgo de interrupción ───────────── */

/** Activos vinculados a KAIROS (etiqueta kairos:<id>) con su exposición: lo que KAIROS necesita para el riesgo de interrupción. */
export function toKairos(assets: Asset[], findings: Finding[], result: EngineResult) {
  const sc = new Map(result.scored.map((s) => [s.id, s]));
  return assets.flatMap((a) => {
    const kids = a.tags.filter((t) => t.startsWith('kairos:')).map((t) => t.slice(7));
    if (!kids.length) return [];
    const open = findings.filter((f) => f.assetId === a.id && isActive(f)).map((f) => ({ f, s: sc.get(f.id)! })).filter((x) => x.s);
    open.sort((x, y) => y.s.score - x.s.score);
    const paths = result.graph.nodePathCount[a.id] ?? 0;
    return kids.map((kid) => ({
      activo: kid, nombre: a.name, criticidad: a.criticality,
      abiertos: open.length, criticos: open.filter((x) => x.s.band === 'critica').length, altos: open.filter((x) => x.s.band === 'alta').length,
      kev: open.filter((x) => x.f.kev).length, rutasDeAtaque: paths, puntuacionMaxima: open[0]?.s.score ?? 0,
      peorHallazgo: open[0] ? `${open[0].f.id} · ${open[0].f.title}` : '',
      riesgoInterrupcion: open.some((x) => x.s.band === 'critica') || (paths > 0 && open.some((x) => x.s.band === 'alta')) ? 'alto' : open.length ? 'medio' : 'bajo',
    }));
  });
}

/* ───────────── Norvik (gobernanza) ───────────── */

export interface OwnerRow { ref: string; owner: string; role: string }
/** Responsables desde un sobre «responsables» o un CSV (activo/ip/host + responsable [+ rol]). */
export function ownerRows(src: { envelope?: Envelope<Record<string, unknown>>; rows?: Array<Record<string, string>> }): OwnerRow[] {
  const pick = (o: Record<string, unknown>, re: RegExp) => { const k = Object.keys(o).find((x) => re.test(x.toLowerCase())); return k ? str(o[k], 160) : ''; };
  const list = src.envelope ? src.envelope.datos : (src.rows ?? []);
  return list.slice(0, 5000).map((o) => ({ ref: pick(o, /^(activo|asset|ip|host|nombre|name)/), owner: pick(o, /^(responsable|owner)/), role: pick(o, /^(rol|role)/) })).filter((r) => r.ref && r.owner);
}

export function planOwners(assets: Asset[], rows: OwnerRow[]): { changes: Array<{ assetId: string; before: string; after: string; role: string }>; unmatched: string[] } {
  const changes: Array<{ assetId: string; before: string; after: string; role: string }> = [];
  const unmatched: string[] = [];
  for (const r of rows) {
    const exact = assets.find((a) => a.id.toLowerCase() === r.ref.toLowerCase() || a.ip === r.ref || a.name.toLowerCase() === r.ref.toLowerCase());
    const m = exact ? { assetId: exact.id } : bestAsset(assets, { name: r.ref }, 'norvik');
    if (!m.assetId) { unmatched.push(r.ref); continue; }
    const a = assets.find((x) => x.id === m.assetId)!;
    const after = `${r.owner}${r.role ? ` (${r.role})` : ''}`.slice(0, 80);
    if (a.owner !== after && !changes.some((c) => c.assetId === a.id)) changes.push({ assetId: a.id, before: a.owner, after, role: r.role });
  }
  return { changes, unmatched };
}

/** Indicadores del ciclo para el cuadro de mando de gobierno de Norvik. */
export function toNorvik(findings: Finding[], assets: Asset[], result: EngineResult, snapshots: Array<{ at: string; exposureIndex: number; open: number; overdue: number; mttrDays: number | null }> = [], today: Date = new Date()) {
  const sla = slaCompliance(findings, assets, result, today);
  const fecha = today.toISOString().slice(0, 10);
  const s = result.summary;
  const ind = (indicador: string, nombre: string, valor: number | null, unidad: string, sentido: 'menos' | 'mas') => ({ indicador, nombre, valor, unidad, sentido, fecha });
  return [
    ind('indice_exposicion', 'Índice de exposición', s.exposureIndex, '0-100', 'menos'),
    ind('abiertos', 'Hallazgos abiertos', s.openFindings, 'hallazgos', 'menos'),
    ind('abiertos_criticos', 'Abiertos de prioridad crítica', s.byBand.critica, 'hallazgos', 'menos'),
    ind('kev_abiertos', 'Abiertos explotados activamente (CISA KEV)', s.kevOpen, 'hallazgos', 'menos'),
    ind('rutas_ataque', 'Rutas de ataque hacia activos críticos', s.attackPaths, 'rutas', 'menos'),
    ind('sla_cumplimiento', 'Cumplimiento de plazos (SLA)', sla.overall.compliance === null ? null : Math.round(sla.overall.compliance * 1000) / 10, '%', 'mas'),
    ind('vencidos', 'Hallazgos con el plazo vencido', sla.overall.openOverdue, 'hallazgos', 'menos'),
    ind('mttr_dias', 'Tiempo medio de corrección (MTTR)', s.mttrDays, 'días', 'menos'),
    ind('riesgo_aceptado', 'Riesgos aceptados vigentes', s.accepted, 'hallazgos', 'menos'),
    ...snapshots.slice(-12).map((x) => ({ indicador: 'historico', nombre: 'Cierre de ciclo', valor: x.exposureIndex, unidad: '0-100', sentido: 'menos' as const, fecha: x.at, abiertos: x.open, vencidos: x.overdue, mttr: x.mttrDays })),
  ];
}
