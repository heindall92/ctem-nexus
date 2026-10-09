"""Modelos pydantic: el mismo JSON en camelCase que usa la interfaz (frontend/src/engine/types.ts)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

AssetType = Literal["servidor", "estacion", "aplicacion_web", "base_datos", "controlador_dominio", "pki", "perimetro", "nube", "identidad"]
FindingKind = Literal["cve", "configuracion", "identidad"]
FindingStatus = Literal["abierto", "validado", "no_explotable", "mitigado", "aceptado"]
ProfileId = Literal["defecto", "ot", "banca"]
SlaPolicy = Literal["estandar", "ens_basica", "ens_media", "ens_alta"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class Asset(CamelModel):
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    type: AssetType = "servidor"
    ip: str = Field(default="", max_length=60)
    owner: str = Field(default="", max_length=80)
    criticality: int = Field(ge=1, le=5)
    internet_exposed: bool = False
    tags: list[str] = Field(default_factory=list, max_length=12)


class NetworkRange(CamelModel):
    id: str
    cidr: str = Field(max_length=60)
    label: str = ""
    in_scope: bool = True


class RiskException(CamelModel):
    owner: str = Field(default="", max_length=120)
    reason: str = Field(default="", max_length=1000)
    expires: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    compensating: str = Field(default="", max_length=1000)
    approved_at: str = Field(default="", max_length=10)
    previous: Literal["abierto", "validado"] = "abierto"


class Finding(CamelModel):
    id: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=200)
    kind: FindingKind = "cve"
    cve: Optional[str] = Field(default=None, pattern=r"^CVE-\d{4}-\d{4,7}$")
    cvss: float = Field(ge=0, le=10)
    epss: Optional[float] = Field(default=None, ge=0, le=1)
    kev: bool = False
    exploit_public: bool = False
    asset_id: str
    status: FindingStatus = "abierto"
    remediation: str = ""
    description: Optional[str] = None
    detected_at: Optional[str] = None
    resolved_at: Optional[str] = None
    technique: Optional[str] = None
    edge_from: Optional[str] = None
    leads_to: list[str] = Field(default_factory=list)
    related_cves: list[str] = Field(default_factory=list, max_length=200)
    sources: list[str] = Field(default_factory=list, max_length=12)
    evidence: Optional[str] = Field(default=None, max_length=4000)
    attack: list[str] = Field(default_factory=list, max_length=20)
    exception: Optional[RiskException] = None


class ManualEdge(CamelModel):
    id: str
    from_: str = Field(alias="from")
    to: str
    technique: str = "Movimiento lateral"


class EngineInput(CamelModel):
    assets: list[Asset] = Field(default_factory=list, max_length=5000)
    findings: list[Finding] = Field(default_factory=list, max_length=20000)
    edges: list[ManualEdge] = Field(default_factory=list, max_length=5000)
    profile: ProfileId = "defecto"
    sla_policy: SlaPolicy = "estandar"

    def to_engine(self) -> dict:
        """Diccionario camelCase que consume app.engine (idéntico al JSON de la interfaz)."""
        return self.model_dump(by_alias=True)


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "ctem-nexus-api"
    version: str
    engine: str
