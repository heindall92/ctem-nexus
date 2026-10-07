import { Plus, Route, ShieldCheck, ShieldOff, Trash2, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttackGraph } from '../components/AttackGraph';
import { TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, SectionTitle } from '../components/ui';
import { useResult } from '../lib/analysis';
import { BAND_COLOR, n1 } from '../lib/format';
import { nextId, useStore } from '../store/store';
import { StatusPill } from './Prioritization';

export function AttackPaths() {
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
        <TopBar title="Rutas de ataque" subtitle="Validación: caminos desde Internet hasta las joyas de la corona" />
        <div className="view-enter mx-auto max-w-[1240px] px-8 py-7"><div className="panel"><Empty icon={<Route />} title="Sin grafo" text="Define activos (al menos uno expuesto a Internet y una joya de la corona con criticidad 5) para calcular rutas."><button type="button" className="btn btn-primary" onClick={() => setView('alcance')}>Ir a Alcance</button></Empty></div></div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Rutas de ataque"
        subtitle={<><span>{g.paths.length} rutas desde Internet hasta joyas de la corona · {g.chokePoints.filter((c) => c.kind === 'nodo').length} puntos de estrangulamiento</span>{project.demo && <DemoBadge />}</>}
      />
      <div className="view-enter mx-auto flex max-w-[1240px] flex-col gap-5 px-8 py-7">
        <div className="flex flex-col gap-5">
          <section className="panel overflow-hidden">
            <SectionTitle
              title="Grafo de ataque"
              detail="Aristas derivadas de los hallazgos y de las aristas manuales (discontinuas). Pulsa un nodo o una ruta para resaltarla."
              actions={(selPath !== null || focusNode) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelPath(null); setFocusNode(null); }}>Quitar resaltado</button>}
            />
            <div className="border-t border-hairline bg-ground/40 px-4 py-5">
              <AttackGraph graph={g} highlight={highlight} focusNode={focusNode} onNode={(id) => { setFocusNode(id); setSelPath(null); }} />
            </div>
            <div className="flex flex-wrap gap-4 border-t border-hairline px-5 py-2.5 text-xs text-ink-3">
              <Legend color="var(--color-alta)" text="Punto de estrangulamiento" />
              <Legend color="var(--color-accent)" text="Ruta seleccionada / joya de la corona" />
              <Legend color="var(--color-ink-4)" text="Arista" dashed={false} />
              <Legend color="var(--color-ink-4)" text="Arista manual" dashed />
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <section className="panel overflow-hidden">
              <SectionTitle title="Puntos de estrangulamiento" detail="Nodos y aristas presentes en ≥ 40 % de las rutas. Cortarlos rompe la mayoría de caminos." />
              <ul className="divide-hair border-t border-hairline">
                {g.chokePoints.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="row-interactive flex w-full items-center gap-3 px-5 py-2.5 text-left" onClick={() => { setSelPath(null); setFocusNode(c.kind === 'nodo' ? c.id : c.id.split('->')[1]); }}>
                      <span className="num w-11 text-[0.9375rem] font-semibold text-alta">{Math.round(c.share * 100)} %</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-medium">{c.label}</span>
                        <span className="block text-xs text-ink-3">{c.kind === 'nodo' ? 'Nodo' : 'Arista'} · {c.paths} de {g.paths.length} rutas</span>
                      </span>
                    </button>
                  </li>
                ))}
                {g.chokePoints.length === 0 && <li className="px-5 py-4 text-ink-3">Ninguno con los datos actuales.</li>}
              </ul>
            </section>
            <section className="panel overflow-hidden">
              <SectionTitle title="Rutas" detail={focusNode ? `Que pasan por ${label.get(focusNode)}` : g.truncated ? 'Lista truncada: demasiadas rutas' : 'Ordenadas por descubrimiento'} />
              <ol className="max-h-[340px] divide-hair overflow-auto border-t border-hairline">
                {visiblePaths.map(({ p, i }) => (
                  <li key={i}>
                    <button type="button" aria-pressed={selPath === i} onClick={() => setSelPath(selPath === i ? null : i)} className="row-interactive flex w-full gap-3 px-5 py-2.5 text-left aria-pressed:bg-[rgb(61_220_196/0.07)]">
                      <span className="num w-5 pt-px text-xs text-ink-4">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-ink-2">
                        {p.nodes.map((n, k) => <span key={n}>{k > 0 && <span className="px-1 text-ink-4">→</span>}<span className={k === p.nodes.length - 1 ? 'text-accent' : ''}>{label.get(n)}</span></span>)}
                      </span>
                      <span className="num text-xs text-ink-3">{p.length} saltos</span>
                    </button>
                  </li>
                ))}
                {visiblePaths.length === 0 && <li className="px-5 py-4 text-ink-3">No hay rutas{focusNode ? ' por este nodo' : ''}. Revisa que haya activos expuestos y joyas de la corona.</li>}
              </ol>
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="panel overflow-hidden">
            <SectionTitle title="Validación de hallazgos" detail="Confirma con pruebas controladas si cada hallazgo es explotable. «No explotable» elimina su arista del grafo y reduce su puntuación (×0,25); «Validado» suma 5 puntos." />
            <div className="overflow-x-auto border-t border-hairline">
              <table className="table">
                <thead><tr><th>Puntuación</th><th>Hallazgo</th><th>Movimiento que habilita</th><th>Estado</th><th className="text-right">Validación</th></tr></thead>
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
                            <button type="button" className="btn btn-sm" aria-pressed={f.status === 'validado'} disabled={f.status === 'validado'} onClick={() => { setStatus(f.id, 'validado'); notify(`${f.id} validado como explotable.`); }}><ShieldCheck />Validado</button>
                            <button type="button" className="btn btn-sm" disabled={f.status === 'no_explotable'} onClick={() => { setStatus(f.id, 'no_explotable'); notify(`${f.id} marcado como no explotable.`, 'info'); }}><ShieldOff />No explotable</button>
                            {f.status !== 'abierto' && <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Volver a abierto" title="Volver a abierto" onClick={() => setStatus(f.id, 'abierto')}><Undo2 /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {toValidate.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-ink-3">No hay hallazgos pendientes de validar.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <SectionTitle title="Aristas manuales" detail="Relaciones conocidas que no salen de un hallazgo (confianzas, credenciales compartidas…)." />
            <form className="flex flex-col gap-2 border-t border-hairline px-5 py-3" onSubmit={(e) => {
              e.preventDefault();
              if (!from || !to || from === to) return;
              addEdge({ id: nextId('e', project.edges.map((x) => x.id), 2), from, to, technique: tech.trim() || 'Movimiento lateral' });
              notify('Arista añadida al grafo.'); setTech('');
            }}>
              <select className="field" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Origen">
                <option value="">Origen…</option>
                <option value="internet">Internet</option>
                {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="field" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Destino">
                <option value="">Destino…</option>
                {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input className="field" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Técnica (p. ej. reutilización de credenciales)" aria-label="Técnica" />
              <button type="submit" className="btn" disabled={!from || !to || from === to}><Plus />Añadir arista</button>
            </form>
            <ul className="divide-hair border-t border-hairline">
              {project.edges.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-5 py-2.5 text-xs">
                  <span className="min-w-0 flex-1"><span className="text-ink">{label.get(e.from) ?? e.from} → {label.get(e.to) ?? e.to}</span><span className="block truncate text-ink-3">{e.technique}</span></span>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label="Eliminar arista" onClick={() => delEdge(e.id)}><Trash2 /></button>
                </li>
              ))}
              {project.edges.length === 0 && <li className="px-5 py-3 text-xs text-ink-3">Sin aristas manuales.</li>}
            </ul>
          </section>
        </div>
        {toValidate.length > 0 && <p className="text-xs text-ink-4">Bandas: <BandBadge band="critica" /> ≥ 80 · <BandBadge band="alta" /> ≥ 60 · <BandBadge band="media" /> ≥ 40 · <BandBadge band="baja" /> &lt; 40</p>}
      </div>
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
