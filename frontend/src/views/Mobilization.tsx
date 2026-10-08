import { AlarmClock, Check, Waypoints, ChevronDown, Copy, FileDown, FileSpreadsheet, FileText, ListChecks, Printer } from 'lucide-react';
import { useState } from 'react';
import { buildTickets, reportMarkdown, ticketsCsv, ticketsMarkdown } from '../engine/io';
import { slaInfo, type SlaState } from '../engine/sla';
import { TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, PageHeader } from '../components/ui';
import { useResult } from '../lib/analysis';
import { download, stamp } from '../lib/download';
import { BAND_COLOR, longDate, n1 } from '../lib/format';
import { roleLabel, screen, useL } from '../i18n';
import { useStore } from '../store/store';

const SLA_TONE: Record<SlaState, string> = { vencido: 'var(--color-critica)', hoy: 'var(--color-critica)', proximo: 'var(--color-alta)', en_plazo: 'var(--color-ink-2)' };

/** Fecha límite con su estado: vencido, vence hoy, a punto (≤ 3 días) o en plazo. */
function SlaChip({ detectedAt, slaDays }: { detectedAt?: string; slaDays: number }) {
  const L = useL();
  const { due, daysLeft, state } = slaInfo(detectedAt, slaDays);
  const text = state === 'vencido' ? L(`vencido hace ${-daysLeft} d`, `overdue by ${-daysLeft} d`) : state === 'hoy' ? L('vence hoy', 'due today') : state === 'proximo' ? L(`vence en ${daysLeft} d`, `due in ${daysLeft} d`) : L(`vence ${due}`, `due ${due}`);
  return (
    <span className="num inline-flex items-center gap-1 text-xs font-medium" style={{ color: SLA_TONE[state] }} title={L(`Fecha límite: ${due}`, `Due date: ${due}`)}>
      {state !== 'en_plazo' && <AlarmClock className="size-3.5" aria-hidden />}
      {text}
    </span>
  );
}

export function Mobilization() {
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const L = useL();
  const project = useStore((s) => s.project);
  const profile = useStore((s) => s.settings.profile);
  const author = [profile?.nombre, roleLabel(profile?.rol ?? '', lang), profile?.organizacion].map((part) => part?.trim()).filter(Boolean).join(' · ');
  const notify = useStore((s) => s.notify);
  const toggleStep = useStore((s) => s.toggleStep);
  const { result } = useResult();
  const s = result.summary;
  const tickets = buildTickets(project.findings, project.assets, result, lang);
  const [open, setOpen] = useState<string | null>(tickets[0]?.finding.id ?? null);
  const top = tickets.slice(0, 8);
  const overdue = tickets.filter((t) => slaInfo(t.finding.detectedAt, t.scored.slaDays).state === 'vencido').length;
  const slug = project.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';

  return (
    <>
      <TopBar title={c.mobTitle} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 sm:px-8">
        <div className="no-print">
          <PageHeader
            icon={<ListChecks />}
            eyebrow={L('Fase 5 · Movilización', 'Stage 5 · Mobilization')}
            title={L('Plan de remediación', 'Remediation plan')}
            badge={project.demo ? <DemoBadge /> : undefined}
            lead={L('Informe ejecutivo para la dirección y tickets para cada equipo, con pasos, verificación y fecha límite según el SLA.', 'An executive report for leadership and tickets for each team, with steps, verification and a due date from the SLA.')}
          />
        </div>
        {project.findings.length === 0 ? (
          <div className="panel"><Empty icon={<ListChecks />} title={c.nothingToMove} text={c.nothingToMoveText} /></div>
        ) : (
          <>
            {/* Informe ejecutivo (imprimible) */}
            <article className="panel print-area overflow-hidden" aria-label={L('Informe ejecutivo', 'Executive report')}>
              {/* Portada: solo al imprimir o guardar en PDF */}
              <section className="print-cover" aria-hidden>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent text-[var(--color-accent-ink)]"><Waypoints className="size-5" /></span>
                  <span className="text-lg font-bold tracking-tight">CTEM-Nexus</span>
                </div>
                <div>
                  <p className="eyebrow">{L('Informe ejecutivo de exposición', 'Executive exposure report')}</p>
                  <h2 className="mt-3 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.035em]">{project.name}</h2>
                  <p className="print-muted mt-3 text-base">{longDate(new Date())}{author ? ` · ${author}` : ''}</p>
                  <div className="mt-14 flex items-end gap-4">
                    <span className="display-num text-[6rem] leading-none" style={{ color: BAND_COLOR[s.exposureIndex >= 80 ? 'critica' : s.exposureIndex >= 60 ? 'alta' : s.exposureIndex >= 40 ? 'media' : 'baja'] }}>{n1(s.exposureIndex)}</span>
                    <span className="print-muted pb-3 text-lg">/100 · {c.exposure.toLowerCase()}</span>
                  </div>
                  <dl className="mt-10 grid grid-cols-4 gap-6 border-t pt-6">
                    {[[c.openFindings, s.openFindings], [c.kev, s.kevOpen], [c.paths, s.attackPaths], [c.chokes, s.chokePoints]].map(([k, v]) => (
                      <div key={String(k)}><dt className="print-muted text-sm">{k}</dt><dd className="display-num mt-1 text-3xl">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <p className="print-muted text-xs">
                  CTEM-Nexus {__APP_VERSION__} · {L('motor', 'engine')} v{result.version}. {L('Herramienta de apoyo a la priorización: no sustituye a un test de intrusión ni a una auditoría.', 'A prioritization aid: it does not replace a penetration test or an audit.')}
                  {project.demo ? ` ${L('Datos de ejemplo ficticios.', 'Fictional sample data.')}` : ''}
                </p>
              </section>
              <header className="flex flex-wrap items-end justify-between gap-3 px-6 pb-4 pt-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em]">{L('Informe ejecutivo de exposición', 'Executive exposure report')}</h2>
                  <p className="print-muted mt-1 text-[0.8125rem] text-ink-3">{project.name} · {longDate(new Date())} · CTEM-Nexus {__APP_VERSION__} · {L('motor', 'engine')} {result.engine === 'ts' ? 'local' : 'API'} v{result.version}{author ? ` · ${author}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn no-print" onClick={() => window.print()}><Printer className="size-4" />{L('Imprimir informe', 'Print report')}</button>
                  <button type="button" className="btn no-print" onClick={() => { download(`informe-${slug}-${stamp()}.md`, reportMarkdown(project, project.findings, project.assets, result, new Date(), author, lang), 'text/markdown;charset=utf-8'); notify(L('Informe exportado en Markdown.', 'Report exported as Markdown.')); }}><FileText className="size-4" />{L('Informe .md', 'Report .md')}</button>
                  {project.demo && <DemoBadge />}
                </div>
              </header>
              <div className="grid grid-cols-2 border-y border-hairline sm:grid-cols-4">
                {[
                  [c.exposure, `${n1(s.exposureIndex)}`, '/100'],
                  [c.openFindings, String(s.openFindings), c.critHigh(s.byBand.critica, s.byBand.alta)],
                  [c.kev, String(s.kevOpen), L('explotación activa', 'active exploitation')],
                  [L('Rutas / estrangulamientos', 'Paths / choke points'), `${s.attackPaths} / ${s.chokePoints}`, L('hacia joyas de la corona', 'to crown jewels')],
                ].map(([l, v, n], i) => (
                  <div key={l} className={`px-6 py-4 ${i ? 'border-l border-hairline' : ''}`}>
                    <div className="label print-muted">{l}</div>
                    <div className="display-num mt-1 text-2xl">{v}{n === '/100' && <span className="num ml-1 text-xs font-normal tracking-normal text-ink-3">/100</span>}</div>
                    {n !== '/100' && <div className="print-muted text-xs text-ink-3">{n}</div>}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section className="px-6 py-4">
                  <h3 className="title-md mb-2">{c.topRisks}</h3>
                  <table className="table">
                    <thead><tr><th className="!px-0">#</th><th>{L('Hallazgo', 'Finding')}</th><th>{c.thAsset}</th><th>{L('Prioridad', 'Priority')}</th><th className="text-right">SLA</th></tr></thead>
                    <tbody>
                      {top.map((t, i) => (
                        <tr key={t.finding.id}>
                          <td className="num !px-0 text-ink-3">{i + 1}</td>
                          <td className="max-w-[18rem]"><div className="truncate font-medium">{t.finding.title}</div><div className="num print-muted text-xs text-ink-3">{t.finding.cve ?? t.finding.id}</div></td>
                          <td className="max-w-[12rem] truncate text-ink-2">{t.asset?.name ?? t.finding.assetId}</td>
                          <td className="whitespace-nowrap"><span className="num mr-2 font-semibold" style={{ color: BAND_COLOR[t.scored.band] }}>{n1(t.scored.score)}</span><BandBadge band={t.scored.band} /></td>
                          <td className="num whitespace-nowrap text-right">{t.scored.slaDays} d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="border-t border-hairline px-6 py-4 lg:border-l lg:border-t-0">
                  <h3 className="title-md mb-2">{c.chokes}</h3>
                  <ul className="flex flex-col gap-2.5 text-[0.8125rem]">
                    {result.graph.chokePoints.slice(0, 6).map((c) => (
                      <li key={c.id} className="flex gap-3">
                        <span className="num w-10 shrink-0 font-semibold text-alta">{Math.round(c.share * 100)} %</span>
                        <span><span className="font-medium">{c.label}</span><span className="print-muted block text-xs text-ink-3">{c.kind === 'nodo' ? L(`Nodo en ${c.paths} de ${s.attackPaths} rutas`, `Node on ${c.paths} of ${s.attackPaths} paths`) : L(`Arista en ${c.paths} de ${s.attackPaths} rutas`, `Edge on ${c.paths} of ${s.attackPaths} paths`)}</span></span>
                      </li>
                    ))}
                    {result.graph.chokePoints.length === 0 && <li className="text-ink-3">{L('Ninguno identificado.', 'None identified.')}</li>}
                  </ul>
                  <h3 className="title-md mb-1.5 mt-5">{L('Recomendación', 'Recommendation')}</h3>
                  <p className="print-muted text-[0.8125rem] leading-relaxed text-ink-2">
                    {L('Corregir primero los hallazgos sobre puntos de estrangulamiento y los incluidos en CISA KEV: cortan el mayor número de rutas hacia las joyas de la corona con el menor esfuerzo.', 'Fix first the findings on choke points and those in CISA KEV: they break the most paths to the crown jewels with the least effort.')}
                    {s.mttrDays !== null && <> {L('MTTR actual', 'Current MTTR')}: <span className="num">{n1(s.mttrDays)}</span> {c.days}.</>}
                  </p>
                </section>
              </div>
            </article>

            {/* Guías y tickets */}
            <section className="panel no-print overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-4">
                <div>
                  <h2 className="title-md">{L('Guías de remediación', 'Remediation guides')}</h2>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-3">{L(`${tickets.length} tickets abiertos`, `${tickets.length} open tickets`)}{overdue > 0 && <> · <span className="font-medium text-critica">{L(`${overdue} fuera de plazo`, `${overdue} overdue`)}</span></>} · {L('SLA por banda', 'SLA by band')}: {c.band.critica} 3 d · {c.band.alta} 14 d · {c.band.media} 30 d · {c.band.baja} 90 d</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn" onClick={() => { download(`tickets-${slug}-${stamp()}.csv`, ticketsCsv(project.findings, project.assets, result, lang), 'text/csv;charset=utf-8'); notify(L('Tickets exportados en CSV (fórmulas neutralizadas).', 'Tickets exported as CSV (formulas neutralized).')); }}><FileSpreadsheet />Tickets CSV</button>
                  <button type="button" className="btn" onClick={() => { download(`tickets-${slug}-${stamp()}.md`, ticketsMarkdown(project.findings, project.assets, result, lang), 'text/markdown;charset=utf-8'); notify(L('Tickets exportados en Markdown.', 'Tickets exported as Markdown.')); }}><FileDown />Tickets .md</button>
                </div>
              </div>
              <ul className="divide-hair border-t border-hairline">
                {tickets.map((t) => {
                  const isOpen = open === t.finding.id;
                  return (
                    <li key={t.finding.id}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.finding.id)} className="row-interactive flex w-full items-center gap-4 px-5 py-3 text-left">
                        <span className="num w-10 font-semibold" style={{ color: BAND_COLOR[t.scored.band] }}>{n1(t.scored.score)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.guide.title}</span>
                          <span className="block truncate text-xs text-ink-3"><span className="num">{t.finding.id}</span> · {t.finding.title} · {t.asset?.name ?? t.finding.assetId}</span>
                        </span>
                        <span className="hidden text-xs text-ink-3 md:block">{t.owner}</span>
                        <span className="num hidden text-xs text-ink-3 sm:block" title={L('Pasos hechos', 'Steps done')}>{(project.progress?.[t.finding.id] ?? []).length}/{t.guide.steps.length}</span>
                        <SlaChip detectedAt={t.finding.detectedAt} slaDays={t.scored.slaDays} />
                        <ChevronDown className={`size-4 text-ink-3 transition-transform duration-200 ease-[var(--ease-out)] ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="view-enter grid grid-cols-1 gap-5 px-5 pb-5 pl-[4.75rem] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                          <div>
                            <div className="label mb-2 font-medium">{L('Pasos', 'Steps')}</div>
                            <ol className="flex flex-col gap-1">
                              {t.guide.steps.map((st, i) => {
                                const hecho = (project.progress?.[t.finding.id] ?? []).includes(i);
                                return (
                                  <li key={st}>
                                    <label className="step-row">
                                      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" checked={hecho} onChange={() => toggleStep(t.finding.id, i)} />
                                      <span className={hecho ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink-2'}>{st}</span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                          <div className="flex flex-col gap-3">
                            <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                              <div><dt className="label">{c.thOwner}</dt><dd>{t.owner}</dd></div>
                              <div><dt className="label">{L('Prioridad', 'Priority')} · SLA</dt><dd>{c.band[t.scored.band]} · <span className="num">{t.scored.slaDays}</span> {c.daysShort}</dd></div>
                            </dl>
                            <div>
                              <div className="label mb-1.5 flex items-center justify-between font-medium">{L('Verificación', 'Verification')}<CopyButton text={t.guide.verify} /></div>
                              <pre className="code">{t.guide.verify}</pre>
                            </div>
                            <p className="text-xs text-ink-3">{L('Motivo', 'Reason')}: {t.reasons}</p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                {tickets.length === 0 && <li className="px-5 py-6 text-ink-3">{L('No hay hallazgos abiertos: todos están mitigados o descartados.', 'No open findings: all are mitigated or dismissed.')}</li>}
              </ul>
            </section>
            <p className="no-print text-xs text-ink-3">{L('Puntuaciones con una cifra decimal (p. ej.', 'Scores with one decimal place (e.g.')} <span className="num">{n1(92.5)}</span>). {L('La exportación CSV antepone un apóstrofo a las celdas que empiezan por = + − @ para evitar la inyección de fórmulas.', 'The CSV export prefixes an apostrophe to cells starting with = + − @ to prevent formula injection.')}</p>
          </>
        )}
      </div>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const L = useL();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm -my-1 h-6 px-2" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* sin permiso */ } }}>
      {done ? <Check /> : <Copy />}{done ? L('Copiado', 'Copied') : L('Copiar', 'Copy')}
    </button>
  );
}
