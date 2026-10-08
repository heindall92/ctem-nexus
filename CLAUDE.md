# Instrucciones para asistentes de código

## Autoría

- El autor de todo el trabajo es **Yoandy Ramírez Delgado** (`yoandyramirezdelgado@gmail.com`).
- Antes del primer commit en cualquier clon: `git config user.name "Yoandy Ramírez Delgado"` y `git config user.email "yoandyramirezdelgado@gmail.com"`. Comprueba con `git log -1 --format='%an <%ae>'` que el commit sale a su nombre.
- No añadas líneas `Co-Authored-By` ni ninguna otra atribución a herramientas de IA en commits, PR, código o documentación.

## Reglas del proyecto

- Todo el texto visible (interfaz, README, mensajes de error) va en español.
- El motor (`frontend/src/engine/`) no usa el DOM. `backend/app/engine/prioritization.py` es su traducción línea a línea: si cambias la fórmula, cambia los dos, ejecuta `npm run golden` y comprueba `pytest`.
- El HTML autocontenido no puede hacer peticiones a terceros (lo verifica `npm run capturas`).

## Rumbo y ecosistema

- Hoja de ruta viva en `ROADMAP.md`: marca cada tarea al cerrarla y no abras fases nuevas sin cerrar la anterior.
- CTEM Nexus es el puente ofensivo ↔ GRC del ecosistema (Rosetta, Compliance Studio, KAIROS, ENS AD Auditor, ARGOS y Norvik). Toda integración se hace por **fichero JSON importado o exportado por el usuario**, nunca por peticiones de red.
- Diseño: Lucide, guía apple-design de Emil Kowalski y acentos de Rosetta. **Sin anillos ni gráficos circulares** (son el sello de Rosetta): el panel usa franjas de exposición por activo. Los colores de gráficos se validan con el script de dataviz. Cada cambio visual se verifica con axe (WCAG 2.2 AA) en claro y oscuro, a 1440 y 390 px.
- Contenido normativo: el BOE puede citarse literalmente; de ISO solo números de cláusula o control. NIST CSF y CISA KEV son de dominio público.

## Estilo

- Carga la skill `.claude/skills/estilo-yoandy/` antes de tocar la interfaz, el contenido o el repositorio. El original vive en `heindall92/rosetta_multinorma`.
