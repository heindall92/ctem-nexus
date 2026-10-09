"""Los ficheros de intercambio del ecosistema cumplen el esquema común (shared/schemas/yrd-ecosistema.schema.json)."""
import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / "shared/schemas/yrd-ecosistema.schema.json").read_text(encoding="utf-8"))
SAMPLES = ROOT / "shared/samples/ecosistema"
V = Draft202012Validator(SCHEMA)


def test_el_esquema_es_valido():
    Draft202012Validator.check_schema(SCHEMA)


def test_los_sobres_de_ejemplo_cumplen_el_esquema():
    for fichero in ("ctem-a-rosetta.json", "rosetta-a-ctem.json", "ctem-a-kairos.json", "ctem-a-norvik.json", "responsables-norvik.json"):
        errores = [e.message for e in V.iter_errors(json.loads((SAMPLES / fichero).read_text(encoding="utf-8")))]
        assert errores == [], fichero


def test_rechaza_sobres_mal_formados():
    base = json.loads((SAMPLES / "responsables-norvik.json").read_text(encoding="utf-8"))
    assert not V.is_valid({**base, "format": "otro"})
    assert not V.is_valid({**base, "origen": {**base["origen"], "herramienta": "excel"}})
    assert not V.is_valid({**base, "datos": [{"responsable": "sin activo"}]})
    ida = json.loads((SAMPLES / "ctem-a-rosetta.json").read_text(encoding="utf-8"))
    malo = {**ida, "datos": [{**ida["datos"][0], "iso27001": ["texto de una norma"]}]}
    assert not V.is_valid(malo)
