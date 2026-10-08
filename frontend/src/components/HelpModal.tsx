import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Bug, ExternalLink, Calculator, FileCode, FolderGit2, HelpCircle, Keyboard, Layers, Mail, ShieldCheck, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ECOSYSTEM, screen } from '../i18n';
import { useStore } from '../store/store';
import { SPRING } from './ui';

type Tab = 'ciclo' | 'calculo' | 'ingesta' | 'atajos' | 'glosario' | 'acerca';

export function HelpModal() {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelpOpen);
  const c = screen[useStore((s) => s.lang)];
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
                    <h3 className="text-sm font-semibold text-ink">¿Qué es el marco CTEM de Gartner?</h3>
                    <p className="mt-1 text-xs text-ink-3">
                      Continuous Threat Exposure Management (CTEM) es un enfoque estratégico de 5 fases iterativas que va más allá de la simple gestión tradicional de vulnerabilidades. En lugar de tratar todos los fallos por igual, prioriza y valida las exposiciones según su explotabilidad real y su impacto en las joyas de la corona.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-xs text-accent">1</span>
                        <span>Alcance (Scoping)</span>
                      </div>
                      <p className="mt-2 text-xs text-ink-3">
                        Identifica superficies de ataque internas y externas, clasifica activos y define las joyas de la corona (Domain Controllers, bases de datos confidenciales y ERP).
                      </p>
                    </div>

                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-xs text-accent">2</span>
                        <span>Descubrimiento (Discovery)</span>
                      </div>
                      <p className="mt-2 text-xs text-ink-3">
                        Recolecta evidencias de múltiples vectores: escaneos de red Nmap XML, grafos de Active Directory con BloodHound, configuraciones incorrectas y credenciales.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-xs text-accent">3</span>
                        <span>Priorización (Prioritization)</span>
                      </div>
                      <p className="mt-2 text-xs text-ink-3">
                        Pondera las vulnerabilidades con una puntuación 0–100 considerando criticidad del activo, explotabilidad probada en el mundo real (EPSS/CISA KEV) y exposición.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-xs text-accent">4</span>
                        <span>Validación (Validation)</span>
                      </div>
                      <p className="mt-2 text-xs text-ink-3">
                        Mapea rutas completas de ataque desde el perímetro hasta el objetivo, identificando cuellos de botella (Choke Points) donde una sola acción corta múltiples caminos.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-hairline bg-surface p-4">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-xs text-accent">5</span>
                      <span>Movilización (Mobilization)</span>
                    </div>
                    <p className="mt-2 text-xs text-ink-3">
                      Genera planes de acción medibles y específicos por equipo (Sistemas, Redes, IAM), calculando el porcentaje proyectado de reducción de riesgo antes y después de mitigar.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'calculo' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-ink">Modelo Matemático de Puntuación de Exposición (0 - 100)</h3>
                  <p className="text-xs text-ink-3">
                    El score global de exposición de CTEM-Nexus es determinista y no depende de cajas negras. Evalúa 4 factores ponderados para cada hallazgo:
                  </p>

                  <div className="rounded-2xl border border-hairline bg-surface-2/40 p-4 font-mono text-xs text-ink">
                    Score = (Criticidad_Activo × 0.35) + (Severidad_CVSS × 0.30) + (Explotabilidad_Real × 0.20) + (Factor_Ruta_ChokePoint × 0.15)
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-3 rounded-xl border border-hairline p-3">
                      <div className="font-semibold text-critica">Crítica (80 - 100)</div>
                      <div className="text-ink-3">Explotación inminente o activa contra una joya de la corona o cuello de botella principal de Active Directory.</div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-hairline p-3">
                      <div className="font-semibold text-alta">Alta (60 - 79.9)</div>
                      <div className="text-ink-3">Vulnerabilidades con exploit público o credenciales comprometidas en el perímetro o servidores de aplicación.</div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-hairline p-3">
                      <div className="font-semibold text-media">Media (40 - 59.9)</div>
                      <div className="text-ink-3">Debilidades que requieren acceso interno autenticado o condiciones específicas de red.</div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-hairline p-3">
                      <div className="font-semibold text-baja">Baja (0 - 39.9)</div>
                      <div className="text-ink-3">Problemas de configuración menor o divulgación de información sin ruta directa de explotación.</div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'ingesta' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-ink">Ingesta Local sin Servidor</h3>
                  <p className="text-xs text-ink-3">
                    CTEM-Nexus procesa y parsea los archivos directamente en la memoria de tu navegador o a través de la API opcional de FastAPI si está conectada.
                  </p>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>Escaneos Nmap XML</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        Ejecuta tu escaneo habitual exportando en formato XML estándar:
                      </p>
                      <pre className="mt-2 rounded-xl bg-ground p-2.5 font-mono text-[0.6875rem] text-accent">
                        nmap -sV -sC -O -oX escaneo_red.xml 192.168.1.0/24
                      </pre>
                    </div>

                    <div className="rounded-2xl border border-hairline bg-surface p-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Terminal className="size-4 text-accent" />
                        <span>Active Directory / BloodHound JSON</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        Arrastra archivos generados por SharpHound o BloodHound CE (<code className="font-mono text-ink">users.json</code>, <code className="font-mono text-ink">computers.json</code>, <code className="font-mono text-ink">groups.json</code>).
                        Detecta automáticamente controladores de dominio, cuentas Kerberoastables, AS-REP roasting y relaciones de control abusables.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'atajos' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink">Atajos de Teclado</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                      <span className="text-xs text-ink-2">Búsqueda rápida global</span>
                      <kbd className="kbd">Ctrl + K</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                      <span className="text-xs text-ink-2">Cerrar modales y paneles</span>
                      <kbd className="kbd">Escape</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                      <span className="text-xs text-ink-2">Exportar proyecto JSON</span>
                      <span className="text-xs font-mono text-ink-3">Ajustes &gt; Exportar</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                      <span className="text-xs text-ink-2">Imprimir / Guardar en PDF</span>
                      <kbd className="kbd">Ctrl + P</kbd>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'glosario' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-hairline bg-surface p-3">
                    <div className="font-semibold text-ink">Crown Jewel (Joya de la Corona)</div>
                    <div className="mt-1 text-ink-3">Activo de máxima criticidad cuyo compromiso compromete toda la organización (ej. Domain Controller, base de datos de producción).</div>
                  </div>
                  <div className="rounded-xl border border-hairline bg-surface p-3">
                    <div className="font-semibold text-ink">Choke Point (Punto de Estrangulamiento)</div>
                    <div className="mt-1 text-ink-3">Nodo o control clave por el que convergen múltiples caminos de ataque hacia las joyas de la corona. Mitigarlo bloquea múltiples vectores simultáneamente.</div>
                  </div>
                  <div className="rounded-xl border border-hairline bg-surface p-3">
                    <div className="font-semibold text-ink">Blast Radius (Radio de Explosión)</div>
                    <div className="mt-1 text-ink-3">Alcance del impacto colateral si un atacante consigue acceso inicial a un activo concreto.</div>
                  </div>
                </div>
              )}

              {tab === 'acerca' && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-ink">Acerca de</h3>

                  <div className="rounded-2xl border border-hairline bg-surface p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-[var(--color-accent-ink)]">YR</div>
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-ink">Yoandy Ramírez Delgado</div>
                        <div className="text-sm text-ink-2">Diseño y desarrollo de CTEM-Nexus</div>
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
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Sobre la herramienta</h4>
                    <p><strong className="text-ink">CTEM-Nexus {__APP_VERSION__}</strong> · Gestión continua de la exposición a amenazas, en las cinco fases de Gartner. Alcance, descubrimiento con Nmap y BloodHound, priorización explicable, rutas de ataque y movilización.</p>
                    <p>Herramienta de apoyo a la priorización. No sustituye a un test de intrusión ni a la auditoría de certificación. El caso de ejemplo es ficticio.</p>
                    <p>Iconos Lucide. El cálculo corre en el navegador; la API FastAPI es opcional y solo habla con localhost. Código bajo licencia GPLv2.</p>
                    <a href="https://github.com/heindall92/ctem-nexus" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent">
                      <FolderGit2 className="size-3.5" /> github.com/heindall92/ctem-nexus
                    </a>
                  </section>

                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Herramientas del ecosistema</h4>
                    <p className="mt-2 text-xs text-ink-3">Compliance Studio prepara el SoA y Rosetta lo cruza. KAIROS cubre la continuidad. CTEM-Nexus prioriza la exposición. ENS AD Auditor mira el directorio. ARGOS es la práctica y Norvik, la gobernanza.</p>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {ECOSYSTEM.map((tool) => (
                        <li key={tool.code} className={`flex flex-col rounded-2xl border bg-surface p-4 ${tool.here ? 'border-accent/50' : 'border-hairline'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-ink">{tool.name}</div>
                            {tool.here && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink">Estás aquí</span>}
                          </div>
                          <p className="mt-2 flex-1 text-xs text-ink-3">{tool.note}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {tool.web && !tool.here && (
                              <a href={tool.web} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${tool.name}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]">
                                <ExternalLink className="size-3.5" /> Abrir
                              </a>
                            )}
                            <a href={tool.code} target="_blank" rel="noopener noreferrer" aria-label={`Código de ${tool.name}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-ink hover:bg-surface-2 active:scale-[0.97]">
                              <FolderGit2 className="size-3.5" /> Código
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="rounded-2xl bg-accent/10 p-4">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <HelpCircle className="size-4 text-accent" /> ¿Sigues con dudas?
                    </div>
                    <p className="mt-1 text-xs text-ink-3">CTEM-Nexus no tiene soporte en directo. Puedes abrir una incidencia en el repositorio o escribir al autor.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href="https://github.com/heindall92/ctem-nexus/issues/new" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]">
                        <Bug className="size-3.5" /> Abrir una incidencia
                      </a>
                      <a href="mailto:yoandyramirezdelgado@gmail.com" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-xs font-semibold text-ink active:scale-[0.97]">
                        <Mail className="size-3.5" /> Escribir al autor
                      </a>
                      <a href="https://github.com/heindall92/ctem-nexus" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-xs font-semibold text-ink active:scale-[0.97]">
                        <FolderGit2 className="size-3.5" /> Ver el código
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
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
