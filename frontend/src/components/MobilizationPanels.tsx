/* Paneles de Movilización: cumplimiento de SLA y ciclos con tendencia. */
import { CalendarCheck2, Gauge, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NO_OWNER, slaCompliance, type SlaBucket } from '../engine/compliance';
import { snapshotOf, trendOf } from '../engine/history';
import { retestStats } from '../engine/retest';
import type { Band } from '../engine/types';
import { screen, useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, BAND_FILL, n1 } from '../lib/format';
import { useStore } from '../store/store';
import { SectionTitle } from './ui';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)} %`);
const tone = (x: number | null) => (x === null ? 'var(--color-ink-3)' : x >= 0.9 ? 'var(--color-ok)' : x >= 0.7 ? 'var(--color-media)' : 'var(--color-critica)');

/** Barra segmentada: cerrados a tiempo, abiertos en plazo, abiertos vencidos y cerrados tarde. */
function SlaBar({ b }: { b: SlaBucket }) {
  if (!b.total) return <div className="h-2 rounded-full bg-surface-2" aria-hidden />;
  const seg = [
    [b.closedOnTime, 'var(--color-ok)'],
    [b.openInTime, 'color-mix(in oklab, var(--color-ok) 40%, var(--color-surface-3))'],
    [b.openOverdue, 'var(--color-critica)'],
    [b.closedLate, 'color-mix(in oklab, var(--color-critica) 45%, var(--color-surface-3))'],
  ] as const;
  return (
    <div className="flex h-2 gap-px overflow-hidden rounded-full" aria-hidden>
      {seg.filter(([n]) => n > 0).map(([n, c], i) => <span key={i} style={{ flexGrow: n, background: c }} />)}
    </div>
  );
}

export function SlaPanel() {
  const L = useL();
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const project = useStore((s) => s.project);
  const { result } = useResult();
  const k = useMemo(() => slaCompliance(project.findings, project.assets, result), [project.findings, project.assets, result]);
  const o = k.overall;
  const bands: Band[] = ['critica', 'alta', 'media', 'baja'];
  return (
    <section className="panel no-print overflow-hidden" aria-label={L('Cumplimiento de SLA', 'SLA compliance')} data-testid="panel-sla">
      <SectionTitle title={L('Cumplimiento de SLA', 'SLA compliance')} detail={L('Cumple lo cerrado dentro de plazo y lo abierto que aún no ha vencido. Los aceptados y los no explotables no cuentan.', 'Compliant: closed within the SLA, or open and not yet overdue. Accepted and not-exploitable findings do not count.')} />
      <div className="grid grid-cols-1 gap-6 border-t border-hairline px-5 py-5 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="label">{L('Cumplimiento global', 'Overall compliance')}</span>
          <span className="display-num text-[2.75rem] leading-none" style={{ color: tone(o.compliance) }} data-testid="sla-global">{pct(o.compliance)}</span>
          <span className="text-xs text-ink-3">{L(`${o.closedOnTime + o.openInTime} de ${o.total} en plazo · ${o.openOverdue} abiertos vencidos · ${o.closedLate} cerrados tarde`, `${o.closedOnTime + o.openInTime} of ${o.total} within SLA · ${o.openOverdue} open overdue · ${o.closedLate} closed late`)}</span>
          <dl className="mt-2 grid grid-cols-4 gap-1 text-center" aria-label={L('Antigüedad de lo abierto', 'Age of open findings')}>
            {[['≤7 d', k.aging.d0_7], ['8–30', k.aging.d8_30], ['31–90', k.aging.d31_90], ['>90', k.aging.d90]].map(([lbl, n]) => (
              <div key={lbl} className="flex flex-col-reverse rounded-lg bg-ground px-1 py-1.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
                <dt className="text-[0.625rem] text-ink-3">{lbl}</dt>
                <dd className="num text-[0.9375rem] font-semibold" style={{ color: lbl === '>90' && Number(n) > 0 ? 'var(--color-critica)' : undefined }}>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="label mb-2.5 font-medium">{L('Por prioridad', 'By priority')}</h3>
          <ul className="flex flex-col gap-3">
            {bands.map((band) => {
              const b = k.byBand[band];
              return (
                <li key={band} className="text-[0.8125rem]">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: BAND_COLOR[band] }} />{c.band[band]}</span>
                    <span className="num font-semibold" style={{ color: tone(b.compliance) }}>{pct(b.compliance)}<span className="ml-1.5 text-xs font-normal text-ink-3">{b.total ? `${b.openOverdue + b.closedLate}/${b.total} ${L('fuera', 'missed')}` : L('sin datos', 'no data')}</span></span>
                  </div>
                  <SlaBar b={b} />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-ink-3">
            <span className="flex items-center gap-1"><span aria-hidden className="size-2 rounded-sm" style={{ background: 'var(--color-ok)' }} />{L('cerrado a tiempo', 'closed on time')}</span>
            <span className="flex items-center gap-1"><span aria-hidden className="size-2 rounded-sm" style={{ background: 'color-mix(in oklab, var(--color-ok) 40%, var(--color-surface-3))' }} />{L('abierto en plazo', 'open, in time')}</span>
            <span className="flex items-center gap-1"><span aria-hidden className="size-2 rounded-sm" style={{ background: 'var(--color-critica)' }} />{L('abierto vencido', 'open, overdue')}</span>
            <span className="flex items-center gap-1"><span aria-hidden className="size-2 rounded-sm" style={{ background: 'color-mix(in oklab, var(--color-critica) 45%, var(--color-surface-3))' }} />{L('cerrado tarde', 'closed late')}</span>
          </p>
        </div>
        <div>
          <h3 className="label mb-2.5 font-medium">{L('Por responsable del activo', 'By asset owner')}</h3>
          <ul className="flex flex-col gap-3" data-testid="sla-responsables">
            {k.byOwner.slice(0, 6).map(({ owner, bucket }) => (
              <li key={owner} className="text-[0.8125rem]">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">{owner === NO_OWNER ? L('Sin responsable', 'No owner') : owner}</span>
                  <span className="num shrink-0 font-semibold" style={{ color: tone(bucket.compliance) }}>{pct(bucket.compliance)}<span className="ml-1.5 text-xs font-normal text-ink-3">{bucket.openOverdue ? L(`${bucket.openOverdue} vencidos`, `${bucket.openOverdue} overdue`) : `${bucket.total}`}</span></span>
                </div>
                <SlaBar b={bucket} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function CyclesPanel() {
  const L = useL();
  const project = useStore((s) => s.project);
  const addSnapshot = useStore((s) => s.addSnapshot);
  const deleteSnapshot = useStore((s) => s.deleteSnapshot);
  const notify = useStore((s) => s.notify);
  const { result } = useResult();
  const [label, setLabel] = useState('');
  const snaps = project.snapshots ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const current = snapshotOf(result, project.findings, project.profile ?? 'defecto', new Date(), '');
  const lastClose = [...snaps].reverse().find((x) => x.at !== today) ?? null;
  const trend = lastClose ? trendOf([lastClose, current]) : null;
  const series = [...snaps.filter((s) => s.at !== today).slice(-11), { ...current, label: L('ahora', 'now') }];
  const maxOpen = Math.max(1, ...series.map((s) => s.open));
  const sign = (d: number, dec = false, better: 'down' | 'up' = 'down') => ({ text: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${dec ? n1(Math.abs(d)) : Math.abs(d)}`, color: d === 0 ? 'var(--color-ink-3)' : (d < 0) === (better === 'down') ? 'var(--color-ok)' : 'var(--color-critica)' });
  const bands: Band[] = ['baja', 'media', 'alta', 'critica'];

  return (
    <section className="panel no-print overflow-hidden" aria-label={L('Ciclos y tendencia', 'Cycles and trend')} data-testid="panel-ciclos">
      <SectionTitle
        title={L('Ciclos y tendencia', 'Cycles and trend')}
        detail={L('Cierra cada ciclo CTEM con una instantánea. El informe se compara con el último cierre.', 'Close each CTEM cycle with a snapshot. The report is compared with the latest close.')}
        actions={
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
            e.preventDefault();
            addSnapshot(snapshotOf(result, project.findings, project.profile ?? 'defecto', new Date(), label || L(`Ciclo ${snaps.filter((s) => s.at !== today).length + 1}`, `Cycle ${snaps.filter((s) => s.at !== today).length + 1}`)));
            notify(L(`Ciclo cerrado el ${today}.`, `Cycle closed on ${today}.`)); setLabel('');
          }}>
            <input className="field h-8 w-44 text-[0.8125rem]" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={L('Nombre (opcional)', 'Name (optional)')} aria-label={L('Nombre del ciclo', 'Cycle name')} maxLength={80} />
            <button type="submit" className="btn btn-sm"><CalendarCheck2 />{snaps.some((s) => s.at === today) ? L('Actualizar el cierre de hoy', 'Update today’s close') : L('Cerrar ciclo', 'Close cycle')}</button>
          </form>
        }
      />
      <div className="grid grid-cols-1 gap-6 border-t border-hairline px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Columnas apiladas por banda: hallazgos abiertos al cierre de cada ciclo, con el índice encima */}
        <div>
          <div role="img" aria-label={L(`Hallazgos abiertos por ciclo: ${series.map((s) => `${s.at} ${s.open}`).join(', ')}`, `Open findings per cycle: ${series.map((s) => `${s.at} ${s.open}`).join(', ')}`)} className="flex h-40 items-end gap-2" data-testid="columnas-ciclos">
            {series.map((s, i) => (
              <div key={`${s.at}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="num text-[0.625rem] text-ink-3"><Gauge className="mr-0.5 inline size-2.5" aria-hidden />{n1(s.exposureIndex)}</span>
                <div className="flex w-full max-w-[3rem] flex-col-reverse overflow-hidden rounded-t-[6px]" style={{ height: `${Math.max(3, (s.open / maxOpen) * 112)}px`, opacity: i === series.length - 1 ? 1 : 0.85, outline: i === series.length - 1 ? '1.5px dashed var(--color-hairline-strong)' : undefined, outlineOffset: 2 }}>
                  {bands.map((b) => s.byBand[b] > 0 && <span key={b} style={{ flexGrow: s.byBand[b], background: BAND_FILL[b] }} />)}
                </div>
                <span className="num w-full truncate text-center text-[0.625rem] text-ink-3" title={s.label}>{i === series.length - 1 ? L('ahora', 'now') : s.at.slice(5)}</span>
              </div>
            ))}
          </div>
          {snaps.length === 0 && <p className="mt-3 text-xs text-ink-3">{L('Aún no hay ciclos cerrados: la columna «ahora» es el estado actual.', 'No closed cycles yet: the “now” column is the current state.')}</p>}
        </div>
        <div className="flex flex-col gap-3">
          {trend ? (
            <>
              <p className="text-[0.8125rem] text-ink-2">{L(`Desde el cierre del ${trend.from.at}${trend.from.label ? ` (${trend.from.label})` : ''} hasta hoy`, `From the ${trend.from.at} close${trend.from.label ? ` (${trend.from.label})` : ''} to today`)}{trend.profileChanged && <span className="text-alta"> · {L('cambió el perfil', 'profile changed')}</span>}</p>
              <dl className="grid grid-cols-3 gap-2 text-center" data-testid="tendencia">
                {([
                  [L('Índice', 'Index'), trend.exposureIndex],
                  [L('Abiertos', 'Open'), trend.open],
                  [L('Críticos', 'Critical'), trend.critical],
                  ['KEV', trend.kev],
                  [L('Rutas', 'Paths'), trend.attackPaths],
                  [L('Vencidos', 'Overdue'), trend.overdue],
                ] as Array<[string, number]>).map(([lbl, d], i) => {
                  const v = sign(d, i === 0);
                  return <div key={lbl} className="flex flex-col-reverse rounded-lg bg-ground px-2 py-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]"><dt className="text-[0.6875rem] text-ink-3">{lbl}</dt><dd className="num text-[1rem] font-semibold" style={{ color: v.color }}>{v.text}</dd></div>;
                })}
              </dl>
            </>
          ) : <p className="text-[0.8125rem] text-ink-3">{L('Cierra un ciclo y aquí verás cómo evoluciona desde entonces.', 'Close a cycle and you will see how things evolve from then on.')}</p>}
          {snaps.length > 0 && (
            <ul className="divide-hair rounded-xl text-xs shadow-[inset_0_0_0_1px_var(--color-hairline)]" data-testid="lista-ciclos">
              {[...snaps].reverse().slice(0, 6).map((s) => (
                <li key={s.at} className="flex items-center gap-3 px-3 py-2">
                  <span className="num text-ink-3">{s.at}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.label || '—'}</span>
                  <span className="num text-ink-2">{n1(s.exposureIndex)} · {s.open}</span>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={L(`Borrar el cierre del ${s.at}`, `Delete the ${s.at} close`)} onClick={() => deleteSnapshot(s.at)}><Trash2 /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Validación ofensiva y verificación de las correcciones (retest). */
export function RetestPanel() {
  const L = useL();
  const project = useStore((s) => s.project);
  const confirm = useStore((s) => s.confirmRetest);
  const notify = useStore((s) => s.notify);
  const setView = useStore((s) => s.setView);
  const select = useStore((s) => s.selectFinding);
  const author = useStore((s) => s.settings.profile?.nombre?.trim() || '');
  const st = useMemo(() => retestStats(project.findings, project.imports ?? []), [project.findings, project.imports]);
  const validated = project.findings.filter((f) => f.validation);
  const exploited = validated.filter((f) => f.validation!.result === 'explotado').length;
  const fById = new Map(project.findings.map((f) => [f.id, f]));
  const aName = new Map(project.assets.map((a) => [a.id, a.name]));
  const tiles: Array<[string, string, string | undefined]> = [
    [L('Pendientes de verificar', 'Pending verification'), String(st.pending), st.pending ? 'var(--color-media)' : undefined],
    [L('Verificadas', 'Verified'), String(st.verified), st.verified ? 'var(--color-ok)' : undefined],
    [L('Reabiertas', 'Reopened'), String(st.reopened), st.reopened ? 'var(--color-critica)' : undefined],
    [L('Tasa de reapertura', 'Reopen rate'), pct(st.reopenRate), st.reopenRate !== null && st.reopenRate > 0.1 ? 'var(--color-critica)' : undefined],
  ];
  return (
    <section className="panel no-print overflow-hidden" aria-label={L('Validación y verificación', 'Validation and verification')} data-testid="panel-retest">
      <SectionTitle title={L('Validación y verificación', 'Validation and verification')} detail={L(`Un mitigado queda pendiente hasta que un escaneo de la misma herramienta deja de verlo o lo confirmas. ${validated.length} hallazgos con validación ofensiva registrada (${exploited} explotados).`, `A mitigated finding stays pending until a scan by the same tool no longer sees it or you confirm it. ${validated.length} findings with recorded offensive validation (${exploited} exploited).`)} />
      <div className="flex flex-col gap-4 border-t border-hairline px-5 py-5">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(([label, value, color]) => (
            <div key={label} className="flex flex-col-reverse rounded-xl bg-ground px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              <dt className="text-xs text-ink-3">{label}</dt>
              <dd className="num text-[1.375rem] font-semibold leading-tight" style={{ color }}>{value}</dd>
            </div>
          ))}
        </dl>
        {st.pendingList.length > 0 ? (
          <ul className="divide-hair rounded-xl text-[0.8125rem] shadow-[inset_0_0_0_1px_var(--color-hairline)]" data-testid="retest-pendientes">
            {st.pendingList.slice(0, 8).map(({ id, since }) => {
              const f = fById.get(id)!;
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <button type="button" className="min-w-0 flex-1 text-left hover:text-accent" onClick={() => { setView('priorizacion'); select(id); }}>
                    <span className="num text-ink-3">{id}</span> {f.title} <span className="text-ink-3">· {aName.get(f.assetId) ?? f.assetId} · {L(`desde el ${since}`, `since ${since}`)}</span>
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => { confirm(id, author ? L(`analista (${author})`, `analyst (${author})`) : L('analista', 'analyst')); notify(L(`${id}: corrección verificada.`, `${id}: fix verified.`)); }} aria-label={L(`Confirmar la verificación de ${id}`, `Confirm verification of ${id}`)}><CalendarCheck2 />{L('Confirmar', 'Confirm')}</button>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-[0.8125rem] text-ink-3">{L('No hay correcciones pendientes de verificar.', 'No fixes pending verification.')}</p>}
      </div>
    </section>
  );
}
