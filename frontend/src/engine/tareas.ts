/* Tareas pesadas que van al Web Worker: calcular el motor, leer un proyecto y leer un escaneo o un catálogo.
 * Sin DOM: el Worker solo las conecta con postMessage, y las pruebas las llaman directamente en Node.
 *
 * Los ficheros llegan como File (o Blob): se leen aquí, de modo que el texto de un Nessus de 300 MB nunca pasa por
 * la página. Solo vuelve el resultado ya saneado. */
import { prioritize } from './engine';
import { simulate } from './simulate';
import { parseProject, type Project } from './io';
import { gunzipText, parseEpss, parseKev, type EpssCatalog, type KevCatalog } from './intel';
import { detectFormat, parseScan, resumenEscaneo, UMBRAL_RESUMEN, type DetectedFormat, type ResumenEscaneo, type ScanParse } from './scanners';
import type { Asset, EngineInput, EngineResult, Finding, ManualEdge, ProfileId, SlaPolicy } from './types';
import { alAvanzar } from './xml';

/** Máximo de un fichero importado. Antes eran 10 MB (proyectos) y 60 MB (escáneres). */
export const MAX_FICHERO = 400 * 1024 * 1024;

export type Peticion =
  | { id: number; tipo: 'motor'; input: EngineInput }
  // Copia del proyecto en el Worker: se manda entera (en trozos) una vez y después solo lo que cambia.
  | { id: number; tipo: 'base'; parte: 'inicio' }
  | { id: number; tipo: 'base'; parte: 'trozo'; findings: Finding[] }
  | { id: number; tipo: 'base'; parte: 'fin'; assets: Asset[]; edges: ManualEdge[] }
  | { id: number; tipo: 'parche'; longitud: number; cambios: [number, Finding][]; assets?: Asset[]; edges?: ManualEdge[] }
  | { id: number; tipo: 'calcular'; canal: string; profile: ProfileId; slaPolicy: SlaPolicy; fijados: string[] }
  | { id: number; tipo: 'proyecto'; archivo: Blob }
  | { id: number; tipo: 'escaneo'; archivo: Blob; nombre: string };

export type Lectura =
  | { kind: 'scan'; parse: ScanParse; resumen: ResumenEscaneo | null }
  | { kind: 'kev'; kev: KevCatalog }
  | { kind: 'epss'; epss: EpssCatalog }
  | { kind: 'otro'; fmt: DetectedFormat };

/** Peticiones que se atienden de una vez (las demás sincronizan la copia o calculan sobre ella). */
export type PeticionTarea = Extract<Peticion, { tipo: 'motor' | 'proyecto' | 'escaneo' }>;

export interface Progreso { fase: 'leyendo' | 'analizando'; hecho?: number; total?: number }

export type Respuesta =
  | { id: number; result: EngineResult | Project | null | Lectura; troceado?: string }
  | { id: number; trozo: unknown[] }
  | { id: number; superado: true }
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
export async function atender(p: PeticionTarea, avisar: (pr: Progreso) => void = () => {}): Promise<EngineResult | Project | null | Lectura> {
  if (p.tipo === 'motor') return prioritize(p.input);
  avisar({ fase: 'leyendo', hecho: 0, total: p.archivo.size });
  const t = await texto(p.archivo, p.tipo === 'escaneo' ? p.nombre : '');
  avisar({ fase: 'analizando', hecho: 0, total: t.length });
  if (p.tipo === 'proyecto') return parseProject(t);
  alAvanzar((hecho, total) => avisar({ fase: 'analizando', hecho, total }));
  try { return leerEscaneo(t, p.nombre); } finally { alAvanzar(null); }
}

/* ───────── Copia del proyecto en el Worker ─────────
 * Pasar 50.000 hallazgos a un Worker cuesta unos 240 ms de copia en la página, y se hacía en cada cambio. Ahora la
 * página manda el proyecto una vez, en trozos (cada uno, una tarea corta), y después solo los hallazgos que cambian.
 * El cálculo se pide sobre la copia: motor, «¿Y si…?» (hallazgos dados por corregidos) o comparación de perfiles. */
export class CopiaMotor {
  assets: Asset[] = [];
  findings: Finding[] = [];
  edges: ManualEdge[] = [];
  private recibiendo: Finding[] | null = null;

  /** Aplica un mensaje de sincronización. Devuelve false si no lo es. */
  aplicar(p: Peticion): boolean {
    if (p.tipo === 'base') {
      if (p.parte === 'inicio') this.recibiendo = [];
      else if (p.parte === 'trozo') { for (const f of p.findings) this.recibiendo?.push(f); }
      else { this.findings = this.recibiendo ?? []; this.recibiendo = null; this.assets = p.assets; this.edges = p.edges; }
      return true;
    }
    if (p.tipo === 'parche') {
      if (this.findings.length !== p.longitud) this.findings.length = p.longitud;
      for (const [i, f] of p.cambios) this.findings[i] = f;
      if (p.assets) this.assets = p.assets;
      if (p.edges) this.edges = p.edges;
      return true;
    }
    return false;
  }

  calcular(p: Extract<Peticion, { tipo: 'calcular' }>): EngineResult {
    return simulate({ assets: this.assets, findings: this.findings, edges: this.edges, profile: p.profile, slaPolicy: p.slaPolicy }, p.fijados);
  }
}

/** Diferencias entre dos listas de hallazgos por identidad (el estado es inmutable: lo que no cambia es el mismo objeto). */
export function cambiosEntre(antes: Finding[], ahora: Finding[]): [number, Finding][] {
  const out: [number, Finding][] = [];
  for (let i = 0; i < ahora.length; i++) if (antes[i] !== ahora[i]) out.push([i, ahora[i]]);
  return out;
}

/* ───────── Respuestas en trozos ─────────
 * Recibir de golpe 50.000 puntuaciones o hallazgos es otra copia larga en la página. Las listas grandes viajan en
 * trozos de TROZO elementos (cada mensaje, una tarea corta) y la página las vuelve a juntar. */
export const TROZO = 5000;

/** Dónde está la lista grande de cada resultado: motor → scored; proyecto → findings; escaneo → parse.items. */
function campoGrande(r: unknown): string | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  if (Array.isArray(o.scored)) return 'scored';
  if (Array.isArray(o.findings) && o.format === 'ctem-nexus') return 'findings';
  if (o.kind === 'scan' && o.parse && Array.isArray((o.parse as Record<string, unknown>).items)) return 'parse.items';
  return null;
}
const leerCampo = (r: unknown, campo: string): unknown[] => campo.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], r) as unknown[];
function ponerCampo<T>(r: T, campo: string, v: unknown[]): T {
  const [a, b] = campo.split('.');
  const o = r as Record<string, unknown>;
  return (b ? { ...o, [a]: { ...(o[a] as Record<string, unknown>), [b]: v } } : { ...o, [a]: v }) as T;
}

/** Mensajes con los que el Worker envía un resultado: trozos de la lista grande y, al final, el resto. */
export function trocear(id: number, result: unknown): Respuesta[] {
  const campo = campoGrande(result);
  const lista = campo ? leerCampo(result, campo) : [];
  if (!campo || lista.length <= TROZO) return [{ id, result } as Respuesta];
  const out: Respuesta[] = [];
  for (let i = 0; i < lista.length; i += TROZO) out.push({ id, trozo: lista.slice(i, i + TROZO) });
  out.push({ id, result: ponerCampo(result as object, campo, []) as Respuesta extends { result: infer R } ? R : never, troceado: campo });
  return out;
}

/** Recompone en la página un resultado que llegó en trozos. */
export function recomponer<T>(result: T, troceado: string | undefined, trozos: unknown[][]): T {
  return troceado ? ponerCampo(result, troceado, trozos.flat()) : result;
}
