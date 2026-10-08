import { Crosshair, ListChecks, Radar, Route, ScanSearch } from 'lucide-react';
import { useL } from '../i18n';

/* Ilustración del ciclo CTEM: cinco fases en columna, con el retorno de la movilización al alcance. Decorativa. */
export function CycleArt() {
  const L = useL();
  const stages = [
    { icon: Crosshair, label: L('Alcance', 'Scoping'), note: L('qué importa', 'what matters') },
    { icon: ScanSearch, label: L('Descubrimiento', 'Discovery'), note: L('qué hay expuesto', 'what is exposed') },
    { icon: Radar, label: L('Priorización', 'Prioritization'), note: L('qué es urgente', 'what is urgent') },
    { icon: Route, label: L('Validación', 'Validation'), note: L('qué es explotable', 'what is exploitable') },
    { icon: ListChecks, label: L('Movilización', 'Mobilization'), note: L('quién lo corrige', 'who fixes it') },
  ];
  const X = 70;
  const STEP = 58;
  const Y0 = 24;
  const last = Y0 + STEP * (stages.length - 1);
  return (
    <svg viewBox="0 0 300 300" className="h-auto w-full max-w-[300px]" aria-hidden>
      {/* Retorno: el ciclo vuelve a empezar */}
      <path d={`M${X - 22} ${last} H18 V${Y0} H${X - 22}`} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 6" className="cycle-flow" />
      <path d={`M${X - 28} ${Y0 - 5} L${X - 22} ${Y0} L${X - 28} ${Y0 + 5}`} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={X} y1={Y0} x2={X} y2={last} stroke="var(--color-hairline-strong)" strokeWidth={2} />
      {stages.map((s, i) => {
        const y = Y0 + STEP * i;
        const Icon = s.icon;
        return (
          <g key={s.label}>
            <rect x={X - 20} y={y - 20} width={40} height={40} rx={11} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth={1.5} />
            <Icon x={X - 10} y={y - 10} width={20} height={20} color="var(--color-accent)" strokeWidth={1.75} />
            <text x={X + 34} y={y - 2} fontSize={14} fontWeight={600} fill="var(--color-ink)">{s.label}</text>
            <text x={X + 34} y={y + 15} fontSize={12} fill="var(--color-ink-3)">{s.note}</text>
          </g>
        );
      })}
    </svg>
  );
}
