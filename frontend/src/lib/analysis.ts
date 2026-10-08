/* Resultado del motor: local (TypeScript) siempre; API FastAPI opcional si está activada y responde. */
import { useEffect, useMemo, useState } from 'react';
import { prioritize } from '../engine/engine';
import type { EngineResult } from '../engine/types';
import { useStore } from '../store/store';

export type EngineStatus = { mode: 'local' } | { mode: 'api' } | { mode: 'fallback'; reason: string } | { mode: 'loading' };

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
  const input = useMemo(() => ({ assets: project.assets, findings: project.findings, edges: project.edges }), [project.assets, project.findings, project.edges]);
  const local = useMemo(() => prioritize(input), [input]);
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

  if (!useApi) return { result: local, status: { mode: 'local' } };
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
