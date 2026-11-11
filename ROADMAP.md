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
| 0.6.0 ✓ | 4 · Ecosistema | Formato de intercambio común e integración con las 6 herramientas hermanas |
| 1.0.0 ✓ | 5 · Lanzamiento | Documentación, guía práctica, capturas, publicación |
| 1.1.0 ✓ | 6 · Validación ofensiva | ZAP, Burp, PingCastle y Certipy; evidencias de explotación y ciclo de *retest* |
| 1.2.0 ✓ | 7 · Ecosistema 2 | Las herramientas hermanas exportan e importan el sobre; bloque «Suite» común |
| 1.2.1 ✓ | 7 · Ecosistema 2 | MCP-Shield, octava herramienta: su sobre «hallazgos» entra con guía, ATT&CK y controles |
| 1.3.0 | 8 · Datos reales | Que no pierda nada y vaya fluida con 50.000 hallazgos |
| 1.4.0 | 9 · Proteger el mapa | Cifrado del proyecto, API con credencial y entregas firmadas |
| 1.5.0 | 10 · Grafo exacto | Brecha asumida, objetivos elegidos, identidades y corte mínimo exacto |
| 1.6.0 | 11 · Priorización de referencia | CVSS 4.0, SSVC, VEX, controles compensatorios y nota contrastada con la historia |
| 1.7.0 | 12 · Superficie externa y amenaza | Shodan, Censys, crt.sh, subdominios, ransomware y STIX 2.1, más nube, SBOM e identidad en la nube |
| 1.8.0 | 13 · Validación y detección | dark_spear, pruebas de equipo morado y cobertura de detección |
| 1.9.0 | 14 · Gobierno | Registro de riesgos, burndown, .ics y comité, más plazos de notificación, traza de auditoría y trabajo en equipo |
| 2.0.0 | 15 · Euros, experiencia y alcance | Pérdida esperada con el BIA de KAIROS, ciclo guiado, modo comité, línea de comandos y acción de CI |

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

- [x] **Movimiento con intención:** escala 0,97 al pulsar, aparición escalonada con muelle sin rebote (`Reveal`), grafo con transiciones interrumpibles y, con `prefers-reduced-motion`, solo fundido (el flujo animado se detiene; lo comprueba el e2e).
- [x] **Panel ejecutivo con identidad propia.** *Decisión de diseño:* sin anillos ni gráficos circulares (Rosetta ya usa ese lenguaje). En su lugar, **franjas de exposición por activo**: una fila por activo y una marca por hallazgo sobre la escala 0–100, con las bandas como zonas, anillo para KEV y ficha al pasar o enfocar. Además, banda apilada, índice y **tres acciones para hoy**, ordenadas por las rutas que rompe cada corrección (`engine/impact.ts`, comprobado contra el recálculo completo del grafo). La mini tendencia queda para la fase 3.
- [x] **Grafo de ataque:** zoom con botones, Ctrl + rueda y pellizco; desplazamiento arrastrando; modo «solo esta ruta», que encuadra la ruta; flujo animado sobre la ruta seleccionada.
- [x] **Detalle del hallazgo:** desglose de factores, enlaces a NVD, CISA KEV, FIRST EPSS y a la guía del fabricante (solo enlaces, sin peticiones), y pasos de remediación con casillas que se guardan en el proyecto, se exportan y se sanean al importar.
- [x] **Estado vacío** con tres entradas (demo, Nmap, alcance manual) y el ciclo CTEM dibujado como flujo con retorno.
- [x] **Móvil:** tarjetas en lugar de tabla por debajo de 640 px; el aviso de datos de ejemplo ya no queda fijo arriba.
- [x] **Informe imprimible** con portada, tonos de tema claro aunque se use el oscuro, tablas que caben en A4 e informe de ejemplo en `docs/informe-ejemplo.pdf`.
- [x] Cabecera de página común (antetítulo con la fase CTEM, título y entradilla) y título de pestaña por vista.
- [x] Capturas regeneradas (claro, oscuro y móvil) con `npm run capturas`.

**Estado: cerrada en 0.4.0.** axe-core 0 infracciones en 144 estados; e2e 75/75; Lighthouse (servido con gzip, como en GitHub Pages): rendimiento 97, accesibilidad 100, buenas prácticas 100, SEO 100.

**Aceptación:** axe mantiene 0 infracciones, la prueba de movimiento reducido pasa y Lighthouse da ≥ 95 en accesibilidad y buenas prácticas.

---

## Fase 3 · Funciones nuevas (0.5.0)

### Descubrimiento: más formatos de entrada (todo en local, parseo seguro y sin DTD)

- [x] **Nessus** (`.nessus` XML), **OpenVAS/Greenbone** (XML), **Nuclei** (JSONL) y **Trivy / SARIF** (contenedores y código).
- [x] Deduplicación por activo + CVE/título, con fusión de evidencias e indicación de la fuente.
- [x] **Señales de inteligencia por fichero:** importar el catálogo CISA KEV (JSON público) y un CSV de EPSS (FIRST) para recalcular KEV/EPSS sin conexión desde la app. Se muestra la fecha del catálogo usado en el informe.

### Priorización y validación

- [x] **Excepciones y aceptación del riesgo:** el hallazgo pasa a «riesgo aceptado» con responsable, motivo, fecha de caducidad y control compensatorio. Al caducar vuelve a abierto. La excepción aparece en el informe.
- [x] **Mapa MITRE ATT&CK:** técnica (Txxxx) en cada arista o hallazgo, matriz de cobertura y exportación a ATT&CK Navigator (capa JSON).
- [x] **Simulación «¿y si…?»:** marcar hallazgos como corregidos en un borrador y ver al momento cuántas rutas se rompen y cómo baja el índice, con un orden de corrección óptimo (voraz sobre puntos de estrangulamiento).
- [x] **Ponderación configurable** (perfiles: por defecto, industrial/OT, banca) con prueba de paridad TS ↔ Python para cada perfil.

### Movilización y seguimiento

- [x] **Instantáneas e histórico:** guardar el estado del ciclo (fecha, índice, abiertos por banda, MTTR) y ver tendencias entre ciclos.
- [x] **Cumplimiento de SLA:** % dentro de plazo por banda y por responsable, envejecimiento de hallazgos y tickets vencidos.
- [x] Exportación de tickets a **Jira CSV** y **GitHub Issues** (Markdown por ticket), y CSV genérico ya existente.
- [x] Informe para la dirección en una página (resumen, tendencia, 5 acciones) y anexo técnico.

**Aceptación:** cada importador tiene un fichero de ejemplo en `shared/samples/` con su prueba unitaria y su paso e2e, y cada cambio de fórmula pasa `npm run golden` y `pytest`.

**Estado: cerrada en 0.5.0.** Vitest 115, Pytest 22, e2e 124/124 y axe-core 0 infracciones en 188 estados. Además de lo previsto: perfil y catálogos en el informe, aviso de aceptaciones por caducar, búsqueda de técnicas con Ctrl + K y plan voraz que agrupa los hallazgos que solo cortan juntos su arista.

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

- [x] Especificación del sobre en `docs/ECOSISTEMA.md` con JSON Schema en `shared/schemas/`. Se valida al importar con `safeJsonParse` y saneado de campos; pytest valida los ejemplos contra el esquema.
- [x] Tabla de correspondencias **hallazgo → controles** en `engine/controls.ts` (controles unificados de Rosetta con identificadores ENS, ISO/IEC 27001:2022 Anexo A, NIS2, NIST CSF 2.0 y DORA), con prueba de que no contiene texto normativo ISO.
- [x] Importadores KAIROS / Compliance Studio / ENS AD Auditor / Rosetta / Norvik y exportadores Rosetta / Compliance Studio / KAIROS / Norvik, con ficheros de ejemplo y pruebas de ida y vuelta.
- [x] Bloque «Suite» en «Acerca de» con las 7 herramientas, su web publicada y su repositorio (en CTEM-Nexus; el resto de repos, en la fase 7).
- [x] Rosetta 2.11.0 implementa el sobre (importa la evidencia y devuelve los controles). KAIROS, Compliance Studio y ENS AD Auditor se leen en su formato nativo, sin cambios en sus repositorios; Norvik tiene el contrato publicado. Que exporten también el sobre queda en la fase 7.

**Aceptación:** una ida y vuelta de ejemplo CTEM-Nexus → Rosetta → CTEM-Nexus sin pérdida de datos, cubierta por una prueba.

**Estado: cerrada en 0.6.0.** Ida y vuelta probada en los dos repositorios (`ctem-a-rosetta.json` y `rosetta-a-ctem.json`); Vitest 148, Pytest 27, e2e 148/148 y axe 0 infracciones en 220 estados.

---

## Fase 5 · Documentación y lanzamiento (1.0.0)

- [x] **README reescrito** con este orden: qué problema resuelve (en 3 líneas), demo en vivo, captura, cómo se usa en 5 pasos, fórmula, privacidad, ecosistema, desarrollo y licencia. Cifras verificadas por prueba, sin servicios externos en la cabecera y con un aviso de independencia (no afiliado a Gartner, MITRE, CISA, FIRST, ISO, CCN ni ninguna entidad de certificación).
- [x] `docs/GUIA.md`: «De un Nmap a un plan de remediación con SLA en 10 minutos», con capturas generadas desde la interfaz real (`npm run guia`). Sirve de base para el artículo de LinkedIn.
- [x] `docs/SCORING.md` y `docs/ARCHITECTURE.md` actualizados con los factores nuevos y el formato de intercambio.
- [x] Ficheros de ejemplo descargables (Nmap, BloodHound, Nessus, OpenVAS, Nuclei, Trivy, SARIF, KEV, EPSS, KAIROS, Studio, ENS AD Auditor y Norvik) desde la ayuda de la app, con prueba e2e de que son idénticos a `shared/samples`.
- [x] **Recuperar ≥ 95 de rendimiento en Lighthouse**: vistas, ayuda y búsqueda con `React.lazy` y precarga en reposo. Mediana con gzip: **96** en Pages (93 en la 0.5.1). El HTML autocontenido, que no se puede dividir, da 94.
- [x] Publicación en Pages y *release* en GitHub con el HTML autocontenido adjunto, su SHA-256 y sus notas (`.github/workflows/release.yml`, al subir la etiqueta o lanzándolo desde Actions).
- [ ] Lanzamiento escalonado (3–4 días entre publicaciones): primero la herramienta, después la guía práctica y por último la integración con el ecosistema. *Lo decide el autor; los textos están preparados.*

**Estado: cerrada en 1.0.0** (salvo el calendario de publicaciones, que depende del autor).

---

## Fase 6 · Validación ofensiva (1.1.0)

El ciclo CTEM se queda cojo si la fase de **validación** se limita a un botón. Esta fase trae los resultados de las
herramientas con las que se valida de verdad y cierra el bucle con el *retest*.

- [x] **Importadores ofensivos**, con el mismo plan previo y la misma deduplicación que los escáneres:
  - **OWASP ZAP** (informe JSON tradicional): alertas por URL con riesgo, confianza, CWE y referencias.
  - **Burp Suite** (exportación XML de *issues*): gravedad, certeza, ruta y evidencia en base64 recortada y sin cuerpo.
  - **PingCastle** (informe XML *healthcheck*): reglas de riesgo del directorio activo con su categoría y puntos.
  - **Certipy** (`find -json`): plantillas y CA vulnerables con su ESC (1 a 16) y quién puede inscribirse.
- [x] **Evidencia de validación** por hallazgo: quién, cuándo, técnica ATT&CK usada, resultado (explotado, no explotable, mitigado por un control) y prueba en texto (comando, captura descrita). Sale en el informe y en el anexo técnico.
- [x] **Retest**: un hallazgo mitigado pasa a «pendiente de verificar» hasta que un escaneo posterior no lo ve (verificado automáticamente) o el analista confirma la prueba. Indicador de **tasa de reapertura** en Movilización.
- [x] Ficheros de ejemplo, pruebas unitarias con entradas hostiles y pasos e2e de cada importador.

**Aceptación:** cada importador tiene su ejemplo y sus pruebas; un ciclo mitigar → reimportar → verificado queda cubierto por una prueba de motor y otra e2e; axe 0.

**Estado: cerrada en 1.1.0.** La verificación automática se prueba en el motor (misma herramienta y mismo activo; otra herramienta u otro activo no verifican) y la confirmación manual en el e2e. Vitest 167, e2e 158/158 y axe 0 infracciones en 232 estados.

## Fase 7 · Ecosistema 2 (1.2.0)

El sobre `yrd-ecosistema` se implementa en las herramientas hermanas, no solo en CTEM-Nexus y Rosetta.

- [x] **KAIROS 1.1.0**: exporta su BIA como sobre `bia` e importa el riesgo de interrupción de CTEM-Nexus en la ficha de cada activo, con la regla de preauditoría **CTM-01**.
- [x] **ENS Compliance Studio 2.2.0**: exporta su categoría y su SoA como sobre `soa` (con su ejemplo comprobado en la prueba del motor) e importa la evidencia técnica de CTEM-Nexus (ya lo hacía en su formato).
- [x] **ENS AD Auditor 0.4.0**: exporta sus alertas también como sobre `hallazgos`, en el panel y en `GET|POST /api/export/ecosistema`.
- [x] Bloque **«Herramientas GRC del autor»** con las siete herramientas en KAIROS, Studio, ENS AD Auditor, Rosetta, ARGOS y CTEM-Nexus. Norvik es una aplicación de escritorio de código propio: el contrato queda publicado en `docs/ECOSISTEMA.md`.
- [x] CTEM-Nexus acepta los sobres `bia`, `soa` y `hallazgos` además de los formatos nativos, con pruebas de ida y vuelta en cada par y el esquema común ampliado.

**Aceptación:** cada par CTEM-Nexus ↔ herramienta tiene un fichero de ida, otro de vuelta y su prueba en los dos repositorios (tabla en `docs/ECOSISTEMA.md`).

**Estado: cerrada en 1.2.0.** KAIROS 1.1.0, Compliance Studio 2.2.0, ENS AD Auditor 0.4.0, Rosetta 2.11.1 y ARGOS 1.3.2 publicados. CTEM-Nexus: Vitest 171, Pytest 28, e2e 161/161 y axe 0 infracciones en 232 estados.

## Hacia la 2.0: auditoría del 11 de noviembre de 2026

> Sobre la 1.2.1 (commit `94dabe5`). Las antiguas fases 8 (superficie externa), 9 (gobierno) y 10 (riesgo en euros)
> se conservan enteras dentro de las fases 12, 14 y 15.

### Punto de partida, medido

Auditoría hecha sobre el código y sobre la app compilada, en Chromium a 1440×900. Las 187 pruebas de Vitest pasan y
la demo no da ni un error de consola. La interfaz, la accesibilidad y la explicación de la nota están a un nivel que
pocas herramientas abiertas tienen. Lo que la separa del máximo nivel no es el acabado: es lo que pasa cuando entran
datos de verdad, y hasta dónde llega el modelo.

| Qué | Medido | Qué significa |
|---|---|---|
| Guardado | Proyecto de 6.000 hallazgos importado por la interfaz: la app dice «importado», `localStorage` queda vacío y al recargar no hay nada. Sin aviso. Con 5.000 ocupa 5,15 MB, justo en el límite | **Pérdida de datos silenciosa** con un solo Nessus mediano. Es lo primero |
| Tabla de priorización | 5.000 hallazgos → 171.047 nodos en el DOM y 1,8 s por cada entrada a la vista | No hay virtualización: todo se pinta |
| «¿Y si…?» | 17,5 s con la pestaña congelada (5.000 hallazgos, 861 aristas). En el motor solo: 12 s; con 50.000, 56 s | El plan voraz recalcula rutas en el hilo principal |
| Movilización | 9,2 s en abrir con 5.000 hallazgos | Igual: sin límite ni trabajo en segundo plano |
| Motor de puntuación | 50.000 hallazgos y 2.000 activos en 352 ms | **El motor escala bien.** El problema es la interfaz y el guardado |
| Tope por fichero | `MAX_ITEMS = 5000` en los escáneres | Un Nessus de una red mediana pasa de ahí |
| Rutas | DFS con tope de 2.000 rutas y profundidad 8; los puntos de estrangulamiento salen de esa muestra | En un grafo grande el resultado depende del orden de exploración, no es exacto |
| Entrada del atacante | Solo «Internet → activo expuesto» | No modela la brecha asumida: un puesto con phishing, un proveedor, la VPN o un interno |
| Activos críticos | Solo criticidad 5 | No se puede decir «mi objetivo es este» sin tocar la criticidad |
| Severidad | Un número CVSS de 0 a 10 | Sin vector, sin CVSS 4.0, sin métricas de entorno |
| ATT&CK | Tabla escrita a mano, v14.1, 55 técnicas | Dos versiones mayores por detrás y sin sub-técnicas de nube ni identidad |
| Estándares que faltan | SSVC, VEX, CycloneDX y D3FEND: 0 apariciones en el código | Son el idioma en el que hoy se comunican las decisiones de vulnerabilidades |
| Datos en reposo | El proyecto se guarda y se exporta en claro | El fichero es, literalmente, el mapa para comprometer a la organización |
| API opcional | FastAPI sin autenticación; acepta `Origin: null` | Cualquier página abierta desde disco puede llamarla si está levantada |
| Paquete | HTML único de 1,1 MB (361 kB con gzip) | Correcto; no es un problema |

### Por qué este orden

El orden no es de gusto. La 1.3.0 arregla una pérdida de datos. La 1.4.0 va antes de crecer porque todo lo que viene
después hace el fichero más valioso para un atacante. La 1.5.0 y la 1.6.0 son el núcleo: sin grafo exacto y sin una
nota defendible, lo demás son importadores.

---

## Fase 8 · Datos reales (1.3.0) ✔

- [x] **Guardado en IndexedDB**, con migración automática desde `localStorage` y petición de almacenamiento
  persistente (`navigator.storage.persist()`). Los ajustes siguen en `localStorage`.
- [x] **Nunca más un guardado silencioso.** Si no se puede guardar, aviso fijo y visible con el motivo y el botón
  «Exportar proyecto ahora». Indicador permanente de «guardado hace N s» junto al nombre del proyecto.
- [x] **Tablas virtualizadas** en Priorización, Movilización, Alcance y Rutas (y en «¿Y si…?»): solo se pinta lo
  visible. Mantiene teclado, lector de pantalla (`aria-rowcount`, `aria-rowindex`) y la vista de tarjetas en móvil.
- [x] **Cálculo en un Web Worker** (motor, «¿Y si…?», comparación de perfiles, importadores): la interfaz no se congela;
  barra de progreso y botón de cancelar en las lecturas de más de 300 ms. El Worker guarda una copia del proyecto y
  recibe solo lo que cambia; las listas grandes viajan en trozos.
- [x] **Plan «¿Y si…?» incremental.** Rutas por arista contadas una vez y solo los candidatos que sostienen aristas:
  5.000 hallazgos de 17,5 s a 35 ms, con el mismo plan que antes en 300 grafos aleatorios.
- [x] **Quitar el tope de 5.000 por fichero**: Nessus y OpenVAS se analizan por partes, hasta 400 MB, y con más de
  20.000 entradas hay resumen previo («agrupar por complemento», «solo altas y críticas», «todo»). El tope de
  seguridad (250.000) se avisa. Nuclei en JSONL ya se leía por líneas.
- [x] **Agrupación de hallazgos**: el mismo CVE en 200 equipos es una fila que se despliega, no 200 filas (por defecto
  con más de 1.500 hallazgos).
- [x] Prueba de carga en la CI con un proyecto sintético de 50.000 hallazgos y 2.000 activos (`tests/carga_app.py`).

**Aceptación:** con 50.000 hallazgos, cada vista responde en menos de 300 ms y ninguna tarea bloquea el hilo
principal más de 100 ms; importar, recargar y exportar conserva todo; el e2e de carga está en la CI; axe sigue a 0.

**Resultado (contenedor de desarrollo, mediana de tres visitas):** las nueve vistas se pintan entre 30 y 145 ms;
importar, guardar y exportar 50.000 hallazgos no dejan ninguna tarea larga (antes: 765 y 520 ms); recargar, 0,3 s.
La tarea más larga al entrar en una vista ronda los 100 ms (Rutas e Inicio, de 4,1 s en el Mapa ATT&CK antes de la
fase): en el límite, no por debajo. La CI exige el doble (600 ms y 200 ms), porque sus máquinas van más lentas. Se
añadieron, por lo que destapó la prueba de carga, el grafo resumido (120 nodos como máximo) y el pintado progresivo
de los paneles secundarios.

## Fase 9 · Proteger el mapa (1.4.0)

- [ ] **Proyecto cifrado en reposo y al exportar** (WebCrypto, AES-GCM, clave derivada de una frase de paso).
  Opcional pero recomendado en el primer arranque con datos propios. Bloqueo por inactividad.
- [ ] **Exportación para compartir**: seudonimizar nombres de equipo, IP, dominios y responsables con un mapa
  reversible que se queda en el proyecto. Para enseñar un informe o pedir ayuda sin filtrar la red.
- [ ] **Integridad de lo que sale**: cada exportación e informe lleva su SHA-256 y un manifiesto; el importador
  avisa si el fichero se ha tocado.
- [ ] **API opcional con credencial**: token generado al arrancar, escucha solo en `127.0.0.1`, se retira
  `Origin: null` y se limita el tamaño y la tasa de peticiones.
- [ ] **Modelo de amenazas del propio producto** en `docs/THREAT-MODEL.md` (qué protege, de quién y qué no).
- [ ] **Entregas verificables**: SBOM CycloneDX de la herramienta, compilación reproducible, firma de la entrega y
  procedencia en la CI.
- [ ] **Pruebas de propiedades en los importadores** (entradas generadas, no solo ejemplos hostiles escritos a
  mano) para XML, JSON, JSONL y CSV.

**Aceptación:** con cifrado activo, ni IndexedDB ni el fichero exportado contienen un solo nombre de activo en
claro (lo comprueba una prueba); la API rechaza peticiones sin token; la entrega se verifica con un comando
documentado.

## Fase 10 · Grafo exacto (1.5.0)

- [ ] **Brecha asumida**: puntos de entrada configurables además de Internet (puesto de usuario comprometido,
  proveedor con acceso, VPN, red wifi, interno). Cada escenario tiene sus rutas y su índice.
- [ ] **Objetivos explícitos**: marcar «joyas de la corona» por activo o por función de negocio de KAIROS, sin
  depender de la criticidad 5.
- [ ] **Identidades como nodos**: usuarios, grupos, cuentas de servicio y plantillas de certificado dejan de
  plegarse sobre el equipo. Importadores de BloodHound CE y de AzureHound (Entra ID).
- [ ] **Alcanzabilidad de red**: segmentos y reglas entre ellos (a mano o deducidos de Nmap lanzados desde
  varios puntos). Un movimiento solo cuenta si la red lo permite.
- [ ] **Cálculo exacto, sin muestreo**: número de rutas por nodo y arista con programación dinámica sobre el
  grafo condensado; puntos de estrangulamiento por dominadores; **corte mínimo** (flujo máximo) para el conjunto
  más pequeño de correcciones que desconecta la entrada de cada objetivo.
- [ ] **Ruta más probable**, no solo la más corta: cada arista lleva la probabilidad de su hallazgo y la ruta
  se ordena por el producto.
- [ ] **Grafo legible con cientos de nodos**: agrupación por segmento o dominio, modo foco, minimapa y dibujo en
  lienzo cuando pasa de 300 nodos. Alternativa accesible en tabla, como ahora.
- [ ] Paridad TS ↔ Python de todos los algoritmos nuevos en el fichero dorado.

**Aceptación:** en un grafo sintético de 2.000 nodos y 10.000 aristas el resultado no depende del orden de
entrada (prueba con barajado); el corte mínimo coincide con el óptimo calculado por fuerza bruta en grafos
pequeños; el plan voraz actual se conserva y se compara contra el óptimo en la interfaz.

## Fase 11 · Priorización de referencia (1.6.0)

- [ ] **CVSS 4.0 y 3.1 por vector**: se guarda el vector, se calcula la nota en local y las métricas de entorno
  salen del activo (criticidad, exposición). Fuera el «CVSS equivalente estimado» cuando hay vector.
- [ ] **EPSS con fecha y percentil**, y aviso de catálogo caducado (más de 7 días).
- [ ] **Decisión SSVC** junto a la nota (Actuar, Atender, Seguir de cerca, Seguir), con el árbol visible. La
  nota ordena; SSVC dice qué hacer y aguanta una auditoría.
- [ ] **VEX**: importar OpenVEX y CSAF para marcar «no afectado» con su justificación, y exportar las
  decisiones propias («no explotable», «mitigado») como VEX.
- [ ] **Controles compensatorios que cuentan**: EDR, WAF, MFA o segmentación declarados por activo, con su
  evidencia, reducen la explotabilidad o cortan la arista. Correspondencia con D3FEND.
- [ ] **ATT&CK generado, no escrito**: la tabla sale del paquete STIX oficial con un script (versión vigente,
  sub-técnicas, nube e identidad), con la fecha en el informe.
- [ ] **La nota, contrastada con la historia**: con el histórico público de KEV y EPSS, medir cuántos días antes
  de entrar en KEV habría puesto la fórmula cada CVE en banda crítica o alta, frente a ordenar solo por CVSS.
  Publicar el resultado en `docs/SCORING.md`, salga como salga.
- [ ] **Análisis de sensibilidad**: qué hallazgos cambian de banda si un dato varía (EPSS ±0,1, criticidad ±1).
- [ ] **El índice no ve el volumen**: hoy es el peor hallazgo y la media de los cinco peores, así que 20
  hallazgos y 20.000 pueden dar la misma cifra. Añadir exposición agregada por activo crítico y tendencia.
- [ ] **Perfiles propios**: pesos editables con vista previa del cambio de orden y exportables.

**Aceptación:** vectores CVSS comprobados contra los ejemplos oficiales de FIRST; el árbol SSVC reproduce los
casos de la guía de CISA; ida y vuelta VEX sin pérdida; el contraste histórico es reproducible con un comando.

## Fase 12 · Superficie externa y amenaza (1.7.0)

Lo que el usuario trae de fuera, sin escanear nada desde la herramienta. De la antigua fase 8:

- [ ] **Superficie externa** por fichero: Shodan (JSON de `shodan download`), Censys (JSON de búsqueda), crt.sh (JSON de certificados) y listas de subdominios (subfinder, amass). Activos expuestos nuevos, servicios y CVE anunciados, certificados caducados o a punto y subdominios fuera del inventario («shadow IT»).
- [ ] **Ransomware**: el campo `knownRansomwareCampaignUse` del catálogo KEV se guarda y se señala en la ficha, en el panel y en el informe.
- [ ] **Inteligencia STIX 2.1**: un *bundle* (MISP, OpenCTI…) relaciona vulnerabilidades con actores y campañas; la ficha enseña quién explota cada CVE.
- [ ] Vista de exposición externa con su propia visualización (no anillos): mapa de servicios por puerto y antigüedad.

Además:

- [ ] **Nube**: Prowler y ScoutSuite (AWS, Azure, GCP), con sus hallazgos de identidad como aristas.
- [ ] **Identidad y correo en la nube**: Maester y ScubaGear (Microsoft 365, Entra ID); SPF, DKIM y DMARC por
  fichero de resultados.
- [ ] **Contenedores y Kubernetes**: kube-bench y Trivy de configuración.
- [ ] **Inventario de componentes**: importar SBOM CycloneDX y SPDX y cruzarlos con un volcado local de
  vulnerabilidades (OSV, EUVD) que trae el usuario.
- [ ] **Identificadores europeos**: mostrar el identificador de la base de datos europea de vulnerabilidades
  junto al CVE cuando el volcado lo traiga.

**Aceptación:** importadores con ejemplo y pruebas hostiles; el informe distingue la exposición externa; axe 0; cada importador nuevo (nube, identidad, Kubernetes, SBOM) con su ejemplo, sus pruebas hostiles y su paso e2e.

## Fase 13 · Validación y detección (1.8.0)

Hoy «validar» es una declaración del analista. El máximo nivel es evidencia, y además saber si te enterarías.

- [ ] **dark_spear como validador del ecosistema**: sobre `validaciones` (sonda, técnica ATT&CK, resultado,
  fecha, evidencia). Sus 60 sondas pasan a ser la prueba de que una ruta existe o está cortada.
- [ ] **Resultados de equipo morado**: importar ejecuciones de Atomic Red Team y de Caldera; cada técnica
  probada marca los hallazgos y aristas que cubre.
- [ ] **Cobertura de detección**: importar el conjunto de reglas (Sigma, Wazuh) y cruzarlo con las técnicas
  que aparecen en las rutas. Nuevo dato por arista: «se explota **y** no se detecta».
- [ ] **Mapa ATT&CK con dos capas**: exposición y detección, y exportación de ambas a Navigator.
- [ ] **Plan de validación**: para cada ruta, la lista ordenada de comprobaciones defensivas que la confirman o
  la descartan, con quién y cuándo.
- [ ] **Caducidad de la validación**: una prueba de hace 90 días deja de contar como vigente.
- [ ] Enlace con Blue-Jr: «practica la detección de esta técnica».

**Aceptación:** ida y vuelta dark_spear ↔ CTEM-Nexus probada en los dos repositorios; la matriz distingue las
cuatro combinaciones (expuesta o no, detectada o no) y una prueba lo comprueba con la demo.

## Fase 14 · Gobierno (1.9.0)

Para el comité de seguridad y para las auditorías de ENS, NIS2 y DORA. De la antigua fase 9:

- [ ] **Registro de riesgos** exportable a Excel (XLSX sin fórmulas) y CSV: riesgo, activo, responsable, tratamiento, aceptaciones con caducidad y controles afectados.
- [ ] **Burndown** de hallazgos abiertos por banda entre ciclos y **MTTR por responsable y por banda**, con su tendencia.
- [ ] **Calendario de plazos** (.ics) con la fecha límite de cada ticket, para importarlo en Outlook o Google Calendar.
- [ ] **Paquete para el comité**: una página con indicadores de NIS2 (art. 21) y DORA (art. 9 y 10), decisiones pendientes y riesgos aceptados que caducan.

Además:

- [ ] **Plazos legales de notificación**: cuando un hallazgo pasa a «explotado», cuenta atrás de NIS2 (alerta
  temprana a las 24 h, notificación a las 72 h, informe final al mes) y, para fabricantes, de la obligación de
  notificación del Reglamento de Ciberresiliencia. Orientativo, con la cita del artículo y sin texto protegido.
- [ ] **Traza de auditoría**: registro solo de adición de quién cambió qué y cuándo (estado, aceptación,
  validación), encadenado por hash y exportable. Es lo que pide un auditor de ENS o ISO.
- [ ] **Trabajo en equipo sin servidor**: fusionar dos copias del mismo proyecto (dos analistas, dos ficheros)
  con resolución de conflictos visible.
- [ ] **Comparar ciclos**: qué apareció, qué se cerró, qué se reabrió y qué cambió de banda entre dos instantáneas.
- [ ] **Acuerdos por responsable**: carga de trabajo, cumplimiento de plazos y hallazgos sin dueño.

**Aceptación:** el XLSX abre sin avisos en Excel y LibreOffice; el .ics se valida contra RFC 5545 en las pruebas; la cadena de la traza se verifica en una prueba y se rompe si se edita una entrada; la fusión de dos copias divergentes no pierde ningún cambio.

## Fase 15 · Euros, experiencia y alcance (2.0.0)

El puente entre lo técnico y la dirección: de un CVE a euros, con los datos que ya tiene el BIA. De la antigua fase 10:

- [ ] Desde **KAIROS**, el coste por hora de cada función y su RTO llegan a los activos que la soportan.
- [ ] **Pérdida esperada** por hallazgo, explicable y conservadora: probabilidad (EPSS, KEV y validación) × impacto (coste por hora × horas hasta el RTO o el MTPD), con rango bajo y alto y sin falsa precisión.
- [ ] Orden alternativo del plan por **euros evitados por hora de trabajo** y su efecto en «¿Y si…?».
- [ ] El informe para la dirección incluye la exposición económica y su método.

Además:

- [ ] **Rangos, no cifras**: simulación con semilla fija (resultado reproducible) y curva de pérdida
  excedida. Sin anillos.
- [ ] **Ciclo guiado**: las cinco fases de CTEM como recorrido con «qué te falta para cerrar este ciclo», y
  estado del ciclo siempre visible.
- [ ] **Modo comité**: presentación a pantalla completa de cinco pantallas generada del proyecto (índice,
  tendencia, tres decisiones, riesgos aceptados que caducan y euros).
- [ ] **Vistas guardadas y acciones en bloque** en Priorización y Movilización.
- [ ] **Instalable y sin conexión** como aplicación web, sin romper la regla de cero peticiones a terceros.
- [ ] **Línea de comandos** sobre el motor de Python: `ctem-nexus puntuar escaneo.nessus --proyecto p.json`,
  con salida JSON, SARIF y código de salida por umbral.
- [ ] **Acción de GitHub** y paquete en PyPI: la priorización como puerta de calidad en un despliegue.
- [ ] **Contrato de importadores**: plantilla, pruebas obligatorias y guía para que un tercero añada un formato.
- [ ] **Laboratorio de demostración realista**: un segundo ejemplo basado en un laboratorio público de
  directorio activo, con sus ficheros de origen, para enseñar el recorrido completo.

**Aceptación:** la fórmula está en `docs/SCORING.md`, con paridad TS ↔ Python y un ejemplo resuelto a mano en las pruebas; el motor de Python instalado desde PyPI da el mismo fichero dorado;
Lighthouse ≥ 95 en las cuatro categorías; axe 0 en todos los estados nuevos.

---

## Reglas que no cambian

- Todo funciona en un único HTML sin servidor y **sin peticiones a terceros** (lo verifica `npm run capturas` y el e2e).
- El motor TypeScript y su espejo en Python se cambian juntos: `npm run golden` + `pytest`.
- Todo dato importado se trata como hostil: XML sin DTD ni entidades, JSON sin claves de prototipo, CSV saneado contra inyección de fórmulas.
- Iconos solo de Lucide. Interfaz en español, con inglés completo como segundo idioma.
- **Ningún guardado falla en silencio**: si no se puede guardar, la interfaz lo dice y ofrece exportar el proyecto.
