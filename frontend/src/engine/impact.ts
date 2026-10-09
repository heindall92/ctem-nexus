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
