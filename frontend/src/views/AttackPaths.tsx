import { Plus, Route, ShieldCheck, ShieldOff, Trash2, Undo2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttackGraph } from '../components/AttackGraph';
import { BloodHoundUploader } from '../components/BloodHoundUploader';
import { Modal, TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, PageHeader, SectionTitle } from '../components/ui';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, n1 } from '../lib/format';
import { screen, useL } from '../i18n';
import { nextId, useStore } from '../store/store';
import { StatusPill } from './Prioritization';

export function AttackPaths() {
  const c = screen[useStore((s) => s.lang)];
  const L = useL();
  const project = useStore((s) => s.project);
  const setStatus = useStore((s) => s.setStatus);
  const notify = useStore((s) => s.notify);
  const addEdge = useStore((s) => s.addEdge);
  const delEdge = useStore((s) => s.deleteEdge);
  const setView = useStore((s) => s.setView);
  const { result } = useResult();
  const g = result.graph;
  const [selPath, setSelPath] = useState<number | null>(null);
  const [focusNode, setFocusNode] = useState<string | null>(null);
  const [showBloodhound, setShowBloodhound] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tech, setTech] = useState('');

  const label = useMemo(() => new Map(g.nodes.map((n) => [n.id, n.label])), [g.nodes]);
  const visiblePaths = g.paths.map((p, i) => ({ p, i })).filter(({ p }) => !focusNode || p.nodes.includes(focusNode));
  const highlight = useMemo(() => {
    const ids = new Set<string>();
    const list = selPath !== null ? [g.paths[selPath]].filter(Boolean) : focusNode ? g.paths.filter((p) => p.nodes.includes(focusNode)) : [];
    if (!list.length) return focusNode ? new Set([focusNode]) : null;
    for (const p of list) p.nodes.forEach((n, k) => { ids.add(n); if (k) ids.add(`${p.nodes[k - 1]}->${n}`); });
    return ids;
  }, [selPath, focusNode, g.paths]);

  const fById = new Map(project.findings.map((f) => [f.id, f]));
  const edgeFindings = new Set(g.edges.flatMap((e) => e.findingIds));
  const toValidate = result.scored.filter((s) => {
    const f = fById.get(s.id);
    return f && f.status !== 'mitigado' && (edgeFindings.has(s.id) || f.leadsTo?.length || (s.onAttackPath && (s.band === 'critica' || s.band === 'alta')));
  });

  if (project.assets.length === 0) {
    return (
      <>
        <TopBar title={c.pathsTitle} />
        <div className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-8"><PageHeader icon={<Route />} eyebrow={L('Fase 4 · Validación', 'Stage 4 · Validation')} title={c.pathsTitle} lead={c.pathsSub} /><div className="panel mt-5"><Empty icon={<Route />} title={c.noGraph} text={c.noGraphText}><button type="button" className="btn btn-primary" onClick={() => setView('alcance')}>{c.goScope}</button></Empty></div></div>
      </>
    );
  }

  return (
    <>
      <TopBar title={c.pathsTitle} />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 sm:px-8">
        <PageHeader
          icon={<Route />}
          eyebrow={L('Fase 4 · Validación', 'Stage 4 · Validation')}
          title={c.pathsTitle}
          badge={project.demo ? <DemoBadge /> : undefined}
          lead={L(`${g.paths.length} rutas desde Internet hasta los activos críticos y ${g.chokePoints.length} puntos de estrangulamiento. Valida cada hallazgo para confirmar o descartar sus rutas.`, `${g.paths.length} paths from the Internet to the critical assets and ${g.chokePoints.length} choke points. Validate each finding to confirm or rule out its paths.`)}
          actions={<button type="button" className="btn" onClick={() => setShowBloodhound(true)}><Users className="size-4" />{L('Importar BloodHound (AD)', 'Import BloodHound (AD)')}</button>}
        />
        <div className="flex flex-col gap-5">
          <section className="panel overflow-hidden">
            <SectionTitle
              title={L('Grafo de ataque', 'Attack graph')}
              detail={L('Aristas derivadas de los hallazgos y de las aristas manuales. Pulsa un nodo o una ruta para resaltarla.', 'Edges derived from findings and manual edges. Select a node or a path to highlight it.')}
              actions={
                <div className="flex items-center gap-2 flex-wrap">
                  {(selPath !== null || focusNode) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelPath(null); setFocusNode(null); }}>{L('Quitar resaltado', 'Clear highlight')}</button>}
                </div>
              }
            />
            <div className="border-t border-hairline bg-ground/40 px-4 py-5">
              <AttackGraph graph={g} highlight={highlight} focusNode={focusNode} onNode={(id) => { setFocusNode(id); setSelPath(null); }} />
            </div>
            <div className="flex flex-wrap gap-4 border-t border-hairline px-5 py-2.5 text-xs text-ink-3">
              <Legend color="var(--color-alta)" text={L('Punto de estrangulamiento', 'Choke point')} />
              <Legend color="var(--color-accent)" text={L('Ruta seleccionada / activo crítico', 'Selected path / critical asset')} />
              <Legend color="var(--color-ink-4)" text={L('Arista', 'Edge')} dashed={false} />
              <Legend color="var(--color-ink-4)" text={L('Arista manual', 'Manual edge')} dashed />
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <section className="panel overflow-hidden">
              <SectionTitle title={L('Puntos de estrangulamiento', 'Choke points')} detail={L('Nodos y aristas presentes en ≥ 40 % de las rutas. Cortarlos rompe la mayoría de caminos.', 'Nodes and edges present in ≥ 40 % of paths. Cutting them breaks most routes.')} />
              <ul className="divide-hair border-t border-hairline">
                {g.chokePoints.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="row-interactive flex w-full items-center gap-3 px-5 py-2.5 text-left" onClick={() => { setSelPath(null); setFocusNode(c.kind === 'nodo' ? c.id : c.id.split('->')[1]); }}>
                      <span className="num w-11 text-[0.9375rem] font-semibold text-alta">{Math.round(c.share * 100)} %</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-medium">{c.label}</span>
                        <span className="block text-xs text-ink-3">{c.kind === 'nodo' ? L('Nodo', 'Node') : L('Arista', 'Edge')} · {L(`${c.paths} de ${g.paths.length} rutas`, `${c.paths} of ${g.paths.length} paths`)}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {g.chokePoints.length === 0 && <li className="px-5 py-4 text-ink-3">{L('Ninguno con los datos actuales.', 'None with the current data.')}</li>}
              </ul>
            </section>
            <section className="panel overflow-hidden">
              <SectionTitle title={L('Rutas', 'Paths')} detail={focusNode ? L(`Que pasan por ${label.get(focusNode)}`, `Going through ${label.get(focusNode)}`) : g.truncated ? L('Lista truncada: demasiadas rutas', 'Truncated list: too many paths') : L('Ordenadas por descubrimiento', 'In discovery order')} />
              <ol className="max-h-[340px] divide-hair overflow-auto border-t border-hairline">
                {visiblePaths.map(({ p, i }) => (
                  <li key={i}>
                    <button type="button" data-testid="ruta" aria-pressed={selPath === i} onClick={() => setSelPath(selPath === i ? null : i)} className="row-interactive flex w-full gap-3 px-5 py-2.5 text-left aria-pressed:bg-accent/10">
                      <span className="num w-5 pt-px text-xs text-ink-3">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-ink-2">
                        {p.nodes.map((n, k) => <span key={n}>{k > 0 && <span className="px-1 text-ink-3">→</span>}<span className={k === p.nodes.length - 1 ? 'text-accent' : ''}>{label.get(n)}</span></span>)}
                      </span>
                      <span className="num text-xs text-ink-3">{p.length} {p.length === 1 ? L('salto', 'hop') : L('saltos', 'hops')}</span>
                    </button>
                  </li>
                ))}
                {visiblePaths.length === 0 && <li className="px-5 py-4 text-ink-3">{focusNode ? L('No hay rutas por este nodo.', 'No paths through this node.') : L('No hay rutas.', 'No paths.')} {L('Revisa que haya activos expuestos y activos críticos.', 'Check that there are exposed assets and critical assets.')}</li>}
              </ol>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="panel overflow-hidden">
            <SectionTitle title={L('Validación de hallazgos', 'Finding validation')} detail={L('Confirma con pruebas controladas si cada hallazgo es explotable. «No explotable» elimina su arista del grafo y reduce su puntuación (×0,25); «Validado» suma 5 puntos.', 'Confirm with controlled tests whether each finding is exploitable. “Not exploitable” removes its edge from the graph and lowers its score (×0.25); “Validated” adds 5 points.')} />
            <div className="overflow-x-auto border-t border-hairline">
              <table className="table">
                <thead><tr><th>{L('Puntuación', 'Score')}</th><th>{L('Hallazgo', 'Finding')}</th><th>{L('Movimiento que habilita', 'Movement it enables')}</th><th>{L('Estado', 'Status')}</th><th className="text-right">{L('Validación', 'Validation')}</th></tr></thead>
                <tbody>
                  {toValidate.map((s) => {
                    const f = fById.get(s.id)!;
                    return (
                      <tr key={s.id}>
                        <td><span className="num font-semibold" style={{ color: BAND_COLOR[s.band] }}>{n1(s.score)}</span></td>
                        <td className="max-w-[18rem]"><div className="truncate font-medium">{f.title}</div><div className="num text-xs text-ink-3">{f.id}{f.cve ? ` · ${f.cve}` : ''}</div></td>
                        <td className="max-w-[16rem] text-xs text-ink-2"><div className="line-clamp-2">{f.technique || '—'}</div></td>
                        <td><StatusPill status={f.status} /></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button type="button" className="btn btn-sm" aria-pressed={f.status === 'validado'} disabled={f.status === 'validado'} onClick={() => { setStatus(f.id, 'validado'); notify(L(`${f.id} validado como explotable.`, `${f.id} validated as exploitable.`)); }}><ShieldCheck />{L('Validado', 'Validated')}</button>
                            <button type="button" className="btn btn-sm" disabled={f.status === 'no_explotable'} onClick={() => { setStatus(f.id, 'no_explotable'); notify(L(`${f.id} marcado como no explotable.`, `${f.id} marked as not exploitable.`), 'info'); }}><ShieldOff />{L('No explotable', 'Not exploitable')}</button>
                            {f.status !== 'abierto' && <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={L('Volver a abierto', 'Reopen')} title={L('Volver a abierto', 'Reopen')} onClick={() => setStatus(f.id, 'abierto')}><Undo2 /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {toValidate.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-ink-3">{L('No hay hallazgos pendientes de validar.', 'No findings pending validation.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <SectionTitle title={L('Aristas manuales', 'Manual edges')} detail={L('Relaciones conocidas que no salen de un hallazgo (confianzas, credenciales compartidas…).', 'Known relationships that do not come from a finding (trusts, shared credentials…).')} />
            <form className="flex flex-col gap-2 border-t border-hairline px-5 py-3" onSubmit={(e) => {
              e.preventDefault();
              if (!from || !to || from === to) return;
              addEdge({ id: nextId('e', project.edges.map((x) => x.id), 2), from, to, technique: tech.trim() || L('Movimiento lateral', 'Lateral movement') });
              notify(L('Arista añadida al grafo.', 'Edge added to the graph.')); setTech('');
            }}>
              <select className="field" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={L('Origen', 'Source')}>
                <option value="">{L('Origen…', 'Source…')}</option>
                <option value="internet">Internet</option>
                {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="field" value={to} onChange={(e) => setTo(e.target.value)} aria-label={L('Destino', 'Target')}>
                <option value="">{L('Destino…', 'Target…')}</option>
                {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input className="field" value={tech} onChange={(e) => setTech(e.target.value)} placeholder={L('Técnica (p. ej. reutilización de credenciales)', 'Technique (e.g. credential reuse)')} aria-label={L('Técnica', 'Technique')} />
              <button type="submit" className="btn" disabled={!from || !to || from === to}><Plus />{L('Añadir arista', 'Add edge')}</button>
            </form>
            <ul className="divide-hair border-t border-hairline">
              {project.edges.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-5 py-2.5 text-xs">
                  <span className="min-w-0 flex-1"><span className="text-ink">{label.get(e.from) ?? e.from} → {label.get(e.to) ?? e.to}</span><span className="block truncate text-ink-3">{e.technique}</span></span>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={L('Eliminar arista', 'Delete edge')} onClick={() => delEdge(e.id)}><Trash2 /></button>
                </li>
              ))}
              {project.edges.length === 0 && <li className="px-5 py-3 text-xs text-ink-3">{L('Sin aristas manuales.', 'No manual edges.')}</li>}
            </ul>
          </section>
        </div>
        {toValidate.length > 0 && <p className="text-xs text-ink-3">{L('Bandas', 'Bands')}: <BandBadge band="critica" /> ≥ 80 · <BandBadge band="alta" /> ≥ 60 · <BandBadge band="media" /> ≥ 40 · <BandBadge band="baja" /> &lt; 40</p>}
      </div>

      <Modal open={showBloodhound} onClose={() => setShowBloodhound(false)} title={L('Ingesta de rutas de Active Directory (BloodHound)', 'Active Directory path intake (BloodHound)')} maxWidth={680}>
        <BloodHoundUploader onDone={() => setShowBloodhound(false)} />
      </Modal>
    </>
  );
}

function Legend({ color, text, dashed }: { color: string; text: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} /></svg>
      {text}
    </span>
  );
}
