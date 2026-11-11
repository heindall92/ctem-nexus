/* Cumplimiento de SLA (sin DOM): por banda, por responsable y envejecimiento de lo abierto.
 * Cuenta los abiertos o validados y los mitigados con fecha de cierre. Fuera quedan los no explotables y los aceptados
 * (tienen su propio control por caducidad). Incumplido = cerrado tarde o abierto con el plazo vencido. */
import { isActive } from './engine';
import { slaInfo } from './sla';
import type { Asset, Band, EngineResult, Finding } from './types';

export interface SlaBucket {
  total: number;
  closedOnTime: number;
  closedLate: number;
  openInTime: number;
  openOverdue: number;
  /** 0–1 o null si no hay nada que medir. */
  compliance: number | null;
}

export interface SlaCompliance {
  overall: SlaBucket;
  byBand: Record<Band, SlaBucket>;
  /** Por responsable del activo, de peor a mejor cumplimiento. */
  byOwner: Array<{ owner: string; bucket: SlaBucket }>;
  /** Hallazgos abiertos por antigüedad desde la detección. */
  aging: { d0_7: number; d8_30: number; d31_90: number; d90: number };
  /** Abiertos vencidos, del más atrasado al menos. */
  overdueList: Array<{ id: string; daysOver: number; owner: string; band: Band }>;
}

const empty = (): SlaBucket => ({ total: 0, closedOnTime: 0, closedLate: 0, openInTime: 0, openOverdue: 0, compliance: null });
const close = (b: SlaBucket) => { b.compliance = b.total ? Math.round(((b.closedOnTime + b.openInTime) / b.total) * 1000) / 1000 : null; return b; };
// Día UTC (ms) de una fecha AAAA-MM-DD, guardado: con 50.000 hallazgos, crear dos Date por hallazgo pesaba.
const DIA = 86_400_000;
const dias = new Map<string, number>();
const dia = (iso: string): number => {
  const k = iso.slice(0, 10);
  let v = dias.get(k);
  if (v === undefined) { if (dias.size > 20_000) dias.clear(); v = Date.parse(`${k}T00:00:00Z`); dias.set(k, v); }
  return v;
};
/** Días enteros entre dos fechas (igual que daysBetween con fechas a medianoche UTC). */
const entre = (a: number, b: number) => Math.round((b - a) / DIA);

export const NO_OWNER = '—';

export function slaCompliance(findings: Finding[], assets: Asset[], result: EngineResult, today: Date = new Date()): SlaCompliance {
  const sc = new Map(result.scored.map((s) => [s.id, s]));
  const owner = new Map(assets.map((a) => [a.id, a.owner?.trim() || NO_OWNER]));
  const overall = empty();
  const byBand: Record<Band, SlaBucket> = { critica: empty(), alta: empty(), media: empty(), baja: empty() };
  const byOwner = new Map<string, SlaBucket>();
  const aging = { d0_7: 0, d8_30: 0, d31_90: 0, d90: 0 };
  const overdueList: SlaCompliance['overdueList'] = [];
  const hoyUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  for (const f of findings) {
    const s = sc.get(f.id);
    if (!s || !f.detectedAt) continue;
    const closed = f.status === 'mitigado' && !!f.resolvedAt;
    if (!closed && !isActive(f)) continue;
    const who = owner.get(f.assetId) ?? NO_OWNER;
    const bucket = byOwner.get(who) ?? empty();
    byOwner.set(who, bucket);
    const targets = [overall, byBand[s.band], bucket];
    if (closed) {
      const late = entre(dia(f.detectedAt), dia(f.resolvedAt!)) > s.slaDays;
      for (const b of targets) { b.total++; if (late) b.closedLate++; else b.closedOnTime++; }
    } else {
      const info = slaInfo(f.detectedAt, s.slaDays, today);
      const over = info.state === 'vencido';
      for (const b of targets) { b.total++; if (over) b.openOverdue++; else b.openInTime++; }
      if (over) overdueList.push({ id: f.id, daysOver: -info.daysLeft, owner: who, band: s.band });
      const age = entre(dia(f.detectedAt), hoyUtc);
      if (age <= 7) aging.d0_7++; else if (age <= 30) aging.d8_30++; else if (age <= 90) aging.d31_90++; else aging.d90++;
    }
  }
  close(overall);
  for (const b of Object.values(byBand)) close(b);
  const owners = [...byOwner.entries()].map(([o, b]) => ({ owner: o, bucket: close(b) }))
    .sort((a, b) => (a.bucket.compliance ?? 1) - (b.bucket.compliance ?? 1) || b.bucket.openOverdue - a.bucket.openOverdue || a.owner.localeCompare(b.owner));
  overdueList.sort((a, b) => b.daysOver - a.daysOver);
  return { overall, byBand, byOwner: owners, aging, overdueList };
}
