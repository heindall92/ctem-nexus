import { AppWindow, Cloud, Crown, Database, Globe, KeyRound, Monitor, Network, Server, ShieldCheck, User } from 'lucide-react';
import { useMemo, type ComponentType } from 'react';
import type { GraphAnalysis, GraphNode } from '../engine/types';

const ICON: Record<GraphNode['type'], ComponentType<{ x?: number; y?: number; width?: number; height?: number; color?: string; strokeWidth?: number }>> = {
  internet: Globe, servidor: Server, estacion: Monitor, aplicacion_web: AppWindow, base_datos: Database,
  controlador_dominio: KeyRound, pki: ShieldCheck, perimetro: Network, nube: Cloud, identidad: User,
};

const NW = 204;
const NH = 52;
const COL = 262;
const ROW = 78;
const PAD = 24;

/** Grafo de rutas de ataque en SVG puro: columnas por distancia desde Internet (BFS), sin dependencias. */
export function AttackGraph({ graph, highlight, focusNode, onNode }: {
  graph: GraphAnalysis;
  highlight: Set<string> | null; // ids de nodos y aristas de la ruta seleccionada
  focusNode: string | null;
  onNode: (id: string | null) => void;
}) {
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

  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full select-none" role="img" aria-label={`Grafo de ataque: ${graph.nodes.length} nodos, ${graph.edges.length} aristas, ${graph.paths.length} rutas`}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-ink-4)" /></marker>
        <marker id="arr-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-alta)" /></marker>
        <marker id="arr-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="var(--color-accent)" /></marker>
      </defs>
      {layout.unreachableCol !== null && (
        <text x={PAD + layout.unreachableCol * COL} y={14} fill="var(--color-ink-4)" fontSize={11}>Sin ruta desde Internet</text>
      )}
      <g fill="none">
        {graph.edges.map((e) => {
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
            <path key={e.id} d={d} className="g-edge" stroke={stroke} strokeWidth={sel ? 2.25 : hot ? 1.75 : 1.25} strokeDasharray={e.manual ? '4 4' : undefined}
              markerEnd={`url(#${sel ? 'arr-sel' : hot ? 'arr-hot' : 'arr'})`} opacity={dim(e.id) ? 0.14 : 1}>
              <title>{e.techniques.join(' · ')}{e.manual ? ' (arista manual)' : ''}</title>
            </path>
          );
        })}
      </g>
      {graph.nodes.map((n) => {
        const p = layout.pos.get(n.id)!;
        const Icon = ICON[n.type] ?? Server;
        const choke = chokeNodes.has(n.id);
        const sel = highlight?.has(n.id);
        const focused = focusNode === n.id;
        const ring = focused || sel ? 'var(--color-accent)' : choke ? 'var(--color-alta)' : n.crown ? 'color-mix(in oklab, var(--color-accent) 45%, transparent)' : 'var(--color-hairline-strong)';
        const count = graph.nodePathCount[n.id] ?? 0;
        return (
          <g key={n.id} className="g-node cursor-pointer" opacity={dim(n.id) ? 0.28 : 1} onClick={() => onNode(focused ? null : n.id)}
            role="button" tabIndex={0} aria-label={`${n.label}${n.crown ? ', joya de la corona' : ''}${choke ? ', punto de estrangulamiento' : ''}`}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onNode(focused ? null : n.id); } }}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={12} fill={n.id === 'internet' ? 'var(--color-surface-3)' : 'var(--color-surface-2)'} stroke={ring} strokeWidth={focused || choke || sel ? 1.75 : 1} />
            <Icon x={p.x + 12} y={p.y + NH / 2 - 9} width={18} height={18} color={n.crown ? 'var(--color-accent)' : choke ? 'var(--color-alta)' : 'var(--color-ink-2)'} strokeWidth={1.75} />
            <text x={p.x + 40} y={p.y + 22} fill="var(--color-ink)" fontSize={12} fontWeight={500}>{(() => { const max = n.crown ? 21 : 25; return n.label.length > max ? `${n.label.slice(0, max - 1)}…` : n.label; })()}</text>
            <text x={p.x + 40} y={p.y + 38} fill={choke ? 'var(--color-alta)' : 'var(--color-ink-3)'} fontSize={10.5}>
              {n.id === 'internet' ? 'Origen de las rutas' : choke ? `Estrangulamiento · ${count} rutas` : n.crown ? 'Joya de la corona' : n.entry ? 'Punto de entrada' : count ? `En ${count} rutas` : `Criticidad ${n.criticality}/5`}
            </text>
            {n.crown && <Crown x={p.x + NW - 22} y={p.y + 8} width={13} height={13} color="var(--color-accent)" strokeWidth={2} />}
          </g>
        );
      })}
    </svg>
  );
}
