/* Grafo legible con redes grandes. Con 2.000 activos, el grafo completo eran 20.000 elementos SVG en columnas de miles
 * de nodos: ilegible y 300 ms de maquetación. Por encima de MAX_NODOS_GRAFO se dibujan solo los nodos de las rutas más
 * cortas (las de menos saltos hasta un activo crítico) que quepan, y siempre los de la ruta o el nodo seleccionados.
 * La lista de rutas sigue teniéndolas todas. Sin DOM: se prueba en Node. */
import type { GraphAnalysis } from '../engine/types';

export const MAX_NODOS_GRAFO = 120;

export interface GrafoVisible { graph: GraphAnalysis; resumido: boolean; rutas: number }

export function grafoVisible(graph: GraphAnalysis, fijos: ReadonlySet<string> | null, max = MAX_NODOS_GRAFO): GrafoVisible {
  if (graph.nodes.length <= max) return { graph, resumido: false, rutas: graph.paths.length };
  const existe = new Set(graph.nodes.map((n) => n.id));
  const dentro = new Set<string>(['internet']);
  for (const id of fijos ?? []) if (existe.has(id)) dentro.add(id);
  // Rutas de más corta a más larga (a igualdad, en el orden del motor).
  const orden = graph.paths.map((_, i) => i).sort((a, b) => graph.paths[a].length - graph.paths[b].length || a - b);
  for (const i of orden) {
    const nuevos = graph.paths[i].nodes.filter((n) => !dentro.has(n));
    if (dentro.size + nuevos.length > max) continue;
    for (const n of nuevos) dentro.add(n);
    if (dentro.size >= max) break;
  }
  const paths = graph.paths.filter((p) => p.nodes.every((n) => dentro.has(n)));
  return {
    graph: { ...graph, nodes: graph.nodes.filter((n) => dentro.has(n.id)), edges: graph.edges.filter((e) => dentro.has(e.from) && dentro.has(e.to)), paths },
    resumido: true,
    rutas: paths.length,
  };
}
