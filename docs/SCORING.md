# Método de cálculo · motor de CTEM-Nexus 1.2.0

La puntuación de cada hallazgo va de **0 a 100** y la calculan dos implementaciones idénticas:

- `frontend/src/engine/engine.ts` (referencia, se ejecuta en el navegador);
- `backend/app/engine/prioritization.py` (traducción línea a línea para la API).

La paridad se comprueba con el fichero dorado `shared/golden-demo.json` en las pruebas de ambos lados
(`npm test` y `pytest`). Todas las constantes están en `frontend/src/engine/constants.ts`.

## Fórmula

```
puntuación = severidad + explotabilidad + criticidad + exposición + proximidad   (+ ajuste de validación)

severidad       = CVSS / 10                       × 30
explotabilidad  = max(KEV ? 1 : 0,
                      exploit público ? 0,6 : 0,
                      EPSS)                        × 25
criticidad      = (criticidad del activo − 1) / 4 × 20
exposición      = expuesto a Internet ? 1 : 0     × 10
proximidad      = max(0, 1 − saltos / 4)          × 15   (0 si no hay ruta hasta un activo crítico)
```

| Factor | Peso | Entrada |
|---|---:|---|
| Severidad | 30 | CVSS base (0–10). En hallazgos sin CVE, severidad equivalente estimada. |
| Explotabilidad | 25 | CISA KEV (1), exploit público (suelo 0,6) y EPSS (0–1): se toma el máximo. |
| Criticidad del activo | 20 | Criticidad de negocio 1–5 del activo afectado. |
| Exposición | 10 | Activo expuesto a Internet. |
| Proximidad | 15 | Saltos en el grafo hasta el activo crítico (criticidad 5) más cercana. |

**Perfiles de ponderación.** Los pesos de la tabla son los del perfil *General*. Cada perfil suma 100 y se guarda en el
proyecto (Ajustes); los tres tienen paridad TS ↔ Python en el fichero dorado.

| Perfil | Severidad | Explotabilidad | Criticidad | Exposición | Proximidad | Para qué |
|---|---:|---:|---:|---:|---:|---|
| General | 30 | 25 | 20 | 10 | 15 | Equilibrio entre severidad, explotación real y negocio |
| OT / industrial | 20 | 20 | 30 | 10 | 20 | En planta, parar la línea importa más que la nota del fallo |
| Banca y finanzas | 25 | 30 | 20 | 15 | 10 | Amenaza dirigida (DORA, pruebas TLPT): explotación real y exposición |

**Criticidad desde el BIA.** Si se vincula KAIROS (vista Ecosistema), la criticidad de los activos sale de las funciones
que soportan: RTO ≤ 4 h → 5; ≤ 24 h → 4; ≤ 72 h → 3; más → 2 (sin RTO, el MTPD), heredada por dependencias. Ver
[ECOSISTEMA.md](ECOSISTEMA.md).

**Saltos de un hallazgo.** Se toma el mínimo entre los saltos del activo afectado y, si el hallazgo habilita
un movimiento (`leadsTo`), `1 + saltos del destino`. Así, un ESC1 en la PKI que da acceso al controlador de
dominio queda a 1 salto aunque la PKI no tenga otras salidas.

**Validación.** `validado` suma **+5** (con tope 100); `no_explotable` multiplica la puntuación por **0,25**
y elimina las aristas que el hallazgo aportaba al grafo; `mitigado` conserva una puntuación de referencia
pero no cuenta en los indicadores ni genera aristas.

**Redondeo.** Una décima, mitad hacia arriba: `floor(x × 10 + 0,5) / 10` (idéntico en TS y Python).

## Bandas y SLA

| Banda | Puntuación | SLA de remediación |
|---|---|---:|
| Crítica | ≥ 80 | 3 días |
| Alta | ≥ 60 | 14 días |
| Media | ≥ 40 | 30 días |
| Baja | < 40 | 90 días |

**Políticas de plazos.** Los días de la tabla son la política *estándar*. Si se vincula Compliance Studio, la categoría
del sistema ENS elige otra (orientativa: el RD 311/2022 no fija días, pero exige más diligencia cuanto más alta es la
categoría). La política forma parte del motor (`slaPolicy` en la entrada y en el resultado) y la comprueba la paridad.

| Política | Crítica | Alta | Media | Baja |
|---|---:|---:|---:|---:|
| Estándar | 3 | 14 | 30 | 90 |
| ENS BÁSICA | 7 | 30 | 60 | 120 |
| ENS MEDIA | 3 | 14 | 30 | 90 |
| ENS ALTA | 2 | 7 | 21 | 60 |

## Ejemplo resuelto

Hallazgo con CVSS 8,0, EPSS 0,20 y exploit público, sobre un activo interno de criticidad 3 a 2 saltos de un activo crítico:

| Factor | Cálculo | Puntos |
|---|---|---:|
| Severidad | 8/10 × 30 | 24,0 |
| Explotabilidad | max(0; 0,6; 0,2) × 25 | 15,0 |
| Criticidad | (3 − 1)/4 × 20 | 10,0 |
| Exposición | interno | 0,0 |
| Proximidad | (1 − 2/4) × 15 | 7,5 |
| **Total** | | **56,5 → Media** |

(Este caso está en las pruebas de ambos motores.)

## Explicación legible

Cada puntuación incluye un texto como:

> Prioridad Crítica (92,5/100). CVSS 10,0; En el catálogo CISA KEV: explotación activa confirmada; Criticidad de negocio 4/5 (Portal web de clientes); Validado como explotable.

Se listan los tres factores que más puntos aportan, más el ajuste de validación si lo hay.

## Rutas de ataque y puntos de estrangulamiento

1. **Grafo.** Nodos: `Internet` + un nodo por activo. Aristas: `Internet → activo` si está expuesto; una arista
   por cada hallazgo activo que habilita movimiento (`edgeFrom` o el activo afectado → `leadsTo`); y las aristas
   manuales. Los hallazgos `mitigado` o `no_explotable` no generan aristas.
2. **Rutas.** DFS de rutas simples desde Internet hasta cada activo crítico (criticidad 5), profundidad
   máxima 8 y tope de 2.000 rutas (se avisa si se trunca).
3. **Estrangulamiento.** Un nodo intermedio o una arista es punto de estrangulamiento si aparece en
   **≥ 40 %** de las rutas y en al menos 2. El indicador del panel cuenta los nodos.

## Índice de exposición

`0,5 × peor puntuación abierta + 0,5 × media de las cinco peores` (solo hallazgos `abierto` o `validado`).
Penaliza tener un único hallazgo crítico, pero también una cola de altos.

## MTTR

Media de días entre `detectedAt` y `resolvedAt` de los hallazgos mitigados.
