import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Crosshair, LayoutDashboard, ListChecks, Radar, Route, Settings as SettingsIcon, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useResult } from '../lib/analysis';
import { useStore, type View } from '../store/store';
import { SPRING } from './ui';

const NAV: Array<{ view: View; label: string; icon: ReactNode; phase?: string }> = [
  { view: 'panel', label: 'Panel', icon: <LayoutDashboard /> },
  { view: 'alcance', label: 'Alcance y activos', icon: <Crosshair />, phase: 'Alcance' },
  { view: 'priorizacion', label: 'Priorización', icon: <Radar />, phase: 'Descubrimiento' },
  { view: 'rutas', label: 'Rutas de ataque', icon: <Route />, phase: 'Validación' },
  { view: 'movilizacion', label: 'Movilización', icon: <ListChecks />, phase: 'Movilización' },
];

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-surface-3)" />
      <path d="M9 22V10l14 12V10" fill="none" stroke="var(--color-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const { result } = useResult();
  const badges: Partial<Record<View, number>> = {
    priorizacion: result.summary.byBand.critica,
    rutas: result.summary.chokePoints,
  };
  const item = (n: { view: View; label: string; icon: ReactNode }) => {
    const active = view === n.view;
    return (
      <li key={n.view}>
        <button
          type="button"
          onClick={() => setView(n.view)}
          aria-current={active ? 'page' : undefined}
          className={`group relative flex h-9 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[0.8125rem] font-medium transition-[color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
        >
          {active && <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-[10px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]" transition={SPRING} />}
          <span className={`[&_svg]:size-4 ${active ? 'text-accent' : ''}`}>{n.icon}</span>
          <span className="flex-1 truncate">{n.label}</span>
          {badges[n.view] ? <span className="num rounded-md bg-surface-3 px-1.5 text-[0.6875rem] text-ink-2">{badges[n.view]}</span> : null}
        </button>
      </li>
    );
  };
  return (
    <aside className="no-print flex w-[232px] shrink-0 flex-col border-r border-hairline bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Logo />
        <div className="leading-tight">
          <div className="text-[0.875rem] font-semibold tracking-[-0.01em]">CTEM-Nexus</div>
          <div className="text-[0.6875rem] text-ink-3">Gestión de la exposición</div>
        </div>
      </div>
      <nav aria-label="Secciones" className="isolate flex-1 px-2.5 pt-3">
        <ul className="flex flex-col gap-0.5">{NAV.map(item)}</ul>
        <div className="mx-3 my-4 h-px bg-hairline" />
        <ul>{item({ view: 'ajustes', label: 'Ajustes y datos', icon: <SettingsIcon /> })}</ul>
      </nav>
      <div className="px-4 pb-4 text-[0.6875rem] leading-relaxed text-ink-4">
        Sin servidor · sin peticiones a terceros
        <br />
        GPL-2.0 · Yoandy Ramírez Delgado
      </div>
    </aside>
  );
}

export function EngineBadge() {
  const { status, result } = useResult();
  const map = {
    local: { text: `Motor local v${result.version}`, color: 'var(--color-accent)' },
    api: { text: `API FastAPI · motor ${result.engine}`, color: 'var(--color-ok)' },
    loading: { text: 'Conectando con la API…', color: 'var(--color-media)' },
    fallback: { text: 'API no disponible · motor local', color: 'var(--color-alta)' },
  } as const;
  const m = map[status.mode];
  return (
    <span className="chip h-6 px-2" title={status.mode === 'fallback' ? status.reason : undefined}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: m.color }} />
      {m.text}
    </span>
  );
}

export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="no-print glass sticky top-0 z-20 border-b border-hairline">
      <div className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-8 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="title-xl">{title}</h1>
          {subtitle && <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-3">{subtitle}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}<EngineBadge /></div>
      </div>
    </header>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 };
  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-50 flex w-[360px] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id} layout={!reduce}
            initial={hidden} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ ...hidden, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            transition={SPRING}
            className="glass glass-edge pointer-events-auto flex items-start gap-3 rounded-[14px] px-4 py-3 text-[0.8125rem]"
          >
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: t.tone === 'error' ? 'var(--color-critica)' : t.tone === 'info' ? 'var(--color-media)' : 'var(--color-ok)' }} />
            <span className="flex-1 text-ink">{t.text}</span>
            <button type="button" className="btn btn-ghost btn-sm btn-icon -my-1 -mr-2" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}><X /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Panel lateral no modal (sin velo): entra y sale por el mismo borde, con muelle sin rebote e interrumpible. */
export function Drawer({ open, onClose, title, children, footer, width = 460 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (open) requestAnimationFrame(() => ref.current?.focus({ preventScroll: true })); }, [open]);
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, x: 28 };
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          role="dialog" aria-modal="false" aria-label={typeof title === 'string' ? title : 'Detalle'}
          initial={hidden} animate={{ opacity: 1, x: 0 }}
          exit={{ ...hidden, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
          transition={SPRING}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          tabIndex={-1}
          ref={ref}
          className="no-print glass-thick glass-edge fixed bottom-3 right-3 top-3 z-40 flex flex-col overflow-hidden rounded-[18px] outline-none"
          style={{ width }}
        >
          <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
            <div className="min-w-0 flex-1">{title}</div>
            <button type="button" className="btn btn-ghost btn-sm btn-icon -mr-1" onClick={onClose} aria-label="Cerrar panel"><X /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-hairline px-5 py-3">{footer}</div>}
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}
