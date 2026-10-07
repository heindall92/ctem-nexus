"""Fase 5 · Movilización: tickets de remediación en CSV con fórmulas neutralizadas."""
import csv
import io

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from ..engine import prioritize
from ..engine.prioritization import BAND_LABEL
from ..models import EngineInput

router = APIRouter(prefix="/api/v1/mobilization", tags=["5 · Movilización"])


def neutralize(value: object) -> object:
    """Evita la inyección de fórmulas en hojas de cálculo (= + - @ tab CR al inicio)."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


@router.post("/tickets.csv", response_class=PlainTextResponse)
def tickets_csv(payload: EngineInput) -> str:
    data = payload.to_engine()
    result = prioritize(data)
    by_id = {f["id"]: f for f in data["findings"]}
    assets = {a["id"]: a for a in data["assets"]}
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(["id", "titulo", "cve", "activo", "prioridad", "puntuacion", "sla_dias", "explicacion"])
    for s in result["scored"]:
        f = by_id[s["id"]]
        if f["status"] not in ("abierto", "validado"):
            continue
        asset = assets.get(f["assetId"], {}).get("name", f["assetId"])
        w.writerow([neutralize(x) for x in (f["id"], f["title"], f.get("cve") or "", asset, BAND_LABEL[s["band"]], s["score"], s["slaDays"], s["explanation"])])
    return buf.getvalue()
