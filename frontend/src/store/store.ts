/* Estado de la aplicación (zustand) con persistencia segura en localStorage / memoria. */
import { create } from 'zustand';
import { DEMO_ANCHOR, DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS, DEMO_RANGES } from '../data/demo';
import { daysBetween, shiftDate } from '../engine/sla';
import { acceptRisk, expireExceptions, isoDay, revokeRisk, type ExceptionInput } from '../engine/exceptions';
import { applyIntel, type EpssCatalog, type IntelMeta, type KevCatalog } from '../engine/intel';
import { MAX_IMPORTS, MAX_SNAPSHOTS, type ImportLog, type Project, type Snapshot } from '../engine/io';
import type { ImportPlan } from '../engine/merge';
import type { Asset, Finding, FindingStatus, ManualEdge, NetworkRange, ProfileId } from '../engine/types';
import { setFormatLang } from '../lib/format';
import { load, remove, save } from '../lib/storage';

export type View = 'panel' | 'alcance' | 'priorizacion' | 'rutas' | 'mitre' | 'simulacion' | 'movilizacion' | 'ajustes';

export type Accent = 'rosa' | 'solar' | 'glaciar' | 'orquidea' | 'verde' | 'azul' | 'rojo';
export const ACCENT_IDS: Accent[] = ['rosa', 'solar', 'glaciar', 'orquidea', 'verde', 'azul', 'rojo'];
export interface Profile { nombre: string; rol: string; organizacion: string; correo: string }
export interface Settings { useApi: boolean; apiUrl: string; theme?: 'dark' | 'light' | 'system'; lang?: 'es' | 'en'; accent?: Accent; profile?: Profile }

export interface Toast { id: number; text: string; tone: 'ok' | 'error' | 'info' }

interface Persisted { project: Project; settings: Settings }

interface State extends Persisted {
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
}

const KEY = 'ctem-nexus:v1';
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

const stored = load<Partial<Persisted>>(KEY);
const today = () => isoDay(new Date());
const storedProject = stored?.project && stored.project.format === 'ctem-nexus' ? { ...emptyProject(), ...stored.project } : emptyProject();
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
    project: {
      ...s.project,
      findings: s.project.findings.map((f) => (f.id === id ? { ...f, status, resolvedAt: status === 'mitigado' ? f.resolvedAt ?? new Date().toISOString().slice(0, 10) : null } : f)),
    },
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
  reset: () => { remove(KEY); set({ project: emptyProject(), selectedFinding: null, simFixed: [] }); },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  applyImport: (plan, file) => set((s) => {
    let assets = s.project.assets;
    for (const a of plan.newAssets) assets = upsert(assets, a);
    let findings = s.project.findings;
    for (const f of [...plan.updatedFindings, ...plan.newFindings]) findings = upsert(findings, f);
    const log: ImportLog = {
      at: today(), source: plan.source, tool: plan.tool.slice(0, 80), file: file.slice(0, 120),
      newAssets: plan.newAssets.length, newFindings: plan.newFindings.length, updated: plan.updatedFindings.length, reopened: plan.reopened,
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
}));

const expiredText = (ids: string[], lang: 'es' | 'en') => (lang === 'en'
  ? `${ids.length} risk acceptance${ids.length === 1 ? '' : 's'} expired and reopened: ${ids.join(', ')}.`
  : `${ids.length === 1 ? 'Ha caducado 1 aceptación de riesgo' : `Han caducado ${ids.length} aceptaciones de riesgo`} y ${ids.length === 1 ? 'vuelve' : 'vuelven'} a estar ${ids.length === 1 ? 'abierta' : 'abiertas'}: ${ids.join(', ')}.`);

if (expiredAtStart.expired.length) setTimeout(() => useStore.getState().notify(expiredText(expiredAtStart.expired, useStore.getState().lang), 'info'), 600);

// Persistencia: solo proyecto y ajustes, con un pequeño agrupado de escrituras.
let timer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project && s.settings === prev.settings) return;
  clearTimeout(timer);
  timer = setTimeout(() => save(KEY, { project: s.project, settings: s.settings }), 150);
});

export const nextId = (prefix: string, ids: string[], pad = 3) => {
  let max = 0;
  for (const id of ids) { const m = id.match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
};
