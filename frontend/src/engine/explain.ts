/* Presentación de la puntuación en el idioma activo. El motor (y su espejo en Python) produce los textos en español,
 * que forman parte del fichero dorado; aquí se reconstruyen en inglés a partir de los mismos datos estructurados. */
import { EXPLOIT_PUBLIC_FLOOR, NOT_EXPLOITABLE_FACTOR } from './constants';
import type { Asset, Band, Factor, Finding, ScoredFinding } from './types';
export type Lang = 'es' | 'en';

const BAND_EN: Record<Band, string> = { critica: 'Critical', alta: 'High', media: 'Medium', baja: 'Low' };
const LABEL_EN: Record<Factor['key'], string> = {
  severidad: 'Severity', explotabilidad: 'Exploitability', criticidad: 'Asset criticality', exposicion: 'Exposure', proximidad: 'Proximity', validacion: 'Validation',
};
const n1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

function detailEn(fa: Factor, f: Finding, asset: Asset | undefined, s: ScoredFinding): string {
  switch (fa.key) {
    case 'severidad': return `CVSS ${n1(Math.min(10, Math.max(0, f.cvss)))}`;
    case 'explotabilidad': {
      const epss = Math.min(1, Math.max(0, f.epss ?? 0));
      if (f.kev) return 'In the CISA KEV catalog: active exploitation confirmed';
      if (f.exploitPublic && EXPLOIT_PUBLIC_FLOOR >= epss) return epss > 0 ? `Public exploit available (EPSS ${n1(epss * 100)} %)` : 'Public exploit available';
      if (epss > 0) return `EPSS ${n1(epss * 100)} % probability of exploitation in 30 days`;
      return 'No sign of exploitation';
    }
    case 'criticidad': return `Business criticality ${asset ? asset.criticality : 1}/5${asset ? ` (${asset.name})` : ' (unknown asset)'}`;
    case 'exposicion': return asset?.internetExposed ? 'Exposed to the Internet' : 'Reachable only from the internal network';
    case 'proximidad': {
      const h = s.hopsToCrown;
      return h === null ? 'No known path to a crown jewel' : h === 0 ? 'Directly affects a crown jewel' : `${h} ${h === 1 ? 'hop' : 'hops'} from a crown jewel`;
    }
    case 'validacion': return fa.points > 0 ? 'Validated as exploitable' : `Validated as not exploitable (×${NOT_EXPLOITABLE_FACTOR})`;
  }
}

/** Factores con etiqueta y detalle en el idioma pedido (en español, los del motor sin tocar). */
export function factorsIn(lang: Lang, s: ScoredFinding, f: Finding, asset: Asset | undefined): Factor[] {
  if (lang === 'es') return s.factors;
  return s.factors.map((fa) => ({ ...fa, label: LABEL_EN[fa.key], detail: detailEn(fa, f, asset, s) }));
}

/** Explicación de la prioridad con la misma regla que el motor: los tres factores que más suman y la validación. */
export function explanationIn(lang: Lang, s: ScoredFinding, f: Finding, asset: Asset | undefined): string {
  if (lang === 'es') return s.explanation;
  const factors = factorsIn(lang, s, f, asset);
  const ranked = factors.slice(0, 5).map((fa, i) => ({ fa, i })).filter(({ fa }) => fa.points > 0)
    .sort((a, b) => b.fa.points - a.fa.points || a.i - b.i).slice(0, 3).map(({ fa }) => fa.detail);
  const reasons = [...ranked, ...(factors.length > 5 ? [factors[5].detail] : [])];
  const prefix = f.status === 'mitigado' ? 'Mitigated; reference score' : `${BAND_EN[s.band]} priority`;
  return `${prefix} (${n1(s.score)}/100). ${reasons.length ? reasons.join('; ') : 'No relevant risk factors'}.`;
}

/** Solo los motivos, sin la prioridad (para los tickets). */
export function reasonsIn(lang: Lang, s: ScoredFinding, f: Finding, asset: Asset | undefined): string {
  return explanationIn(lang, s, f, asset).replace(/^[^.]+\(\d+[.,]\d\/100\)\. /, '');
}
