from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_prioritize_demo(golden):
    r = client.post("/api/v1/prioritize", json=golden["input"])
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "python"
    assert [s["id"] for s in body["scored"]] == [s["id"] for s in golden["expected"]["scored"]]
    assert body["summary"] == golden["expected"]["summary"]


def test_prioritize_rechaza_datos_invalidos():
    r = client.post("/api/v1/prioritize", json={"assets": [], "findings": [{"id": "x", "title": "t", "cvss": 42, "assetId": "a"}]})
    assert r.status_code == 422


def test_cors_localhost():
    r = client.options("/api/v1/prioritize", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_attack_paths_y_scoping(golden):
    r = client.post("/api/v1/validation/attack-paths", json=golden["input"])
    assert len(r.json()["paths"]) == golden["expected"]["paths"]
    s = client.post("/api/v1/scoping/validate", json={"assets": golden["input"]["assets"], "ranges": [{"id": "r", "cidr": "10.10.0.0/16"}]})
    assert any("fuera de los rangos" in i for i in s.json()["issues"])


def test_tickets_csv_neutraliza_formulas(golden):
    data = dict(golden["input"])
    data["findings"] = [dict(f) for f in data["findings"]]
    data["findings"][0]["title"] = "=HYPERLINK(\"http://malo\")"
    r = client.post("/api/v1/mobilization/tickets.csv", json=data)
    assert "'=HYPERLINK" in r.text


def test_import_csv():
    r = client.post("/api/v1/discovery/import-csv", json={"csv": "id;title;cve;cvss;epss;kev\nX;Prueba;CVE-2021-44228;10;94;sí\n"})
    f = r.json()["findings"][0]
    assert f["epss"] == 0.94 and f["kev"] is True
