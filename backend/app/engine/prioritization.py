"""CTEM-Nexus · motor de priorización y rutas de ataque (traducción línea a línea de frontend/src/engine/engine.ts).

Mismas constantes, mismo orden de operaciones, mismo redondeo y mismos textos. La paridad se comprueba con
shared/golden-demo.json (backend/tests/test_parity.py). Fórmula documentada en docs/SCORING.md.
Trabaja con diccionarios en camelCase (el mismo JSON que usa la interfaz).
"""
from __future__ import annotations

import math
from datetime import date
from typing import Any

ENGINE_VERSION = "1.2.0"

PROFILES = {
    "defecto": {"severidad": 30, "explotabilidad": 25, "criticidad": 20, "exposicion": 10, "proximidad": 15},
    "ot": {"severidad": 20, "explotabilidad": 20, "criticidad": 30, "exposicion": 10, "proximidad": 20},
    "banca": {"severidad": 25, "explotabilidad": 30, "criticidad": 20, "exposicion": 15, "proximidad": 10},
}
DEFAULT_PROFILE = "defecto"
WEIGHTS = PROFILES[DEFAULT_PROFILE]
EXPLOIT_PUBLIC_FLOOR = 0.6
PROXIMITY_HOPS = 4
VALIDATED_BONUS = 5
NOT_EXPLOITABLE_FACTOR = 0.25
BAND_THRESHOLDS = [("critica", 80), ("alta", 60), ("media", 40), ("baja", 0)]
SLA_DAYS = {"critica": 3, "alta": 14, "media": 30, "baja": 90}
SLA_POLICIES = {
    "estandar": SLA_DAYS,
    "ens_basica": {"critica": 7, "alta": 30, "media": 60, "baja": 120},
    "ens_media": {"critica": 3, "alta": 14, "media": 30, "baja": 90},
    "ens_alta": {"critica": 2, "alta": 7, "media": 21, "baja": 60},
}
DEFAULT_SLA_POLICY = "estandar"
BAND_LABEL = {"critica": "Crítica", "alta": "Alta", "media": "Media", "baja": "Baja"}
MAX_PATH_DEPTH = 8
MAX_PATHS = 2000
CHOKE_SHARE = 0.4
CHOKE_MIN_PATHS = 2
INTERNET_ID = "internet"

Json = dict[str, Any]


def r1(x: float) -> float:
    """Redondeo a una décima, «mitad hacia arriba» (igual que Math.floor(x * 10 + 0.5) / 10 en TS)."""
    return math.floor(x * 10 + 0.5) / 10


def _clamp(x: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, x))


def fmt(x: float) -> str:
    """Número con coma decimal y una cifra: 7.5 → «7,5»."""
    return f"{r1(x):.1f}".replace(".", ",")


def _num_js(x: float) -> str:
    """String(n) de JavaScript para valores sencillos (0.25 → '0.25', 5.0 → '5')."""
    return str(int(x)) if float(x).is_integer() else repr(float(x))


def is_active(f: Json) -> bool:
    return f.get("status") in ("abierto", "validado")


def _enables_movement(f: Json) -> bool:
    return f.get("status") not in ("mitigado", "no_explotable")


def band_for(score: float) -> str:
    for band, minimum in BAND_THRESHOLDS:
        if score >= minimum:
            return band
    return "baja"


# ───────────────────────── Grafo ─────────────────────────

def build_graph(inp: Json) -> tuple[list[Json], list[Json]]:
    assets = inp.get("assets", [])
    ids = {a["id"] for a in assets}
    nodes: list[Json] = [{"id": INTERNET_ID, "label": "Internet", "type": "internet", "criticality": 0, "entry": False, "crown": False}]
    for a in sorted(assets, key=lambda a: a["id"]):
        nodes.append({
            "id": a["id"], "label": a["name"], "type": a["type"], "criticality": a["criticality"],
            "entry": bool(a.get("internetExposed")), "crown": a["criticality"] == 5,
        })
    edges: dict[str, Json] = {}

    def add(frm: str, to: str, technique: str, finding_id: str | None, manual: bool) -> None:
        if frm == to:
            return
        if frm != INTERNET_ID and frm not in ids:
            return
        if to not in ids:
            return
        eid = f"{frm}->{to}"
        e = edges.get(eid)
        if e is None:
            e = {"id": eid, "from": frm, "to": to, "techniques": [], "findingIds": [], "manual": False}
            edges[eid] = e
        if technique not in e["techniques"]:
            e["techniques"].append(technique)
        if finding_id and finding_id not in e["findingIds"]:
            e["findingIds"].append(finding_id)
        if manual:
            e["manual"] = True

    for a in assets:
        if a.get("internetExposed"):
            add(INTERNET_ID, a["id"], "Expuesto a Internet", None, False)
    for f in inp.get("findings", []):
        leads = f.get("leadsTo") or []
        if not _enables_movement(f) or not leads:
            continue
        frm = f.get("edgeFrom") or f["assetId"]
        for to in leads:
            add(frm, to, f.get("technique") or f["title"], f["id"], False)
    for m in inp.get("edges", []):
        add(m["from"], m["to"], m["technique"], None, True)
    return nodes, sorted(edges.values(), key=lambda e: e["id"])


def _adjacency(edges: list[Json]) -> dict[str, list[str]]:
    adj: dict[str, list[str]] = {}
    for e in edges:
        adj.setdefault(e["from"], []).append(e["to"])
    for lst in adj.values():
        lst.sort()
    return adj


def hops_to_crown(nodes: list[Json], edges: list[Json]) -> dict[str, int]:
    """Saltos mínimos desde cada nodo hasta la joya de la corona más cercana (BFS inverso multiorigen)."""
    rev: dict[str, list[str]] = {}
    for e in edges:
        rev.setdefault(e["to"], []).append(e["from"])
    dist: dict[str, int] = {}
    queue: list[str] = []
    for n in nodes:
        if n["crown"]:
            dist[n["id"]] = 0
            queue.append(n["id"])
    i = 0
    while i < len(queue):
        cur = queue[i]
        i += 1
        d = dist[cur]
        for prev in sorted(rev.get(cur, [])):
            if prev == INTERNET_ID or prev in dist:
                continue
            dist[prev] = d + 1
            queue.append(prev)
    return dist


def analyze_graph(inp: Json) -> Json:
    nodes, edges = build_graph(inp)
    crown = {n["id"] for n in nodes if n["crown"]}
    adj = _adjacency(edges)
    paths: list[Json] = []
    state = {"truncated": False}
    stack = [INTERNET_ID]
    on_path = {INTERNET_ID}

    def dfs(cur: str) -> None:
        if state["truncated"]:
            return
        for nxt in adj.get(cur, []):
            if nxt in on_path:
                continue
            stack.append(nxt)
            on_path.add(nxt)
            if nxt in crown:
                if len(paths) >= MAX_PATHS:
                    state["truncated"] = True
                else:
                    paths.append({"nodes": list(stack), "target": nxt, "length": len(stack) - 1})
            if not state["truncated"] and len(stack) - 1 < MAX_PATH_DEPTH:
                dfs(nxt)
            stack.pop()
            on_path.discard(nxt)
            if state["truncated"]:
                return

    if crown:
        dfs(INTERNET_ID)

    node_count: dict[str, int] = {}
    edge_count: dict[str, int] = {}
    for p in paths:
        ns = p["nodes"]
        for n in ns[1:-1]:
            node_count[n] = node_count.get(n, 0) + 1
        for a, b in zip(ns, ns[1:]):
            eid = f"{a}->{b}"
            edge_count[eid] = edge_count.get(eid, 0) + 1
    total = len(paths)
    label = {n["id"]: n["label"] for n in nodes}

    def is_choke(c: int) -> bool:
        return total > 0 and c >= CHOKE_MIN_PATHS and c / total >= CHOKE_SHARE

    chokes: list[Json] = []
    for nid in sorted(node_count):
        c = node_count[nid]
        if is_choke(c):
            chokes.append({"id": nid, "kind": "nodo", "label": label.get(nid, nid), "paths": c, "share": r1((c / total) * 1000) / 1000})
    for eid in sorted(edge_count):
        c = edge_count[eid]
        if is_choke(c):
            frm, to = eid.split("->")
            chokes.append({"id": eid, "kind": "arista", "label": f"{label.get(frm, frm)} → {label.get(to, to)}", "paths": c, "share": r1((c / total) * 1000) / 1000})
    chokes.sort(key=lambda c: (-c["paths"], 0 if c["kind"] == "nodo" else 1, c["id"]))
    return {
        "nodes": nodes, "edges": edges, "paths": paths, "truncated": state["truncated"], "chokePoints": chokes,
        "nodePathCount": node_count, "edgePathCount": edge_count,
    }


# ───────────────────────── Puntuación ─────────────────────────

def _exploit_detail(f: Json, epss: float) -> str:
    if f.get("kev"):
        return "En el catálogo CISA KEV: explotación activa confirmada"
    if f.get("exploitPublic") and EXPLOIT_PUBLIC_FLOOR >= epss:
        return f"Exploit público disponible (EPSS {fmt(epss * 100)} %)" if epss > 0 else "Exploit público disponible"
    if epss > 0:
        return f"EPSS {fmt(epss * 100)} % de probabilidad de explotación en 30 días"
    return "Sin indicios de explotación"


def profile_of(p: Any) -> str:
    """Perfil válido (cualquier otro valor cae en el de por defecto)."""
    return p if isinstance(p, str) and p in PROFILES else DEFAULT_PROFILE


def sla_policy_of(p: Any) -> str:
    """Política de plazos válida (cualquier otro valor cae en la estándar)."""
    return p if isinstance(p, str) and p in SLA_POLICIES else DEFAULT_SLA_POLICY


def score_finding(f: Json, asset: Json | None, hops: int | None, on_attack_path: bool, w: Json | None = None, sla: Json | None = None) -> Json:
    w = w or WEIGHTS
    sla = sla or SLA_DAYS
    cvss = _clamp(float(f.get("cvss") or 0), 0, 10)
    epss = _clamp(float(f.get("epss") or 0), 0, 1)
    e = max(1 if f.get("kev") else 0, EXPLOIT_PUBLIC_FLOOR if f.get("exploitPublic") else 0, epss)
    crit = asset["criticality"] if asset else 1
    exposed = bool(asset.get("internetExposed")) if asset else False
    p = 0 if hops is None else max(0, 1 - hops / PROXIMITY_HOPS)

    sev = (cvss / 10) * w["severidad"]
    expl = e * w["explotabilidad"]
    crt = ((crit - 1) / 4) * w["criticidad"]
    exp = w["exposicion"] if exposed else 0
    prox = p * w["proximidad"]
    base = sev + expl + crt + exp + prox

    if hops is None:
        prox_detail = "Sin ruta conocida hacia una joya de la corona"
    elif hops == 0:
        prox_detail = "Afecta directamente a una joya de la corona"
    else:
        prox_detail = f"A {hops} {'salto' if hops == 1 else 'saltos'} de una joya de la corona"
    crit_detail = f"Criticidad de negocio {crit}/5" + (f" ({asset['name']})" if asset else " (activo desconocido)")
    factors: list[Json] = [
        {"key": "severidad", "label": "Severidad", "points": r1(sev), "max": w["severidad"], "detail": f"CVSS {fmt(cvss)}"},
        {"key": "explotabilidad", "label": "Explotabilidad", "points": r1(expl), "max": w["explotabilidad"], "detail": _exploit_detail(f, epss)},
        {"key": "criticidad", "label": "Criticidad del activo", "points": r1(crt), "max": w["criticidad"], "detail": crit_detail},
        {"key": "exposicion", "label": "Exposición", "points": r1(exp), "max": w["exposicion"], "detail": "Expuesto a Internet" if exposed else "Solo accesible desde la red interna"},
        {"key": "proximidad", "label": "Proximidad", "points": r1(prox), "max": w["proximidad"], "detail": prox_detail},
    ]

    raw = base
    status = f.get("status")
    if status == "validado":
        raw = base + VALIDATED_BONUS
        factors.append({"key": "validacion", "label": "Validación", "points": VALIDATED_BONUS, "max": VALIDATED_BONUS, "detail": "Validado como explotable"})
    elif status == "no_explotable":
        raw = base * NOT_EXPLOITABLE_FACTOR
        factors.append({"key": "validacion", "label": "Validación", "points": r1(raw - base), "max": 0, "detail": f"Validado como no explotable (×{_num_js(NOT_EXPLOITABLE_FACTOR).replace('.', ',')})"})
    score = min(100, r1(raw))
    band = band_for(score)

    ranked = sorted(((fa, i) for i, fa in enumerate(factors[:5]) if fa["points"] > 0), key=lambda t: (-t[0]["points"], t[1]))
    reasons = [fa["detail"] for fa, _ in ranked[:3]] + ([factors[5]["detail"]] if len(factors) > 5 else [])
    if status == "mitigado":
        prefix = "Mitigado; puntuación de referencia"
    elif status == "aceptado":
        prefix = "Riesgo aceptado; puntuación de referencia"
    else:
        prefix = f"Prioridad {BAND_LABEL[band]}"
    explanation = f"{prefix} ({fmt(score)}/100). {'; '.join(reasons) if reasons else 'Sin factores de riesgo relevantes'}."
    return {
        "id": f["id"], "score": score, "band": band, "factors": factors, "explanation": explanation,
        "hopsToCrown": hops, "onAttackPath": on_attack_path, "slaDays": sla[band],
    }


# ───────────────────────── Resumen ─────────────────────────

def exposure_index_of(active_scores: list[float]) -> float:
    """Índice de exposición: 0,5 × la peor puntuación + 0,5 × la media de las cinco peores (hallazgos activos)."""
    if not active_scores:
        return 0
    scores = sorted(active_scores, reverse=True)
    top = scores[:5]
    return r1(0.5 * scores[0] + 0.5 * (sum(top) / len(top)))


def summarize(inp: Json, scored: list[Json], graph: Json) -> Json:
    by_id = {f["id"]: f for f in inp.get("findings", [])}
    open_ = [s for s in scored if s["id"] in by_id and is_active(by_id[s["id"]])]
    by_band = {"critica": 0, "alta": 0, "media": 0, "baja": 0}
    for s in open_:
        by_band[s["band"]] += 1
    exposure = exposure_index_of([s["score"] for s in open_])
    at_risk = {by_id[s["id"]]["assetId"] for s in open_ if s["band"] in ("critica", "alta")}
    resolved = [f for f in inp.get("findings", []) if f.get("status") == "mitigado" and f.get("detectedAt") and f.get("resolvedAt")]
    mttr = None
    if resolved:
        total = sum((date.fromisoformat(f["resolvedAt"][:10]) - date.fromisoformat(f["detectedAt"][:10])).days for f in resolved)
        mttr = r1(total / len(resolved))
    return {
        "exposureIndex": exposure,
        "openFindings": len(open_),
        "byBand": by_band,
        "kevOpen": sum(1 for s in open_ if by_id[s["id"]].get("kev")),
        "assetsAtRisk": len(at_risk),
        "chokePoints": sum(1 for c in graph["chokePoints"] if c["kind"] == "nodo"),
        "attackPaths": len(graph["paths"]),
        "mttrDays": mttr,
        "accepted": sum(1 for f in inp.get("findings", []) if f.get("status") == "aceptado"),
    }


# ───────────────────────── Entrada principal ─────────────────────────

def prioritize(inp: Json) -> Json:
    profile = profile_of(inp.get("profile"))
    w = PROFILES[profile]
    sla_policy = sla_policy_of(inp.get("slaPolicy"))
    sla = SLA_POLICIES[sla_policy]
    graph = analyze_graph(inp)
    hops = hops_to_crown(graph["nodes"], graph["edges"])
    on_path = {n for p in graph["paths"] for n in p["nodes"] if n != INTERNET_ID}
    assets = {a["id"]: a for a in inp.get("assets", [])}

    def finding_hops(f: Json) -> int | None:
        best = hops.get(f["assetId"])
        if _enables_movement(f):
            for t in f.get("leadsTo") or []:
                if t in hops and (best is None or hops[t] + 1 < best):
                    best = hops[t] + 1
        return best

    scored = [score_finding(f, assets.get(f["assetId"]), finding_hops(f), f["assetId"] in on_path, w, sla) for f in inp.get("findings", [])]
    scored.sort(key=lambda s: (-s["score"], s["id"]))
    return {"engine": "python", "version": ENGINE_VERSION, "profile": profile, "slaPolicy": sla_policy, "scored": scored, "graph": graph, "summary": summarize(inp, scored, graph)}
