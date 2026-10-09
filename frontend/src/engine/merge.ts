/* Deduplicación e incorporación de importaciones al proyecto (sin DOM).
 *
 * Clave de un hallazgo: activo + CVE (principal o relacionado) o, sin CVE, el título normalizado o la misma guía de
 * remediación específica (p. ej. «SMB Signing not required» de Nessus = «Firma SMB no obligatoria» del analista).
 * - Dentro del mismo fichero, los duplicados (mismo plugin en varios puertos, mismo CVE en varios paquetes) se funden.
 * - Contra el proyecto, un hallazgo que ya existe se actualiza: se suman fuentes y evidencias, se toma el CVSS y el
 *   EPSS más altos y KEV/exploit si cualquiera los marca. El estado y la remediación del analista se respetan,
 *   salvo que el hallazgo estuviera mitigado: si un escáner lo vuelve a ver, se reabre (regresión). */
import { isIpOrCidr } from './io';
import type { ScanItem, ScanParse } from './scanners';
import type { Asset, Finding, FindingSource } from './types';

export const EVIDENCE_MAX = 4000;
const PREFIX: Record<string, string> = { nessus: 'NES', openvas: 'OVS', nuclei: 'NUC', trivy: 'TRV', sarif: 'SRF', adauditor: 'ADA' };

export const normTitle = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** ¿La IP cae dentro del bloque CIDR IPv4? */
function inCidr(ip: string, cidr: string): boolean {
  const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(cidr.trim());
  if (!m || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const toInt = (s: string) => s.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
  const bits = Number(m[2]);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(m[1]) & mask);
}

/** Siguiente identificador libre con ese prefijo («a» → a09; «NES-» → NES-004). */
export function nextFreeId(prefix: string, taken: Set<string>, pad = 3): string {
  let max = 0;
  for (const id of taken) if (id.startsWith(prefix)) { const m = /(\d+)$/.exec(id); if (m) max = Math.max(max, Number(m[1])); }
  let n = max + 1;
  let id = `${prefix}${String(n).padStart(pad, '0')}`;
  while (taken.has(id)) id = `${prefix}${String(++n).padStart(pad, '0')}`;
  taken.add(id);
  return id;
}

const appendEvidence = (a: string | undefined, b: string | undefined): string | undefined => {
  const parts = [...new Set([...(a ?? '').split('\n'), ...(b ?? '').split('\n')].map((x) => x.trim()).filter(Boolean))];
  if (!parts.length) return undefined;
  let out = parts.join('\n');
  if (out.length > EVIDENCE_MAX) out = `${out.slice(0, EVIDENCE_MAX - 1)}…`;
  return out;
};

/** Guías genéricas: no sirven para decir que dos hallazgos sin CVE son el mismo. */
const GENERIC = new Set(['', 'patch_cve', 'weak_config', 'identity_generic']);
const SPECIFIC_GUIDE = (key: string) => !GENERIC.has(key);

const cvesOf = (f: Pick<Finding, 'cve' | 'relatedCves'>) => [f.cve, ...(f.relatedCves ?? [])].filter((x): x is string => !!x);

/** Fusiona `incoming` en `base` (mismo activo y misma vulnerabilidad). Devuelve un objeto nuevo. */
export function mergeFinding(base: Finding, incoming: Finding): { merged: Finding; reopened: boolean } {
  const cves = [...new Set([...cvesOf(base), ...cvesOf(incoming)])];
  const primary = base.cve ?? incoming.cve ?? null;
  const sources = [...new Set([...(base.sources ?? ['manual']), ...(incoming.sources ?? [])])] as FindingSource[];
  const reopened = base.status === 'mitigado';
  const epss = Math.max(base.epss ?? -1, incoming.epss ?? -1);
  const merged: Finding = {
    ...base,
    cve: primary,
    relatedCves: cves.filter((c) => c !== primary).sort(),
    cvss: Math.max(base.cvss, incoming.cvss),
    epss: epss < 0 ? null : epss,
    kev: base.kev || incoming.kev,
    exploitPublic: base.exploitPublic || incoming.exploitPublic,
    description: base.description || incoming.description,
    sources,
    evidence: appendEvidence(base.evidence, reopened ? `Reaparece tras la mitigación (${(incoming.sources ?? []).join(', ')})\n${incoming.evidence ?? ''}` : incoming.evidence),
    detectedAt: [base.detectedAt, incoming.detectedAt].filter(Boolean).sort()[0],
    ...(reopened ? { status: 'abierto' as const, resolvedAt: null } : {}),
  };
  if (!merged.relatedCves?.length) delete merged.relatedCves;
  const attack = [...new Set([...(base.attack ?? []), ...(incoming.attack ?? [])])];
  if (attack.length) merged.attack = attack; else delete merged.attack;
  return { merged, reopened };
}

export interface ImportPlan {
  source: ScanParse['source'];
  tool: string;
  /** Activos nuevos que se crearán. */
  newAssets: Asset[];
  /** Hosts del fichero que ya existían en el proyecto. */
  matchedAssets: number;
  /** Hallazgos nuevos. */
  newFindings: Finding[];
  /** Versiones actualizadas de hallazgos existentes. */
  updatedFindings: Finding[];
  /** De los actualizados, cuántos estaban mitigados y se reabren. */
  reopened: number;
  /** Sus identificadores. */
  reopenedIds: string[];
  /** Duplicados fundidos dentro del propio fichero. */
  duplicatesInFile: number;
  skipped: number;
}

export interface PlanOptions {
  /** Asignar todos los hosts del fichero a este activo (útil para Trivy y SARIF). */
  targetAssetId?: string | null;
  /** Fecha de detección (AAAA-MM-DD). */
  today?: string;
}

/** Resuelve un host contra los activos: IP exacta, IP dentro de un CIDR, nombre o FQDN. */
export function resolveAsset(h: { ip: string; name: string }, assets: Asset[]): Asset | undefined {
  const ip = h.ip.trim();
  const name = h.name.trim().toLowerCase();
  const short = name.split('.')[0];
  return (ip && assets.find((a) => a.ip === ip))
    || (ip && assets.find((a) => a.ip.includes('/') && isIpOrCidr(a.ip) && inCidr(ip, a.ip)))
    || (name && assets.find((a) => a.name.toLowerCase() === name || a.id.toLowerCase() === name))
    || (short && short.length > 2 && assets.find((a) => a.name.toLowerCase().split(/[\s.]/).includes(short)))
    || undefined;
}

export function planImport(parse: ScanParse, project: { assets: Asset[]; findings: Finding[] }, opts: PlanOptions = {}): ImportPlan {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const assetIds = new Set(project.assets.map((a) => a.id));
  const findingIds = new Set(project.findings.map((f) => f.id));
  const target = opts.targetAssetId ? project.assets.find((a) => a.id === opts.targetAssetId) : undefined;
  const hostToAsset = new Map<string, string>();
  const newAssets: Asset[] = [];
  let matchedAssets = 0;
  for (const h of parse.hosts) {
    const existing = target ?? resolveAsset(h, [...project.assets, ...newAssets]);
    if (existing) {
      hostToAsset.set(h.key, existing.id);
      if (project.assets.includes(existing)) matchedAssets++;
      continue;
    }
    const asset: Asset = {
      id: nextFreeId('a', assetIds, 2),
      name: h.name.slice(0, 120) || h.ip,
      type: h.type,
      ip: h.ip,
      owner: '',
      criticality: 3,
      internetExposed: h.exposed,
      tags: [parse.source],
    };
    newAssets.push(asset);
    hostToAsset.set(h.key, asset.id);
  }
  if (target) matchedAssets = 1;

  // 1) Fusión dentro del fichero.
  const toFinding = (it: ScanItem): Finding => ({
    id: '',
    title: it.title,
    kind: it.kind,
    cve: it.cve,
    ...(it.relatedCves.length ? { relatedCves: it.relatedCves } : {}),
    cvss: it.cvss,
    epss: it.epss,
    kev: it.kev,
    exploitPublic: it.exploitPublic,
    assetId: hostToAsset.get(it.hostKey) ?? '',
    status: 'abierto',
    remediation: it.remediation,
    description: it.description || undefined,
    detectedAt: today,
    resolvedAt: null,
    technique: null,
    leadsTo: [],
    sources: [parse.source],
    evidence: it.evidence || undefined,
    ...(it.attack?.length ? { attack: it.attack } : {}),
  });
  const keyOf = (f: Finding) => `${f.assetId}|${f.cve ?? `t:${normTitle(f.title)}`}`;
  const incoming = new Map<string, Finding>();
  let duplicatesInFile = 0;
  for (const it of parse.items) {
    const f = toFinding(it);
    if (!f.assetId) continue;
    const k = keyOf(f);
    const prev = incoming.get(k);
    if (prev) { duplicatesInFile++; incoming.set(k, mergeFinding(prev, f).merged); } else incoming.set(k, f);
  }

  // 2) Contra el proyecto: misma clave o CVE coincidente (principal o relacionado) en el mismo activo.
  const updated = new Map<string, Finding>();
  const newFindings: Finding[] = [];
  const reopenedIds: string[] = [];
  const current = (id: string) => updated.get(id) ?? project.findings.find((f) => f.id === id)!;
  for (const f of incoming.values()) {
    const fCves = new Set(cvesOf(f));
    const match = project.findings.find((e) => e.assetId === f.assetId && (
      f.cve ? cvesOf(e).some((c) => fCves.has(c))
        : !e.cve && (normTitle(e.title) === normTitle(f.title) || (SPECIFIC_GUIDE(f.remediation) && e.remediation === f.remediation))
    ));
    if (match) {
      const { merged, reopened: r } = mergeFinding(current(match.id), f);
      if (r && !updated.has(match.id)) reopenedIds.push(match.id);
      updated.set(match.id, merged);
    } else {
      newFindings.push({ ...f, id: nextFreeId(`${PREFIX[parse.source] ?? 'IMP'}-`, findingIds) });
    }
  }
  return {
    source: parse.source,
    tool: parse.tool,
    newAssets,
    matchedAssets,
    newFindings,
    updatedFindings: [...updated.values()],
    reopened: reopenedIds.length,
    reopenedIds,
    duplicatesInFile,
    skipped: parse.skipped,
  };
}
