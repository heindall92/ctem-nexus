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
| 1.2.0 | 7 · Ecosistema 2 | Las herramientas hermanas exportan e importan el sobre; bloque «Suite» común |
| 1.3.0 | 8 · Superficie externa y amenaza | Exposición externa (Shodan, Censys, crt.sh, subfinder), ransomware y STIX 2.1 |
| 1.4.0 | 9 · Gobierno de la remediación | Registro de riesgos, burndown, calendario de plazos (.ics) y cuadro para el comité |
| 1.5.0 | 10 · Riesgo en euros | Pérdida esperada por hallazgo con los costes del BIA de KAIROS |

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

- [ ] **KAIROS**: exporta su BIA como sobre `bia` e importa el riesgo de interrupción de CTEM-Nexus en la ficha de cada activo.
- [ ] **ENS Compliance Studio**: exporta su categoría y su SoA como sobre `soa` e importa la evidencia técnica de CTEM-Nexus (ya lo hace en su formato) y el sobre `hallazgos`.
- [ ] **ENS AD Auditor**: exporta sus alertas también como sobre `hallazgos`.
- [ ] Bloque **«Suite»** igual en «Acerca de» de las siete herramientas (web publicada y repositorio).
- [ ] CTEM-Nexus acepta los sobres nuevos además de los formatos nativos, con pruebas de ida y vuelta en cada par.

**Aceptación:** cada par CTEM-Nexus ↔ herramienta tiene un fichero de ida, otro de vuelta y su prueba en los dos repositorios.

## Fase 8 · Superficie externa y amenaza (1.3.0)

Lo que ve un atacante desde fuera, sin escanear nada desde la herramienta: el usuario trae las exportaciones.

- [ ] **Superficie externa** por fichero: Shodan (JSON de `shodan download`), Censys (JSON de búsqueda), crt.sh (JSON de certificados) y listas de subdominios (subfinder, amass). Activos expuestos nuevos, servicios y CVE anunciados, certificados caducados o a punto y subdominios fuera del inventario («shadow IT»).
- [ ] **Ransomware**: el campo `knownRansomwareCampaignUse` del catálogo KEV se guarda y se señala en la ficha, en el panel y en el informe.
- [ ] **Inteligencia STIX 2.1**: un *bundle* (MISP, OpenCTI…) relaciona vulnerabilidades con actores y campañas; la ficha enseña quién explota cada CVE.
- [ ] Vista de exposición externa con su propia visualización (no anillos): mapa de servicios por puerto y antigüedad.

**Aceptación:** importadores con ejemplo y pruebas hostiles; el informe distingue la exposición externa; axe 0.

## Fase 9 · Gobierno de la remediación (1.4.0)

Para el comité de seguridad y para las auditorías de ENS, NIS2 y DORA.

- [ ] **Registro de riesgos** exportable a Excel (XLSX sin fórmulas) y CSV: riesgo, activo, responsable, tratamiento, aceptaciones con caducidad y controles afectados.
- [ ] **Burndown** de hallazgos abiertos por banda entre ciclos y **MTTR por responsable y por banda**, con su tendencia.
- [ ] **Calendario de plazos** (.ics) con la fecha límite de cada ticket, para importarlo en Outlook o Google Calendar.
- [ ] **Paquete para el comité**: una página con indicadores de NIS2 (art. 21) y DORA (art. 9 y 10), decisiones pendientes y riesgos aceptados que caducan.

**Aceptación:** el XLSX abre sin avisos en Excel y LibreOffice; el .ics se valida contra RFC 5545 en las pruebas.

## Fase 10 · Riesgo en euros (1.5.0)

El puente definitivo entre lo técnico y la dirección: de un CVE a euros, con los datos que ya tiene el BIA.

- [ ] Desde **KAIROS**, el coste por hora de cada función y su RTO llegan a los activos que la soportan.
- [ ] **Pérdida esperada** por hallazgo, explicable y conservadora: probabilidad (EPSS, KEV y validación) × impacto (coste por hora × horas hasta el RTO o el MTPD), con rango bajo y alto y sin falsa precisión.
- [ ] Orden alternativo del plan por **euros evitados por hora de trabajo** y su efecto en «¿Y si…?».
- [ ] El informe para la dirección incluye la exposición económica y su método.

**Aceptación:** la fórmula está en `docs/SCORING.md`, con paridad TS ↔ Python y un ejemplo resuelto a mano en las pruebas.

---

## Reglas que no cambian

- Todo funciona en un único HTML sin servidor y **sin peticiones a terceros** (lo verifica `npm run capturas` y el e2e).
- El motor TypeScript y su espejo en Python se cambian juntos: `npm run golden` + `pytest`.
- Todo dato importado se trata como hostil: XML sin DTD ni entidades, JSON sin claves de prototipo, CSV saneado contra inyección de fórmulas.
- Iconos solo de Lucide. Interfaz en español, con inglés completo como segundo idioma.
