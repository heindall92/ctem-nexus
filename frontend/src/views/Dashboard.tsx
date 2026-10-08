import { ArrowRight, ChevronRight, Crosshair, FileJson, ListChecks, Radar, Route, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { slaInfo } from '../engine/sla';
import type { Band } from '../engine/types';
import { TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty } from '../components/ui';
import { screen } from '../i18n';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, n1 } from '../lib/format';
import { useStore, type View } from '../store/store';

type StageState = 'hecho' | 'en_curso' | 'pendiente';
const BANDS: Band[] = ['critica', 'alta', 'media', 'baja'];

export function Dashboard() {
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const stageLabel: Record<StageState, string> = { hecho: c.stageDone, en_curso: c.stageDoing, pendiente: c.stageTodo };
  const project = useStore((s) => s.project);
  const setView = useStore((s) => s.setView);
  const selectFinding = useStore((s) => s.selectFinding);
  const loadDemo = useStore((s) => s.loadDemo);
  const notify = useStore((s) => s.notify);
  const { result } = useResult();
  const s = result.summary;
  const { assets, findings } = project;
  const fById = new Map(findings.map((f) => [f.id, f]));
  const aById = new Map(assets.map((a) => [a.id, a]));
  const crown = assets.filter((a) => a.criticality === 5).length;
  const overdue = result.scored.filter((x) => {
    const f = fById.get(x.id);
    return f && (f.status === 'abierto' || f.status === 'validado') && slaInfo(f.detectedAt, x.slaDays).state === 'vencido';
  }).length;

  if (assets.length === 0 && findings.length === 0) {
    return (
      <>
        <TopBar title={c.panelTitle} subtitle={c.panelEmptySub} />
        <div className="view-enter mx-auto max-w-[1240px] px-8 pb-8 pt-2">
          <div className="panel">
            <Empty icon={<Sparkles />} title={c.emptyTitle} text={c.emptyText}>
              <button type="button" className="btn btn-primary" onClick={() => { loadDemo(); notify(c.demoLoaded); }}><Sparkles />{c.loadDemo}</button>
              <button type="button" className="btn" onClick={() => setView('alcance')}><Crosshair />{c.defineScope}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setView('ajustes')}><FileJson />{c.importProject}</button>
            </Empty>
          </div>
        </div>
      </>
    );
  }

  // Estado de cada fase del ciclo CTEM, derivado de los datos.
  const onPathActive = result.scored.filter((x) => { const f = fById.get(x.id)!; return x.onAttackPath && (x.band === 'critica' || x.band === 'alta') && f.status !== 'mitigado'; });
  const validatedOnPath = onPathActive.filter((x) => { const st = fById.get(x.id)!.status; return st === 'validado' || st === 'no_explotable'; }).length;
  const mitigated = findings.filter((f) => f.status === 'mitigado').length;
  const stages: Array<{ name: string; detail: string; state: StageState; view: View }> = [
    { name: c.scope, view: 'alcance', detail: c.assetsJewels(assets.length, crown), state: assets.length === 0 ? 'pendiente' : crown > 0 ? 'hecho' : 'en_curso' },
    { name: c.discovery, view: 'priorizacion', detail: c.findings(findings.length), state: findings.length ? 'hecho' : 'pendiente' },
    { name: c.prioritize, view: 'priorizacion', detail: c.critHigh(s.byBand.critica, s.byBand.alta), state: findings.length ? 'hecho' : 'pendiente' },
    { name: c.validation, view: 'rutas', detail: c.validated(validatedOnPath, onPathActive.length), state: onPathActive.length === 0 ? (findings.length ? 'hecho' : 'pendiente') : validatedOnPath === onPathActive.length ? 'hecho' : validatedOnPath > 0 ? 'en_curso' : 'pendiente' },
    { name: c.mobilize, view: 'movilizacion', detail: c.mitigated(mitigated, findings.length), state: findings.length === 0 ? 'pendiente' : s.openFindings === 0 ? 'hecho' : mitigated > 0 ? 'en_curso' : 'pendiente' },
  ];

  const top = result.scored.filter((x) => { const st = fById.get(x.id)?.status; return st === 'abierto' || st === 'validado'; }).slice(0, 5);
  const bandOfIndex: Band = s.exposureIndex >= 80 ? 'critica' : s.exposureIndex >= 60 ? 'alta' : s.exposureIndex >= 40 ? 'media' : 'baja';
  const total = Math.max(1, s.openFindings);

  return (
    <>
      <TopBar
        title={c.panelTitle}
        subtitle={<><span className="truncate">{project.name}</span>{project.demo && <DemoBadge />}</>}
      />
      <div className="view-enter mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-8">
        {/* Índice de exposición + indicadores, en un único panel con divisiones finas */}
        <section className="panel grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]" aria-label="Indicadores principales">
          <div className="flex flex-col justify-between gap-6 p-6">
            <div>
              <div className="label">{c.exposure}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-num text-[3.5rem] leading-none" style={{ color: BAND_COLOR[bandOfIndex] }}>{n1(s.exposureIndex)}</span>
                <span className="num text-ink-3">/100</span>
              </div>
              <p className="mt-2 max-w-[38ch] text-[0.8125rem] text-ink-3">
                {c.exposureLead} <span style={{ color: BAND_COLOR[bandOfIndex] }}>{c.band[bandOfIndex].toLowerCase()}</span>: {c.exposureTail}
              </p>
            </div>
            <div>
              <div className="flex h-2 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={BANDS.map((b) => `${c.band[b]}: ${s.byBand[b]}`).join(', ')}>
                {BANDS.filter((b) => s.byBand[b] > 0).map((b) => (
                  <div key={b} style={{ flexGrow: s.byBand[b] / total, background: BAND_COLOR[b] }} />
                ))}
                {s.openFindings === 0 && <div className="flex-1 bg-surface-3" />}
              </div>
              <ul className="mt-3 grid grid-cols-4 gap-2">
                {BANDS.map((b) => (
                  <li key={b} className="flex flex-col">
                    <span className="display-num text-lg leading-tight">{s.byBand[b]}</span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-3"><span className="size-1.5 rounded-full" style={{ background: BAND_COLOR[b] }} />{c.band[b]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-hairline sm:grid-cols-3 lg:border-l lg:border-t-0">
            <Kpi label={c.openFindings} value={s.openFindings} note={overdue ? c.overdueNote(overdue) : c.registered(findings.length)} tone={overdue ? 'var(--color-critica)' : undefined} />
            <Kpi label={c.kev} value={s.kevOpen} note={c.kevNote} tone={s.kevOpen ? 'var(--color-critica)' : undefined} />
            <Kpi label={c.assetsAtRisk} value={s.assetsAtRisk} note={c.ofAssets(assets.length)} />
            <Kpi label={c.paths} value={s.attackPaths} note={c.pathsNote} />
            <Kpi label={c.chokes} value={s.chokePoints} note={c.chokesNote} tone={s.chokePoints ? 'var(--color-alta)' : undefined} />
            <Kpi label={c.mttr} value={s.mttrDays === null ? '—' : n1(s.mttrDays)} unit={s.mttrDays === null ? undefined : c.days} note={c.mttrNote} />
          </div>
        </section>

        {/* Ciclo CTEM */}
        <section className="panel p-5" aria-label="Ciclo CTEM">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="title-md">{c.cycle}</h2>
            <span className="text-xs text-ink-3">{c.cycleNote}</span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
          <ol className="grid w-max grid-cols-5 gap-3 lg:w-auto">
            {stages.map((st, i) => (
              <li key={st.name} className="relative">
                {i < stages.length - 1 && <span aria-hidden className="absolute left-[calc(1.25rem+6px)] right-[-0.75rem] top-[0.6875rem] h-px" style={{ background: st.state === 'hecho' ? 'color-mix(in oklab, var(--color-accent) 50%, transparent)' : 'var(--color-hairline-strong)' }} />}
                <button type="button" onClick={() => setView(st.view)} className="group relative flex w-36 flex-col items-start gap-2 rounded-xl text-left transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100 lg:w-full">
                  <StageDot state={st.state} index={i + 1} />
                  <div>
                    <div className="text-[0.8125rem] font-semibold">{st.name}</div>
                    <div className="text-xs text-ink-3">{st.detail}</div>
                    <div className="mt-1 text-[0.6875rem] font-medium" style={{ color: st.state === 'hecho' ? 'var(--color-accent)' : st.state === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-3)' }}>{stageLabel[st.state]}</div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Módulos */}
          <section className="panel overflow-hidden" aria-label="Módulos">
            <h2 className="title-md px-5 pb-2 pt-4">{c.modules}</h2>
            <ul className="divide-hair">
              <ModuleRow icon={<Crosshair />} title={c.modScope} statusLabel={stageLabel[stages[0].state]} status={stages[0].state} metric={c.modScopeMetric(assets.length, project.ranges.filter((r) => r.inScope).length)} onClick={() => setView('alcance')} />
              <ModuleRow icon={<Radar />} title={c.modDisc} statusLabel={stageLabel[stages[2].state]} status={stages[2].state} metric={c.modDiscMetric(s.openFindings, s.byBand.critica, s.kevOpen)} onClick={() => setView('priorizacion')} />
              <ModuleRow icon={<Route />} title={c.modPaths} statusLabel={stageLabel[stages[3].state]} status={stages[3].state} metric={c.modPathsMetric(s.attackPaths, s.chokePoints)} onClick={() => setView('rutas')} />
              <ModuleRow icon={<ListChecks />} title={c.modMob} statusLabel={stageLabel[stages[4].state]} status={stages[4].state} metric={c.modMobMetric(s.openFindings)} onClick={() => setView('movilizacion')} />
            </ul>
          </section>

          {/* Riesgos principales */}
          <section className="panel overflow-hidden" aria-label="Riesgos principales">
            <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
              <h2 className="title-md">{c.topRisks}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('priorizacion')}>{c.seeAll}<ArrowRight /></button>
            </div>
            <ul className="divide-hair">
              {top.map((x) => {
                const f = fById.get(x.id)!;
                return (
                  <li key={x.id}>
                    <button type="button" className="row-interactive flex w-full items-center gap-4 px-5 py-3 text-left" onClick={() => { setView('priorizacion'); selectFinding(x.id); }}>
                      <span className="num w-10 text-[0.9375rem] font-semibold" style={{ color: BAND_COLOR[x.band] }}>{n1(x.score)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{f.title}</span>
                        <span className="block truncate text-xs text-ink-3"><span className="num">{f.cve ?? f.id}</span> · {aById.get(f.assetId)?.name ?? f.assetId}</span>
                      </span>
                      {f.kev && <span className="chip" style={{ color: 'var(--color-critica)' }}>KEV</span>}
                      <BandBadge band={x.band} />
                    </button>
                  </li>
                );
              })}
              {top.length === 0 && <li className="px-5 py-6 text-ink-3">{c.noOpen}</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, unit, note, tone }: { label: string; value: number | string; unit?: string; note: string; tone?: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 border-hairline p-5 [&:not(:nth-child(-n+3))]:border-t [&:not(:nth-child(3n+1))]:border-l max-sm:[&:nth-child(n)]:border-l-0">
      <div className="label">{label}</div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="display-num text-[1.75rem] leading-none" style={tone ? { color: tone } : undefined}>{value}</span>
          {unit && <span className="text-xs text-ink-3">{unit}</span>}
        </div>
        <div className="mt-1.5 text-xs text-ink-3">{note}</div>
      </div>
    </div>
  );
}

function StageDot({ state, index }: { state: StageState; index: number }) {
  const color = state === 'hecho' ? 'var(--color-accent)' : state === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-3)';
  return (
    <span className="num relative z-[1] grid size-[1.375rem] place-items-center rounded-full bg-surface text-[0.6875rem] font-semibold" style={{ color, boxShadow: `inset 0 0 0 1.5px ${color}` }}>
      {index}
    </span>
  );
}

function ModuleRow({ icon, title, metric, status, statusLabel, onClick }: { icon: ReactNode; title: string; metric: string; status: StageState; statusLabel: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="row-interactive flex w-full items-center gap-4 px-5 py-3.5 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-accent [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-xs text-ink-3">{metric}</span>
        </span>
        <span className="text-[0.6875rem] font-medium" style={{ color: status === 'hecho' ? 'var(--color-accent)' : status === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-3)' }}>{statusLabel}</span>
        <ChevronRight className="size-4 text-ink-3" />
      </button>
    </li>
  );
}
