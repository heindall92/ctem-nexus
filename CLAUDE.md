# Instrucciones para asistentes de código

## Autoría

- El autor de todo el trabajo es **Yoandy Ramírez Delgado** (`yoandyramirezdelgado@gmail.com`).
- Antes del primer commit en cualquier clon: `git config user.name "Yoandy Ramírez Delgado"` y `git config user.email "yoandyramirezdelgado@gmail.com"`. Comprueba con `git log -1 --format='%an <%ae>'` que el commit sale a su nombre.
- No añadas líneas `Co-Authored-By` ni ninguna otra atribución a herramientas de IA en commits, PR, código o documentación.

## Reglas del proyecto

- Todo el texto visible (interfaz, README, mensajes de error) va en español.
- El motor (`frontend/src/engine/`) no usa el DOM. `backend/app/engine/prioritization.py` es su traducción línea a línea: si cambias la fórmula, cambia los dos, ejecuta `npm run golden` y comprueba `pytest`.
- El HTML autocontenido no puede hacer peticiones a terceros (lo verifica `npm run capturas`).
