"""Fase 2 · Descubrimiento: ingesta de hallazgos en CSV."""
import csv
import io

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/discovery", tags=["2 · Descubrimiento"])

TRUE = {"1", "true", "si", "sí", "yes", "y", "s", "x"}


class CsvImport(BaseModel):
    csv: str = Field(max_length=5_000_000)


@router.post("/import-csv")
def import_csv(req: CsvImport) -> dict:
    """Convierte un CSV (separador , o ;) en hallazgos con el formato de la interfaz."""
    text = req.csv.lstrip("\ufeff")
    first = text.splitlines()[0] if text else ""
    sep = ";" if first.count(";") > first.count(",") else ","
    rows = list(csv.DictReader(io.StringIO(text), delimiter=sep))
    findings, rejected = [], 0
    for i, r in enumerate(rows):
        r = {(k or "").strip(): (v or "").strip() for k, v in r.items()}
        title = r.get("title") or r.get("titulo") or r.get("cve")
        if not title:
            rejected += 1
            continue
        try:
            cvss = min(10.0, max(0.0, float((r.get("cvss") or "5").replace(",", "."))))
        except ValueError:
            cvss = 5.0
        epss_raw = (r.get("epss") or "").replace(",", ".")
        try:
            epss = float(epss_raw) if epss_raw else None
            if epss is not None and epss > 1:
                epss = epss / 100
        except ValueError:
            epss = None
        findings.append({
            "id": r.get("id") or f"IMP-{i + 1:03d}", "title": title, "kind": r.get("kind") or ("cve" if r.get("cve") else "configuracion"),
            "cve": (r.get("cve") or "").upper() or None, "cvss": cvss, "epss": epss,
            "kev": (r.get("kev") or "").lower() in TRUE, "exploitPublic": (r.get("exploitPublic") or r.get("exploit") or "").lower() in TRUE,
            "assetId": r.get("assetId") or r.get("activo") or "", "status": r.get("status") or "abierto",
            "remediation": r.get("remediation") or "", "technique": r.get("technique") or None,
            "edgeFrom": r.get("edgeFrom") or None, "leadsTo": [x.strip() for x in (r.get("leadsTo") or "").split(";") if x.strip()],
        })
    return {"findings": findings, "rejected": rejected}
