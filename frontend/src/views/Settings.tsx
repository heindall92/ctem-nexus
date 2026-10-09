import { Download, FileSearch, PlugZap, SlidersHorizontal, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ScanUploader } from '../components/ScanUploader';
import { PROFILE_IDS, PROFILES, type Weights } from '../engine/constants';
import { prioritize } from '../engine/engine';
import { SOURCE_LABEL } from '../engine/scanners';
import type { ProfileId } from '../engine/types';
import { n1, plural } from '../lib/format';
import { parseProject } from '../engine/io';
import { Modal, TopBar } from '../components/Shell';
import { Field, PageHeader, ScoreBar, SectionTitle, Segmented, Toggle } from '../components/ui';
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
  const setProfile = useStore((s) => s.setProfile);
  const [showIntel, setShowIntel] = useState(false);
  const profile: ProfileId = project.profile ?? 'defecto';
  const PROFILE_LABEL: Record<ProfileId, string> = { defecto: L('General', 'General'), ot: L('OT / industrial', 'OT / industrial'), banca: L('Banca y finanzas', 'Banking and finance') };
  const PROFILE_NOTE: Record<ProfileId, string> = {
    defecto: L('Equilibrio entre severidad, explotación real y negocio.', 'Balance between severity, real exploitation and business.'),
    ot: L('Pesa más la criticidad del proceso y la cercanía a la zona de control que el CVSS: en planta, parar la línea importa más que la nota del fallo.', 'Process criticality and closeness to the control zone weigh more than CVSS: on the plant floor, stopping the line matters more than the flaw’s rating.'),
    banca: L('Amenaza dirigida (DORA, pruebas TLPT): pesan más la explotación real y la exposición a Internet.', 'Targeted threat (DORA, TLPT testing): real exploitation and Internet exposure weigh more.'),
  };
  const FACTOR: Record<keyof Weights, string> = { severidad: L('Severidad', 'Severity'), explotabilidad: L('Explotabilidad', 'Exploitability'), criticidad: L('Criticidad', 'Criticality'), exposicion: L('Exposición', 'Exposure'), proximidad: L('Proximidad', 'Proximity') };
  const byProfile = useMemo(() => {
    if (!project.findings.length) return null;
    const out = {} as Record<ProfileId, ReturnType<typeof prioritize>>;
    for (const p of PROFILE_IDS) out[p] = prioritize({ assets: project.assets, findings: project.findings, edges: project.edges, profile: p, slaPolicy: project.slaPolicy });
    return out;
  }, [project.assets, project.findings, project.edges]);
  const bandShift = (p: ProfileId) => {
    if (!byProfile || p === profile) return 0;
    const cur = new Map(byProfile[profile].scored.map((x) => [x.id, x.band]));
    return byProfile[p].scored.filter((x) => cur.get(x.id) !== x.band).length;
  };
  const intel = project.intel;
  const urlErr = settings.apiUrl && !/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(settings.apiUrl) ? L('URL no válida (p. ej. http://127.0.0.1:8000)', 'Invalid URL (e.g. http://127.0.0.1:8000)') : null;

  return (
    <>
      <TopBar title={c.settingsTitle} />
      <div className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 pb-6 sm:px-8">
        <PageHeader icon={<SlidersHorizontal />} eyebrow={L('Ajustes · datos locales', 'Settings · local data')} title={c.settingsTitle} lead={c.settingsSub} />
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

        <section className="panel overflow-hidden" data-testid="perfil-ponderacion">
          <SectionTitle title={L('Perfil de ponderación', 'Weighting profile')} detail={L('Cuánto pesa cada factor en la puntuación de 0 a 100. Se guarda en el proyecto y sale en el informe.', 'How much each factor weighs in the 0–100 score. Stored in the project and shown in the report.')} />
          <div className="flex flex-col gap-4 border-t border-hairline px-5 py-4">
            <Segmented<ProfileId> label={L('Perfil de ponderación', 'Weighting profile')} value={profile} onChange={(p) => { setProfile(p); notify(L(`Perfil «${PROFILE_LABEL[p]}» aplicado.`, `“${PROFILE_LABEL[p]}” profile applied.`)); }} options={PROFILE_IDS.map((p) => ({ value: p, label: PROFILE_LABEL[p] }))} />
            <p className="text-[0.8125rem] leading-relaxed text-ink-2">{PROFILE_NOTE[profile]}</p>
            <dl className="grid gap-2.5">
              {(Object.keys(FACTOR) as Array<keyof Weights>).map((k) => (
                <div key={k} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-[0.8125rem]">
                  <dt className="text-ink-2">{FACTOR[k]}</dt>
                  <dd><ScoreBar value={PROFILES[profile][k]} max={30} color="var(--color-accent)" /></dd>
                  <dd className="num text-right">{PROFILES[profile][k]}</dd>
                </div>
              ))}
            </dl>
            {byProfile && (
              <ul className="grid gap-2 sm:grid-cols-3" aria-label={L('Efecto de cada perfil en este proyecto', 'Effect of each profile on this project')}>
                {PROFILE_IDS.map((p) => (
                  <li key={p} className="rounded-xl px-3 py-2.5 text-xs shadow-[inset_0_0_0_1px_var(--color-hairline)]" style={p === profile ? { boxShadow: 'inset 0 0 0 1.5px var(--color-accent)' } : undefined}>
                    <div className="font-medium text-ink">{PROFILE_LABEL[p]}</div>
                    <div className="mt-1 text-ink-3">{L('Índice', 'Index')} <span className="num text-ink">{n1(byProfile[p].summary.exposureIndex)}</span> · {L('críticos', 'critical')} <span className="num text-ink">{byProfile[p].scored.filter((x) => x.band === 'critica').length}</span></div>
                    <div className="mt-0.5 text-ink-3">{p === profile ? L('En uso', 'In use') : (() => { const n = bandShift(p); return n === 0 ? L('Ningún hallazgo cambia de banda', 'No finding changes band') : n === 1 ? L('1 hallazgo cambia de banda', '1 finding changes band') : L(`${n} hallazgos cambian de banda`, `${n} findings change band`); })()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden" data-testid="inteligencia">
          <SectionTitle
            title={L('Inteligencia e importaciones', 'Intelligence and imports')}
            detail={L('Catálogos CISA KEV y FIRST EPSS que descargas tú: la app nunca los pide por red. Su versión queda en el proyecto y en el informe.', 'CISA KEV and FIRST EPSS catalogs you download yourself: the app never fetches them. Their version is stored in the project and the report.')}
            actions={<button type="button" className="btn btn-sm" onClick={() => setShowIntel(true)}><FileSearch />{L('Importar escáner o catálogo', 'Import scanner or catalog')}</button>}
          />
          <dl className="divide-hair border-t border-hairline text-[0.8125rem]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
              <dt className="font-medium">CISA KEV</dt>
              <dd className="text-ink-2">{intel?.kev ? L(`versión ${intel.kev.version} · ${intel.kev.count.toLocaleString()} CVE · aplicado el ${intel.kev.importedAt}`, `version ${intel.kev.version} · ${intel.kev.count.toLocaleString()} CVEs · applied on ${intel.kev.importedAt}`) : L('Sin catálogo: cuentan las marcas del escáner o del analista', 'No catalog: scanner or analyst flags apply')}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
              <dt className="font-medium">FIRST EPSS</dt>
              <dd className="text-ink-2">{intel?.epss ? L(`${intel.epss.scoreDate || intel.epss.model} · ${intel.epss.count.toLocaleString()} puntuaciones · aplicado el ${intel.epss.importedAt}`, `${intel.epss.scoreDate || intel.epss.model} · ${intel.epss.count.toLocaleString()} scores · applied on ${intel.epss.importedAt}`) : L('Sin catálogo: cuentan los valores del escáner o del analista', 'No catalog: scanner or analyst values apply')}</dd>
            </div>
          </dl>
          {project.imports?.length ? (
            <div className="border-t border-hairline px-5 py-4">
              <h3 className="label mb-2 font-medium">{L('Últimas importaciones', 'Latest imports')}</h3>
              <ul className="flex flex-col gap-1.5 text-xs" data-testid="registro-importaciones">
                {project.imports.slice(0, 8).map((im, i) => (
                  <li key={`${im.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="num text-ink-3">{im.at}</span>
                    <span className="font-medium text-ink">{im.tool || SOURCE_LABEL[im.source]}</span>
                    <span className="truncate text-ink-3">{im.file}</span>
                    <span className="text-ink-2">· +{L(plural(im.newFindings, 'nuevo', 'nuevos'), `${im.newFindings} new`)} · {L(plural(im.updated, 'actualizado', 'actualizados'), `${im.updated} updated`)}{im.reopened ? ` · ${L(plural(im.reopened, 'reabierto', 'reabiertos'), `${im.reopened} reopened`)}` : ''}{im.newAssets ? ` · +${L(plural(im.newAssets, 'activo', 'activos'), plural(im.newAssets, 'asset', 'assets'))}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
                replace(p); notify(L(`Proyecto «${p.name}» importado: ${plural(p.assets.length, 'activo', 'activos')}, ${plural(p.findings.length, 'hallazgo', 'hallazgos')}.`, `Project “${p.name}” imported: ${plural(p.assets.length, 'asset', 'assets')}, ${plural(p.findings.length, 'finding', 'findings')}.`));
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
      <Modal open={showIntel} onClose={() => setShowIntel(false)} title={L('Importar escáner o inteligencia', 'Import scanner or intelligence')} subtitle={L('Nessus, OpenVAS, Nuclei, Trivy, SARIF, CISA KEV y FIRST EPSS', 'Nessus, OpenVAS, Nuclei, Trivy, SARIF, CISA KEV and FIRST EPSS')} maxWidth={720}>
        <ScanUploader onDone={() => setShowIntel(false)} />
      </Modal>
    </>
  );
}
