import { Download, PlugZap, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseProject } from '../engine/io';
import { TopBar } from '../components/Shell';
import { Field, SectionTitle, Toggle } from '../components/ui';
import { pingApi } from '../lib/analysis';
import { download, readFile, stamp } from '../lib/download';
import { storageBackend } from '../lib/storage';
import { screen } from '../i18n';
import { useStore } from '../store/store';

export function Settings() {
  const c = screen[useStore((s) => s.lang)];
  const project = useStore((s) => s.project);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const setName = useStore((s) => s.setName);
  const replace = useStore((s) => s.replaceProject);
  const reset = useStore((s) => s.reset);
  const loadDemo = useStore((s) => s.loadDemo);
  const notify = useStore((s) => s.notify);
  const [ping, setPing] = useState<{ ok: boolean; detail: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlErr = settings.apiUrl && !/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(settings.apiUrl) ? 'URL no válida (p. ej. http://127.0.0.1:8000)' : null;

  return (
    <>
      <TopBar title={c.settingsTitle} subtitle={c.settingsSub} />
      <div className="view-enter mx-auto flex max-w-[860px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-8">
        <section className="panel overflow-hidden">
          <SectionTitle title="Proyecto" />
          <div className="border-t border-hairline px-5 py-4">
            <Field label="Nombre de la organización o del proyecto"><input className="field" value={project.name} onChange={(e) => setName(e.target.value)} /></Field>
            <p className="mt-3 text-xs text-ink-3">Almacenamiento: {storageBackend() === 'local' ? 'localStorage del navegador' : 'memoria (se perderá al cerrar la pestaña; exporta el proyecto)'}.</p>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <SectionTitle title="Motor de cálculo" detail="Por defecto se usa el motor TypeScript integrado. Si arrancas el backend FastAPI, puedes delegar en él el cálculo; si no responde, se vuelve al motor local." />
          <div className="divide-hair border-t border-hairline">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div><div className="font-medium">Usar la API (backend FastAPI)</div><div className="text-xs text-ink-3">Desactivado por defecto</div></div>
              <Toggle checked={settings.useApi} onChange={(v) => setSettings({ useApi: v })} label="Usar la API" />
            </div>
            <div className="flex flex-wrap items-end gap-3 px-5 py-3.5">
              <div className="min-w-[260px] flex-1"><Field label="URL de la API" error={urlErr}><input className="field num" value={settings.apiUrl} aria-invalid={!!urlErr} onChange={(e) => setSettings({ apiUrl: e.target.value.trim() })} /></Field></div>
              <button type="button" className="btn" disabled={!!urlErr || testing} onClick={async () => { setTesting(true); setPing(await pingApi(settings.apiUrl)); setTesting(false); }}><PlugZap />{testing ? 'Probando…' : 'Probar conexión'}</button>
            </div>
            {ping && <div className="px-5 py-3 text-[0.8125rem]" style={{ color: ping.ok ? 'var(--color-ok)' : 'var(--color-alta)' }}>{ping.ok ? `Conectado: ${ping.detail}` : `Sin conexión: ${ping.detail}. Arranca el backend con «uvicorn app.main:app».`}</div>}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <SectionTitle title="Datos" detail="Formato JSON propio (format: ctem-nexus). Al importar se validan y sanean todos los campos." />
          <div className="flex flex-wrap gap-2 border-t border-hairline px-5 py-4">
            <button type="button" className="btn" onClick={() => { download(`ctem-nexus-${stamp()}.json`, JSON.stringify(project, null, 2), 'application/json'); notify('Proyecto exportado.'); }}><Download />Exportar proyecto JSON</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              try {
                const p = parseProject(await readFile(file));
                if (!p) { notify('El archivo no es un proyecto de CTEM-Nexus válido.', 'error'); return; }
                replace(p); notify(`Proyecto «${p.name}» importado: ${p.assets.length} activos, ${p.findings.length} hallazgos.`);
              } catch (err) { notify(err instanceof Error ? err.message : 'No se pudo leer el archivo.', 'error'); }
            }} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload />Importar proyecto JSON</button>
            <button type="button" className="btn" onClick={() => { loadDemo(); notify('Datos de ejemplo cargados.'); }}><Sparkles />Cargar datos de demo</button>
            {!confirmReset
              ? <button type="button" className="btn btn-ghost btn-danger ml-auto" onClick={() => setConfirmReset(true)}><RotateCcw />Borrar todo</button>
              : <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-ink-2">¿Seguro? Se borran activos y hallazgos.
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { reset(); setConfirmReset(false); notify('Datos borrados.', 'info'); }}>Borrar</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
                </span>}
          </div>
        </section>
      </div>
    </>
  );
}
