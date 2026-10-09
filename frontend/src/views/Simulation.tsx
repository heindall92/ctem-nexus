/* «¿Y si…?»: marca hallazgos como corregidos en borrador y ve al instante qué pasa con el índice, los críticos, el KEV
 * y las rutas. El plan propuesto es voraz sobre el grafo (rompe más rutas por hallazgo en cada paso). No toca el proyecto. */
import { Eraser, FileText, FlaskConical, Sparkles, Wand2 } from 'lucide-react';
import { useMemo } from 'react';
import { AttackGraph } from '../components/AttackGraph';
import { TopBar } from '../components/Shell';
import { DemoBadge, Empty, PageHeader, Reveal, SectionTitle } from '../components/ui';
import { isActive } from '../engine/engine';
import { pathsBrokenBy } from '../engine/impact';
import { fixPlan, simulate } from '../engine/simulate';
import { useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { download, stamp } from '../lib/download';
import { BAND_COLOR, n1, plural } from '../lib/format';
import { useStore } from '../store/store';

function Delta({ label, before, after, decimals = false, testId }: { label: string; before: number; after: number; decimals?: boolean; testId?: string }) {
  const L = useL();
  const d = Math.round((after - before) * 10) / 10;
  const fmt = (x: number) => (decimals ? n1(x) : x.toLocaleString());
  return (
    <div className="flex flex-col gap-1 px-5 py-4" data-testid={testId}>
      <span className="label">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="display-num text-[1.75rem] leading-none">{fmt(after)}</span>
        {d !== 0 && <span className="num text-[0.8125rem] font-semibold" style={{ color: d < 0 ? 'var(--color-ok)' : 'var(--color-critica)' }}>{d < 0 ? '−' : '+'}{fmt(Math.abs(d))}</span>}
      </span>
      <span className="text-xs text-ink-3">{d === 0 ? L('sin cambio', 'no change') : L(`antes ${fmt(before)}`, `was ${fmt(before)}`)}</span>
    </div>
  );
}

export function Simulation() {
  const L = useL();
  const project = useStore((s) => s.project);
  const fixed = useStore((s) => s.simFixed);
  const setFixed = useStore((s) => s.setSimFixed);
  const setView = useStore((s) => s.setView);
  const selectFinding = useStore((s) => s.selectFinding);
  const notify = useStore((s) => s.notify);
  const { result } = useResult();

  const input = useMemo(() => ({ assets: project.assets, findings: project.findings, edges: project.edges, profile: project.profile ?? 'defecto' as const, slaPolicy: project.slaPolicy ?? 'estandar' as const }), [project]);
  const fixedSet = useMemo(() => new Set(fixed), [fixed]);
  const after = useMemo(() => simulate(input, fixed), [input, fixed]);
  const plan = useMemo(() => fixPlan(result, project.findings, 10), [result, project.findings]);
  const fById = new Map(project.findings.map((f) => [f.id, f]));
  const aName = new Map(project.assets.map((a) => [a.id, a.name]));
  const candidates = result.scored.filter((s) => { const f = fById.get(s.id); return f && isActive(f); });
  const brokenNow = pathsBrokenBy(result.graph, fixed);
  const b = result.summary;
  const a = after.summary;
  const profName = { defecto: L('general', 'general'), ot: 'OT', banca: L('banca', 'banking') }[project.profile ?? 'defecto'];
  const stepOf = new Map(plan.steps.flatMap((st, i) => st.ids.map((id) => [id, i + 1] as const)));

  const toggle = (id: string) => setFixed(fixedSet.has(id) ? fixed.filter((x) => x !== id) : [...fixed, id]);
  const applyPlan = (n: number) => {
    const ids = plan.steps.slice(0, n).flatMap((s) => s.ids);
    setFixed(ids);
    notify((n === 1 ? L(`Simulando el primer paso del plan (${plural(ids.length, 'hallazgo', 'hallazgos')}).`, `Simulating the first plan step (${plural(ids.length, 'finding', 'findings')}).`) : L(`Simulando los ${n} primeros pasos del plan (${plural(ids.length, 'hallazgo', 'hallazgos')}).`, `Simulating the first ${n} plan steps (${plural(ids.length, 'finding', 'findings')}).`)), 'info');
  };
  const exportPlan = () => {
    const lines = [
      `# ${L('Plan de corrección', 'Fix plan')} · ${project.name}`, '',
      L(`Orden voraz sobre el grafo de ataque: en cada paso, lo que más rutas rompe por hallazgo (${plan.totalPaths} rutas hacia activos críticos).`, `Greedy order over the attack graph: each step breaks the most paths per finding (${plan.totalPaths} paths to critical assets).`), '',
      ...plan.steps.map((st, i) => `${i + 1}. ${st.ids.map((id) => `${id} · ${fById.get(id)?.title ?? id}`).join(' + ')} — ${st.newlyBroken ? L(`rompe ${st.newlyBroken} (acumuladas ${st.cumulativeBroken}/${plan.totalPaths})`, `breaks ${st.newlyBroken} (cumulative ${st.cumulativeBroken}/${plan.totalPaths})`) : L(`puntuación ${n1(st.score)}`, `score ${n1(st.score)}`)}`),
      '', plan.unbreakable ? L(`${plan.unbreakable} rutas dependen de aristas manuales: no se cortan corrigiendo hallazgos.`, `${plan.unbreakable} paths depend on manual edges: fixing findings does not cut them.`) : '',
    ];
    download(`plan-correccion-${stamp()}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
    notify(L('Plan exportado en Markdown.', 'Plan exported as Markdown.'));
  };

  const header = (
    <PageHeader
      icon={<FlaskConical />}
      eyebrow={L('Movilización · simulación', 'Mobilization · simulation')}
      title={L('¿Y si…?', 'What if…?')}
      badge={project.demo ? <DemoBadge /> : undefined}
      lead={L('Marca hallazgos como corregidos y mira al momento cómo cambian el índice, los críticos, el KEV y las rutas hacia los activos críticos. Es un borrador: el proyecto no cambia.', 'Mark findings as fixed and instantly see how the index, critical findings, KEV and paths to the critical assets change. It is a draft: the project does not change.')}
      actions={candidates.length ? <>
        <button type="button" className="btn" onClick={exportPlan}><FileText />{L('Plan .md', 'Plan .md')}</button>
        {fixed.length > 0 && <button type="button" className="btn" onClick={() => setFixed([])}><Eraser />{L('Vaciar', 'Clear')}</button>}
        <button type="button" className="btn btn-primary" onClick={() => applyPlan(plan.steps.length)}><Wand2 />{L('Simular el plan', 'Simulate the plan')}</button>
      </> : undefined}
    />
  );

  if (!candidates.length) {
    return (
      <>
        <TopBar title={L('¿Y si…?', 'What if…?')} />
        <div className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-8">
          {header}
          <div className="panel mt-5"><Empty icon={<FlaskConical />} title={L('Nada que simular', 'Nothing to simulate')} text={L('No hay hallazgos abiertos ni validados. Importa un escaneo o carga el ejemplo.', 'There are no open or validated findings. Import a scan or load the sample.')}><button type="button" className="btn btn-primary" onClick={() => setView('priorizacion')}>{L('Ir a priorización', 'Go to prioritization')}</button></Empty></div>
        </div>
      </>
    );
  }

  const maxStep = Math.max(1, plan.totalPaths);
  return (
    <>
      <TopBar title={L('¿Y si…?', 'What if…?')} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-8 sm:px-8">
        {header}

        <Reveal as="section" delay={0.04} className="panel grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-hairline-strong)] sm:grid-cols-5 [&>*]:bg-surface [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1" aria-label={L('Antes y después', 'Before and after')} aria-live="polite">
          <Delta label={L('Índice de exposición', 'Exposure index')} before={b.exposureIndex} after={a.exposureIndex} decimals testId="sim-indice" />
          <Delta label={L('Críticos abiertos', 'Open critical')} before={b.byBand.critica} after={a.byBand.critica} />
          <Delta label={L('En CISA KEV', 'In CISA KEV')} before={b.kevOpen} after={a.kevOpen} />
          <Delta label={L('Rutas de ataque', 'Attack paths')} before={b.attackPaths} after={a.attackPaths} testId="sim-rutas" />
          <Delta label={L('Activos en riesgo', 'Assets at risk')} before={b.assetsAtRisk} after={a.assetsAtRisk} />
        </Reveal>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal as="section" delay={0.08} className="panel overflow-hidden" aria-label={L('Plan propuesto', 'Proposed plan')}>
            <SectionTitle
              title={L('Plan propuesto', 'Proposed plan')}
              detail={L(`Cada paso rompe el máximo de rutas por hallazgo corregido. ${plan.steps.filter((s) => s.newlyBroken).length} pasos cortan ${plan.totalPaths - plan.unbreakable} de ${plan.totalPaths} rutas.`, `Each step breaks the most paths per fixed finding. ${plan.steps.filter((s) => s.newlyBroken).length} steps cut ${plan.totalPaths - plan.unbreakable} of ${plan.totalPaths} paths.`)}
            />
            {/* Escalera: rutas rotas acumuladas por paso */}
            {plan.totalPaths > 0 && (
              <div className="border-t border-hairline px-5 pb-2 pt-4">
                <div role="img" aria-label={L(`Rutas rotas acumuladas por paso: ${plan.steps.map((s) => s.cumulativeBroken).join(', ')} de ${plan.totalPaths}`, `Cumulative broken paths per step: ${plan.steps.map((s) => s.cumulativeBroken).join(', ')} of ${plan.totalPaths}`)} className="flex h-24 items-end gap-1.5" data-testid="escalera-plan">
                  {plan.steps.map((st, i) => (
                    <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="num text-[0.625rem] text-ink-3">{st.cumulativeBroken}</span>
                      <div className="w-full rounded-t-[5px] transition-[height] duration-300 ease-[var(--ease-out)]" style={{ height: `${Math.max(4, (st.cumulativeBroken / maxStep) * 64)}px`, background: st.newlyBroken ? 'var(--color-accent)' : 'var(--color-surface-3)' }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex gap-1.5" aria-hidden>{plan.steps.map((_, i) => <span key={i} className="num flex-1 text-center text-[0.625rem] text-ink-3">{i + 1}</span>)}</div>
              </div>
            )}
            <ol className="divide-hair border-t border-hairline" data-testid="pasos-plan">
              {plan.steps.map((st, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-2.5">
                  <button type="button" className="num grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold transition-transform duration-150 active:scale-[0.92]" style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }} onClick={() => applyPlan(i + 1)} aria-label={L(`Simular hasta el paso ${i + 1}`, `Simulate up to step ${i + 1}`)}>{i + 1}</button>
                  <span className="min-w-0 flex-1 text-[0.8125rem]">
                    {st.ids.map((id) => <span key={id} className="block leading-snug"><span className="num text-ink-3">{id}</span> {fById.get(id)?.title}</span>)}
                    <span className="mt-0.5 block text-xs text-ink-3">
                      {st.newlyBroken ? L(`Rompe ${st.newlyBroken} ${st.newlyBroken === 1 ? 'ruta' : 'rutas'} · ${st.cumulativeBroken}/${plan.totalPaths} acumuladas`, `Breaks ${st.newlyBroken} ${st.newlyBroken === 1 ? 'path' : 'paths'} · ${st.cumulativeBroken}/${plan.totalPaths} cumulative`) : L(`Sin rutas que romper: baja el índice (puntuación ${n1(st.score)})`, `No paths left to break: lowers the index (score ${n1(st.score)})`)}
                      {st.ids.length > 1 && <> · {L('solo juntos cortan su arista', 'only together they cut their edge')}</>}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {plan.unbreakable > 0 && <p className="border-t border-hairline px-5 py-3 text-xs text-ink-3">{L(`${plan.unbreakable} rutas dependen de aristas manuales: no se cortan corrigiendo hallazgos.`, `${plan.unbreakable} paths depend on manual edges: fixing findings does not cut them.`)}</p>}
          </Reveal>

          <Reveal as="section" delay={0.12} className="panel overflow-hidden" aria-label={L('Hallazgos a corregir', 'Findings to fix')}>
            <SectionTitle title={L('Hallazgos a corregir', 'Findings to fix')} detail={fixed.length ? L(`${fixed.length} marcados · rompen ${brokenNow} de ${plan.totalPaths} rutas`, `${fixed.length} selected · they break ${brokenNow} of ${plan.totalPaths} paths`) : L('Marca los que darías por corregidos.', 'Tick the ones you would count as fixed.')} />
            <ul className="max-h-[520px] divide-hair overflow-y-auto border-t border-hairline" data-testid="candidatos-sim">
              {candidates.map((s) => {
                const f = fById.get(s.id)!;
                const solo = pathsBrokenBy(result.graph, [s.id]);
                const step = stepOf.get(s.id);
                return (
                  <li key={s.id}>
                    <label className="row-interactive flex cursor-pointer items-start gap-3 px-5 py-2.5">
                      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]" checked={fixedSet.has(s.id)} onChange={() => toggle(s.id)} aria-label={L(`Dar por corregido ${f.id}`, `Count ${f.id} as fixed`)} />
                      <span className="num w-9 shrink-0 pt-0.5 text-[0.875rem] font-semibold" style={{ color: BAND_COLOR[s.band] }}>{n1(s.score)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.8125rem] font-medium leading-snug">{f.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-3">
                          <span className="num">{f.id}</span> · {aName.get(f.assetId) ?? f.assetId}
                          {solo > 0 && <> · {L(`rompe ${solo} ${solo === 1 ? 'ruta' : 'rutas'} por sí solo`, `breaks ${solo} ${solo === 1 ? 'path' : 'paths'} on its own`)}</>}
                          {f.kev && <> · KEV</>}
                        </span>
                      </span>
                      {step && <span className="chip shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}>{L(`paso ${step}`, `step ${step}`)}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        <Reveal as="section" delay={0.16} className="panel overflow-hidden" aria-label={L('Grafo tras las correcciones', 'Graph after the fixes')}>
          <SectionTitle
            title={L('Grafo tras las correcciones', 'Graph after the fixes')}
            detail={L(`Quedan ${a.attackPaths} de ${b.attackPaths} rutas hacia los activos críticos.`, `${a.attackPaths} of ${b.attackPaths} paths to the critical assets remain.`)}
            actions={<button type="button" className="btn btn-sm" onClick={() => { const top = fixed[0]; setView('priorizacion'); if (top) selectFinding(top); }} disabled={!fixed.length}><Sparkles />{L('Ver el primero en priorización', 'Open the first in prioritization')}</button>}
          />
          <div className="border-t border-hairline bg-ground/40 px-4 py-5">
            {a.attackPaths > 0 || after.graph.edges.length > 0
              ? <AttackGraph graph={after.graph} highlight={null} focusNode={null} onNode={() => undefined} />
              : <p className="py-8 text-center text-[0.875rem] text-ink-2">{L('Sin rutas: ningún camino lleva ya desde Internet hasta un activo crítico.', 'No paths: nothing leads from the Internet to a critical asset any more.')}</p>}
          </div>
        </Reveal>

        <p className="text-xs leading-relaxed text-ink-3">{L(`La simulación recalcula el mismo motor (perfil ${profName}) con los hallazgos marcados como mitigados. El borrador se conserva mientras navegas, pero no se guarda en el proyecto ni en el informe.`, `The simulation re-runs the same engine (profile ${profName}) with the ticked findings as mitigated. The draft persists while you navigate but is not saved in the project or the report.`)}</p>
      </div>
    </>
  );
}
