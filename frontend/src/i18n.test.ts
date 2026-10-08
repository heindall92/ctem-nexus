/* Paridad de los diccionarios: toda clave (y forma de función) en español existe en inglés y al revés. */
import { describe, expect, it } from 'vitest';
import { chrome, ECOSYSTEM, screen } from './i18n';

const shape = (o: unknown): unknown =>
  typeof o === 'function' ? `fn/${o.length}` : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)]).sort()) : typeof o;

describe('textos ES/EN', () => {
  it('screen y chrome tienen las mismas claves y firmas en los dos idiomas', () => {
    expect(shape(screen.en)).toEqual(shape(screen.es));
    expect(shape(chrome.en)).toEqual(shape(chrome.es));
  });

  it('ningún texto en inglés está vacío ni se ha quedado en español', () => {
    const textos = (o: Record<string, unknown>): string[] => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? textos(v as Record<string, unknown>) : typeof v === 'function' ? [String((v as (...a: number[]) => string)(1, 2, 3))] : []));
    for (const t of [...textos(screen.en), ...textos(chrome.en)]) {
      expect(t.trim(), t).not.toBe('');
      expect(t, t).not.toMatch(/[áéíóúñ¿¡]/);
    }
  });

  it('cada herramienta del ecosistema tiene descripción en los dos idiomas', () => {
    for (const t of ECOSYSTEM) {
      expect(t.note.length).toBeGreaterThan(20);
      expect(t.noteEn.length).toBeGreaterThan(20);
      expect(t.noteEn).not.toMatch(/[áéíóúñ]/);
    }
  });
});
