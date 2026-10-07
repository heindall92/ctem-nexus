"""Fase 1 · Alcance: validación de activos y rangos de red."""
import ipaddress

from fastapi import APIRouter
from pydantic import BaseModel

from ..models import Asset, NetworkRange

router = APIRouter(prefix="/api/v1/scoping", tags=["1 · Alcance"])


class ScopeRequest(BaseModel):
    assets: list[Asset] = []
    ranges: list[NetworkRange] = []


@router.post("/validate")
def validate_scope(req: ScopeRequest) -> dict:
    """Comprueba IP/CIDR y avisa de activos fuera de los rangos en alcance."""
    nets = []
    issues: list[str] = []
    for r in req.ranges:
        try:
            net = ipaddress.ip_network(r.cidr, strict=False)
            if r.in_scope:
                nets.append(net)
        except ValueError:
            issues.append(f"Rango «{r.label or r.id}»: CIDR no válido ({r.cidr}).")
    for a in req.assets:
        if not a.ip:
            continue
        try:
            net = ipaddress.ip_network(a.ip, strict=False)
        except ValueError:
            issues.append(f"Activo «{a.name}»: IP/CIDR no válido ({a.ip}).")
            continue
        if nets and not any(net.version == n.version and net.subnet_of(n) for n in nets):
            issues.append(f"Activo «{a.name}» ({a.ip}) está fuera de los rangos en alcance.")
    crown = sum(1 for a in req.assets if a.criticality == 5)
    if req.assets and crown == 0:
        issues.append("No hay joyas de la corona (criticidad 5): no se podrán calcular rutas de ataque.")
    return {"ok": not issues, "issues": issues, "assets": len(req.assets), "crownJewels": crown}
