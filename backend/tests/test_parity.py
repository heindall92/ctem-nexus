"""El motor Python debe producir exactamente lo mismo que el TypeScript (shared/golden-demo.json)."""
from app.engine import ENGINE_VERSION, prioritize


def test_version(golden):
    assert golden["engineVersion"] == ENGINE_VERSION


def test_scores_y_explicaciones(golden):
    r = prioritize(golden["input"])
    got = [{k: s[k] for k in ("id", "score", "band", "hopsToCrown", "onAttackPath", "explanation")} for s in r["scored"]]
    assert got == golden["expected"]["scored"]


def test_rutas_estrangulamientos_y_resumen(golden):
    r = prioritize(golden["input"])
    assert len(r["graph"]["paths"]) == golden["expected"]["paths"]
    assert r["graph"]["chokePoints"] == golden["expected"]["chokePoints"]
    assert r["summary"] == golden["expected"]["summary"]
