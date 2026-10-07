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


def test_import_nmap_xml():
    xml_sample = """<?xml version="1.0" encoding="UTF-8"?>
    <nmaprun scanner="nmap" version="7.94">
      <host>
        <status state="up"/>
        <address addr="10.0.0.1" addrtype="ipv4"/>
        <hostnames><hostname name="dc01.corp.local"/></hostnames>
        <ports>
          <port protocol="tcp" portid="88"><state state="open"/><service name="kerberos-sec"/></port>
          <port protocol="tcp" portid="389"><state state="open"/><service name="ldap"/></port>
          <port protocol="tcp" portid="445"><state state="open"/><service name="microsoft-ds"/></port>
        </ports>
      </host>
      <host>
        <status state="up"/>
        <address addr="10.0.0.80" addrtype="ipv4"/>
        <hostnames><hostname name="portal.corp.local"/></hostnames>
        <ports>
          <port protocol="tcp" portid="443">
            <state state="open"/>
            <service name="https"/>
            <script id="vulners" output="Vulnerable to CVE-2023-4966 Citrix Bleed"/>
          </port>
          <port protocol="tcp" portid="23"><state state="open"/><service name="telnet"/></port>
        </ports>
      </host>
    </nmaprun>
    """
    # Test JSON endpoint
    r = client.post("/api/v1/discovery/import-nmap", json={"xml": xml_sample})
    assert r.status_code == 200
    data = r.json()
    assert data["total_hosts_activos"] == 2
    dc = next(a for a in data["assets"] if a["ip"] == "10.0.0.1")
    assert dc["type"] == "controlador_dominio"
    assert dc["criticality"] == 5
    
    portal = next(a for a in data["assets"] if a["ip"] == "10.0.0.80")
    assert portal["type"] == "aplicacion_web"
    
    # Check findings: CVE-2023-4966 and Telnet
    cve_finding = next((f for f in data["findings"] if f["cve"] == "CVE-2023-4966"), None)
    assert cve_finding is not None
    assert cve_finding["assetId"] == portal["id"]
    
    telnet_finding = next((f for f in data["findings"] if "Telnet" in f["title"]), None)
    assert telnet_finding is not None


def test_upload_nmap_file():
    xml_sample = b"""<?xml version="1.0" encoding="UTF-8"?>
    <nmaprun scanner="nmap">
      <host>
        <status state="up"/>
        <address addr="192.168.1.10" addrtype="ipv4"/>
        <hostnames><hostname name="srv-db"/></hostnames>
        <ports>
          <port protocol="tcp" portid="5432"><state state="open"/><service name="postgresql"/></port>
        </ports>
      </host>
    </nmaprun>
    """
    # Probar endpoint multipart v1 y alias
    r1 = client.post("/api/v1/discovery/nmap/upload", files={"file": ("escaneo.xml", xml_sample, "application/xml")})
    assert r1.status_code == 200
    assert r1.json()["total_hosts_activos"] == 1
    assert r1.json()["assets"][0]["type"] == "base_datos"

    r2 = client.post("/api/discovery/nmap/upload", files={"file": ("escaneo.xml", xml_sample, "application/xml")})
    assert r2.status_code == 200
    assert r2.json()["total_hosts_activos"] == 1


def test_bloodhound_api():
    bh_payload = {
        "data": [
            {
                "ObjectIdentifier": "S-1-5-21-999-1001",
                "Properties": {
                    "name": "DC01.CORP.LOCAL",
                    "operatingsystem": "Windows Server 2022",
                    "PrimaryGroupSID": "S-1-5-21-999-516",
                    "highvalue": True,
                },
            },
            {
                "ObjectIdentifier": "S-1-5-21-999-1002",
                "Properties": {
                    "name": "SVC_BACKUP@CORP.LOCAL",
                    "hasspn": True,
                },
            },
        ],
        "meta": {"type": "computers_users", "count": 2, "version": 5},
    }
    r = client.post("/api/v1/discovery/import-bloodhound", json=bh_payload)
    assert r.status_code == 200
    data = r.json()
    assert data["total_activos"] == 2
    dc = next(a for a in data["assets"] if a["type"] == "controlador_dominio")
    assert dc["criticality"] == 5

    kerb = next(f for f in data["findings"] if f["remediation"] == "kerberoast")
    assert kerb is not None
    assert dc["id"] in kerb["leadsTo"]
