import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Crosshair, HelpCircle, Layers, Radar, Route, Search, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { screen } from '../i18n';
import { useResult } from '../lib/analysis';
import { useStore, type View } from '../store/store';
import { BandBadge, SPRING } from './ui';

export function SearchModal() {
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const setView = useStore((s) => s.setView);
  const selectFinding = useStore((s) => s.selectFinding);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const c = screen[useStore((s) => s.lang)];
  const project = useStore((s) => s.project);
  const { result } = useResult();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Escuchar atajo global Ctrl+K / Cmd+K y Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useStore.getState().searchOpen);
      } else if (e.key === 'Escape' && useStore.getState().searchOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Mapa de puntuaciones por ID de hallazgo
  const scoredMap = useMemo(() => {
    const map = new Map<string, (typeof result.scored)[number]>();
    for (const sf of result.scored) {
      map.set(sf.id, sf);
    }
    return map;
  }, [result.scored]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedAssets = project.assets
      .filter((a) => a.name.toLowerCase().includes(q) || a.ip?.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 5);

    const matchedFindings = project.findings
      .filter((f) => f.title.toLowerCase().includes(q) || (f.cve && f.cve.toLowerCase().includes(q)) || (f.technique && f.technique.toLowerCase().includes(q)) || f.assetId.toLowerCase().includes(q))
      .slice(0, 6);

    const matchedRanges = project.ranges
      .filter((r) => r.label.toLowerCase().includes(q) || r.cidr.toLowerCase().includes(q))
      .slice(0, 3);

    return { assets: matchedAssets, findings: matchedFindings, ranges: matchedRanges };
  }, [query, project.assets, project.ranges, project.findings]);

  const navigateTo = (view: View, findingId?: string) => {
    setView(view);
    if (findingId) selectFinding(findingId);
    setOpen(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]">
          {/* Velo con desenfoque de fondo estilo Apple */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Caja de diálogo modal Spotlight */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={SPRING}
            className="glass-thick glass-edge relative z-10 flex w-full max-w-[620px] flex-col overflow-hidden rounded-[20px] border border-hairline bg-surface shadow-2xl"
          >
            {/* Cabecera del buscador */}
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
              <Search className="size-5 shrink-0 text-ink-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="w-full bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-4 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
              <kbd className="kbd shrink-0 text-[0.6875rem]">ESC</kbd>
            </div>

            {/* Contenido de resultados o sugerencias */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query ? (
                <div className="px-3 py-4 text-xs text-ink-3">
                  <div className="mb-2 font-medium uppercase tracking-wider text-ink-4">{c.searchHint}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigateTo('panel')}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      <Layers className="size-4 text-accent" />
                      <span>{c.searchHome}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('alcance')}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      <Crosshair className="size-4 text-accent" />
                      <span>{c.searchScope}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('priorizacion')}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      <Radar className="size-4 text-accent" />
                      <span>{c.searchPrio}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('rutas')}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      <Route className="size-4 text-accent" />
                      <span>{c.searchPaths}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); setHelpOpen(true); }}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      <HelpCircle className="size-4 text-accent" />
                      <span>{c.searchHelp}</span>
                    </button>
                  </div>
                </div>
              ) : results && (results.assets.length > 0 || results.findings.length > 0 || results.ranges.length > 0) ? (
                <div className="space-y-4 p-1">
                  {results.findings.length > 0 && (
                    <div>
                      <div className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-4">{c.searchFindings(results.findings.length)}</div>
                      <div className="space-y-0.5">
                        {results.findings.map((f) => {
                          const sf = scoredMap.get(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => navigateTo('priorizacion', f.id)}
                              className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-surface-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {sf && <BandBadge band={sf.band} compact />}
                                  <span className="font-medium text-ink group-hover:text-accent">{f.title}</span>
                                </div>
                                <div className="mt-0.5 text-[0.6875rem] text-ink-3">
                                  {f.cve && <span className="font-mono text-ink-2">{f.cve} · </span>}
                                  <span>{c.assetLabel}: {f.assetId}</span>
                                  {f.technique && <span> · MITRE: {f.technique}</span>}
                                </div>
                              </div>
                              <ArrowRight className="size-3.5 text-ink-4 opacity-0 transition group-hover:opacity-100" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {results.assets.length > 0 && (
                    <div>
                      <div className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-4">{c.searchAssets(results.assets.length)}</div>
                      <div className="space-y-0.5">
                        {results.assets.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => navigateTo('alcance')}
                            className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-surface-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <Crosshair className="size-3.5 text-ink-3" />
                              <span className="font-medium text-ink group-hover:text-accent">{a.name}</span>
                              {a.ip && <span className="font-mono text-ink-3">{a.ip}</span>}
                              <span className="chip text-[0.625rem]">{a.type}</span>
                            </div>
                            <ArrowRight className="size-3.5 text-ink-4 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-ink-3">
                  <ShieldAlert className="mx-auto mb-2 size-6 text-ink-4" />
                  {c.noMatches(query)}
                </div>
              )}
            </div>

            {/* Pie de modal */}
            <div className="flex items-center justify-between border-t border-hairline bg-surface-2/50 px-4 py-2 text-[0.6875rem] text-ink-4">
              <span>{c.searchFoot}</span>
              <span className="font-medium text-ink-3">CTEM-Nexus · Local-First</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
