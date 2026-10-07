"""Fase 4 · Validación: rutas de ataque y puntos de estrangulamiento."""
from fastapi import APIRouter

from ..engine import analyze_graph
from ..models import EngineInput

router = APIRouter(prefix="/api/v1/validation", tags=["4 · Validación"])


@router.post("/attack-paths")
def attack_paths(payload: EngineInput) -> dict:
    g = analyze_graph(payload.to_engine())
    return {"paths": g["paths"], "chokePoints": g["chokePoints"], "truncated": g["truncated"], "edges": g["edges"]}
