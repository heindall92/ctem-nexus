/* Almacenamiento: localStorage con caída a memoria (modo privado, cuota agotada o file:// restringido). */
import { safeJsonParse } from '../engine/io';

const memory = new Map<string, string>();
let backend: 'local' | 'memoria' = 'memoria';

try {
  const k = '__ctem_test__';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
  backend = 'local';
} catch {
  backend = 'memoria';
}

export const storageBackend = () => backend;

export function load<T>(key: string): T | null {
  try {
    const raw = backend === 'local' ? window.localStorage.getItem(key) : memory.get(key) ?? null;
    return raw ? safeJsonParse<T>(raw) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): boolean {
  const raw = JSON.stringify(value);
  try {
    if (backend === 'local') window.localStorage.setItem(key, raw);
    else memory.set(key, raw);
    return true;
  } catch {
    backend = 'memoria';
    memory.set(key, raw);
    return false;
  }
}

export function remove(key: string): void {
  try { if (backend === 'local') window.localStorage.removeItem(key); } catch { /* sin acceso */ }
  memory.delete(key);
}
