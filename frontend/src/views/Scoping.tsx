import { Crown, Crosshair, Globe, Pencil, Plus, Radar, Sparkles, Trash2, TriangleAlert, Users } from 'lucide-react';
import { useState } from 'react';
import { BloodHoundUploader } from '../components/BloodHoundUploader';
import { NmapUploader } from '../components/NmapUploader';
import { isIpOrCidr } from '../engine/io';
import type { Asset, AssetType, NetworkRange } from '../engine/types';
import { Drawer, Modal, TopBar } from '../components/Shell';
import { DemoBadge, Empty, Field, SectionTitle, Toggle } from '../components/ui';
import { ASSET_TYPE_LABEL, ipv4InCidr } from '../lib/format';
import { screen } from '../i18n';
import { nextId, useStore } from '../store/store';

export function Scoping() {
  const c = screen[useStore((s) => s.lang)];
  const project = useStore((s) => s.project);
  const del = useStore((s) => s.deleteAsset);
  const loadDemo = useStore((s) => s.loadDemo);
  const notify = useStore((s) => s.notify);
  const [editing, setEditing] = useState<Asset | 'nuevo' | null>(null);
  const [showNmap, setShowNmap] = useState(false);
  const [showBloodhound, setShowBloodhound] = useState(false);
  const inScope = project.ranges.filter((r) => r.inScope);
  const outside = (a: Asset) => a.ip && inScope.length > 0 && inScope.every((r) => ipv4InCidr(a.ip, r.cidr) === false);
  const findingsPer = new Map<string, number>();
  for (const f of project.findings) if (f.status === 'abierto' || f.status === 'validado') findingsPer.set(f.assetId, (findingsPer.get(f.assetId) ?? 0) + 1);
  const crown = project.assets.filter((a) => a.criticality === 5).length;

  return (
    <>
      <TopBar
        title={c.scopeTitle}
        subtitle={<><span>{c.scopeSub}</span>{project.demo && <DemoBadge />}</>}
      />
      <div className="view-enter mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-8">
        {/* Cabecera de la vista con acciones principales */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">{c.surfaceTitle}</h2>
            <p className="text-xs text-ink-3">{c.surfaceLead}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className="btn" onClick={() => setShowNmap(true)}><Radar className="size-4" />{c.importNmap}</button>
            <button type="button" className="btn" onClick={() => setShowBloodhound(true)}><Users className="size-4" />{c.importBh}</button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('nuevo')}><Plus className="size-4" />{c.addAsset}</button>
          </div>
        </div>
        <section className="panel overflow-hidden">
          <SectionTitle
            title={c.assetsTitle}
            detail={c.assetsDetail(project.assets.length, crown)}
          />
          {project.assets.length === 0 ? (
            <Empty icon={<Crosshair />} title={c.noAssets} text={c.noAssetsText}>
              <button type="button" className="btn btn-primary" onClick={() => setEditing('nuevo')}><Plus />{c.addAsset}</button>
              <button type="button" className="btn" onClick={() => setShowNmap(true)}><Radar />{c.importNmapScan}</button>
              <button type="button" className="btn" onClick={() => { loadDemo(); notify(c.demoLoadedShort); }}><Sparkles />{c.loadDemo}</button>
            </Empty>
          ) : (
            <div className="overflow-x-auto border-t border-hairline">
              <table className="table">
                <thead><tr><th>{c.thAsset}</th><th>{c.thType}</th><th>{c.thIp}</th><th>{c.thOwner}</th><th>{c.thCrit}</th><th>{c.thExposure}</th><th>{c.thTags}</th><th className="text-right">{c.thOpen}</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  {project.assets.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2 font-medium">
                          {a.criticality === 5 && <Crown className="size-3.5 text-accent" aria-label={c.crownJewel} />}
                          {a.name}
                        </div>
                        <div className="num text-xs text-ink-4">{a.id}</div>
                      </td>
                      <td className="text-ink-2">{c.assetTypes[a.type]}</td>
                      <td>
                        <span className="num text-ink-2">{a.ip || '—'}</span>
                        {outside(a) && <span className="ml-2 inline-flex items-center gap-1 text-xs text-alta" title={c.outOfScope}><TriangleAlert className="size-3.5" />{c.outOfScope}</span>}
                      </td>
                      <td className="text-ink-2">{a.owner || '—'}</td>
                      <td><Criticality value={a.criticality} /></td>
                      <td>{a.internetExposed ? <span className="chip" style={{ color: 'var(--color-alta)' }}><Globe />{c.internet}</span> : <span className="text-xs text-ink-3">{c.internal}</span>}</td>
                      <td><div className="flex max-w-[12rem] flex-wrap gap-1">{a.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div></td>
                      <td className="num text-right">{findingsPer.get(a.id) ?? 0}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Editar ${a.name}`} onClick={() => setEditing(a)}><Pencil /></button>
                          <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={`Eliminar ${a.name}`} onClick={() => { del(a.id); notify(c.assetRemoved(a.name), 'info'); }}><Trash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <Ranges />
      </div>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={<h2 className="title-md">{editing === 'nuevo' ? 'Nuevo activo' : 'Editar activo'}</h2>}>
        {editing && <AssetForm initial={editing === 'nuevo' ? null : editing} onDone={() => setEditing(null)} />}
      </Drawer>
      <Modal
        open={showNmap}
        onClose={() => setShowNmap(false)}
        title="Descubrimiento de activos con Nmap"
        subtitle="Ingesta de escaneo de red XML (-sV -sC -O -oX)"
        maxWidth={680}
      >
        <NmapUploader onDone={() => setShowNmap(false)} />
      </Modal>
      <Modal
        open={showBloodhound}
        onClose={() => setShowBloodhound(false)}
        title="Ingesta de Active Directory con BloodHound"
        subtitle="Mapeo de Controladores de Dominio, joyas de la corona y vectores de escalada"
        maxWidth={740}
      >
        <BloodHoundUploader onDone={() => setShowBloodhound(false)} />
      </Modal>
    </>
  );
}

function Criticality({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2" aria-label={`Criticidad ${value} de 5`}>
      <span className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className="h-3 w-1.5 rounded-sm" style={{ background: i <= value ? (value === 5 ? 'var(--color-accent)' : 'var(--color-ink-2)') : 'var(--color-surface-3)' }} />)}
      </span>
      <span className="num text-xs text-ink-3">{value}/5</span>
    </span>
  );
}

function Ranges() {
  const c = screen[useStore((s) => s.lang)];
  const ranges = useStore((s) => s.project.ranges);
  const upsert = useStore((s) => s.upsertRange);
  const del = useStore((s) => s.deleteRange);
  const [cidr, setCidr] = useState('');
  const [label, setLabel] = useState('');
  const err = cidr && !isIpOrCidr(cidr) ? c.invalidCidr : null;
  return (
    <section className="panel overflow-hidden">
      <SectionTitle title={c.rangesTitle} detail={c.rangesDetail} />
      <form
        className="flex flex-wrap items-start gap-2 border-t border-hairline px-5 py-3"
        onSubmit={(e) => { e.preventDefault(); if (!cidr || err) return; upsert({ id: nextId('r', ranges.map((r) => r.id), 2), cidr: cidr.trim(), label: label.trim() || cidr.trim(), inScope: true }); setCidr(''); setLabel(''); }}
      >
        <div className="w-48"><input className="field num" placeholder="10.20.0.0/16" value={cidr} aria-invalid={!!err} aria-label="CIDR" onChange={(e) => setCidr(e.target.value)} />{err && <div className="mt-1 text-xs text-critica">{err}</div>}</div>
        <input className="field w-64" placeholder={c.rangeDesc} value={label} aria-label={c.rangeDesc} onChange={(e) => setLabel(e.target.value)} />
        <button type="submit" className="btn" disabled={!cidr || !!err}><Plus />{c.addRange}</button>
      </form>
      <ul className="divide-hair border-t border-hairline">
        {ranges.map((r: NetworkRange) => (
          <li key={r.id} className="flex items-center gap-4 px-5 py-2.5">
            <span className="num w-44 text-ink">{r.cidr}</span>
            <span className={`flex-1 truncate ${r.inScope ? 'text-ink-2' : 'text-ink-4 line-through decoration-ink-4'}`}>{r.label}</span>
            <span className="text-xs text-ink-3">{r.inScope ? c.inScope : c.excluded}</span>
            <Toggle checked={r.inScope} onChange={(v) => upsert({ ...r, inScope: v })} label={`${r.cidr} en alcance`} />
            <button type="button" className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={`Eliminar ${r.cidr}`} onClick={() => del(r.id)}><Trash2 /></button>
          </li>
        ))}
        {ranges.length === 0 && <li className="px-5 py-5 text-ink-3">{c.noRanges}</li>}
      </ul>
    </section>
  );
}

function AssetForm({ initial, onDone }: { initial: Asset | null; onDone: () => void }) {
  const assets = useStore((s) => s.project.assets);
  const upsert = useStore((s) => s.upsertAsset);
  const notify = useStore((s) => s.notify);
  const [a, setA] = useState<Asset>(() => initial ?? { id: nextId('a', assets.map((x) => x.id), 2), name: '', type: 'servidor', ip: '', owner: '', criticality: 3, internetExposed: false, tags: [] });
  const [tags, setTags] = useState(a.tags.join(', '));
  const set = <K extends keyof Asset>(k: K, v: Asset[K]) => setA((p) => ({ ...p, [k]: v }));
  const ipErr = a.ip && !isIpOrCidr(a.ip) ? 'IP o CIDR no válido' : null;
  const valid = a.name.trim() && !ipErr;
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (!valid) return;
      upsert({ ...a, name: a.name.trim(), tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12) });
      notify(initial ? `Activo «${a.name}» actualizado.` : `Activo «${a.name}» añadido.`);
      onDone();
    }}>
      <Field label="Nombre"><input className="field" value={a.name} onChange={(e) => set('name', e.target.value)} placeholder="p. ej. Controlador de dominio DC01" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select className="field" value={a.type} onChange={(e) => set('type', e.target.value as AssetType)}>
            {(Object.keys(ASSET_TYPE_LABEL) as AssetType[]).map((t) => <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="IP / CIDR" error={ipErr}><input className="field num" value={a.ip} aria-invalid={!!ipErr} onChange={(e) => set('ip', e.target.value.trim())} placeholder="10.10.10.5" /></Field>
      </div>
      <Field label="Responsable"><input className="field" value={a.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Equipo o persona" /></Field>
      <Field label={`Criticidad de negocio: ${a.criticality}/5`} hint="5 = joya de la corona (destino de las rutas de ataque)">
        <input type="range" min={1} max={5} step={1} value={a.criticality} onChange={(e) => set('criticality', Number(e.target.value) as Asset['criticality'])} className="accent-[var(--color-accent)]" />
      </Field>
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <div><div className="text-[0.8125rem] font-medium">Expuesto a Internet</div><div className="text-xs text-ink-3">Punto de entrada de las rutas de ataque</div></div>
        <Toggle checked={a.internetExposed} onChange={(v) => set('internetExposed', v)} label="Expuesto a Internet" />
      </div>
      <Field label="Etiquetas" hint="Separadas por comas"><input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dmz, tier0" /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>{initial ? 'Guardar cambios' : 'Añadir activo'}</button>
      </div>
    </form>
  );
}
