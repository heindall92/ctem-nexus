/* Web Worker del motor: con proyectos grandes, el cálculo (350 ms con 50.000 hallazgos) no bloquea la interfaz.
 * Recibe la entrada del motor y devuelve el resultado; el último mensaje manda (los anteriores se descartan). */
import { prioritize } from './engine';
import type { EngineInput, EngineResult } from './types';

export interface PeticionMotor { id: number; input: EngineInput }
export type RespuestaMotor = { id: number; result: EngineResult } | { id: number; error: string };

const ctx = self as unknown as { onmessage: ((e: MessageEvent<PeticionMotor>) => void) | null; postMessage: (m: RespuestaMotor) => void };
ctx.onmessage = (e) => {
  const { id, input } = e.data;
  try { ctx.postMessage({ id, result: prioritize(input) }); } catch (err) { ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) }); }
};
