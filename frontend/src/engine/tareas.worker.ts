/* Web Worker de CTEM-Nexus. Guarda una copia del proyecto (que la página mantiene al día con lo que cambia) y calcula
 * sobre ella el motor, «¿Y si…?» y la comparación de perfiles; también lee proyectos, escaneos y catálogos.
 *
 * Los cálculos van por canales: si llega otro del mismo canal antes de empezar, el anterior se da por superado (con
 * 50.000 hallazgos, cada cálculo es un segundo: no tiene sentido hacer los que ya nadie espera). Las listas grandes
 * vuelven en trozos para que la página no se bloquee al recibirlas. */
import { atender, CopiaMotor, trocear, type Peticion, type Respuesta } from './tareas';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<Peticion>) => void) | null; postMessage: (m: Respuesta) => void };
const enviar = (id: number, result: unknown) => { for (const m of trocear(id, result)) ctx.postMessage(m); };
const fallo = (id: number, err: unknown) => ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });

const copia = new CopiaMotor();
const pendientes = new Map<string, Extract<Peticion, { tipo: 'calcular' }>>();
let programado = false;

function procesar() {
  programado = false;
  for (const [canal, p] of [...pendientes]) {
    pendientes.delete(canal);
    try { enviar(p.id, copia.calcular(p)); } catch (err) { fallo(p.id, err); }
  }
}

ctx.onmessage = (e) => {
  const p = e.data;
  if (copia.aplicar(p)) return;
  if (p.tipo === 'calcular') {
    const antes = pendientes.get(p.canal);
    if (antes) ctx.postMessage({ id: antes.id, superado: true });
    pendientes.set(p.canal, p);
    // Se calcula en la tarea siguiente: así da tiempo a que llegue un cálculo más nuevo del mismo canal.
    if (!programado) { programado = true; setTimeout(procesar, 0); }
    return;
  }
  if (p.tipo === 'base' || p.tipo === 'parche') return;
  atender(p, (progreso) => ctx.postMessage({ id: p.id, progreso }))
    .then((result) => enviar(p.id, result))
    .catch((err: unknown) => fallo(p.id, err));
};
