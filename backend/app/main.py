"""CTEM-Nexus · API opcional. La interfaz funciona sin ella; si se activa en Ajustes, delega aquí el cálculo."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .engine import ENGINE_VERSION
from .models import Health
from .routers import discovery, mobilization, prioritization, scoping, validation

app = FastAPI(
    title="CTEM-Nexus API",
    version=__version__,
    description="Gestión continua de la exposición a amenazas (CTEM): alcance, descubrimiento, priorización, validación y movilización.",
)

# CORS solo para desarrollo local (Vite en :5173, vista previa en :4173) y el HTML abierto desde disco (Origin: null).
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,null"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CTEM_CORS_ORIGINS", _default_origins).split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.get("/health", response_model=Health, tags=["Estado"])
def health() -> Health:
    return Health(version=__version__, engine=ENGINE_VERSION)


for module in (scoping, discovery, prioritization, validation, mobilization):
    app.include_router(module.router)

# Alias de compatibilidad directa
app.post("/api/discovery/nmap/upload", tags=["2 · Descubrimiento"], include_in_schema=False)(discovery.upload_nmap_scan)
