# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico. La hoja de ruta está en [ROADMAP.md](ROADMAP.md).

## [0.2.0] - 2026-10-08

Fase 0 de la hoja de ruta: higiene del repositorio.

### Añadido
- `ROADMAP.md`: hoja de ruta por fases hasta la 1.0.0, con criterios de aceptación e integración con el ecosistema.
- Prueba de coherencia del repositorio (`frontend/src/repo.test.ts`). Falla si la versión no coincide entre `package.json`, la API, el README y este fichero, si las cifras de pruebas del README no son las reales, o si el README carga imágenes de servicios de terceros.
- Cabecera y pie del README en SVG locales, generados con `node scripts/readme-header.mjs` a partir de iconos Lucide.
- `SECURITY.md`, `CONTRIBUTING.md` y este registro de cambios.
- Dependabot semanal para npm, pip y GitHub Actions.

### Cambiado
- Fuente única de versión: `package.json` se inyecta en la interfaz (`__APP_VERSION__`) y el informe muestra la versión de la aplicación junto a la del motor.
- CI: acciones fijadas por SHA, permisos mínimos por trabajo y comprobación de que `ctem-nexus.html` coincide con la compilación y de que el árbol queda limpio.
- Pages: el permiso de escritura queda limitado al trabajo de despliegue, que solo se ejecuta tras pasar las pruebas.

### Seguridad
- La ingesta de Nmap (navegador y API) rechaza XML con entidades o DTD interna/externa (XXE, «billion laughs»). Se sigue aceptando el `<!DOCTYPE nmaprun>` que emite Nmap.
- La API limita a 20 MB los ficheros subidos y ya no devuelve el texto de las excepciones internas.
- La importación de BloodHound descarta las claves de prototipo (`__proto__`, `constructor`, `prototype`), igual que la de proyectos.
- `npm run capturas` encuentra el Chromium indicado en `PLAYWRIGHT_BROWSERS_PATH`.

### Eliminado
- `frontend/tsconfig.tsbuildinfo` del repositorio: cada compilación lo modificaba.
- La dependencia del README de un servicio externo para la cabecera.

## [0.1.0] - 2026-10-08

Primera versión publicada: las cinco fases CTEM, el motor TypeScript con su espejo en Python, la ingesta de Nmap XML y BloodHound, el grafo de ataque con puntos de estrangulamiento, el informe ejecutivo y los tickets, en un único HTML sin servidor.
