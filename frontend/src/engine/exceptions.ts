/* Aceptación de riesgo con caducidad (sin DOM). El motor de puntuación no conoce la fecha de hoy, así que la caducidad
 * se aplica aquí: al cargar el proyecto, una aceptación vencida devuelve el hallazgo a su estado anterior y la ficha se
 * conserva como «última caducada» para la auditoría. */
import type { Band, Finding, RiskException } from './types';

const DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => isoDay(new Date(toMs(iso) + n * DAY));

/** Plazo máximo de una aceptación: obliga a revisarla al menos una vez al año. */
export const MAX_ACCEPT_DAYS = 365;
/** Aviso previo a la caducidad. */
export const EXPIRY_WARNING_DAYS = 14;

export type ExceptionState = 'vigente' | 'por_caducar' | 'caducada';

export function exceptionState(e: Pick<RiskException, 'expires'>, today: string): { state: ExceptionState; daysLeft: number } {
  const daysLeft = Math.round((toMs(e.expires) - toMs(today)) / DAY);
  return { state: daysLeft < 0 ? 'caducada' : daysLeft <= EXPIRY_WARNING_DAYS ? 'por_caducar' : 'vigente', daysLeft };
}

export interface ExceptionInput {
  owner: string;
  reason: string;
  expires: string;
  compensating: string;
}

export type ExceptionError = 'estado' | 'responsable' | 'motivo' | 'fecha' | 'pasada' | 'lejana' | 'compensatorio';

/** Reglas de gobierno: quién, por qué, hasta cuándo y, en bandas crítica o alta, con qué control compensatorio. */
export function validateException(f: Pick<Finding, 'status'>, input: ExceptionInput, today: string, band: Band): ExceptionError[] {
  const errors: ExceptionError[] = [];
  if (f.status !== 'abierto' && f.status !== 'validado' && f.status !== 'aceptado') errors.push('estado');
  if (input.owner.trim().length < 2) errors.push('responsable');
  if (input.reason.trim().length < 10) errors.push('motivo');
  if (!DATE_RE.test(input.expires) || Number.isNaN(toMs(input.expires))) errors.push('fecha');
  else if (input.expires <= today) errors.push('pasada');
  else if (input.expires > addDays(today, MAX_ACCEPT_DAYS)) errors.push('lejana');
  if ((band === 'critica' || band === 'alta') && input.compensating.trim().length < 5) errors.push('compensatorio');
  return errors;
}

/** Acepta el riesgo (o renueva una aceptación vigente) conservando el estado al que volverá. */
export function acceptRisk(f: Finding, input: ExceptionInput, today: string): Finding {
  const previous = f.status === 'aceptado' ? (f.exception?.previous ?? 'abierto') : f.status === 'validado' ? 'validado' : 'abierto';
  return {
    ...f,
    status: 'aceptado',
    resolvedAt: null,
    exception: {
      owner: input.owner.trim().slice(0, 120),
      reason: input.reason.trim().slice(0, 1000),
      expires: input.expires,
      compensating: input.compensating.trim().slice(0, 1000),
      approvedAt: today,
      previous,
    },
  };
}

/** Retira la aceptación: el hallazgo vuelve a su estado anterior y la ficha queda como historial. */
export function revokeRisk(f: Finding): Finding {
  if (f.status !== 'aceptado') return f;
  return { ...f, status: f.exception?.previous ?? 'abierto' };
}

/** Devuelve los hallazgos con las aceptaciones vencidas ya revertidas y la lista de los afectados. */
export function expireExceptions(findings: Finding[], today: string): { findings: Finding[]; expired: string[] } {
  const expired: string[] = [];
  const out = findings.map((f) => {
    if (f.status !== 'aceptado') return f;
    if (f.exception && exceptionState(f.exception, today).state !== 'caducada') return f;
    expired.push(f.id);
    return revokeRisk(f);
  });
  return { findings: expired.length ? out : findings, expired };
}

/** Aceptaciones vigentes que caducan pronto (para avisar antes de que vuelvan a abrirse). */
export function expiringSoon(findings: Finding[], today: string): Finding[] {
  return findings
    .filter((f) => f.status === 'aceptado' && f.exception && exceptionState(f.exception, today).state === 'por_caducar')
    .sort((a, b) => a.exception!.expires.localeCompare(b.exception!.expires));
}
