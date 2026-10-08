/* Importador unificado: Nessus, OpenVAS/Greenbone, Nuclei, Trivy y SARIF, más los catálogos CISA KEV y FIRST EPSS.
 * Detecta el formato, enseña el plan (qué se crea, qué se actualiza, qué se reabre) y solo entonces lo aplica.
 * Todo ocurre en el navegador: el fichero no sale del equipo. */
import { AlertCircle, CheckCircle2, ChevronRight, FileSearch, RotateCcw, ShieldAlert } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { applyIntel, gunzipText, parseEpss, parseKev, type EpssCatalog, type KevCatalog } from '../engine/intel';
import { planImport, type ImportPlan } from '../engine/merge';
import { detectFormat, parseScan, SOURCE_LABEL, type DetectedFormat, type ScanParse } from '../engine/scanners';
import { useL } from '../i18n';
import { plural } from '../lib/format';
import { useStore } from '../store/store';

const MAX_BYTES = 60 * 1024 * 1024;
const ACCEPT = '.nessus,.xml,.json,.jsonl,.sarif,.csv,.gz,application/json,text/xml,text/csv,application/gzip';

type Parsed =
  | { kind: 'scan'; file: string; parse: ScanParse }
  | { kind: 'kev'; file: string; kev: KevCatalog }
  | { kind: 'epss'; file: string; epss: EpssCatalog };

async function readAny(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`El archivo supera ${Math.round(MAX_BYTES / 1048576)} MB.`);
  if (/\.gz$/i.test(file.name)) return gunzipText(await file.arrayBuffer());
  return file.text();
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'accent' | 'warn' }) {
  const color = tone === 'warn' && value > 0 ? 'var(--color-alta)' : tone === 'accent' && value > 0 ? 'var(--color-accent)' : 'var(--color-ink)';
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <div className="num text-[1.25rem] font-semibold leading-none" style={{ color }}>{value.toLocaleString()}</div>
      <div className="mt-1 text-[0.6875rem] leading-tight text-ink-3">{label}</div>
    </div>
  );
}

export function ScanUploader({ onDone }: { onDone?: () => void }) {
  const L = useL();
  const project = useStore((s) => s.project);
  const applyImport = useStore((s) => s.applyImport);
  const applyIntelCatalogs = useStore((s) => s.applyIntelCatalogs);
  const notify = useStore((s) => s.notify);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [target, setTarget] = useState('');
  const [dragging, setDragging] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const wrongTool = (f: DetectedFormat) => ({
    nmap: L('Es un escaneo de Nmap: usa «Importar Nmap XML».', 'This is an Nmap scan: use “Import Nmap XML”.'),
    bloodhound: L('Es una exportación de BloodHound: usa «Importar BloodHound».', 'This is a BloodHound export: use “Import BloodHound”.'),
    proyecto: L('Es un proyecto de CTEM-Nexus: impórtalo desde Ajustes y datos.', 'This is a CTEM-Nexus project: import it from Settings and data.'),
  } as Record<string, string>)[f];

  const handle = async (file: File) => {
    setBusy(true); setError(null); setParsed(null); setTarget('');
    try {
      const text = await readAny(file);
      const fmt = detectFormat(text, file.name.replace(/\.gz$/i, ''));
      if (fmt === 'kev') setParsed({ kind: 'kev', file: file.name, kev: parseKev(text) });
      else if (fmt === 'epss') setParsed({ kind: 'epss', file: file.name, epss: parseEpss(text) });
      else if (wrongTool(fmt)) throw new Error(wrongTool(fmt));
      else if (fmt === 'desconocido') throw new Error(L('Formato no reconocido. Admite Nessus (.nessus), OpenVAS/Greenbone (XML), Nuclei (JSONL/JSON), Trivy (JSON), SARIF 2.1.0, CISA KEV (JSON) y FIRST EPSS (CSV o .gz).', 'Unrecognised format. Supported: Nessus (.nessus), OpenVAS/Greenbone (XML), Nuclei (JSONL/JSON), Trivy (JSON), SARIF 2.1.0, CISA KEV (JSON) and FIRST EPSS (CSV or .gz).'));
      else {
        const parse = parseScan(text, file.name);
        if (!parse.items.length) throw new Error(L(`El informe de ${parse.tool} no trae resultados con severidad (${parse.skipped} informativos omitidos).`, `The ${parse.tool} report has no rated results (${parse.skipped} informational skipped).`));
        setParsed({ kind: 'scan', file: file.name, parse });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : L('No se pudo leer el archivo.', 'The file could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const plan: ImportPlan | null = useMemo(
    () => (parsed?.kind === 'scan' ? planImport(parsed.parse, project, { today, targetAssetId: target || null }) : null),
    [parsed, project, today, target],
  );
  const intelPreview = useMemo(
    () => (parsed?.kind === 'kev' ? applyIntel(project.findings, { kev: parsed.kev }) : parsed?.kind === 'epss' ? applyIntel(project.findings, { epss: parsed.epss }) : null),
    [parsed, project.findings],
  );

  const apply = () => {
    if (!parsed) return;
    if (parsed.kind === 'scan' && plan) {
      applyImport(plan, parsed.file);
      const parts = L(
        [plural(plan.newFindings.length, 'hallazgo nuevo', 'hallazgos nuevos'), plural(plan.updatedFindings.length, 'actualizado', 'actualizados'), plan.reopened ? plural(plan.reopened, 'reabierto', 'reabiertos') : '', plural(plan.newAssets.length, 'activo nuevo', 'activos nuevos')].filter(Boolean).join(' · '),
        [plural(plan.newFindings.length, 'new finding', 'new findings'), `${plan.updatedFindings.length} updated`, plan.reopened ? `${plan.reopened} reopened` : '', plural(plan.newAssets.length, 'new asset', 'new assets')].filter(Boolean).join(' · '),
      );
      notify(`${plan.tool}: ${parts}.`, plan.reopened ? 'info' : 'ok');
    } else if (parsed.kind === 'kev') {
      const r = applyIntelCatalogs({ kev: parsed.kev });
      notify(L(`Catálogo KEV ${parsed.kev.version} aplicado: ${plural(r.kevAdded.length, 'hallazgo pasa', 'hallazgos pasan')} a KEV.`, `KEV catalog ${parsed.kev.version} applied: ${plural(r.kevAdded.length, 'finding', 'findings')} marked KEV.`));
    } else if (parsed.kind === 'epss') {
      const r = applyIntelCatalogs({ epss: parsed.epss });
      notify(L(`EPSS del ${parsed.epss.scoreDate || 'catálogo'} aplicado: ${plural(r.epssUpdated.length, 'hallazgo actualizado', 'hallazgos actualizados')}.`, `EPSS ${parsed.epss.scoreDate || 'catalog'} applied: ${plural(r.epssUpdated.length, 'finding', 'findings')} updated.`));
    }
    onDone?.();
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void handle(f); };
  const aName = new Map(project.assets.map((a) => [a.id, a.name]));
  const intel = project.intel;

  return (
    <div className="flex flex-col gap-5 text-sm" data-testid="importador-escaner">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors ${dragging ? 'border-accent bg-accent/10' : 'border-hairline-strong bg-ground'}`}
      >
        <div className="grid size-11 place-items-center rounded-xl bg-surface-2 text-accent"><FileSearch className="size-5" /></div>
        <p className="mt-3 text-[0.875rem] font-medium">{L('Arrastra aquí el informe o elígelo', 'Drop the report here or choose it')}</p>
        <p className="mt-1 max-w-[52ch] text-xs leading-relaxed text-ink-3">
          Nessus · OpenVAS / Greenbone · Nuclei · Trivy · SARIF 2.1.0 · CISA KEV · FIRST EPSS (.csv / .gz).{' '}
          {L('Se detecta el formato solo. El archivo no sale de este navegador.', 'The format is detected automatically. The file never leaves this browser.')}
        </p>
        <label className="btn btn-sm mt-4 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          {busy ? L('Leyendo…', 'Reading…') : parsed ? L('Elegir otro archivo', 'Choose another file') : L('Elegir archivo', 'Choose file')}
          <input type="file" accept={ACCEPT} className="sr-only" aria-label={L('Archivo de escáner o de inteligencia', 'Scanner or intelligence file')} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); e.target.value = ''; }} />
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[0.8125rem] text-critica shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-critica)_35%,transparent)]" style={{ background: 'color-mix(in oklab, var(--color-critica) 8%, transparent)' }}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {parsed?.kind === 'scan' && plan && (
        <section className="flex flex-col gap-4" aria-label={L('Plan de importación', 'Import plan')} data-testid="plan-importacion">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="size-4 text-ok" />
            <span className="font-semibold">{plan.tool}</span>
            <span className="text-xs text-ink-3">· {parsed.file} · {plural(parsed.parse.hosts.length, 'host', 'hosts')} · {L(plural(parsed.parse.items.length, 'resultado', 'resultados'), plural(parsed.parse.items.length, 'result', 'results'))}{parsed.parse.skipped ? ` · ${L(plural(parsed.parse.skipped, 'informativo omitido', 'informativos omitidos'), `${parsed.parse.skipped} informational skipped`)}` : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat value={plan.newFindings.length} label={L('hallazgos nuevos', 'new findings')} tone="accent" />
            <Stat value={plan.updatedFindings.length} label={L('ya existían: se actualizan', 'already existed: updated')} />
            <Stat value={plan.reopened} label={L('mitigados que reaparecen', 'mitigated that reappear')} tone="warn" />
            <Stat value={plan.newAssets.length} label={L('activos nuevos', 'new assets')} tone="accent" />
            <Stat value={plan.matchedAssets} label={L('activos reconocidos', 'assets matched')} />
            <Stat value={plan.duplicatesInFile} label={L('duplicados fundidos', 'duplicates merged')} />
          </div>

          {project.assets.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="label font-medium text-ink-2">{L('Activo de destino', 'Target asset')}</span>
              <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">{L('Según IP o nombre de cada host (crea los que no existan)', 'By each host’s IP or name (creates missing ones)')}</option>
                {project.assets.map((a) => <option key={a.id} value={a.id}>{L('Todo a', 'Everything to')} {a.name}</option>)}
              </select>
              <span className="text-xs text-ink-3">{L('Útil con Trivy y SARIF: la imagen o el repositorio pertenecen a una aplicación que ya tienes en el alcance.', 'Handy for Trivy and SARIF: the image or repository belongs to an application already in scope.')}</span>
            </label>
          )}

          {plan.newAssets.length > 0 && (
            <p className="rounded-xl bg-ground px-3.5 py-2.5 text-xs leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              {L('Los activos nuevos entran con criticidad 3 y sin responsable. Revísalos en Alcance para que la puntuación sea fiel: ', 'New assets come in with criticality 3 and no owner. Review them in Scope so the score is accurate: ')}
              <span className="num">{plan.newAssets.slice(0, 4).map((a) => a.name).join(', ')}{plan.newAssets.length > 4 ? '…' : ''}</span>
            </p>
          )}

          {(plan.newFindings.length > 0 || plan.updatedFindings.length > 0) && (
            <div tabIndex={0} role="region" aria-label={L('Vista previa de hallazgos', 'Findings preview')} className="max-h-60 overflow-y-auto rounded-xl shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              <ul className="divide-hair">
                {[...plan.updatedFindings.map((f) => ({ f, upd: true })), ...plan.newFindings.map((f) => ({ f, upd: false }))].slice(0, 40).map(({ f, upd }) => (
                  <li key={f.id} className="flex items-start gap-3 px-3.5 py-2.5">
                    <span className="num w-8 shrink-0 pt-0.5 text-xs text-ink-2">{f.cvss.toFixed(1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.8125rem] leading-snug">{f.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">
                        <span className="num">{f.id}</span>{f.cve && <> · <span className="num">{f.cve}</span></>} · {aName.get(f.assetId) ?? plan.newAssets.find((a) => a.id === f.assetId)?.name ?? f.assetId}
                        {f.kev && <> · KEV</>}
                      </span>
                    </span>
                    <span className="chip shrink-0" style={upd ? { background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' } : { background: 'color-mix(in oklab, var(--color-accent) 16%, transparent)', color: 'var(--color-ink)' }}>
                      {upd ? (plan.reopenedIds.includes(f.id) ? L('Reabierto', 'Reopened') : L('Actualiza', 'Updates')) : L('Nuevo', 'New')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs leading-relaxed text-ink-3">
            {L('Un hallazgo que ya existía se reconoce por activo y CVE (también los relacionados) o, sin CVE, por título o guía específica. Se suman fuentes y evidencias, se toman el CVSS y el EPSS más altos y se respetan el estado y la remediación del analista.', 'An existing finding is recognised by asset and CVE (related ones too) or, without a CVE, by title or specific guide. Sources and evidence are combined, the highest CVSS and EPSS are kept, and the analyst’s status and remediation are respected.')}
          </p>
        </section>
      )}

      {(parsed?.kind === 'kev' || parsed?.kind === 'epss') && intelPreview && (
        <section className="flex flex-col gap-4" aria-label={L('Vista previa de inteligencia', 'Intelligence preview')} data-testid="plan-inteligencia">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="size-4 text-ok" />
            <span className="font-semibold">{parsed.kind === 'kev' ? 'CISA KEV' : 'FIRST EPSS'}</span>
            <span className="text-xs text-ink-3">
              · {parsed.file} · {parsed.kind === 'kev'
                ? L(`versión ${parsed.kev.version}${parsed.kev.released ? ` del ${parsed.kev.released}` : ''} · ${parsed.kev.count.toLocaleString()} CVE`, `version ${parsed.kev.version}${parsed.kev.released ? ` of ${parsed.kev.released}` : ''} · ${parsed.kev.count.toLocaleString()} CVEs`)
                : L(`${parsed.epss.model || 'modelo'}${parsed.epss.scoreDate ? ` del ${parsed.epss.scoreDate}` : ''} · ${parsed.epss.count.toLocaleString()} puntuaciones`, `${parsed.epss.model || 'model'}${parsed.epss.scoreDate ? ` of ${parsed.epss.scoreDate}` : ''} · ${parsed.epss.count.toLocaleString()} scores`)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {parsed.kind === 'kev'
              ? <Stat value={intelPreview.kevAdded.length} label={L('hallazgos pasan a KEV', 'findings become KEV')} tone="warn" />
              : <>
                  <Stat value={intelPreview.epssUpdated.length} label={L('EPSS actualizados', 'EPSS updated')} tone="accent" />
                  <Stat value={intelPreview.epssMissing} label={L('CVE sin puntuación en el CSV', 'CVEs not in the CSV')} />
                </>}
            <Stat value={project.findings.filter((f) => f.cve).length} label={L('hallazgos con CVE', 'findings with a CVE')} />
          </div>
          {parsed.kind === 'kev' && intelPreview.kevAdded.length > 0 && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-2">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-alta" />
              <span>{L('Explotación activa confirmada en', 'Confirmed active exploitation in')} <span className="num">{intelPreview.kevAdded.join(', ')}</span>. {L('Subirán de prioridad.', 'They will move up in priority.')}</span>
            </p>
          )}
          <p className="text-xs leading-relaxed text-ink-3">{L('KEV solo añade marcas: nunca quita una que puso el analista. EPSS toma el valor más alto entre los CVE del hallazgo. La versión del catálogo queda en el proyecto y en el informe.', 'KEV only adds flags: it never removes one set by the analyst. EPSS takes the highest value among the finding’s CVEs. The catalog version is stored in the project and the report.')}</p>
        </section>
      )}

      {!parsed && (intel?.kev || intel?.epss) && (
        <p className="flex items-center gap-2 text-xs text-ink-3" data-testid="intel-actual">
          <RotateCcw className="size-3.5" />
          {L('En uso:', 'In use:')} {intel.kev && `KEV ${intel.kev.version}`}{intel.kev && intel.epss && ' · '}{intel.epss && `EPSS ${intel.epss.scoreDate || intel.epss.model}`}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-hairline pt-4">
        <button type="button" className="btn btn-ghost" onClick={onDone}>{L('Cancelar', 'Cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!parsed || (parsed.kind === 'scan' && !plan)} onClick={apply}>
          {parsed && parsed.kind !== 'scan' ? L('Aplicar inteligencia', 'Apply intelligence') : L('Incorporar al proyecto', 'Add to project')}<ChevronRight className="size-4" />
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{parsed ? (parsed.kind === 'scan' ? `${SOURCE_LABEL[parsed.parse.source]} ${L('analizado', 'analysed')}` : L('Catálogo analizado', 'Catalog analysed')) : ''}</span>
    </div>
  );
}
