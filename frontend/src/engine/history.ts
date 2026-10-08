/* Instantáneas de cierre de ciclo y tendencia entre ciclos (sin DOM). */
import { isActive } from './engine';
import type { Snapshot } from './io';
import { slaInfo } from './sla';
import type { EngineResult, Finding, ProfileId } from './types';

export function snapshotOf(result: EngineResult, findings: Finding[], profile: ProfileId, today: Date, label = ''): Snapshot {
  const fById = new Map(findings.map((f) => [f.id, f]));
  const overdue = result.scored.filter((s) => {
    const f = fById.get(s.id);
    return f && isActive(f) && slaInfo(f.detectedAt, s.slaDays, today).state === 'vencido';
  }).length;
  const s = result.summary;
  return {
    at: today.toISOString().slice(0, 10),
    label: label.trim().slice(0, 80),
    profile,
    exposureIndex: s.exposureIndex,
    open: s.openFindings,
    byBand: { ...s.byBand },
    kev: s.kevOpen,
    attackPaths: s.attackPaths,
    accepted: s.accepted,
    overdue,
    mttrDays: s.mttrDays,
  };
}

export interface Trend {
  from: Snapshot;
  to: Snapshot;
  /** Diferencias (to − from). Negativo = mejora en todo salvo MTTR, donde también es mejora. */
  exposureIndex: number;
  open: number;
  critical: number;
  kev: number;
  attackPaths: number;
  overdue: number;
  mttrDays: number | null;
  /** Cambió el perfil entre los dos ciclos: el índice no es del todo comparable. */
  profileChanged: boolean;
}

export function trendOf(snaps: Snapshot[]): Trend | null {
  if (snaps.length < 2) return null;
  const from = snaps[snaps.length - 2];
  const to = snaps[snaps.length - 1];
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    from, to,
    exposureIndex: r1(to.exposureIndex - from.exposureIndex),
    open: to.open - from.open,
    critical: to.byBand.critica - from.byBand.critica,
    kev: to.kev - from.kev,
    attackPaths: to.attackPaths - from.attackPaths,
    overdue: to.overdue - from.overdue,
    mttrDays: to.mttrDays === null || from.mttrDays === null ? null : r1(to.mttrDays - from.mttrDays),
    profileChanged: to.profile !== from.profile,
  };
}
