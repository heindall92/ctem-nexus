/* Estado de la aplicación (zustand) con persistencia segura en localStorage / memoria. */
import { create } from 'zustand';
import { DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS, DEMO_RANGES } from '../data/demo';
import type { Project } from '../engine/io';
import type { Asset, Finding, FindingStatus, ManualEdge, NetworkRange } from '../engine/types';
import { load, remove, save } from '../lib/storage';

export type View = 'panel' | 'alcance' | 'priorizacion' | 'rutas' | 'movilizacion' | 'ajustes';

export interface Settings { useApi: boolean; apiUrl: string }

export interface Toast { id: number; text: string; tone: 'ok' | 'error' | 'info' }

interface Persisted { project: Project; settings: Settings }

interface State extends Persisted {
  view: View;
  toasts: Toast[];
  selectedFinding: string | null;
  setView: (v: View) => void;
  notify: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
  selectFinding: (id: string | null) => void;
  setName: (name: string) => void;
  upsertAsset: (a: Asset) => void;
  deleteAsset: (id: string) => void;
  upsertRange: (r: NetworkRange) => void;
  deleteRange: (id: string) => void;
  upsertFinding: (f: Finding) => void;
  addFindings: (fs: Finding[]) => void;
  deleteFinding: (id: string) => void;
  setStatus: (id: string, status: FindingStatus) => void;
  addEdge: (e: ManualEdge) => void;
  deleteEdge: (id: string) => void;
  loadDemo: () => void;
  replaceProject: (p: Project) => void;
  reset: () => void;
  setSettings: (s: Partial<Settings>) => void;
}

const KEY = 'ctem-nexus:v1';
const emptyProject = (): Project => ({ format: 'ctem-nexus', version: 1, name: 'Mi organización', demo: false, assets: [], ranges: [], findings: [], edges: [] });
export const demoProject = (): Project => ({
  format: 'ctem-nexus', version: 1, name: 'Ejemplo · Industrias Meridiano S.A.', demo: true,
  assets: structuredClone(DEMO_ASSETS), ranges: structuredClone(DEMO_RANGES), findings: structuredClone(DEMO_FINDINGS), edges: structuredClone(DEMO_EDGES),
});
const defaults: Settings = { useApi: false, apiUrl: 'http://127.0.0.1:8000' };

const stored = load<Partial<Persisted>>(KEY);
const initial: Persisted = {
  project: stored?.project && stored.project.format === 'ctem-nexus' ? { ...emptyProject(), ...stored.project } : emptyProject(),
  settings: { ...defaults, ...(stored?.settings ?? {}) },
};

let toastId = 0;
const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export const useStore = create<State>()((set, get) => ({
  ...initial,
  view: 'panel',
  toasts: [],
  selectedFinding: null,
  setView: (view) => set({ view, selectedFinding: null }),
  notify: (text, tone = 'ok') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  selectFinding: (selectedFinding) => set({ selectedFinding }),
  setName: (name) => set((s) => ({ project: { ...s.project, name } })),
  upsertAsset: (a) => set((s) => ({ project: { ...s.project, assets: upsert(s.project.assets, a) } })),
  deleteAsset: (id) => set((s) => ({ project: { ...s.project, assets: s.project.assets.filter((a) => a.id !== id), edges: s.project.edges.filter((e) => e.from !== id && e.to !== id) } })),
  upsertRange: (r) => set((s) => ({ project: { ...s.project, ranges: upsert(s.project.ranges, r) } })),
  deleteRange: (id) => set((s) => ({ project: { ...s.project, ranges: s.project.ranges.filter((r) => r.id !== id) } })),
  upsertFinding: (f) => set((s) => ({ project: { ...s.project, findings: upsert(s.project.findings, f) } })),
  addFindings: (fs) => set((s) => {
    let findings = s.project.findings;
    for (const f of fs) findings = upsert(findings, f);
    return { project: { ...s.project, findings } };
  }),
  deleteFinding: (id) => set((s) => ({ project: { ...s.project, findings: s.project.findings.filter((f) => f.id !== id) }, selectedFinding: null })),
  setStatus: (id, status) => set((s) => ({
    project: {
      ...s.project,
      findings: s.project.findings.map((f) => (f.id === id ? { ...f, status, resolvedAt: status === 'mitigado' ? f.resolvedAt ?? new Date().toISOString().slice(0, 10) : null } : f)),
    },
  })),
  addEdge: (e) => set((s) => ({ project: { ...s.project, edges: [...s.project.edges, e] } })),
  deleteEdge: (id) => set((s) => ({ project: { ...s.project, edges: s.project.edges.filter((e) => e.id !== id) } })),
  loadDemo: () => set({ project: demoProject(), selectedFinding: null }),
  replaceProject: (project) => set({ project, selectedFinding: null }),
  reset: () => { remove(KEY); set({ project: emptyProject(), selectedFinding: null }); },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
}));

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
