/* Estado de la aplicación (zustand). El proyecto se guarda en IndexedDB (lib/persistencia.ts) y los ajustes en
 * localStorage; si no hay IndexedDB, el proyecto vuelve a localStorage y, si tampoco, se queda en memoria con aviso. */
import { create } from 'zustand';
import { DEMO_ANCHOR, DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS, DEMO_RANGES } from '../data/demo';
import { daysBetween, shiftDate } from '../engine/sla';
import { acceptRisk, expireExceptions, isoDay, revokeRisk, type ExceptionInput } from '../engine/exceptions';
import { statusForValidation, withStatus, type Validation } from '../engine/retest';
import { applyIntel, type EpssCatalog, type IntelMeta, type KevCatalog } from '../engine/intel';
import { MAX_ECO_LOG, MAX_IMPORTS, MAX_SNAPSHOTS, type EcoLog, type EnsLink, type ImportLog, type Project, type RosettaLinkData, type Snapshot } from '../engine/io';
import type { ImportPlan } from '../engine/merge';
import type { Asset, Finding, FindingStatus, ManualEdge, NetworkRange, ProfileId, SlaPolicy } from '../engine/types';
import { setFormatLang } from '../lib/format';
import { load, remove, save, storageBackend } from '../lib/storage';
import { borrarProyecto, escribirProyecto, leerProyecto, motivoDe, pedirPersistencia, type Almacen, type EstadoGuardado } from '../lib/persistencia';

export type View = 'panel' | 'alcance' | 'priorizacion' | 'rutas' | 'mitre' | 'simulacion' | 'movilizacion' | 'ecosistema' | 'ajustes';

export type Accent = 'rosa' | 'solar' | 'glaciar' | 'orquidea' | 'verde' | 'azul' | 'rojo';
export const ACCENT_IDS: Accent[] = ['rosa', 'solar', 'glaciar', 'orquidea', 'verde', 'azul', 'rojo'];
export interface Profile { nombre: string; rol: string; organizacion: string; correo: string }
export interface Settings { useApi: boolean; apiUrl: string; theme?: 'dark' | 'light' | 'system'; lang?: 'es' | 'en'; accent?: Accent; profile?: Profile }

export interface Toast { id: number; text: string; tone: 'ok' | 'error' | 'info' }

interface Persisted { project: Project; settings: Settings }

interface State extends Persisted {
  /** Estado del guardado del proyecto: nunca falla en silencio. */
  guardado: EstadoGuardado;
  /** Vuelve a intentar guardar el proyecto tras un error. */
  reintentarGuardado: () => void;
  view: View;
  toasts: Toast[];
  selectedFinding: string | null;
  /** Técnica ATT&CK que la matriz debe abrir al entrar (desde la ficha de un hallazgo). */
  focusTechnique: string | null;
  /** Borrador de la simulación «¿y si…?»: hallazgos que se dan por corregidos (no se guarda en el proyecto). */
  simFixed: string[];
  setSimFixed: (ids: string[]) => void;
  setFocusTechnique: (id: string | null) => void;
  sidebarCollapsed: boolean;
  helpOpen: boolean;
  searchOpen: boolean;
  theme: 'dark' | 'light' | 'system';
  lang: 'es' | 'en';
  accent: Accent;
  setView: (v: View) => void;
  toggleSidebar: () => void;
  setHelpOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setLang: (lang: 'es' | 'en') => void;
  setAccent: (accent: Accent) => void;
  notify: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
  selectFinding: (id: string | null) => void;
  setName: (name: string) => void;
  upsertAsset: (a: Asset) => void;
  addAssets: (as: Asset[]) => void;
  deleteAsset: (id: string) => void;
  upsertRange: (r: NetworkRange) => void;
  addRanges: (rs: NetworkRange[]) => void;
  deleteRange: (id: string) => void;
  upsertFinding: (f: Finding) => void;
  addFindings: (fs: Finding[]) => void;
  importNmapResult: (data: { assets?: Asset[]; findings?: Finding[]; ranges?: NetworkRange[]; edges?: ManualEdge[] }) => void;
  deleteFinding: (id: string) => void;
  setStatus: (id: string, status: FindingStatus) => void;
  /** Guarda la evidencia de validación y ajusta el estado (explotado → validado; si no, no explotable). */
  recordValidation: (id: string, v: Validation) => void;
  /** El analista confirma que la corrección de un mitigado está verificada. */
  confirmRetest: (id: string, by: string) => void;
  toggleStep: (findingId: string, step: number) => void;
  addEdge: (e: ManualEdge) => void;
  deleteEdge: (id: string) => void;
  loadDemo: () => void;
  startFresh: () => void;
  replaceProject: (p: Project) => void;
  reset: () => void;
  setSettings: (s: Partial<Settings>) => void;
  /** Incorpora un plan de importación de escáner (activos nuevos, hallazgos nuevos y actualizados) y lo registra. */
  applyImport: (plan: ImportPlan, file: string) => void;
  /** Aplica catálogos KEV/EPSS; devuelve cuántos hallazgos cambian. */
  applyIntelCatalogs: (intel: { kev?: KevCatalog | null; epss?: EpssCatalog | null }) => { kevAdded: string[]; epssUpdated: string[]; epssMissing: number };
  setProfile: (p: ProfileId) => void;
  acceptRisk: (id: string, input: ExceptionInput) => void;
  revokeRisk: (id: string) => void;
  /** Guarda una instantánea de cierre de ciclo (sustituye la del mismo día). */
  addSnapshot: (snap: Snapshot) => void;
  deleteSnapshot: (at: string) => void;
  setSlaPolicy: (p: SlaPolicy) => void;
  /** Sustituye los activos (criticidad desde KAIROS, responsables desde Norvik) y registra el intercambio. */
  replaceAssets: (assets: Asset[], log: Omit<EcoLog, 'at'>) => void;
  linkEns: (ens: Omit<EnsLink, 'at'> | null, policy: SlaPolicy, log: Omit<EcoLog, 'at'> | null) => void;
  linkRosetta: (r: Omit<RosettaLinkData, 'at'> | null, log: Omit<EcoLog, 'at'> | null) => void;
  logEco: (log: Omit<EcoLog, 'at'>) => void;
}

/** Hasta la 1.2.1, proyecto y ajustes iban juntos en esta clave de localStorage. Hoy solo se lee para migrar
 * (y como respaldo del proyecto si el navegador no tiene IndexedDB). */
const KEY = 'ctem-nexus:v1';
/** Ajustes (tema, idioma, acento, perfil): pequeños, siguen en localStorage para pintar el primer fotograma bien. */
const KEY_AJUSTES = 'ctem-nexus:ajustes';
const emptyProject = (): Project => ({ format: 'ctem-nexus', version: 1, name: 'Mi organización', demo: false, assets: [], ranges: [], findings: [], edges: [] });
export const demoProject = (today: Date = new Date()): Project => {
  const offset = daysBetween(new Date(`${DEMO_ANCHOR}T00:00:00Z`), today);
  const findings = structuredClone(DEMO_FINDINGS).map((f) => ({
    ...f,
    detectedAt: shiftDate(f.detectedAt, offset) ?? undefined,
    resolvedAt: shiftDate(f.resolvedAt, offset),
    ...(f.exception ? { exception: { ...f.exception, expires: shiftDate(f.exception.expires, offset)!, approvedAt: shiftDate(f.exception.approvedAt, offset)! } } : {}),
  }));
  return {
    format: 'ctem-nexus', version: 1, name: 'Ejemplo · Industrias Meridiano S.A.', demo: true,
    assets: structuredClone(DEMO_ASSETS), ranges: structuredClone(DEMO_RANGES), findings, edges: structuredClone(DEMO_EDGES),
  };
};
const defaults: Settings = { useApi: false, apiUrl: 'http://127.0.0.1:8000', theme: 'dark', lang: 'es', accent: 'azul', profile: { nombre: '', rol: '', organizacion: '', correo: '' } };

const legado = load<Partial<Persisted>>(KEY);
const stored: Partial<Persisted> | null = { settings: load<Settings>(KEY_AJUSTES) ?? legado?.settings, project: legado?.project };
const today = () => isoDay(new Date());
const esProyecto = (p: unknown): p is Project => !!p && typeof p === 'object' && (p as Project).format === 'ctem-nexus';
// Primer fotograma: el proyecto de localStorage si lo hay (formato antiguo); el de IndexedDB llega al hidratar.
const storedProject = esProyecto(stored?.project) ? { ...emptyProject(), ...stored.project } : emptyProject();
const expiredAtStart = expireExceptions(storedProject.findings, today());
const initial: Persisted = {
  project: expiredAtStart.expired.length ? { ...storedProject, findings: expiredAtStart.findings } : storedProject,
  settings: {
    ...defaults,
    ...(stored?.settings ?? {}),
    profile: {
      nombre: stored?.settings?.profile?.nombre ?? '',
      rol: stored?.settings?.profile?.rol ?? '',
      organizacion: stored?.settings?.profile?.organizacion ?? '',
      correo: stored?.settings?.profile?.correo ?? '',
    },
  },
};

export const applyTheme = (theme: 'dark' | 'light' | 'system') => {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
};

export const applyChrome = (theme: 'dark' | 'light' | 'system', accent: Accent) => {
  applyTheme(theme);
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', ACCENT_IDS.includes(accent) ? accent : 'azul');
};

const initialAccent: Accent = ACCENT_IDS.includes(initial.settings.accent as Accent) ? (initial.settings.accent as Accent) : 'azul';
applyChrome(initial.settings.theme ?? 'dark', initialAccent);
setFormatLang(initial.settings.lang === 'en' ? 'en' : 'es');
if (typeof document !== 'undefined') document.documentElement.lang = initial.settings.lang === 'en' ? 'en' : 'es';

let toastId = 0;
const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export const useStore = create<State>()((set, get) => ({
  ...initial,
  guardado: { estado: 'cargando', almacen: 'indexeddb', en: null },
  reintentarGuardado: () => { programarGuardado(0); },
  view: 'panel' as View,
  toasts: [],
  selectedFinding: null,
  focusTechnique: null,
  simFixed: [],
  setSimFixed: (simFixed) => set({ simFixed }),
  setFocusTechnique: (focusTechnique) => set({ focusTechnique }),
  theme: initial.settings.theme ?? 'dark',
  lang: initial.settings.lang ?? 'es',
  accent: initialAccent,
  sidebarCollapsed: false,
  helpOpen: typeof window !== 'undefined' && window.location.hash === '#ayuda',
  searchOpen: false,
  setView: (view) => set({ view, selectedFinding: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setHelpOpen: (helpOpen) => {
    if (typeof window !== 'undefined') {
      if (helpOpen) window.history.replaceState(null, '', '#ayuda');
      else if (window.location.hash === '#ayuda') window.history.replaceState(null, '', window.location.pathname);
    }
    set({ helpOpen });
  },
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setTheme: (theme) => {
    applyChrome(theme, get().accent);
    set((s) => ({ theme, settings: { ...s.settings, theme } }));
  },
  setLang: (lang) => {
    setFormatLang(lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    // Los avisos pendientes están en el idioma anterior: se descartan.
    set((s) => ({ lang, settings: { ...s.settings, lang }, toasts: [] }));
  },
  setAccent: (accent) => {
    applyChrome(get().theme, accent);
    set((s) => ({ accent, settings: { ...s.settings, accent } }));
  },
  notify: (text, tone = 'ok') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  selectFinding: (selectedFinding) => set({ selectedFinding }),
  setName: (name) => set((s) => ({ project: { ...s.project, name } })),
  upsertAsset: (a) => set((s) => ({ project: { ...s.project, assets: upsert(s.project.assets, a) } })),
  addAssets: (as) => set((s) => {
    let assets = s.project.assets;
    for (const a of as) assets = upsert(assets, a);
    return { project: { ...s.project, assets } };
  }),
  deleteAsset: (id) => set((s) => ({ project: { ...s.project, assets: s.project.assets.filter((a) => a.id !== id), edges: s.project.edges.filter((e) => e.from !== id && e.to !== id) } })),
  upsertRange: (r) => set((s) => ({ project: { ...s.project, ranges: upsert(s.project.ranges, r) } })),
  addRanges: (rs) => set((s) => {
    let ranges = s.project.ranges;
    for (const r of rs) ranges = upsert(ranges, r);
    return { project: { ...s.project, ranges } };
  }),
  deleteRange: (id) => set((s) => ({ project: { ...s.project, ranges: s.project.ranges.filter((r) => r.id !== id) } })),
  upsertFinding: (f) => set((s) => ({ project: { ...s.project, findings: upsert(s.project.findings, f) } })),
  addFindings: (fs) => set((s) => {
    let findings = s.project.findings;
    for (const f of fs) findings = upsert(findings, f);
    return { project: { ...s.project, findings } };
  }),
  importNmapResult: (data) => set((s) => {
    let assets = s.project.assets;
    for (const a of data.assets ?? []) assets = upsert(assets, a);
    let findings = s.project.findings;
    for (const f of data.findings ?? []) findings = upsert(findings, f);
    let ranges = s.project.ranges;
    for (const r of data.ranges ?? []) ranges = upsert(ranges, r);
    let edges = s.project.edges;
    for (const e of data.edges ?? []) edges = upsert(edges, e);
    return { project: { ...s.project, assets, findings, ranges, edges } };
  }),
  deleteFinding: (id) => set((s) => ({ project: { ...s.project, findings: s.project.findings.filter((f) => f.id !== id) }, selectedFinding: null })),
  setStatus: (id, status) => set((s) => ({
    project: { ...s.project, findings: s.project.findings.map((f) => (f.id === id ? withStatus(f, status, today()) : f)) },
  })),
  recordValidation: (id, v) => set((s) => ({
    project: { ...s.project, findings: s.project.findings.map((f) => (f.id === id ? { ...withStatus(f, statusForValidation(v.result), today()), validation: v } : f)) },
  })),
  confirmRetest: (id, by) => set((s) => ({
    project: { ...s.project, findings: s.project.findings.map((f) => (f.id === id && f.status === 'mitigado' ? { ...f, retest: { state: 'verificado' as const, since: f.retest?.since ?? today(), verifiedAt: today(), by } } : f)) },
  })),
  toggleStep: (findingId, step) => set((s) => {
    const cur = s.project.progress?.[findingId] ?? [];
    const next = cur.includes(step) ? cur.filter((n) => n !== step) : [...cur, step].sort((a, b) => a - b);
    return { project: { ...s.project, progress: { ...(s.project.progress ?? {}), [findingId]: next } } };
  }),
  addEdge: (e) => set((s) => ({ project: { ...s.project, edges: [...s.project.edges, e] } })),
  deleteEdge: (id) => set((s) => ({ project: { ...s.project, edges: s.project.edges.filter((e) => e.id !== id) } })),
  loadDemo: () => set({ project: demoProject(), selectedFinding: null, simFixed: [] }),
  startFresh: () => set({ project: { ...emptyProject(), name: 'Nuevo análisis de exposición' }, selectedFinding: null, simFixed: [], view: 'alcance' }),
  replaceProject: (project) => {
    const { findings, expired } = expireExceptions(project.findings, today());
    set({ project: expired.length ? { ...project, findings } : project, selectedFinding: null, simFixed: [] });
    if (expired.length) get().notify(expiredText(expired, get().lang), 'info');
  },
  reset: () => {
    remove(KEY);
    if (almacen === 'indexeddb') void borrarProyecto().catch(() => {});
    set({ project: emptyProject(), selectedFinding: null, simFixed: [] });
  },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  applyImport: (plan, file) => set((s) => {
    let assets = s.project.assets;
    for (const a of plan.newAssets) assets = upsert(assets, a);
    let findings = s.project.findings;
    for (const f of [...plan.updatedFindings, ...plan.newFindings]) findings = upsert(findings, f);
    const verified = new Set(plan.verifiedIds ?? []);
    if (verified.size) findings = findings.map((f) => (verified.has(f.id) && f.retest ? { ...f, retest: { ...f.retest, state: 'verificado' as const, verifiedAt: today(), by: plan.tool.slice(0, 60) } } : f));
    const log: ImportLog = {
      at: today(), source: plan.source, tool: plan.tool.slice(0, 80), file: file.slice(0, 120),
      newAssets: plan.newAssets.length, newFindings: plan.newFindings.length, updated: plan.updatedFindings.length, reopened: plan.reopened,
      ...(verified.size ? { verified: verified.size } : {}),
    };
    return { project: { ...s.project, assets, findings, imports: [log, ...(s.project.imports ?? [])].slice(0, MAX_IMPORTS) } };
  }),
  applyIntelCatalogs: (intel) => {
    const r = applyIntel(get().project.findings, intel);
    const at = today();
    const meta: IntelMeta = { ...(get().project.intel ?? {}) };
    if (intel.kev) meta.kev = { version: intel.kev.version, released: intel.kev.released, count: intel.kev.count, importedAt: at };
    if (intel.epss) meta.epss = { model: intel.epss.model, scoreDate: intel.epss.scoreDate, count: intel.epss.count, importedAt: at };
    set((s) => ({ project: { ...s.project, findings: r.findings, intel: meta } }));
    return { kevAdded: r.kevAdded, epssUpdated: r.epssUpdated, epssMissing: r.epssMissing };
  },
  setProfile: (profile) => set((s) => ({ project: { ...s.project, profile } })),
  acceptRisk: (id, input) => set((s) => ({ project: { ...s.project, findings: s.project.findings.map((f) => (f.id === id ? acceptRisk(f, input, today()) : f)) } })),
  revokeRisk: (id) => set((s) => ({ project: { ...s.project, findings: s.project.findings.map((f) => (f.id === id ? revokeRisk(f) : f)) } })),
  addSnapshot: (snap) => set((s) => ({
    project: { ...s.project, snapshots: [...(s.project.snapshots ?? []).filter((x) => x.at !== snap.at), snap].sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_SNAPSHOTS) },
  })),
  deleteSnapshot: (at) => set((s) => ({ project: { ...s.project, snapshots: (s.project.snapshots ?? []).filter((x) => x.at !== at) } })),
  setSlaPolicy: (slaPolicy) => set((s) => ({ project: { ...s.project, slaPolicy } })),
  replaceAssets: (assets, log) => set((s) => ({ project: withLog({ ...s.project, assets }, log) })),
  linkEns: (ens, slaPolicy, log) => set((s) => {
    const project: Project = { ...s.project, slaPolicy };
    if (ens) project.ens = { ...ens, at: today() }; else delete project.ens;
    return { project: log ? withLog(project, log) : project };
  }),
  linkRosetta: (r, log) => set((s) => {
    const project: Project = { ...s.project };
    if (r) project.rosetta = { ...r, at: today() }; else delete project.rosetta;
    return { project: log ? withLog(project, log) : project };
  }),
  logEco: (log) => set((s) => ({ project: withLog(s.project, log) })),
}));

const withLog = (p: Project, log: Omit<EcoLog, 'at'>): Project => ({ ...p, ecoLog: [{ ...log, at: today() }, ...(p.ecoLog ?? [])].slice(0, MAX_ECO_LOG) });

const expiredText = (ids: string[], lang: 'es' | 'en') => (lang === 'en'
  ? `${ids.length} risk acceptance${ids.length === 1 ? '' : 's'} expired and reopened: ${ids.join(', ')}.`
  : `${ids.length === 1 ? 'Ha caducado 1 aceptación de riesgo' : `Han caducado ${ids.length} aceptaciones de riesgo`} y ${ids.length === 1 ? 'vuelve' : 'vuelven'} a estar ${ids.length === 1 ? 'abierta' : 'abiertas'}: ${ids.join(', ')}.`);

if (expiredAtStart.expired.length) setTimeout(() => useStore.getState().notify(expiredText(expiredAtStart.expired, useStore.getState().lang), 'info'), 600);

// ─────────────────────────── Persistencia ───────────────────────────
// Ajustes: localStorage, al momento. Proyecto: IndexedDB, agrupando escrituras y sin solapar dos a la vez.
// No se escribe el proyecto hasta haber leído lo guardado: si no, el proyecto vacío del arranque lo pisaría.

let almacen: Almacen = 'indexeddb';
let hidratado = false;
let cambiadoAlCargar = false;
let timerProyecto: ReturnType<typeof setTimeout> | undefined;
let escribiendo = false;
let otraVez = false;
let pidioPersistencia = false;
/** Mientras se aplica lo leído de IndexedDB, ese cambio no cuenta como edición (no se vuelve a escribir). */
let aplicandoLeido = false;
/** Hay un fallo de guardado sin resolver: se avisa una vez y se dice cuando se recupera. */
let fallando = false;

const ponerGuardado = (g: Partial<EstadoGuardado>) => useStore.setState((s) => ({ guardado: { ...s.guardado, ...g } }));

/** Agrupa los cambios rápidos (teclear, importar) en una sola escritura. */
export function programarGuardado(espera = 300): void {
  if (!hidratado) { cambiadoAlCargar = true; return; }
  if (almacen === 'memoria') return;
  // Con un fallo pendiente el estado sigue en «error» (el aviso no desaparece) hasta que un guardado salga bien.
  if (!fallando) ponerGuardado({ estado: 'guardando' });
  clearTimeout(timerProyecto);
  timerProyecto = setTimeout(() => { void guardarYa(); }, espera);
}

async function guardarYa(): Promise<void> {
  if (escribiendo) { otraVez = true; return; }
  escribiendo = true;
  const { project, lang } = useStore.getState();
  try {
    if (almacen === 'indexeddb') await escribirProyecto(project);
    else if (!save(KEY, { project })) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    const seRecupera = fallando;
    fallando = false;
    ponerGuardado({ estado: otraVez ? 'guardando' : 'guardado', en: new Date().toISOString(), motivo: undefined });
    if (seRecupera) useStore.getState().notify(lang === 'en' ? 'Project saved again.' : 'El proyecto vuelve a estar guardado.', 'ok');
    if (!project.demo && !pidioPersistencia) {
      pidioPersistencia = true;
      void pedirPersistencia().then((persistente) => ponerGuardado({ persistente }));
    }
  } catch (e) {
    const motivo = motivoDe(e, lang);
    const yaEstaba = fallando;
    fallando = true;
    ponerGuardado({ estado: 'error', motivo });
    if (!yaEstaba) {
      useStore.getState().notify(lang === 'en'
        ? `The project could not be saved: ${motivo}. Export it to keep your changes.`
        : `No se ha podido guardar el proyecto: ${motivo}. Expórtalo para no perder los cambios.`, 'error');
    }
  } finally {
    escribiendo = false;
    if (otraVez) { otraVez = false; void guardarYa(); }
  }
}

/** Lee el proyecto guardado (IndexedDB) y migra el del formato antiguo (localStorage). Exportado para las pruebas. */
export async function hidratar(): Promise<void> {
  try {
    const guardado = await leerProyecto();
    if (esProyecto(guardado) && !cambiadoAlCargar) {
      const base = { ...emptyProject(), ...guardado };
      const { findings, expired } = expireExceptions(base.findings, today());
      aplicandoLeido = true;
      try { useStore.setState({ project: expired.length ? { ...base, findings } : base }); } finally { aplicandoLeido = false; }
      if (expired.length) useStore.getState().notify(expiredText(expired, useStore.getState().lang), 'info');
    } else if (!esProyecto(guardado) && esProyecto(legado?.project)) {
      // Migración: el proyecto de localStorage pasa a IndexedDB y solo entonces se libera su espacio.
      await escribirProyecto(useStore.getState().project);
    }
    almacen = 'indexeddb';
    if (legado?.project) {
      remove(KEY);
      save(KEY_AJUSTES, useStore.getState().settings);
    }
    // Leer no es guardar: «hace N s» solo cuenta escrituras de verdad (la migración sí lo es).
    ponerGuardado({ estado: 'guardado', almacen, en: !esProyecto(guardado) && esProyecto(legado?.project) ? new Date().toISOString() : null });
    // Si caducaron aceptaciones al leer, el proyecto cambió: se guarda.
    if (esProyecto(guardado) && useStore.getState().project.findings !== guardado.findings && !cambiadoAlCargar) cambiadoAlCargar = true;
  } catch {
    // Sin IndexedDB (navegador antiguo, modo privado estricto): se sigue con localStorage como hasta la 1.2.1.
    almacen = storageBackend() === 'local' ? 'local' : 'memoria';
    const lang = useStore.getState().lang;
    ponerGuardado(almacen === 'memoria'
      ? { estado: 'error', almacen, motivo: motivoDe(new Error('no disponible'), lang) }
      : { estado: 'guardado', almacen, en: null });
  }
  hidratado = true;
  if (cambiadoAlCargar) programarGuardado(0);
}

useStore.subscribe((s, prev) => {
  if (s.settings !== prev.settings) save(KEY_AJUSTES, s.settings);
  if (s.project !== prev.project && !aplicandoLeido) programarGuardado();
});

if (typeof window !== 'undefined') void hidratar();

export const nextId = (prefix: string, ids: string[], pad = 3) => {
  let max = 0;
  for (const id of ids) { const m = id.match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
};
