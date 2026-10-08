import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { useStore } from './store/store';

// Gancho solo para las pruebas e2e y de accesibilidad (`?test`): expone el estado para recorrer vistas y diálogos.
if (new URLSearchParams(window.location.search).has('test')) (window as unknown as { __CTEM__: typeof useStore }).__CTEM__ = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
