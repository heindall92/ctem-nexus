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
// Muchos hallazgos comparten fecha de detección y plazo: con 50.000, recalcular fechas en cada uno costaba 250 ms.
// Caché por día (se vacía al cambiar de día): fecha de detección → plazo → resultado. Sin crear Date ni claves de texto.
let cacheDia = NaN;
const cache = new Map<string, Map<number, Readonly<SlaInfo>>>();

export function slaInfo(detectedAt: string | null | undefined, slaDays: number, today?: Date): Readonly<SlaInfo> {
  const now = Math.floor((today ? today.getTime() : Date.now()) / DAY) * DAY;   // medianoche UTC de hoy
  if (now !== cacheDia || cache.size > 20_000) { cache.clear(); cacheDia = now; }
  const k = detectedAt ?? '';
  let porPlazo = cache.get(k);
  if (!porPlazo) { porPlazo = new Map(); cache.set(k, porPlazo); }
  let info = porPlazo.get(slaDays);
  if (!info) { info = calcular(detectedAt, slaDays, now); porPlazo.set(slaDays, info); }
  return info;
}

function calcular(detectedAt: string | null | undefined, slaDays: number, now: number): Readonly<SlaInfo> {
  const parsed = detectedAt && /^\d{4}-\d{2}-\d{2}/.test(detectedAt) ? Date.parse(`${detectedAt.slice(0, 10)}T00:00:00Z`) : NaN;
  const start = Number.isFinite(parsed) ? parsed : now;
  const dueMs = start + slaDays * DAY;
  const daysLeft = Math.round((dueMs - now) / DAY);
  const state: SlaState = daysLeft < 0 ? 'vencido' : daysLeft === 0 ? 'hoy' : daysLeft <= 3 ? 'proximo' : 'en_plazo';
  return Object.freeze({ due: new Date(dueMs).toISOString().slice(0, 10), daysLeft, state });
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
