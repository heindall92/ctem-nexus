/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// Dos salidas:
//  · `vite build`                  → dist/        (multiarchivo, rutas relativas, apto para GitHub Pages)
//  · `vite build --mode singlefile` → dist-single/ (un único HTML autocontenido: JS, CSS y fuentes incrustados)
export default defineConfig(({ mode }) => {
  const single = mode === 'singlefile';
  return {
    base: './',
    // Fuente única de la versión de la aplicación: package.json.
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      cssCodeSplit: !single,
      modulePreload: { polyfill: false },
      sourcemap: false,
      target: 'es2022',
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
