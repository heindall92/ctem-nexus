import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import type { Band } from '../engine/types';
import { screen } from '../i18n';
import { BAND_COLOR, n1 } from '../lib/format';
import { useStore } from '../store/store';

/** Muelle críticamente amortiguado (Apple: damping 1.0, response ≈ 0,3 s). Sin rebote: la UI no lo lanza el usuario. */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.3 } as const;

export function BandBadge({ band, compact = false }: { band: Band; compact?: boolean }) {
  const label = screen[useStore((s) => s.lang)].band[band];
  return (
    <span className="chip" style={{ color: BAND_COLOR[band], background: `color-mix(in oklab, ${BAND_COLOR[band]} 14%, transparent)` }}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: BAND_COLOR[band] }} />
      {compact ? label.slice(0, 4) : label}
    </span>
  );
}

export function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="bar-track" aria-hidden>
      <div className="bar-fill" style={{ background: color, transform: `scaleX(${Math.max(0, Math.min(1, value / max))})` }} />
    </div>
  );
}

/** Puntuación con su barra. `muted` (mitigados y no explotables) usa tinta secundaria en vez de transparencia: el color
 * de banda atenuado con opacidad no llega a 4,5:1 sobre el fondo. */
export function Score({ score, band, muted = false }: { score: number; band: Band; muted?: boolean }) {
  const color = muted ? 'var(--color-ink-3)' : BAND_COLOR[band];
  return (
    <div className="flex w-[4.5rem] flex-col gap-1.5">
      <span className="num text-[0.9375rem] font-semibold leading-none" style={{ color }}>{n1(score)}</span>
      <ScoreBar value={score} color={color} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div className="seg isolate" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={SPRING} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label font-medium text-ink-2">{label}</span>
      {children}
      {error ? <span className="text-xs text-critica">{error}</span> : hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className="relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? 'var(--color-accent)' : 'var(--color-surface-3)' }}
    >
      <span
        aria-hidden
        className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ transform: `translateX(${checked ? 16 : 0}px)` }}
      />
    </button>
  );
}

export function SectionTitle({ title, detail, actions }: { title: string; detail?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-4">
      <div className="min-w-0">
        <h2 className="title-md">{title}</h2>
        {detail && <p className="mt-0.5 text-[0.8125rem] text-ink-3">{detail}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2 [&_svg]:size-5">{icon}</div>
      <h3 className="title-md">{title}</h3>
      <p className="mt-1.5 max-w-[46ch] text-ink-3">{text}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function DemoBadge() {
  return <span className="chip" style={{ color: 'var(--color-media)', background: 'color-mix(in oklab, var(--color-media) 12%, transparent)' }}>{screen[useStore((s) => s.lang)].demoBadge}</span>;
}

/** Cabecera de página al estilo de Rosetta: antetítulo con icono, título grande, entradilla y acciones. */
export function PageHeader({ icon, eyebrow, title, lead, actions, badge }: { icon: ReactNode; eyebrow: string; title: string; lead?: ReactNode; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <Reveal as="header" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-1 pt-3">
      <div className="min-w-0 max-w-[68ch]">
        <p className="eyebrow flex items-center gap-2 [&_svg]:size-3.5">{icon}<span className="truncate">{eyebrow}</span></p>
        <h1 className="page-title mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">{title}{badge}</h1>
        {lead && <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </Reveal>
  );
}

/** Aparición con muelle (Kowalski: sin rebote, interrumpible). Con movimiento reducido, MotionConfig deja solo el fundido. */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'header' }) {
  const Tag = motion[as];
  return (
    <Tag className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay }}>
      {children}
    </Tag>
  );
}
