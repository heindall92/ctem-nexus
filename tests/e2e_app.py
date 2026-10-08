"""Pruebas de extremo a extremo de CTEM-Nexus sobre el HTML autocontenido (frontend/dist/ctem-nexus.html).

Uso:  python3 tests/e2e_app.py   (tras `npm run build`; falla si alguna comprobación no se cumple)
Red bloqueada: cualquier petición que no sea file:, data: o blob: cuenta como fallo, igual que un error de consola.
"""
import json
import pathlib
import re
import sys

from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = (ROOT / "frontend" / "dist" / "ctem-nexus.html").as_uri() + "?test"
NMAP = ROOT / "shared" / "samples" / "nmap-ejemplo.xml"
OUT = ROOT / "tests" / "artifacts"
OUT.mkdir(parents=True, exist_ok=True)
S = "window.__CTEM__.getState()"
HOY = "2026-10-08T10:00:00"

resultados = []


def esperar(page, expr, timeout=5000):
    """Sondea una expresión con evaluate: wait_for_function necesita eval y la CSP de la app lo prohíbe."""
    for _ in range(timeout // 50):
        if page.evaluate(expr):
            return
        page.wait_for_timeout(50)
    raise AssertionError(f"no se cumplió a tiempo: {expr}")


def check(nombre, cond, detalle=""):
    resultados.append((nombre, bool(cond), detalle))
    print(f"  {'✔' if cond else '✘'} {nombre}{'' if cond else f'  → {detalle}'}")


def abrir(browser, ancho=1440, alto=900, tema="dark"):
    ctx = browser.new_context(viewport={"width": ancho, "height": alto}, color_scheme=tema, reduced_motion="reduce", accept_downloads=True)
    page = ctx.new_page()
    page.clock.set_fixed_time(HOY)
    problemas = []
    page.on("console", lambda m: problemas.append(f"consola: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: problemas.append(f"excepción: {e}"))
    page.on("request", lambda r: None if re.match(r"^(file|data|blob):", r.url) else problemas.append(f"petición externa: {r.url}"))
    page.goto(APP)
    esperar(page, "!!window.__CTEM__")
    return ctx, page, problemas


ESPANOL = re.compile(r"[áéíóúñ¿¡]|\\b(de|del|los|las|para|con|sin|una|hallazgos?|activos?|rutas?|importar|añadir|guardar|cerrar|todas|joyas?|corona|ajustes|panel|inicio|alcance|exposición|criticidad|validación|movilización|priorización|puntuación|abiertos?|mitigados?|días)\\b", re.I)


def texto_sin_datos(page):
    """Texto visible menos los datos del proyecto (nombres, títulos, técnicas…), el texto del grafo y el nombre del autor."""
    return page.evaluate(f"""() => {{
      const p = {S}.project;
      const datos = [p.name, ...p.assets.flatMap(a => [a.name, a.owner, ...a.tags]), ...p.findings.flatMap(f => [f.title, f.technique || '', f.description || '']),
        ...p.ranges.map(r => r.label), ...p.edges.map(e => e.technique), ...[...document.querySelectorAll('svg text, svg tspan')].map(t => t.textContent),
        'Yoandy Ramírez Delgado'].filter(Boolean).sort((a, b) => b.length - a.length);
      let t = document.body.innerText;
      for (const d of datos) t = t.split(d).join(' ');
      return t;
    }}""")


def restos_en_espanol(page):
    page.wait_for_timeout(250)
    return sorted({l.strip() for l in texto_sin_datos(page).split("\n") if l.strip() and ESPANOL.search(l)})


def nav(page, nombre):
    page.get_by_role("navigation", name="Secciones").get_by_role("button", name=nombre).click()


def escritorio(b, tmp):
    print("Escritorio · 1440 px")
    ctx, page, problemas = abrir(b)
    J = page.evaluate

    csp = page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute("content") or ""
    check("CSP estricta: default-src 'none' y scripts solo por hash", "default-src 'none'" in csp and "script-src 'sha256-" in csp and "unsafe" not in csp, csp[:120])

    expect(page.get_by_text("Todavía no hay datos")).to_be_visible()
    check("estado vacío con las tres entradas", page.get_by_role("button", name="Cargar datos de demo").is_visible() and page.get_by_role("button", name="Definir el alcance").is_visible())

    # Controles únicos: búsqueda, idioma, tema y ayuda solo en la barra superior
    check("un solo botón de búsqueda visible", page.get_by_role("button", name=re.compile("^Buscar")).count() == 1, page.get_by_role("button", name=re.compile("^Buscar")).count())
    check("un solo selector de idioma visible", page.get_by_role("group", name="Idioma").count() == 1)
    check("un solo interruptor de tema visible", page.get_by_role("switch", name=re.compile("^Tema")).count() == 1)
    cuenta = page.get_by_role("button", name=re.compile("^Cuenta"))
    check("una sola cuenta visible en escritorio (en el lateral)", cuenta.count() == 1, cuenta.count())
    check("sin nombre, el avatar muestra el icono de usuario y no un «·»", cuenta.locator("svg").count() >= 1 and "·" not in cuenta.inner_text(), cuenta.inner_text())

    page.get_by_role("button", name="Cargar datos de demo").click()
    check("la demo carga 8 activos y 20 hallazgos", J(f"{S}.project.assets.length") == 8 and J(f"{S}.project.findings.length") == 20)
    det = J(f"{S}.project.findings.find(f => f.id === 'H-001').detectedAt")
    check("las fechas de la demo se desplazan a hoy (no envejece)", det == "2026-09-24", det)

    for nombre, vista in [("Alcance y activos", "alcance"), ("Priorización", "priorizacion"), ("Rutas de ataque", "rutas"), ("Movilización", "movilizacion"), ("Ajustes y datos", "ajustes"), ("Inicio", "panel")]:
        nav(page, nombre)
        check(f"navegación a {nombre}", J(f"{S}.view") == vista and page.get_by_role("navigation", name="Secciones").get_by_role("button", name=nombre).get_attribute("aria-current") == "page")

    check("el panel avisa de los tickets fuera de plazo", page.get_by_text(re.compile(r"\d+ fuera de plazo \(SLA\)")).count() == 1)

    # Priorización: EPSS en una sola línea y detalle del hallazgo
    nav(page, "Priorización")
    celda = page.locator("td", has_text="94,4").first
    alto = celda.locator("xpath=.").bounding_box()["height"]
    texto = celda.inner_text()
    check("EPSS «94,4 %» con espacio duro y en una línea", " %" in texto and alto < 60, f"{texto!r} alto={alto}")
    page.get_by_text("Log4Shell en Apache Log4j 2").first.click()
    dialogo = page.get_by_role("dialog")
    expect(dialogo).to_be_visible()
    check("el detalle se abre como diálogo con nombre accesible", dialogo.count() == 1 and (dialogo.get_attribute("aria-labelledby") or "") != "")
    dialogo.get_by_role("button", name="Mitigado").click()
    page.wait_for_timeout(300)
    check("cambiar el estado dentro del detalle no saca el foco del panel", page.evaluate("!!document.activeElement?.closest('[role=dialog]')"), page.evaluate("document.activeElement?.outerHTML?.slice(0, 80)"))
    dialogo.get_by_role("button", name="Validado").click()
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)
    check("Escape cierra el detalle", True)

    # Ingesta de Nmap: fichero real y fichero con entidades
    antes = J(f"{S}.project.assets.length")
    page.get_by_role("button", name="Importar Nmap XML").first.click()
    modal = page.get_by_role("dialog", name=re.compile("Nmap"))
    check("la ingesta de Nmap es un diálogo con título", modal.count() == 1)
    entrada = modal.locator('input[type="file"]')
    check("el selector de fichero es accesible con el teclado (no display:none)", entrada.evaluate("e => getComputedStyle(e).display") != "none")
    xxe = tmp / "bomba.xml"
    xxe.write_text('<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><nmaprun>&b;</nmaprun>', encoding="utf-8")
    entrada.set_input_files(str(xxe))
    modal.get_by_role("button", name="Analizar escaneo").click()
    expect(modal.get_by_text("se rechaza por seguridad")).to_be_visible()
    check("rechaza un XML con entidades («billion laughs»)", True)
    entrada.set_input_files(str(NMAP))
    modal.get_by_role("button", name="Analizar escaneo").click()
    expect(modal.get_by_text("Escaneo analizado con éxito")).to_be_visible()
    check("analiza el Nmap de ejemplo en el navegador: 3 hosts activos", modal.get_by_text("3 activos").count() == 1)
    modal.get_by_role("button", name="Incorporar activos al programa CTEM").click()
    despues = J(f"{S}.project.assets.length")
    check("incorpora los activos del escaneo", despues == antes + 3, f"{antes} → {despues}")
    if page.get_by_role("dialog").count():
        page.keyboard.press("Escape")

    # Ingesta de BloodHound desde Rutas de ataque
    nav(page, "Rutas de ataque")
    antes = J(f"{S}.project.findings.length")
    page.get_by_role("button", name="Importar BloodHound (AD)").click()
    bh = page.get_by_role("dialog", name=re.compile("BloodHound"))
    bh.locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / "bloodhound-ejemplo.json"))
    bh.get_by_role("button", name="Analizar BloodHound").click()
    expect(bh.get_by_text("Estructura de Active Directory analizada")).to_be_visible()
    bh.get_by_role("button", name="Mapear topología de AD en CTEM-Nexus").click()
    check("BloodHound añade hallazgos de identidad (kerberoasting, AS-REP, delegación)", J(f"{S}.project.findings.length") >= antes + 3, f"{antes} → {J(f'{S}.project.findings.length')}")
    if page.get_by_role("dialog").count():
        page.keyboard.press("Escape")
    J(f"{S}.loadDemo()")

    # Rutas de ataque: grafo accesible, nombres completos y validación que corta rutas
    nav(page, "Rutas de ataque")
    grafo = page.get_by_role("group", name=re.compile("^Grafo de ataque"))
    check("el grafo es un grupo con nodos enfocables (sin interactivos dentro de una imagen)", grafo.count() == 1 and grafo.get_by_role("button").count() >= 8)
    titulos = page.locator("svg g.g-node > title").all_text_contents()
    check("cada nodo conserva su nombre completo", "Servidor de aplicaciones APP01" in titulos and "Estaciones de trabajo (VLAN 50)" in titulos, titulos[:4])
    rutas = page.locator("[data-testid=ruta]").count()
    fila = page.locator("tr", has_text="H-002")
    fila.get_by_role("button", name="No explotable").click()
    rutas2 = page.locator("[data-testid=ruta]").count()
    check("marcar «No explotable» corta las rutas que dependían del hallazgo", rutas2 < rutas, f"{rutas} → {rutas2}")
    page.locator("[data-testid=ruta]").first.click()
    check("seleccionar una ruta la marca como pulsada", page.locator("[data-testid=ruta]").first.get_attribute("aria-pressed") == "true")

    # Movilización: SLA vencidos visibles e informe con versión
    nav(page, "Movilización")
    check("los tickets vencidos se señalan («vencido hace N d»)", page.get_by_text(re.compile(r"vencido hace \d+ d")).count() >= 1)
    check("la cabecera de tickets cuenta los fuera de plazo", page.get_by_text(re.compile(r"\d+ fuera de plazo$")).count() == 1)
    version = json.loads((ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))["version"]
    check("el informe muestra la versión de la aplicación", page.get_by_text(f"CTEM-Nexus {version}").count() >= 1)
    with page.expect_download() as d:
        page.get_by_role("button", name="Tickets .md").click()
    md = pathlib.Path(d.value.path()).read_text(encoding="utf-8")
    check("los tickets en Markdown incluyen la fecha límite", "**Vence:** 20" in md)

    # Exportar e importar el proyecto
    nav(page, "Ajustes y datos")
    with page.expect_download() as d:
        page.get_by_role("button", name="Exportar proyecto JSON").click()
    exportado = tmp / "proyecto.json"
    exportado.write_bytes(pathlib.Path(d.value.path()).read_bytes())
    datos = json.loads(exportado.read_text(encoding="utf-8"))
    J(f"{S}.reset()")
    page.locator('input[type="file"][accept=".json,application/json"]').set_input_files(str(exportado))
    esperar(page, f"{S}.project.assets.length === {len(datos['assets'])}")
    check("exportar y reimportar conserva activos y hallazgos", J(f"{S}.project.findings.length") == len(datos["findings"]))

    # Ayuda: diálogo con pestañas, Escape y foco de vuelta
    ayuda = page.get_by_role("button", name="Ayuda").first
    ayuda.click()
    dlg = page.get_by_role("dialog", name=re.compile("Guía y ayuda"))
    check("la ayuda es un diálogo modal con nombre", dlg.count() == 1)
    expect(dlg).to_be_focused()  # al abrirse, el diálogo toma el foco en el siguiente frame
    page.get_by_role("tab", name="Ciclo CTEM").focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("tab", name="Cálculo de riesgo")).to_have_attribute("aria-selected", "true")
    check("las pestañas de la ayuda se recorren con las flechas", page.get_by_role("tab", name="Cálculo de riesgo").evaluate("e => e === document.activeElement"))
    page.get_by_role("tab", name="Cálculo de riesgo").click()
    formula = page.get_by_test_id("formula").inner_text()
    check("la ayuda muestra la fórmula real del motor (30 · 25 · 20 · 10 · 15)", all(f"× {w}" in formula for w in (30, 25, 20, 10, 15)) and "0.35" not in formula, formula)
    page.get_by_role("tab", name="Acerca de").click()
    check("«Acerca de» enlaza las webs del ecosistema", page.get_by_role("link", name="Abrir ARGOS").count() == 1 and page.get_by_role("link", name="Abrir Rosetta").count() == 1)
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)
    check("Escape cierra la ayuda y devuelve el foco", page.evaluate("document.activeElement?.getAttribute('aria-label')") == "Ayuda")

    # Búsqueda, menú de cuenta y perfil
    page.keyboard.press("Control+k")
    busc = page.get_by_role("dialog", name=re.compile("Buscar"))
    check("Ctrl+K abre la búsqueda como diálogo con campo etiquetado", busc.count() == 1 and busc.get_by_role("textbox").get_attribute("aria-label") is not None)
    page.keyboard.press("Escape")
    cuenta.click()
    expect(page.get_by_role("menuitem").first).to_be_focused()
    check("el menú de cuenta enfoca su primera opción", True)
    page.keyboard.press("Escape")
    check("Escape cierra el menú de cuenta", page.get_by_role("menu").count() == 0)

    # Tema e idioma
    page.get_by_role("switch", name=re.compile("^Tema")).click()
    check("el interruptor cambia a tema claro", page.evaluate("document.documentElement.dataset.theme") == "light")
    page.get_by_role("group", name="Idioma").get_by_role("button", name="EN").click()
    check("el idioma cambia a inglés", page.evaluate("document.documentElement.lang") == "en")

    # Inglés completo: ninguna vista, detalle, formulario ni pestaña de ayuda conserva texto de interfaz en español
    J(f"{S}.loadDemo()")
    restos = {}
    for v in ["panel", "alcance", "priorizacion", "rutas", "movilizacion", "ajustes"]:
        J(f"{S}.setView('{v}')")
        restos[v] = restos_en_espanol(page)
    J(f"{S}.setView('priorizacion')"); J(f"{S}.selectFinding('H-001')")
    restos["detalle"] = restos_en_espanol(page)
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Add finding").first.click()
    restos["formulario"] = restos_en_espanol(page)
    page.keyboard.press("Escape")
    J(f"{S}.setHelpOpen(true)")
    for t in ["CTEM cycle", "Risk scoring", "Data intake", "Keyboard shortcuts", "Glossary", "About"]:
        page.get_by_role("tab", name=t).click()
        restos[f"ayuda/{t}"] = restos_en_espanol(page)
    J(f"{S}.setHelpOpen(false)")
    sucios = {k: v[:3] for k, v in restos.items() if v}
    check("en inglés no queda texto de interfaz en español (14 pantallas)", not sucios, sucios)
    J(f"{S}.setLang('es')")

    check("sin errores de consola ni peticiones externas", not problemas, problemas[:5])
    ctx.close()


def movil(b):
    print("Móvil · 390 px")
    ctx, page, problemas = abrir(b, 390, 844, "light")
    page.evaluate(f"{S}.loadDemo()")
    barra = page.get_by_role("navigation", name="Secciones")
    check("barra inferior con cinco destinos", barra.get_by_role("button").count() == 5)
    barra.get_by_role("button", name="Priorización").click()
    check("la barra inferior navega", page.evaluate(f"{S}.view") == "priorizacion")
    cuenta = page.get_by_role("button", name=re.compile("^Cuenta"))
    check("en móvil la cuenta está en la barra superior", cuenta.count() == 1)
    ancho = page.evaluate("document.documentElement.scrollWidth")
    check("sin desplazamiento horizontal de la página", ancho <= 390, ancho)
    barra.get_by_role("button", name="Más").click()
    page.get_by_role("button", name="Alcance y activos").click()
    check("«Más» lleva a las vistas secundarias", page.evaluate(f"{S}.view") == "alcance")
    check("sin errores de consola ni peticiones externas", not problemas, problemas[:5])
    ctx.close()


def main():
    tmp = OUT / "tmp"
    tmp.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        escritorio(b, tmp)
        movil(b)
        b.close()
    fallos = [r for r in resultados if not r[1]]
    print(f"\ne2e: {len(resultados) - len(fallos)}/{len(resultados)} comprobaciones superadas")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
