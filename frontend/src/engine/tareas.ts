/* Tareas pesadas que van al Web Worker: calcular el motor, leer un proyecto y leer un escaneo o un catálogo.
 * Sin DOM: el Worker solo las conecta con postMessage, y las pruebas las llaman directamente en Node.
 *
 * Los ficheros llegan como File (o Blob): se leen aquí, de modo que el texto de un Nessus de 300 MB nunca pasa por
 * la página. Solo vuelve el resultado ya saneado. */
import { prioritize } from './engine';
import { parseProject, type Project } from './io';
import { gunzipText, parseEpss, parseKev, type EpssCatalog, type KevCatalog } from './intel';
import { detectFormat, parseScan, resumenEscaneo, UMBRAL_RESUMEN, type DetectedFormat, type ResumenEscaneo, type ScanParse } from './scanners';
import type { EngineInput, EngineResult } from './types';
import { alAvanzar } from './xml';

/** Máximo de un fichero importado. Antes eran 10 MB (proyectos) y 60 MB (escáneres). */
export const MAX_FICHERO = 400 * 1024 * 1024;

export type Peticion =
  | { id: number; tipo: 'motor'; input: EngineInput }
  | { id: number; tipo: 'proyecto'; archivo: Blob }
  | { id: number; tipo: 'escaneo'; archivo: Blob; nombre: string };

export type Lectura =
  | { kind: 'scan'; parse: ScanParse; resumen: ResumenEscaneo | null }
  | { kind: 'kev'; kev: KevCatalog }
  | { kind: 'epss'; epss: EpssCatalog }
  | { kind: 'otro'; fmt: DetectedFormat };

export interface Progreso { fase: 'leyendo' | 'analizando'; hecho?: number; total?: number }

export type Respuesta =
  | { id: number; result: EngineResult | Project | null | Lectura }
  | { id: number; error: string }
  | { id: number; progreso: Progreso };

async function texto(archivo: Blob, nombre = ''): Promise<string> {
  if (archivo.size > MAX_FICHERO) throw new Error(`El archivo supera el máximo de ${Math.round(MAX_FICHERO / 1048576)} MB.`);
  if (/\.gz$/i.test(nombre)) return gunzipText(await archivo.arrayBuffer());
  return archivo.text();
}

/** Lee un escaneo o un catálogo de inteligencia y dice qué es. Con más de UMBRAL_RESUMEN resultados, adjunta el resumen. */
export function leerEscaneo(text: string, nombre: string): Lectura {
  const fmt = detectFormat(text, nombre.replace(/\.gz$/i, ''));
  if (fmt === 'kev') return { kind: 'kev', kev: parseKev(text) };
  if (fmt === 'epss') return { kind: 'epss', epss: parseEpss(text) };
  if (['nmap', 'bloodhound', 'proyecto', 'desconocido'].includes(fmt)) return { kind: 'otro', fmt };
  const parse = parseScan(text, nombre);
  return { kind: 'scan', parse, resumen: parse.items.length > UMBRAL_RESUMEN ? resumenEscaneo(parse) : null };
}

/** Atiende una petición. `avisar` recibe el progreso (fase y, al analizar XML por partes, bytes recorridos). */
export async function atender(p: Peticion, avisar: (pr: Progreso) => void = () => {}): Promise<EngineResult | Project | null | Lectura> {
  if (p.tipo === 'motor') return prioritize(p.input);
  avisar({ fase: 'leyendo', hecho: 0, total: p.archivo.size });
  const t = await texto(p.archivo, p.tipo === 'escaneo' ? p.nombre : '');
  avisar({ fase: 'analizando', hecho: 0, total: t.length });
  if (p.tipo === 'proyecto') return parseProject(t);
  alAvanzar((hecho, total) => avisar({ fase: 'analizando', hecho, total }));
  try { return leerEscaneo(t, p.nombre); } finally { alAvanzar(null); }
}
