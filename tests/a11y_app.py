"""Accesibilidad con axe-core (WCAG 2.2 A/AA) en todas las vistas, diálogos y estados; claro y oscuro; 1440 y 390 px.

Uso:  python3 tests/a11y_app.py   (tras `npm run build`; falla si hay alguna infracción; detalle en tests/artifacts/a11y.json)
axe-core se inyecta con la CSP desactivada solo en este contexto; la CSP y la ausencia de peticiones se prueban en e2e_app.py.
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = (ROOT / "frontend" / "dist" / "ctem-nexus.html").as_uri() + "?test"
AXE = ROOT / "tests" / "vendor" / "axe.min.js"
OUT = ROOT / "tests" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
S = "window.__CTEM__.getState()"
VIEWS = ["panel", "alcance", "priorizacion", "rutas", "movilizacion", "ajustes"]
HELP_TABS = ["Ciclo CTEM", "Cálculo de riesgo", "Ingesta de datos", "Atajos de teclado", "Glosario", "Acerca de"]


def states(page, mobile):
    """Recorre vistas y diálogos: vacío, demo en cada vista, detalle, formularios, ingestas, ayuda, búsqueda, menús y perfil."""
    J = page.evaluate
    J(f"{S}.reset()"); J(f"{S}.setView('panel')"); yield "vacio/panel"
    J(f"{S}.loadDemo()")
    for v in VIEWS:
        J(f"{S}.setView('{v}')"); yield f"demo/{v}"
    J(f"{S}.setView('priorizacion')"); J(f"{S}.selectFinding('H-001')"); yield "detalle/H-001"
    page.keyboard.press("Escape"); J(f"{S}.selectFinding(null)")
    page.get_by_role("button", name="Añadir hallazgo").first.click(); yield "formulario/hallazgo"
    page.get_by_role("button", name="Cerrar panel").click()
    page.get_by_role("button", name="Importar Nmap XML").first.click(); yield "ingesta/nmap"
    page.locator('input[type="file"][accept=".xml,text/xml"]').set_input_files(str(ROOT / "shared" / "samples" / "nmap-ejemplo.xml"))
    page.get_by_role("button", name="Analizar escaneo").click()
    page.get_by_text("Escaneo analizado con éxito").wait_for(); yield "ingesta/nmap-resultado"
    page.get_by_role("button", name="Cerrar ventana").click()
    page.get_by_role("button", name="Importar BloodHound").first.click(); yield "ingesta/bloodhound"
    page.locator('input[type="file"][accept=".json,application/json"]').last.set_input_files(str(ROOT / "shared" / "samples" / "bloodhound-ejemplo.json"))
    page.get_by_role("button", name="Analizar BloodHound").click()
    page.get_by_text("Estructura Active Directory parseada").wait_for(); yield "ingesta/bloodhound-resultado"
    page.get_by_role("button", name="Cerrar ventana").click()
    J(f"{S}.setView('alcance')")
    page.get_by_role("button", name="Añadir activo").first.click(); yield "formulario/activo"
    page.get_by_role("button", name="Cerrar panel").click()
    J(f"{S}.setView('rutas')")
    page.locator("[data-testid=ruta]").first.click(); yield "rutas/seleccionada"
    J(f"{S}.setView('movilizacion')")
    J(f"{S}.setHelpOpen(true)")
    for t in HELP_TABS:
        page.get_by_role("tab", name=t).click(); yield f"ayuda/{t}"
    J(f"{S}.setHelpOpen(false)")
    J(f"{S}.setSearchOpen(true)"); yield "buscar/vacio"
    page.keyboard.type("log4"); yield "buscar/resultados"
    page.keyboard.press("Escape")
    if mobile:
        page.get_by_role("button", name="Más").click(); yield "movil/mas"
        page.get_by_role("button", name="Más").click()
    else:
        page.get_by_role("button", name="Color de acento").click(); yield "lateral/acento"
        page.keyboard.press("Escape")
    page.get_by_role("button", name="Cuenta").first.click(); yield "menu/cuenta"
    page.get_by_role("menuitem", name="Perfil").click(); yield "perfil"
    page.keyboard.press("Escape")
    J(f"{S}.setLang('en')")
    for v in VIEWS:
        J(f"{S}.setView('{v}')"); yield f"en/{v}"
    J(f"{S}.setLang('es')")


# Barrido propio de contraste: cubre lo que axe deja «incompleto» (sombras, solapes). Compone los fondos sólidos de los
# ancestros; omite SVG, controles deshabilitados, elementos atenuados a propósito y fondos con imagen o degradado.
CONTRASTE = """() => {
  const rgba = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1); };
  const fallos = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const vistos = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || vistos.has(el) || !n.textContent.trim() || el.closest('svg, [disabled], [aria-disabled=true], .sr-only, [aria-hidden=true]')) continue;
    vistos.add(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let op = 1, bgs = [], imagen = false;
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.visibility === 'hidden' || cs.display === 'none') { op = 0; break; }
      op *= Number(cs.opacity);
      if (cs.backgroundImage !== 'none') imagen = true;
      const bg = rgba(cs.backgroundColor);
      if (bg && bg[3] > 0) { bgs.push(bg); if (bg[3] >= 1) break; }
    }
    if (op < 1 || imagen) continue;
    let fondo = [255, 255, 255, 1];
    for (const b of bgs.reverse()) fondo = over(b, fondo);
    const cs = getComputedStyle(el);
    const fg = over(rgba(cs.color) || [0, 0, 0, 1], fondo);
    const L1 = lum(fg), L2 = lum(fondo);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const minimo = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
    if (ratio < minimo - 0.02) fallos.push({ texto: n.textContent.trim().slice(0, 40), clase: el.className.toString().slice(0, 60), ratio: Math.round(ratio * 100) / 100 });
  }
  return fallos;
}"""


def settle(page):
    """Espera a que terminen transiciones y animaciones: axe mediría colores a medio fundido."""
    page.wait_for_timeout(50)
    page.wait_for_function("document.getAnimations().every(a => a.playState !== 'running')", timeout=5000)


def main():
    total, report, vistos = 0, [], 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for scheme in ["light", "dark"]:
            for w, h in [(1440, 900), (390, 844)]:
                ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, bypass_csp=True, reduced_motion="reduce")
                page = ctx.new_page()
                page.clock.set_fixed_time("2026-10-08T10:00:00")
                page.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
                page.goto(APP)
                page.wait_for_function("!!window.__CTEM__")
                page.evaluate(f"{S}.setTheme('{scheme}')")
                page.add_script_tag(path=str(AXE))
                for name in states(page, w < 768):
                    vistos += 1
                    settle(page)
                    res = page.evaluate("tags => axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] })", TAGS)
                    # axe deja como «incompleto» el texto corto (cifras, insignias) aunque mida el contraste: si lo mide y no llega, es una infracción.
                    cortos = [n for v in res["incomplete"] if v["id"] == "color-contrast" for n in v["nodes"]
                              if any((c.get("data") or {}).get("contrastRatio", 0) and c["data"]["contrastRatio"] < c["data"].get("expectedContrastRatio", 4.5) for c in n["any"])]
                    if cortos:
                        res["violations"].append({"id": "color-contrast (texto corto)", "nodes": cortos})
                    propios = page.evaluate(CONTRASTE)
                    if propios:
                        res["violations"].append({"id": "contraste (barrido propio)", "nodes": [{"target": [f"{x['texto']} · {x['clase']}"], "failureSummary": f"contraste {x['ratio']}:1"} for x in propios]})
                    for v in res["violations"]:
                        n = len(v["nodes"]); total += n
                        report.append({"tema": scheme, "ancho": w, "estado": name, "regla": v["id"], "nodos": n,
                                       "ejemplos": [x["target"] for x in v["nodes"][:4]],
                                       "detalle": v["nodes"][0].get("failureSummary", "")[:300]})
                ctx.close()
        b.close()
    (OUT / "a11y.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in report:
        print(f"  ✘ {r['tema']:5} {r['ancho']:4} {r['estado']:26} {r['regla']:22} {r['nodos']:3}  {r['ejemplos'][0]}  {r['detalle'][:150]}")
    print(f"\naxe-core: {vistos} estados analizados · {total} nodos con infracciones en {len(report)} combinaciones")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
