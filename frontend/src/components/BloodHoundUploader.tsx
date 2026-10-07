import { AlertCircle, CheckCircle2, ChevronRight, Crown, FileCode, Server, ShieldAlert, Upload, Users } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { parseBloodHoundJson, type BloodHoundParseResult } from '../engine/bloodhound';
import { readFile } from '../lib/download';
import { ASSET_TYPE_LABEL } from '../lib/format';
import { useStore } from '../store/store';

interface Props {
  onDone?: () => void;
}

export function BloodHoundUploader({ onDone }: Props) {
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
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo JSON de BloodHound.');
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
      `Ingestados ${result.assets.length} objetos AD, ${result.findings.length} hallazgos y ${result.edges.length} aristas de ataque.`,
      'ok',
    );
    if (onDone) onDone();
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Zona de bienvenida y drag & drop */}
      <div className="rounded-2xl border border-hairline bg-surface-2/40 p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <Users className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Topología y Rutas de Active Directory · BloodHound / SharpHound
            </h3>
            <p className="mt-1 text-xs text-ink-3 leading-relaxed">
              Carga un archivo de exportación JSON de BloodHound (ejemplo:{' '}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-ink">
                *_computers.json
              </code>{' '}
              o{' '}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-ink">
                *_users.json
              </code>
              ). CTEM-Nexus mapeará Controladores de Dominio, joyas de la corona, cuentas Kerberoastables y caminos de escalada hacia Domain Admins.
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
              ? 'border-orange-500 bg-orange-500/10 text-orange-400'
              : 'border-hairline bg-surface/50 hover:border-hairline-strong'
          }`}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-ink-2">
            <FileCode className="size-5" />
          </div>
          <div className="mt-2.5 text-xs font-medium text-ink">
            {file ? (
              <span className="font-semibold text-orange-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            ) : (
              'Arrastra aquí tu archivo JSON de BloodHound o haz clic para seleccionarlo'
            )}
          </div>
          <p className="mt-1 text-[0.6875rem] text-ink-4">Soporta exportaciones JSON de SharpHound / BloodHound CE</p>

          <label className="mt-3.5 inline-flex cursor-pointer items-center justify-center rounded-full bg-surface-3 px-4 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-2 active:scale-95">
            <span>{file ? 'Cambiar archivo' : 'Explorar archivos'}</span>
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
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
            {loading ? 'Analizando BloodHound...' : 'Analizar BloodHound'}
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
                <span className="font-semibold text-ink">Estructura Active Directory parseada</span>
                <span className="ml-2 text-xs text-ink-3">
                  (Motor {engineUsed === 'api' ? 'FastAPI' : 'Navegador TS'})
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {result.summary.domainControllers} DCs
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {result.summary.totalComputers} Equipos
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {result.summary.totalUsers} Usuarios
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-ink font-mono">
                {result.summary.edgesCreated} Aristas
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
              <div className="text-[0.6875rem] text-ink-3">Delegación libre</div>
              <div className="mt-1 font-mono text-base font-semibold text-critica">
                {result.summary.unconstrainedDelegation}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Objetos AD identificados ({result.assets.length})
            </h4>
            <div className="max-h-52 divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline bg-surface">
              {result.assets.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    {a.criticality === 5 ? (
                      <span title="Controlador de Dominio / Joya de la Corona">
                        <Crown className="size-3.5 text-accent" />
                      </span>
                    ) : (
                      <Server className="size-3.5 text-ink-4" />
                    )}
                    <span className="font-semibold text-ink">{a.name}</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                      {ASSET_TYPE_LABEL[a.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.tags.slice(0, 3).map((t) => (
                      <span key={t} className="chip text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {result.assets.length > 6 && (
                <div className="px-3 py-2 text-center text-xs text-ink-4">
                  ... y {result.assets.length - 6} objetos AD adicionales listos para incorporar.
                </div>
              )}
            </div>
          </div>

          {result.findings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Debilidades y vectores de escalada ({result.findings.length})
              </h4>
              <div className="max-h-40 divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline bg-surface">
                {result.findings.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-3.5 text-critica" />
                      <span className="font-medium text-ink">{f.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-4">{f.assetId}</span>
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
              Mapear topología de AD en CTEM-Nexus
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
