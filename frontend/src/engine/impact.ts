/* Impacto de corregir un hallazgo: cuántas rutas de ataque hacia los activos críticos dejan de existir. Sin DOM. */
import type { GraphAnalysis } from './types';

/** Aristas que desaparecen al corregir estos hallazgos: las que solo se apoyaban en ellos (y no son manuales). */
export function edgesCutBy(graph: GraphAnalysis, findingIds: Iterable<string>): Set<string> {
  const ids = new Set(findingIds);
  return new Set(graph.edges.filter((e) => !e.manual && e.findingIds.length > 0 && e.findingIds.every((f) => ids.has(f))).map((e) => e.id));
}

/** Rutas que se rompen (alguna de sus aristas desaparece) al corregir los hallazgos dados. */
export function pathsBrokenBy(graph: GraphAnalysis, findingIds: Iterable<string>): number {
  const cut = edgesCutBy(graph, findingIds);
  if (!cut.size) return 0;
  return graph.paths.filter((p) => p.nodes.some((n, i) => i > 0 && cut.has(`${p.nodes[i - 1]}->${n}`))).length;
}

const porSolo = new WeakMap<GraphAnalysis, Map<string, number>>();

/**
 * Para cada hallazgo, cuántas rutas se rompen si se corrige él solo: lo mismo que pathsBrokenBy(graph, [id]) para
 * todos a la vez. Se calcula una vez por grafo (Inicio y «¿Y si…?» lo preguntan por cada fila: con 50.000 hallazgos,
 * recorrer aristas y rutas por fila costaba más de medio segundo).
 */
export function rutasRotasPorSolo(graph: GraphAnalysis): Map<string, number> {
  const hecho = porSolo.get(graph);
  if (hecho) return hecho;
  // Aristas que caen con un único hallazgo: las no manuales cuyos hallazgos son todos el mismo.
  const aristasDe = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.manual || !e.findingIds.length || !e.findingIds.every((f) => f === e.findingIds[0])) continue;
    const l = aristasDe.get(e.findingIds[0]);
    if (l) l.push(e.id); else aristasDe.set(e.findingIds[0], [e.id]);
  }
  // Arista → rutas que la recorren.
  const rutasDe = new Map<string, number[]>();
  graph.paths.forEach((p, i) => {
    for (let k = 1; k < p.nodes.length; k++) {
      const id = `${p.nodes[k - 1]}->${p.nodes[k]}`;
      const l = rutasDe.get(id);
      if (!l) rutasDe.set(id, [i]); else if (l[l.length - 1] !== i) l.push(i);
    }
  });
  const out = new Map<string, number>();
  for (const [f, aristas] of aristasDe) {
    const rotas = new Set<number>();
    for (const a of aristas) for (const r of rutasDe.get(a) ?? []) rotas.add(r);
    if (rotas.size) out.set(f, rotas.size);
  }
  porSolo.set(graph, out);
  return out;
}
