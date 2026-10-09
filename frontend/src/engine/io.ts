/* Importación, validación y exportación (sin DOM): CSV, JSON de proyecto, informe y tickets en Markdown/CSV. */
import { BAND_LABEL } from './constants';
import { fmt } from './engine';
import { explanationIn, reasonsIn, type Lang } from './explain';
import { guideIn } from './remediation';
import { slaInfo } from './sla';
import { fixPlan } from './simulate';
import { CONTROLS, controlsFor } from './controls';
import { parseRetest, parseValidation, retestStats } from './retest';
import { PROFILE_IDS } from './constants';
import type { IntelMeta } from './intel';
import type { Asset, AssetType, Band, EngineResult, Finding, FindingKind, FindingSource, FindingStatus, ManualEdge, NetworkRange, ProfileId, RiskException, SlaPolicy } from './types';
import { SLA_POLICY_IDS } from './constants';

export interface Project {
  format: 'ctem-nexus';
  version: 1;
  name: string;
  demo: boolean;
  assets: Asset[];
  ranges: NetworkRange[];
  findings: Finding[];
  edges: ManualEdge[];
  /** Pasos de la guía de remediación marcados como hechos, por hallazgo (índices). Opcional. */
  progress?: Record<string, number[]>;
  /** Perfil de ponderación del proyecto (por defecto, «defecto»). */
  profile?: ProfileId;
  /** Versión y fecha de los catálogos KEV y EPSS aplicados (para que el informe diga con qué datos se priorizó). */
  intel?: IntelMeta;
  /** Registro de importaciones de escáneres, de la más reciente a la más antigua (máximo 50). */
  imports?: ImportLog[];
  /** Instantáneas de cierre de ciclo, de la más antigua a la más reciente (máximo 104). */
  snapshots?: Snapshot[];
  /** Política de plazos (por defecto, «estandar»; las del ENS salen de la categoría del sistema). */
  slaPolicy?: SlaPolicy;
  /** Categoría ENS leída de Compliance Studio. */
  ens?: EnsLink;
  /** Estados de los controles leídos de Rosetta Multinorma. */
  rosetta?: RosettaLinkData;
  /** Registro de intercambios con el ecosistema, del más reciente al más antiguo (máximo 50). */
  ecoLog?: EcoLog[];
}

export interface EnsLink { category: 'BÁSICA' | 'MEDIA' | 'ALTA'; levels: Record<string, string>; project: string; at: string }
export interface RosettaLinkData { generado: string; proyecto: string; estados: Record<string, 'implantado' | 'parcial' | 'pendiente' | 'no-aplica'>; at: string }
export interface EcoLog { at: string; tool: string; dir: 'entrada' | 'salida'; tipo: string; detail: string }
export const MAX_ECO_LOG = 50;
const ECO_LOG_TOOLS = ['ctem-nexus', 'rosetta', 'compliance-studio', 'kairos', 'ens-ad-auditor', 'argos', 'norvik'];
const ROSETTA_ST = ['implantado', 'parcial', 'pendiente', 'no-aplica'];

export interface ImportLog {
  at: string;
  source: FindingSource;
  tool: string;
  file: string;
  newAssets: number;
  newFindings: number;
  updated: number;
  reopened: number;
  /** Mitigados que el escaneo ya no ve y quedan verificados (retest). */
  verified?: number;
}

export interface Snapshot {
  /** Fecha AAAA-MM-DD. */
  at: string;
  label: string;
  profile: ProfileId;
  exposureIndex: number;
  open: number;
  byBand: Record<Band, number>;
  kev: number;
  attackPaths: number;
  accepted: number;
  overdue: number;
  mttrDays: number | null;
}

export const MAX_IMPORTS = 50;
export const MAX_SNAPSHOTS = 104;

const ASSET_TYPES: AssetType[] = ['servidor', 'estacion', 'aplicacion_web', 'base_datos', 'controlador_dominio', 'pki', 'perimetro', 'nube', 'identidad'];
const KINDS: FindingKind[] = ['cve', 'configuracion', 'identidad'];
const STATUSES: FindingStatus[] = ['abierto', 'validado', 'no_explotable', 'mitigado', 'aceptado'];
const CVE_RE = /^CVE-\d{4}-\d{4,7}$/i;
const SOURCES: FindingSource[] = ['manual', 'csv', 'nmap', 'bloodhound', 'nessus', 'openvas', 'nuclei', 'trivy', 'sarif', 'adauditor', 'zap', 'burp', 'pingcastle', 'certipy'];
const ATTACK_RE = /^T\d{4}(\.\d{3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ───────────── Utilidades seguras ───────────── */

/** JSON.parse que nunca lanza y descarta claves peligrosas (__proto__, constructor, prototype). */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v)) as T;
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, max);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const s = str(v).toLowerCase();
  return ['1', 'true', 'si', 'sí', 'yes', 'y', 's', 'x'].includes(s);
};
const pick = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T => {
  const s = str(v).toLowerCase().replace(/\s+/g, '_') as T;
  return allowed.includes(s) ? s : dflt;
};
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)) : str(v).split(/[;|]/)).map((s) => s.trim()).filter(Boolean);

/** Valida una dirección IPv4 o un bloque CIDR IPv4/IPv6 sencillo. */
export function isIpOrCidr(s: string): boolean {
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/(3[0-2]|[12]?\d))?$/;
  const v6 = /^[0-9a-f:]+(\/(12[0-8]|1[01]\d|[1-9]?\d))?$/i;
  return v4.test(s.trim()) || (s.includes(':') && v6.test(s.trim()));
}

/* ───────────── CSV ───────────── */

/** Neutraliza la inyección de fórmulas: celdas de texto que empiezan por = + - @ tab o CR se prefijan con '. */
export function csvCell(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Parser CSV (RFC 4180) con detección de separador , o ; */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  titulo: 'title', título: 'title', nombre: 'title', tipo: 'kind', activo: 'assetId', asset: 'assetId', asset_id: 'assetId',
  assetid: 'assetId', estado: 'status', exploit: 'exploitPublic', exploit_publico: 'exploitPublic', exploitpublic: 'exploitPublic',
  remediacion: 'remediation', remediación: 'remediation', tecnica: 'technique', técnica: 'technique', leadsto: 'leadsTo',
  lleva_a: 'leadsTo', edgefrom: 'edgeFrom', desde: 'edgeFrom', descripcion: 'description', descripción: 'description',
  detectado: 'detectedAt', detectedat: 'detectedAt',
};

export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => {
    const k = h.trim().replace(/^'/, '');
    const low = k.toLowerCase();
    return HEADER_ALIASES[low] ?? (['id', 'cve', 'cvss', 'epss', 'kev', 'kind', 'title', 'status'].includes(low) ? low : k);
  });
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export const CSV_TEMPLATE = toCsv([
  ['id', 'title', 'kind', 'cve', 'cvss', 'epss', 'kev', 'exploitPublic', 'assetId', 'status', 'remediation', 'technique', 'edgeFrom', 'leadsTo'],
  ['H-100', 'Ejemplo: Log4Shell', 'cve', 'CVE-2021-44228', 10, 0.944, 'sí', 'sí', 'a01', 'abierto', 'log4shell', 'RCE y pivote', '', 'a04'],
]);

/* ───────────── Normalización ───────────── */

export function normalizeAsset(raw: Record<string, unknown>, i: number): Asset | null {
  const name = str(raw.name ?? raw.nombre, 120);
  if (!name) return null;
  const crit = Math.round(num(raw.criticality ?? raw.criticidad) ?? 3);
  return {
    id: str(raw.id, 40) || `a${String(i + 1).padStart(2, '0')}`,
    name,
    type: pick(raw.type ?? raw.tipo, ASSET_TYPES, 'servidor'),
    ip: str(raw.ip, 60),
    owner: str(raw.owner ?? raw.responsable, 80),
    criticality: Math.min(5, Math.max(1, crit)) as Asset['criticality'],
    internetExposed: bool(raw.internetExposed ?? raw.expuesto),
    tags: list(raw.tags ?? raw.etiquetas).slice(0, 12),
  };
}

/** Normaliza un hallazgo importado. Resuelve el activo por id, nombre o IP. Devuelve null si no es válido. */
export function normalizeFinding(raw: Record<string, unknown>, i: number, assets: Asset[]): Finding | null {
  const title = str(raw.title, 200);
  const cveRaw = str(raw.cve, 20).toUpperCase();
  const cve = CVE_RE.test(cveRaw) ? cveRaw : null;
  if (!title && !cve) return null;
  const assetRef = str(raw.assetId, 120).toLowerCase();
  const asset = assets.find((a) => a.id.toLowerCase() === assetRef || a.name.toLowerCase() === assetRef || a.ip === assetRef);
  const epss = num(raw.epss);
  const resolveRef = (ref: string) => assets.find((a) => a.id.toLowerCase() === ref.toLowerCase() || a.name.toLowerCase() === ref.toLowerCase())?.id;
  const leadsTo = list(raw.leadsTo).map(resolveRef).filter((x): x is string => !!x);
  const edgeFromRef = str(raw.edgeFrom, 120);
  return {
    id: str(raw.id, 40) || `IMP-${String(i + 1).padStart(3, '0')}`,
    title: title || cve!,
    kind: pick(raw.kind, KINDS, cve ? 'cve' : 'configuracion'),
    cve,
    cvss: Math.min(10, Math.max(0, num(raw.cvss) ?? 5)),
    epss: epss === null ? null : Math.min(1, Math.max(0, epss > 1 ? epss / 100 : epss)),
    kev: bool(raw.kev),
    exploitPublic: bool(raw.exploitPublic),
    assetId: asset?.id ?? str(raw.assetId, 40),
    status: pick(raw.status, STATUSES, 'abierto'),
    remediation: str(raw.remediation, 40),
    description: str(raw.description, 1000) || undefined,
    detectedAt: /^\d{4}-\d{2}-\d{2}/.test(str(raw.detectedAt)) ? str(raw.detectedAt).slice(0, 10) : undefined,
    resolvedAt: /^\d{4}-\d{2}-\d{2}/.test(str(raw.resolvedAt)) ? str(raw.resolvedAt).slice(0, 10) : null,
    technique: str(raw.technique, 160) || null,
    edgeFrom: edgeFromRef ? resolveRef(edgeFromRef) ?? null : null,
    leadsTo,
    ...optionalFields(raw),
  };
}

/** Campos opcionales de la fase 3 (CVE relacionados, fuentes, evidencias, ATT&CK y aceptación del riesgo), saneados. */
function optionalFields(raw: Record<string, unknown>): Partial<Finding> {
  const out: Partial<Finding> = {};
  const related = [...new Set(list(raw.relatedCves).map((c) => c.toUpperCase()).filter((c) => CVE_RE.test(c)))].slice(0, 200);
  if (related.length) out.relatedCves = related;
  const sources = [...new Set(list(raw.sources).map((x) => x.toLowerCase()).filter((x): x is FindingSource => (SOURCES as string[]).includes(x)))];
  if (sources.length) out.sources = sources;
  const evidence = str(raw.evidence, 4000);
  if (evidence) out.evidence = evidence;
  const attack = [...new Set(list(raw.attack).map((x) => x.toUpperCase()).filter((x) => ATTACK_RE.test(x)))].slice(0, 20);
  if (attack.length) out.attack = attack;
  const ex = parseException(raw.exception);
  if (ex) out.exception = ex;
  const val = parseValidation(raw.validation);
  if (val) out.validation = val;
  const rt = parseRetest(raw.retest);
  if (rt && str(raw.status) === 'mitigado') out.retest = rt;
  return out;
}

export function parseException(v: unknown): RiskException | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  const expires = str(e.expires, 10);
  if (!DATE_RE.test(expires)) return null;
  const approvedAt = str(e.approvedAt, 10);
  return {
    owner: str(e.owner, 120),
    reason: str(e.reason, 1000),
    expires,
    compensating: str(e.compensating, 1000),
    approvedAt: DATE_RE.test(approvedAt) ? approvedAt : '',
    previous: e.previous === 'validado' ? 'validado' : 'abierto',
  };
}

export interface ImportResult { findings: Finding[]; rejected: number }

/** Importa hallazgos desde texto JSON (array u objeto con findings) o CSV. */
export function importFindings(text: string, assets: Asset[]): ImportResult {
  const trimmed = text.trim();
  let rows: Record<string, unknown>[] = [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = safeJsonParse<unknown>(trimmed);
    const arr = Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as { findings?: unknown }).findings) ? (data as { findings: unknown[] }).findings : [];
    rows = arr.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  } else {
    rows = csvToObjects(trimmed);
  }
  const findings: Finding[] = [];
  let rejected = 0;
  rows.slice(0, 5000).forEach((r, i) => {
    const f = normalizeFinding(r, i, assets);
    if (f) findings.push(f); else rejected++;
  });
  return { findings, rejected };
}

/** Valida y sanea un proyecto completo importado desde JSON. */
export function parseProject(text: string): Project | null {
  const data = safeJsonParse<Record<string, unknown>>(text);
  if (!data || typeof data !== 'object' || data.format !== 'ctem-nexus') return null;
  const arr = (k: string) => (Array.isArray(data[k]) ? (data[k] as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);
  const assets = arr('assets').map(normalizeAsset).filter((a): a is Asset => !!a);
  const findings = arr('findings').map((f, i) => normalizeFinding(f, i, assets)).filter((f): f is Finding => !!f);
  const ranges: NetworkRange[] = arr('ranges').map((r, i) => ({ id: str(r.id, 40) || `r${i + 1}`, cidr: str(r.cidr, 60), label: str(r.label, 120), inScope: r.inScope !== false })).filter((r) => r.cidr);
  const edges: ManualEdge[] = arr('edges').map((e, i) => ({ id: str(e.id, 40) || `e${i + 1}`, from: str(e.from, 40), to: str(e.to, 40), technique: str(e.technique, 160) || 'Movimiento lateral' })).filter((e) => e.from && e.to);
  const progress: Record<string, number[]> = {};
  const rawProgress = data.progress && typeof data.progress === 'object' ? (data.progress as Record<string, unknown>) : {};
  const ids = new Set(findings.map((f) => f.id));
  for (const [id, steps] of Object.entries(rawProgress)) {
    if (!ids.has(id) || !Array.isArray(steps)) continue;
    const clean = [...new Set(steps.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 20))].sort((a, b) => a - b);
    if (clean.length) progress[id] = clean;
  }
  const project: Project = { format: 'ctem-nexus', version: 1, name: str(data.name, 120) || 'Proyecto importado', demo: data.demo === true, assets, ranges, findings, edges, progress };
  if (PROFILE_IDS.includes(data.profile as ProfileId)) project.profile = data.profile as ProfileId;
  const intel = parseIntelMeta(data.intel);
  if (intel) project.intel = intel;
  const imports = arr('imports').map(parseImportLog).filter((x): x is ImportLog => !!x).slice(0, MAX_IMPORTS);
  if (imports.length) project.imports = imports;
  const snapshots = arr('snapshots').map(parseSnapshot).filter((x): x is Snapshot => !!x).sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_SNAPSHOTS);
  if (snapshots.length) project.snapshots = snapshots;
  if (SLA_POLICY_IDS.includes(data.slaPolicy as SlaPolicy)) project.slaPolicy = data.slaPolicy as SlaPolicy;
  const ens = data.ens as Record<string, unknown> | undefined;
  if (ens && typeof ens === 'object' && ['BÁSICA', 'MEDIA', 'ALTA'].includes(str(ens.category, 8))) {
    const lv = ens.levels && typeof ens.levels === 'object' ? (ens.levels as Record<string, unknown>) : {};
    project.ens = {
      category: str(ens.category, 8) as EnsLink['category'],
      levels: Object.fromEntries(['D', 'I', 'C', 'A', 'T'].filter((d) => ['BAJO', 'MEDIO', 'ALTO'].includes(str(lv[d], 6))).map((d) => [d, str(lv[d], 6)])),
      project: str(ens.project, 120), at: DATE_RE.test(str(ens.at, 10)) ? str(ens.at, 10) : '',
    };
  }
  const ro = data.rosetta as Record<string, unknown> | undefined;
  if (ro && typeof ro === 'object' && ro.estados && typeof ro.estados === 'object') {
    const estados: RosettaLinkData['estados'] = {};
    for (const [k, v] of Object.entries(ro.estados as Record<string, unknown>).slice(0, 500)) if (/^[A-Z]{2,3}-\d{2}$/.test(k) && ROSETTA_ST.includes(v as string)) estados[k] = v as RosettaLinkData['estados'][string];
    project.rosetta = { generado: str(ro.generado, 40), proyecto: str(ro.proyecto, 120), estados, at: DATE_RE.test(str(ro.at, 10)) ? str(ro.at, 10) : '' };
  }
  const eco = arr('ecoLog').map((r) => ({ at: str(r.at, 10), tool: str(r.tool, 30), dir: r.dir === 'salida' ? 'salida' as const : 'entrada' as const, tipo: str(r.tipo, 30), detail: str(r.detail, 200) }))
    .filter((r) => DATE_RE.test(r.at) && ECO_LOG_TOOLS.includes(r.tool)).slice(0, MAX_ECO_LOG);
  if (eco.length) project.ecoLog = eco;
  return project;
}

function parseIntelMeta(v: unknown): IntelMeta | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const out: IntelMeta = {};
  const k = o.kev as Record<string, unknown> | undefined;
  if (k && typeof k === 'object') {
    out.kev = { version: str(k.version, 40), released: DATE_RE.test(str(k.released, 10)) ? str(k.released, 10) : '', count: Math.max(0, Math.round(num(k.count) ?? 0)), importedAt: DATE_RE.test(str(k.importedAt, 10)) ? str(k.importedAt, 10) : '' };
  }
  const e = o.epss as Record<string, unknown> | undefined;
  if (e && typeof e === 'object') {
    out.epss = { model: str(e.model, 40), scoreDate: DATE_RE.test(str(e.scoreDate, 10)) ? str(e.scoreDate, 10) : '', count: Math.max(0, Math.round(num(e.count) ?? 0)), importedAt: DATE_RE.test(str(e.importedAt, 10)) ? str(e.importedAt, 10) : '' };
  }
  return out.kev || out.epss ? out : null;
}

function parseImportLog(r: Record<string, unknown>): ImportLog | null {
  const source = str(r.source, 20) as FindingSource;
  const at = str(r.at, 10);
  if (!SOURCES.includes(source) || !DATE_RE.test(at)) return null;
  const n = (x: unknown) => Math.max(0, Math.round(num(x) ?? 0));
  return { at, source, tool: str(r.tool, 80), file: str(r.file, 120), newAssets: n(r.newAssets), newFindings: n(r.newFindings), updated: n(r.updated), reopened: n(r.reopened), ...(n(r.verified) ? { verified: n(r.verified) } : {}) };
}

function parseSnapshot(r: Record<string, unknown>): Snapshot | null {
  const at = str(r.at, 10);
  if (!DATE_RE.test(at)) return null;
  const n = (x: unknown) => Math.max(0, Math.round(num(x) ?? 0));
  const bb = (r.byBand && typeof r.byBand === 'object' ? r.byBand : {}) as Record<string, unknown>;
  const idx = num(r.exposureIndex);
  const mttr = num(r.mttrDays);
  return {
    at,
    label: str(r.label, 80),
    profile: PROFILE_IDS.includes(r.profile as ProfileId) ? (r.profile as ProfileId) : 'defecto',
    exposureIndex: idx === null ? 0 : Math.min(100, Math.max(0, Math.round(idx * 10) / 10)),
    open: n(r.open),
    byBand: { critica: n(bb.critica), alta: n(bb.alta), media: n(bb.media), baja: n(bb.baja) },
    kev: n(r.kev),
    attackPaths: n(r.attackPaths),
    accepted: n(r.accepted),
    overdue: n(r.overdue),
    mttrDays: mttr === null ? null : Math.max(0, Math.round(mttr * 10) / 10),
  };
}

/* ───────────── Informe y tickets ───────────── */

const mdEsc = (s: string) => s.replace(/[|\\`*_[\]<>]/g, (c) => `\\${c}`).replace(/\r?\n/g, ' ');

const BAND_EN: Record<string, string> = { critica: 'Critical', alta: 'High', media: 'Medium', baja: 'Low' };
const bandName = (lang: Lang, b: keyof typeof BAND_LABEL) => (lang === 'en' ? BAND_EN[b] : BAND_LABEL[b]);
const numIn = (lang: Lang, x: number) => (lang === 'en' ? fmt(x).replace(',', '.') : fmt(x));

export function buildTickets(findings: Finding[], assets: Asset[], result: EngineResult, lang: Lang = 'es') {
  const fById = new Map(findings.map((f) => [f.id, f]));
  const aById = new Map(assets.map((a) => [a.id, a]));
  return result.scored
    .filter((s) => { const f = fById.get(s.id); return f && (f.status === 'abierto' || f.status === 'validado'); })
    .map((s) => {
      const f = fById.get(s.id)!;
      const a = aById.get(f.assetId);
      const g = guideIn(lang, f.remediation, f.kind);
      return { finding: f, scored: s, asset: a, guide: g, owner: a?.owner ? `${g.owner} · ${a.owner}` : g.owner, explanation: explanationIn(lang, s, f, a), reasons: reasonsIn(lang, s, f, a) };
    });
}

/** Cabeceras en español y estables (las consume también la API); los valores siguen el idioma. */
export function ticketsCsv(findings: Finding[], assets: Asset[], result: EngineResult, lang: Lang = 'es'): string {
  const rows: unknown[][] = [['id', 'titulo', 'cve', 'activo', 'responsable', 'prioridad', 'puntuacion', 'sla_dias', 'pasos', 'verificacion', 'explicacion']];
  for (const t of buildTickets(findings, assets, result, lang)) {
    rows.push([t.finding.id, t.finding.title, t.finding.cve ?? '', t.asset?.name ?? t.finding.assetId, t.owner, bandName(lang, t.scored.band), t.scored.score, t.scored.slaDays, t.guide.steps.map((s, i) => `${i + 1}. ${s}`).join(' '), t.guide.verify, t.explanation]);
  }
  return toCsv(rows);
}

export function ticketsMarkdown(findings: Finding[], assets: Asset[], result: EngineResult, lang: Lang = 'es'): string {
  const L = (es: string, en: string) => (lang === 'en' ? en : es);
  const out: string[] = [L('# Tickets de remediación · CTEM-Nexus', '# Remediation tickets · CTEM-Nexus'), ''];
  for (const t of buildTickets(findings, assets, result, lang)) {
    out.push(`## [${bandName(lang, t.scored.band)}] ${mdEsc(t.finding.id)} · ${mdEsc(t.finding.title)}`, '');
    out.push(`- **${L('Activo', 'Asset')}:** ${mdEsc(t.asset?.name ?? t.finding.assetId)}`);
    if (t.finding.cve) out.push(`- **CVE:** ${t.finding.cve}`);
    out.push(
      `- **${L('Responsable', 'Owner')}:** ${mdEsc(t.owner)}`,
      `- **${L('Puntuación', 'Score')}:** ${numIn(lang, t.scored.score)}/100 · **SLA:** ${t.scored.slaDays} ${L('días', 'days')} · **${L('Vence', 'Due')}:** ${slaInfo(t.finding.detectedAt, t.scored.slaDays).due}`,
      `- **${L('Motivo', 'Reason')}:** ${mdEsc(t.explanation)}`, '',
    );
    out.push(`### ${mdEsc(t.guide.title)}`, '', ...t.guide.steps.map((s, i) => `${i + 1}. ${mdEsc(s)}`), '', `**${L('Verificación', 'Verification')}:**`, '', '```', t.guide.verify, '```', '');
  }
  return out.join('\n');
}

const JIRA_PRIORITY: Record<Band, string> = { critica: 'Highest', alta: 'High', media: 'Medium', baja: 'Low' };
/** Texto plano para Jira: sin llaves, corchetes ni barras que el marcado wiki interpretaría. */
const jiraEsc = (s: string) => s.replace(/[{}[\]|]/g, ' ').replace(/\r?\n/g, ' ');
const labelOf = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** CSV para el asistente de importación de Jira (fechas AAAA-MM-DD: indícalo como «yyyy-MM-dd» al importar). */
export function jiraCsv(findings: Finding[], assets: Asset[], result: EngineResult, lang: Lang = 'es', today: Date = new Date()): string {
  const L = (es: string, en: string) => (lang === 'en' ? en : es);
  const rows: unknown[][] = [['Summary', 'Issue Type', 'Priority', 'Due Date', 'Labels', 'Labels', 'Labels', 'Labels', 'Description']];
  for (const t of buildTickets(findings, assets, result, lang)) {
    const due = slaInfo(t.finding.detectedAt, t.scored.slaDays, today).due;
    const desc = [
      `h3. ${jiraEsc(t.guide.title)}`,
      `*${L('Activo', 'Asset')}:* ${jiraEsc(t.asset?.name ?? t.finding.assetId)}${t.finding.cve ? ` · *CVE:* ${t.finding.cve}` : ''}`,
      `*${L('Responsable', 'Owner')}:* ${jiraEsc(t.owner)}`,
      `*${L('Puntuación', 'Score')}:* ${numIn(lang, t.scored.score)}/100 (${bandName(lang, t.scored.band)}) · *SLA:* ${t.scored.slaDays} ${L('días', 'days')}`,
      `*${L('Motivo', 'Reason')}:* ${jiraEsc(t.explanation)}`,
      '',
      ...t.guide.steps.map((st) => `# ${jiraEsc(st)}`),
      '',
      `*${L('Verificación', 'Verification')}:*`,
      '{noformat}', t.guide.verify.replace(/\{noformat\}/gi, ''), '{noformat}',
      '',
      `_CTEM-Nexus · ${t.finding.id}_`,
    ].join('\n');
    rows.push([
      `[${bandName(lang, t.scored.band)}] ${t.finding.id} · ${t.finding.title}`.slice(0, 250), 'Task', JIRA_PRIORITY[t.scored.band], due,
      'ctem-nexus', `ctem-${labelOf(t.scored.band)}`, labelOf(t.finding.cve ?? t.finding.kind), labelOf(t.finding.remediation), desc,
    ]);
  }
  return toCsv(rows);
}

export interface GithubIssue { title: string; body: string; labels: string[] }

/** Un objeto por ticket listo para la API de GitHub (POST /repos/OWNER/REPO/issues). */
export function githubIssues(findings: Finding[], assets: Asset[], result: EngineResult, lang: Lang = 'es', today: Date = new Date()): GithubIssue[] {
  const L = (es: string, en: string) => (lang === 'en' ? en : es);
  return buildTickets(findings, assets, result, lang).map((t) => {
    const due = slaInfo(t.finding.detectedAt, t.scored.slaDays, today).due;
    const body = [
      `**${L('Activo', 'Asset')}:** ${mdEsc(t.asset?.name ?? t.finding.assetId)}${t.finding.cve ? ` · **CVE:** ${t.finding.cve}` : ''}`,
      `**${L('Responsable', 'Owner')}:** ${mdEsc(t.owner)}`,
      `**${L('Puntuación', 'Score')}:** ${numIn(lang, t.scored.score)}/100 (${bandName(lang, t.scored.band)}) · **SLA:** ${t.scored.slaDays} ${L('días', 'days')} · **${L('Vence', 'Due')}:** ${due}`,
      `**${L('Motivo', 'Reason')}:** ${mdEsc(t.explanation)}`,
      '',
      `### ${mdEsc(t.guide.title)}`,
      '',
      ...t.guide.steps.map((st) => `- [ ] ${mdEsc(st)}`),
      '',
      `**${L('Verificación', 'Verification')}:**`,
      '',
      '~~~',
      t.guide.verify.replace(/~~~/g, '~ ~ ~'),
      '~~~',
      '',
      `<sub>CTEM-Nexus · ${mdEsc(t.finding.id)}</sub>`,
    ].join('\n');
    const labels = ['ctem-nexus', `prioridad:${labelOf(bandName('es', t.scored.band))}`, ...(t.finding.kev ? ['kev'] : [])];
    return { title: `[${bandName(lang, t.scored.band)}] ${t.finding.id} · ${t.finding.title}`.slice(0, 250), body, labels };
  });
}

export function reportMarkdown(project: Pick<Project, 'name' | 'demo'> & Partial<Pick<Project, 'profile' | 'intel' | 'snapshots' | 'slaPolicy' | 'ens' | 'rosetta' | 'imports'>>, findings: Finding[], assets: Asset[], result: EngineResult, date = new Date(), author = '', lang: Lang = 'es'): string {
  const L = (es: string, en: string) => (lang === 'en' ? en : es);
  const s = result.summary;
  const fById = new Map(findings.map((f) => [f.id, f]));
  const aById = new Map(assets.map((a) => [a.id, a]));
  const top = result.scored.filter((x) => { const f = fById.get(x.id); return f && (f.status === 'abierto' || f.status === 'validado'); }).slice(0, 10);
  const out = [
    `# ${L('Informe ejecutivo de exposición', 'Executive exposure report')} · ${mdEsc(project.name)}`, '',
    `${L('Fecha', 'Date')}: ${date.toISOString().slice(0, 10)} · ${L('Motor', 'Engine')} ${result.engine === 'ts' ? L('local', 'local') : 'API'} v${result.version}${author ? ` · ${mdEsc(author)}` : ''}`, '',
  ];
  if (project.demo) out.push(L('> **Datos de ejemplo.** Este informe se ha generado con el conjunto de demostración de CTEM-Nexus.', '> **Sample data.** This report was generated with the CTEM-Nexus demo set.'), '');
  const PROF: Record<ProfileId, string> = { defecto: L('general', 'general'), ot: L('OT / industrial', 'OT / industrial'), banca: L('banca y finanzas', 'banking and finance') };
  const intelBits = [
    `${L('Perfil de ponderación', 'Weighting profile')}: ${PROF[project.profile ?? 'defecto']}`,
    project.intel?.kev ? `CISA KEV ${mdEsc(project.intel.kev.version)}` : '',
    project.intel?.epss ? `FIRST EPSS ${mdEsc(project.intel.epss.scoreDate || project.intel.epss.model)}` : '',
    project.slaPolicy && project.slaPolicy !== 'estandar' ? L(`Plazos según la categoría ENS ${project.ens?.category ?? project.slaPolicy.replace('ens_', '').toUpperCase()}`, `Deadlines from ENS category ${project.ens?.category ?? project.slaPolicy.replace('ens_', '').toUpperCase()}`) : '',
  ].filter(Boolean);
  out.push(intelBits.join(' · '), '');
  const prev = project.snapshots?.length ? project.snapshots[project.snapshots.length - 1] : null;
  if (prev) {
    const d = (a: number, b: number, dec = false) => { const x = Math.round((a - b) * 10) / 10; return `${x > 0 ? '+' : x < 0 ? '−' : '±'}${dec ? numIn(lang, Math.abs(x)) : Math.abs(x)}`; };
    out.push(`## ${L('Tendencia', 'Trend')}`, '',
      L(`Frente al cierre del ${prev.at}${prev.label ? ` (${mdEsc(prev.label)})` : ''}:`, `Compared with the close of ${prev.at}${prev.label ? ` (${mdEsc(prev.label)})` : ''}:`), '',
      `| ${L('Indicador', 'Indicator')} | ${L('Entonces', 'Then')} | ${L('Ahora', 'Now')} | ${L('Cambio', 'Change')} |`, '|---|---:|---:|---:|',
      `| ${L('Índice de exposición', 'Exposure index')} | ${numIn(lang, prev.exposureIndex)} | ${numIn(lang, s.exposureIndex)} | ${d(s.exposureIndex, prev.exposureIndex, true)} |`,
      `| ${L('Hallazgos abiertos', 'Open findings')} | ${prev.open} | ${s.openFindings} | ${d(s.openFindings, prev.open)} |`,
      `| ${L('Críticos', 'Critical')} | ${prev.byBand.critica} | ${s.byBand.critica} | ${d(s.byBand.critica, prev.byBand.critica)} |`,
      `| ${L('En CISA KEV', 'In CISA KEV')} | ${prev.kev} | ${s.kevOpen} | ${d(s.kevOpen, prev.kev)} |`,
      `| ${L('Rutas de ataque', 'Attack paths')} | ${prev.attackPaths} | ${s.attackPaths} | ${d(s.attackPaths, prev.attackPaths)} |`, '');
    if (prev.profile !== (project.profile ?? 'defecto')) out.push(L('> El perfil de ponderación cambió desde entonces: el índice no es del todo comparable.', '> The weighting profile changed since then: the index is not fully comparable.'), '');
  }
  out.push(`## ${L('Indicadores', 'Indicators')}`, '',
    `| ${L('Indicador', 'Indicator')} | ${L('Valor', 'Value')} |`, '|---|---:|',
    `| ${L('Índice de exposición', 'Exposure index')} | ${numIn(lang, s.exposureIndex)}/100 |`,
    `| ${L('Hallazgos abiertos', 'Open findings')} | ${s.openFindings} |`,
    `| ${L('Críticos / Altos / Medios / Bajos', 'Critical / High / Medium / Low')} | ${s.byBand.critica} / ${s.byBand.alta} / ${s.byBand.media} / ${s.byBand.baja} |`,
    `| ${L('En CISA KEV', 'In CISA KEV')} | ${s.kevOpen} |`,
    `| ${L('Activos en riesgo', 'Assets at risk')} | ${s.assetsAtRisk} |`,
    `| ${L('Rutas de ataque hacia joyas de la corona', 'Attack paths to crown jewels')} | ${s.attackPaths} |`,
    `| ${L('Puntos de estrangulamiento', 'Choke points')} | ${s.chokePoints} |`,
    `| ${L('MTTR (días)', 'MTTR (days)')} | ${s.mttrDays === null ? '—' : numIn(lang, s.mttrDays)} |`, '',
    `## ${L('Riesgos principales', 'Top risks')}`, '', `| # | ${L('Hallazgo', 'Finding')} | ${L('Activo', 'Asset')} | ${L('Prioridad', 'Priority')} | ${L('Puntuación', 'Score')} | SLA |`, '|---:|---|---|---|---:|---:|',
    ...top.map((x, i) => {
      const f = fById.get(x.id)!;
      return `| ${i + 1} | ${mdEsc(f.id)} · ${mdEsc(f.title)}${f.cve ? ` (${f.cve})` : ''} | ${mdEsc(aById.get(f.assetId)?.name ?? f.assetId)} | ${bandName(lang, x.band)} | ${numIn(lang, x.score)} | ${x.slaDays} d |`;
    }), '',
    `## ${L('Puntos de estrangulamiento', 'Choke points')}`, '',
    ...(result.graph.chokePoints.length
      ? result.graph.chokePoints.map((c) => `- **${mdEsc(c.label)}** (${c.kind === 'nodo' ? L('nodo', 'node') : L('arista', 'edge')}): ${L(`presente en ${c.paths} de ${s.attackPaths} rutas`, `present in ${c.paths} of ${s.attackPaths} paths`)} (${Math.round(c.share * 100)} %).`)
      : [L('- No se han identificado puntos de estrangulamiento.', '- No choke points were identified.')]), '',
    `## ${L('Recomendación', 'Recommendation')}`, '',
    L('Corregir primero los hallazgos que coinciden con puntos de estrangulamiento: cortan el mayor número de rutas hacia las joyas de la corona con el menor esfuerzo.', 'Fix first the findings on choke points: they break the most paths to the crown jewels with the least effort.'), '');
  const plan = fixPlan(result, findings, 5);
  if (plan.steps.length) {
    out.push(`## ${L('Cinco acciones', 'Five actions')}`, '');
    plan.steps.forEach((st, i) => {
      const names = st.ids.map((id) => { const f = fById.get(id)!; return `${mdEsc(id)} · ${mdEsc(f.title)}`; }).join(L(' + ', ' + '));
      const effect = st.newlyBroken ? L(`rompe ${st.newlyBroken} ${st.newlyBroken === 1 ? 'ruta' : 'rutas'} (${st.cumulativeBroken} de ${plan.totalPaths} acumuladas)`, `breaks ${st.newlyBroken} ${st.newlyBroken === 1 ? 'path' : 'paths'} (${st.cumulativeBroken} of ${plan.totalPaths} cumulative)`) : L(`baja el índice (puntuación ${numIn(lang, st.score)})`, `lowers the index (score ${numIn(lang, st.score)})`);
      out.push(`${i + 1}. ${names}: ${effect}.`);
    });
    out.push('');
  }
  // Controles afectados (Rosetta): dónde cae la exposición abierta en el mapa multinorma.
  const byCtl = new Map<string, { n: number; serious: number; worst: number }>();
  for (const x of result.scored) {
    const f = fById.get(x.id);
    if (!f || (f.status !== 'abierto' && f.status !== 'validado')) continue;
    for (const c of controlsFor(f)) {
      const e = byCtl.get(c) ?? { n: 0, serious: 0, worst: 0 };
      e.n++; if (x.band === 'critica' || x.band === 'alta') e.serious++; e.worst = Math.max(e.worst, x.score);
      byCtl.set(c, e);
    }
  }
  if (byCtl.size) {
    const ST: Record<string, string> = { implantado: L('implantado', 'implemented'), parcial: L('parcial', 'partial'), pendiente: L('pendiente', 'pending'), 'no-aplica': L('no aplica', 'not applicable') };
    const rows = [...byCtl.entries()].sort((a, b) => b[1].worst - a[1].worst || a[0].localeCompare(b[0])).slice(0, 8);
    out.push(`## ${L('Controles afectados', 'Affected controls')}`, '',
      L('Controles unificados de Rosetta Multinorma con hallazgos abiertos. Solo identificadores de cada norma.', 'Rosetta Multinorma unified controls with open findings. Identifiers only.'), '',
      `| ${L('Control', 'Control')} | ENS | ISO/IEC 27001 | NIS2 | ${L('Abiertos', 'Open')} | ${L('Críticos o altos', 'Critical or high')}${project.rosetta ? ` | Rosetta` : ''} |`, `|---|---|---|---|---:|---:|${project.rosetta ? '---|' : ''}`,
      ...rows.map(([id, e]) => {
        const c = CONTROLS[id];
        const st = project.rosetta?.estados[id];
        const clash = st === 'implantado' && e.serious > 0;
        return `| ${id} · ${mdEsc(lang === 'en' ? c.titleEn : c.title)} | ${c.ens.join(', ') || '—'} | ${c.iso27001.join(', ') || '—'} | ${c.nis2.join(', ') || '—'} | ${e.n} | ${e.serious}${project.rosetta ? ` | ${st ? ST[st] : '—'}${clash ? L(' ⚠ contradicción', ' ⚠ contradiction') : ''}` : ''} |`;
      }), '');
  }
  // Validación ofensiva y verificación de las correcciones
  const validated = findings.filter((f) => f.validation);
  const rs = retestStats(findings, project.imports ?? []);
  if (validated.length || rs.pending || rs.verified || rs.reopened) {
    const RES: Record<string, string> = { explotado: L('explotado', 'exploited'), no_explotable: L('no explotable', 'not exploitable'), mitigado_control: L('mitigado por un control', 'mitigated by a control') };
    out.push(`## ${L('Validación y verificación', 'Validation and verification')}`, '',
      L(`Correcciones pendientes de verificar: ${rs.pending} · verificadas: ${rs.verified} · reabiertas por un escaneo posterior: ${rs.reopened}${rs.reopenRate === null ? '' : ` (tasa de reapertura ${numIn(lang, rs.reopenRate * 100)} %)`}.`,
        `Fixes pending verification: ${rs.pending} · verified: ${rs.verified} · reopened by a later scan: ${rs.reopened}${rs.reopenRate === null ? '' : ` (reopen rate ${numIn(lang, rs.reopenRate * 100)} %)`}.`), '');
    if (validated.length) {
      out.push(`| ${L('Hallazgo', 'Finding')} | ${L('Resultado', 'Result')} | ${L('Fecha', 'Date')} | ${L('Por', 'By')} | ATT&CK | ${L('Prueba', 'Proof')} |`, '|---|---|---|---|---|---|',
        ...validated.map((f) => `| ${mdEsc(f.id)} · ${mdEsc(f.title)} | ${RES[f.validation!.result]} | ${f.validation!.at} | ${mdEsc(f.validation!.by)} | ${f.validation!.technique || '—'} | ${mdEsc(f.validation!.proof.slice(0, 160))} |`), '');
    }
  }
  const accepted = findings.filter((f) => f.status === 'aceptado' && f.exception);
  if (accepted.length) {
    out.push(`## ${L('Riesgos aceptados', 'Accepted risks')}`, '', `| ${L('Hallazgo', 'Finding')} | ${L('Responsable', 'Owner')} | ${L('Caduca', 'Expires')} | ${L('Control compensatorio', 'Compensating control')} |`, '|---|---|---|---|',
      ...accepted.map((f) => `| ${mdEsc(f.id)} · ${mdEsc(f.title)} | ${mdEsc(f.exception!.owner)} | ${f.exception!.expires} | ${mdEsc(f.exception!.compensating || '—')} |`), '');
  }
  return out.join('\n');
}
