# Hoja de ruta de CTEM-Nexus

> Documento vivo. Cada tarea se marca al cerrarse, con su commit. Una fase no se da por terminada hasta que pasan sus
> criterios de aceptación **y** la CI está en verde.

**Punto de partida (8 de octubre de 2026, commit `ed28440`).** Hay 24 pruebas de Vitest y 18 de pytest en verde, la paridad TS ↔ Python
está verificada (`shared/golden-demo.json`) y la consola no muestra errores de JavaScript. El análisis automático con axe-core
(WCAG 2.2 AA) en escritorio y móvil encuentra **entre 16 y 46 nodos con contraste insuficiente en cada vista** y un control interactivo
anidado en *Rutas de ataque*.

**Objetivo.** Que CTEM-Nexus sea el **puente entre lo ofensivo y el GRC** del ecosistema: que convierta un Nmap, un BloodHound o un
escáner de vulnerabilidades en un plan de remediación priorizado, y que ese plan llegue a la declaración de aplicabilidad (Rosetta, Compliance Studio),
al BIA (KAIROS) y a la formación (ARGOS) sin copiar datos a mano y sin que nada salga del navegador.

| Versión | Fase | Contenido |
|---|---|---|
| 0.2.0 | 0 · Higiene | Versiones únicas, repo limpio, CI endurecida, README veraz |
| 0.3.0 | 1 · Correcciones | Accesibilidad AA, controles duplicados, tablas, SLA vencidos, i18n completa |
| 0.4.0 | 2 · Diseño | Lenguaje visual de Rosetta y criterios apple-design (Emil Kowalski) |
| 0.5.0 | 3 · Funciones | Importadores, excepciones de riesgo, histórico y tendencias, ATT&CK, simulación |
| 0.6.0 | 4 · Ecosistema | Formato de intercambio común e integración con las 6 herramientas hermanas |
| 1.0.0 | 5 · Lanzamiento | Documentación, guía práctica, capturas, publicación |

---

## Fase 0 · Higiene del repositorio (0.2.0)

Problemas detectados:

- `frontend/package.json` dice **0.1.0**, el README **0.2.0** y el motor **1.0.0**. Además, el README da dos recuentos distintos de pruebas (Vitest 23/24, Pytest 17/18).
- `frontend/tsconfig.tsbuildinfo` está versionado y cada `npm run build` lo modifica, de modo que el árbol queda siempre sucio.
- La cabecera del README depende de un servicio externo (`capsule-render.vercel.app`): si se cae, la portada queda rota.
- Las acciones de GitHub (`actions/checkout@v4`…) no están fijadas por SHA, y el workflow de Pages tiene permiso `contents: write` en todo el trabajo.
- El README no tiene CHANGELOG, SECURITY ni CONTRIBUTING enlazados, que el resto de herramientas del ecosistema sí tienen.

Tareas:

- [x] Fuente única de versión: `package.json` → `__APP_VERSION__` (Vite `define`) → interfaz, informe y «Acerca de». La versión del motor se mantiene aparte y se documenta.
- [x] Prueba que falle si el README, `package.json` y `CHANGELOG.md` no coinciden en la versión.
- [x] Sacar `tsconfig.tsbuildinfo` del repositorio y añadir `*.tsbuildinfo` a `.gitignore`.
- [x] Cabecera y pie del README como SVG locales (`docs/assets/`), generados por script, sin servicios de terceros.
- [x] Fijar las acciones por SHA con comentario de versión; `permissions: contents: read` por defecto y escritura solo en el paso de despliegue; Dependabot semanal para npm, pip y actions.
- [x] CI: comprobar que `ctem-nexus.html` de la raíz coincide con el `dist/` recién construido (como en ARGOS) y que el árbol queda limpio tras compilar.
- [x] `CHANGELOG.md` (Keep a Changelog), `SECURITY.md` y `CONTRIBUTING.md`.

**Estado: cerrada en 0.2.0.** Además se corrigió el análisis de XML con entidades (XXE) en el navegador y en la API.

**Aceptación:** `git status` vacío tras `npm ci && npm test && npm run build`, la CI en verde y una única cifra de versión y de pruebas en todo el repositorio.

---

## Fase 1 · Correcciones de interfaz y accesibilidad (0.3.0)

| # | Problema | Dónde | Corrección |
|---|---|---|---|
| ✅ 1 | Contraste < 4,5:1 en texto de 10–11 px (`text-[0.625rem]`, `.chip`, `.kbd`, cabeceras de tabla con `ink-3`) | Todas las vistas | Subir `ink-3` en los dos temas hasta ≥ 4,5:1 sobre `surface` y `surface-2`, y fijar el texto mínimo en 11 px |
| ✅ 2 | La píldora activa ES/EN (`text-accent` sobre `bg-accent/15`) no llega a 4,5:1 con varios acentos | Barra superior (móvil) | Usar `accent-strong` en oscuro / texto `ink` con un anillo de acento |
| ✅ 3 | `nested-interactive`: un botón dentro de una fila o tarjeta clicable | Rutas de ataque (`.h-auto`) | Separar la acción de selección de los botones internos |
| ✅ 4 | Búsqueda, idioma, tema y ayuda repetidos en la barra superior **y** en el pie de la barra lateral | Escritorio | Una sola ubicación por control: barra superior para búsqueda e idioma, menú de usuario para el resto |
| ✅ 5 | Sin nombre de perfil, el avatar muestra «·» y el pie dice «Sin nombre / Sin rol» | Barra lateral | Avatar con el icono `User` de Lucide y la invitación «Configura tu perfil» |
| ✅ 6 | «94,4 %» se parte en dos líneas | Tabla de priorización | `white-space: nowrap` y cifras tabulares en las columnas numéricas |
| ✅ 7 | Etiquetas del grafo truncadas («Servidor de aplicaciones…») | Rutas de ataque | Etiqueta en dos líneas con `<title>` completo y nombre corto opcional (`shortName`) en el activo |
| ✅ 8 | Las fechas de vencimiento ya pasadas se muestran como cualquier otra («vence 2026-09-05» el 8 de octubre) | Movilización | Estado **vencido** / **vence en N días** con color de banda, y contador en el panel |
| ✅ 9 | Demo con fechas fijas: el ejemplo «envejece» y todo aparece vencido | `data/demo.ts` | Fechas relativas a hoy al cargar la demo |
| ✅ 10 | Traducción al inglés parcial (el README lo reconoce) | Vistas, informes, guías | Extraer todos los textos a `i18n.ts` y añadir una prueba que falle si una clave existe en `es` y no en `en` |
| ✅ 11 | El enlace de ARGOS en «Acerca de» tiene una descripción genérica | `i18n.ts` (`ECOSYSTEM`) | Descripción real y un enlace a la web publicada de cada herramienta, no solo al código |

Pruebas que se añaden en esta fase:

- [x] **e2e con Playwright** (Python, como en ARGOS): carga la demo, recorre las 6 vistas, abre un hallazgo, valida y marca no explotable, importa un Nmap y un BloodHound de ejemplo, exporta el proyecto y lo reimporta, y comprueba que no hay peticiones a terceros ni errores de consola.
- [x] **axe-core WCAG 2.2 AA** en claro y oscuro, a 1440 y 390 px, en cada vista: 0 infracciones como criterio de bloqueo en la CI.
- [x] Prueba de estructura de i18n (claves `es` = claves `en`), más un barrido e2e de 14 pantallas en inglés.

**Estado: cerrada en 0.3.0.** axe-core con barrido de contraste propio: 0 infracciones en 128 estados; e2e 53/53; inglés completo. De paso se corrigió la fórmula falsa de la ayuda.

**Aceptación:** axe da 0 infracciones en las 24 combinaciones (6 vistas × 2 temas × 2 anchos) y el e2e está en verde en la CI.

---

## Fase 2 · Diseño (0.4.0)

Referencias: **Rosetta** (la herramienta del ecosistema con mejor acogida), la guía **apple-design** de Emil Kowalski y **Lucide** como única familia de iconos.

- [ ] **Movimiento con intención:** escala 0,97 al pulsar (`pointer-down`), *springs* interrumpibles en paneles y modales (sin duraciones fijas), entrada escalonada de las tarjetas del panel y, con `prefers-reduced-motion`, fundido simple.
- [ ] **Panel ejecutivo** al estilo de Rosetta: anillo del índice de exposición, distribución por banda en barra apilada, «tres cosas que corregir hoy» (las de mayor puntuación en puntos de estrangulamiento) y mini tendencia (fase 3).
- [ ] **Grafo de ataque:** zoom y desplazamiento con rueda o pellizco, modo «solo esta ruta», animación del camino seleccionado de Internet a la joya y leyenda con iconos Lucide (`Globe`, `DoorOpen`, `Crown`, `Flame`).
- [ ] **Detalle del hallazgo** como hoja lateral (*sheet*) con desglose visual de los 6 factores en barras proporcionales a su máximo, enlaces CVE/KEV/EPSS de referencia (texto, sin peticiones) y guía de remediación paso a paso con casillas.
- [ ] **Estado vacío** con las 3 rutas de entrada (demo, Nmap, alcance manual) y una ilustración del ciclo CTEM en SVG.
- [ ] **Móvil:** tabla de priorización convertida en tarjetas por debajo de 640 px, barra inferior con 5 destinos y el resto en «Más».
- [ ] **Informe imprimible** con portada, índice y saltos de página limpios, y opción «Guardar como PDF» del navegador con estilos `@media print` cuidados.
- [ ] Capturas regeneradas (claro, oscuro y móvil) con `npm run capturas`.

**Aceptación:** axe mantiene 0 infracciones, la prueba de movimiento reducido pasa y Lighthouse da ≥ 95 en accesibilidad y buenas prácticas.

---

## Fase 3 · Funciones nuevas (0.5.0)

### Descubrimiento: más formatos de entrada (todo en local, parseo seguro y sin DTD)

- [ ] **Nessus** (`.nessus` XML), **OpenVAS/Greenbone** (XML), **Nuclei** (JSONL) y **Trivy / SARIF** (contenedores y código).
- [ ] Deduplicación por activo + CVE/título, con fusión de evidencias e indicación de la fuente.
- [ ] **Señales de inteligencia por fichero:** importar el catálogo CISA KEV (JSON público) y un CSV de EPSS (FIRST) para recalcular KEV/EPSS sin conexión desde la app. Se muestra la fecha del catálogo usado en el informe.

### Priorización y validación

- [ ] **Excepciones y aceptación del riesgo:** el hallazgo pasa a «riesgo aceptado» con responsable, motivo, fecha de caducidad y control compensatorio. Al caducar vuelve a abierto. La excepción aparece en el informe.
- [ ] **Mapa MITRE ATT&CK:** técnica (Txxxx) en cada arista o hallazgo, matriz de cobertura y exportación a ATT&CK Navigator (capa JSON).
- [ ] **Simulación «¿y si…?»:** marcar hallazgos como corregidos en un borrador y ver al momento cuántas rutas se rompen y cómo baja el índice, con un orden de corrección óptimo (voraz sobre puntos de estrangulamiento).
- [ ] **Ponderación configurable** (perfiles: por defecto, industrial/OT, banca) con prueba de paridad TS ↔ Python para cada perfil.

### Movilización y seguimiento

- [ ] **Instantáneas e histórico:** guardar el estado del ciclo (fecha, índice, abiertos por banda, MTTR) y ver tendencias entre ciclos.
- [ ] **Cumplimiento de SLA:** % dentro de plazo por banda y por responsable, envejecimiento de hallazgos y tickets vencidos.
- [ ] Exportación de tickets a **Jira CSV** y **GitHub Issues** (Markdown por ticket), y CSV genérico ya existente.
- [ ] Informe para la dirección en una página (resumen, tendencia, 5 acciones) y anexo técnico.

**Aceptación:** cada importador tiene un fichero de ejemplo en `shared/samples/` con su prueba unitaria y su paso e2e, y cada cambio de fórmula pasa `npm run golden` y `pytest`.

---

## Fase 4 · Integración con el ecosistema (0.6.0)

Principio: **el usuario mueve ficheros, las herramientas no hablan entre sí por red.** Todas comparten el sobre JSON siguiente:

```json
{
  "format": "yrd-ecosistema",
  "version": 1,
  "origen": { "herramienta": "ctem-nexus", "version": "0.6.0", "generado": "2026-10-08T10:00:00Z" },
  "tipo": "hallazgos | activos | controles | bia | soa",
  "datos": []
}
```

| Herramienta | Qué recibe CTEM-Nexus | Qué envía CTEM-Nexus |
|---|---|---|
| **KAIROS** (continuidad / BIA) | Procesos críticos con RTO/MTPD → **criticidad 1–5 de los activos** que los soportan | Activos con rutas de ataque abiertas hacia funciones críticas (riesgo de interrupción) |
| **Rosetta Multinorma** | — | Hallazgos agregados por **control afectado** (ENS op.exp.2/op.exp.3, mp.*; ISO/IEC 27001 Anexo A 8.8, 8.9, 5.23…; NIS2 art. 21; solo identificadores, sin texto ISO) para alimentar la evidencia del mapa multinorma |
| **Compliance Studio (ENS)** | Categoría del sistema (BÁSICA/MEDIA/ALTA) → ajusta los SLA por defecto | Evidencias de las medidas `op.exp.2` (configuración de seguridad) y `op.exp.3` (gestión de la configuración), y riesgos para el análisis MAGERIT |
| **ENS AD Auditor** | Hallazgos de directorio activo (delegaciones, ACL, ADCS, Kerberos) → aristas del grafo, como con BloodHound | — |
| **ARGOS** | — | Botón «Practica esto en ARGOS» en cada guía de remediación: enlace a la máquina o sala relacionada (Kerberoasting, ADCS, gestión de vulnerabilidades) |
| **Norvik** (gobernanza) | Responsables y roles → campo `owner` de los activos | Indicadores del ciclo (índice, % SLA, MTTR) para el cuadro de mando de gobierno |

Tareas:

- [ ] Especificación del sobre en `docs/ECOSISTEMA.md` con JSON Schema en `shared/schemas/`. Se valida al importar con `safeJsonParse` y saneado de campos.
- [ ] Tabla de correspondencias **hallazgo → controles** en `engine/controls.ts` (identificadores ENS, ISO/IEC 27001:2022 Anexo A, NIS2, NIST CSF 2.0), con prueba de que no contiene texto normativo ISO.
- [ ] Importadores KAIROS / ENS AD Auditor / Norvik y exportadores Rosetta / Compliance Studio / Norvik, con ficheros de ejemplo y pruebas de ida y vuelta.
- [ ] Bloque «Suite» en «Acerca de» con las 7 herramientas, su web publicada y su repositorio, igual en todos los repos.
- [ ] El mismo sobre se documenta y se implementa en las herramientas hermanas, en el repositorio de cada una.

**Aceptación:** una ida y vuelta de ejemplo CTEM-Nexus → Rosetta → CTEM-Nexus sin pérdida de datos, cubierta por una prueba.

---

## Fase 5 · Documentación y lanzamiento (1.0.0)

- [ ] **README reescrito** con este orden: qué problema resuelve (en 3 líneas), demo en vivo, captura, cómo se usa en 5 pasos, fórmula, privacidad, ecosistema, desarrollo y licencia. Cifras verificadas por prueba, sin servicios externos en la cabecera y con un aviso de independencia (no afiliado a Gartner, MITRE, CISA, FIRST, ISO, CCN ni ninguna entidad de certificación).
- [ ] `docs/GUIA.md`: «De un Nmap a un plan de remediación con SLA en 10 minutos», con capturas. Sirve de base para el artículo de LinkedIn.
- [ ] `docs/SCORING.md` y `docs/ARCHITECTURE.md` actualizados con los factores nuevos y el formato de intercambio.
- [ ] Ficheros de ejemplo descargables (Nmap, BloodHound, Nessus, Nuclei, KAIROS) desde la ayuda de la app.
- [ ] Publicación en Pages y una *release* en GitHub con el HTML autocontenido adjunto y sus notas.
- [ ] Lanzamiento escalonado (3–4 días entre publicaciones): primero la herramienta, después la guía práctica y por último la integración con el ecosistema.

---

## Reglas que no cambian

- Todo funciona en un único HTML sin servidor y **sin peticiones a terceros** (lo verifica `npm run capturas` y el e2e).
- El motor TypeScript y su espejo en Python se cambian juntos: `npm run golden` + `pytest`.
- Todo dato importado se trata como hostil: XML sin DTD ni entidades, JSON sin claves de prototipo, CSV saneado contra inyección de fórmulas.
- Iconos solo de Lucide. Interfaz en español, con inglés completo como segundo idioma.
