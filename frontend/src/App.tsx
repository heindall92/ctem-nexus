import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { MobileTabBar, Sidebar, Toasts } from './components/Shell';
import { HelpModal } from './components/HelpModal';
import { SearchModal } from './components/SearchModal';
import { AnalysisContext, useAnalysis } from './lib/analysis';
import { useStore } from './store/store';
import { AttackPaths } from './views/AttackPaths';
import { Dashboard } from './views/Dashboard';
import { Mobilization } from './views/Mobilization';
import { Prioritization } from './views/Prioritization';
import { Scoping } from './views/Scoping';
import { Settings } from './views/Settings';

const VIEWS = { panel: Dashboard, alcance: Scoping, priorizacion: Prioritization, rutas: AttackPaths, movilizacion: Mobilization, ajustes: Settings };

export function App() {
  const analysis = useAnalysis();
  const view = useStore((s) => s.view);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const View = VIEWS[view];

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
              <View />
            </div>
          </main>
        </div>
        <MobileTabBar />
        <SearchModal />
        <HelpModal />
        <Toasts />
      </AnalysisContext.Provider>
    </MotionConfig>
  );
}
