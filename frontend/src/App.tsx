import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { MobileTabBar, Sidebar, Toasts } from './components/Shell';
import { AnalysisContext, useAnalysis } from './lib/analysis';
import { useStore, type View as ViewId } from './store/store';
import { Dashboard } from './views/Dashboard';

// Rendimiento: solo el panel va en el arranque; el resto de vistas (y sus importadores, el catálogo ATT&CK o la simulación)
// se cargan al abrirlas. En el HTML autocontenido todo sigue dentro del mismo fichero.
const loaders: Array<() => Promise<unknown>> = [];
const lazyView = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => {
  loaders.push(load);
  return lazy(() => load().then((m) => ({ default: m[name] })));
};
/** Tras el primer pintado, con el navegador libre, se precargan las demás vistas: la primera navegación ya no espera. */
function preloadViews() {
  const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const idle = (cb: () => void) => (ric ? ric(cb, { timeout: 2500 }) : setTimeout(cb, 1200));
  idle(() => { for (const l of loaders) void l().catch(() => undefined); });
}
const VIEWS: Record<ViewId, ComponentType> = {
  panel: Dashboard,
  alcance: lazyView(() => import('./views/Scoping'), 'Scoping'),
  priorizacion: lazyView(() => import('./views/Prioritization'), 'Prioritization'),
  rutas: lazyView(() => import('./views/AttackPaths'), 'AttackPaths'),
  movilizacion: lazyView(() => import('./views/Mobilization'), 'Mobilization'),
  mitre: lazyView(() => import('./views/MitreMatrix'), 'MitreMatrix'),
  simulacion: lazyView(() => import('./views/Simulation'), 'Simulation'),
  ecosistema: lazyView(() => import('./views/Ecosystem'), 'Ecosystem'),
  ajustes: lazyView(() => import('./views/Settings'), 'Settings'),
};
const HelpModal = lazyView(() => import('./components/HelpModal'), 'HelpModal');
const SearchModal = lazyView(() => import('./components/SearchModal'), 'SearchModal');

export function App() {
  const analysis = useAnalysis();
  const view = useStore((s) => s.view);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const helpOpen = useStore((s) => s.helpOpen);
  const searchOpen = useStore((s) => s.searchOpen);
  const View = VIEWS[view];

  // Los diálogos se cargan la primera vez que se abren y después siguen montados (así conservan su animación de salida).
  const [loaded, setLoaded] = useState({ help: helpOpen, search: searchOpen });
  useEffect(() => { if ((helpOpen && !loaded.help) || (searchOpen && !loaded.search)) setLoaded({ help: loaded.help || helpOpen, search: loaded.search || searchOpen }); }, [helpOpen, searchOpen, loaded]);

  useEffect(() => { preloadViews(); }, []);

  // Atajo global Ctrl+K / Cmd+K para la búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const st = useStore.getState();
        st.setSearchOpen(!st.searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Escuchar cambios de hash en la ventana (por ejemplo para #ayuda)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#ayuda') {
        setHelpOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setHelpOpen]);

  useEffect(() => {
    document.getElementById('contenido')?.scrollTo({ top: 0 });
  }, [view]);

  return (
    <MotionConfig reducedMotion="user">
      <AnalysisContext.Provider value={analysis}>
        <div className="flex h-dvh overflow-hidden bg-ground text-ink">
          <Sidebar />
          <main id="contenido" className="relative flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0" key={view}>
            <div className="flex-1">
              <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
                <View />
              </Suspense>
            </div>
          </main>
        </div>
        <MobileTabBar />
        <Suspense fallback={null}>
          {(searchOpen || loaded.search) && <SearchModal />}
          {(helpOpen || loaded.help) && <HelpModal />}
        </Suspense>
        <Toasts />
      </AnalysisContext.Provider>
    </MotionConfig>
  );
}
