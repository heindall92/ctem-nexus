"""Fase 3 · Priorización: puntuación 0-100 con explicación por hallazgo."""
from fastapi import APIRouter

from ..engine import prioritize
from ..models import EngineInput

router = APIRouter(prefix="/api/v1", tags=["3 · Priorización"])


@router.post("/prioritize")
def prioritize_endpoint(payload: EngineInput) -> dict:
    """Devuelve el mismo EngineResult que el motor TypeScript (engine = "python")."""
    return prioritize(payload.to_engine())
