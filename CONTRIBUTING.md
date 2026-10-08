# Cómo contribuir

¡Gracias por el interés! Antes de abrir un PR, mira la [hoja de ruta](ROADMAP.md): las tareas están ordenadas por fases.

## Entorno

```bash
cd frontend && npm ci && npm test && npm run build    # Node ≥ 20
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt && pytest
```

## Reglas

- **Interfaz y documentación en español.** Si añades texto visible, añade también su traducción en `frontend/src/i18n.ts`.
- **El motor no toca el DOM** (`frontend/src/engine/`). Si cambias la fórmula de priorización, cambia también `backend/app/engine/prioritization.py`, regenera el fichero dorado con `npm run golden` y comprueba `pytest`. La paridad TS ↔ Python es obligatoria.
- **Sin peticiones a terceros**: el HTML autocontenido no puede cargar nada externo.
- **Iconos solo de [Lucide](https://lucide.dev).**
- **Accesibilidad WCAG 2.2 AA**: contraste ≥ 4,5:1, foco visible y movimiento reducido respetado.
- **Datos de ejemplo ficticios**: usa rangos de documentación (RFC 5737: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`) y nunca datos de clientes reales.
- **Versión**: se cambia solo en `frontend/package.json`, `backend/app/__init__.py`, el pie del README y `CHANGELOG.md`. Una prueba comprueba que coinciden.
- **Si añades o quitas pruebas**, actualiza las cifras del README. Otra prueba lo comprueba.

## Commits

Mensajes en español y en imperativo, describiendo el porqué («Corrige el contraste de las cabeceras de tabla», no «fix»).
