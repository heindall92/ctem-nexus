/* Resultado del motor: local (TypeScript) siempre; API FastAPI opcional si está activada y responde.
 * Con proyectos grandes (más de UMBRAL_WORKER hallazgos) el cálculo local va en un Web Worker: mientras tanto se
 * muestra el resultado anterior, sin los hallazgos que ya no existen, y el estado dice «calculando». */
import { useEffect, useMemo, useRef, useState } from 'react';
import { prioritize } from '../engine/engine';
import type { EngineInput, EngineResult } from '../engine/types';
import type { RespuestaMotor } from '../engine/motor.worker';
import MotorWorker from '../engine/motor.worker?worker&inline';
import { useStore } from '../store/store';

export type EngineStatus = { mode: 'local' } | { mode: 'api' } | { mode: 'fallback'; reason: string } | { mode: 'loading' } | { mode: 'calculando' };

/** Hasta aquí el motor tarda unos milisegundos: se calcula al momento, sin Worker. */
export const UMBRAL_WORKER = 1500;

let worker: Worker | null = null;
let peticiones = 0;
const esperando = new Map<number, (r: RespuestaMotor) => void>();
/** Calcula en el Worker. Si el navegador no permite Workers (CSP, file:// antiguo), calcula aquí. */
function enWorker(input: EngineInput): Promise<EngineResult> {
  try {
    if (!worker) {
      worker = new MotorWorker();
      worker.onmessage = (e: MessageEvent<RespuestaMotor>) => { esperando.get(e.data.id)?.(e.data); esperando.delete(e.data.id); };
      worker.onerror = () => { worker = null; for (const [id, f] of esperando) f({ id, error: 'worker' }); esperando.clear(); };
    }
    const id = ++peticiones;
    return new Promise((ok) => {
      esperando.set(id, (r) => ok('result' in r ? r.result : prioritize(input)));
      worker!.postMessage({ id, input });
    });
  } catch {
    return Promise.resolve(prioritize(input));
  }
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
    void enWorker(input).then((result) => { if (vigente) setDiferido({ input, result }); });
    return () => { vigente = false; };
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
