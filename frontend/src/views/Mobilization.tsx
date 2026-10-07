import { Check, ChevronDown, Copy, FileDown, FileSpreadsheet, FileText, ListChecks, Printer } from 'lucide-react';
import { useState } from 'react';
import { fmt } from '../engine/engine';
import { buildTickets, reportMarkdown, ticketsCsv, ticketsMarkdown } from '../engine/io';
import { TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty } from '../components/ui';
import { useResult } from '../lib/analysis';
import { download, stamp } from '../lib/download';
import { BAND_COLOR, n1 } from '../lib/format';
import { roleLabel, screen } from '../i18n';
import { useStore } from '../store/store';

const addDays = (iso: string | undefined, days: number) => {
  const base = iso ? new Date(`${iso}T00:00:00Z`) : new Date();
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
};

export function Mobilization() {
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const project = useStore((s) => s.project);
  const profile = useStore((s) => s.settings.profile);
  const author = [profile?.nombre, roleLabel(profile?.rol ?? '', lang), profile?.organizacion].map((part) => part?.trim()).filter(Boolean).join(' · ');
  const notify = useStore((s) => s.notify);
  const { result } = useResult();
  const s = result.summary;
  const tickets = buildTickets(project.findings, project.assets, result);
  const [open, setOpen] = useState<string | null>(tickets[0]?.finding.id ?? null);
  const top = tickets.slice(0, 8);
  const slug = project.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';

  return (
    <>
      <TopBar
        title={c.mobTitle}
        subtitle={<><span>{c.mobSub}</span>{project.demo && <DemoBadge />}</>}
      />
      <div className="view-enter mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-8">
        {project.findings.length === 0 ? (
          <div className="panel"><Empty icon={<ListChecks />} title={c.nothingToMove} text={c.nothingToMoveText} /></div>
        ) : (
          <>
            {/* Informe ejecutivo (imprimible) */}
            <article className="panel print-area overflow-hidden" aria-label="Informe ejecutivo">
              <header className="flex flex-wrap items-end justify-between gap-3 px-6 pb-4 pt-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em]">Informe ejecutivo de exposición</h2>
                  <p className="print-muted mt-1 text-[0.8125rem] text-ink-3">{project.name} · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · motor {result.engine === 'ts' ? 'local' : 'API'} v{result.version}{author ? ` · ${author}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn no-print" onClick={() => window.print()}><Printer className="size-4" />Imprimir informe</button>
                  <button type="button" className="btn no-print" onClick={() => { download(`informe-${slug}-${stamp()}.md`, reportMarkdown(project, project.findings, project.assets, result, new Date(), author), 'text/markdown;charset=utf-8'); notify('Informe exportado en Markdown.'); }}><FileText className="size-4" />Informe .md</button>
                  {project.demo && <DemoBadge />}
                </div>
              </header>
              <div className="grid grid-cols-2 border-y border-hairline sm:grid-cols-4">
                {[
                  ['Índice de exposición', `${n1(s.exposureIndex)}`, '/100'],
                  ['Hallazgos abiertos', String(s.openFindings), `${s.byBand.critica} críticos · ${s.byBand.alta} altos`],
                  ['En CISA KEV', String(s.kevOpen), 'explotación activa'],
                  ['Rutas / estrangulamientos', `${s.attackPaths} / ${s.chokePoints}`, 'hacia joyas de la corona'],
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
                  <h3 className="title-md mb-2">Riesgos principales</h3>
                  <table className="table">
                    <thead><tr><th className="!px-0">#</th><th>Hallazgo</th><th>Activo</th><th>Prioridad</th><th className="text-right">SLA</th></tr></thead>
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
                  <h3 className="title-md mb-2">Puntos de estrangulamiento</h3>
                  <ul className="flex flex-col gap-2.5 text-[0.8125rem]">
                    {result.graph.chokePoints.slice(0, 6).map((c) => (
                      <li key={c.id} className="flex gap-3">
                        <span className="num w-10 shrink-0 font-semibold text-alta">{Math.round(c.share * 100)} %</span>
                        <span><span className="font-medium">{c.label}</span><span className="print-muted block text-xs text-ink-3">{c.kind === 'nodo' ? 'Nodo' : 'Arista'} en {c.paths} de {s.attackPaths} rutas</span></span>
                      </li>
                    ))}
                    {result.graph.chokePoints.length === 0 && <li className="text-ink-3">Ninguno identificado.</li>}
                  </ul>
                  <h3 className="title-md mb-1.5 mt-5">Recomendación</h3>
                  <p className="print-muted text-[0.8125rem] leading-relaxed text-ink-2">
                    Corregir primero los hallazgos sobre puntos de estrangulamiento y los incluidos en CISA KEV: cortan el mayor número de rutas hacia las joyas de la corona con el menor esfuerzo.
                    {s.mttrDays !== null && <> MTTR actual: <span className="num">{n1(s.mttrDays)}</span> días.</>}
                  </p>
                </section>
              </div>
            </article>

            {/* Guías y tickets */}
            <section className="panel no-print overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-4">
                <div>
                  <h2 className="title-md">Guías de remediación</h2>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-3">{tickets.length} tickets abiertos · SLA por banda: Crítica 3 d · Alta 14 d · Media 30 d · Baja 90 d</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn" onClick={() => { download(`tickets-${slug}-${stamp()}.csv`, ticketsCsv(project.findings, project.assets, result), 'text/csv;charset=utf-8'); notify('Tickets exportados en CSV (fórmulas neutralizadas).'); }}><FileSpreadsheet />Tickets CSV</button>
                  <button type="button" className="btn" onClick={() => { download(`tickets-${slug}-${stamp()}.md`, ticketsMarkdown(project.findings, project.assets, result), 'text/markdown;charset=utf-8'); notify('Tickets exportados en Markdown.'); }}><FileDown />Tickets .md</button>
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
                        <span className="num text-xs text-ink-2">vence {addDays(t.finding.detectedAt, t.scored.slaDays)}</span>
                        <ChevronDown className={`size-4 text-ink-4 transition-transform duration-200 ease-[var(--ease-out)] ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="view-enter grid grid-cols-1 gap-5 px-5 pb-5 pl-[4.75rem] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                          <div>
                            <div className="label mb-2 font-medium">Pasos</div>
                            <ol className="list-decimal space-y-1.5 pl-5 text-[0.8125rem] text-ink-2 marker:text-ink-4">{t.guide.steps.map((st) => <li key={st}>{st}</li>)}</ol>
                          </div>
                          <div className="flex flex-col gap-3">
                            <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                              <div><dt className="label">Responsable</dt><dd>{t.owner}</dd></div>
                              <div><dt className="label">Prioridad · SLA</dt><dd>{c.band[t.scored.band]} · <span className="num">{t.scored.slaDays}</span> {c.daysShort}</dd></div>
                            </dl>
                            <div>
                              <div className="label mb-1.5 flex items-center justify-between font-medium">Verificación<CopyButton text={t.guide.verify} /></div>
                              <pre className="code">{t.guide.verify}</pre>
                            </div>
                            <p className="text-xs text-ink-3">{t.scored.explanation.replace(/^Prioridad [^.]+\. /, 'Motivo: ')}</p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                {tickets.length === 0 && <li className="px-5 py-6 text-ink-3">No hay hallazgos abiertos: todos están mitigados o descartados.</li>}
              </ul>
            </section>
            <p className="no-print text-xs text-ink-4">Puntuaciones con una cifra decimal (p. ej. <span className="num">{fmt(92.5)}</span>). La exportación CSV antepone un apóstrofo a las celdas que empiezan por = + − @ para evitar la inyección de fórmulas.</p>
          </>
        )}
      </div>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm -my-1 h-6 px-2" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* sin permiso */ } }}>
      {done ? <Check /> : <Copy />}{done ? 'Copiado' : 'Copiar'}
    </button>
  );
}
