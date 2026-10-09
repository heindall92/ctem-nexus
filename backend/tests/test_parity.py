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


def test_perfiles_de_ponderacion(golden):
    """Cada perfil (industrial/OT, banca) produce lo mismo en los dos motores."""
    assert set(golden["expected"]["profiles"]) == {"ot", "banca"}
    for profile, exp in golden["expected"]["profiles"].items():
        r = prioritize({**golden["input"], "profile": profile})
        assert r["profile"] == profile
        got = [{k: s[k] for k in ("id", "score", "band", "explanation")} for s in r["scored"]]
        assert got == exp["scored"], profile
        assert r["summary"] == exp["summary"], profile


def test_politicas_de_plazos(golden):
    """Cada política de plazos (estándar y categorías ENS) da los mismos días por hallazgo en los dos motores."""
    assert set(golden["expected"]["slaPolicies"]) == {"estandar", "ens_basica", "ens_media", "ens_alta"}
    for policy, exp in golden["expected"]["slaPolicies"].items():
        r = prioritize({**golden["input"], "slaPolicy": policy})
        assert r["slaPolicy"] == policy
        assert [{"id": s["id"], "slaDays": s["slaDays"]} for s in r["scored"]] == exp, policy


def test_politica_desconocida_cae_en_estandar():
    r = prioritize({"assets": [], "findings": [], "edges": [], "slaPolicy": "inventada"})
    assert r["slaPolicy"] == "estandar"
