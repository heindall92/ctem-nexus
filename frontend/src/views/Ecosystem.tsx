/* Ecosistema: intercambio por fichero con Rosetta, Compliance Studio, KAIROS, ENS AD Auditor, Norvik y ARGOS.
 * Se detecta el fichero, se enseña qué cambiará y solo entonces se aplica. Nada sale del navegador. */
import {
  AlertCircle, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Download, ExternalLink, Eye, FileJson, Hourglass,
  Blocks, KeyRound, Landmark, Languages, ShieldCheck,
} from 'lucide-react';
import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { TopBar } from '../components/Shell';
import { Empty, PageHeader, Reveal, SectionTitle, Segmented } from '../components/ui';
import { SLA_POLICIES } from '../engine/constants';
import { argosFor, argosUrl, CONTROLS } from '../engine/controls';
import {
  applyKairos, contradictions, controlEvidence, detectEcosystem, kairosPlan, makeEnvelope, ownerRows, parseAdAuditor,
  planOwners, rosettaStates, SLA_FOR_CATEGORY, studioInfo, toKairos, toNorvik, toStudio, type EcoDetected, type KairosItem,
} from '../engine/ecosystem';
import { isActive } from '../engine/engine';
import { planImport } from '../engine/merge';
import type { Asset, SlaPolicy } from '../engine/types';
import { chrome, useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { download, readFile, stamp } from '../lib/download';
import { plural } from '../lib/format';
import { useStore } from '../store/store';

const MAX_BYTES = 20 * 1024 * 1024;
const json = (o: unknown) => JSON.stringify(o, null, 2);
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'proyecto';

function Notice({ tone, children }: { tone: 'error' | 'warn' | 'ok'; children: ReactNode }) {
  const color = tone === 'error' ? 'var(--color-critica)' : tone === 'warn' ? 'var(--color-media)' : 'var(--color-ok)';
  const Icon = tone === 'error' ? AlertCircle : tone === 'warn' ? AlertTriangle : CheckCircle2;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[0.8125rem]" style={{ color: tone === 'ok' ? 'var(--color-ink)' : color, background: `color-mix(in oklab, ${color} 9%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)` }}>
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} /><div className="min-w-0">{children}</div>
    </div>
  );
}

function Dir({ dir, children }: { dir: 'in' | 'out'; children: ReactNode }) {
  const L = useL();
  return (
    <li className="flex items-start gap-2 text-[0.8125rem] leading-snug text-ink-2">
      {dir === 'in' ? <ArrowDownToLine className="mt-0.5 size-3.5 shrink-0 text-accent" aria-label={L('Recibe', 'Receives')} /> : <ArrowUpFromLine className="mt-0.5 size-3.5 shrink-0 text-accent" aria-label={L('Envía', 'Sends')} />}
      <span>{children}</span>
    </li>
  );
}

function ToolCard({ icon, name, role, children, status, actions, testid }: { icon: ReactNode; name: string; role: string; children: ReactNode; status?: ReactNode; actions?: ReactNode; testid: string }) {
  return (
    <article className="panel flex flex-col gap-3 p-5" data-testid={testid}>
      <header className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent [&_svg]:size-5" aria-hidden>{icon}</div>
        <div className="min-w-0">
          <h3 className="title-md">{name}</h3>
          <p className="text-xs text-ink-3">{role}</p>
        </div>
      </header>
      <ul className="flex flex-col gap-1.5">{children}</ul>
      {status && <div className="rounded-xl bg-ground px-3 py-2.5 text-[0.8125rem] text-ink-2">{status}</div>}
      {actions && <div className="mt-auto flex flex-wrap gap-2 pt-1">{actions}</div>}
    </article>
  );
}

export function Ecosystem() {
  const L = useL();
  const lang = useStore((s) => s.lang);
  const project = useStore((s) => s.project);
  const notify = useStore((s) => s.notify);
  const replaceAssets = useStore((s) => s.replaceAssets);
  const linkEns = useStore((s) => s.linkEns);
  const linkRosetta = useStore((s) => s.linkRosetta);
  const logEco = useStore((s) => s.logEco);
  const applyImport = useStore((s) => s.applyImport);
  const setSlaPolicy = useStore((s) => s.setSlaPolicy);
  const { result } = useResult();
  const [detected, setDetected] = useState<{ file: string; d: EcoDetected } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [adTarget, setAdTarget] = useState('');
  const [studioTarget, setStudioTarget] = useState('CTEM');
  const today = new Date().toISOString().slice(0, 10);
  const assets = project.assets;
  const aName = new Map(assets.map((a) => [a.id, a.name]));

  const evidence = useMemo(() => controlEvidence(project.findings, assets, result), [project.findings, assets, result]);
  const contra = useMemo(() => contradictions(evidence, project.rosetta), [evidence, project.rosetta]);
  const kairosLinked = assets.filter((a) => a.tags.some((t) => t.startsWith('kairos:')));
  const adFindings = project.findings.filter((f) => f.sources?.includes('adauditor'));
  const argos = useMemo(() => {
    const m = new Map<string, { link: ReturnType<typeof argosFor>[number]; n: number }>();
    for (const f of project.findings.filter(isActive)) for (const l of argosFor(f)) m.set(l.id, { link: l, n: (m.get(l.id)?.n ?? 0) + 1 });
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [project.findings]);

  const handle = async (file: File) => {
    setError(null); setDetected(null); setPairs({});
    try {
      const text = await readFile(file, MAX_BYTES);
      const d = detectEcosystem(text, file.name);
      if (d.kind === 'desconocido') throw new Error(L('No es un fichero del ecosistema. Admite: sobre «yrd-ecosistema», proyecto o copia de KAIROS, proyecto o copia de Compliance Studio, informe JSON de ENS AD Auditor, proyecto de Rosetta y CSV de responsables (activo, responsable, rol).', 'Not an ecosystem file. Supported: “yrd-ecosistema” envelope, KAIROS project or backup, Compliance Studio project or backup, ENS AD Auditor JSON report, Rosetta project and an owners CSV (asset, owner, role).'));
      if (d.kind === 'sobre' && !['controles', 'responsables'].includes(d.envelope.tipo)) throw new Error(L(`Sobre de ${d.envelope.origen.herramienta} con datos de tipo «${d.envelope.tipo}»: CTEM-Nexus importa «controles» (Rosetta) y «responsables» (Norvik).`, `Envelope from ${d.envelope.origen.herramienta} with “${d.envelope.tipo}” data: CTEM-Nexus imports “controles” (Rosetta) and “responsables” (Norvik).`));
      if (d.kind === 'kairos') {
        const plan = kairosPlan(d.project, assets, d.name);
        setPairs(Object.fromEntries(plan.items.map((i) => [i.kid, i.match ?? ''])));
      }
      if (d.kind === 'adauditor') setAdTarget(assets.find((a) => a.type === 'controlador_dominio')?.id ?? '');
      setDetected({ file: file.name, d });
    } catch (e) {
      setError(e instanceof Error ? e.message : L('No se pudo leer el archivo.', 'The file could not be read.'));
    }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void handle(f); };

  // Vistas previas (se recalculan con el proyecto vigente).
  const d = detected?.d;
  const kairos = useMemo(() => (d?.kind === 'kairos' ? kairosPlan(d.project, assets, d.name) : null), [d, assets]);
  const ad = useMemo(() => (d?.kind === 'adauditor' ? parseAdAuditor(d.report) : null), [d]);
  const adPlan = useMemo(() => (ad ? planImport(ad, project, { today, targetAssetId: adTarget || null }) : null), [ad, project, today, adTarget]);
  const studio = useMemo(() => (d?.kind === 'studio' ? studioInfo(d.project, d.name) : null), [d]);
  const rosetta = useMemo(() => (d?.kind === 'rosetta' ? rosettaStates({ project: d.project, name: d.name }) : d?.kind === 'sobre' && d.envelope.tipo === 'controles' ? rosettaStates({ envelope: d.envelope }) : null), [d]);
  const owners = useMemo(() => {
    if (d?.kind === 'responsables-csv') return planOwners(assets, ownerRows({ rows: d.rows }));
    if (d?.kind === 'sobre' && d.envelope.tipo === 'responsables') return planOwners(assets, ownerRows({ envelope: d.envelope }));
    return null;
  }, [d, assets]);

  const done = () => { setDetected(null); setPairs({}); };

  const applyKairosNow = () => {
    if (!kairos) return;
    const chosen = kairos.items.filter((i) => pairs[i.kid]).map((i) => ({ item: i, assetId: pairs[i.kid] }));
    const r = applyKairos(assets, chosen);
    replaceAssets(r.assets, { tool: 'kairos', dir: 'entrada', tipo: 'bia', detail: `${kairos.project || detected!.file}: ${chosen.length} activos vinculados, ${r.changed} cambian` });
    notify(L(`KAIROS: ${plural(chosen.length, 'activo vinculado', 'activos vinculados')}; ${plural(r.changed, 'cambia', 'cambian')} de criticidad o responsable.`, `KAIROS: ${plural(chosen.length, 'asset linked', 'assets linked')}; ${r.changed} changed criticality or owner.`));
    done();
  };
  const applyAdNow = () => {
    if (!adPlan || !ad) return;
    applyImport(adPlan, detected!.file);
    logEco({ tool: 'ens-ad-auditor', dir: 'entrada', tipo: 'hallazgos', detail: `${ad.domain}: ${adPlan.newFindings.length} nuevos, ${adPlan.updatedFindings.length} actualizados` });
    notify(L(`ENS AD Auditor (${ad.domain}): ${plural(adPlan.newFindings.length, 'hallazgo nuevo', 'hallazgos nuevos')} · ${plural(adPlan.updatedFindings.length, 'actualizado', 'actualizados')}.`, `ENS AD Auditor (${ad.domain}): ${plural(adPlan.newFindings.length, 'new finding', 'new findings')} · ${adPlan.updatedFindings.length} updated.`));
    done();
  };
  const applyStudioNow = () => {
    if (!studio?.category) return;
    const policy = SLA_FOR_CATEGORY[studio.category];
    linkEns({ category: studio.category, levels: studio.levels, project: studio.name }, policy, { tool: 'compliance-studio', dir: 'entrada', tipo: 'soa', detail: `${studio.name || detected!.file}: categoría ${studio.category}` });
    notify(L(`Categoría ENS ${studio.category}: plazos ajustados (crítica ${SLA_POLICIES[policy].critica} d, alta ${SLA_POLICIES[policy].alta} d).`, `ENS category ${studio.category}: deadlines adjusted (critical ${SLA_POLICIES[policy].critica} d, high ${SLA_POLICIES[policy].alta} d).`));
    done();
  };
  const applyRosettaNow = () => {
    if (!rosetta) return;
    const n = Object.keys(rosetta.link.estados).length;
    linkRosetta(rosetta.link, { tool: 'rosetta', dir: 'entrada', tipo: 'controles', detail: `${rosetta.link.proyecto || detected!.file}: ${n} controles` });
    notify(L(`Rosetta: ${plural(n, 'estado de control leído', 'estados de control leídos')}.`, `Rosetta: ${plural(n, 'control state read', 'control states read')}.`));
    done();
  };
  const applyOwnersNow = () => {
    if (!owners) return;
    const ch = new Map(owners.changes.map((c) => [c.assetId, c.after]));
    replaceAssets(assets.map((a) => (ch.has(a.id) ? { ...a, owner: ch.get(a.id)! } : a)), { tool: 'norvik', dir: 'entrada', tipo: 'responsables', detail: `${owners.changes.length} responsables` });
    notify(L(`${plural(owners.changes.length, 'responsable actualizado', 'responsables actualizados')}.`, `${plural(owners.changes.length, 'owner updated', 'owners updated')}.`));
    done();
  };

  // Exportaciones.
  const version = __APP_VERSION__;
  const exportRosetta = () => {
    const env = makeEnvelope('hallazgos', evidence, version, { proyecto: project.name, resumen: { indice: result.summary.exposureIndex, abiertos: result.summary.openFindings, porBanda: result.summary.byBand, kev: result.summary.kevOpen, rutas: result.summary.attackPaths } });
    download(`ctem-nexus_rosetta_${slug(project.name)}_${stamp()}.json`, json(env), 'application/json');
    logEco({ tool: 'rosetta', dir: 'salida', tipo: 'hallazgos', detail: `${evidence.length} controles con evidencia` });
    notify(L('Evidencia por control exportada para Rosetta.', 'Per-control evidence exported for Rosetta.'));
  };
  const exportStudio = () => {
    const out = toStudio(project.findings, assets, result, { id: studioTarget.trim() || 'CTEM', name: project.name }, project.name);
    download(`ctem-nexus_studio_${slug(project.name)}_${stamp()}.json`, json(out), 'application/json');
    logEco({ tool: 'compliance-studio', dir: 'salida', tipo: 'hallazgos', detail: `${out.hallazgos.length} hallazgos al activo ${studioTarget}` });
    notify(L(`${plural(out.hallazgos.length, 'hallazgo exportado', 'hallazgos exportados')} para Compliance Studio.`, `${plural(out.hallazgos.length, 'finding exported', 'findings exported')} for Compliance Studio.`));
  };
  const exportKairos = () => {
    const datos = toKairos(assets, project.findings, result);
    download(`ctem-nexus_kairos_${slug(project.name)}_${stamp()}.json`, json(makeEnvelope('activos', datos, version, { proyecto: project.name })), 'application/json');
    logEco({ tool: 'kairos', dir: 'salida', tipo: 'activos', detail: `${datos.length} activos con su exposición` });
    notify(L('Riesgo de interrupción exportado para KAIROS.', 'Disruption risk exported for KAIROS.'));
  };
  const exportNorvik = () => {
    const datos = toNorvik(project.findings, assets, result, project.snapshots ?? []);
    download(`ctem-nexus_norvik_${slug(project.name)}_${stamp()}.json`, json(makeEnvelope('indicadores', datos, version, { proyecto: project.name })), 'application/json');
    logEco({ tool: 'norvik', dir: 'salida', tipo: 'indicadores', detail: `${datos.length} indicadores` });
    notify(L('Indicadores exportados para Norvik.', 'Indicators exported for Norvik.'));
  };

  const policy: SlaPolicy = project.slaPolicy ?? 'estandar';
  const ens = project.ens;
  const ensPolicy = ens ? SLA_FOR_CATEGORY[ens.category] : null;
  const BL = { critica: L('crítica', 'critical'), alta: L('alta', 'high'), media: L('media', 'medium'), baja: L('baja', 'low') };
  const days = (p: SlaPolicy) => (['critica', 'alta', 'media', 'baja'] as const).map((b) => `${BL[b]} ${SLA_POLICIES[p][b]}`).join(' · ');
  const toolName: Record<string, string> = { rosetta: 'Rosetta', 'compliance-studio': 'Compliance Studio', kairos: 'KAIROS', 'ens-ad-auditor': 'ENS AD Auditor', norvik: 'Norvik', argos: 'ARGOS', 'ctem-nexus': 'CTEM-Nexus' };

  return (
    <>
      <TopBar title={chrome[lang].ecosistema} />
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 pb-8 sm:px-8">
        <PageHeader
          icon={<Blocks />} eyebrow={L('Ecosistema · intercambio por fichero', 'Ecosystem · file exchange')} title={chrome[lang].ecosistema}
          lead={L('CTEM-Nexus es el puente entre lo ofensivo y el GRC. Recibe la criticidad del BIA, la categoría ENS y los hallazgos de directorio activo, y devuelve evidencia por control, riesgo de interrupción e indicadores. Las herramientas no hablan por red: tú mueves los ficheros.', 'CTEM-Nexus bridges offensive work and GRC. It takes BIA criticality, the ENS category and Active Directory findings, and returns per-control evidence, disruption risk and indicators. The tools never talk over the network: you move the files.')}
        />

        <Reveal as="section" className="panel overflow-hidden" delay={0.04}>
          <SectionTitle title={L('Importar de otra herramienta', 'Import from another tool')} detail={L('Se reconoce el fichero solo y se enseña qué cambiará antes de aplicarlo.', 'The file is recognised automatically and the changes are shown before applying them.')} />
          <div className="flex flex-col gap-4 border-t border-hairline px-5 py-5" data-testid="eco-importar">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors ${dragging ? 'border-accent bg-accent/10' : 'border-hairline-strong bg-ground'}`}
            >
              <div className="grid size-11 place-items-center rounded-xl bg-surface-2 text-accent"><FileJson className="size-5" /></div>
              <p className="mt-3 text-[0.875rem] font-medium">{L('Arrastra aquí el fichero o elígelo', 'Drop the file here or choose it')}</p>
              <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-ink-3">KAIROS · Compliance Studio · ENS AD Auditor · Rosetta · Norvik ({L('sobre o CSV de responsables', 'envelope or owners CSV')}). {L('El archivo no sale de este navegador.', 'The file never leaves this browser.')}</p>
              <label className="btn btn-sm mt-4 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
                {detected ? L('Elegir otro archivo', 'Choose another file') : L('Elegir archivo', 'Choose file')}
                <input type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" aria-label={L('Fichero de una herramienta del ecosistema', 'File from an ecosystem tool')} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); e.target.value = ''; }} />
              </label>
            </div>
            {error && <Notice tone="error">{error}</Notice>}

            {kairos && (
              <section className="flex flex-col gap-3" aria-label={L('Vista previa de KAIROS', 'KAIROS preview')} data-testid="eco-kairos">
                <p className="text-[0.8125rem] text-ink-2"><strong className="text-ink">KAIROS · {kairos.project || detected!.file}</strong> · {plural(kairos.functions, L('función', 'function'), L('funciones', 'functions'))} · {L(`${kairos.items.length} activos que dan soporte a alguna función`, `${kairos.items.length} assets supporting a function`)}{d?.kind === 'kairos' && d.others ? L(` · la copia trae ${d.others} proyectos más: se usa el primero`, ` · the backup has ${d.others} more projects: the first is used`) : ''}.</p>
                <p className="text-xs text-ink-3">{L('Criticidad por la función más exigente: RTO ≤ 4 h → 5; ≤ 24 h → 4; ≤ 72 h → 3; más → 2. Revisa cada pareja: el nombre se empareja por parecido y puedes cambiarlo.', 'Criticality from the most demanding function: RTO ≤ 4 h → 5; ≤ 24 h → 4; ≤ 72 h → 3; longer → 2. Check every pair: names are matched by similarity and you can change them.')}</p>
                <div className="overflow-x-auto rounded-xl shadow-[inset_0_0_0_1px_var(--color-hairline)]" tabIndex={0} role="region" aria-label={L('Activos de KAIROS, desplazable en horizontal', 'KAIROS assets, scrolls horizontally')}>
                  <table className="table min-w-[640px]">
                    <thead><tr><th scope="col">{L('Activo en KAIROS', 'KAIROS asset')}</th><th scope="col">{L('Función más exigente', 'Most demanding function')}</th><th scope="col" className="text-right">{L('Criticidad', 'Criticality')}</th><th scope="col">{L('Activo en CTEM-Nexus', 'CTEM-Nexus asset')}</th></tr></thead>
                    <tbody>
                      {kairos.items.map((i: KairosItem) => {
                        const cur = assets.find((a) => a.id === pairs[i.kid]);
                        return (
                          <tr key={i.kid}>
                            <td><span className="num text-ink-3">{i.kid}</span> {i.name}</td>
                            <td className="text-ink-2">{i.functions[0].id} · {i.functions[0].name}{i.functions[0].rto !== null ? ` (RTO ${i.functions[0].rto} h)` : ''}{i.functions.length > 1 ? ` +${i.functions.length - 1}` : ''}</td>
                            <td className="num text-right">{cur && cur.criticality !== i.criticality ? <><span className="text-ink-3">{cur.criticality} → </span><strong>{i.criticality}</strong></> : i.criticality}</td>
                            <td>
                              <select className="field h-8 min-w-[12rem] text-[0.8125rem]" aria-label={L(`Activo de CTEM-Nexus para ${i.name}`, `CTEM-Nexus asset for ${i.name}`)} value={pairs[i.kid] ?? ''} onChange={(e) => setPairs((p) => ({ ...p, [i.kid]: e.target.value }))}>
                                <option value="">{L('— Sin vincular —', '— Not linked —')}</option>
                                {assets.map((a: Asset) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" disabled={!Object.values(pairs).some(Boolean)} onClick={applyKairosNow}><CheckCircle2 />{L('Aplicar criticidades', 'Apply criticalities')}</button>
                  <button type="button" className="btn btn-ghost" onClick={done}>{L('Descartar', 'Discard')}</button>
                </div>
              </section>
            )}

            {ad && adPlan && (
              <section className="flex flex-col gap-3" aria-label={L('Vista previa de ENS AD Auditor', 'ENS AD Auditor preview')} data-testid="eco-adauditor">
                {ad.sample && <Notice tone="warn">{L('El informe está marcado como datos de ejemplo (is_sample).', 'The report is flagged as sample data (is_sample).')}</Notice>}
                <p className="text-[0.8125rem] text-ink-2"><strong className="text-ink">ENS AD Auditor · {ad.domain}</strong> · {plural(ad.items.length, L('alerta', 'alert'), L('alertas', 'alerts'))}{ad.daPath ? L(` · ${ad.daPath} con ruta hacia Domain Admins`, ` · ${ad.daPath} with a path to Domain Admins`) : ''}{ad.rejected ? L(` · ${ad.rejected} descartadas`, ` · ${ad.rejected} discarded`) : ''}.</p>
                <label className="flex max-w-md flex-col gap-1.5">
                  <span className="label font-medium text-ink-2">{L('Activo al que se asignan', 'Asset they are assigned to')}</span>
                  <select className="field" value={adTarget} onChange={(e) => setAdTarget(e.target.value)}>
                    <option value="">{L(`Crear un activo nuevo («${ad.domain}»)`, `Create a new asset (“${ad.domain}”)`)}</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <ul className="grid gap-1 text-[0.8125rem] text-ink-2">
                  <li>{plural(adPlan.newFindings.length, L('hallazgo nuevo', 'new finding'), L('hallazgos nuevos', 'new findings'))} · {plural(adPlan.updatedFindings.length, L('actualizado', 'updated'), L('actualizados', 'updated'))}{adPlan.reopened ? ` · ${plural(adPlan.reopened, L('reabierto', 'reopened'), L('reabiertos', 'reopened'))}` : ''}{adPlan.newAssets.length ? ` · ${plural(adPlan.newAssets.length, L('activo nuevo', 'new asset'), L('activos nuevos', 'new assets'))}` : ''}</li>
                  <li className="text-xs text-ink-3">{L('Cada alerta trae su técnica ATT&CK, su guía de remediación y los controles op.acc del ENS como evidencia. El riesgo MAGERIT pasa a CVSS equivalente (Crítico 9 · Alto 7,5 · Medio 5 · Bajo 2,5).', 'Each alert carries its ATT&CK technique, remediation guide and the ENS op.acc controls as evidence. The MAGERIT risk becomes an equivalent CVSS (Critical 9 · High 7.5 · Medium 5 · Low 2.5).')}</li>
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" disabled={!adPlan.newFindings.length && !adPlan.updatedFindings.length} onClick={applyAdNow}><CheckCircle2 />{L('Importar hallazgos', 'Import findings')}</button>
                  <button type="button" className="btn btn-ghost" onClick={done}>{L('Descartar', 'Discard')}</button>
                </div>
              </section>
            )}

            {studio && (
              <section className="flex flex-col gap-3" aria-label={L('Vista previa de Compliance Studio', 'Compliance Studio preview')} data-testid="eco-studio">
                <p className="text-[0.8125rem] text-ink-2"><strong className="text-ink">Compliance Studio · {studio.name || detected!.file}</strong> · {plural(studio.assets.length, L('activo', 'asset'), L('activos', 'assets'))} · {plural(studio.findings, L('hallazgo', 'finding'), L('hallazgos', 'findings'))}{d?.kind === 'studio' && d.others ? L(` · la copia trae ${d.others} proyectos más: se usa el primero`, ` · the backup has ${d.others} more projects: the first is used`) : ''}.</p>
                {studio.category ? (
                  <>
                    <p className="text-[0.8125rem]">{L('Categoría del sistema', 'System category')}: <strong>{studio.category}</strong> <span className="text-ink-3">({Object.entries(studio.levels).map(([k, v]) => `${k}=${v}`).join(' · ')})</span></p>
                    <p className="text-xs text-ink-3">{L('Plazos propuestos (días)', 'Proposed deadlines (days)')}: {days(SLA_FOR_CATEGORY[studio.category])}. {L('Ahora', 'Now')}: {days(policy)}.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary" onClick={applyStudioNow}><CheckCircle2 />{L('Usar la categoría ENS', 'Use the ENS category')}</button>
                      <button type="button" className="btn btn-ghost" onClick={done}>{L('Descartar', 'Discard')}</button>
                    </div>
                  </>
                ) : <Notice tone="warn">{L('El proyecto no tiene la categorización hecha (dimensiones D, I, C, A y T).', 'The project has no categorization yet (dimensions D, I, C, A and T).')}</Notice>}
              </section>
            )}

            {rosetta && (
              <section className="flex flex-col gap-3" aria-label={L('Vista previa de Rosetta', 'Rosetta preview')} data-testid="eco-rosetta">
                <p className="text-[0.8125rem] text-ink-2"><strong className="text-ink">Rosetta · {rosetta.link.proyecto || detected!.file}</strong> · {plural(Object.keys(rosetta.link.estados).length, L('estado de control', 'control state'), L('estados de control', 'control states'))}{rosetta.evidence.length ? L(` · devuelve la evidencia de ${rosetta.evidence.length} controles que salió de CTEM-Nexus`, ` · returns the evidence of ${rosetta.evidence.length} controls that came from CTEM-Nexus`) : ''}.</p>
                {(() => {
                  const c = contradictions(evidence, { ...rosetta.link });
                  return c.length ? <Notice tone="warn">{L(`${plural(c.length, 'control figura', 'controles figuran')} como implantado en Rosetta con hallazgos críticos o altos abiertos: ${c.map((x) => x.control).join(', ')}.`, `${plural(c.length, 'control is', 'controls are')} marked implemented in Rosetta with open critical or high findings: ${c.map((x) => x.control).join(', ')}.`)}</Notice> : null;
                })()}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={applyRosettaNow}><CheckCircle2 />{L('Vincular con Rosetta', 'Link with Rosetta')}</button>
                  <button type="button" className="btn btn-ghost" onClick={done}>{L('Descartar', 'Discard')}</button>
                </div>
              </section>
            )}

            {owners && (
              <section className="flex flex-col gap-3" aria-label={L('Vista previa de responsables', 'Owners preview')} data-testid="eco-responsables">
                <p className="text-[0.8125rem] text-ink-2"><strong className="text-ink">{L('Responsables', 'Owners')}</strong> · {plural(owners.changes.length, L('cambio', 'change'), L('cambios', 'changes'))}{owners.unmatched.length ? L(` · sin activo: ${owners.unmatched.slice(0, 6).join(', ')}`, ` · no asset: ${owners.unmatched.slice(0, 6).join(', ')}`) : ''}.</p>
                {owners.changes.length > 0 && (
                  <div className="overflow-x-auto rounded-xl shadow-[inset_0_0_0_1px_var(--color-hairline)]" tabIndex={0} role="region" aria-label={L('Cambios de responsable, desplazable en horizontal', 'Owner changes, scrolls horizontally')}>
                    <table className="table min-w-[520px]">
                      <thead><tr><th scope="col">{L('Activo', 'Asset')}</th><th scope="col">{L('Antes', 'Before')}</th><th scope="col">{L('Después', 'After')}</th></tr></thead>
                      <tbody>{owners.changes.map((c) => <tr key={c.assetId}><td>{aName.get(c.assetId)}</td><td className="text-ink-3">{c.before || '—'}</td><td>{c.after}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" disabled={!owners.changes.length} onClick={applyOwnersNow}><CheckCircle2 />{L('Aplicar responsables', 'Apply owners')}</button>
                  <button type="button" className="btn btn-ghost" onClick={done}>{L('Descartar', 'Discard')}</button>
                </div>
              </section>
            )}
          </div>
        </Reveal>

        {contra.length > 0 && (
          <Reveal as="section" className="panel overflow-hidden" delay={0.06}>
            <SectionTitle title={L('Contradicciones con Rosetta', 'Contradictions with Rosetta')} detail={L('Controles declarados como implantados mientras la exposición técnica dice otra cosa. Revisa la declaración o corrige antes de la auditoría.', 'Controls declared implemented while the technical exposure says otherwise. Review the statement or fix before the audit.')} />
            <ul className="divide-hair border-t border-hairline" data-testid="eco-contradicciones">
              {contra.map((c) => (
                <li key={c.control} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-[0.8125rem]">
                  <span className="num font-semibold">{c.control}</span>
                  <span>{lang === 'en' ? CONTROLS[c.control]?.titleEn : CONTROLS[c.control]?.title}</span>
                  <span className="text-ink-3">{L('implantado en Rosetta', 'implemented in Rosetta')} · {plural(c.findings.length, L('hallazgo', 'finding'), L('hallazgos', 'findings'))} {c.worst === 'critica' ? L('críticos o altos', 'critical or high') : L('altos', 'high')}: {c.findings.join(', ')}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <section aria-label={L('Herramientas', 'Tools')} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToolCard testid="eco-tool-rosetta" icon={<Languages />} name="Rosetta Multinorma" role={L('Mapa de 15 normas y leyes sobre 152 controles', 'Map of 15 standards and laws over 152 controls')}
            status={project.rosetta ? <>{L('Vinculado', 'Linked')}: {project.rosetta.proyecto || 'Rosetta'} · {plural(Object.keys(project.rosetta.estados).length, L('control', 'control'), L('controles', 'controls'))} · {L(`${contra.length} contradicciones`, `${contra.length} contradictions`)}</> : L('Sin vincular. Importa su proyecto o su sobre «controles» para comparar.', 'Not linked. Import its project or its “controles” envelope to compare.')}
            actions={<button type="button" className="btn btn-sm" disabled={!evidence.length} onClick={exportRosetta}><Download />{L(`Evidencia por control (${evidence.length})`, `Per-control evidence (${evidence.length})`)}</button>}>
            <Dir dir="out">{L('Hallazgos abiertos agregados por control (OPE-04, ACC-07…) con sus identificadores ENS, ISO/IEC 27001, NIS2, NIST CSF 2.0 y DORA.', 'Open findings grouped by control (OPE-04, ACC-07…) with their ENS, ISO/IEC 27001, NIS2, NIST CSF 2.0 and DORA identifiers.')}</Dir>
            <Dir dir="in">{L('Estado de cada control, para avisar si se declara implantado con exposición crítica abierta.', 'Each control’s state, to warn when it is declared implemented with critical exposure open.')}</Dir>
          </ToolCard>

          <ToolCard testid="eco-tool-studio" icon={<ShieldCheck />} name="ENS Compliance Studio" role={L('Categorización, MAGERIT y declaración de aplicabilidad', 'Categorization, MAGERIT and statement of applicability')}
            status={
              <div className="flex flex-col gap-2">
                <span>{ens ? <>{L('Categoría', 'Category')} <strong>{ens.category}</strong>{ens.project ? ` · ${ens.project}` : ''}</> : L('Sin categoría ENS: plazos estándar.', 'No ENS category: standard deadlines.')}</span>
                <Segmented<SlaPolicy> label={L('Política de plazos', 'Deadline policy')} value={policy} onChange={(p) => { setSlaPolicy(p); notify(L(`Plazos: ${days(p)} días.`, `Deadlines: ${days(p)} days.`)); }}
                  options={[{ value: 'estandar', label: L('Estándar', 'Standard') }, ...(ensPolicy && ensPolicy !== 'estandar' ? [{ value: ensPolicy, label: `ENS ${ens!.category}` }] : [])]} />
                <span className="text-xs text-ink-3">{days(policy)} {L('días', 'days')}</span>
              </div>
            }
            actions={
              <div className="flex w-full flex-wrap items-end gap-2">
                <label className="flex min-w-[8rem] flex-1 flex-col gap-1"><span className="label">{L('Activo de destino en Studio', 'Target asset in Studio')}</span><input className="field h-8 text-[0.8125rem]" value={studioTarget} maxLength={40} onChange={(e) => setStudioTarget(e.target.value)} /></label>
                <button type="button" className="btn btn-sm" disabled={!project.findings.length} onClick={exportStudio}><Download />{L('Evidencia técnica', 'Technical evidence')}</button>
              </div>
            }>
            <Dir dir="in">{L('Categoría del sistema (BÁSICA, MEDIA o ALTA): ajusta los plazos de corrección.', 'System category (BASIC, MEDIUM or HIGH): adjusts remediation deadlines.')}</Dir>
            <Dir dir="out">{L('Hallazgos con su categoría y CVSS para la evidencia técnica de op.exp.2, op.exp.4 y el análisis MAGERIT.', 'Findings with category and CVSS for the op.exp.2 and op.exp.4 technical evidence and the MAGERIT analysis.')}</Dir>
          </ToolCard>

          <ToolCard testid="eco-tool-kairos" icon={<Hourglass />} name="KAIROS" role={L('Continuidad de negocio: BIA, BCP y DRP', 'Business continuity: BIA, BCP and DRP')}
            status={kairosLinked.length ? L(`${plural(kairosLinked.length, 'activo vinculado', 'activos vinculados')} al BIA.`, `${plural(kairosLinked.length, 'asset linked', 'assets linked')} to the BIA.`) : L('Sin vincular. Importa el proyecto de KAIROS para traer la criticidad.', 'Not linked. Import the KAIROS project to bring criticality.')}
            actions={<button type="button" className="btn btn-sm" disabled={!kairosLinked.length} onClick={exportKairos}><Download />{L('Riesgo de interrupción', 'Disruption risk')}</button>}>
            <Dir dir="in">{L('Funciones con RTO y MTPD → criticidad 1–5 de los activos que las soportan, también por dependencias.', 'Functions with RTO and MTPD → 1–5 criticality of the assets supporting them, also through dependencies.')}</Dir>
            <Dir dir="out">{L('Activos del BIA con rutas de ataque abiertas, hallazgos críticos y KEV: el riesgo de interrupción.', 'BIA assets with open attack paths, critical findings and KEV: the disruption risk.')}</Dir>
          </ToolCard>

          <ToolCard testid="eco-tool-adauditor" icon={<KeyRound />} name="ENS AD Auditor" role={L('Directorio activo frente a op.acc del ENS', 'Active Directory against ENS op.acc')}
            status={adFindings.length ? L(`${plural(adFindings.length, 'hallazgo importado', 'hallazgos importados')} del directorio activo.`, `${plural(adFindings.length, 'finding imported', 'findings imported')} from Active Directory.`) : L('Importa su informe JSON: cada alerta llega con su técnica ATT&CK.', 'Import its JSON report: each alert arrives with its ATT&CK technique.')}>
            <Dir dir="in">{L('Kerberoasting, AS-REP, delegaciones, AD CS (ESC), firma SMB, LAPS y ACL → hallazgos de identidad en el grafo.', 'Kerberoasting, AS-REP, delegation, AD CS (ESC), SMB signing, LAPS and ACL → identity findings in the graph.')}</Dir>
          </ToolCard>

          <ToolCard testid="eco-tool-norvik" icon={<Landmark />} name="Norvik" role={L('Gobernanza y cuadro de mando', 'Governance and scorecard')}
            status={L('Contrato de intercambio publicado en docs/ECOSISTEMA.md (sobre «indicadores» y «responsables»).', 'Exchange contract published in docs/ECOSISTEMA.md (“indicadores” and “responsables” envelopes).')}
            actions={<button type="button" className="btn btn-sm" onClick={exportNorvik}><Download />{L('Indicadores del ciclo', 'Cycle indicators')}</button>}>
            <Dir dir="in">{L('Responsables y roles → responsable de cada activo (sobre o CSV activo, responsable, rol).', 'Owners and roles → each asset’s owner (envelope or CSV asset, owner, role).')}</Dir>
            <Dir dir="out">{L('Índice, cumplimiento de plazos, MTTR, KEV, rutas y el histórico de ciclos.', 'Index, deadline compliance, MTTR, KEV, paths and the cycle history.')}</Dir>
          </ToolCard>

          <ToolCard testid="eco-tool-argos" icon={<Eye />} name="ARGOS" role={L('Laboratorio GRC con máquinas y simulacros', 'GRC lab with machines and mock exams')}
            status={argos.length ? (
              <ul className="flex flex-col gap-1.5">
                {argos.slice(0, 4).map(({ link, n }) => (
                  <li key={link.id}><a className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline" href={argosUrl(link.id)} target="_blank" rel="noopener noreferrer">{lang === 'en' ? link.nameEn : link.name}<ExternalLink className="size-3" aria-hidden /><span className="sr-only">{L('(se abre en otra pestaña)', '(opens in a new tab)')}</span></a> <span className="text-xs text-ink-3">· {plural(n, L('hallazgo', 'finding'), L('hallazgos', 'findings'))}</span></li>
                ))}
              </ul>
            ) : L('Sin hallazgos abiertos que practicar.', 'No open findings to practise.')}>
            <Dir dir="out">{L('«Practica esto en ARGOS» en cada guía de remediación: la máquina que entrena esa corrección.', '“Practise this in ARGOS” on every remediation guide: the machine that trains that fix.')}</Dir>
          </ToolCard>
        </section>

        <Reveal as="section" className="panel overflow-hidden" delay={0.08}>
          <SectionTitle title={L('Registro de intercambios', 'Exchange log')} detail={L('Últimos 50 ficheros importados o exportados. Se guarda en el proyecto.', 'Last 50 files imported or exported. Stored in the project.')} />
          {project.ecoLog?.length ? (
            <div className="overflow-x-auto border-t border-hairline" tabIndex={0} role="region" aria-label={L('Registro de intercambios, desplazable en horizontal', 'Exchange log, scrolls horizontally')}>
              <table className="table min-w-[560px]" data-testid="eco-registro">
                <thead><tr><th scope="col">{L('Fecha', 'Date')}</th><th scope="col">{L('Herramienta', 'Tool')}</th><th scope="col">{L('Sentido', 'Direction')}</th><th scope="col">{L('Detalle', 'Detail')}</th></tr></thead>
                <tbody>{project.ecoLog.map((r, i) => (
                  <tr key={`${r.at}-${i}`}><td className="num">{r.at}</td><td>{toolName[r.tool] ?? r.tool}</td><td>{r.dir === 'entrada' ? L('Entrada', 'In') : L('Salida', 'Out')} · {r.tipo}</td><td className="text-ink-2">{r.detail}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="border-t border-hairline"><Empty icon={<Blocks />} title={L('Aún no hay intercambios', 'No exchanges yet')} text={L('Cuando importes o exportes un fichero del ecosistema, quedará anotado aquí.', 'When you import or export an ecosystem file, it will be logged here.')} /></div>}
        </Reveal>

        <details className="panel px-5 py-4 text-[0.8125rem]">
          <summary className="cursor-pointer font-medium">{L('Formato de intercambio («yrd-ecosistema», versión 1)', 'Exchange format (“yrd-ecosistema”, version 1)')}</summary>
          <p className="mt-2 text-ink-2">{L('Todas las herramientas comparten este sobre. El esquema JSON está en shared/schemas/ y la especificación en docs/ECOSISTEMA.md.', 'All tools share this envelope. The JSON schema is in shared/schemas/ and the specification in docs/ECOSISTEMA.md.')}</p>
          <pre tabIndex={0} aria-label={L('Ejemplo de sobre', 'Envelope example')} className="mt-3 overflow-x-auto rounded-xl bg-ground p-3 font-mono text-xs leading-relaxed text-ink-2">{json({ format: 'yrd-ecosistema', version: 1, origen: { herramienta: 'ctem-nexus', version, generado: `${today}T10:00:00Z` }, tipo: 'hallazgos | activos | controles | bia | soa | indicadores | responsables', proyecto: project.name, datos: ['…'] })}</pre>
          <a className="mt-3 inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline" href="https://github.com/heindall92/ctem-nexus/blob/main/docs/ECOSISTEMA.md" target="_blank" rel="noopener noreferrer">docs/ECOSISTEMA.md<ExternalLink className="size-3" aria-hidden /><span className="sr-only">{L('(se abre en otra pestaña)', '(opens in a new tab)')}</span></a>
        </details>
      </div>
    </>
  );
}

