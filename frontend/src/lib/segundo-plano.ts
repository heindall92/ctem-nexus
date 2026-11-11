/* Cliente del Web Worker para las importaciones: cada tarea va en un Worker propio, de modo que «Cancelar» lo
 * termina al instante sin tocar el cálculo del motor. Si el navegador no permite Workers, se hace aquí mismo. */
import { atender, type Lectura, type Peticion, type Progreso, type Respuesta } from '../engine/tareas';
import type { Project } from '../engine/io';
import Trabajador from '../engine/tareas.worker?worker&inline';

type SinId<T> = T extends unknown ? Omit<T, 'id'> : never;
interface Opciones { signal?: AbortSignal; alAvanzar?: (p: Progreso) => void }

const cancelado = () => new DOMException('Cancelado', 'AbortError');

function ejecutar<T>(peticion: SinId<Peticion>, { signal, alAvanzar }: Opciones = {}): Promise<T> {
  if (signal?.aborted) return Promise.reject(cancelado());
  let w: Worker;
  try { w = new Trabajador(); } catch {
    return atender({ ...peticion, id: 0 } as Peticion, alAvanzar) as Promise<T>;
  }
  return new Promise<T>((ok, ko) => {
    const fin = () => { w.terminate(); signal?.removeEventListener('abort', alCancelar); };
    const alCancelar = () => { fin(); ko(cancelado()); };
    signal?.addEventListener('abort', alCancelar, { once: true });
    w.onmessage = (e: MessageEvent<Respuesta>) => {
      const r = e.data;
      if ('progreso' in r) { alAvanzar?.(r.progreso); return; }
      fin();
      if ('error' in r) ko(new Error(r.error)); else ok(r.result as T);
    };
    w.onerror = (e) => { e.preventDefault(); fin(); ko(new Error(e.message || 'Error en segundo plano')); };
    w.postMessage({ ...peticion, id: 1 });
  });
}

export const leerProyectoEnSegundoPlano = (archivo: Blob, o?: Opciones) => ejecutar<Project | null>({ tipo: 'proyecto', archivo }, o);
export const leerEscaneoEnSegundoPlano = (archivo: File, o?: Opciones) => ejecutar<Lectura>({ tipo: 'escaneo', archivo, nombre: archivo.name }, o);
export const esCancelacion = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';
