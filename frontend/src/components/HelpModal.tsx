import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Bug, ExternalLink, Calculator, FileCode, FolderGit2, HelpCircle, Keyboard, Layers, Mail, ShieldCheck, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BAND_THRESHOLDS, EXPLOIT_PUBLIC_FLOOR, NOT_EXPLOITABLE_FACTOR, PROXIMITY_HOPS, SLA_DAYS, VALIDATED_BONUS, PROFILES } from '../engine/constants';
import { ECOSYSTEM, screen, useL } from '../i18n';
import { n1 } from '../lib/format';
import { useStore } from '../store/store';
import { SPRING } from './ui';

type Tab = 'ciclo' | 'calculo' | 'ingesta' | 'atajos' | 'glosario' | 'acerca';

export function HelpModal() {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelpOpen);
  const c = screen[useStore((s) => s.lang)];
  const L = useL();
  const profile = useStore((s) => s.project.profile ?? 'defecto');
  const WEIGHTS = PROFILES[profile];
  const [tab, setTab] = useState<Tab>('ciclo');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); prev?.focus?.({ preventScroll: true }); };
  }, [open, setOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Fondo desenfocado translúcido estilo Apple */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/55 backdrop-blur-md"
          />

          {/* Tarjeta modal flotante con bordes redondeados y vidrio */}
          <motion.div
            ref={box}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ayuda-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={SPRING}
            className="glass-thick glass-edge relative z-10 flex h-full max-h-[85vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] border border-hairline bg-surface shadow-2xl outline-none"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h2 id="ayuda-titulo" className="text-base font-semibold text-ink">{c.helpTitle}</h2>
                  <p className="text-xs text-ink-3">{c.helpSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm btn-icon rounded-full"
                aria-label={c.closeHelp}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Pestañas de navegación estilo píldora Apple */}
            <div className="flex border-b border-hairline bg-surface-2/40 px-6 py-2 overflow-x-auto">
              <div className="flex gap-1.5 text-xs font-medium" role="tablist" aria-label={c.helpTitle}>
                {[
                  { id: 'ciclo' as const, label: c.helpTabs.ciclo, icon: <Layers className="size-3.5" /> },
                  { id: 'calculo' as const, label: c.helpTabs.calculo, icon: <Calculator className="size-3.5" /> },
                  { id: 'ingesta' as const, label: c.helpTabs.ingesta, icon: <FileCode className="size-3.5" /> },
                  { id: 'atajos' as const, label: c.helpTabs.atajos, icon: <Keyboard className="size-3.5" /> },
                  { id: 'glosario' as const, label: c.helpTabs.glosario, icon: <BookOpen className="size-3.5" /> },
                  { id: 'acerca' as const, label: c.helpTabs.acerca, icon: <ShieldCheck className="size-3.5" /> },
                ].map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      id={`ayuda-tab-${t.id}`}
                      aria-selected={active}
                      aria-controls="ayuda-panel"
                      tabIndex={active ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                        const ids: Tab[] = ['ciclo', 'calculo', 'ingesta', 'atajos', 'glosario', 'acerca'];
                        const next = ids[(ids.indexOf(t.id) + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
                        setTab(next);
                        document.getElementById(`ayuda-tab-${next}`)?.focus();
                      }}
                      onClick={() => setTab(t.id as Tab)}
                      className={`relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 transition-[color,transform] active:scale-[0.97] ${active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contenido scrolleable con pestañas */}
            <div id="ayuda-panel" role="tabpanel" aria-labelledby={`ayuda-tab-${tab}`} tabIndex={0} className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-ink-2">
              {tab === 'ciclo' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-hairline bg-surface-2/30 p-4">
                    <h3 className="text-sm font-semibold text-ink">{L('¿Qué es CTEM?', 'What is CTEM?')}</h3>
                    <p className="mt-1 text-xs text-ink-3">
                      {L(
                        'Continuous Threat Exposure Management (CTEM) es el marco de Gartner para gestionar la exposición de forma continua, en cinco fases que se repiten. En lugar de tratar todas las vulnerabilidades por igual, prioriza las que tienen explotación real y un camino hacia los activos que más importan.',
                        'Continuous Threat Exposure Management (CTEM) is Gartner’s framework for managing exposure continuously, in five repeating stages. Instead of treating every vulnerability alike, it prioritizes those with real-world exploitation and a path to the assets that matter most.',
                      )}
                    </p>
                  </div>
                  <ol className="grid gap-3 sm:grid-cols-2">
                    {[
                      [L('Alcance', 'Scoping'), L('Registra los activos, su responsable, su criticidad de negocio (1–5) y si están expuestos a Internet, y los rangos de red autorizados. Los activos de criticidad 5 son las joyas de la corona.', 'Record the assets, their owner, business criticality (1–5) and whether they face the Internet, plus the authorized network ranges. Criticality-5 assets are the crown jewels.')],
                      [L('Descubrimiento', 'Discovery'), L('Importa escaneos de Nmap (XML), exportaciones de BloodHound (JSON), CSV o JSON de hallazgos, o añádelos a mano.', 'Import Nmap scans (XML), BloodHound exports (JSON), findings in CSV or JSON, or add them by hand.')],
                      [L('Priorización', 'Prioritization'), L('Cada hallazgo recibe una puntuación de 0 a 100 explicable: severidad, explotación real (CISA KEV, exploit público, EPSS), criticidad, exposición y cercanía a una joya de la corona.', 'Each finding gets an explainable 0–100 score: severity, real exploitation (CISA KEV, public exploit, EPSS), criticality, exposure and closeness to a crown jewel.')],
                      [L('Validación', 'Validation'), L('El grafo muestra las rutas de ataque desde Internet hasta las joyas de la corona y los puntos de estrangulamiento. Marca cada hallazgo como validado o no explotable tras probarlo. El Mapa ATT&CK resume qué técnicas quedan al alcance de un atacante.', 'The graph shows attack paths from the Internet to the crown jewels and the choke points. Mark each finding as validated or not exploitable after testing it. The ATT&CK map sums up which techniques remain within an attacker’s reach.')],
                      [L('Movilización', 'Mobilization'), L('Informe ejecutivo imprimible y tickets con responsable, pasos, comando de verificación y fecha límite según el SLA de su banda.', 'A printable executive report and tickets with owner, steps, a verification command and a due date from their band’s SLA.')],
                    ].map(([title, text], i) => (
                      <li key={title} className={`rounded-2xl border border-hairline bg-surface p-4 ${i === 4 ? 'sm:col-span-2' : ''}`}>
                        <div className="flex items-center gap-2 font-semibold text-ink">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-surface-2 text-xs text-ink">{i + 1}</span>
                          <span>{title}</span>
                        </div>
                        <p className="mt-2 text-xs text-ink-3">{text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {tab === 'calculo' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-ink">{L('Puntuación de exposición (0–100)', 'Exposure score (0–100)')}</h3>
                  <p className="text-xs text-ink-3">
                    {L('El cálculo es determinista y abierto: la misma fórmula en el navegador y en la API (paridad comprobada con un fichero dorado). Cada hallazgo suma cinco factores:', 'The calculation is deterministic and open: the same formula in the browser and in the API (parity checked against a golden file). Each finding adds up five factors:')}
                  </p>
                  <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-2/40 p-4 font-mono text-xs text-ink" data-testid="formula">
                    {`${L('Puntuación', 'Score')} (${L('perfil', 'profile')} ${{ defecto: L('general', 'general'), ot: 'OT', banca: L('banca', 'banking') }[profile]}) = CVSS/10 × ${WEIGHTS.severidad} + max(KEV, ${String(EXPLOIT_PUBLIC_FLOOR).replace(".", L(",", "."))} × exploit, EPSS) × ${WEIGHTS.explotabilidad} + (${L('criticidad', 'criticality')} − 1)/4 × ${WEIGHTS.criticidad} + ${L('expuesto', 'exposed')} × ${WEIGHTS.exposicion} + max(0, 1 − ${L('saltos', 'hops')}/${PROXIMITY_HOPS}) × ${WEIGHTS.proximidad}`}
                  </div>
                  <ul className="space-y-1.5 text-xs text-ink-3">
                    <li>{L(`Validado como explotable: +${VALIDATED_BONUS} puntos (máximo 100).`, `Validated as exploitable: +${VALIDATED_BONUS} points (capped at 100).`)}</li>
                    <li>{L(`Validado como no explotable: la puntuación se multiplica por ${String(NOT_EXPLOITABLE_FACTOR).replace('.', ',')} y su arista sale del grafo.`, `Validated as not exploitable: the score is multiplied by ${NOT_EXPLOITABLE_FACTOR} and its edge leaves the graph.`)}</li>
                    <li>{L('«Saltos» es la distancia en el grafo hasta la joya de la corona más cercana.', '“Hops” is the graph distance to the nearest crown jewel.')}</li>
                  </ul>
                  <div className="space-y-2 text-xs">
                    {BAND_THRESHOLDS.map(([b, min], i) => (
                      <div key={b} className="flex items-start gap-3 rounded-xl border border-hairline p-3">
                        <div className="w-28 shrink-0 font-semibold" style={{ color: `var(--color-${b})` }}>{c.band[b]} ({min}–{i ? n1(BAND_THRESHOLDS[i - 1][1] - 0.1) : '100'})</div>
                        <div className="text-ink-3">{L(`SLA de remediación: ${SLA_DAYS[b]} días.`, `Remediation SLA: ${SLA_DAYS[b]} days.`)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'ingesta' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-ink">{L('Ingesta local, sin servidor', 'Local intake, no server')}</h3>
                  <p className="text-xs text-ink-3">
                    {L('Los ficheros se analizan en la memoria de tu navegador (o en la API FastAPI local si la activas). Todo lo importado se trata como no confiable: XML sin entidades ni DTD, JSON sin claves de prototipo y un tamaño máximo por fichero (60 MB en escáneres).', 'Files are parsed in your browser’s memory (or in the local FastAPI API if you enable it). Everything imported is treated as untrusted: XML without entities or DTD, JSON without prototype keys and a per-file size limit (60 MB for scanners).')}
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>Nmap XML</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">{L('Exporta el escaneo en XML:', 'Export the scan as XML:')}</p>
                      <pre className="code mt-2">nmap -sV -sC -oX escaneo.xml 192.168.1.0/24</pre>
                    </div>
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>BloodHound / SharpHound JSON</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        {L('Ficheros de SharpHound o BloodHound CE (computers.json, users.json). Detecta controladores de dominio, cuentas con SPN (Kerberoasting), cuentas sin preautenticación (AS-REP roasting) y delegación sin restricciones.', 'SharpHound or BloodHound CE files (computers.json, users.json). Detects domain controllers, accounts with SPNs (Kerberoasting), accounts without pre-authentication (AS-REP roasting) and unconstrained delegation.')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>Nessus · OpenVAS · Nuclei · Trivy · SARIF</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">{L('«Importar escáner» en Priorización detecta el formato, enseña qué se crea, qué se actualiza y qué se reabre, y solo entonces lo aplica. Un hallazgo que ya existe se reconoce por activo y CVE o por la misma guía, así que importar dos veces no duplica.', '“Import scanner” in Prioritization detects the format, shows what will be created, updated and reopened, and only then applies it. An existing finding is recognised by asset and CVE or by the same guide, so importing twice does not duplicate.')}</p>
                      <pre className="code mt-2">nuclei -l objetivos.txt -jsonl -o nuclei.jsonl{'\n'}trivy image --format json -o trivy.json registro/app:1.0{'\n'}semgrep --sarif -o semgrep.sarif</pre>
                    </div>
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>CISA KEV · FIRST EPSS</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">{L('Descarga tú los catálogos oficiales (known_exploited_vulnerabilities.json y epss_scores-AAAA-MM-DD.csv.gz) e impórtalos igual que un escáner. La app nunca los pide por red; su versión queda en el proyecto y en el informe.', 'Download the official catalogs yourself (known_exploited_vulnerabilities.json and epss_scores-YYYY-MM-DD.csv.gz) and import them like a scanner. The app never fetches them; their version is stored in the project and the report.')}</p>
                    </div>
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>{L('Tickets en Jira y GitHub', 'Tickets in Jira and GitHub')}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">{L('Jira: Ajustes del sistema → Importación externa → CSV, con formato de fecha «yyyy-MM-dd». GitHub: el JSON trae un issue por ticket; se envía sin pasar los textos por la shell:', 'Jira: System settings → External system import → CSV, with date format “yyyy-MM-dd”. GitHub: the JSON has one issue per ticket; send it without passing the texts through the shell:')}</p>
                      <pre className="code mt-2">{"jq -c '.[]' github-issues.json | while read -r i; do\n  printf '%s' \"$i\" | gh api --method POST repos/ORG/REPO/issues --input -\ndone"}</pre>
                    </div>
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>CSV / JSON</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        {L('Descarga la plantilla CSV desde Priorización. Las celdas que empiezan por = + − @ se neutralizan al exportar.', 'Download the CSV template from Prioritization. Cells starting with = + − @ are neutralized on export.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'atajos' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink">{c.helpTabs.atajos}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      [L('Búsqueda global', 'Global search'), 'Ctrl + K'],
                      [L('Cerrar diálogos, paneles y menús', 'Close dialogs, panels and menus'), 'Escape'],
                      [L('Recorrer las pestañas de la ayuda', 'Move through help tabs'), '← →'],
                      [L('Imprimir o guardar el informe en PDF', 'Print or save the report as PDF'), 'Ctrl + P'],
                    ].map(([label, key]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-3">
                        <span className="text-xs text-ink-2">{label}</span>
                        <kbd className="kbd">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'glosario' && (
                <dl className="space-y-3 text-xs">
                  {[
                    [L('Joya de la corona', 'Crown jewel'), L('Activo de criticidad 5 cuyo compromiso afecta a toda la organización (p. ej. el controlador de dominio o la base de datos financiera). Es el destino de las rutas de ataque.', 'A criticality-5 asset whose compromise affects the whole organization (e.g. the domain controller or the finance database). It is the target of attack paths.')],
                    [L('Punto de estrangulamiento', 'Choke point'), L('Nodo o arista presente en al menos el 40 % de las rutas hacia las joyas de la corona. Corregirlo corta la mayoría de caminos a la vez.', 'A node or edge present in at least 40 % of the paths to the crown jewels. Fixing it cuts most routes at once.')],
                    ['CISA KEV', L('Catálogo de la CISA (EE. UU.) de vulnerabilidades con explotación activa confirmada.', 'CISA’s (US) catalog of vulnerabilities with confirmed active exploitation.')],
                    ['EPSS', L('Probabilidad, publicada por FIRST, de que una vulnerabilidad se explote en los próximos 30 días.', 'Probability, published by FIRST, that a vulnerability will be exploited in the next 30 days.')],
                    ['MITRE ATT&CK', L('Catálogo público de tácticas y técnicas de adversarios reales que mantiene MITRE. CTEM-Nexus asigna a cada hallazgo las técnicas que habilita (inferidas de la guía, el título y el CVE, o fijadas por el analista) y las muestra en el Mapa ATT&CK.', 'Public catalog of real-world adversary tactics and techniques maintained by MITRE. CTEM-Nexus maps each finding to the techniques it enables (inferred from the guide, title and CVE, or pinned by the analyst) and shows them on the ATT&CK map.')],
                    ['ATT&CK Navigator', L('Herramienta web de MITRE para ver capas de técnicas. El Mapa ATT&CK exporta una capa JSON (formato 4.5) que se abre con «Open Existing Layer».', 'MITRE’s web tool for viewing technique layers. The ATT&CK map exports a JSON layer (format 4.5) you open with “Open Existing Layer”.')],
                    ['MTTR', L('Tiempo medio de remediación: días entre la detección y la mitigación de los hallazgos cerrados.', 'Mean time to remediate: days between detection and mitigation of closed findings.')],
                  ].map(([term, def]) => (
                    <div key={term} className="rounded-xl border border-hairline bg-surface p-3">
                      <dt className="font-semibold text-ink">{term}</dt>
                      <dd className="mt-1 text-ink-3">{def}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {tab === 'acerca' && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-ink">{c.helpTabs.acerca}</h3>

                  <div className="rounded-2xl border border-hairline bg-surface p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-[var(--color-accent-ink)]">YR</div>
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-ink">Yoandy Ramírez Delgado</div>
                        <div className="text-sm text-ink-2">{L('Diseño y desarrollo de CTEM-Nexus', 'Design and development of CTEM-Nexus')}</div>
                        <div className="mt-0.5 text-xs text-ink-3">Junior Pentester · eJPTv2 · AI Governance (ISO 42001) · SysAdmin</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href="https://github.com/heindall92" target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-surface active:scale-[0.97]">
                            <FolderGit2 className="size-3.5" /> GitHub
                          </a>
                          <a href="mailto:yoandyramirezdelgado@gmail.com" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-3 text-xs font-semibold text-ink active:scale-[0.97]">
                            <Mail className="size-3.5" /> yoandyramirezdelgado@gmail.com
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <section className="space-y-2 text-xs text-ink-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{L('Sobre la herramienta', 'About the tool')}</h4>
                    <p><strong className="text-ink">CTEM-Nexus {__APP_VERSION__}</strong> · {L('Gestión continua de la exposición a amenazas, en las cinco fases de Gartner: alcance, descubrimiento con Nmap y BloodHound, priorización explicable, rutas de ataque y movilización.', 'Continuous threat exposure management in Gartner’s five stages: scoping, discovery with Nmap and BloodHound, explainable prioritization, attack paths and mobilization.')}</p>
                    <p>{L('Herramienta de apoyo a la priorización. No sustituye a un test de intrusión ni a una auditoría. El caso de ejemplo es ficticio.', 'A prioritization aid. It does not replace a penetration test or an audit. The sample case is fictional.')}</p>
                    <p>{L('Proyecto independiente: no está afiliado a Gartner, MITRE, CISA, FIRST, ISO, el CCN ni a ninguna entidad de certificación. Iconos Lucide. El cálculo corre en el navegador; la API FastAPI es opcional y solo habla con localhost. Código bajo licencia GPLv2.', 'Independent project: not affiliated with Gartner, MITRE, CISA, FIRST, ISO, CCN or any certification body. Lucide icons. Scoring runs in the browser; the FastAPI API is optional and only talks to localhost. Code under the GPLv2 license.')}</p>
                    <a href="https://github.com/heindall92/ctem-nexus" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent">
                      <FolderGit2 className="size-3.5" /> github.com/heindall92/ctem-nexus
                    </a>
                  </section>

                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{L('Herramientas del ecosistema', 'Ecosystem tools')}</h4>
                    <p className="mt-2 text-xs text-ink-3">{L('Compliance Studio prepara la declaración de aplicabilidad y Rosetta la cruza con otras normas. KAIROS cubre la continuidad. CTEM-Nexus prioriza la exposición técnica. ENS AD Auditor revisa el directorio. ARGOS es el laboratorio de práctica y Norvik, la gobernanza.', 'Compliance Studio prepares the statement of applicability and Rosetta maps it to other standards. KAIROS covers continuity. CTEM-Nexus prioritizes technical exposure. ENS AD Auditor reviews the directory. ARGOS is the practice lab and Norvik, governance.')}</p>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {ECOSYSTEM.map((tool) => (
                        <li key={tool.code} className={`flex flex-col rounded-2xl border bg-surface p-4 ${tool.here ? 'border-accent/50' : 'border-hairline'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-ink">{tool.name}</div>
                            {tool.here && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink">{L('Estás aquí', 'You are here')}</span>}
                          </div>
                          <p className="mt-2 flex-1 text-xs text-ink-3">{L(tool.note, tool.noteEn)}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {tool.web && !tool.here && (
                              <a href={tool.web} target="_blank" rel="noopener noreferrer" aria-label={L(`Abrir ${tool.name}`, `Open ${tool.name}`)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]">
                                <ExternalLink className="size-3.5" /> {L('Abrir', 'Open')}
                              </a>
                            )}
                            <a href={tool.code} target="_blank" rel="noopener noreferrer" aria-label={L(`Código de ${tool.name}`, `${tool.name} source code`)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-ink hover:bg-surface-2 active:scale-[0.97]">
                              <FolderGit2 className="size-3.5" /> {L('Código', 'Code')}
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="rounded-2xl bg-surface-2 p-4">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <HelpCircle className="size-4 text-accent" /> {L('¿Sigues con dudas?', 'Still have questions?')}
                    </div>
                    <p className="mt-1 text-xs text-ink-3">{L('CTEM-Nexus no tiene soporte en directo. Puedes abrir una incidencia en el repositorio o escribir al autor.', 'CTEM-Nexus has no live support. You can open an issue in the repository or write to the author.')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href="https://github.com/heindall92/ctem-nexus/issues/new" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]">
                        <Bug className="size-3.5" /> {L('Abrir una incidencia', 'Open an issue')}
                      </a>
                      <a href="mailto:yoandyramirezdelgado@gmail.com" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-xs font-semibold text-ink active:scale-[0.97]">
                        <Mail className="size-3.5" /> {L('Escribir al autor', 'Write to the author')}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie */}
            <div className="flex items-center justify-between border-t border-hairline bg-surface-2/40 px-6 py-3 text-xs text-ink-3">
              <span>CTEM-Nexus · Yoandy Ramírez Delgado</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-primary btn-sm rounded-full px-4"
              >
                {L('Entendido', 'Got it')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
