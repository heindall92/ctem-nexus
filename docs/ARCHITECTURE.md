# Arquitectura · CTEM-Nexus

```mermaid
flowchart LR
  subgraph Navegador["Navegador (ctem-nexus.html, sin servidor)"]
    UI["React 19 + TypeScript<br/>Tailwind CSS 4 · Motion"]
    Store["Estado (zustand)<br/>IndexedDB → localStorage → memoria"]
    Engine["Motor TS sin DOM<br/>src/engine/"]
    Worker["Web Worker<br/>copia del proyecto · motor · importadores"]
    IO["Importación / exportación<br/>JSON · CSV · Markdown"]
    Eco["Ecosistema<br/>sobre yrd-ecosistema"]
    UI --> Store --> Engine
    Store -- "parches (solo lo que cambia)" --> Worker
    Worker -- "resultados en trozos" --> UI
    UI --> IO
    UI --> Eco
  end
  Eco <-. "ficheros" .-> Sister["Rosetta · Compliance Studio · KAIROS<br/>ENS AD Auditor · Norvik · ARGOS"]
  subgraph API["Backend opcional (FastAPI)"]
    Routers["Routers por fase CTEM<br/>scoping · discovery · prioritize · validation · mobilization"]
    PyEngine["app/engine/prioritization.py<br/>misma fórmula"]
    Routers --> PyEngine
  end
  Engine -. "paridad: shared/golden-demo.json" .- PyEngine
  UI -- "Ajustes › Usar la API (desactivado por defecto)<br/>POST /api/v1/prioritize" --> Routers
```

## Decisiones

| Decisión | Motivo |
|---|---|
| Un único HTML autocontenido (`vite-plugin-singlefile`) | Se abre con doble clic, sin servidor ni instalación, como Rosetta. JS, CSS y fuentes (Geist, autoalojada) van incrustados. |
| CSP estricta con hashes (`scripts/postbuild.mjs`) | `default-src 'none'`; solo el script y el estilo incrustados; `connect-src` limitado a `127.0.0.1`/`localhost` para la API opcional. Cero peticiones a terceros (lo comprueba `npm run capturas`). |
| Motor en TypeScript sin DOM | La aplicación funciona entera sin backend; el motor se prueba con Vitest en Node. |
| Backend FastAPI opcional | Para integrarlo en flujos (CI, SOAR, otros escáneres). Si no responde, la interfaz vuelve al motor local y lo indica. |
| Fichero dorado compartido | `npm run golden` lo genera desde el motor TS; `pytest` exige que Python dé exactamente lo mismo (puntuaciones, textos, rutas, resumen). |
| Grafo en SVG propio | Sin dependencias pesadas (Cytoscape/React Flow). Disposición por columnas según la distancia BFS desde Internet. |
| Vistas cargadas bajo demanda (`React.lazy`) | En Pages solo el panel va en el arranque; el resto de vistas, la ayuda y la búsqueda se precargan con el navegador libre. Lighthouse de rendimiento: 93 → 96 (mediana, con gzip). En el HTML autocontenido todo sigue en un único fichero. |
| Proyecto en IndexedDB (1.3.0) | `localStorage` tiene unos 5 MB: un Nessus mediano lo superaba y el guardado fallaba sin aviso. IndexedDB guarda el objeto tal cual (clonado estructurado), se pide almacenamiento persistente y cada fallo se ve: estado «Guardado hace N s» y aviso fijo con «Exportar proyecto ahora». Migra solo desde la clave antigua. Los ajustes siguen en `localStorage`. |
| Web Worker con copia del proyecto (1.3.0) | Por encima de 1.500 hallazgos el motor calcula en un Worker (Blob en línea; CSP `worker-src blob:`). Pasar 50.000 hallazgos cuesta unos 240 ms de copia, así que el Worker guarda una copia: la primera vez se manda en trozos de 5.000, después solo los hallazgos que cambian (por identidad: el estado es inmutable). Motor, «¿Y si…?» y comparación de perfiles se piden sobre esa copia por canales (el cálculo nuevo de un canal sustituye al pendiente), y las listas grandes vuelven en trozos. Ninguna copia bloquea la página. |
| Importadores en un Worker propio (1.3.0) | Cada lectura de un fichero va a un Worker que se termina al acabar: «Cancelar» es inmediato. El Worker recibe el `File` (no el texto), analiza XML por partes y devuelve el resultado en trozos. |
| Listas virtualizadas y pintado progresivo (1.3.0) | Por encima de 150 filas solo se pintan las visibles, con `aria-rowcount` y `aria-rowindex`. Con proyectos grandes, los paneles secundarios se montan en la tarea siguiente y el grafo se resume en las rutas más cortas (120 nodos como máximo). |
| Integración por fichero, nunca por red | Las herramientas del ecosistema intercambian un sobre JSON común (`shared/schemas/yrd-ecosistema.schema.json`). Cada importación enseña qué cambiará antes de aplicarlo. Ver [ECOSISTEMA.md](ECOSISTEMA.md). |

## Módulos de la interfaz

| Vista | Fase CTEM | Fichero |
|---|---|---|
| Panel | Todas | `frontend/src/views/Dashboard.tsx` |
| Alcance y activos | Alcance | `frontend/src/views/Scoping.tsx` |
| Descubrimiento y priorización | Descubrimiento + Priorización | `frontend/src/views/Prioritization.tsx` |
| Rutas de ataque | Validación | `frontend/src/views/AttackPaths.tsx` + `components/AttackGraph.tsx` |
| Mapa ATT&CK | Validación | `frontend/src/views/MitreMatrix.tsx` + `engine/attack.ts` |
| ¿Y si…? | Priorización + Movilización | `frontend/src/views/Simulation.tsx` + `engine/simulate.ts` |
| Movilización | Movilización | `frontend/src/views/Mobilization.tsx` |
| Ecosistema | Todas | `frontend/src/views/Ecosystem.tsx` + `engine/ecosystem.ts` y `engine/controls.ts` |
| Ajustes y datos | — | `frontend/src/views/Settings.tsx` |

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado y versión del motor. |
| POST | `/api/v1/prioritize` | `EngineInput` → `EngineResult` (mismo JSON que el motor TS, `engine: "python"`). |
| POST | `/api/v1/scoping/validate` | Valida IP/CIDR y avisa de activos fuera de los rangos en alcance. |
| POST | `/api/v1/discovery/import-csv` | CSV (`,` o `;`) → hallazgos. |
| POST | `/api/v1/validation/attack-paths` | Rutas, aristas y puntos de estrangulamiento. |
| POST | `/api/v1/mobilization/tickets.csv` | Tickets en CSV con fórmulas neutralizadas. |

Documentación interactiva en `http://127.0.0.1:8000/docs` con el backend arrancado.

## Diseño y movimiento

- Oscuro casi negro frío o claro gris perla, un solo acento (azul eléctrico por defecto, siete a elegir, los de Rosetta);
  los colores de banda solo transmiten prioridad. Sin anillos ni gráficos circulares (son el sello de Rosetta): el panel
  usa franjas de exposición por activo.
- Superficies unificadas con divisiones finas en lugar de tarjetas fragmentadas; material translúcido solo donde hay
  capas superpuestas (barra superior fija, panel lateral, avisos), más grueso cuanto mayor es la superficie.
- Monoespaciada (Geist Mono) para IDs, CVE, IP y puntuaciones de tabla; cifras grandes en Geist con numerales tabulares
  y tracking negativo.
- Movimiento: muelles críticamente amortiguados (`bounce: 0`, ~0,3 s) para el indicador de navegación, controles
  segmentados, panel lateral y avisos (interrumpibles); transiciones CSS con `cubic-bezier(0.23, 1, 0.32, 1)` por debajo
  de 300 ms; `scale(0.97)` al pulsar; entrada de vistas con `@starting-style`; salida del panel más rápida que la entrada
  y por el mismo borde. `prefers-reduced-motion` sustituye desplazamientos por fundidos; `prefers-reduced-transparency`
  y `prefers-contrast` vuelven sólidos los materiales.
