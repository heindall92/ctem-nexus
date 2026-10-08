import { AppWindow, Cloud, Crown, Database, Focus, Globe, KeyRound, Maximize2, Monitor, Network, Server, ShieldCheck, User, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import type { GraphAnalysis, GraphNode } from '../engine/types';
import { useL } from '../i18n';
import { wrapLabel } from '../lib/format';

const ICON: Record<GraphNode['type'], ComponentType<{ x?: number; y?: number; width?: number; height?: number; color?: string; strokeWidth?: number }>> = {
  internet: Globe, servidor: Server, estacion: Monitor, aplicacion_web: AppWindow, base_datos: Database,
  controlador_dominio: KeyRound, pki: ShieldCheck, perimetro: Network, nube: Cloud, identidad: User,
};

const NW = 204;
const NH = 64;
const COL = 262;
const ROW = 88;
const PAD = 24;

/** Grafo de rutas de ataque en SVG puro: columnas por distancia desde Internet (BFS), sin dependencias. */
export function AttackGraph({ graph, highlight, focusNode, onNode }: {
  graph: GraphAnalysis;
  highlight: Set<string> | null; // ids de nodos y aristas de la ruta seleccionada
  focusNode: string | null;
  onNode: (id: string | null) => void;
}) {
  const L = useL();
  const layout = useMemo(() => {
    const level = new Map<string, number>([['internet', 0]]);
    const q = ['internet'];
    for (let i = 0; i < q.length; i++) {
      for (const e of graph.edges) if (e.from === q[i] && !level.has(e.to)) { level.set(e.to, level.get(q[i])! + 1); q.push(e.to); }
    }
    const maxL = Math.max(0, ...level.values());
    const cols = new Map<number, GraphNode[]>();
    for (const n of graph.nodes) {
      const l = level.has(n.id) ? level.get(n.id)! : maxL + 1;
      cols.set(l, [...(cols.get(l) ?? []), n]);
    }
    const tallest = Math.max(...[...cols.values()].map((c) => c.length));
    const height = PAD * 2 + tallest * ROW - (ROW - NH);
    const pos = new Map<string, { x: number; y: number }>();
    for (const [l, nodes] of cols) {
      nodes.sort((a, b) => Number(a.crown) - Number(b.crown) || b.criticality - a.criticality || a.label.localeCompare(b.label, 'es'));
      const colH = nodes.length * ROW - (ROW - NH);
      nodes.forEach((n, i) => pos.set(n.id, { x: PAD + l * COL, y: (height - colH) / 2 + i * ROW }));
    }
    const width = PAD * 2 + Math.max(...cols.keys()) * COL + NW;
    return { pos, width, height, unreachableCol: cols.has(maxL + 1) ? maxL + 1 : null };
  }, [graph]);

  const chokeNodes = new Set(graph.chokePoints.filter((c) => c.kind === 'nodo').map((c) => c.id));
  const chokeEdges = new Set(graph.chokePoints.filter((c) => c.kind === 'arista').map((c) => c.id));
  const dim = (id: string) => (highlight ? !highlight.has(id) : focusNode ? false : false);
  // «Solo esta ruta»: oculta lo que no pertenece a la ruta o al nodo resaltado.
  const [only, setOnly] = useState(false);
  const hide = (id: string) => only && !!highlight && !highlight.has(id);

  // Zoom y desplazamiento: botones, Ctrl + rueda (y el pellizco del trackpad, que llega como Ctrl + rueda),
  // arrastre con el puntero y pellizco táctil con dos dedos.
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const clampK = (k: number) => Math.min(3, Math.max(1, k));
  const zoomAt = (factor: number, cx = 0.5, cy = 0.5) => setView((v) => {
    const k = clampK(v.k * factor);
    if (k === 1) return { k: 1, x: 0, y: 0 };
    // Mantiene fijo el punto (cx, cy) de la ventana, en unidades del viewBox.
    const px = cx * layout.width, py = cy * layout.height;
    return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k };
  });
  const toUnits = (dx: number) => (box.current ? (dx * layout.width) / box.current.clientWidth : dx);
  const onWheel = (e: RWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const onPointerDown = (e: RPointerEvent) => { pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) pinch.current = null; };
  const onPointerMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomAt(d / pinch.current);
      pinch.current = d;
    } else if (view.k > 1 && (e.buttons & 1)) {
      if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 0) box.current?.setPointerCapture?.(e.pointerId);
      setView((v) => ({ ...v, x: v.x + toUnits(e.clientX - prev.x), y: v.y + toUnits(e.clientY - prev.y) }));
    }
  };
  // Encuadre de la ruta resaltada: caja de sus nodos con margen, sin pasar de 3×.
  const fitTo = (ids: Set<string>) => {
    const ps = [...ids].map((id) => layout.pos.get(id)).filter((p): p is { x: number; y: number } => !!p);
    if (!ps.length) return { k: 1, x: 0, y: 0 };
    const x0 = Math.min(...ps.map((p) => p.x)) - PAD, x1 = Math.max(...ps.map((p) => p.x)) + NW + PAD;
    const y0 = Math.min(...ps.map((p) => p.y)) - PAD, y1 = Math.max(...ps.map((p) => p.y)) + NH + PAD;
    const k = clampK(Math.min(layout.width / (x1 - x0), layout.height / (y1 - y0)));
    return { k, x: (layout.width - (x0 + x1) * k) / 2, y: (layout.height - (y0 + y1) * k) / 2 };
  };
  // Al cambiar la ruta resaltada con «solo esta ruta» activo, se reencuadra; sin resaltado, se sale del modo.
  useEffect(() => {
    if (!highlight) { setOnly(false); setView({ k: 1, x: 0, y: 0 }); return; }
    if (only) setView(fitTo(highlight));
  }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPointerUp = (e: RPointerEvent) => { pointers.current.delete(e.pointerId); pinch.current = null; };

  return (
    <div className="relative pt-11">
    <div className="absolute right-0 top-0 z-[2] flex items-center gap-1 rounded-full bg-surface p-1 shadow-sm ring-1 ring-hairline-strong">
      {highlight && (
        <button type="button" className="graph-tool w-auto gap-1.5 px-2.5 text-xs font-medium" aria-pressed={only} onClick={() => { const next = !only; setOnly(next); setView(next ? fitTo(highlight) : { k: 1, x: 0, y: 0 }); }}>
          <Focus className="size-3.5" />{L('Solo esta ruta', 'This path only')}
        </button>
      )}
      <button type="button" className="graph-tool" aria-label={L('Acercar', 'Zoom in')} title={L('Acercar (Ctrl + rueda)', 'Zoom in (Ctrl + wheel)')} disabled={view.k >= 3} onClick={() => zoomAt(1.3)}><ZoomIn className="size-4" /></button>
      <button type="button" className="graph-tool" aria-label={L('Alejar', 'Zoom out')} title={L('Alejar', 'Zoom out')} disabled={view.k <= 1} onClick={() => zoomAt(1 / 1.3)}><ZoomOut className="size-4" /></button>
      <button type="button" className="graph-tool" aria-label={L('Ajustar a la vista', 'Fit to view')} title={L('Ajustar a la vista', 'Fit to view')} disabled={view.k === 1} onClick={() => setView({ k: 1, x: 0, y: 0 })}><Maximize2 className="size-4" /></button>
    </div>
    <div ref={box} className={`touch-pan-y overflow-hidden ${view.k > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ touchAction: view.k > 1 ? 'none' : 'pan-y' }}
      onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} data-zoom={view.k.toFixed(2)}>
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full select-none" role="group" aria-label={L(`Grafo de ataque: ${graph.nodes.length} nodos, ${graph.edges.length} aristas, ${graph.paths.length} rutas`, `Attack graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.paths.length} paths`)}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-ink-4)" /></marker>
        <marker id="arr-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-alta)" /></marker>
        <marker id="arr-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-accent)" /></marker>
      </defs>
      {layout.unreachableCol !== null && (
        <text x={PAD + layout.unreachableCol * COL} y={14} fill="var(--color-ink-3)" fontSize={11}>{L('Sin ruta desde Internet', 'No path from the Internet')}</text>
      )}
      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transition: pointers.current.size ? 'none' : 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
      <g fill="none">
        {graph.edges.filter((e) => !hide(e.id)).map((e) => {
          const a = layout.pos.get(e.from)!, b = layout.pos.get(e.to)!;
          const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
          let d: string;
          if (x2 > x1) { const c = Math.max(40, (x2 - x1) / 2); d = `M${x1} ${y1} C${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2 - 2} ${y2}`; }
          else if (a.x === b.x) { // misma columna: arco por la derecha
            const bulge = x1 + 30 + Math.abs(y2 - y1) * 0.15;
            d = `M${x1} ${y1} C${bulge} ${y1}, ${bulge} ${y2}, ${x1 + 2} ${y2}`;
          } else { // arista hacia atrás o en la misma columna: arco por debajo
            const sx = a.x + NW / 2, sy = a.y + NH, tx = b.x + NW / 2, ty = b.y + NH, dip = Math.max(sy, ty) + 34;
            d = `M${sx} ${sy} C${sx} ${dip}, ${tx} ${dip}, ${tx} ${ty + 2}`;
          }
          const sel = highlight?.has(e.id);
          const hot = chokeEdges.has(e.id);
          const stroke = sel ? 'var(--color-accent)' : hot ? 'var(--color-alta)' : 'var(--color-ink-4)';
          return (
            <path key={e.id} d={d} className={`g-edge ${sel ? 'path-flow' : ''}`} stroke={stroke} strokeWidth={sel ? 2.25 : hot ? 1.75 : 1.25} strokeDasharray={e.manual ? '4 4' : undefined}
              markerEnd={`url(#${sel ? 'arr-sel' : hot ? 'arr-hot' : 'arr'})`} opacity={dim(e.id) ? 0.14 : 1}>
              <title>{e.techniques.join(' · ')}{e.manual ? L(' (arista manual)', ' (manual edge)') : ''}</title>
            </path>
          );
        })}
      </g>
      {graph.nodes.filter((n) => !hide(n.id)).map((n) => {
        const p = layout.pos.get(n.id)!;
        const Icon = ICON[n.type] ?? Server;
        const choke = chokeNodes.has(n.id);
        const sel = highlight?.has(n.id);
        const focused = focusNode === n.id;
        const ring = focused || sel ? 'var(--color-accent)' : choke ? 'var(--color-alta)' : n.crown ? 'color-mix(in oklab, var(--color-accent) 45%, transparent)' : 'var(--color-hairline-strong)';
        const count = graph.nodePathCount[n.id] ?? 0;
        return (
          <g key={n.id} className="g-node cursor-pointer" opacity={dim(n.id) ? 0.28 : 1} onClick={() => onNode(focused ? null : n.id)}
            role="button" tabIndex={0} aria-label={`${n.label}${n.crown ? L(', joya de la corona', ', crown jewel') : ''}${choke ? L(', punto de estrangulamiento', ', choke point') : ''}`}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onNode(focused ? null : n.id); } }}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={12} fill={n.id === 'internet' ? 'var(--color-surface-3)' : 'var(--color-surface-2)'} stroke={ring} strokeWidth={focused || choke || sel ? 1.75 : 1} />
            <Icon x={p.x + 12} y={p.y + NH / 2 - 9} width={18} height={18} color={n.crown ? 'var(--color-accent)' : choke ? 'var(--color-alta)' : 'var(--color-ink-2)'} strokeWidth={1.75} />
            <title>{n.label}</title>
            {(() => {
              const [l1, l2] = wrapLabel(n.label, n.crown ? 21 : 24);
              return (
                <text x={p.x + 40} y={p.y + (l2 ? 19 : 26)} fill="var(--color-ink)" fontSize={12} fontWeight={500}>
                  {l1}
                  {l2 && <tspan x={p.x + 40} dy={14}>{l2}</tspan>}
                </text>
              );
            })()}
            <text x={p.x + 40} y={p.y + (n.label.length > (n.crown ? 21 : 24) ? 52 : 44)} fill={choke ? 'var(--color-alta)' : 'var(--color-ink-3)'} fontSize={10.5}>
              {n.id === 'internet' ? L('Origen de las rutas', 'Where paths start') : choke ? L(`Estrangulamiento · ${count} rutas`, `Choke point · ${count} paths`) : n.crown ? L('Joya de la corona', 'Crown jewel') : n.entry ? L('Punto de entrada', 'Entry point') : count ? L(`En ${count} rutas`, `On ${count} paths`) : L(`Criticidad ${n.criticality}/5`, `Criticality ${n.criticality}/5`)}
            </text>
            {n.crown && <Crown x={p.x + NW - 22} y={p.y + 8} width={13} height={13} color="var(--color-accent)" strokeWidth={2} />}
          </g>
        );
      })}
      </g>
    </svg>
    </div>
    </div>
  );
}
