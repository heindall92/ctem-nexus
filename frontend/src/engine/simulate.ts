/* Simulación «¿y si…?»: qué pasa con el índice, los críticos, el KEV y las rutas si se corrigen unos hallazgos.
 * No toca el proyecto: recalcula el motor con esos hallazgos como mitigados. El plan de corrección es voraz sobre el
 * grafo: en cada paso elige lo que más rutas rompe; si una arista depende de varios hallazgos, los propone juntos. */
import { isActive, prioritize } from './engine';
import { edgesCutBy } from './impact';
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

/**
 * Plan voraz: maximiza rutas rotas por paso; a igualdad, la puntuación más alta. Completa con los de más puntuación.
 *
 * Incremental (1.3.0). Antes, cada candidato de cada paso recalculaba desde cero las aristas cortadas y recorría todas
 * las rutas: con 5.000 hallazgos eran 12 s con la pestaña congelada. Ahora, al añadir hallazgos solo se miran las
 * aristas en las que participan, y de ellas las rutas que pasan por cada una. Mismo resultado, paso a paso (lo
 * comprueba la prueba contra la versión anterior en grafos aleatorios).
 */
export function fixPlan(result: EngineResult, findings: Finding[], limit = 10): FixPlan {
  const g = result.graph;
  const active = new Set<string>();
  for (const f of findings) if (isActive(f)) active.add(f.id);

  // Índices: aristas que se pueden cortar (no manuales, con hallazgos), por hallazgo; y rutas por arista.
  const cortables = g.edges.filter((e) => !e.manual && e.findingIds.length > 0);
  const aristasDe = new Map<string, number[]>();
  cortables.forEach((e, k) => { for (const f of e.findingIds) { const l = aristasDe.get(f); if (l) l.push(k); else aristasDe.set(f, [k]); } });
  const posArista = new Map(cortables.map((e, k) => [e.id, k]));
  const rutasDe: number[][] = cortables.map(() => []);
  g.paths.forEach((p, r) => {
    const vistas = new Set<number>();
    for (let i = 1; i < p.nodes.length; i++) {
      const k = posArista.get(`${p.nodes[i - 1]}->${p.nodes[i]}`);
      if (k !== undefined && !vistas.has(k)) { vistas.add(k); rutasDe[k].push(r); }
    }
  });
  const cortadaCon = (k: number, c: Set<string>, extra: Set<string>) => cortables[k].findingIds.every((f) => c.has(f) || extra.has(f));
  /** Rutas nuevas que se rompen si a los elegidos se suman estos hallazgos (sin modificar el estado). */
  const ganancia = (fresh: string[], elegidos: Set<string>, cortadas: Set<number>, rotas: Set<number>): { aristas: number[]; rutas: Set<number> } => {
    const extra = new Set(fresh);
    const aristas: number[] = [];
    const vistas = new Set<number>();
    const rutas = new Set<number>();
    for (const f of fresh) {
      for (const k of aristasDe.get(f) ?? []) {
        if (cortadas.has(k) || vistas.has(k) || !cortadaCon(k, elegidos, extra)) continue;
        aristas.push(k);
        vistas.add(k);
        for (const r of rutasDe[k]) if (!rotas.has(r)) rutas.add(r);
      }
    }
    return { aristas, rutas };
  };
  const allCut = g.paths.length ? ganancia([...active].filter((id) => aristasDe.has(id)), new Set(), new Set(), new Set()).rutas.size : 0;
  const score = new Map<string, number>();
  if (allCut) for (const s of result.scored) score.set(s.id, s.score);

  // Grupos candidatos: cada hallazgo suelto y, por cada arista, el conjunto de hallazgos activos que la sostienen.
  // Solo los que sostienen alguna arista: los demás no rompen rutas (ganancia 0) y no cambian la elección.
  const groups = new Map<string, string[]>();
  if (allCut) for (const id of active) if (aristasDe.has(id)) groups.set(id, [id]);
  if (allCut) for (const e of g.edges) {
    if (e.manual || e.findingIds.length < 2 || !e.findingIds.every((id) => active.has(id))) continue;
    const ids = [...e.findingIds].sort();
    groups.set(ids.join('+'), ids);
  }

  const chosen: string[] = [];
  const elegidos = new Set<string>();
  const cortadas = new Set<number>();
  const rotas = new Set<number>();
  const steps: PlanStep[] = [];
  let broken = 0;
  while (steps.length < limit && broken < allCut) {
    let best: { ids: string[]; gain: number; score: number; g: ReturnType<typeof ganancia> } | null = null;
    for (const ids of groups.values()) {
      const fresh = ids.filter((id) => !elegidos.has(id));
      if (!fresh.length) continue;
      const gg = ganancia(fresh, elegidos, cortadas, rotas);
      const gain = gg.rutas.size;
      if (gain <= 0) continue;
      const sc = Math.max(...fresh.map((id) => score.get(id) ?? 0));
      // Ganancia por hallazgo: un grupo de tres que rompe 3 rutas no gana a uno solo que rompe 2.
      const better = !best || gain / fresh.length > best.gain / best.ids.length || (gain / fresh.length === best.gain / best.ids.length && sc > best.score);
      if (better) best = { ids: fresh, gain, score: sc, g: gg };
    }
    if (!best) break;
    for (const id of best.ids) { chosen.push(id); elegidos.add(id); }
    for (const k of best.g.aristas) cortadas.add(k);
    for (const r of best.g.rutas) rotas.add(r);
    broken += best.gain;
    steps.push({ ids: best.ids, newlyBroken: best.gain, cumulativeBroken: broken, score: best.score });
  }
  for (const s of result.scored) {
    if (steps.length >= limit) break;
    if (!active.has(s.id) || elegidos.has(s.id)) continue;
    chosen.push(s.id);
    elegidos.add(s.id);
    steps.push({ ids: [s.id], newlyBroken: 0, cumulativeBroken: broken, score: s.score });
  }
  return { steps, totalPaths: g.paths.length, unbreakable: g.paths.length - allCut };
}

/** Aristas que desaparecen con estos hallazgos corregidos (para resaltarlas en el grafo). */
export const cutEdges = (result: EngineResult, fixed: Iterable<string>) => edgesCutBy(result.graph, fixed);
