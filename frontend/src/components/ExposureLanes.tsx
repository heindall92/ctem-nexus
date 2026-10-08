import { Crown, Flame, Globe } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Asset, Band, Finding, ScoredFinding } from '../engine/types';
import { screen, useL } from '../i18n';
import { BAND_FILL, n1 } from '../lib/format';
import { useStore } from '../store/store';

/* Franjas de exposición: una fila por activo y una marca por hallazgo sobre la escala 0–100.
 * Las zonas de fondo son las bandas (Baja < 40 ≤ Media < 60 ≤ Alta < 80 ≤ Crítica), así que la banda se lee
 * por posición aunque no se distinga el color. Los KEV llevan anillo. Cada marca es un botón con su descripción. */

const ZONES: Array<{ band: Band; from: number; to: number }> = [
  { band: 'baja', from: 0, to: 40 },
  { band: 'media', from: 40, to: 60 },
  { band: 'alta', from: 60, to: 80 },
  { band: 'critica', from: 80, to: 100 },
];
const MAX_ROWS = 8;
// Cada marca es un objetivo táctil de 24 × 24 px (WCAG 2.2 · 2.5.8). Dos marcas a menos de NEAR puntos irían
// solapadas incluso en móvil (≈ 200 px de eje), así que pasan a otro carril de la misma fila.
const NEAR = 12;
const LANE = 26; // alto de un carril (px)

export interface LaneItem { scored: ScoredFinding; finding: Finding }

export function ExposureLanes({ items, assets, onOpen }: { items: LaneItem[]; assets: Asset[]; onOpen: (id: string) => void }) {
  const L = useL();
  const c = screen[useStore((s) => s.lang)];
  const [active, setActive] = useState<string | null>(null);

  const rows = useMemo(() => {
    const by = new Map<string, LaneItem[]>();
    for (const it of items) by.set(it.finding.assetId, [...(by.get(it.finding.assetId) ?? []), it]);
    return [...by.entries()]
      .map(([assetId, list]) => {
        const sorted = [...list].sort((a, b) => a.scored.score - b.scored.score);
        // Enjambre por carriles: cada marca va al primer carril cuyo último ocupante esté a NEAR puntos o más.
        const lastInLane: number[] = [];
        const placed: Array<{ it: LaneItem; lane: number }> = [];
        for (const it of sorted) {
          let lane = lastInLane.findIndex((x) => it.scored.score - x >= NEAR);
          if (lane === -1) lane = lastInLane.length;
          lastInLane[lane] = it.scored.score;
          placed.push({ it, lane });
        }
        return { asset: assets.find((a) => a.id === assetId), assetId, max: sorted[sorted.length - 1].scored.score, placed, lanes: lastInLane.length };
      })
      .sort((a, b) => b.max - a.max);
  }, [items, assets]);

  const shown = rows.slice(0, MAX_ROWS);
  const hidden = rows.length - shown.length;

  return (
    <div className="flex flex-col" role="group" aria-label={L('Franjas de exposición por activo', 'Exposure lanes by asset')}>
      {/* Zonas de banda con su etiqueta */}
      <div className="lanes-grid text-[11px] text-ink-3" aria-hidden>
        <span />
        <div className="relative flex h-6">
          {ZONES.map((z) => (
            <span key={z.band} className="flex items-end gap-1.5 border-l border-hairline-strong pb-1 pl-1.5 first:border-l-0 first:pl-0" style={{ width: `${z.to - z.from}%` }}>
              <span className="size-2 shrink-0 rounded-[3px]" style={{ background: BAND_FILL[z.band] }} />
              <span className="hidden truncate sm:inline">{c.band[z.band]}</span>
            </span>
          ))}
        </div>
      </div>

      <ul className="flex flex-col">
        {shown.map((r) => (
          <li key={r.assetId} className="lanes-grid group/lane border-t border-hairline">
            <div className="flex min-w-0 items-center gap-1.5 py-2 pr-3 text-[0.8125rem]">
              {r.asset?.criticality === 5 && <Crown className="size-3.5 shrink-0 text-accent" aria-label={c.crownJewel} />}
              <span className="truncate font-medium" title={r.asset?.name ?? r.assetId}>{r.asset?.name ?? r.assetId}</span>
              {r.asset?.internetExposed && <Globe className="size-3.5 shrink-0 text-ink-3" aria-label={L('Expuesto a Internet', 'Internet-facing')} />}
            </div>
            <div className="relative" style={{ height: Math.max(48, r.lanes * LANE + 12) }}>
              {ZONES.map((z) => (
                <span key={z.band} aria-hidden className="absolute inset-y-0 border-l border-dashed border-hairline-strong first:border-l-0"
                  style={{ left: `${z.from}%`, width: `${z.to - z.from}%`, background: `color-mix(in oklab, ${BAND_FILL[z.band]} ${z.band === 'critica' ? 9 : 5}%, transparent)` }} />
              ))}
              {r.placed.map(({ it, lane }) => {
                const s = it.scored;
                const on = active === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`lane-mark ${it.finding.kev ? 'lane-mark-kev' : ''} ${active && !on ? 'opacity-35' : ''}`}
                    style={{ left: `${s.score}%`, top: (Math.max(48, r.lanes * LANE + 12) - r.lanes * LANE) / 2 + lane * LANE + LANE / 2, ['--mark' as string]: BAND_FILL[s.band] }}
                    aria-label={`${it.finding.id} · ${it.finding.title} · ${n1(s.score)} · ${c.band[s.band]}${it.finding.kev ? ' · CISA KEV' : ''}`}
                    onPointerEnter={() => setActive(s.id)} onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(s.id)} onBlur={() => setActive(null)}
                    onClick={() => onOpen(s.id)}
                  >
                    {on && (
                      <span role="tooltip" className={`lane-tip ${s.score > 70 ? 'right-0' : s.score < 30 ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}>
                        <span className="num block text-[11px] text-ink-3">{it.finding.id}{it.finding.cve ? ` · ${it.finding.cve}` : ''}</span>
                        <span className="mt-0.5 block font-medium text-ink">{it.finding.title}</span>
                        <span className="mt-1 flex items-center gap-2 text-xs">
                          <span className="num font-semibold text-ink">{n1(s.score)}</span>
                          <span className="text-ink-2">{c.band[s.band]}</span>
                          {it.finding.kev && <span className="flex items-center gap-1 text-ink-2"><Flame className="size-3" />KEV</span>}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {/* Eje */}
      <div className="lanes-grid border-t border-hairline-strong pt-1 text-[11px] text-ink-3" aria-hidden>
        <span>{hidden > 0 ? L(`+${hidden} activos más`, `+${hidden} more assets`) : ''}</span>
        <div className="relative h-4">
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <span key={t} className="num absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${t}%` }}>{t}</span>
          ))}
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3 sm:hidden" aria-hidden>
        {ZONES.map((z) => <li key={z.band} className="flex items-center gap-1.5"><span className="size-2 rounded-[3px]" style={{ background: BAND_FILL[z.band] }} />{c.band[z.band]} {z.from}–{z.to}</li>)}
      </ul>
    </div>
  );
}
