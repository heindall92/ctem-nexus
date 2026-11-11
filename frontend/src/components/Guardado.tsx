/* Estado del guardado del proyecto, siempre a la vista: «Guardado hace 12 s» junto al nombre del proyecto, y un aviso
 * que no se puede cerrar mientras haya un fallo, con la salida inmediata («Exportar proyecto ahora»). */
import { motion } from 'motion/react';
import { AlertTriangle, Download, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useL } from '../i18n';
import { download, stamp } from '../lib/download';
import { useStore } from '../store/store';
import { SPRING } from './ui';

/** Hace cuánto, en palabras: «hace 5 s», «hace 3 min», «a las 10:42». */
export function haceCuanto(iso: string, ahora: number, lang: 'es' | 'en'): string {
  const s = Math.max(0, Math.round((ahora - Date.parse(iso)) / 1000));
  if (s < 5) return lang === 'en' ? 'just now' : 'ahora mismo';
  if (s < 60) return lang === 'en' ? `${s} s ago` : `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return lang === 'en' ? `${m} min ago` : `hace ${m} min`;
  const hora = new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
  return lang === 'en' ? `at ${hora}` : `a las ${hora}`;
}

/** Texto corto del estado, para la barra lateral. Se refresca cada 15 s para que «hace N s» no se quede quieto. */
export function EstadoGuardadoLinea() {
  const g = useStore((s) => s.guardado);
  const lang = useStore((s) => s.lang);
  const L = useL();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setAhora(Date.now()), 15000); return () => clearInterval(id); }, []);
  useEffect(() => { setAhora(Date.now()); }, [g.en]);
  const texto = g.estado === 'error' ? L('Sin guardar', 'Not saved')
    : g.estado === 'cargando' ? L('Cargando…', 'Loading…')
      : g.estado === 'guardando' ? L('Guardando…', 'Saving…')
        : g.en ? L(`Guardado ${haceCuanto(g.en, ahora, lang)}`, `Saved ${haceCuanto(g.en, ahora, lang)}`) : L('Guardado en este navegador', 'Saved in this browser');
  return (
    <span data-testid="estado-guardado" data-estado={g.estado} className={`block truncate text-[0.6875rem] leading-tight ${g.estado === 'error' ? 'font-semibold text-critica' : 'text-ink-3'}`}>
      {texto}
    </span>
  );
}

/** Aviso fijo mientras el proyecto no se puede guardar. No tiene botón de cerrar: se va solo cuando se guarda. */
export function AvisoGuardado() {
  const g = useStore((s) => s.guardado);
  const project = useStore((s) => s.project);
  const reintentar = useStore((s) => s.reintentarGuardado);
  const notify = useStore((s) => s.notify);
  const L = useL();
  if (g.estado !== 'error') return null;
  const memoria = g.almacen === 'memoria';
  const exportar = () => {
    download(`ctem-nexus-${stamp()}.json`, JSON.stringify(project, null, 2), 'application/json');
    notify(L('Proyecto exportado. Guárdalo en un lugar seguro: contiene el mapa de tu exposición.', 'Project exported. Keep it somewhere safe: it holds your exposure map.'));
  };
  return (
    <div className="no-print mx-auto mt-2 max-w-[1240px] px-2 sm:px-4">
      <motion.div role="alert" data-testid="aviso-guardado" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
        className="aviso-guardado flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
        <div className="flex items-start gap-2.5 leading-normal">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">{memoria ? L('Este navegador no guarda el proyecto.', 'This browser does not save the project.') : L('El proyecto no se ha guardado.', 'The project has not been saved.')}</strong>{' '}
            {L(`Motivo: ${g.motivo ?? 'desconocido'}. Tus cambios siguen en esta pestaña, pero se perderán al cerrarla.`, `Reason: ${g.motivo ?? 'unknown'}. Your changes are still in this tab, but will be lost when you close it.`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {!memoria && (
            <button type="button" className="btn" onClick={reintentar}><RotateCw className="size-4" aria-hidden="true" />{L('Reintentar', 'Retry')}</button>
          )}
          <button type="button" className="btn btn-primary" onClick={exportar}><Download className="size-4" aria-hidden="true" />{L('Exportar proyecto ahora', 'Export project now')}</button>
        </div>
      </motion.div>
    </div>
  );
}
