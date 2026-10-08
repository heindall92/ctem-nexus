"""Fase 2 · Descubrimiento: ingesta de hallazgos en CSV y escaneos de red Nmap (XML)."""
from __future__ import annotations

import csv
import io
import ipaddress
import re
import xml.etree.ElementTree as ET
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/discovery", tags=["2 · Descubrimiento"])

TRUE = {"1", "true", "si", "sí", "yes", "y", "s", "x"}
CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)


class CsvImport(BaseModel):
    csv: str = Field(max_length=5_000_000)


class NmapXmlImport(BaseModel):
    xml: str = Field(max_length=20_000_000)


def _is_private_ip(ip_str: str) -> bool:
    """Verifica si la IP pertenece a rangos privados o de bucle local."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return False


def _infer_subnet(ip_str: str) -> Optional[str]:
    """Infiere una subred /24 típica para IPv4 para sugerir rangos de alcance."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.version == 4:
            net = ipaddress.IPv4Network(f"{ip_str}/24", strict=False)
            return str(net)
    except ValueError:
        pass
    return None


MAX_UPLOAD = 20_000_000
_ENTIDAD = re.compile(rb"<!ENTITY", re.IGNORECASE)
_DTD_INTERNA = re.compile(rb"<!DOCTYPE[^>]*(\[|SYSTEM|PUBLIC)", re.IGNORECASE)


def rechazar_dtd(content: bytes) -> None:
    """Rechaza XML con entidades o DTD interna/externa (XXE, «billion laughs»). Nmap solo emite `<!DOCTYPE nmaprun>`."""
    if _ENTIDAD.search(content) or _DTD_INTERNA.search(content):
        raise HTTPException(status_code=400, detail="El XML declara entidades o una DTD: se rechaza por seguridad.")


async def leer_limitado(file: UploadFile) -> bytes:
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="El archivo supera el máximo de 20 MB.")
    return content


def parse_nmap_xml_content(content: bytes | str) -> dict:
    """Parsea el reporte XML de Nmap y genera activos y hallazgos compatibles con CTEM-Nexus."""
    if isinstance(content, str):
        content = content.encode("utf-8")
    rechazar_dtd(content)

    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="El archivo XML proporcionado no es válido o está corrupto.")

    assets = []
    findings = []
    discovered_subnets = set()

    for host_idx, host in enumerate(root.findall("host"), start=1):
        status = host.find("status")
        if status is not None and status.get("state") != "up":
            continue

        # Dirección IP (IPv4 preferente, IPv6 como alternativa)
        addr_tag = host.find("address[@addrtype='ipv4']")
        if addr_tag is None:
            addr_tag = host.find("address[@addrtype='ipv6']")
        if addr_tag is None:
            addr_tag = host.find("address")

        ip_addr = addr_tag.get("addr") if addr_tag is not None else ""
        if not ip_addr:
            continue

        subnet = _infer_subnet(ip_addr)
        if subnet:
            discovered_subnets.add(subnet)

        # Hostname
        hostname = ip_addr
        hostnames_tag = host.find("hostnames")
        if hostnames_tag is not None:
            for hn in hostnames_tag.findall("hostname"):
                val = hn.get("name")
                if val:
                    hostname = val
                    break

        # Puertos y servicios
        open_ports: list[str] = []
        port_numbers: list[int] = []
        detected_cves: set[str] = set()

        ports_tag = host.find("ports")
        if ports_tag is not None:
            for port in ports_tag.findall("port"):
                state = port.find("state")
                if state is not None and state.get("state") == "open":
                    port_id_raw = port.get("portid", "0")
                    proto = port.get("protocol", "tcp")
                    try:
                        p_num = int(port_id_raw)
                    except ValueError:
                        p_num = 0
                    port_numbers.append(p_num)

                    svc = port.find("service")
                    svc_name = svc.get("name", "") if svc is not None else ""
                    svc_product = svc.get("product", "") if svc is not None else ""

                    tag = f"{proto}:{p_num}"
                    if svc_name:
                        tag += f"/{svc_name}"
                    open_ports.append(tag)

                    # Búsqueda de CVEs en scripts (NSE: vulners, vulscan, etc.)
                    for script in port.findall("script"):
                        output_txt = script.get("output", "")
                        for match in CVE_RE.findall(output_txt):
                            detected_cves.add(match.upper())

        # Inferencia de rol arquitectónico y criticidad (CTEM)
        is_dc = any(p in port_numbers for p in (88, 389, 636)) or any("ldap" in p or "kerberos" in p for p in open_ports)
        is_db = any(p in port_numbers for p in (1433, 1521, 3306, 5432, 27017, 6379))
        is_web = any(p in port_numbers for p in (80, 443, 8080, 8443, 8000, 5000)) or any("http" in p for p in open_ports)
        is_exposed = not _is_private_ip(ip_addr)

        if is_dc:
            asset_type = "controlador_dominio"
            criticality = 5  # Joya de la corona por excelencia
        elif is_db:
            asset_type = "base_datos"
            criticality = 4
        elif is_exposed:
            asset_type = "perimetro"
            criticality = 4
        elif is_web:
            asset_type = "aplicacion_web"
            criticality = 3
        elif any(p in port_numbers for p in (22, 3389, 445)):
            asset_type = "servidor"
            criticality = 3
        else:
            asset_type = "estacion"
            criticality = 2

        asset_id = f"nmap_{ip_addr.replace('.', '_').replace(':', '_')}"
        asset_obj = {
            "id": asset_id,
            "name": hostname,
            "type": asset_type,
            "ip": ip_addr,
            "owner": "TI / Operaciones",
            "criticality": criticality,
            "internetExposed": is_exposed,
            "tags": open_ports[:8],
        }
        assets.append(asset_obj)

        # Generación de hallazgos asociados al activo
        # 1. CVEs descubiertos mediante scripts NSE
        for cve in sorted(detected_cves):
            finding_id = f"F-NMAP-{len(findings) + 1:03d}"
            findings.append({
                "id": finding_id,
                "title": f"Vulnerabilidad {cve} en {hostname}",
                "kind": "cve",
                "cve": cve,
                "cvss": 7.5,
                "epss": 0.5,
                "kev": False,
                "exploitPublic": True,
                "assetId": asset_id,
                "status": "abierto",
                "remediation": "parchear-vulnerabilidad",
                "description": f"Vulnerabilidad detectada mediante NSE en el activo {ip_addr}.",
                "leadsTo": [],
            })

        # 2. Protocolos inseguros en texto claro
        if 23 in port_numbers:
            findings.append({
                "id": f"F-NMAP-TELNET-{len(findings) + 1:03d}",
                "title": f"Servicio Telnet sin cifrar en {hostname}",
                "kind": "configuracion",
                "cve": None,
                "cvss": 7.5,
                "epss": None,
                "kev": False,
                "exploitPublic": False,
                "assetId": asset_id,
                "status": "abierto",
                "remediation": "desactivar-telnet",
                "description": f"El puerto 23/TCP transmite credenciales en texto plano en {ip_addr}.",
                "leadsTo": [],
            })

        # 3. Exposición de SMB en hosts no controladores
        if 445 in port_numbers and not is_dc:
            findings.append({
                "id": f"F-NMAP-SMB-{len(findings) + 1:03d}",
                "title": f"Puerto SMB expuesto en {hostname}",
                "kind": "configuracion",
                "cve": None,
                "cvss": 6.0,
                "epss": None,
                "kev": False,
                "exploitPublic": False,
                "assetId": asset_id,
                "status": "abierto",
                "remediation": "firma-smb",
                "description": f"Servicio SMB 445/TCP activo en {ip_addr}. Requiere verificar firma SMB y cifrado.",
                "leadsTo": [],
            })

    ranges = [{"id": f"r-nmap-{i + 1}", "cidr": cidr, "label": f"Subred descubierta {cidr}", "inScope": True} for i, cidr in enumerate(sorted(discovered_subnets))]

    return {
        "message": f"Escaneo de Nmap procesado: {len(assets)} activos y {len(findings)} hallazgos.",
        "total_hosts_activos": len(assets),
        "total_hallazgos": len(findings),
        "assets": assets,
        "findings": findings,
        "ranges": ranges,
    }


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
            "id": r.get("id") or f"IMP-{i + 1:03d}",
            "title": title,
            "kind": r.get("kind") or ("cve" if r.get("cve") else "configuracion"),
            "cve": (r.get("cve") or "").upper() or None,
            "cvss": cvss,
            "epss": epss,
            "kev": (r.get("kev") or "").lower() in TRUE,
            "exploitPublic": (r.get("exploitPublic") or r.get("exploit") or "").lower() in TRUE,
            "assetId": r.get("assetId") or r.get("activo") or "",
            "status": r.get("status") or "abierto",
            "remediation": r.get("remediation") or "",
            "technique": r.get("technique") or None,
            "edgeFrom": r.get("edgeFrom") or None,
            "leadsTo": [x.strip() for x in (r.get("leadsTo") or "").split(";") if x.strip()],
        })
    return {"findings": findings, "rejected": rejected}


@router.post("/import-nmap")
def import_nmap_json(req: NmapXmlImport) -> dict:
    """Convierte el contenido XML de Nmap enviado como texto JSON en activos y hallazgos."""
    return parse_nmap_xml_content(req.xml)


@router.post("/nmap/upload")
async def upload_nmap_scan(file: UploadFile = File(...)) -> dict:
    """Recibe un archivo XML de Nmap mediante formulario multipart y devuelve activos y hallazgos."""
    if not (file.filename or "").lower().endswith(".xml"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .xml generado por Nmap (-oX).")
    try:
        content = await leer_limitado(file)
        return parse_nmap_xml_content(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno procesando el archivo.") from e


class BloodHoundImport(BaseModel):
    data: Optional[list] = None
    computers: Optional[list] = None
    users: Optional[list] = None
    meta: Optional[dict] = None
    raw: Optional[str] = None


def parse_bloodhound_json_content(content: str | bytes) -> dict:
    """Parsea el reporte JSON de BloodHound / SharpHound para Active Directory."""
    import json
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")

    try:
        payload = json.loads(content)
    except Exception:
        raise HTTPException(status_code=400, detail="El contenido no es un JSON válido de BloodHound.")

    items = payload if isinstance(payload, list) else (payload.get("data") or payload.get("computers") or payload.get("users") or [])
    if not items:
        raise HTTPException(status_code=400, detail="No se encontraron objetos de Active Directory en el archivo.")

    assets = []
    findings = []
    edges = []
    dc_id = None
    comp_map = {}

    for item in items:
        props = item.get("Properties") or item.get("properties") or item
        name = props.get("name") or props.get("Name") or ""
        if not name:
            continue

        clean_name = re.sub(r"^[^\\]*\\", "", name)
        clean_name = re.sub(r"@[^.]+.*$", "", clean_name).strip()

        os_str = (props.get("operatingsystem") or props.get("OperatingSystem") or "").lower()
        is_comp = bool(props.get("operatingsystem") or (props.get("PrimaryGroupSID") or "").endswith("-516") or "$" in name)
        high_val = bool(props.get("highvalue"))
        unconstrained = bool(props.get("unconstraineddelegation") or props.get("UnconstrainedDelegation"))
        primary_sid = props.get("PrimaryGroupSID") or props.get("primarygroupsid") or ""

        if is_comp:
            is_dc = primary_sid.endswith("-516") or "domain controller" in os_str or "DC" in name.upper()
            safe_id = f"bh_comp_{re.sub(r'[^a-zA-Z0-9]', '_', name.lower())[:30]}"
            if is_dc and not dc_id:
                dc_id = safe_id

            asset_type = "controlador_dominio" if is_dc else ("servidor" if "server" in os_str or high_val else "estacion")
            crit = 5 if is_dc else (4 if high_val else (3 if "server" in os_str else 2))

            tags = ["ActiveDirectory"]
            if is_dc:
                tags.extend(["Tier-0", "Controlador de Dominio"])
            if unconstrained:
                tags.append("Delegación")

            assets.append({
                "id": safe_id,
                "name": clean_name,
                "type": asset_type,
                "ip": "",
                "owner": "Administración de Sistemas / AD",
                "criticality": crit,
                "internetExposed": False,
                "tags": tags[:6],
            })
            comp_map[name.upper()] = safe_id

            if unconstrained and not is_dc:
                findings.append({
                    "id": f"F-BH-DEL-{len(findings) + 1:03d}",
                    "title": f"Delegación sin restricciones en {clean_name}",
                    "kind": "identidad",
                    "cve": None,
                    "cvss": 8.5,
                    "epss": None,
                    "kev": False,
                    "exploitPublic": True,
                    "assetId": safe_id,
                    "status": "abierto",
                    "remediation": "unconstrained_delegation",
                    "technique": "Delegación sin restricciones (T1558)",
                    "description": f"Equipo {name} con TrustedForDelegation habilitado.",
                    "leadsTo": [dc_id] if dc_id else [],
                })
        else:
            has_spn = bool(props.get("hasspn") or props.get("HasSPN") or props.get("serviceprincipalnames"))
            dont_req_preauth = bool(props.get("dontreqpreauth") or props.get("DontReqPreauth"))

            if has_spn or dont_req_preauth:
                user_id = f"bh_usr_{re.sub(r'[^a-zA-Z0-9]', '_', name.lower())[:30]}"
                assets.append({
                    "id": user_id,
                    "name": f"Cuenta: {clean_name}",
                    "type": "identidad",
                    "ip": "",
                    "owner": "Directorio Activo",
                    "criticality": 4 if high_val else 3,
                    "internetExposed": False,
                    "tags": ["ActiveDirectory", "Identidad"],
                })

                if has_spn:
                    findings.append({
                        "id": f"F-BH-KERB-{len(findings) + 1:03d}",
                        "title": f"Cuenta susceptible a Kerberoasting: {clean_name}",
                        "kind": "identidad",
                        "cve": None,
                        "cvss": 7.8,
                        "epss": 0.65,
                        "kev": False,
                        "exploitPublic": True,
                        "assetId": user_id,
                        "status": "abierto",
                        "remediation": "kerberoast",
                        "technique": "Kerberoasting (T1558.003)",
                        "description": f"ServicePrincipalName en {name}.",
                        "leadsTo": [dc_id] if dc_id else [],
                    })

                if dont_req_preauth:
                    findings.append({
                        "id": f"F-BH-ASREP-{len(findings) + 1:03d}",
                        "title": f"AS-REP Roasting en {clean_name}",
                        "kind": "identidad",
                        "cve": None,
                        "cvss": 7.5,
                        "epss": None,
                        "kev": False,
                        "exploitPublic": True,
                        "assetId": user_id,
                        "status": "abierto",
                        "remediation": "weak_credentials",
                        "technique": "AS-REP Roasting (T1558.004)",
                        "description": f"Pre-autenticación deshabilitada en {name}.",
                        "leadsTo": [],
                    })

    if dc_id:
        for f in findings:
            if not f.get("leadsTo") and f["assetId"] != dc_id:
                f["leadsTo"] = [dc_id]

    return {
        "message": f"BloodHound procesado: {len(assets)} objetos AD y {len(findings)} hallazgos.",
        "assets": assets,
        "findings": findings,
        "edges": edges,
        "total_activos": len(assets),
        "total_hallazgos": len(findings),
    }


@router.post("/import-bloodhound")
def import_bloodhound_json(req: dict) -> dict:
    """Convierte el JSON de BloodHound enviado en el body en activos, hallazgos y aristas."""
    import json
    return parse_bloodhound_json_content(json.dumps(req))


@router.post("/bloodhound/upload")
async def upload_bloodhound_file(file: UploadFile = File(...)) -> dict:
    """Recibe un archivo JSON exportado por SharpHound / BloodHound y devuelve la topología procesada."""
    if not (file.filename or "").lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .json (SharpHound / BloodHound).")
    try:
        content = await leer_limitado(file)
        return parse_bloodhound_json_content(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno procesando BloodHound.") from e
