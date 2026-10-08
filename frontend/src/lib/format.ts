import type { AssetType, Band, FindingKind, FindingStatus } from '../engine/types';

export const BAND_COLOR: Record<Band, string> = {
  critica: 'var(--color-critica)', alta: 'var(--color-alta)', media: 'var(--color-media)', baja: 'var(--color-baja)',
};
export const STATUS_LABEL: Record<FindingStatus, string> = {
  abierto: 'Abierto', validado: 'Validado', no_explotable: 'No explotable', mitigado: 'Mitigado',
};
export const KIND_LABEL: Record<FindingKind, string> = { cve: 'CVE', configuracion: 'Configuración', identidad: 'Identidad' };
export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  servidor: 'Servidor', estacion: 'Estaciones', aplicacion_web: 'Aplicación web', base_datos: 'Base de datos',
  controlador_dominio: 'Controlador de dominio', pki: 'PKI / ADCS', perimetro: 'Perímetro', nube: 'Nube', identidad: 'Identidad',
};
export const pct = (x: number | null | undefined) => (x == null ? '—' : `${(Math.round(x * 1000) / 10).toLocaleString('es-ES')}\u00a0%`);
export const n1 = (x: number) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

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
