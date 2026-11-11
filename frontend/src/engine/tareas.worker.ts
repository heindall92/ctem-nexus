/* Web Worker de CTEM-Nexus: el motor con proyectos grandes y la lectura de proyectos, escaneos y catálogos.
 * La interfaz no se congela; cada respuesta lleva el id de su petición (las del motor que llegan tarde se descartan). */
import { atender, type Peticion, type Respuesta } from './tareas';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<Peticion>) => void) | null; postMessage: (m: Respuesta) => void };
ctx.onmessage = (e) => {
  const p = e.data;
  atender(p, (progreso) => ctx.postMessage({ id: p.id, progreso }))
    .then((result) => ctx.postMessage({ id: p.id, result }))
    .catch((err: unknown) => ctx.postMessage({ id: p.id, error: err instanceof Error ? err.message : String(err) }));
};
