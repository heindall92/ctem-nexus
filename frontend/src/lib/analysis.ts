/* Resultado del motor: local (TypeScript) siempre; API FastAPI opcional si está activada y responde.
 * Con proyectos grandes (más de UMBRAL_WORKER hallazgos) el cálculo local va en un Web Worker: mientras tanto se
 * muestra el resultado anterior, sin los hallazgos que ya no existen, y el estado dice «calculando». */
import { useEffect, useMemo, useRef, useState } from 'react';
import { prioritize } from '../engine/engine';
import type { Asset, EngineInput, EngineResult, Finding, ManualEdge } from '../engine/types';
import { cambiosEntre, recomponer, TROZO, type Respuesta } from '../engine/tareas';
import { simulate } from '../engine/simulate';
import MotorWorker from '../engine/tareas.worker?worker&inline';
import { useStore } from '../store/store';

export type EngineStatus = { mode: 'local' } | { mode: 'api' } | { mode: 'fallback'; reason: string } | { mode: 'loading' } | { mode: 'calculando' };

/** Hasta aquí el motor tarda unos milisegundos: se calcula al momento, sin Worker. */
export const UMBRAL_WORKER = 1500;

/* Cliente del Worker del motor. El Worker guarda una copia del proyecto: la primera vez se le manda entero, en trozos
 * de TROZO hallazgos con una pausa entre uno y otro (cada envío es una tarea corta); después, solo los hallazgos que
 * han cambiado. Una cola mantiene el orden de los envíos. Sin Worker (navegador antiguo), se calcula aquí. */
let worker: Worker | null = null;
let sinWorker = false;
let peticiones = 0;
const esperando = new Map<number, { fin: (r: EngineResult | null) => void; trozos: unknown[][] }>();
let enviado: { findings: Finding[] | null; assets: Asset[] | null; edges: ManualEdge[] | null } = { findings: null, assets: null, edges: null };
let cola: Promise<void> = Promise.resolve();
const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

function obtener(): Worker | null {
  if (worker || sinWorker) return worker;
  try {
    worker = new MotorWorker();
  } catch { sinWorker = true; return null; }
  worker.onmessage = (e: MessageEvent<Respuesta>) => {
    const r = e.data;
    const p = esperando.get(r.id);
    if (!p || 'progreso' in r) return;
    if ('trozo' in r) { p.trozos.push(r.trozo); return; }
    esperando.delete(r.id);
    if ('result' in r) p.fin(recomponer(r.result as EngineResult, r.troceado, p.trozos));
    else p.fin(null);   // superado por otro cálculo del mismo canal, o error: quien espera decide
  };
  worker.onerror = (e) => {
    e.preventDefault();
    worker?.terminate(); worker = null; sinWorker = true;
    enviado = { findings: null, assets: null, edges: null };
    for (const p of esperando.values()) p.fin(null);
    esperando.clear();
  };
  return worker;
}

/** Pone al día la copia del Worker: entera y en trozos si es otra lista, o solo lo que ha cambiado. */
async function sincronizar(w: Worker, input: EngineInput): Promise<void> {
  const edges = input.edges ?? [];
  if (input.findings === enviado.findings && input.assets === enviado.assets && edges === enviado.edges) return;
  const antes = enviado.findings;
  const cambios = antes && antes.length === input.findings.length ? cambiosEntre(antes, input.findings) : null;
  if (antes && cambios && cambios.length <= TROZO) {
    w.postMessage({ id: 0, tipo: 'parche', longitud: input.findings.length, cambios, ...(input.assets !== enviado.assets ? { assets: input.assets } : {}), ...(edges !== enviado.edges ? { edges } : {}) });
  } else {
    w.postMessage({ id: 0, tipo: 'base', parte: 'inicio' });
    for (let i = 0; i < input.findings.length; i += TROZO) {
      w.postMessage({ id: 0, tipo: 'base', parte: 'trozo', findings: input.findings.slice(i, i + TROZO) });
      await pausa();
    }
    w.postMessage({ id: 0, tipo: 'base', parte: 'fin', assets: input.assets, edges });
  }
  enviado = { findings: input.findings, assets: input.assets, edges };
}

/**
 * Calcula el motor en el Worker (con `fijados`, como si esos hallazgos estuvieran corregidos). `canal` agrupa los
 * cálculos que se sustituyen entre sí: si se pide otro del mismo canal antes de empezar, este devuelve null.
 */
export function calcularEnSegundoPlano(input: EngineInput, canal = 'analisis', fijados: string[] = []): Promise<EngineResult | null> {
  let resultado: Promise<EngineResult | null> = Promise.resolve(null);
  const anterior = cola;
  cola = (async () => {
    await anterior;
    const w = obtener();
    if (!w) { resultado = Promise.resolve(simulate(input, fijados)); return; }
    await sincronizar(w, input);
    const id = ++peticiones;
    resultado = new Promise((ok) => esperando.set(id, { fin: ok, trozos: [] }));
    w.postMessage({ id, tipo: 'calcular', canal, profile: input.profile ?? 'defecto', slaPolicy: input.slaPolicy ?? 'estandar', fijados });
  })().catch(() => { resultado = Promise.resolve(simulate(input, fijados)); });
  return cola.then(() => resultado);
}

/** El resultado anterior, sin hallazgos que ya no están en el proyecto (las vistas los buscan por id). */
function sinHuerfanos(r: EngineResult, input: EngineInput): EngineResult {
  const ids = new Set(input.findings.map((f) => f.id));
  return r.scored.every((s) => ids.has(s.id)) ? r : { ...r, scored: r.scored.filter((s) => ids.has(s.id)) };
}

export async function pingApi(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`${url.replace(/\/+$/, '')}/health`, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    clearTimeout(t);
    if (!r.ok) return { ok: false, detail: `HTTP ${r.status}` };
    const body = (await r.json()) as { version?: string; engine?: string };
    return { ok: true, detail: `API ${body.version ?? ''} · ${formatLang() === 'en' ? 'engine' : 'motor'} ${body.engine ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, detail: e instanceof Error && e.name === 'AbortError' ? (formatLang() === 'en' ? 'Timed out' : 'Tiempo de espera agotado') : (formatLang() === 'en' ? 'Cannot connect' : 'No se puede conectar') };
  }
}

export function useAnalysis(): { result: EngineResult; status: EngineStatus } {
  const project = useStore((s) => s.project);
  const { useApi, apiUrl } = useStore((s) => s.settings);
  const input = useMemo(() => ({ assets: project.assets, findings: project.findings, edges: project.edges, profile: project.profile ?? 'defecto' as const, slaPolicy: project.slaPolicy ?? 'estandar' as const }), [project.assets, project.findings, project.edges, project.profile, project.slaPolicy]);
  const grande = input.findings.length > UMBRAL_WORKER;
  // Pequeño: al momento. Grande: en el Worker, conservando el último resultado mientras calcula.
  const inmediato = useMemo(() => (grande ? null : prioritize(input)), [grande, input]);
  const [diferido, setDiferido] = useState<{ input: EngineInput; result: EngineResult } | null>(null);
  const ultimo = useRef<EngineResult | null>(null);
  useEffect(() => {
    if (!grande) return;
    let vigente = true;
    // Una pausa corta agrupa cambios seguidos (marcar varios estados) en un solo cálculo.
    const t = setTimeout(() => {
      void calcularEnSegundoPlano(input).then((result) => { if (vigente && result) setDiferido({ input, result }); });
    }, 120);
    return () => { vigente = false; clearTimeout(t); };
  }, [grande, input]);
  const calculando = grande && diferido?.input !== input;
  const local: EngineResult = inmediato
    ?? (diferido?.input === input ? diferido.result : null)
    ?? (ultimo.current ? sinHuerfanos(ultimo.current, input) : (diferido ? sinHuerfanos(diferido.result, input) : prioritize({ ...input, findings: [] })));
  if (!calculando) ultimo.current = local;
  const [remote, setRemote] = useState<{ input: unknown; result: EngineResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!useApi) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/v1/prioritize`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setRemote({ input, result: (await r.json()) as EngineResult });
        setError(null);
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Error');
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [useApi, apiUrl, input]);

  if (!useApi) return { result: local, status: calculando ? { mode: 'calculando' } : { mode: 'local' } };
  if (remote && remote.input === input && !error) return { result: remote.result, status: { mode: 'api' } };
  if (error) return { result: local, status: { mode: 'fallback', reason: error } };
  return { result: local, status: { mode: 'loading' } };
}

import { createContext, useContext } from 'react';
import { formatLang } from './format';
export const AnalysisContext = createContext<{ result: EngineResult; status: EngineStatus } | null>(null);
export function useResult() {
  const v = useContext(AnalysisContext);
  if (!v) throw new Error('AnalysisContext no disponible');
  return v;
}
