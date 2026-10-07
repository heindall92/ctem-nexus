import { MotionConfig } from 'motion/react';
import { Sidebar, Toasts } from './components/Shell';
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
  const View = VIEWS[view];
  return (
    <MotionConfig reducedMotion="user">
      <AnalysisContext.Provider value={analysis}>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <main id="contenido" className="relative flex-1 overflow-y-auto" key={view}>
            <View />
          </main>
        </div>
        <Toasts />
      </AnalysisContext.Provider>
    </MotionConfig>
  );
}
