import type { AssetType, Band, FindingKind, FindingStatus } from '../engine/types';

export type Lang = 'es' | 'en';

/** Idioma activo para cifras y etiquetas. Lo fija el estado (store) al arrancar y al cambiar de idioma. */
let LANG: Lang = 'es';
export const setFormatLang = (lang: Lang) => { LANG = lang; };
export const formatLang = () => LANG;
const locale = () => (LANG === 'en' ? 'en-GB' : 'es-ES');

/** Relleno de gráficos por banda (no para texto: en claro no llega a 4,5:1). */
export const BAND_FILL: Record<Band, string> = {
  critica: 'var(--color-critica-fill)', alta: 'var(--color-alta-fill)', media: 'var(--color-media-fill)', baja: 'var(--color-baja-fill)',
};
export const BAND_COLOR: Record<Band, string> = {
  critica: 'var(--color-critica)', alta: 'var(--color-alta)', media: 'var(--color-media)', baja: 'var(--color-baja)',
};
const STATUS: Record<Lang, Record<FindingStatus, string>> = {
  es: { abierto: 'Abierto', validado: 'Validado', no_explotable: 'No explotable', mitigado: 'Mitigado' },
  en: { abierto: 'Open', validado: 'Validated', no_explotable: 'Not exploitable', mitigado: 'Mitigated' },
};
const KIND: Record<Lang, Record<FindingKind, string>> = {
  es: { cve: 'CVE', configuracion: 'Configuración', identidad: 'Identidad' },
  en: { cve: 'CVE', configuracion: 'Configuration', identidad: 'Identity' },
};
const ASSET_TYPE: Record<Lang, Record<AssetType, string>> = {
  es: {
    servidor: 'Servidor', estacion: 'Estaciones', aplicacion_web: 'Aplicación web', base_datos: 'Base de datos',
    controlador_dominio: 'Controlador de dominio', pki: 'PKI / ADCS', perimetro: 'Perímetro', nube: 'Nube', identidad: 'Identidad',
  },
  en: {
    servidor: 'Server', estacion: 'Workstations', aplicacion_web: 'Web application', base_datos: 'Database',
    controlador_dominio: 'Domain controller', pki: 'PKI / ADCS', perimetro: 'Perimeter', nube: 'Cloud', identidad: 'Identity',
  },
};
export const statusLabel = (s: FindingStatus) => STATUS[LANG][s];
export const kindLabel = (k: FindingKind) => KIND[LANG][k];
export const assetTypeLabel = (t: AssetType) => ASSET_TYPE[LANG][t];
/** @deprecated Usa statusLabel/kindLabel/assetTypeLabel, que siguen el idioma activo. */
export const STATUS_LABEL = STATUS.es;
export const KIND_LABEL = KIND.es;
export const ASSET_TYPE_LABEL = ASSET_TYPE.es;
export const pct = (x: number | null | undefined) => (x == null ? '—' : `${(Math.round(x * 1000) / 10).toLocaleString(locale())}\u00a0%`);
export const n1 = (x: number) => x.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Fecha larga en el idioma activo (p. ej. «8 de octubre de 2026» / «8 October 2026»). */
export const longDate = (d: Date) => d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString(locale())} ${n === 1 ? one : many}`;

/** ¿La IPv4 (o el CIDR) cae dentro del CIDR IPv4? (comprobación sencilla para avisos de alcance) */
export function ipv4InCidr(ipOrCidr: string, cidr: string): boolean | null {
  const toInt = (s: string) => {
    const p = s.split('.').map(Number);
    if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  };
  const [ip, ipBits] = ipOrCidr.split('/');
  const [net, bitsS] = cidr.split('/');
  const a = toInt(ip), b = toInt(net);
  if (a === null || b === null) return null;
  const bits = bitsS === undefined ? 32 : Number(bitsS);
  if (!(bits >= 0 && bits <= 32)) return null;
  if (ipBits !== undefined && Number(ipBits) < bits) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

/** Parte el nombre en dos líneas por palabras; la segunda se recorta con «…» si no cabe. */
export function wrapLabel(label: string, max: number): [string, string] {
  if (label.length <= max) return [label, ''];
  const words = label.split(/\s+/);
  let first = '';
  while (words.length && (first ? `${first} ${words[0]}` : words[0]).length <= max) first = first ? `${first} ${words.shift()}` : words.shift()!;
  if (!first) { first = label.slice(0, max - 1) + '-'; words.splice(0, words.length, label.slice(max - 1)); }
  const rest = words.join(' ');
  return [first, rest.length > max ? `${rest.slice(0, max - 1)}…` : rest];
}
