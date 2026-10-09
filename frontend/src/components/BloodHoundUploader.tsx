import { AlertCircle, CheckCircle2, ChevronRight, Crown, FileCode, Server, ShieldAlert, Upload, Users } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { parseBloodHoundJson, type BloodHoundParseResult } from '../engine/bloodhound';
import { readFile } from '../lib/download';
import { assetTypeLabel, plural } from '../lib/format';
import { useL } from '../i18n';
import { useStore } from '../store/store';

interface Props {
  onDone?: () => void;
}

export function BloodHoundUploader({ onDone }: Props) {
  const L = useL();
  const settings = useStore((s) => s.settings);
  const importScanData = useStore((s) => s.importNmapResult);
  const notify = useStore((s) => s.notify);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BloodHoundParseResult | null>(null);
  const [engineUsed, setEngineUsed] = useState<'api' | 'local'>('local');
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Si la API de FastAPI está activada en ajustes
      if (settings.useApi) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch(`${settings.apiUrl}/api/v1/discovery/bloodhound/upload`, {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setResult({
              assets: data.assets ?? [],
              findings: data.findings ?? [],
              edges: data.edges ?? [],
              summary: {
                totalComputers: data.assets.filter((a: any) => a.type !== 'identidad').length,
                totalUsers: data.assets.filter((a: any) => a.type === 'identidad').length,
                domainControllers: data.assets.filter((a: any) => a.criticality === 5).length,
                kerberoastable: data.findings.filter((f: any) => f.remediation === 'kerberoast').length,
                asrepRoastable: data.findings.filter((f: any) => f.title.includes('AS-REP')).length,
                unconstrainedDelegation: data.findings.filter((f: any) => f.remediation === 'unconstrained_delegation').length,
                edgesCreated: data.edges?.length || 0,
              },
            });
            setEngineUsed('api');
            setLoading(false);
            return;
          }
        } catch {
          // Fallback silencioso al motor local en caso de desconexión
        }
      }

      // 2. Motor local en TypeScript (navegador sin servidor)
      const jsonText = await readFile(file);
      const parsed = parseBloodHoundJson(jsonText);
      setResult(parsed);
      setEngineUsed('local');
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Error al procesar el archivo JSON de BloodHound.', 'Error processing the BloodHound JSON file.'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    importScanData({
      assets: result.assets,
      findings: result.findings,
      edges: result.edges,
    });
    notify(
      L(`Ingestados ${plural(result.assets.length, 'objeto AD', 'objetos AD')}, ${plural(result.findings.length, 'hallazgo', 'hallazgos')} y ${plural(result.edges.length, 'arista de ataque', 'aristas de ataque')}.`, `Imported ${plural(result.assets.length, 'AD object', 'AD objects')}, ${plural(result.findings.length, 'finding', 'findings')} and ${plural(result.edges.length, 'attack edge', 'attack edges')}.`),
      'ok',
    );
    if (onDone) onDone();
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Zona de bienvenida y drag & drop */}
      <div className="rounded-2xl border border-hairline bg-surface-2/40 p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-alta/15 text-alta">
            <Users className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {L('Topología y rutas de Active Directory · BloodHound / SharpHound', 'Active Directory topology and paths · BloodHound / SharpHound')}
            </h3>
            <p className="mt-1 text-xs text-ink-3 leading-relaxed">
              {L('Carga un archivo de exportación JSON de BloodHound (ejemplo:', 'Load a BloodHound JSON export file (example:')}{' '}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-ink">
                *_computers.json
              </code>{' '}
              {L('o', 'or')}{' '}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-ink">
                *_users.json
              </code>
              ). {L('CTEM-Nexus mapeará controladores de dominio, activos críticos, cuentas expuestas a Kerberoasting y caminos de escalada hacia Domain Admins.', 'CTEM-Nexus maps domain controllers, critical assets, Kerberoastable accounts and escalation paths to Domain Admins.')}
            </p>
          </div>
        </div>

        {/* Dropzone estilo Apple */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? 'border-alta bg-alta/10 text-alta'
              : 'border-hairline bg-surface/50 hover:border-hairline-strong'
          }`}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-ink-2">
            <FileCode className="size-5" />
          </div>
          <div className="mt-2.5 text-xs font-medium text-ink">
            {file ? (
              <span className="font-semibold text-alta">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            ) : (
              L('Arrastra aquí tu archivo JSON de BloodHound o haz clic para seleccionarlo', 'Drop your BloodHound JSON file here or click to choose it')
            )}
          </div>
          <p className="mt-1 text-[0.6875rem] text-ink-3">{L('Soporta exportaciones JSON de SharpHound / BloodHound CE', 'Supports SharpHound / BloodHound CE JSON exports')}</p>

          <label className="mt-3.5 inline-flex cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent items-center justify-center rounded-full bg-surface-3 px-4 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-2 active:scale-95">
            <span>{file ? L('Cambiar archivo', 'Change file') : L('Explorar archivos', 'Browse files')}</span>
            <input type="file" accept=".json,application/json" className="sr-only" onChange={handleFileChange} />
          </label>
        </div>

        {/* Botón de análisis */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn btn-primary rounded-full px-5"
            onClick={handleProcess}
            disabled={!file || loading}
          >
            <Upload className="size-4" />
            {loading ? L('Analizando BloodHound…', 'Analyzing BloodHound…') : L('Analizar BloodHound', 'Analyze BloodHound')}
          </button>
        </div>

        {error && (
          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-critica/30 bg-critica/10 p-3 text-xs text-critica">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Resultados listos para incorporar */}
      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface-2/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-ok" />
              <div>
                <span className="font-semibold text-ink">{L('Estructura de Active Directory analizada', 'Active Directory structure parsed')}</span>
                <span className="ml-2 text-xs text-ink-3">
                  ({L('Motor', 'Engine')} {engineUsed === 'api' ? 'FastAPI' : L('Navegador TS', 'Browser TS')})
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {result.summary.domainControllers} DCs
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {L(plural(result.summary.totalComputers, 'equipo', 'equipos'), plural(result.summary.totalComputers, 'computer', 'computers'))}
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {L(plural(result.summary.totalUsers, 'usuario', 'usuarios'), plural(result.summary.totalUsers, 'user', 'users'))}
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {L(plural(result.summary.edgesCreated, 'arista', 'aristas'), plural(result.summary.edgesCreated, 'edge', 'edges'))}
              </span>
            </div>
          </div>

          {/* Vectores AD detectados */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="rounded-xl border border-hairline bg-surface p-3">
              <div className="text-[0.6875rem] text-ink-3">Kerberoasting</div>
              <div className="mt-1 font-mono text-base font-semibold text-alta">
                {result.summary.kerberoastable}
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-3">
              <div className="text-[0.6875rem] text-ink-3">AS-REP Roasting</div>
              <div className="mt-1 font-mono text-base font-semibold text-media">
                {result.summary.asrepRoastable}
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-3">
              <div className="text-[0.6875rem] text-ink-3">{L('Delegación sin restricciones', 'Unconstrained delegation')}</div>
              <div className="mt-1 font-mono text-base font-semibold text-critica">
                {result.summary.unconstrainedDelegation}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              {L('Objetos AD identificados', 'Identified AD objects')} ({result.assets.length})
            </h4>
            <div tabIndex={0} className="max-h-52 divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline bg-surface">
              {result.assets.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    {a.criticality === 5 ? (
                      <span title={L('Controlador de dominio / activo crítico', 'Domain controller / critical asset')}>
                        <Crown className="size-3.5 text-accent" />
                      </span>
                    ) : (
                      <Server className="size-3.5 text-ink-3" />
                    )}
                    <span className="font-semibold text-ink">{a.name}</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2">
                      {assetTypeLabel(a.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.tags.slice(0, 3).map((t) => (
                      <span key={t} className="chip text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {result.assets.length > 6 && (
                <div className="px-3 py-2 text-center text-xs text-ink-3">
                  {L(`… y ${result.assets.length - 6} objetos AD adicionales listos para incorporar.`, `… and ${result.assets.length - 6} more AD objects ready to add.`)}
                </div>
              )}
            </div>
          </div>

          {result.findings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                {L('Debilidades y vectores de escalada', 'Weaknesses and escalation vectors')} ({result.findings.length})
              </h4>
              <div tabIndex={0} className="max-h-40 divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline bg-surface">
                {result.findings.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-3.5 text-critica" />
                      <span className="font-medium text-ink">{f.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">{f.assetId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <button
              type="button"
              className="btn btn-primary rounded-full px-5"
              onClick={handleApply}
            >
              {L('Mapear topología de AD en CTEM-Nexus', 'Map AD topology into CTEM-Nexus')}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
