/** Versión de la aplicación, inyectada por Vite desde package.json. */
declare const __APP_VERSION__: string;

/** Ficheros de texto incrustados con el sufijo ?raw de Vite (ejemplos descargables desde la ayuda). */
declare module '*?raw' {
  const text: string;
  export default text;
}

/** Web Worker incrustado (Vite «?worker&inline»): va dentro del HTML autocontenido como blob. */
declare module '*?worker&inline' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
