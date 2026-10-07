import { ArrowRight, ChevronRight, Crosshair, FileJson, ListChecks, Radar, Route, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { BAND_LABEL } from '../engine/constants';
import type { Band } from '../engine/types';
import { TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty } from '../components/ui';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, n1, plural } from '../lib/format';
import { useStore, type View } from '../store/store';

type StageState = 'hecho' | 'en_curso' | 'pendiente';
const STAGE_LABEL: Record<StageState, string> = { hecho: 'Completada', en_curso: 'En curso', pendiente: 'Pendiente' };
const BANDS: Band[] = ['critica', 'alta', 'media', 'baja'];

export function Dashboard() {
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

  if (assets.length === 0 && findings.length === 0) {
    return (
      <>
        <TopBar title="Panel de exposición" subtitle="Empieza definiendo el alcance o carga el conjunto de ejemplo." />
        <div className="view-enter mx-auto max-w-[1240px] px-8 py-8">
          <div className="panel">
            <Empty icon={<Sparkles />} title="Todavía no hay datos" text="CTEM-Nexus calcula la prioridad de cada hallazgo y las rutas de ataque hacia tus activos críticos. Todo se procesa en este navegador.">
              <button type="button" className="btn btn-primary" onClick={() => { loadDemo(); notify('Datos de ejemplo cargados: 8 activos y 20 hallazgos.'); }}><Sparkles />Cargar datos de demo</button>
              <button type="button" className="btn" onClick={() => setView('alcance')}><Crosshair />Definir el alcance</button>
              <button type="button" className="btn btn-ghost" onClick={() => setView('ajustes')}><FileJson />Importar proyecto</button>
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
    { name: 'Alcance', view: 'alcance', detail: `${plural(assets.length, 'activo', 'activos')} · ${plural(crown, 'joya', 'joyas')}`, state: assets.length === 0 ? 'pendiente' : crown > 0 ? 'hecho' : 'en_curso' },
    { name: 'Descubrimiento', view: 'priorizacion', detail: plural(findings.length, 'hallazgo', 'hallazgos'), state: findings.length ? 'hecho' : 'pendiente' },
    { name: 'Priorización', view: 'priorizacion', detail: `${s.byBand.critica} críticos · ${s.byBand.alta} altos`, state: findings.length ? 'hecho' : 'pendiente' },
    { name: 'Validación', view: 'rutas', detail: `${validatedOnPath}/${onPathActive.length} en rutas validados`, state: onPathActive.length === 0 ? (findings.length ? 'hecho' : 'pendiente') : validatedOnPath === onPathActive.length ? 'hecho' : validatedOnPath > 0 ? 'en_curso' : 'pendiente' },
    { name: 'Movilización', view: 'movilizacion', detail: `${mitigated}/${findings.length} mitigados`, state: findings.length === 0 ? 'pendiente' : s.openFindings === 0 ? 'hecho' : mitigated > 0 ? 'en_curso' : 'pendiente' },
  ];

  const top = result.scored.filter((x) => { const st = fById.get(x.id)?.status; return st === 'abierto' || st === 'validado'; }).slice(0, 5);
  const bandOfIndex: Band = s.exposureIndex >= 80 ? 'critica' : s.exposureIndex >= 60 ? 'alta' : s.exposureIndex >= 40 ? 'media' : 'baja';
  const total = Math.max(1, s.openFindings);

  return (
    <>
      <TopBar
        title="Panel de exposición"
        subtitle={<><span className="truncate">{project.name}</span>{project.demo && <DemoBadge />}</>}
      />
      <div className="view-enter mx-auto flex max-w-[1240px] flex-col gap-5 px-8 py-7">
        {/* Índice de exposición + indicadores, en un único panel con divisiones finas */}
        <section className="panel grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]" aria-label="Indicadores principales">
          <div className="flex flex-col justify-between gap-6 p-6">
            <div>
              <div className="label">Índice de exposición</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-num text-[3.5rem] leading-none" style={{ color: BAND_COLOR[bandOfIndex] }}>{n1(s.exposureIndex)}</span>
                <span className="num text-ink-3">/100</span>
              </div>
              <p className="mt-2 max-w-[38ch] text-[0.8125rem] text-ink-3">
                Exposición <span style={{ color: BAND_COLOR[bandOfIndex] }}>{BAND_LABEL[bandOfIndex].toLowerCase()}</span>: media entre el peor hallazgo abierto y la media de los cinco peores.
              </p>
            </div>
            <div>
              <div className="flex h-2 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={BANDS.map((b) => `${BAND_LABEL[b]}: ${s.byBand[b]}`).join(', ')}>
                {BANDS.filter((b) => s.byBand[b] > 0).map((b) => (
                  <div key={b} style={{ flexGrow: s.byBand[b] / total, background: BAND_COLOR[b] }} />
                ))}
                {s.openFindings === 0 && <div className="flex-1 bg-surface-3" />}
              </div>
              <ul className="mt-3 grid grid-cols-4 gap-2">
                {BANDS.map((b) => (
                  <li key={b} className="flex flex-col">
                    <span className="display-num text-lg leading-tight">{s.byBand[b]}</span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-3"><span className="size-1.5 rounded-full" style={{ background: BAND_COLOR[b] }} />{BAND_LABEL[b]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-hairline sm:grid-cols-3 lg:border-l lg:border-t-0">
            <Kpi label="Hallazgos abiertos" value={s.openFindings} note={`${findings.length} registrados`} />
            <Kpi label="En CISA KEV" value={s.kevOpen} note="explotación activa confirmada" tone={s.kevOpen ? 'var(--color-critica)' : undefined} />
            <Kpi label="Activos en riesgo" value={s.assetsAtRisk} note={`de ${assets.length} · prioridad alta o crítica`} />
            <Kpi label="Rutas de ataque" value={s.attackPaths} note="de Internet a joyas de la corona" />
            <Kpi label="Puntos de estrangulamiento" value={s.chokePoints} note="nodos presentes en ≥ 40 % de rutas" tone={s.chokePoints ? 'var(--color-alta)' : undefined} />
            <Kpi label="MTTR" value={s.mttrDays === null ? '—' : n1(s.mttrDays)} unit={s.mttrDays === null ? undefined : 'días'} note="tiempo medio de remediación" />
          </div>
        </section>

        {/* Ciclo CTEM */}
        <section className="panel p-5" aria-label="Ciclo CTEM">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="title-md">Ciclo CTEM</h2>
            <span className="text-xs text-ink-3">Gartner: alcance → descubrimiento → priorización → validación → movilización</span>
          </div>
          <ol className="grid grid-cols-5 gap-3">
            {stages.map((st, i) => (
              <li key={st.name} className="relative">
                {i < stages.length - 1 && <span aria-hidden className="absolute left-[calc(1.25rem+6px)] right-[-0.75rem] top-[0.6875rem] h-px" style={{ background: st.state === 'hecho' ? 'color-mix(in oklab, var(--color-accent) 50%, transparent)' : 'var(--color-hairline-strong)' }} />}
                <button type="button" onClick={() => setView(st.view)} className="group relative flex w-full flex-col items-start gap-2 rounded-xl text-left transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100">
                  <StageDot state={st.state} index={i + 1} />
                  <div>
                    <div className="text-[0.8125rem] font-semibold">{st.name}</div>
                    <div className="text-xs text-ink-3">{st.detail}</div>
                    <div className="mt-1 text-[0.6875rem] font-medium" style={{ color: st.state === 'hecho' ? 'var(--color-accent)' : st.state === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-4)' }}>{STAGE_LABEL[st.state]}</div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Módulos */}
          <section className="panel overflow-hidden" aria-label="Módulos">
            <h2 className="title-md px-5 pb-2 pt-4">Módulos</h2>
            <ul className="divide-hair">
              <ModuleRow icon={<Crosshair />} title="Alcance y activos" status={stages[0].state} metric={`${assets.length} activos · ${project.ranges.filter((r) => r.inScope).length} rangos en alcance`} onClick={() => setView('alcance')} />
              <ModuleRow icon={<Radar />} title="Descubrimiento y priorización" status={stages[2].state} metric={`${s.openFindings} abiertos · ${s.byBand.critica} críticos · ${s.kevOpen} KEV`} onClick={() => setView('priorizacion')} />
              <ModuleRow icon={<Route />} title="Rutas de ataque (validación)" status={stages[3].state} metric={`${s.attackPaths} rutas · ${s.chokePoints} puntos de estrangulamiento`} onClick={() => setView('rutas')} />
              <ModuleRow icon={<ListChecks />} title="Movilización" status={stages[4].state} metric={`${s.openFindings} tickets · informe ejecutivo`} onClick={() => setView('movilizacion')} />
            </ul>
          </section>

          {/* Riesgos principales */}
          <section className="panel overflow-hidden" aria-label="Riesgos principales">
            <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
              <h2 className="title-md">Riesgos principales</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('priorizacion')}>Ver todos<ArrowRight /></button>
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
              {top.length === 0 && <li className="px-5 py-6 text-ink-3">No hay hallazgos abiertos.</li>}
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
  const color = state === 'hecho' ? 'var(--color-accent)' : state === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-4)';
  return (
    <span className="num relative z-[1] grid size-[1.375rem] place-items-center rounded-full bg-surface text-[0.6875rem] font-semibold" style={{ color, boxShadow: `inset 0 0 0 1.5px ${color}` }}>
      {index}
    </span>
  );
}

function ModuleRow({ icon, title, metric, status, onClick }: { icon: ReactNode; title: string; metric: string; status: StageState; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="row-interactive flex w-full items-center gap-4 px-5 py-3.5 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-accent [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-xs text-ink-3">{metric}</span>
        </span>
        <span className="text-[0.6875rem] font-medium" style={{ color: status === 'hecho' ? 'var(--color-accent)' : status === 'en_curso' ? 'var(--color-media)' : 'var(--color-ink-3)' }}>{STAGE_LABEL[status]}</span>
        <ChevronRight className="size-4 text-ink-4" />
      </button>
    </li>
  );
}
