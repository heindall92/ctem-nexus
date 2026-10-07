import { FileSpreadsheet, Flame, Pencil, Plus, Radar, Search, Sparkles, Trash2, Upload, Zap } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BAND_LABEL } from '../engine/constants';
import { fmt } from '../engine/engine';
import { CSV_TEMPLATE, importFindings } from '../engine/io';
import { GUIDE_KEYS, GUIDES, guideFor } from '../engine/remediation';
import type { Band, Finding, FindingKind, FindingStatus } from '../engine/types';
import { Drawer, TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, Field, Score, ScoreBar, Segmented } from '../components/ui';
import { useResult } from '../lib/analysis';
import { download, readFile } from '../lib/download';
import { BAND_COLOR, KIND_LABEL, pct, STATUS_LABEL } from '../lib/format';
import { nextId, useStore } from '../store/store';

type BandFilter = 'todas' | Band;

export function Prioritization() {
  const project = useStore((s) => s.project);
  const selected = useStore((s) => s.selectedFinding);
  const select = useStore((s) => s.selectFinding);
  const addFindings = useStore((s) => s.addFindings);
  const loadDemo = useStore((s) => s.loadDemo);
  const notify = useStore((s) => s.notify);
  const { result } = useResult();
  const [q, setQ] = useState('');
  const [band, setBand] = useState<BandFilter>('todas');
  const [showClosed, setShowClosed] = useState(true);
  const [editing, setEditing] = useState<Finding | 'nuevo' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fById = useMemo(() => new Map(project.findings.map((f) => [f.id, f])), [project.findings]);
  const aById = useMemo(() => new Map(project.assets.map((a) => [a.id, a])), [project.assets]);
  const rows = result.scored.filter((s) => {
    const f = fById.get(s.id);
    if (!f) return false;
    if (band !== 'todas' && s.band !== band) return false;
    if (!showClosed && (f.status === 'mitigado' || f.status === 'no_explotable')) return false;
    if (!q) return true;
    const hay = `${f.id} ${f.title} ${f.cve ?? ''} ${aById.get(f.assetId)?.name ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const onImport = async (file: File) => {
    try {
      const text = await readFile(file);
      const { findings, rejected } = importFindings(text, project.assets);
      if (!findings.length) { notify('No se ha encontrado ningún hallazgo válido en el archivo.', 'error'); return; }
      addFindings(findings);
      const orphan = findings.filter((f) => !aById.has(f.assetId)).length;
      notify(`Importados ${findings.length} hallazgos${rejected ? `, ${rejected} filas descartadas` : ''}${orphan ? `; ${orphan} sin activo conocido` : ''}.`, rejected || orphan ? 'info' : 'ok');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo leer el archivo.', 'error');
    }
  };

  const sel = selected ? result.scored.find((s) => s.id === selected) : undefined;
  const selF = selected ? fById.get(selected) : undefined;

  return (
    <>
      <TopBar
        title="Descubrimiento y priorización"
        subtitle={<><span>Puntuación 0–100 por hallazgo con explicación de cada factor</span>{project.demo && <DemoBadge />}</>}
        actions={<>
          <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload />Importar JSON/CSV</button>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('nuevo')} disabled={project.assets.length === 0}><Plus />Añadir hallazgo</button>
        </>}
      />
      <div className="view-enter mx-auto max-w-[1240px] px-8 py-7">
        {project.findings.length === 0 ? (
          <div className="panel">
            <Empty icon={<Radar />} title="Sin hallazgos" text="Importa la salida de tus escáneres en JSON o CSV, añade hallazgos a mano o carga el conjunto de ejemplo (Log4Shell, ProxyShell, Citrix Bleed y problemas de Directorio Activo).">
              <button type="button" className="btn btn-primary" onClick={() => { loadDemo(); notify('Datos de ejemplo cargados.'); }}><Sparkles />Cargar datos de demo</button>
              <button type="button" className="btn" onClick={() => download('plantilla-hallazgos.csv', CSV_TEMPLATE, 'text/csv;charset=utf-8')}><FileSpreadsheet />Descargar plantilla CSV</button>
            </Empty>
          </div>
        ) : (
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3">
              <div className="relative w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-4" />
                <input className="field pl-9" placeholder="Buscar por ID, CVE, título o activo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar hallazgos" />
              </div>
              <Segmented<BandFilter>
                label="Filtrar por prioridad" value={band} onChange={setBand}
                options={[{ value: 'todas', label: 'Todas' }, ...(['critica', 'alta', 'media', 'baja'] as Band[]).map((b) => ({ value: b, label: <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: BAND_COLOR[b] }} />{BAND_LABEL[b]}</span> }))]}
              />
              <label className="ml-auto flex items-center gap-2 text-xs text-ink-3">
                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[var(--color-accent)]" />
                Mostrar mitigados y no explotables
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => download('plantilla-hallazgos.csv', CSV_TEMPLATE, 'text/csv;charset=utf-8')}><FileSpreadsheet />Plantilla CSV</button>
            </div>
            <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[6.5rem]">Puntuación</th>
                    <th>Hallazgo</th>
                    <th>Activo</th>
                    <th className="text-right">CVSS</th>
                    <th className="text-right">EPSS</th>
                    <th>Señales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const f = fById.get(s.id)!;
                    const closed = f.status === 'mitigado' || f.status === 'no_explotable';
                    return (
                      <tr key={s.id} className={`row-interactive ${closed ? 'opacity-55' : ''}`} aria-selected={selected === s.id} onClick={() => select(s.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s.id); } }}>
                        <td><Score score={s.score} band={s.band} /></td>
                        <td className="max-w-[26rem]">
                          <div className="truncate font-medium">{f.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                            <span className="num">{f.id}</span>
                            {f.cve && <span className="num text-ink-2">{f.cve}</span>}
                            <span>{KIND_LABEL[f.kind]}</span>
                          </div>
                        </td>
                        <td className="max-w-[14rem]"><div className="truncate text-ink-2">{aById.get(f.assetId)?.name ?? <span className="text-alta">Activo desconocido ({f.assetId})</span>}</div></td>
                        <td className="num text-right">{fmt(f.cvss)}</td>
                        <td className="num text-right text-ink-2">{f.epss == null ? '—' : pct(f.epss)}</td>
                        <td>
                          <div className="flex gap-1">
                            {f.kev && <span className="chip" style={{ color: 'var(--color-critica)' }} title="En el catálogo CISA KEV"><Flame />KEV</span>}
                            {f.exploitPublic && <span className="chip" title="Exploit público disponible"><Zap />Exploit</span>}
                            {s.onAttackPath && <span className="chip" style={{ color: 'var(--color-accent)' }} title="El activo está en una ruta de ataque">Ruta</span>}
                          </div>
                        </td>
                        <td><StatusPill status={f.status} /></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-3">Ningún hallazgo coincide con el filtro.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border-t border-hairline px-4 py-2.5 text-xs text-ink-3">{rows.length} de {project.findings.length} hallazgos · ordenados por puntuación</div>
          </section>
        )}
      </div>

      <Drawer
        open={!!(sel && selF) && !editing}
        onClose={() => select(null)}
        title={selF && sel ? (
          <div>
            <div className="flex items-center gap-2 text-xs text-ink-3"><span className="num">{selF.id}</span>{selF.cve && <span className="num text-ink-2">{selF.cve}</span>}</div>
            <h2 className="title-md mt-1">{selF.title}</h2>
          </div>
        ) : ''}
        footer={selF && <FindingActions finding={selF} onEdit={() => setEditing(selF)} />}
      >
        {sel && selF && <FindingDetail findingId={selF.id} />}
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={<h2 className="title-md">{editing === 'nuevo' ? 'Nuevo hallazgo' : 'Editar hallazgo'}</h2>} width={500}>
        {editing && <FindingForm initial={editing === 'nuevo' ? null : editing} onDone={() => setEditing(null)} />}
      </Drawer>
    </>
  );
}

export function StatusPill({ status }: { status: FindingStatus }) {
  const color = status === 'validado' ? 'var(--color-critica)' : status === 'mitigado' ? 'var(--color-ok)' : status === 'no_explotable' ? 'var(--color-ink-3)' : 'var(--color-ink-2)';
  return <span className="chip" style={{ color }}>{STATUS_LABEL[status]}</span>;
}

function FindingDetail({ findingId }: { findingId: string }) {
  const { result } = useResult();
  const project = useStore((s) => s.project);
  const s = result.scored.find((x) => x.id === findingId)!;
  const f = project.findings.find((x) => x.id === findingId)!;
  const asset = project.assets.find((a) => a.id === f.assetId);
  const g = guideFor(f.remediation, f.kind);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="display-num text-[2.5rem] leading-none" style={{ color: BAND_COLOR[s.band] }}>{fmt(s.score)}</span>
        <div className="flex flex-col items-start gap-1">
          <BandBadge band={s.band} />
          <span className="text-xs text-ink-3">SLA de remediación: <span className="num text-ink-2">{s.slaDays}</span> días</span>
        </div>
      </div>
      <p className="rounded-xl bg-ground px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]">{s.explanation}</p>
      <div>
        <h3 className="label mb-2 font-medium">Desglose de la puntuación</h3>
        <ul className="flex flex-col gap-3">
          {s.factors.map((fa) => (
            <li key={fa.key}>
              <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                <span className="font-medium">{fa.label}</span>
                <span className="num text-ink-2">{fa.points > 0 && fa.key === 'validacion' ? '+' : ''}{fmt(fa.points)}{fa.max > 0 && <span className="text-ink-4"> / {fa.max}</span>}</span>
              </div>
              {fa.max > 0 && <div className="mt-1.5"><ScoreBar value={fa.points} max={fa.max} color={fa.key === 'validacion' ? 'var(--color-critica)' : 'var(--color-accent)'} /></div>}
              <div className="mt-1 text-xs text-ink-3">{fa.detail}</div>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.8125rem]">
        <div><dt className="label">Activo</dt><dd>{asset?.name ?? f.assetId}</dd></div>
        <div><dt className="label">IP / CIDR</dt><dd className="num">{asset?.ip || '—'}</dd></div>
        <div><dt className="label">Tipo</dt><dd>{KIND_LABEL[f.kind]}</dd></div>
        <div><dt className="label">Detectado</dt><dd className="num">{f.detectedAt ?? '—'}</dd></div>
        {f.technique && <div className="col-span-2"><dt className="label">Técnica que habilita</dt><dd>{f.technique}</dd></div>}
        {f.description && <div className="col-span-2"><dt className="label">Descripción</dt><dd className="text-ink-2">{f.description}</dd></div>}
      </dl>
      <div>
        <h3 className="label mb-2 font-medium">Remediación · {g.owner}</h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-[0.8125rem] text-ink-2 marker:text-ink-4">{g.steps.map((st) => <li key={st}>{st}</li>)}</ol>
      </div>
    </div>
  );
}

function FindingActions({ finding, onEdit }: { finding: Finding; onEdit: () => void }) {
  const setStatus = useStore((s) => s.setStatus);
  const del = useStore((s) => s.deleteFinding);
  const notify = useStore((s) => s.notify);
  return (
    <div className="flex flex-col gap-3">
      <Segmented<FindingStatus>
        label="Estado del hallazgo" value={finding.status}
        onChange={(st) => { setStatus(finding.id, st); notify(`${finding.id}: ${STATUS_LABEL[st].toLowerCase()}.`); }}
        options={(['abierto', 'validado', 'no_explotable', 'mitigado'] as FindingStatus[]).map((st) => ({ value: st, label: STATUS_LABEL[st] }))}
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" onClick={onEdit}><Pencil />Editar</button>
        <button type="button" className="btn btn-sm btn-ghost btn-danger ml-auto" onClick={() => { del(finding.id); notify(`Hallazgo ${finding.id} eliminado.`, 'info'); }}><Trash2 />Eliminar</button>
      </div>
    </div>
  );
}

const CVE_RE = /^CVE-\d{4}-\d{4,7}$/i;

function FindingForm({ initial, onDone }: { initial: Finding | null; onDone: () => void }) {
  const project = useStore((s) => s.project);
  const upsert = useStore((s) => s.upsertFinding);
  const notify = useStore((s) => s.notify);
  const select = useStore((s) => s.selectFinding);
  const [f, setF] = useState<Finding>(() => initial ?? {
    id: nextId('H-', project.findings.map((x) => x.id)), title: '', kind: 'cve', cve: '', cvss: 7.5, epss: null, kev: false, exploitPublic: false,
    assetId: project.assets[0]?.id ?? '', status: 'abierto', remediation: 'patch_cve', detectedAt: new Date().toISOString().slice(0, 10), leadsTo: [], technique: '', edgeFrom: null,
  });
  const set = <K extends keyof Finding>(k: K, v: Finding[K]) => setF((p) => ({ ...p, [k]: v }));
  const cveErr = f.cve && !CVE_RE.test(f.cve) ? 'Formato esperado: CVE-AAAA-NNNN' : null;
  const titleErr = !f.title.trim() ? 'Obligatorio' : null;
  const dupErr = !initial && project.findings.some((x) => x.id === f.id) ? 'Ese ID ya existe' : null;
  const valid = !cveErr && !titleErr && !dupErr && f.assetId;
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (!valid) return;
      upsert({ ...f, title: f.title.trim(), cve: f.cve ? f.cve.toUpperCase() : null, technique: f.technique?.trim() || null });
      notify(initial ? `Hallazgo ${f.id} actualizado.` : `Hallazgo ${f.id} añadido.`);
      select(f.id);
      onDone();
    }}>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="ID" error={dupErr}><input className="field num" value={f.id} disabled={!!initial} onChange={(e) => set('id', e.target.value.trim())} /></Field>
        <Field label="Título" error={f.title ? null : titleErr}><input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="p. ej. Log4Shell en el portal" autoFocus /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select className="field" value={f.kind} onChange={(e) => set('kind', e.target.value as FindingKind)}>
            {(Object.keys(KIND_LABEL) as FindingKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="CVE" error={cveErr}><input className="field num" value={f.cve ?? ''} aria-invalid={!!cveErr} onChange={(e) => set('cve', e.target.value.trim())} placeholder="CVE-2021-44228" /></Field>
        <Field label="CVSS (0–10)"><input className="field num" type="number" min={0} max={10} step={0.1} value={f.cvss} onChange={(e) => set('cvss', Math.min(10, Math.max(0, Number(e.target.value))))} /></Field>
        <Field label="EPSS (0–1)" hint="Probabilidad de explotación en 30 días"><input className="field num" type="number" min={0} max={1} step={0.001} value={f.epss ?? ''} onChange={(e) => set('epss', e.target.value === '' ? null : Math.min(1, Math.max(0, Number(e.target.value))))} /></Field>
      </div>
      <div className="flex gap-5 text-[0.8125rem]">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--color-accent)]" checked={f.kev} onChange={(e) => set('kev', e.target.checked)} />En CISA KEV</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--color-accent)]" checked={f.exploitPublic} onChange={(e) => set('exploitPublic', e.target.checked)} />Exploit público</label>
      </div>
      <Field label="Activo afectado">
        <select className="field" value={f.assetId} onChange={(e) => set('assetId', e.target.value)}>
          {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Guía de remediación">
        <select className="field" value={f.remediation} onChange={(e) => set('remediation', e.target.value)}>
          {GUIDE_KEYS.map((k) => <option key={k} value={k}>{GUIDES[k].title}</option>)}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-3 rounded-xl p-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <legend className="label px-1 font-medium">Movimiento que habilita (opcional, para las rutas de ataque)</legend>
        <Field label="Técnica"><input className="field" value={f.technique ?? ''} onChange={(e) => set('technique', e.target.value)} placeholder="p. ej. Reutilización de credenciales" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde" hint="Por defecto, el activo afectado">
            <select className="field" value={f.edgeFrom ?? ''} onChange={(e) => set('edgeFrom', e.target.value || null)}>
              <option value="">Activo afectado</option>
              {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Da acceso a">
            <select className="field" value={f.leadsTo?.[0] ?? ''} onChange={(e) => set('leadsTo', e.target.value ? [e.target.value] : [])}>
              <option value="">Ninguno</option>
              {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>
      <Field label="Descripción"><textarea className="field" rows={3} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>{initial ? 'Guardar cambios' : 'Añadir hallazgo'}</button>
      </div>
    </form>
  );
}
