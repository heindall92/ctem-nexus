/* Persistencia del proyecto en IndexedDB.
 *
 * Hasta la 1.2.1 el proyecto iba en localStorage, que tiene un tope de unos 5 MB por origen: un Nessus mediano
 * (6.000 hallazgos) lo superaba, el guardado fallaba en silencio y al recargar no quedaba nada. IndexedDB admite
 * cientos de MB y guarda el objeto tal cual (clonado estructurado), sin pasar por JSON.
 *
 * Sin dependencias y sin DOM: se prueba en Node con fake-indexeddb. Los ajustes siguen en localStorage. */

export const DB_NOMBRE = 'ctem-nexus';
export const DB_VERSION = 1;
const ALMACEN = 'datos';
const CLAVE_PROYECTO = 'proyecto';

/** Dónde vive el proyecto: IndexedDB (normal), localStorage (navegador sin IndexedDB) o memoria (nada persiste). */
export type Almacen = 'indexeddb' | 'local' | 'memoria';

export interface EstadoGuardado {
  /** cargando: aún no se ha leído lo guardado; guardando: hay cambios en cola; error: el último intento falló. */
  estado: 'cargando' | 'guardado' | 'guardando' | 'error';
  almacen: Almacen;
  /** Fecha ISO del último guardado correcto. */
  en: string | null;
  /** Motivo legible del último fallo. */
  motivo?: string;
  /** El navegador ha concedido almacenamiento persistente (no lo borra por falta de espacio). */
  persistente?: boolean;
}

type Fabrica = Pick<IDBFactory, 'open'>;
const fabrica = (): Fabrica | null => {
  try { return (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? null; } catch { return null; }
};

let conexion: Promise<IDBDatabase> | null = null;

/** Abre (y crea si hace falta) la base de datos. Rechaza si el navegador no tiene IndexedDB o la bloquea. */
export function abrir(idb: Fabrica | null = fabrica()): Promise<IDBDatabase> {
  if (conexion) return conexion;
  if (!idb) return Promise.reject(new Error('IndexedDB no disponible'));
  conexion = new Promise<IDBDatabase>((ok, ko) => {
    let pet: IDBOpenDBRequest;
    try { pet = idb.open(DB_NOMBRE, DB_VERSION); } catch (e) { ko(e); return; }
    pet.onupgradeneeded = () => { if (!pet.result.objectStoreNames.contains(ALMACEN)) pet.result.createObjectStore(ALMACEN); };
    pet.onsuccess = () => {
      const db = pet.result;
      // Si otra pestaña actualiza la versión, se cierra esta conexión y la próxima operación abre otra.
      db.onversionchange = () => { db.close(); conexion = null; };
      ok(db);
    };
    pet.onerror = () => ko(pet.error ?? new Error('No se pudo abrir IndexedDB'));
    pet.onblocked = () => ko(new Error('IndexedDB bloqueada por otra pestaña'));
  });
  conexion.catch(() => { conexion = null; });
  return conexion;
}

/** Cierra la conexión (pruebas y borrado completo). */
export async function cerrar(): Promise<void> {
  if (!conexion) return;
  try { (await conexion).close(); } catch { /* ya cerrada */ }
  conexion = null;
}

function operacion<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return abrir().then((db) => new Promise<T>((ok, ko) => {
    let resultado: T;
    const tx = db.transaction(ALMACEN, modo);
    const pet = fn(tx.objectStore(ALMACEN));
    if (pet) pet.onsuccess = () => { resultado = pet.result as T; };
    // Se resuelve al terminar la transacción, no la petición: solo entonces está escrito de verdad.
    tx.oncomplete = () => ok(resultado);
    tx.onerror = () => ko(tx.error ?? new Error('Error de IndexedDB'));
    tx.onabort = () => ko(tx.error ?? new Error('Transacción cancelada'));
  }));
}

export const leerProyecto = (): Promise<unknown> => operacion<unknown>('readonly', (s) => s.get(CLAVE_PROYECTO)).then((v) => v ?? null);
export const escribirProyecto = (proyecto: unknown): Promise<void> => operacion<void>('readwrite', (s) => s.put(proyecto, CLAVE_PROYECTO));
export const borrarProyecto = (): Promise<void> => operacion<void>('readwrite', (s) => s.delete(CLAVE_PROYECTO));

/** Explicación de un fallo de guardado, sin jerga. */
export function motivoDe(e: unknown, lang: 'es' | 'en' = 'es'): string {
  const nombre = (e as { name?: string } | null)?.name ?? '';
  const msg = (e as { message?: string } | null)?.message ?? String(e ?? '');
  if (nombre === 'QuotaExceededError' || /quota/i.test(msg)) {
    return lang === 'en' ? 'the browser has no storage space left for this site' : 'el navegador no tiene más espacio para esta web';
  }
  if (/no disponible|not available/i.test(msg)) {
    return lang === 'en' ? 'this browser does not allow saving data here (private mode or blocked storage)' : 'este navegador no permite guardar datos aquí (modo privado o almacenamiento bloqueado)';
  }
  if (/bloqueada|blocked/i.test(msg)) {
    return lang === 'en' ? 'another tab with CTEM-Nexus is blocking the storage' : 'otra pestaña con CTEM-Nexus está bloqueando el almacenamiento';
  }
  return lang === 'en' ? `storage error (${nombre || msg})` : `error del almacenamiento (${nombre || msg})`;
}

/** Pide almacenamiento persistente: el navegador no lo borrará al quedarse sin espacio. */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    const sm = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage;
    if (!sm?.persist) return false;
    if (sm.persisted && (await sm.persisted())) return true;
    return await sm.persist();
  } catch { return false; }
}

/** Uso y cuota del almacenamiento del sitio, si el navegador lo dice. */
export async function espacio(): Promise<{ usado: number; cuota: number } | null> {
  try {
    const sm = (globalThis as { navigator?: { storage?: StorageManager } }).navigator?.storage;
    if (!sm?.estimate) return null;
    const e = await sm.estimate();
    return typeof e.usage === 'number' && typeof e.quota === 'number' ? { usado: e.usage, cuota: e.quota } : null;
  } catch { return null; }
}
