import { Download, PlugZap, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseProject } from '../engine/io';
import { TopBar } from '../components/Shell';
import { Field, SectionTitle, Toggle } from '../components/ui';
import { pingApi } from '../lib/analysis';
import { download, readFile, stamp } from '../lib/download';
import { storageBackend } from '../lib/storage';
import { chrome, screen, useL } from '../i18n';
import { useStore } from '../store/store';

export function Settings() {
  const lang = useStore((s) => s.lang);
  const c = screen[lang];
  const L = useL();
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
  const urlErr = settings.apiUrl && !/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(settings.apiUrl) ? L('URL no válida (p. ej. http://127.0.0.1:8000)', 'Invalid URL (e.g. http://127.0.0.1:8000)') : null;

  return (
    <>
      <TopBar title={c.settingsTitle} subtitle={c.settingsSub} />
      <div className="view-enter mx-auto flex max-w-[860px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-8">
        <section className="panel overflow-hidden">
          <SectionTitle title={L('Proyecto', 'Project')} />
          <div className="border-t border-hairline px-5 py-4">
            <Field label={L('Nombre de la organización o del proyecto', 'Organization or project name')}><input className="field" value={project.name} onChange={(e) => setName(e.target.value)} /></Field>
            <p className="mt-3 text-xs text-ink-3">{L('Almacenamiento', 'Storage')}: {storageBackend() === 'local' ? L('localStorage del navegador', 'browser localStorage') : L('memoria (se perderá al cerrar la pestaña; exporta el proyecto)', 'memory (lost when the tab closes; export the project)')}.</p>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <SectionTitle title={L('Motor de cálculo', 'Scoring engine')} detail={L('Por defecto se usa el motor TypeScript integrado. Si arrancas el backend FastAPI, puedes delegar en él el cálculo; si no responde, se vuelve al motor local.', 'The built-in TypeScript engine is used by default. If you start the FastAPI backend you can delegate scoring to it; if it does not answer, the local engine takes over.')} />
          <div className="divide-hair border-t border-hairline">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div><div className="font-medium">{L('Usar la API (backend FastAPI)', 'Use the API (FastAPI backend)')}</div><div className="text-xs text-ink-3">{L('Desactivado por defecto', 'Off by default')}</div></div>
              <Toggle checked={settings.useApi} onChange={(v) => setSettings({ useApi: v })} label={L('Usar la API', 'Use the API')} />
            </div>
            <div className="flex flex-wrap items-end gap-3 px-5 py-3.5">
              <div className="min-w-[260px] flex-1"><Field label={L('URL de la API', 'API URL')} error={urlErr}><input className="field num" value={settings.apiUrl} aria-invalid={!!urlErr} onChange={(e) => setSettings({ apiUrl: e.target.value.trim() })} /></Field></div>
              <button type="button" className="btn" disabled={!!urlErr || testing} onClick={async () => { setTesting(true); setPing(await pingApi(settings.apiUrl)); setTesting(false); }}><PlugZap />{testing ? L('Probando…', 'Testing…') : L('Probar conexión', 'Test connection')}</button>
            </div>
            {ping && <div className="px-5 py-3 text-[0.8125rem]" style={{ color: ping.ok ? 'var(--color-ok)' : 'var(--color-alta)' }}>{ping.ok ? L(`Conectado: ${ping.detail}`, `Connected: ${ping.detail}`) : L(`Sin conexión: ${ping.detail}. Arranca el backend con «uvicorn app.main:app».`, `No connection: ${ping.detail}. Start the backend with “uvicorn app.main:app”.`)}</div>}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <SectionTitle title={L('Datos', 'Data')} detail={L('Formato JSON propio (format: ctem-nexus). Al importar se validan y sanean todos los campos.', 'Own JSON format (format: ctem-nexus). Every field is validated and sanitized on import.')} />
          <div className="flex flex-wrap gap-2 border-t border-hairline px-5 py-4">
            <button type="button" className="btn" onClick={() => { download(`ctem-nexus-${stamp()}.json`, JSON.stringify(project, null, 2), 'application/json'); notify(chrome[lang].exported); }}><Download />{L('Exportar proyecto JSON', 'Export project JSON')}</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              try {
                const p = parseProject(await readFile(file));
                if (!p) { notify(L('El archivo no es un proyecto de CTEM-Nexus válido.', 'The file is not a valid CTEM-Nexus project.'), 'error'); return; }
                replace(p); notify(L(`Proyecto «${p.name}» importado: ${p.assets.length} activos, ${p.findings.length} hallazgos.`, `Project “${p.name}” imported: ${p.assets.length} assets, ${p.findings.length} findings.`));
              } catch (err) { notify(err instanceof Error ? err.message : L('No se pudo leer el archivo.', 'The file could not be read.'), 'error'); }
            }} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload />{L('Importar proyecto JSON', 'Import project JSON')}</button>
            <button type="button" className="btn" onClick={() => { loadDemo(); notify(c.demoLoadedShort); }}><Sparkles />{c.loadDemo}</button>
            {!confirmReset
              ? <button type="button" className="btn btn-ghost btn-danger ml-auto" onClick={() => setConfirmReset(true)}><RotateCcw />{L('Borrar todo', 'Delete everything')}</button>
              : <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-ink-2">{L('¿Seguro? Se borran activos y hallazgos.', 'Sure? Assets and findings will be deleted.')}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => { reset(); setConfirmReset(false); notify(L('Datos borrados.', 'Data deleted.'), 'info'); }}>{L('Borrar', 'Delete')}</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmReset(false)}>{L('Cancelar', 'Cancel')}</button>
                </span>}
          </div>
        </section>
      </div>
    </>
  );
}
