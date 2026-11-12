/* Cifrado del proyecto (1.4.0). WebCrypto del navegador, sin dependencias:
 * - Clave: PBKDF2-SHA-256 sobre la frase de paso, 600.000 iteraciones (recomendación de OWASP para 2023) y una sal
 *   aleatoria de 16 bytes. La clave es AES-256 y no se puede extraer (ni la página la puede leer).
 * - Cifra: AES-256-GCM con un IV aleatorio de 12 bytes en cada cifrado. GCM autentica: con una frase equivocada, o
 *   con un solo byte cambiado, descifrar falla en vez de dar basura.
 * - Sobre: lo que se guarda o se exporta. Solo lleva los parámetros (algoritmos, iteraciones, sal, IV) y el texto
 *   cifrado: ni el nombre del proyecto ni recuentos, para no filtrar nada.
 * Sin DOM: se prueba en Node (que trae la misma WebCrypto). */

export const FORMATO_CIFRADO = 'ctem-nexus-cifrado';
export const ITERACIONES = 600_000;
const ALGORITMO_KDF = 'PBKDF2-SHA-256';
const ALGORITMO = 'AES-256-GCM';

export interface Kdf { alg: typeof ALGORITMO_KDF; iter: number; sal: string }
/** Sobre con los datos en binario (IndexedDB guarda el ArrayBuffer tal cual). */
export interface SobreBinario { format: typeof FORMATO_CIFRADO; version: 1; kdf: Kdf; cifra: typeof ALGORITMO; iv: string; datos: ArrayBuffer }
/** Sobre para un fichero: los datos en base64. */
export interface SobreTexto { format: typeof FORMATO_CIFRADO; version: 1; kdf: Kdf; cifra: typeof ALGORITMO; iv: string; datos: string }

/** Clave en memoria: la CryptoKey (no extraíble) y los parámetros con que se derivó. */
export interface Clave { key: CryptoKey; kdf: Kdf }

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Este navegador no tiene WebCrypto: no se puede cifrar.');
  return s;
};

export function aBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function deBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const aleatorio = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** Deriva la clave AES de la frase. Sin sal, crea una nueva (activar el cifrado o cambiar la frase). */
export async function derivarClave(frase: string, kdf?: Kdf): Promise<Clave> {
  const params: Kdf = kdf ?? { alg: ALGORITMO_KDF, iter: ITERACIONES, sal: aBase64(aleatorio(16)) };
  if (params.alg !== ALGORITMO_KDF || !Number.isInteger(params.iter) || params.iter < 100_000 || params.iter > 10_000_000) throw new Error('Parámetros de cifrado no admitidos.');
  const base = await subtle().importKey('raw', new TextEncoder().encode(frase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deBase64(params.sal) as BufferSource, iterations: params.iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
  return { key, kdf: params };
}

export async function cifrar(datos: Uint8Array | ArrayBuffer, clave: Clave): Promise<SobreBinario> {
  const iv = aleatorio(12);
  const cifrado = await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, clave.key, datos as BufferSource);
  return { format: FORMATO_CIFRADO, version: 1, kdf: clave.kdf, cifra: ALGORITMO, iv: aBase64(iv), datos: cifrado };
}

/** Descifra. Con otra frase o un sobre manipulado, lanza «frase incorrecta o fichero alterado». */
export async function descifrar(sobre: SobreBinario | SobreTexto, clave: Clave): Promise<Uint8Array> {
  const datos = typeof sobre.datos === 'string' ? deBase64(sobre.datos) : new Uint8Array(sobre.datos);
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv) as BufferSource }, clave.key, datos as BufferSource));
  } catch {
    throw Object.assign(new Error('La frase de paso no es correcta, o el fichero se ha alterado.'), { name: 'FraseIncorrecta' });
  }
}

export const aTexto = (s: SobreBinario): SobreTexto => ({ ...s, datos: aBase64(new Uint8Array(s.datos)) });

/** ¿Es un sobre cifrado de CTEM-Nexus (binario o de fichero), con sus campos bien formados? */
export function esSobreCifrado(x: unknown): x is SobreBinario | SobreTexto {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const kdf = o.kdf as Record<string, unknown> | undefined;
  return o.format === FORMATO_CIFRADO && o.version === 1 && o.cifra === ALGORITMO && typeof o.iv === 'string'
    && !!kdf && kdf.alg === ALGORITMO_KDF && typeof kdf.iter === 'number' && typeof kdf.sal === 'string'
    && (typeof o.datos === 'string' || o.datos instanceof ArrayBuffer);
}

export const MIN_FRASE = 12;

/** Fuerza orientativa de la frase (0 a 4), sin diccionarios: longitud y variedad. Lo que importa de verdad es la longitud. */
export function fuerzaFrase(frase: string): 0 | 1 | 2 | 3 | 4 {
  const f = frase.normalize('NFC');
  if (f.length < MIN_FRASE) return 0;
  const clases = [/[a-záéíóúñü]/, /[A-ZÁÉÍÓÚÑÜ]/, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(f)).length;
  const palabras = f.trim().split(/\s+/).length;
  const unicos = new Set(f).size;
  if (unicos < 6) return 1;
  let p = f.length >= 20 ? 3 : f.length >= 16 ? 2 : 1;
  if (clases >= 3 || palabras >= 4) p++;
  return Math.min(4, p) as 1 | 2 | 3 | 4;
}
