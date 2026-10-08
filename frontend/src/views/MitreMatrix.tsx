/* Mapa ATT&CK: qué técnicas dejan al alcance de un atacante los hallazgos vivos (abiertos, validados o aceptados).
 * Cada celda toma el color de la banda más grave de esos hallazgos; en el móvil, lista por táctica en vez de matriz. */
import { Download, ExternalLink, Grid3x3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Drawer, TopBar } from '../components/Shell';
import { BandBadge, DemoBadge, Empty, PageHeader, Reveal, Segmented } from '../components/ui';
import {
  ATTACK_VERSION, TACTICS, TECHNIQUES, techniqueExposure, techniqueUrl, toNavigatorLayer,
  type AttackTechnique, type TacticId, type TechniqueExposure,
} from '../engine/attack';
import type { Band } from '../engine/types';
import { screen, useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { download, stamp } from '../lib/download';
import { BAND_COLOR, n1, plural, statusLabel } from '../lib/format';
import { useStore } from '../store/store';

type Filter = 'todas' | 'expuestas';

const tint = (band: Band, pct: number) => `color-mix(in oklab, ${BAND_COLOR[band]} ${pct}%, var(--color-surface))`;

function Cell({ tech, exp, onOpen }: { tech: AttackTechnique; exp?: TechniqueExposure; onOpen: () => void }) {
  const lang = useStore((s) => s.lang);
  const L = useL();
  const name = lang === 'es' ? tech.nameEs : tech.name;
  if (!exp) {
    return (
      <div className="rounded-lg px-2.5 py-2 text-ink-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]" title={tech.name}>
        <span className="num block text-[0.6875rem]">{tech.id}</span>
        <span className="mt-0.5 block text-[0.75rem] leading-snug">{name}</span>
      </div>
    );
  }
  const band = screen[lang].band[exp.band];
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`tecnica-${tech.id}`}
      aria-label={L(`${tech.id} ${name}: ${plural(exp.count, 'hallazgo', 'hallazgos')}, banda ${band}`, `${tech.id} ${name}: ${plural(exp.count, 'finding', 'findings')}, ${band} band`)}
      className="group relative w-full rounded-lg py-2 pl-3 pr-2.5 text-left transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
      style={{ background: tint(exp.band, 16), boxShadow: `inset 3px 0 0 ${BAND_COLOR[exp.band]}, inset 0 0 0 1px ${tint(exp.band, 34)}` }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="num text-[0.6875rem] text-ink-2">{tech.id}</span>
        <span className="num rounded-full px-1.5 text-[0.6875rem] font-semibold" style={{ color: BAND_COLOR[exp.band] }}>{exp.count}</span>
      </span>
      <span className="mt-0.5 block text-[0.75rem] font-medium leading-snug text-ink">{name}</span>
    </button>
  );
}

export function MitreMatrix() {
  const lang = useStore((s) => s.lang);
  const L = useL();
  const project = useStore((s) => s.project);
  const notify = useStore((s) => s.notify);
  const setView = useStore((s) => s.setView);
  const selectFinding = useStore((s) => s.selectFinding);
  const focus = useStore((s) => s.focusTechnique);
  const setFocus = useStore((s) => s.setFocusTechnique);
  const { result } = useResult();
  const [filter, setFilter] = useState<Filter>('todas');
  const [open, setOpen] = useState<string | null>(null);

  // Llegada desde la ficha de un hallazgo: abre esa técnica y consume el foco.
  useEffect(() => {
    if (focus) { setOpen(focus); setFocus(null); }
  }, [focus, setFocus]);

  const exposure = useMemo(() => techniqueExposure(project.findings, result.scored), [project.findings, result.scored]);
  const byId = useMemo(() => new Map(exposure.map((e) => [e.technique.id, e])), [exposure]);
  const perTactic = useMemo(() => TACTICS.map((t) => {
    const techs = TECHNIQUES.filter((x) => x.tactic === t.id);
    return { tactic: t, techs, exposed: techs.filter((x) => byId.has(x.id)).length };
  }), [byId]);
  const tacticsHit = perTactic.filter((p) => p.exposed > 0).length;
  const critical = exposure.filter((e) => e.band === 'critica').length;
  const fById = new Map(project.findings.map((f) => [f.id, f]));
  const sById = new Map(result.scored.map((s) => [s.id, s]));
  const assetName = new Map(project.assets.map((a) => [a.id, a.name]));
  const sel = open ? TECHNIQUES.find((t) => t.id === open) : undefined;
  const selExp = open ? byId.get(open) : undefined;
  const tacticName = (id: TacticId) => { const t = TACTICS.find((x) => x.id === id)!; return lang === 'es' ? t.nameEs : t.name; };

  const exportLayer = () => {
    const layer = toNavigatorLayer(project.findings, { name: `${project.name} · ATT&CK`, lang });
    download(`attack-navigator-${stamp()}.json`, JSON.stringify(layer, null, 2), 'application/json');
    notify(L('Capa de ATT&CK Navigator exportada. Ábrela en «Open Existing Layer».', 'ATT&CK Navigator layer exported. Open it with “Open Existing Layer”.'));
  };

  const header = (
    <PageHeader
      icon={<Grid3x3 />}
      eyebrow={L(`Validación · ATT&CK Enterprise v${ATTACK_VERSION}`, `Validation · ATT&CK Enterprise v${ATTACK_VERSION}`)}
      title={L('Mapa ATT&CK', 'ATT&CK map')}
      badge={project.demo ? <DemoBadge /> : undefined}
      lead={exposure.length
        ? L(`Los hallazgos vivos dejan ${exposure.length} técnicas al alcance de un atacante en ${tacticsHit} de ${TACTICS.length} tácticas; ${critical} con un hallazgo crítico detrás.`,
          `Live findings leave ${exposure.length} techniques within an attacker's reach across ${tacticsHit} of ${TACTICS.length} tactics; ${critical} backed by a critical finding.`)
        : L('Qué técnicas de ATT&CK habilitan tus hallazgos abiertos, validados o aceptados.', 'Which ATT&CK techniques your open, validated or accepted findings enable.')}
      actions={exposure.length ? <button type="button" className="btn" onClick={exportLayer}><Download />{L('Capa para Navigator', 'Navigator layer')}</button> : undefined}
    />
  );

  if (!exposure.length) {
    return (
      <>
        <TopBar title={L('Mapa ATT&CK', 'ATT&CK map')} />
        <div className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-8">
          {header}
          <div className="panel mt-5">
            <Empty icon={<Grid3x3 />} title={L('Ninguna técnica expuesta', 'No exposed techniques')} text={L('Cuando haya hallazgos vivos, aquí verás qué técnicas habilitan. Se infieren de la guía, el título y el CVE; puedes fijarlas a mano en cada hallazgo.', 'Once there are live findings, you will see which techniques they enable. They are inferred from the guide, title and CVE; you can pin them by hand on each finding.')}>
              <button type="button" className="btn btn-primary" onClick={() => setView('priorizacion')}>{L('Ir a priorización', 'Go to prioritization')}</button>
            </Empty>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={L('Mapa ATT&CK', 'ATT&CK map')} />
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 pb-8 sm:px-8">
        {header}

        <Reveal className="flex flex-wrap items-center justify-between gap-3" delay={0.04}>
          <div className="hidden sm:block"><Segmented<Filter>
            label={L('Técnicas a mostrar', 'Techniques to show')}
            value={filter}
            onChange={setFilter}
            options={[{ value: 'todas', label: L('Todo el catálogo', 'Whole catalogue') }, { value: 'expuestas', label: L('Solo expuestas', 'Exposed only') }]}
          /></div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3" aria-label={L('Leyenda', 'Legend')}>
            {(['critica', 'alta', 'media', 'baja'] as Band[]).map((b) => (
              <li key={b} className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: BAND_COLOR[b] }} />{screen[lang].band[b]}</li>
            ))}
            <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[3px] shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]" />{L('Sin exposición', 'Not exposed')}</li>
          </ul>
        </Reveal>

        {/* Escritorio y tableta: matriz con desplazamiento horizontal */}
        <Reveal className="panel hidden overflow-hidden sm:block" delay={0.08}>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={L('Matriz ATT&CK, desplazable en horizontal', 'ATT&CK matrix, scrolls horizontally')} data-testid="matriz-attack">
            <div className="flex min-w-max gap-2 p-3">
              {perTactic.map(({ tactic, techs, exposed }) => {
                const shown = filter === 'expuestas' ? techs.filter((t) => byId.has(t.id)) : techs;
                if (filter === 'expuestas' && !shown.length) return null;
                return (
                  <section key={tactic.id} className="flex w-[10.5rem] shrink-0 flex-col gap-1.5" aria-label={lang === 'es' ? tactic.nameEs : tactic.name}>
                    <header className="px-1 pb-1">
                      <h2 className="text-[0.8125rem] font-semibold leading-tight">{lang === 'es' ? tactic.nameEs : tactic.name}</h2>
                      <p className="num mt-0.5 text-[0.6875rem] text-ink-3">{tactic.taId} · {exposed}/{techs.length}</p>
                      <div className="bar-track mt-1.5" aria-hidden><div className="bar-fill" style={{ background: 'var(--color-accent)', transform: `scaleX(${exposed / techs.length})` }} /></div>
                    </header>
                    {shown.map((t) => <Cell key={t.id} tech={t} exp={byId.get(t.id)} onOpen={() => setOpen(t.id)} />)}
                  </section>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Móvil: solo lo expuesto, agrupado por táctica */}
        <div className="flex flex-col gap-3 sm:hidden" data-testid="lista-attack">
          {perTactic.filter((p) => p.exposed > 0).map(({ tactic, techs, exposed }) => (
            <section key={tactic.id} className="panel p-3" aria-label={lang === 'es' ? tactic.nameEs : tactic.name}>
              <h2 className="flex items-baseline justify-between gap-2 px-1 pb-2 text-[0.875rem] font-semibold">
                <span>{lang === 'es' ? tactic.nameEs : tactic.name}</span>
                <span className="num text-xs font-normal text-ink-3">{exposed}/{techs.length}</span>
              </h2>
              <div className="flex flex-col gap-1.5">
                {techs.filter((t) => byId.has(t.id)).map((t) => <Cell key={t.id} tech={t} exp={byId.get(t.id)} onOpen={() => setOpen(t.id)} />)}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-3">
          {L('Las técnicas se infieren de la guía de remediación, el título y el CVE de cada hallazgo; las que fija el analista en la ficha mandan. Los hallazgos mitigados o no explotables no cuentan. ATT&CK® es una marca de The MITRE Corporation; aquí solo se usan sus identificadores y nombres.',
            'Techniques are inferred from each finding’s remediation guide, title and CVE; those pinned by the analyst win. Mitigated or not-exploitable findings do not count. ATT&CK® is a trademark of The MITRE Corporation; only its identifiers and names are used here.')}
        </p>
      </div>

      <Drawer
        open={!!sel}
        onClose={() => setOpen(null)}
        title={sel ? (
          <div>
            <div className="flex items-center gap-2 text-xs text-ink-3"><span className="num">{sel.id}</span><span>{tacticName(sel.tactic)}</span></div>
            <h2 className="title-md mt-1">{lang === 'es' ? sel.nameEs : sel.name}</h2>
            {lang === 'es' && <p className="mt-0.5 text-xs text-ink-3">{sel.name}</p>}
          </div>
        ) : ''}
        width={440}
      >
        {sel && (
          <div className="flex flex-col gap-5" data-testid="ficha-tecnica">
            {selExp ? (
              <>
                <div className="flex items-center gap-3">
                  <BandBadge band={selExp.band} />
                  <span className="text-[0.8125rem] text-ink-2">{L(`${selExp.count} ${selExp.count === 1 ? 'hallazgo vivo la habilita' : 'hallazgos vivos la habilitan'}`, `${selExp.count} live ${selExp.count === 1 ? 'finding enables' : 'findings enable'} it`)}</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {selExp.findingIds
                    .map((id) => ({ f: fById.get(id)!, s: sById.get(id) }))
                    .sort((a, b) => (b.s?.score ?? 0) - (a.s?.score ?? 0))
                    .map(({ f, s }) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-transform duration-150 ease-[var(--ease-out)] hover:bg-surface-2 active:scale-[0.98]"
                          onClick={() => { setView('priorizacion'); selectFinding(f.id); }}
                        >
                          <span className="num w-9 shrink-0 pt-0.5 text-[0.9375rem] font-semibold" style={{ color: s ? BAND_COLOR[s.band] : undefined }}>{s ? n1(s.score) : '—'}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.8125rem] font-medium leading-snug">{f.title}</span>
                            <span className="mt-0.5 block text-xs text-ink-3">
                              <span className="num">{f.id}</span>{f.cve && <> · <span className="num">{f.cve}</span></>} · {assetName.get(f.assetId) ?? f.assetId}
                              {f.status === 'aceptado' && <> · {statusLabel('aceptado')}</>}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p className="text-[0.8125rem] text-ink-2">{L('Ningún hallazgo vivo habilita esta técnica.', 'No live finding enables this technique.')}</p>
            )}
            <a className="btn btn-sm self-start" href={techniqueUrl(sel.id)} target="_blank" rel="noopener noreferrer"><ExternalLink />{L('Ficha en attack.mitre.org', 'Page on attack.mitre.org')}</a>
          </div>
        )}
      </Drawer>
    </>
  );
}
