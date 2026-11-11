/* Guardado del proyecto en IndexedDB: migración desde localStorage, recarga, edición durante la carga y fallos
 * visibles. En Node no hay IndexedDB: fake-indexeddb la implementa en memoria, una base nueva por prueba. */
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Finding } from '../engine/types';
import type { Project } from '../engine/io';

const KEY = 'ctem-nexus:v1';
const KEY_AJUSTES = 'ctem-nexus:ajustes';

const hallazgo = (i: number): Finding => ({
  id: `H-${i}`, title: `Hallazgo ${i}`, kind: 'cve', cve: `CVE-2025-${10000 + i}`, cvss: 7, epss: 0.1, kev: false, exploitPublic: false,
  assetId: 'A-1', status: 'abierto', remediation: 'generic', description: 'x'.repeat(400), evidence: 'y'.repeat(300), detectedAt: '2026-10-01',
});
const proyecto = (n: number, name = 'Proyecto de prueba'): Project => ({
  format: 'ctem-nexus', version: 1, name, demo: false, edges: [], ranges: [],
  assets: [{ id: 'A-1', name: 'Servidor', type: 'servidor', ip: '10.0.0.1', owner: 'TI', criticality: 3, internetExposed: false, tags: [] }],
  findings: Array.from({ length: n }, (_, i) => hallazgo(i)),
});
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Carga los módulos desde cero (estado, almacenamiento y conexión nuevos), con lo que haya en localStorage antes. */
async function arrancar(antes?: (s: typeof import('../lib/storage')) => void) {
  vi.resetModules();
  const storage = await import('../lib/storage');
  antes?.(storage);
  const persistencia = await import('../lib/persistencia');
  const store = await import('./store');
  return { storage, persistencia, store, useStore: store.useStore };
}

beforeEach(() => { (globalThis as { indexedDB?: IDBFactory }).indexedDB = new IDBFactory(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('persistencia en IndexedDB', () => {
  it('escribe, lee y borra el proyecto tal cual', async () => {
    const { persistencia: p } = await arrancar();
    expect(await p.leerProyecto()).toBeNull();
    const pr = proyecto(3);
    await p.escribirProyecto(pr);
    expect(await p.leerProyecto()).toEqual(pr);
    await p.borrarProyecto();
    expect(await p.leerProyecto()).toBeNull();
  });

  it('guarda un proyecto de 20.000 hallazgos (unos 20 MB: localStorage no pasa de 5)', async () => {
    const { persistencia: p } = await arrancar();
    const grande = proyecto(20000);
    expect(JSON.stringify(grande).length).toBeGreaterThan(15 * 1024 * 1024);
    await p.escribirProyecto(grande);
    expect(((await p.leerProyecto()) as Project).findings).toHaveLength(20000);
  });

  it('explica sin jerga por qué no se pudo guardar', async () => {
    const { persistencia: p } = await arrancar();
    expect(p.motivoDe(Object.assign(new Error('x'), { name: 'QuotaExceededError' }))).toBe('el navegador no tiene más espacio para esta web');
    expect(p.motivoDe(new Error('IndexedDB no disponible'), 'en')).toMatch(/^this browser does not allow saving data here/);
  });
});

describe('el estado guarda el proyecto y nunca falla en silencio', () => {
  it('migra el proyecto del formato antiguo (localStorage) a IndexedDB y libera su espacio', async () => {
    const viejo = proyecto(5, 'De la 1.2.1');
    const { storage, persistencia, store, useStore } = await arrancar((s) => s.save(KEY, { project: viejo, settings: { lang: 'en', accent: 'verde' } }));
    expect(useStore.getState().project.name).toBe('De la 1.2.1');   // primer fotograma, antes de leer IndexedDB
    expect(useStore.getState().guardado.estado).toBe('cargando');
    await store.hidratar();
    expect(((await persistencia.leerProyecto()) as Project).name).toBe('De la 1.2.1');
    expect(storage.load(KEY)).toBeNull();
    expect(storage.load<{ lang: string }>(KEY_AJUSTES)?.lang).toBe('en');
    expect(useStore.getState().guardado).toMatchObject({ estado: 'guardado', almacen: 'indexeddb' });
  });

  it('al recargar lee el proyecto de IndexedDB, sin reescribirlo', async () => {
    const primero = await arrancar();
    await primero.persistencia.escribirProyecto(proyecto(4, 'Guardado antes'));
    const { store, useStore } = await arrancar();
    const put = vi.spyOn(IDBObjectStore.prototype, 'put');
    await store.hidratar();
    await espera(400);
    expect(useStore.getState().project.name).toBe('Guardado antes');
    expect(useStore.getState().project.findings).toHaveLength(4);
    expect(put).not.toHaveBeenCalled();
    expect(useStore.getState().guardado.estado).toBe('guardado');
  });

  it('cada cambio se guarda agrupado, y el estado pasa por «guardando»', async () => {
    const { store, persistencia, useStore } = await arrancar();
    await store.hidratar();
    useStore.getState().setName('Uno');
    useStore.getState().setName('Dos');
    expect(useStore.getState().guardado.estado).toBe('guardando');
    await espera(450);
    expect(useStore.getState().guardado.estado).toBe('guardado');
    expect(useStore.getState().guardado.en).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(((await persistencia.leerProyecto()) as Project).name).toBe('Dos');
  });

  it('lo que cambias mientras carga no lo pisa lo guardado, y se guarda después', async () => {
    const primero = await arrancar();
    await primero.persistencia.escribirProyecto(proyecto(2, 'Viejo'));
    const { store, persistencia, useStore } = await arrancar();
    useStore.getState().replaceProject(proyecto(7, 'Importado al arrancar'));
    await store.hidratar();
    await espera(100);
    expect(useStore.getState().project.name).toBe('Importado al arrancar');
    expect(((await persistencia.leerProyecto()) as Project).name).toBe('Importado al arrancar');
  });

  it('sin espacio: estado «error», motivo y aviso; al reintentar con espacio, vuelve a «guardado» y lo dice', async () => {
    const { store, persistencia, useStore } = await arrancar();
    await store.hidratar();
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Cuota superada', 'QuotaExceededError'); });
    useStore.getState().replaceProject(proyecto(6000, 'Nessus grande'));
    await espera(450);
    expect(useStore.getState().guardado).toMatchObject({ estado: 'error', motivo: 'el navegador no tiene más espacio para esta web' });
    expect(useStore.getState().toasts.map((t) => [t.tone, t.text])).toContainEqual(['error', 'No se ha podido guardar el proyecto: el navegador no tiene más espacio para esta web. Expórtalo para no perder los cambios.']);
    // Un segundo fallo no repite el aviso.
    useStore.getState().setName('Otro nombre');
    await espera(450);
    expect(useStore.getState().toasts.filter((t) => t.tone === 'error')).toHaveLength(1);
    put.mockRestore();
    useStore.getState().reintentarGuardado();
    await espera(100);
    expect(useStore.getState().guardado.estado).toBe('guardado');
    expect(useStore.getState().toasts.map((t) => t.text)).toContain('El proyecto vuelve a estar guardado.');
    expect(((await persistencia.leerProyecto()) as Project).findings).toHaveLength(6000);
  });

  it('sin IndexedDB ni localStorage, el estado lo dice desde el principio (no se finge que se guarda)', async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    const { store, useStore } = await arrancar();
    await store.hidratar();
    expect(useStore.getState().guardado).toMatchObject({ estado: 'error', almacen: 'memoria', motivo: 'este navegador no permite guardar datos aquí (modo privado o almacenamiento bloqueado)' });
  });

  it('«Restablecer» borra también el proyecto de IndexedDB', async () => {
    const { store, persistencia, useStore } = await arrancar();
    await store.hidratar();
    useStore.getState().replaceProject(proyecto(3));
    await espera(450);
    useStore.getState().reset();
    await espera(50);
    expect(await persistencia.leerProyecto()).toBeNull();
  });
});
