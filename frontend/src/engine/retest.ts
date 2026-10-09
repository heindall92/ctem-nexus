/* Validación ofensiva y verificación de la corrección (retest), sin DOM.
 *
 * - Validación: quién probó el hallazgo, cuándo, con qué técnica y con qué resultado. «Explotado» lo deja validado
 *   (+5 en la puntuación); «no explotable» o «mitigado por un control» lo dejan como no explotable (× 0,25).
 * - Retest: al marcar un hallazgo como mitigado queda «pendiente de verificar». Pasa a «verificado» cuando un escaneo
 *   posterior de la misma herramienta cubre su activo y ya no lo ve, o cuando el analista lo confirma. Si reaparece,
 *   se reabre (merge.ts) y cuenta para la tasa de reapertura. */
import type { Finding, FindingStatus } from './types';

export const VALIDATION_RESULTS = ['explotado', 'no_explotable', 'mitigado_control'] as const;
export type ValidationResult = (typeof VALIDATION_RESULTS)[number];

export interface Validation {
  result: ValidationResult;
  /** AAAA-MM-DD */
  at: string;
  by: string;
  /** Técnica ATT&CK usada (Txxxx o Txxxx.yyy), opcional. */
  technique: string;
  /** Prueba en texto: comando, salida resumida o captura descrita. Sin credenciales. */
  proof: string;
}

export interface Retest {
  state: 'pendiente' | 'verificado';
  /** Desde cuándo espera la verificación (AAAA-MM-DD). */
  since: string;
  verifiedAt?: string;
  /** «Nessus», «OWASP ZAP»… o «analista». */
  by?: string;
}

export const statusForValidation = (r: ValidationResult): FindingStatus => (r === 'explotado' ? 'validado' : 'no_explotable');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TECH = /^T\d{4}(\.\d{3})?$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim().slice(0, max);

export type ValidationError = 'resultado' | 'responsable' | 'fecha' | 'futura' | 'tecnica' | 'prueba';
export function validateValidation(v: Partial<Validation>, today: string): ValidationError[] {
  const e: ValidationError[] = [];
  if (!VALIDATION_RESULTS.includes(v.result as ValidationResult)) e.push('resultado');
  if (str(v.by, 120).length < 2) e.push('responsable');
  if (!DATE.test(v.at ?? '')) e.push('fecha'); else if ((v.at ?? '') > today) e.push('futura');
  if (v.technique && !TECH.test(v.technique.trim().toUpperCase())) e.push('tecnica');
  if (str(v.proof, 4000).length < 10) e.push('prueba');
  return e;
}

export function parseValidation(v: unknown): Validation | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const result = o.result as ValidationResult;
  const at = str(o.at, 10);
  if (!VALIDATION_RESULTS.includes(result) || !DATE.test(at)) return null;
  const technique = str(o.technique, 12).toUpperCase();
  return { result, at, by: str(o.by, 120), technique: TECH.test(technique) ? technique : '', proof: str(o.proof, 4000) };
}

export function parseRetest(v: unknown): Retest | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const since = str(o.since, 10);
  if ((o.state !== 'pendiente' && o.state !== 'verificado') || !DATE.test(since)) return null;
  const out: Retest = { state: o.state, since };
  const at = str(o.verifiedAt, 10);
  if (o.state === 'verificado' && DATE.test(at)) out.verifiedAt = at;
  const by = str(o.by, 60);
  if (by) out.by = by;
  return out;
}

/** Aplica un cambio de estado manteniendo el retest coherente. */
export function withStatus(f: Finding, status: FindingStatus, today: string): Finding {
  const out: Finding = { ...f, status, resolvedAt: status === 'mitigado' ? f.resolvedAt ?? today : null };
  if (status === 'mitigado') out.retest = f.status === 'mitigado' && f.retest ? f.retest : { state: 'pendiente', since: today };
  else delete out.retest;
  return out;
}

export interface RetestStats {
  pending: number;
  verified: number;
  /** Mitigados que un escaneo volvió a ver (suma del registro de importaciones). */
  reopened: number;
  /** reabiertos / (verificados + reabiertos), o null si aún no hay nada que medir. */
  reopenRate: number | null;
  /** Pendientes del más antiguo al más reciente. */
  pendingList: Array<{ id: string; since: string }>;
}

export function retestStats(findings: Finding[], imports: Array<{ reopened: number }> = []): RetestStats {
  const pendingList = findings.filter((f) => f.status === 'mitigado' && f.retest?.state === 'pendiente').map((f) => ({ id: f.id, since: f.retest!.since })).sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
  const verified = findings.filter((f) => f.status === 'mitigado' && f.retest?.state === 'verificado').length;
  const reopened = imports.reduce((n, i) => n + (i.reopened || 0), 0);
  return { pending: pendingList.length, verified, reopened, reopenRate: verified + reopened ? Math.round((reopened / (verified + reopened)) * 1000) / 1000 : null, pendingList };
}
