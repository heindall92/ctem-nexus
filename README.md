<p align="center">
  <img src="docs/assets/readme/cabecera.svg" alt="CTEM-Nexus: del escaneo al plan de remediación, en tu navegador. CVSS, EPSS, CISA KEV, rutas de ataque y puntos de estrangulamiento" width="100%">
</p>

<p align="center">
  <b>Del escaneo al plan de remediación con plazos, en tu navegador y sin servidor.</b><br>
  Gestión continua de la exposición a amenazas (CTEM): prioriza con cálculo explicable, corta las rutas de ataque por donde más rinde y lleva la evidencia al GRC.
</p>

<p align="center">
  <a href="https://heindall92.github.io/ctem-nexus/"><img alt="Abrir CTEM-Nexus" src="https://img.shields.io/badge/ABRIR-heindall92.github.io%2Fctem--nexus-3DDCC4?style=for-the-badge"/></a>
  <a href="docs/GUIA.md"><img alt="Guía en 10 minutos" src="https://img.shields.io/badge/GU%C3%8DA-de%20un%20Nmap%20a%20un%20plan%20con%20SLA-6D5DFC?style=for-the-badge"/></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia GPLv2" src="https://img.shields.io/badge/LICENCIA-GPLv2-4169A1?style=flat"/></a>
  <img alt="Gartner CTEM" src="https://img.shields.io/badge/Gartner-CTEM%205%20fases-E07B39?style=flat"/>
  <img alt="CISA KEV + EPSS" src="https://img.shields.io/badge/se%C3%B1ales-CVSS%20%C2%B7%20EPSS%20%C2%B7%20KEV-D9534F?style=flat"/>
  <img alt="MITRE ATT&CK" src="https://img.shields.io/badge/MITRE-ATT%26CK%20%C2%B7%20Navigator-C2410C?style=flat"/>
  <img alt="Ingesta de escáneres" src="https://img.shields.io/badge/ingesta-Nessus%20%C2%B7%20OpenVAS%20%C2%B7%20Nuclei%20%C2%B7%20Trivy%20%C2%B7%20SARIF%20%C2%B7%20Nmap%20%C2%B7%20BloodHound-3DDCC4?style=flat"/>
  <img alt="React 19 + TypeScript" src="https://img.shields.io/badge/React%2019-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white"/>
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white"/>
  <img alt="FastAPI opcional" src="https://img.shields.io/badge/API-FastAPI%20(opcional)-009688?style=flat&logo=fastapi&logoColor=white"/>
  <img alt="Un solo HTML" src="https://img.shields.io/badge/un%20solo-HTML%20sin%20servidor-2E8B57?style=flat"/>
  <img alt="Pruebas 100% OK" src="https://img.shields.io/badge/pruebas-Vitest%20167%20%C2%B7%20Pytest%2027%20%C2%B7%20e2e%20158-2E8B57?style=flat"/>
  <img alt="Ecosistema GRC" src="https://img.shields.io/badge/ecosistema-Rosetta%20%C2%B7%20KAIROS%20%C2%B7%20Studio%20%C2%B7%20AD%20Auditor-6D5DFC?style=flat"/>
  <img alt="Iconos Lucide" src="https://img.shields.io/badge/iconos-Lucide-F56565?style=flat&logo=lucide&logoColor=white"/>
</p>

<p align="center">
  <img src="docs/screenshots/01-panel.png" alt="Panel de exposición de CTEM-Nexus con franjas por activo, índice de exposición y tres acciones para hoy" width="880"/>
</p>

## <img src="docs/assets/icons/crosshair.svg" width="20" height="20" valign="middle"/> Qué problema resuelve

Los escáneres devuelven cientos de CVE sin decir cuál importa hoy. CTEM-Nexus los cruza con la **explotación real** (CISA KEV, EPSS), la **criticidad de negocio** (también desde el BIA) y las **rutas de ataque** hacia las joyas de la corona, y devuelve un plan ordenado con plazos, tickets e informe para la dirección. Todo en un único HTML local: **ningún dato sale del equipo**.

**Demo en vivo:** <https://heindall92.github.io/ctem-nexus/> (pulsa *Cargar datos de demo*). **Sin conexión:** descarga [`ctem-nexus.html`](ctem-nexus.html) y ábrelo con doble clic.

<div align="center">

## `$ cat ctem-nexus.yaml`

<table>
  <thead>
    <tr>
      <th colspan="2" align="left"><code>ctem-nexus:~$ cat ctem-nexus.yaml</code></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td width="50%" valign="top"><code>├─</code> <img src="docs/assets/icons/waypoints.svg" width="16" height="16" alt="" valign="middle"/> <code>ctem_fases:</code><br><br>
        <img src="docs/assets/stack/gartner.svg" height="48" alt="Gartner CTEM">
        <img src="docs/assets/stack/nmap.svg" height="48" alt="Nmap XML">
        <img src="docs/assets/stack/cisa.svg" height="48" alt="CISA KEV + EPSS"><br>
        <sub><code>1. Alcance · 2. Descubrimiento · 3. Priorización · 4. Validación · 5. Movilización</code></sub>
      </td>
      <td width="50%" valign="top"><code>├─</code> <img src="docs/assets/icons/calculator.svg" width="16" height="16" alt="" valign="middle"/> <code>motor_y_analisis:</code><br><br>
        <img src="docs/assets/icons/calculator.svg" height="42" alt="Scoring explicable">
        <img src="docs/assets/icons/network.svg" height="42" alt="Grafo SVG">
        <img src="docs/assets/icons/crown.svg" height="42" alt="Joyas de la corona">
        <img src="docs/assets/icons/flame.svg" height="42" alt="Choke Points"><br>
        <sub><code>Scoring 0–100 · Grafo de ataque SVG · Joyas (crit. 5) · Puntos de estrangulamiento</code></sub>
      </td>
    </tr>
    <tr>
      <td valign="top"><code>├─</code> <img src="docs/assets/icons/sparkles.svg" width="16" height="16" alt="" valign="middle"/> <code>frontend_app:</code><br><br>
        <img src="docs/assets/stack/react.svg" height="48" alt="React 19">
        <img src="docs/assets/stack/typescript.svg" height="48" alt="TypeScript">
        <img src="docs/assets/stack/tailwind.svg" height="48" alt="Tailwind CSS 4">
        <img src="docs/assets/stack/lucide.svg" height="48" alt="Lucide"><br>
        <sub><code>React 19 · TypeScript estricto · Tailwind CSS 4 · Single-File HTML</code></sub>
      </td>
      <td valign="top"><code>├─</code> <img src="docs/assets/icons/settings.svg" width="16" height="16" alt="" valign="middle"/> <code>backend_api:</code><br><br>
        <img src="docs/assets/stack/python.svg" height="48" alt="Python 3.12">
        <img src="docs/assets/stack/fastapi.svg" height="48" alt="FastAPI">
        <img src="docs/assets/stack/nodejs.svg" height="48" alt="Node.js"><br>
        <sub><code>Python 3.12 · FastAPI · Pydantic v2 (camelCase) · Ingesta Nmap multipart</code></sub>
      </td>
    </tr>
    <tr>
      <td valign="top"><code>├─</code> <img src="docs/assets/icons/check-check.svg" width="16" height="16" alt="" valign="middle"/> <code>pruebas_calidad:</code><br><br>
        <img src="docs/assets/stack/vitest.svg" height="48" alt="Vitest">
        <img src="docs/assets/stack/pytest.svg" height="48" alt="Pytest"><br>
        <sub><code>Vitest 167 pruebas · Pytest 27 pruebas · e2e 158 · axe-core 0 infracciones en 232 estados · Paridad exacta TS ↔ Python (golden-demo, 3 perfiles y 4 políticas de plazos)</code></sub>
      </td>
      <td valign="top"><code>╰─</code> <img src="docs/assets/icons/shield-check.svg" width="16" height="16" alt="" valign="middle"/> <code>seguridad_privacidad:</code><br><br>
        <img src="docs/assets/stack/csp.svg" height="48" alt="CSP estricta"><br>
        <sub><code>Cero terceros · CSP con hashes · Local-first · Saneado contra inyección de fórmulas</code></sub>
      </td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2"><code>version: 1.1.0&nbsp;&nbsp;·&nbsp;&nbsp;motor: TS + FastAPI&nbsp;&nbsp;·&nbsp;&nbsp;Gartner CTEM · MITRE ATT&amp;CK · ecosistema GRC&nbsp;&nbsp;·&nbsp;&nbsp;pruebas: Vitest 167 · Pytest 27 · e2e 158&nbsp;&nbsp;·&nbsp;&nbsp;licencia: GPLv2</code></td>
    </tr>
  </tfoot>
</table>

</div>

---

## Índice

- [Cómo se usa en cinco pasos](#cómo-se-usa-en-cinco-pasos)
- [Fórmula](#fórmula)
- [Privacidad y seguridad](#privacidad-y-seguridad)
- [Ecosistema](#ecosistema)
- [Capturas](#capturas)
- [Importadores](#importadores)
- [Desarrollo](#desarrollo)
- [Calidad y pruebas](#calidad-y-pruebas)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Hoja de ruta](#hoja-de-ruta)
- [Licencia e independencia](#licencia-e-independencia)
- [Autor](#autor)

## <img src="docs/assets/icons/route.svg" width="20" height="20" valign="middle"/> Cómo se usa en cinco pasos

Las cinco fases del ciclo CTEM de Gartner. La [guía práctica](docs/GUIA.md) las recorre con capturas y los ficheros de ejemplo (Ayuda → Ingesta de datos → Ficheros de ejemplo).

| Paso | Vista | Qué haces |
|---|---|---|
| **1. Alcance** | Alcance y activos | Activos con su criticidad 1–5 (las **joyas de la corona** son la 5) y rangos en alcance. Importa un **Nmap XML** o trae la criticidad del **BIA de KAIROS**. |
| **2. Descubrimiento** | Priorización | Importa **Nessus, OpenVAS, Nuclei, Trivy, SARIF, BloodHound** o **ENS AD Auditor** con vista previa y sin duplicar entre fuentes, y aplica **CISA KEV** y **FIRST EPSS**. |
| **3. Priorización** | Priorización | Puntuación 0–100 explicada factor a factor, con perfiles **General, OT/industrial y Banca**. Ficha con guía paso a paso, técnicas ATT&CK, controles afectados y **riesgo aceptado** con caducidad. |
| **4. Validación** | Rutas de ataque · Mapa ATT&CK · Priorización | Grafo de rutas hacia las joyas y **puntos de estrangulamiento**; resultados de **OWASP ZAP, Burp Suite, PingCastle y Certipy**; **evidencia de validación** (quién, cuándo, técnica y prueba) y ***retest***: un mitigado queda pendiente hasta que un escaneo posterior deja de verlo. Matriz ATT&CK con capa para Navigator. |
| **5. Movilización** | ¿Y si…? · Movilización · Ecosistema | Plan que más rutas rompe, **cumplimiento de SLA** (también por categoría ENS), ciclos con tendencia, informe para la dirección y tickets para **Jira** y **GitHub**. La evidencia sale hacia **Rosetta** y **Compliance Studio**. |

## <img src="docs/assets/icons/calculator.svg" width="20" height="20" valign="middle"/> Fórmula

```
puntuación = severidad (CVSS × 30) + explotabilidad (máx. de KEV, exploit público 0,6 y EPSS × 25)
           + criticidad del activo × 20 + exposición a Internet × 10 + proximidad a una joya × 15
           (+5 si está validado; × 0,25 si no es explotable)
```

| Banda | Puntuación | Plazo estándar | ENS ALTA |
|---|---|---:|---:|
| Crítica | ≥ 80 | 3 días | 2 días |
| Alta | ≥ 60 | 14 días | 7 días |
| Media | ≥ 40 | 30 días | 21 días |
| Baja | < 40 | 90 días | 60 días |

Los pesos cambian con el perfil (OT/industrial, Banca) y los plazos con la categoría ENS. El motor TypeScript tiene un gemelo en Python (API FastAPI opcional) y los dos dan exactamente lo mismo en el fichero dorado. Detalle completo en [SCORING.md](docs/SCORING.md).

## <img src="docs/assets/icons/shield-check.svg" width="20" height="20" valign="middle"/> Privacidad y seguridad

- **Local-first:** los escaneos, el proyecto y los ficheros del ecosistema se procesan en el navegador y se guardan en su almacenamiento local. Las integraciones son por fichero: nada se envía a otra herramienta ni a ningún servidor.
- **Cero dependencias externas en tiempo de ejecución:** Fuentes autoalojadas e incrustadas en base64; sin CDNs externos, sin Google Analytics y sin telemetría.
- **Política de Seguridad de Contenido (CSP) estricta:** `default-src 'none'`, estilos y scripts autorizados exclusivamente por hash SHA-256, y conexiones limitadas a `localhost` para la API opcional.
- **Protección contra inyección de fórmulas CSV:** Toda celda que comience por caracteres peligrosos (`=`, `+`, `-`, `@`, `\t`, `\r`) es neutralizada con apóstrofe inicial en la interfaz y en el backend.
- **Análisis defensivo:** Sanitización de claves prohibidas (`__proto__`, `constructor`, `prototype`) al leer proyectos y exportaciones de BloodHound, y rechazo de XML con entidades o DTD (XXE, «billion laughs») con un tamaño máximo por fichero. Los secretos que detecta Trivy se registran por regla, fichero y línea, nunca por su valor. Política completa en [SECURITY.md](SECURITY.md).

## <img src="docs/assets/icons/blocks.svg" width="20" height="20" valign="middle"/> Ecosistema

CTEM-Nexus es el puente entre lo ofensivo y el GRC de un conjunto de herramientas abiertas y locales. Se comunican por fichero, con un sobre común (`yrd-ecosistema`) que tiene [esquema JSON](shared/schemas/yrd-ecosistema.schema.json) y [especificación](docs/ECOSISTEMA.md).

| Herramienta | CTEM-Nexus recibe | CTEM-Nexus envía |
|---|---|---|
| [Rosetta Multinorma](https://github.com/heindall92/rosetta_multinorma) | Estado de los 152 controles: señala los implantados con exposición crítica abierta | Hallazgos por control con identificadores ENS, ISO/IEC 27001, NIS2, NIST CSF 2.0 y DORA (regla CO-23 en Rosetta) |
| [ENS Compliance Studio](https://github.com/heindall92/grc_ens_compliance_studio) | Categoría del sistema → plazos ENS | Evidencia técnica en el formato que Studio ya importa |
| [KAIROS](https://github.com/heindall92/kairos) | Funciones con RTO y MTPD → criticidad de los activos, también por dependencias | Riesgo de interrupción de cada activo del BIA |
| [ENS AD Auditor](https://github.com/heindall92/ens_ad-auditor) | Alertas de directorio activo con técnica ATT&CK y medidas `op.acc` | — |
| [Norvik](https://github.com/heindall92/Norvik_Gobernanza) | Responsables y roles | Indicadores del ciclo (índice, SLA, MTTR, KEV, rutas e histórico) |
| [ARGOS](https://github.com/heindall92/argos-grc) | — | «Practica esto en ARGOS» en cada hallazgo |

## <img src="docs/assets/icons/camera.svg" width="20" height="20" valign="middle"/> Capturas

### Escritorio · modo oscuro

| | |
|---|---|
| ![Panel en oscuro](docs/screenshots/01-panel.png) | ![Priorización en oscuro](docs/screenshots/02-priorizacion.png) |
| **Panel central de exposición y ciclo CTEM** | **Descubrimiento y priorización explicable** |
| ![Detalle en oscuro](docs/screenshots/03-detalle-hallazgo.png) | ![Rutas de ataque en oscuro](docs/screenshots/04-rutas-de-ataque.png) |
| **Detalle analítico y desglose de factores** | **Grafo de rutas y puntos de estrangulamiento** |
| ![Movilización en oscuro](docs/screenshots/05-movilizacion.png) | ![Alcance en oscuro](docs/screenshots/06-alcance.png) |
| **Movilización, informes ejecutivos y tickets** | **Alcance, activos críticos y subredes** |
| ![Mapa ATT&CK en oscuro](docs/screenshots/07-mapa-attack.png) | ![Simulación en oscuro](docs/screenshots/08-simulacion.png) |
| **Mapa ATT&CK de exposición** | **¿Y si…? con el plan simulado** |
| ![Ecosistema en oscuro](docs/screenshots/09-ecosistema.png) | |
| **Ecosistema: intercambio con las herramientas hermanas** | |

<details>
<summary><b>Modo claro y móvil</b></summary>

### Escritorio · modo claro

| | |
|---|---|
| ![Panel en claro](docs/screenshots/claro-01-panel.png) | ![Priorización en claro](docs/screenshots/claro-02-priorizacion.png) |
| **Panel central de exposición y ciclo CTEM** | **Descubrimiento y priorización explicable** |
| ![Detalle en claro](docs/screenshots/claro-03-detalle-hallazgo.png) | ![Rutas de ataque en claro](docs/screenshots/claro-04-rutas-de-ataque.png) |
| **Detalle analítico y desglose de factores** | **Grafo de rutas y puntos de estrangulamiento** |
| ![Movilización en claro](docs/screenshots/claro-05-movilizacion.png) | ![Alcance en claro](docs/screenshots/claro-06-alcance.png) |
| **Movilización, informes ejecutivos y tickets** | **Alcance, activos críticos y subredes** |
| ![Mapa ATT&CK en claro](docs/screenshots/claro-07-mapa-attack.png) | ![Simulación en claro](docs/screenshots/claro-08-simulacion.png) |
| **Mapa ATT&CK de exposición** | **¿Y si…? con el plan simulado** |

### Móvil · modo oscuro

| | |
|---|---|
| <img src="docs/screenshots/movil-01-panel.png" alt="Panel en el móvil, modo oscuro" width="280"/> | <img src="docs/screenshots/movil-02-priorizacion.png" alt="Priorización en el móvil, modo oscuro" width="280"/> |
| **Panel** | **Priorización** |
| <img src="docs/screenshots/movil-03-detalle-hallazgo.png" alt="Detalle de un hallazgo en el móvil, modo oscuro" width="280"/> | <img src="docs/screenshots/movil-04-rutas-de-ataque.png" alt="Rutas de ataque en el móvil, modo oscuro" width="280"/> |
| **Detalle de un hallazgo** | **Rutas de ataque** |
| <img src="docs/screenshots/movil-05-movilizacion.png" alt="Movilización en el móvil, modo oscuro" width="280"/> | <img src="docs/screenshots/movil-06-alcance.png" alt="Alcance en el móvil, modo oscuro" width="280"/> |
| **Movilización** | **Alcance y activos** |
| <img src="docs/screenshots/movil-07-mapa-attack.png" alt="Mapa ATT&CK en el móvil, modo oscuro" width="280"/> | <img src="docs/screenshots/movil-08-simulacion.png" alt="Simulación en el móvil, modo oscuro" width="280"/> |
| **Mapa ATT&CK** | **¿Y si…?** |

### Móvil · modo claro

| | |
|---|---|
| <img src="docs/screenshots/movil-claro-01-panel.png" alt="Panel en el móvil, modo claro" width="280"/> | <img src="docs/screenshots/movil-claro-02-priorizacion.png" alt="Priorización en el móvil, modo claro" width="280"/> |
| **Panel** | **Priorización** |
| <img src="docs/screenshots/movil-claro-03-detalle-hallazgo.png" alt="Detalle de un hallazgo en el móvil, modo claro" width="280"/> | <img src="docs/screenshots/movil-claro-04-rutas-de-ataque.png" alt="Rutas de ataque en el móvil, modo claro" width="280"/> |
| **Detalle de un hallazgo** | **Rutas de ataque** |
| <img src="docs/screenshots/movil-claro-05-movilizacion.png" alt="Movilización en el móvil, modo claro" width="280"/> | <img src="docs/screenshots/movil-claro-06-alcance.png" alt="Alcance en el móvil, modo claro" width="280"/> |
| **Movilización** | **Alcance y activos** |
| <img src="docs/screenshots/movil-claro-07-mapa-attack.png" alt="Mapa ATT&CK en el móvil, modo claro" width="280"/> | <img src="docs/screenshots/movil-claro-08-simulacion.png" alt="Simulación en el móvil, modo claro" width="280"/> |
| **Mapa ATT&CK** | **¿Y si…?** |

</details>

## <img src="docs/assets/icons/file-search.svg" width="20" height="20" valign="middle"/> Importadores

| Fuente | Formato | Qué se aprovecha |
|---|---|---|
| Nessus | `.nessus` (XML v2) | Hosts, CVE, CVSS v3, exploit disponible, marca KEV y EPSS si vienen |
| OpenVAS / Greenbone | Informe XML | Resultados con QoD, CVE de los NVT; descarta «Log» y duplicados del informe anidado |
| Nuclei | `-jsonl` o `-json-export` | Plantilla, CVE, CVSS, EPSS y etiquetas `kev` |
| Trivy | `--format json` | Vulnerabilidades por paquete, configuración y secretos (**nunca** guarda el valor del secreto) |
| SARIF 2.1.0 | Semgrep, CodeQL… | Regla, `security-severity`, fichero y línea; el repositorio pasa a ser un activo |
| CISA KEV | `known_exploited_vulnerabilities.json` | Marca KEV (solo añade, nunca quita la del analista) |
| FIRST EPSS | `epss_scores-AAAA-MM-DD.csv(.gz)` | EPSS más alto entre los CVE del hallazgo |
| OWASP ZAP | Informe JSON tradicional (`-quickout zap.json`) | Alertas por URL con riesgo, confianza y CWE; omite informativos y falsos positivos y **nunca** guarda la carga del ataque |
| Burp Suite | Exportación XML de *issues* | Gravedad, certeza, ubicación y CWE; acepta su DTD inerte (las entidades se siguen rechazando) y **nunca** guarda peticiones ni respuestas |
| PingCastle | Informe XML *healthcheck* | Reglas con puntos → hallazgos del dominio con guía y técnica ATT&CK |
| Certipy | `certipy find -json` | Plantillas y CA vulnerables (ESC1 a ESC16) y quién puede inscribirse |

```bash
nuclei -l objetivos.txt -jsonl -o nuclei.jsonl
trivy image --format json -o trivy.json registro/app:1.0
semgrep --sarif -o semgrep.sarif
```

Un hallazgo existente se reconoce por activo y CVE (también los relacionados) o, sin CVE, por título o guía específica: importar dos veces el mismo fichero no duplica nada. XML sin DTD ni entidades, JSON sin claves de prototipo y 60 MB como máximo por fichero.

**Nmap XML (`-oX`).**
- **Identificación de Activos:** Extrae IPs activas, nombres de host DNS y puertos abiertos como etiquetas de contexto.
- **Inferencia de Tipo y Criticidad:**
  - Si detecta Kerberos (88) o LDAP (389/636), clasifica el nodo como `controlador_dominio` y asigna **criticidad 5 (Joya de la corona)**.
  - Si detecta bases de datos (PostgreSQL, MySQL, MSSQL, Oracle), clasifica como `base_datos` (criticidad 4).
  - Si la IP no pertenece a rangos privados (RFC 1918), clasifica como `perimetro` y marca `internetExposed = true`.
- **Generación de Hallazgos y Rutas:**
  - Extrae CVEs presentes en la salida de scripts NSE (ej. `CVE-2023-4966`, `CVE-2021-44228`).
  - Detecta protocolos en texto plano (Telnet en puerto 23) y exposición de SMB (puerto 445).
  - Sugiere automáticamente los rangos de subred descubiertos para la fase de Alcance.

## <img src="docs/assets/icons/blocks.svg" width="20" height="20" valign="middle"/> Ecosistema: Rosetta, Compliance Studio, KAIROS, ENS AD Auditor, Norvik y ARGOS

CTEM-Nexus es el puente entre lo ofensivo y el GRC. Las herramientas no se llaman por red: el usuario mueve ficheros con un sobre común (`yrd-ecosistema`, versión 1), con [esquema JSON](shared/schemas/yrd-ecosistema.schema.json) y [especificación](docs/ECOSISTEMA.md). Cada importación enseña qué cambiará antes de aplicarlo.

| Herramienta | CTEM-Nexus recibe | CTEM-Nexus envía |
|---|---|---|
| [Rosetta Multinorma](https://github.com/heindall92/rosetta_multinorma) | Estado de los 152 controles: si uno figura como implantado con hallazgos críticos o altos abiertos, se marca como contradicción | Hallazgos abiertos por control, con identificadores ENS, ISO/IEC 27001, NIS2, NIST CSF 2.0 y DORA (Rosetta los enseña y lanza la regla CO-23) |
| [ENS Compliance Studio](https://github.com/heindall92/grc_ens_compliance_studio) | Categoría del sistema → plazos de corrección (ENS BÁSICA, MEDIA o ALTA) | Evidencia técnica en el formato que Studio ya importa |
| [KAIROS](https://github.com/heindall92/kairos) | Funciones con RTO y MTPD → criticidad 1–5 de los activos que las soportan, también por dependencias | Riesgo de interrupción de cada activo del BIA |
| [ENS AD Auditor](https://github.com/heindall92/ens_ad-auditor) | Alertas de directorio activo → hallazgos de identidad con técnica ATT&CK y medidas `op.acc` | — |
| [Norvik](https://github.com/heindall92/Norvik_Gobernanza) | Responsables y roles (sobre o CSV) | Indicadores del ciclo (índice, SLA, MTTR, KEV, rutas e histórico) |
| [ARGOS](https://github.com/heindall92/argos-grc) | — | «Practica esto en ARGOS» en cada hallazgo |

La ida y vuelta con Rosetta se prueba en los dos repositorios con el mismo par de ficheros, y todos los ejemplos de [`shared/samples/ecosistema/`](shared/samples/ecosistema/) se validan contra el esquema.


## <img src="docs/assets/icons/terminal.svg" width="20" height="20" valign="middle"/> Desarrollo

```bash
# Interfaz (Node.js ≥ 20)
cd frontend && npm ci
npm run dev          # http://localhost:5173
npm test             # Vitest: motor, importadores, ecosistema y coherencia del repositorio
npm run build        # dist/ (Pages) y ctem-nexus.html autocontenido con CSP por hashes
npm run golden       # regenera el fichero dorado si cambia la fórmula (y después: pytest)
npm run capturas     # capturas de docs/screenshots e informe PDF de ejemplo
npm run guia         # capturas de la guía práctica

# API opcional (Python ≥ 3.11)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
uvicorn app.main:app --reload --port 8000   # Swagger en http://127.0.0.1:8000/docs

# Navegador (Playwright): e2e y accesibilidad sobre el HTML autocontenido
pip install -r tests/requirements.txt
python tests/e2e_app.py && python tests/a11y_app.py
```

Con la API arrancada, **Ajustes y datos › Motor de cálculo › Usar la API**. Si no responde, la app vuelve al motor local. Arquitectura y decisiones en [ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
ctem-nexus/
├── ctem-nexus.html            # Aplicación autocontenida (abrir con doble clic)
├── frontend/
│   ├── src/
│   │   ├── engine/            # Motor TS sin DOM: scoring, grafo, importadores, ATT&CK, simulación, SLA, ecosistema, tests
│   │   ├── components/        # Shell, AttackGraph, NmapUploader, UI
│   │   ├── views/             # Panel, Alcance, Priorización, Rutas, Mapa ATT&CK, ¿Y si…?, Movilización, Ecosistema, Ajustes
│   │   ├── store/             # Estado reactivo con persistencia local (Zustand)
│   │   └── index.css          # Tokens de diseño, estética oscura y estilos de impresión
│   ├── scripts/               # Postbuild (CSP), iconos, capturas y capturas de la guía
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI + CORS local
│   │   ├── models.py          # Modelos Pydantic v2 en camelCase
│   │   ├── routers/           # scoping, discovery (Nmap XML/CSV), prioritization, validation, mobilization
│   │   └── engine/            # prioritization.py (lógica idéntica al motor TS)
│   └── tests/                 # Pytest (pruebas unitarias, paridad y endpoints)
├── shared/
│   ├── golden-demo.json       # Fichero dorado para verificar paridad TS ↔ Python
│   ├── samples/               # Ficheros de ejemplo de cada importador y del ecosistema
│   └── schemas/               # Esquema JSON del sobre yrd-ecosistema
├── ROADMAP.md · CHANGELOG.md · SECURITY.md · CONTRIBUTING.md
├── docs/
│   ├── GUIA.md                # De un Nmap a un plan de remediación con SLA
│   ├── ECOSISTEMA.md          # Intercambio con las herramientas hermanas
│   ├── ARCHITECTURE.md        # Documentación de arquitectura
│   ├── SCORING.md             # Especificación matemática del cálculo de riesgo
│   ├── screenshots/ · guia/   # Capturas de la interfaz y de la guía
│   └── assets/                # Iconos Lucide, insignias del stack y cabecera del README (readme/)
└── .github/workflows/         # CI/CD y despliegue en GitHub Pages
```

## <img src="docs/assets/icons/check-check.svg" width="20" height="20" valign="middle"/> Calidad y pruebas

- **Motor TypeScript:** 167 pruebas con Vitest: fórmula y grafo, importadores con casos hostiles (ZAP, Burp con su DTD inerte, PingCastle y Certipy incluidos), validación ofensiva y *retest*, deduplicación, KEV/EPSS, perfiles y políticas de plazos, riesgo aceptado, ATT&CK y capa de Navigator, simulación, SLA, exportaciones, ecosistema (sobre común, KAIROS con dependencias, ENS AD Auditor, Studio, Rosetta de ida y vuelta, Norvik), correspondencias sin texto ISO, diccionarios ES/EN y coherencia del repositorio.
- **Motor Python y API:** 27 pruebas con Pytest: endpoints, Nmap multipart, XML con entidades, fórmulas CSV, paridad con el fichero dorado en los tres perfiles y las cuatro políticas de plazos, y validación de los sobres de ejemplo contra el esquema JSON.
- **Navegador (e2e):** 158 comprobaciones con Playwright sobre el HTML autocontenido: CSP, red bloqueada, todas las vistas e importadores (también ZAP, Burp, PingCastle y Certipy), validación registrada y *retest*, grafo, simulación, informe en PDF, Jira y GitHub validados, vista Ecosistema con los cinco importadores y las cuatro exportaciones, ficheros de ejemplo descargables, inglés completo en 18 pantallas y móvil sin recortes.
- **Accesibilidad:** axe-core (WCAG 2.2 A/AA) en 232 estados (vistas, diálogos, formularios de validación y aceptación, vistas previas de importación, ayuda y búsqueda; claro y oscuro; 1440 y 390 px) y barrido de contraste propio: **0 infracciones**.
- **Lighthouse 12** (con gzip, como en Pages; mediana de tres pasadas en la 1.0.0): rendimiento **96** · accesibilidad 100 · buenas prácticas 100 · SEO 100. Las vistas se cargan bajo demanda; el HTML autocontenido, que lo lleva todo en un fichero, da 94.

## <img src="docs/assets/icons/list-checks.svg" width="20" height="20" valign="middle"/> Limitaciones conocidas

- Interfaz, ayuda, informes, tickets y guías de remediación en español e inglés. Los datos del proyecto (incluido el caso de ejemplo, en español) se muestran tal cual se registraron.
- Hay siete acentos: rosa, solar, glaciar, orquídea (malva), verde bosque, azul eléctrico y rojo. El modo claro arranca en azul eléctrico; orquídea se aplica al elegirla.
- La barra lateral es de escritorio. En pantallas estrechas la navegación pasa a la barra inferior.
- Los importadores interpretan el fichero en el navegador. No ejecutan el escáner, no consultan el directorio ni descargan catálogos: KEV y EPSS los aportas tú.
- Las técnicas ATT&CK se infieren por heurística (guía, título y CVE) sobre un catálogo de 53 técnicas Enterprise v14 (AD CS, DCSync y GPO incluidas); el analista puede fijarlas a mano en cada hallazgo.
- El motor de puntuación no cambia con el tema ni con el idioma. La fórmula publicada en este README es la del código.

- Los plazos por categoría ENS son una propuesta orientativa: el ENS no fija días. Puedes volver a la política estándar en un clic.
- Norvik (escritorio) aún no exporta el sobre de responsables; el contrato está publicado y se acepta un CSV equivalente.

## <img src="docs/assets/icons/route.svg" width="20" height="20" valign="middle"/> Hoja de ruta

Las fases 0 a 6 están cerradas: de la higiene del repositorio a la 1.1.0 con validación ofensiva y *retest*. Lo que viene (ecosistema 2, superficie externa, gobierno y riesgo en euros) está en [ROADMAP.md](ROADMAP.md); los cambios de cada versión, en [CHANGELOG.md](CHANGELOG.md), y cómo colaborar, en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia e independencia

Distribuido bajo la licencia [GPL-2.0](LICENSE).

**Independencia.** CTEM-Nexus es un proyecto personal de código abierto. No está afiliado a Gartner, MITRE, CISA, FIRST, ISO, IEC, el CCN ni a ninguna entidad de certificación, ni cuenta con su respaldo. CTEM es un marco publicado por Gartner; CVSS y EPSS son de FIRST y el catálogo KEV, de CISA; ATT&CK es una marca de MITRE. De las normas ISO solo se citan números de control. Los datos del ejemplo son ficticios y usan rangos de documentación (RFC 5737).

## <img src="docs/assets/icons/user.svg" width="20" height="20" valign="middle"/> Autor

Desarrollado por **Yoandy Ramírez Delgado**:

- **GitHub:** [@heindall92](https://github.com/heindall92)
- **Repositorio:** [heindall92/ctem-nexus](https://github.com/heindall92/ctem-nexus)
