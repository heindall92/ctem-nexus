import { ArrowRight, Crosshair, Crown, Globe, FileJson, LayoutDashboard, ListChecks, Radar, Route, Scissors, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { CycleArt } from '../components/CycleArt';
import { ExposureLanes } from '../components/ExposureLanes';
import { NmapUploader } from '../components/NmapUploader';
import { pathsBrokenBy } from '../engine/impact';
import { slaInfo } from '../engine/sla';
import type { Band } from '../engine/types';
import { Modal, TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, PageHeader, Reveal, SPRING } from '../components/ui';
import { screen, useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, BAND_FILL, n1 } from '../lib/format';
import { useStore, type View } from '../store/store';

type StageState = 'hecho' | 'en_curso' | 'pendiente';
const BANDS: Band[] = ['critica', 'alta', 'media', 'baja'];

export function Dashboard() {
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const L = useL();
  const stageLabel: Record<StageState, string> = { hecho: c.stageDone, en_curso: c.stageDoing, pendiente: c.stageTodo };
  const project = useStore((s) => s.project);
  const setView = useStore((s) => s.setView);
  const selectFinding = useStore((s) => s.selectFinding);
  const loadDemo = useStore((s) => s.loadDemo);
  const notify = useStore((s) => s.notify);
  const [showNmap, setShowNmap] = useState(false);
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
        <TopBar title={c.panelTitle} />
        <div className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-8">
          <PageHeader icon={<LayoutDashboard />} eyebrow={L('Panel · sin datos', 'Board · no data')} title={c.emptyTitle} lead={c.emptyText} />
          <Reveal delay={0.05} className="panel mt-5 grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <h2 className="title-md">{L('¿Por dónde empiezas?', 'Where do you start?')}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <Sparkles />, title: c.loadDemo, text: L('Un caso ficticio completo: 8 activos, 20 hallazgos y 7 rutas de ataque.', 'A complete fictional case: 8 assets, 20 findings and 7 attack paths.'), primary: true, act: () => { loadDemo(); notify(c.demoLoaded); } },
                  { icon: <Radar />, title: c.importNmapScan, text: L('Arrastra la salida XML de Nmap: activos, puertos, joyas de la corona y CVE.', 'Drop Nmap XML output: assets, ports, crown jewels and CVEs.'), act: () => setShowNmap(true) },
                  { icon: <Crosshair />, title: c.defineScope, text: L('Registra a mano los activos, su criticidad y los rangos autorizados.', 'Record assets, their criticality and the authorized ranges by hand.'), act: () => setView('alcance') },
                ].map((o) => (
                  <li key={o.title}>
                    <button type="button" onClick={o.act} className={`entry-card ${o.primary ? 'entry-card-primary' : ''}`}>
                      <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-accent [&_svg]:size-[18px]">{o.icon}</span>
                      <span className="mt-3 block font-semibold text-ink">{o.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-3">{o.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => setView('ajustes')}><FileJson />{c.importProject}</button>
            </div>
            <div className="hidden justify-center lg:flex"><CycleArt /></div>
          </Reveal>
        </div>
        <Modal open={showNmap} onClose={() => setShowNmap(false)} title={L('Ingesta de escaneo Nmap (XML)', 'Nmap scan intake (XML)')} maxWidth={680}>
          <NmapUploader onDone={() => setShowNmap(false)} />
        </Modal>
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

  const openItems = result.scored.filter((x) => { const st = fById.get(x.id)?.status; return st === 'abierto' || st === 'validado'; });
  const top = openItems.slice(0, 5);
  const bandOfIndex: Band = s.exposureIndex >= 80 ? 'critica' : s.exposureIndex >= 60 ? 'alta' : s.exposureIndex >= 40 ? 'media' : 'baja';
  const total = Math.max(1, s.openFindings);
  // Tres acciones para hoy: lo que más rutas rompe; a igualdad, KEV y puntuación.
  const today = openItems
    .map((x) => ({ x, f: fById.get(x.id)!, broken: pathsBrokenBy(result.graph, [x.id]) }))
    .sort((a, b) => b.broken - a.broken || Number(b.f.kev) - Number(a.f.kev) || b.x.score - a.x.score)
    .slice(0, 3);
  const openFinding = (id: string) => { setView('priorizacion'); selectFinding(id); };

  return (
    <>
      <TopBar title={c.panelTitle} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 sm:px-8">
        <PageHeader
          icon={<LayoutDashboard />}
          eyebrow={`${L('Panel', 'Board')} · ${project.name}`}
          title={c.panelTitle}
          badge={project.demo ? <DemoBadge /> : undefined}
          lead={L('Dónde estás expuesto, qué rutas llevan a tus joyas de la corona y qué corregir primero.', 'Where you are exposed, which paths lead to your crown jewels and what to fix first.')}
          actions={<>
            <button type="button" className="btn" onClick={() => setView('rutas')}><Route />{c.paths}</button>
            <button type="button" className="btn btn-primary" onClick={() => setView('movilizacion')}><ListChecks />{L('Plan de remediación', 'Remediation plan')}</button>
          </>}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Reveal as="section" delay={0.04} className="panel flex flex-col p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="title-md">{L('Exposición por activo', 'Exposure by asset')}</h2>
              <span className="text-xs text-ink-3">{L('Cada marca es un hallazgo abierto, situado por su puntuación', 'Each mark is an open finding, placed by its score')}</span>
            </div>
            <div className="mt-4 flex-1">
              <ExposureLanes items={openItems.map((x) => ({ scored: x, finding: fById.get(x.id)! }))} assets={assets} onOpen={openFinding} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-3">
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-2 rounded-full bg-[var(--color-ink-3)] shadow-[0_0_0_1.5px_var(--color-surface),0_0_0_3px_var(--color-critica)]" />CISA KEV</li>
              <li className="flex items-center gap-1.5"><Crown className="size-3.5 text-accent" />{c.crownJewel}</li>
              <li className="flex items-center gap-1.5"><Globe className="size-3.5" />{L('Expuesto a Internet', 'Internet-facing')}</li>
            </ul>
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal as="section" delay={0.08} className="panel p-6" >
              <div className="label">{c.exposure}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-num text-[3.5rem] leading-none" style={{ color: BAND_COLOR[bandOfIndex] }}>{n1(s.exposureIndex)}</span>
                <span className="num text-ink-3">/100</span>
              </div>
              <p className="mt-2 text-[0.8125rem] text-ink-3">
                {c.exposureLead} <span style={{ color: BAND_COLOR[bandOfIndex] }}>{c.band[bandOfIndex].toLowerCase()}</span>: {c.exposureTail}
              </p>
              <div className="mt-5 flex h-2.5 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={BANDS.map((b) => `${c.band[b]}: ${s.byBand[b]}`).join(', ')}>
                {BANDS.filter((b) => s.byBand[b] > 0).map((b) => (
                  <motion.div key={b} style={{ background: BAND_FILL[b], originX: 0 }} initial={{ flexGrow: 0 }} animate={{ flexGrow: s.byBand[b] / total }} transition={SPRING} />
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
            </Reveal>

            <Reveal as="section" delay={0.12} className="panel flex-1 overflow-hidden">
              <div className="px-5 pb-1 pt-4">
                <h2 className="title-md">{L('Tres acciones para hoy', 'Three actions for today')}</h2>
                <p className="mt-0.5 text-xs text-ink-3">{L('Las correcciones que más rutas hacia las joyas de la corona rompen.', 'The fixes that break the most paths to the crown jewels.')}</p>
              </div>
              <ol className="divide-hair" data-testid="acciones-hoy">
                {today.map(({ x, f, broken }, i) => (
                  <li key={x.id}>
                    <button type="button" className="row-interactive flex w-full items-start gap-3.5 px-5 py-3 text-left" onClick={() => openFinding(x.id)}>
                      <span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{f.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                          {broken > 0
                            ? <span className="chip" style={{ color: 'var(--color-accent)' }}><Scissors />{L(`Rompe ${broken} de ${result.graph.paths.length} rutas`, `Breaks ${broken} of ${result.graph.paths.length} paths`)}</span>
                            : <span className="chip">{L('Sin ruta: por puntuación', 'No path: by score')}</span>}
                          {f.kev && <span className="chip" style={{ color: 'var(--color-critica)' }}>KEV</span>}
                          <span className="truncate">{aById.get(f.assetId)?.name ?? f.assetId}</span>
                        </span>
                      </span>
                      <span className="num text-[0.9375rem] font-semibold" style={{ color: BAND_COLOR[x.band] }}>{n1(x.score)}</span>
                    </button>
                  </li>
                ))}
                {today.length === 0 && <li className="px-5 py-6 text-ink-3">{c.noOpen}</li>}
              </ol>
            </Reveal>
          </div>
        </div>

        <Reveal as="section" delay={0.16} className="panel grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-hairline-strong)] sm:grid-cols-3 xl:grid-cols-6" aria-label={L('Indicadores principales', 'Key indicators')}>
          <Kpi label={c.openFindings} value={s.openFindings} note={overdue ? c.overdueNote(overdue) : c.registered(findings.length)} tone={overdue ? 'var(--color-critica)' : undefined} />
          <Kpi label={c.kev} value={s.kevOpen} note={c.kevNote} tone={s.kevOpen ? 'var(--color-critica)' : undefined} />
          <Kpi label={c.assetsAtRisk} value={s.assetsAtRisk} note={c.ofAssets(assets.length)} />
          <Kpi label={c.paths} value={s.attackPaths} note={c.pathsNote} />
          <Kpi label={c.chokes} value={s.chokePoints} note={c.chokesNote} tone={s.chokePoints ? 'var(--color-alta)' : undefined} />
          <Kpi label={c.mttr} value={s.mttrDays === null ? '—' : n1(s.mttrDays)} unit={s.mttrDays === null ? undefined : c.days} note={c.mttrNote} />
        </Reveal>

        {/* Ciclo CTEM */}
        <Reveal as="section" delay={0.2} className="panel p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="title-md">{c.cycle}</h2>
            <span className="text-xs text-ink-3">{c.cycleNote}</span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0" tabIndex={-1}>
          <ol className="grid w-max grid-cols-5 gap-3 lg:w-auto">
            {stages.map((st, i) => (
              <li key={st.name} className="relative">
                {i < stages.length - 1 && <span aria-hidden className="absolute left-[calc(1.25rem+6px)] right-[-0.75rem] top-[0.6875rem] h-px" style={{ background: st.state === 'hecho' ? 'color-mix(in oklab, var(--color-accent) 50%, transparent)' : 'var(--color-hairline-strong)' }} />}
                <button type="button" onClick={() => setView(st.view)} className="group relative flex w-36 flex-col items-start gap-2 rounded-xl text-left transition-transform duration-150 active:scale-[0.97] motion-reduce:active:scale-100 lg:w-full">
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
        </Reveal>

        {/* Riesgos principales */}
        <Reveal as="section" delay={0.24} className="panel overflow-hidden" >
          <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
            <h2 className="title-md">{c.topRisks}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('priorizacion')}>{c.seeAll}<ArrowRight /></button>
          </div>
          <ul className="divide-hair">
            {top.map((x) => {
              const f = fById.get(x.id)!;
              return (
                <li key={x.id}>
                  <button type="button" className="row-interactive flex w-full items-center gap-4 px-5 py-3 text-left" onClick={() => openFinding(x.id)}>
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
        </Reveal>
      </div>
    </>
  );
}

function Kpi({ label, value, unit, note, tone }: { label: string; value: number | string; unit?: string; note: string; tone?: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 bg-surface p-5">
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
