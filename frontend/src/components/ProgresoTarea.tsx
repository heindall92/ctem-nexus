/* Progreso de una tarea larga en segundo plano (leer un Nessus grande, importar un proyecto), con «Cancelar».
 * Solo aparece si la tarea pasa de 300 ms: lo rápido no parpadea. */
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Progreso } from '../engine/tareas';
import { useL } from '../i18n';

export interface EstadoTarea { progreso: Progreso | null; inicio: number }

/** Estado y controles de una tarea cancelable. Al desmontar el componente, la tarea se cancela. */
export function useTarea() {
  const [estado, setEstado] = useState<EstadoTarea | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const empezar = useCallback(() => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setEstado({ progreso: null, inicio: Date.now() });
    return { signal: c.signal, alAvanzar: (progreso: Progreso) => { if (ctrl.current === c) setEstado((e) => (e ? { ...e, progreso } : e)); } };
  }, []);
  const terminar = useCallback(() => { ctrl.current = null; setEstado(null); }, []);
  const cancelar = useCallback(() => { ctrl.current?.abort(); ctrl.current = null; setEstado(null); }, []);
  return { estado, empezar, terminar, cancelar };
}

const MB = (n: number) => (n / 1048576).toLocaleString('es-ES', { maximumFractionDigits: 1 });

export function ProgresoTarea({ estado, onCancelar, que }: { estado: EstadoTarea | null; onCancelar: () => void; que: string }) {
  const L = useL();
  const [ahora, setAhora] = useState(() => Date.now());
  // El reloj depende de si hay tarea, no de cada aviso de progreso: si no, cada aviso lo reiniciaría.
  const activa = estado !== null;
  useEffect(() => {
    if (!activa) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [activa]);
  if (!estado || ahora - estado.inicio < 300) return null;
  const p = estado.progreso;
  const pct = p?.total ? Math.min(100, Math.round(((p.hecho ?? 0) / p.total) * 100)) : null;
  const fase = p?.fase === 'analizando' ? L('Analizando', 'Analysing') : L('Leyendo', 'Reading');
  const segundos = Math.floor((ahora - estado.inicio) / 1000);
  const detalle = p?.fase === 'leyendo' && p.total ? `${MB(p.total)} MB` : pct !== null && pct > 0 ? `${pct} %` : '';
  return (
    <div data-testid="progreso-tarea" className="flex flex-col gap-2 rounded-xl bg-ground px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-[0.8125rem] text-ink-2">
          {fase} {que}{detalle ? ` · ${detalle}` : ''}{segundos >= 1 ? ` · ${segundos} s` : ''}
        </p>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancelar}><X className="size-4" aria-hidden="true" />{L('Cancelar', 'Cancel')}</button>
      </div>
      <div role="progressbar" aria-label={`${fase} ${que}`} aria-valuemin={0} aria-valuemax={100} {...(pct !== null && p?.fase === 'analizando' ? { 'aria-valuenow': pct } : {})}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        {pct !== null && p?.fase === 'analizando' && pct > 0
          ? <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
          : <div className="barra-indeterminada h-full w-1/3 rounded-full bg-accent" />}
      </div>
    </div>
  );
}
