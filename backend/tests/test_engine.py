from app.engine import score_finding
from app.engine.prioritization import PROFILES, WEIGHTS, band_for, prioritize, profile_of, r1


def asset(**kw):
    return {"id": "x", "name": "X", "type": "servidor", "criticality": 3, "internetExposed": False, **kw}


def finding(**kw):
    return {"id": "F", "title": "F", "kind": "cve", "cvss": 5, "epss": 0, "kev": False, "exploitPublic": False, "assetId": "x", "status": "abierto", **kw}


def test_pesos_suman_100():
    assert sum(WEIGHTS.values()) == 100
    for nombre, pesos in PROFILES.items():
        assert sum(pesos.values()) == 100, nombre


def test_perfil_desconocido_cae_en_defecto():
    assert profile_of("inventado") == "defecto"
    assert profile_of(None) == "defecto"
    r = prioritize({"assets": [asset()], "findings": [finding()], "edges": [], "profile": "__proto__"})
    assert r["profile"] == "defecto"


def test_riesgo_aceptado_sale_de_abiertos_pero_no_del_grafo():
    a = [asset(id="e", name="E", internetExposed=True), asset(id="c", name="C", criticality=5)]
    f = [finding(id="F1", assetId="e", status="aceptado", leadsTo=["c"]), finding(id="F2", assetId="e")]
    r = prioritize({"assets": a, "findings": f, "edges": []})
    assert r["summary"]["openFindings"] == 1 and r["summary"]["accepted"] == 1
    assert r["summary"]["attackPaths"] == 1
    acc = next(s for s in r["scored"] if s["id"] == "F1")
    assert acc["explanation"].startswith("Riesgo aceptado; puntuación de referencia")


def test_maximo_y_minimo():
    assert score_finding(finding(cvss=10, kev=True), asset(criticality=5, internetExposed=True), 0, True)["score"] == 100
    assert score_finding(finding(cvss=0), asset(criticality=1), None, False)["score"] == 0


def test_caso_documentado():
    s = score_finding(finding(cvss=8, epss=0.2, exploitPublic=True), asset(), 2, True)
    assert s["score"] == 56.5 and s["band"] == "media"
    assert [f["points"] for f in s["factors"]] == [24, 15, 10, 0, 7.5]


def test_validacion():
    base = score_finding(finding(cvss=8), asset(), None, False)["score"]
    assert score_finding(finding(cvss=8, status="validado"), asset(), None, False)["score"] == r1(base + 5)
    assert score_finding(finding(cvss=8, status="no_explotable"), asset(), None, False)["score"] == r1(base * 0.25)


def test_bandas():
    assert [band_for(x) for x in (80, 79.9, 60, 59.9, 40, 39.9)] == ["critica", "alta", "alta", "media", "media", "baja"]
