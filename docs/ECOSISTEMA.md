# Ecosistema: intercambio por fichero

CTEM-Nexus es el puente entre lo ofensivo y el GRC dentro de un conjunto de herramientas de código abierto, todas locales y en español:

| Herramienta | Qué hace | Web | Código |
|---|---|---|---|
| **Rosetta Multinorma** | Mapa de 15 normas y leyes sobre 152 controles unificados | [abrir](https://heindall92.github.io/rosetta_multinorma/) | [heindall92/rosetta_multinorma](https://github.com/heindall92/rosetta_multinorma) |
| **ENS Compliance Studio** | Categorización, MAGERIT y declaración de aplicabilidad del ENS | [abrir](https://heindall92.github.io/grc_ens_compliance_studio/) | [heindall92/grc_ens_compliance_studio](https://github.com/heindall92/grc_ens_compliance_studio) |
| **KAIROS** | Continuidad de negocio: BIA, BCP y DRP | [abrir](https://heindall92.github.io/kairos/) | [heindall92/kairos](https://github.com/heindall92/kairos) |
| **CTEM-Nexus** | Exposición técnica priorizada y rutas de ataque | [abrir](https://heindall92.github.io/ctem-nexus/) | [heindall92/ctem-nexus](https://github.com/heindall92/ctem-nexus) |
| **ENS AD Auditor** | Directorio activo frente a las medidas `op.acc` del ENS | [abrir](https://heindall92.github.io/ens_ad-auditor/) | [heindall92/ens_ad-auditor](https://github.com/heindall92/ens_ad-auditor) |
| **ARGOS** | Laboratorio GRC con máquinas, rutas y simulacros | [abrir](https://heindall92.github.io/argos-grc/) | [heindall92/argos-grc](https://github.com/heindall92/argos-grc) |
| **Norvik** | Gobernanza y cuadro de mando de madurez (escritorio) | — | [heindall92/Norvik_Gobernanza](https://github.com/heindall92/Norvik_Gobernanza) |

**Principio:** el usuario mueve los ficheros. Ninguna herramienta llama a otra por red, ninguna necesita servidor y nada sale del equipo. Cada importación enseña qué va a cambiar antes de aplicarlo.

## El sobre `yrd-ecosistema`

```json
{
  "format": "yrd-ecosistema",
  "version": 1,
  "origen": { "herramienta": "ctem-nexus", "version": "0.6.0", "generado": "2026-10-09T10:00:00Z" },
  "tipo": "hallazgos",
  "proyecto": "Industrias Meridiano S.A.",
  "datos": [],
  "resumen": {}
}
```

| Campo | Valores |
|---|---|
| `origen.herramienta` | `ctem-nexus`, `rosetta`, `compliance-studio`, `kairos`, `ens-ad-auditor`, `argos`, `norvik` |
| `tipo` | `hallazgos`, `activos`, `controles`, `bia`, `soa`, `indicadores`, `responsables` |
| `datos` | Lista de objetos (máximo 20 000), con la forma que fija el tipo |

El esquema JSON (2020-12) está en [`shared/schemas/yrd-ecosistema.schema.json`](../shared/schemas/yrd-ecosistema.schema.json) y lo comprueba `backend/tests/test_ecosistema.py` con los ficheros de [`shared/samples/ecosistema/`](../shared/samples/ecosistema/).

**Reglas al leer un sobre.** Se ignora cualquier `format` o `version` distintos, cualquier herramienta o tipo fuera de la lista y cualquier elemento de `datos` que no sea un objeto. El JSON se lee sin claves de prototipo (`__proto__`, `constructor`, `prototype`), los textos se recortan y los identificadores, bandas, estados y fechas fuera de formato se descartan.

## Qué viaja entre CTEM-Nexus y cada herramienta

| Herramienta | CTEM-Nexus recibe | CTEM-Nexus envía |
|---|---|---|
| **Rosetta** | Sobre `controles` (o el proyecto de Rosetta): estado de cada control. Si un control figura como implantado y tiene hallazgos críticos o altos abiertos, la ficha del hallazgo y la vista Ecosistema lo marcan como contradicción. | Sobre `hallazgos`: hallazgos abiertos agrupados por control unificado, con sus identificadores de ENS, ISO/IEC 27001 (Anexo A), NIS2, NIST CSF 2.0 y DORA. Rosetta lo enseña en la ficha del control y lanza la regla **CO-23**. |
| **Compliance Studio** | Proyecto o copia de Studio: categoría del sistema (art. 40 y Anexo I del RD 311/2022) → política de plazos. | `ens-studio-hallazgos` (el formato que Studio ya importa en *Evidencia técnica*): categoría, CVSS, activo de destino, estado y medidas del ENS. |
| **KAIROS** | Proyecto o copia de KAIROS: funciones con RTO y MTPD → criticidad 1–5 de los activos que las soportan, también a través de las dependencias entre activos. | Sobre `activos`: por cada activo del BIA, hallazgos abiertos, críticos, KEV, rutas de ataque y riesgo de interrupción. |
| **ENS AD Auditor** | Informe JSON (`/api/scan` o la descarga del panel): cada alerta pasa a hallazgo de identidad con su guía, su técnica ATT&CK y sus medidas `op.acc` como evidencia. | — |
| **Norvik** | Sobre `responsables` o CSV `activo,responsable,rol` → responsable de cada activo. | Sobre `indicadores`: índice de exposición, abiertos, críticos, KEV, rutas, cumplimiento de plazos, vencidos, MTTR, riesgos aceptados e histórico de ciclos. |
| **ARGOS** | — | Enlace «Practica esto en ARGOS» en cada hallazgo, a la máquina que entrena esa corrección (`#maquina/<id>`). |

### Criticidad desde el BIA (KAIROS)

Cada función con su RTO (o, si falta, su MTPD) da un nivel: ≤ 4 h → 5; ≤ 24 h → 4; ≤ 72 h → 3; más → 2. Un activo hereda el nivel más alto de las funciones que dependen de él, directamente o a través de otros activos (si el portal depende del servidor de aplicaciones y este de la base de datos, los tres soportan la venta en línea). Los activos se emparejan por etiqueta `kairos:<id>`, IP o parecido del nombre, y el usuario puede cambiar cada pareja antes de aplicar.

### Plazos según la categoría ENS (Compliance Studio)

El ENS no fija días de corrección, pero exige más diligencia cuanto más alta es la categoría (art. 40 y medidas `op.exp.2` y `op.exp.4`). CTEM-Nexus propone, como criterio orientativo y editable:

| Política | Crítica | Alta | Media | Baja |
|---|---:|---:|---:|---:|
| Estándar | 3 | 14 | 30 | 90 |
| ENS BÁSICA | 7 | 30 | 60 | 120 |
| ENS MEDIA | 3 | 14 | 30 | 90 |
| ENS ALTA | 2 | 7 | 21 | 60 |

La política es parte del motor (TypeScript y Python) y la comprueba la prueba de paridad.

### Ida y vuelta con Rosetta

1. CTEM-Nexus → Ecosistema → Rosetta → *Evidencia por control*.
2. Rosetta → Exportar → CTEM-Nexus → *Importar hallazgos*. La ficha de cada control muestra la exposición técnica y la regla CO-23 avisa de las contradicciones.
3. Rosetta → *Sobre para CTEM-Nexus*: estado de los 152 controles y, sin cambios, la evidencia recibida.
4. CTEM-Nexus → Ecosistema → arrastrar el sobre: cada hallazgo indica el estado de sus controles en Rosetta.

Los dos repositorios prueban el mismo par de ficheros (`ctem-a-rosetta.json` y `rosetta-a-ctem.json`): Rosetta comprueba que lee la evidencia sin pérdidas y CTEM-Nexus que la recibe de vuelta idéntica.

## Propiedad intelectual

Los controles se identifican por número (ENS `op.exp.4`, ISO/IEC 27001 `A8.8`, NIS2 `6.6`, NIST CSF `PR.PS-02`, DORA art. `9`). No se reproduce texto de normas ISO; los títulos de los controles unificados son de Rosetta.
