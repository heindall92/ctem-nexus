/* Simulación «¿y si…?»: qué pasa con el índice, los críticos, el KEV y las rutas si se corrigen unos hallazgos.
 * No toca el proyecto: recalcula el motor con esos hallazgos como mitigados. El plan de corrección es voraz sobre el
 * grafo: en cada paso elige lo que más rutas rompe; si una arista depende de varios hallazgos, los propone juntos. */
import { isActive, prioritize } from './engine';
import { edgesCutBy, pathsBrokenBy } from './impact';
import type { EngineInput, EngineResult, Finding } from './types';

export function simulate(input: EngineInput, fixed: Iterable<string>): EngineResult {
  const ids = new Set(fixed);
  if (!ids.size) return prioritize(input);
  return prioritize({ ...input, findings: input.findings.map((f) => (ids.has(f.id) && isActive(f) ? { ...f, status: 'mitigado' as const } : f)) });
}

export interface PlanStep {
  /** Hallazgos que se corrigen en este paso (más de uno si solo juntos cortan una arista). */
  ids: string[];
  /** Rutas que se rompen por primera vez en este paso. */
  newlyBroken: number;
  /** Rutas rotas acumuladas tras este paso. */
  cumulativeBroken: number;
  /** Puntuación más alta del paso (para desempatar y mostrar). */
  score: number;
}

export interface FixPlan {
  steps: PlanStep[];
  totalPaths: number;
  /** Rutas que no se cortan corrigiendo hallazgos (dependen de aristas manuales). */
  unbreakable: number;
}

/** Plan voraz: maximiza rutas rotas por paso; a igualdad, la puntuación más alta. Completa con los de más puntuación. */
export function fixPlan(result: EngineResult, findings: Finding[], limit = 10): FixPlan {
  const g = result.graph;
  const score = new Map(result.scored.map((s) => [s.id, s.score]));
  const active = new Set(findings.filter(isActive).map((f) => f.id));
  const chosen: string[] = [];
  const steps: PlanStep[] = [];
  const allCut = pathsBrokenBy(g, active);
  let broken = 0;

  // Grupos candidatos: cada hallazgo suelto y, por cada arista, el conjunto de hallazgos activos que la sostienen.
  const groups = new Map<string, string[]>();
  for (const id of active) groups.set(id, [id]);
  for (const e of g.edges) {
    if (e.manual || e.findingIds.length < 2 || !e.findingIds.every((id) => active.has(id))) continue;
    const ids = [...e.findingIds].sort();
    groups.set(ids.join('+'), ids);
  }

  while (steps.length < limit && broken < allCut) {
    let best: { ids: string[]; gain: number; score: number } | null = null;
    for (const ids of groups.values()) {
      const fresh = ids.filter((id) => !chosen.includes(id));
      if (!fresh.length) continue;
      const gain = pathsBrokenBy(g, [...chosen, ...fresh]) - broken;
      if (gain <= 0) continue;
      const sc = Math.max(...fresh.map((id) => score.get(id) ?? 0));
      // Ganancia por hallazgo: un grupo de tres que rompe 3 rutas no gana a uno solo que rompe 2.
      const better = !best || gain / fresh.length > best.gain / best.ids.length || (gain / fresh.length === best.gain / best.ids.length && sc > best.score);
      if (better) best = { ids: fresh, gain, score: sc };
    }
    if (!best) break;
    chosen.push(...best.ids);
    broken += best.gain;
    steps.push({ ids: best.ids, newlyBroken: best.gain, cumulativeBroken: broken, score: best.score });
  }
  for (const s of result.scored) {
    if (steps.length >= limit) break;
    if (!active.has(s.id) || chosen.includes(s.id)) continue;
    chosen.push(s.id);
    steps.push({ ids: [s.id], newlyBroken: 0, cumulativeBroken: broken, score: s.score });
  }
  return { steps, totalPaths: g.paths.length, unbreakable: g.paths.length - allCut };
}

/** Aristas que desaparecen con estos hallazgos corregidos (para resaltarlas en el grafo). */
export const cutEdges = (result: EngineResult, fixed: Iterable<string>) => edgesCutBy(result.graph, fixed);
