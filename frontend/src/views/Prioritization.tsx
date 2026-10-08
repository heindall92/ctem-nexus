import { ExternalLink, FileSpreadsheet, Flame, Pencil, Plus, Radar, Search, Sparkles, Trash2, Upload, Users, Zap } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BloodHoundUploader } from '../components/BloodHoundUploader';
import { NmapUploader } from '../components/NmapUploader';
import { techniqueById, techniquesOf } from '../engine/attack';
import { CSV_TEMPLATE, importFindings } from '../engine/io';
import { GUIDE_KEYS, guideIn } from '../engine/remediation';
import type { Band, Finding, FindingKind, FindingStatus } from '../engine/types';
import { Drawer, Modal, TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, PageHeader, Field, Score, ScoreBar, Segmented } from '../components/ui';
import { useResult } from '../lib/analysis';
import { download, readFile } from '../lib/download';
import { explanationIn, factorsIn } from '../engine/explain';
import { BAND_COLOR, kindLabel, n1, pct, statusLabel } from '../lib/format';
import { screen, useL } from '../i18n';
import { nextId, useStore } from '../store/store';

type BandFilter = 'todas' | Band;

export function Prioritization() {
  const c = screen[useStore((s) => s.lang)];
  const L = useL();
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
  const [showNmap, setShowNmap] = useState(false);
  const [showBloodhound, setShowBloodhound] = useState(false);
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
      if (!findings.length) { notify(L('No se ha encontrado ningún hallazgo válido en el archivo.', 'No valid finding was found in the file.'), 'error'); return; }
      addFindings(findings);
      const orphan = findings.filter((f) => !aById.has(f.assetId)).length;
      notify(L(`Importados ${findings.length} hallazgos${rejected ? `, ${rejected} filas descartadas` : ''}${orphan ? `; ${orphan} sin activo conocido` : ''}.`, `Imported ${findings.length} findings${rejected ? `, ${rejected} rows discarded` : ''}${orphan ? `; ${orphan} without a known asset` : ''}.`), rejected || orphan ? 'info' : 'ok');
    } catch (e) {
      notify(e instanceof Error ? e.message : L('No se pudo leer el archivo.', 'The file could not be read.'), 'error');
    }
  };

  const sel = selected ? result.scored.find((s) => s.id === selected) : undefined;
  const selF = selected ? fById.get(selected) : undefined;

  return (
    <>
      <TopBar title={c.prioTitle} />
      <div className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-8">
        <PageHeader
          icon={<Radar />}
          eyebrow={L('Fases 2 y 3 · Descubrimiento y priorización', 'Stages 2 & 3 · Discovery and prioritization')}
          title={L('Catálogo de exposición', 'Exposure catalog')}
          badge={project.demo ? <DemoBadge /> : undefined}
          lead={L('Cada hallazgo con su puntuación de 0 a 100, explicada factor a factor: severidad, explotación real (KEV, EPSS), criticidad, exposición y cercanía a una joya de la corona.', 'Every finding with its 0–100 score, explained factor by factor: severity, real exploitation (KEV, EPSS), criticality, exposure and closeness to a crown jewel.')}
          actions={<>
            <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
            <button type="button" className="btn" onClick={() => setShowNmap(true)}><Radar className="size-4" />{c.importNmap}</button>
            <button type="button" className="btn" onClick={() => setShowBloodhound(true)}><Users className="size-4" />{c.importBh}</button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload className="size-4" />{L('Importar JSON/CSV', 'Import JSON/CSV')}</button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('nuevo')} disabled={project.assets.length === 0}><Plus className="size-4" />{L('Añadir hallazgo', 'Add finding')}</button>
          </>}
        />
        <div className="mt-5" />
        {project.findings.length === 0 ? (
          <div className="panel">
            <Empty icon={<Radar />} title={c.noFindings} text={c.noFindingsText}>
              <button type="button" className="btn btn-primary" onClick={() => setShowNmap(true)}><Radar />{c.importNmapScan}</button>
              <button type="button" className="btn" onClick={() => setShowBloodhound(true)}><Users />{c.importBh}</button>
              <button type="button" className="btn" onClick={() => { loadDemo(); notify(c.demoLoadedShort); }}><Sparkles />{c.loadDemo}</button>
              <button type="button" className="btn" onClick={() => download('plantilla-hallazgos.csv', CSV_TEMPLATE, 'text/csv;charset=utf-8')}><FileSpreadsheet />{L('Descargar plantilla CSV', 'Download CSV template')}</button>
            </Empty>
          </div>
        ) : (
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3">
              <div className="relative w-full sm:w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                <input className="field pl-9" placeholder={L('Buscar por ID, CVE, título o activo', 'Search by ID, CVE, title or asset')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={L('Buscar hallazgos', 'Search findings')} />
              </div>
              <Segmented<BandFilter>
                label={L('Filtrar por prioridad', 'Filter by priority')} value={band} onChange={setBand}
                options={[{ value: 'todas', label: c.allBands }, ...(['critica', 'alta', 'media', 'baja'] as Band[]).map((b) => ({ value: b, label: <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: BAND_COLOR[b] }} />{c.band[b]}</span> }))]}
              />
              <label className="ml-auto flex items-center gap-2 text-xs text-ink-3">
                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[var(--color-accent)]" />
                {L('Mostrar mitigados y no explotables', 'Show mitigated and not exploitable')}
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => download('plantilla-hallazgos.csv', CSV_TEMPLATE, 'text/csv;charset=utf-8')}><FileSpreadsheet />{L('Plantilla CSV', 'CSV template')}</button>
            </div>
            {/* Móvil: tarjetas en lugar de tabla */}
            <ul className="divide-hair sm:hidden" data-testid="tarjetas-hallazgos">
              {rows.map((sc) => {
                const f = fById.get(sc.id)!;
                const closed = f.status === 'mitigado' || f.status === 'no_explotable';
                return (
                  <li key={sc.id}>
                    <button type="button" className={`row-interactive flex w-full items-start gap-3 px-4 py-3 text-left ${closed ? 'opacity-55' : ''}`} aria-current={selected === sc.id ? 'true' : undefined} onClick={() => select(sc.id)}>
                      <Score score={sc.score} band={sc.band} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 font-medium">{f.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-3"><span className="num">{f.cve ?? f.id}</span> · {aById.get(f.assetId)?.name ?? f.assetId}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          {f.kev && <span className="chip" style={{ color: 'var(--color-critica)' }}><Flame />KEV</span>}
                          {f.exploitPublic && <span className="chip"><Zap />Exploit</span>}
                          {sc.onAttackPath && <span className="chip" style={{ color: 'var(--color-accent)' }}>{L('Ruta', 'Path')}</span>}
                          <StatusPill status={f.status} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {rows.length === 0 && <li className="px-4 py-10 text-center text-ink-3">{L('Ningún hallazgo coincide con el filtro.', 'No finding matches the filter.')}</li>}
            </ul>
            <div className="hidden max-h-[calc(100dvh-14rem)] overflow-auto sm:block">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[6.5rem]">{L('Puntuación', 'Score')}</th>
                    <th>{L('Hallazgo', 'Finding')}</th>
                    <th>{c.thAsset}</th>
                    <th className="text-right">CVSS</th>
                    <th className="text-right">EPSS</th>
                    <th>{L('Señales', 'Signals')}</th>
                    <th>{L('Estado', 'Status')}</th>
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
                            <span>{kindLabel(f.kind)}</span>
                          </div>
                        </td>
                        <td className="max-w-[14rem]"><div className="truncate text-ink-2">{aById.get(f.assetId)?.name ?? <span className="text-alta">{L('Activo desconocido', 'Unknown asset')} ({f.assetId})</span>}</div></td>
                        <td className="num text-right">{n1(f.cvss)}</td>
                        <td className="num text-right text-ink-2">{f.epss == null ? '—' : pct(f.epss)}</td>
                        <td>
                          <div className="flex gap-1">
                            {f.kev && <span className="chip" style={{ color: 'var(--color-critica)' }} title={L('En el catálogo CISA KEV', 'In the CISA KEV catalog')}><Flame />KEV</span>}
                            {f.exploitPublic && <span className="chip" title={L('Exploit público disponible', 'Public exploit available')}><Zap />Exploit</span>}
                            {s.onAttackPath && <span className="chip" style={{ color: 'var(--color-accent)' }} title={L('El activo está en una ruta de ataque', 'The asset is on an attack path')}>{L('Ruta', 'Path')}</span>}
                          </div>
                        </td>
                        <td><StatusPill status={f.status} /></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-3">{L('Ningún hallazgo coincide con el filtro.', 'No finding matches the filter.')}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border-t border-hairline px-4 py-2.5 text-xs text-ink-3">{L(`${rows.length} de ${project.findings.length} hallazgos · ordenados por puntuación`, `${rows.length} of ${project.findings.length} findings · sorted by score`)}</div>
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

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={<h2 className="title-md">{editing === 'nuevo' ? L('Nuevo hallazgo', 'New finding') : L('Editar hallazgo', 'Edit finding')}</h2>} width={500}>
        {editing && <FindingForm initial={editing === 'nuevo' ? null : editing} onDone={() => setEditing(null)} />}
      </Drawer>

      <Modal open={showNmap} onClose={() => setShowNmap(false)} title={L('Ingesta de escaneo Nmap (XML)', 'Nmap scan intake (XML)')} maxWidth={680}>
        <NmapUploader onDone={() => setShowNmap(false)} />
      </Modal>

      <Modal open={showBloodhound} onClose={() => setShowBloodhound(false)} title={L('Ingesta de Active Directory (BloodHound)', 'Active Directory intake (BloodHound)')} maxWidth={680}>
        <BloodHoundUploader onDone={() => setShowBloodhound(false)} />
      </Modal>
    </>
  );
}

export function StatusPill({ status }: { status: FindingStatus }) {
  const color = status === 'validado' ? 'var(--color-critica)' : status === 'mitigado' ? 'var(--color-ok)' : status === 'no_explotable' ? 'var(--color-ink-3)' : 'var(--color-ink-2)';
  useStore((s) => s.lang); // vuelve a pintar al cambiar de idioma
  return <span className="chip" style={{ color }}>{statusLabel(status)}</span>;
}

function FindingDetail({ findingId }: { findingId: string }) {
  const lang = useStore((s) => s.lang);
  const L = useL();
  const { result } = useResult();
  const project = useStore((s) => s.project);
  const s = result.scored.find((x) => x.id === findingId)!;
  const f = project.findings.find((x) => x.id === findingId)!;
  const asset = project.assets.find((a) => a.id === f.assetId);
  const g = guideIn(lang, f.remediation, f.kind);
  const done = project.progress?.[f.id] ?? [];
  const toggleStep = useStore((st) => st.toggleStep);
  const setFocusTechnique = useStore((st) => st.setFocusTechnique);
  const setView = useStore((st) => st.setView);
  const techs = techniquesOf(f);
  const cve = f.cve && /^CVE-\d{4}-\d{4,7}$/i.test(f.cve) ? f.cve.toUpperCase() : null;
  const refs = [
    ...(cve ? [
      { label: `NVD · ${cve}`, href: `https://nvd.nist.gov/vuln/detail/${cve}` },
      { label: 'CISA KEV', href: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${cve}` },
      { label: 'FIRST EPSS', href: 'https://www.first.org/epss/' },
    ] : []),
    ...(g.reference ? [{ label: L('Guía del fabricante', 'Vendor guidance'), href: g.reference }] : []),
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="display-num text-[2.5rem] leading-none" style={{ color: BAND_COLOR[s.band] }}>{n1(s.score)}</span>
        <div className="flex flex-col items-start gap-1">
          <BandBadge band={s.band} />
          <span className="text-xs text-ink-3">{L('SLA de remediación', 'Remediation SLA')}: <span className="num text-ink-2">{s.slaDays}</span> {L('días', 'days')}</span>
        </div>
      </div>
      <p className="rounded-xl bg-ground px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]">{explanationIn(lang, s, f, asset)}</p>
      <div>
        <h3 className="label mb-2 font-medium">{L('Desglose de la puntuación', 'Score breakdown')}</h3>
        <ul className="flex flex-col gap-3">
          {factorsIn(lang, s, f, asset).map((fa) => (
            <li key={fa.key}>
              <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                <span className="font-medium">{fa.label}</span>
                <span className="num text-ink-2">{fa.points > 0 && fa.key === 'validacion' ? '+' : ''}{n1(fa.points)}{fa.max > 0 && <span className="text-ink-3"> / {fa.max}</span>}</span>
              </div>
              {fa.max > 0 && <div className="mt-1.5"><ScoreBar value={fa.points} max={fa.max} color={fa.key === 'validacion' ? 'var(--color-critica)' : 'var(--color-accent)'} /></div>}
              <div className="mt-1 text-xs text-ink-3">{fa.detail}</div>
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.8125rem]">
        <div><dt className="label">{L('Activo', 'Asset')}</dt><dd>{asset?.name ?? f.assetId}</dd></div>
        <div><dt className="label">IP / CIDR</dt><dd className="num">{asset?.ip || '—'}</dd></div>
        <div><dt className="label">{L('Tipo', 'Type')}</dt><dd>{kindLabel(f.kind)}</dd></div>
        <div><dt className="label">{L('Detectado', 'Detected')}</dt><dd className="num">{f.detectedAt ?? '—'}</dd></div>
        {f.technique && <div className="col-span-2"><dt className="label">{L('Movimiento que habilita', 'Movement it enables')}</dt><dd>{f.technique}</dd></div>}
        {f.description && <div className="col-span-2"><dt className="label">{L('Descripción', 'Description')}</dt><dd className="text-ink-2">{f.description}</dd></div>}
      </dl>
      <div data-testid="attack-hallazgo">
        <h3 className="label mb-2 font-medium">MITRE ATT&amp;CK <span className="font-normal text-ink-3">· {f.attack?.length ? L('fijadas por el analista', 'pinned by the analyst') : L('inferidas', 'inferred')}</span></h3>
        {techs.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {techs.map((id) => {
              const t = techniqueById(id)!;
              return (
                <li key={id}>
                  <button type="button" className="chip transition-transform duration-150 ease-[var(--ease-out)] hover:bg-surface-3 active:scale-[0.97]" style={{ background: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }} onClick={() => { setFocusTechnique(id); setView('mitre'); }} aria-label={L(`Ver ${id} ${t.nameEs} en el mapa ATT&CK`, `Show ${id} ${t.name} on the ATT&CK map`)}>
                    <span className="num">{id}</span><span>{lang === 'es' ? t.nameEs : t.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-xs text-ink-3">{L('Sin técnica identificable. Puedes fijarla al editar el hallazgo.', 'No identifiable technique. You can pin one when editing the finding.')}</p>}
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="label font-medium">{L('Remediación', 'Remediation')} · {g.owner}</h3>
          <span className="num text-xs text-ink-3" data-testid="pasos-hechos">{done.length}/{g.steps.length}</span>
        </div>
        <ol className="flex flex-col gap-1">
          {g.steps.map((st, i) => (
            <li key={st}>
              <label className="step-row">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" checked={done.includes(i)} onChange={() => toggleStep(f.id, i)} />
                <span className={done.includes(i) ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink-2'}>{st}</span>
              </label>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="label mb-2 font-medium">{L('Referencias', 'References')}</h3>
        <ul className="flex flex-wrap gap-2">
          {refs.map((r) => (
            <li key={r.href}>
              <a className="btn btn-sm" href={r.href} target="_blank" rel="noopener noreferrer"><ExternalLink />{r.label}</a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">{L('Se abren en una pestaña nueva. CTEM-Nexus no consulta estas fuentes por su cuenta.', 'They open in a new tab. CTEM-Nexus never queries these sources by itself.')}</p>
      </div>
    </div>
  );
}

function FindingActions({ finding, onEdit }: { finding: Finding; onEdit: () => void }) {
  const L = useL();
  const setStatus = useStore((s) => s.setStatus);
  const del = useStore((s) => s.deleteFinding);
  const notify = useStore((s) => s.notify);
  return (
    <div className="flex flex-col gap-3">
      <Segmented<FindingStatus>
        label={L('Estado del hallazgo', 'Finding status')} value={finding.status}
        onChange={(st) => { setStatus(finding.id, st); notify(`${finding.id}: ${statusLabel(st).toLowerCase()}.`); }}
        options={(['abierto', 'validado', 'no_explotable', 'mitigado'] as FindingStatus[]).map((st) => ({ value: st, label: statusLabel(st) }))}
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" onClick={onEdit}><Pencil />{L('Editar', 'Edit')}</button>
        <button type="button" className="btn btn-sm btn-ghost btn-danger ml-auto" onClick={() => { del(finding.id); notify(L(`Hallazgo ${finding.id} eliminado.`, `Finding ${finding.id} deleted.`), 'info'); }}><Trash2 />{L('Eliminar', 'Delete')}</button>
      </div>
    </div>
  );
}

const CVE_RE = /^CVE-\d{4}-\d{4,7}$/i;

function FindingForm({ initial, onDone }: { initial: Finding | null; onDone: () => void }) {
  const lang = useStore((s) => s.lang);
  const L = useL();
  const project = useStore((s) => s.project);
  const upsert = useStore((s) => s.upsertFinding);
  const notify = useStore((s) => s.notify);
  const select = useStore((s) => s.selectFinding);
  const [f, setF] = useState<Finding>(() => initial ?? {
    id: nextId('H-', project.findings.map((x) => x.id)), title: '', kind: 'cve', cve: '', cvss: 7.5, epss: null, kev: false, exploitPublic: false,
    assetId: project.assets[0]?.id ?? '', status: 'abierto', remediation: 'patch_cve', detectedAt: new Date().toISOString().slice(0, 10), leadsTo: [], technique: '', edgeFrom: null,
  });
  const set = <K extends keyof Finding>(k: K, v: Finding[K]) => setF((p) => ({ ...p, [k]: v }));
  const [attackText, setAttackText] = useState(() => (initial?.attack ?? []).join(', '));
  const attackIds = [...new Set(attackText.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))];
  const unknownAttack = attackIds.filter((id) => !techniqueById(id));
  const attackErr = unknownAttack.length ? L(`No están en el catálogo: ${unknownAttack.join(', ')}`, `Not in the catalogue: ${unknownAttack.join(', ')}`) : null;
  const inferred = techniquesOf({ ...f, attack: [] });
  const cveErr = f.cve && !CVE_RE.test(f.cve) ? L('Formato esperado: CVE-AAAA-NNNN', 'Expected format: CVE-YYYY-NNNN') : null;
  const titleErr = !f.title.trim() ? L('Obligatorio', 'Required') : null;
  const dupErr = !initial && project.findings.some((x) => x.id === f.id) ? L('Ese ID ya existe', 'That ID already exists') : null;
  const valid = !cveErr && !titleErr && !dupErr && !attackErr && f.assetId;
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (!valid) return;
      const next: Finding = { ...f, title: f.title.trim(), cve: f.cve ? f.cve.toUpperCase() : null, technique: f.technique?.trim() || null, attack: attackIds };
      if (!attackIds.length) delete next.attack;
      upsert(next);
      notify(initial ? L(`Hallazgo ${f.id} actualizado.`, `Finding ${f.id} updated.`) : L(`Hallazgo ${f.id} añadido.`, `Finding ${f.id} added.`));
      select(f.id);
      onDone();
    }}>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="ID" error={dupErr}><input className="field num" value={f.id} disabled={!!initial} onChange={(e) => set('id', e.target.value.trim())} /></Field>
        <Field label={L('Título', 'Title')} error={f.title ? null : titleErr}><input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={L('p. ej. Log4Shell en el portal', 'e.g. Log4Shell on the portal')} autoFocus /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={L('Tipo', 'Type')}>
          <select className="field" value={f.kind} onChange={(e) => set('kind', e.target.value as FindingKind)}>
            {(['cve', 'configuracion', 'identidad'] as FindingKind[]).map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        </Field>
        <Field label="CVE" error={cveErr}><input className="field num" value={f.cve ?? ''} aria-invalid={!!cveErr} onChange={(e) => set('cve', e.target.value.trim())} placeholder="CVE-2021-44228" /></Field>
        <Field label="CVSS (0–10)"><input className="field num" type="number" min={0} max={10} step={0.1} value={f.cvss} onChange={(e) => set('cvss', Math.min(10, Math.max(0, Number(e.target.value))))} /></Field>
        <Field label="EPSS (0–1)" hint={L('Probabilidad de explotación en 30 días', 'Probability of exploitation in 30 days')}><input className="field num" type="number" min={0} max={1} step={0.001} value={f.epss ?? ''} onChange={(e) => set('epss', e.target.value === '' ? null : Math.min(1, Math.max(0, Number(e.target.value))))} /></Field>
      </div>
      <div className="flex gap-5 text-[0.8125rem]">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--color-accent)]" checked={f.kev} onChange={(e) => set('kev', e.target.checked)} />{L('En CISA KEV', 'In CISA KEV')}</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--color-accent)]" checked={f.exploitPublic} onChange={(e) => set('exploitPublic', e.target.checked)} />{L('Exploit público', 'Public exploit')}</label>
      </div>
      <Field label={L('Activo afectado', 'Affected asset')}>
        <select className="field" value={f.assetId} onChange={(e) => set('assetId', e.target.value)}>
          {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label={L('Guía de remediación', 'Remediation guide')}>
        <select className="field" value={f.remediation} onChange={(e) => set('remediation', e.target.value)}>
          {GUIDE_KEYS.map((k) => <option key={k} value={k}>{guideIn(lang, k).title}</option>)}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-3 rounded-xl p-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <legend className="label px-1 font-medium">{L('Movimiento que habilita (opcional, para las rutas de ataque)', 'Movement it enables (optional, for attack paths)')}</legend>
        <Field label={L('Técnica', 'Technique')}><input className="field" value={f.technique ?? ''} onChange={(e) => set('technique', e.target.value)} placeholder={L('p. ej. Reutilización de credenciales', 'e.g. Credential reuse')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={L('Desde', 'From')} hint={L('Por defecto, el activo afectado', 'Defaults to the affected asset')}>
            <select className="field" value={f.edgeFrom ?? ''} onChange={(e) => set('edgeFrom', e.target.value || null)}>
              <option value="">{L('Activo afectado', 'Affected asset')}</option>
              {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={L('Da acceso a', 'Gives access to')}>
            <select className="field" value={f.leadsTo?.[0] ?? ''} onChange={(e) => set('leadsTo', e.target.value ? [e.target.value] : [])}>
              <option value="">{L('Ninguno', 'None')}</option>
              {project.assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>
      <Field
        label={L('Técnicas MITRE ATT&CK (opcional)', 'MITRE ATT&CK techniques (optional)')}
        error={attackErr}
        hint={L(`Vacío = automáticas${inferred.length ? `: ${inferred.join(', ')}` : ''}. Separa los ID con comas.`, `Empty = automatic${inferred.length ? `: ${inferred.join(', ')}` : ''}. Separate IDs with commas.`)}
      >
        <input className="field num" value={attackText} aria-invalid={!!attackErr} onChange={(e) => setAttackText(e.target.value)} placeholder={inferred.join(', ') || 'T1190, T1059'} />
      </Field>
      <Field label={L('Descripción', 'Description')}><textarea className="field" rows={3} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>{L('Cancelar', 'Cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>{initial ? L('Guardar cambios', 'Save changes') : L('Añadir hallazgo', 'Add finding')}</button>
      </div>
    </form>
  );
}
