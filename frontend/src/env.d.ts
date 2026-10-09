/** Versión de la aplicación, inyectada por Vite desde package.json. */
declare const __APP_VERSION__: string;

/** Ficheros de texto incrustados con el sufijo ?raw de Vite (ejemplos descargables desde la ayuda). */
declare module '*?raw' {
  const text: string;
  export default text;
}
