# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico. La hoja de ruta está en [ROADMAP.md](ROADMAP.md).

## [0.4.0] - 2026-10-08

Fase 2 de la hoja de ruta: diseño con identidad propia, sin repetir los anillos de Rosetta.

### Añadido
- **Franjas de exposición por activo** en el panel: una fila por activo y una marca por hallazgo abierto sobre la escala 0–100, con las bandas como zonas rotuladas (la banda se lee por posición, no solo por color), anillo para CISA KEV, corona para las joyas y globo para lo expuesto a Internet. Ficha al pasar el ratón o al enfocar con el teclado; cada marca abre su hallazgo. Marcas cercanas en carriles, con objetivos de 24 × 24 px.
- **Tres acciones para hoy:** las correcciones que más rutas hacia las joyas de la corona rompen (`engine/impact.ts`, comprobado contra el recálculo completo del grafo en los 20 hallazgos del ejemplo).
- **Grafo:** zoom (botones, Ctrl + rueda, pellizco), desplazamiento arrastrando, modo «solo esta ruta» que la encuadra y flujo animado sobre la ruta seleccionada.
- **Detalle y tickets:** pasos de remediación con casillas que se guardan en el proyecto (`progress`), se exportan y se sanean al importar; enlaces a NVD, CISA KEV, FIRST EPSS y a la guía del fabricante.
- **Cabecera de página** común con la fase CTEM, título y entradilla; título de la pestaña por vista.
- **Estado vacío** con tres entradas (demo, Nmap sin salir del panel, alcance manual) y el ciclo CTEM como flujo con retorno.
- **Informe imprimible** con portada, siempre en tonos de tema claro y con tablas que caben en A4; `npm run capturas` genera `docs/informe-ejemplo.pdf`.
- **Móvil:** Priorización en tarjetas por debajo de 640 px.
- Pruebas: e2e 75/75 (franjas, acciones, zoom, «solo esta ruta», casillas, impresión a PDF, tarjetas, movimiento reducido, un h1 por vista) y axe en 144 estados.

### Cambiado
- Rellenos de gráficos por banda (`--color-*-fill`), validados con el script de visualización: separación de visión normal ≥ 15 y CVD en ambos temas.
- El aviso de datos de ejemplo se desplaza con el contenido (fijo arriba ocupaba un 20 % de la pantalla en móvil).
- Aparición escalonada con muelle sin rebote; con movimiento reducido, solo fundido y sin animaciones de flujo.

## [0.3.0] - 2026-10-08

Fase 1 de la hoja de ruta cerrada: accesibilidad AA verificada, controles sin duplicar, plazos visibles e inglés completo.

### Añadido
- **Inglés completo.** Vistas, formularios, diálogos, ayuda, avisos, informe ejecutivo, tickets (Markdown y CSV) y las 16 guías de remediación (`engine/remediation-en.ts`). Los textos se escriben con sus dos idiomas en el punto de uso (`L('…', '…')`) y TypeScript exige ambos. Cifras y fechas siguen el idioma.
- `engine/explain.ts`: la explicación y el desglose de la puntuación en inglés se reconstruyen a partir de los mismos datos. En español se devuelve exactamente lo que produce el motor, así que la paridad con Python no cambia.
- Pruebas: paridad de claves y firmas de los diccionarios ES/EN, exportaciones en inglés, guías en inglés con los mismos comandos y, en el e2e, 14 pantallas en inglés sin texto de interfaz en español.
- `tests/e2e_app.py`: 50 comprobaciones con Playwright sobre el HTML autocontenido. Cubre la CSP, la red bloqueada, la navegación, la ingesta de Nmap y BloodHound, el rechazo de XML con entidades, las rutas que se cortan al validar, los SLA vencidos, exportar y reimportar, los diálogos, el tema, el idioma y el móvil.
- `tests/a11y_app.py`: axe-core (WCAG 2.2 A/AA) en 128 estados (vistas, diálogos, menús, formularios, resultados de ingesta, ayuda y búsqueda), en claro y oscuro, a 1440 y 390 px. Incluye un barrido de contraste propio para los casos que axe deja sin decidir. Ambas suites corren en la CI.
- Plazos de SLA (`engine/sla.ts`): fecha límite, «vencido hace N d», «vence hoy» o «vence en N d» en cada ticket; recuento de tickets fuera de plazo en Movilización y en el panel; fecha límite en los tickets en Markdown.
- Ficheros de ejemplo en `shared/samples/` (Nmap y BloodHound ficticios), con pruebas.
- «Acerca de» enlaza la web publicada de cada herramienta del ecosistema, además de su código. Se corrige la descripción de ARGOS.

### Cambiado
- **Contraste AA en toda la interfaz.** Las bandas tienen tonos propios en el tema claro, `ink-3` es más claro en el oscuro, los acentos se ajustan para llegar a 4,5:1 también sobre sus tintes y el texto mínimo pasa a 11 px. El bloque de comandos de verificación tenía texto turquesa fijo, ilegible en claro.
- Búsqueda, idioma, tema y ayuda aparecen una sola vez, en la barra superior. El lateral se queda con la navegación, el acento y la cuenta. En escritorio, la cuenta solo está en el lateral.
- Sin nombre de perfil, el avatar muestra el icono de usuario en lugar de «·».
- Grafo de ataque: los nombres largos van en dos líneas con el nombre completo accesible, y el grafo es un grupo de nodos enfocables (antes, una imagen con controles dentro).
- La demo desplaza sus fechas al día actual para no envejecer: siempre hay tickets vencidos, a punto de vencer y en plazo.
- Las cifras no se parten (`94,4 %` con espacio duro).

### Corregido
- Paneles y ventanas: Escape cierra aunque el foco aún no haya entrado (antes, el panel de detalle solo cerraba con el foco dentro), y el foco ya no salta fuera del diálogo cuando la vista se vuelve a pintar (por ejemplo, al cambiar el estado de un hallazgo desde el detalle).
- **La ayuda mostraba una fórmula inexistente** («Criticidad × 0,35 + CVSS × 0,30 + Explotabilidad × 0,20 + Ruta × 0,15») y prometía un «porcentaje proyectado de reducción de riesgo» que no existe. Ahora la pestaña «Cálculo de riesgo» se genera con las constantes del motor (30 · 25 · 20 · 10 · 15, bonificación de validación, factor de no explotable, bandas y SLA), y el e2e comprueba que coincide.
- Diálogos accesibles: ayuda, búsqueda, perfil, ventanas y paneles con `role="dialog"`, nombre, Escape y devolución del foco. Pestañas de la ayuda con `tablist` y flechas. Menú de cuenta con foco inicial, flechas y Escape. Selector de acento con Escape.
- Los selectores de fichero de las ingestas (`display: none`) eran inalcanzables con el teclado.
- Las zonas desplazables (paneles, listas de resultados) se pueden recorrer con el teclado.
- Etiquetas de navegación correctas («Secciones») en el lateral y en la barra inferior.

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
