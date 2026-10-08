/* Plazos de remediación (SLA): fecha límite y días restantes desde la detección. Sin DOM. */

const DAY = 86_400_000;
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export type SlaState = 'vencido' | 'hoy' | 'proximo' | 'en_plazo';

export interface SlaInfo {
  /** Fecha límite (AAAA-MM-DD). */
  due: string;
  /** Días que faltan (negativo si ya venció). */
  daysLeft: number;
  state: SlaState;
}

/** Calcula la fecha límite a partir de la detección. Sin fecha de detección se cuenta desde hoy. */
export function slaInfo(detectedAt: string | null | undefined, slaDays: number, today: Date = new Date()): SlaInfo {
  const now = utcDay(today);
  const parsed = detectedAt && /^\d{4}-\d{2}-\d{2}/.test(detectedAt) ? Date.parse(`${detectedAt.slice(0, 10)}T00:00:00Z`) : NaN;
  const start = Number.isFinite(parsed) ? parsed : now;
  const dueMs = start + slaDays * DAY;
  const daysLeft = Math.round((dueMs - now) / DAY);
  const state: SlaState = daysLeft < 0 ? 'vencido' : daysLeft === 0 ? 'hoy' : daysLeft <= 3 ? 'proximo' : 'en_plazo';
  return { due: new Date(dueMs).toISOString().slice(0, 10), daysLeft, state };
}

/** Desplaza todas las fechas (AAAA-MM-DD) el mismo número de días, conservando los intervalos (MTTR, SLA). */
export function shiftDate(iso: string | null | undefined, days: number): string | null | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** Días enteros entre dos fechas (b − a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((utcDay(b) - utcDay(a)) / DAY);
}
