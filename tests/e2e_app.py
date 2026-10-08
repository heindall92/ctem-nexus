"""Pruebas de extremo a extremo de CTEM-Nexus sobre el HTML autocontenido (frontend/dist/ctem-nexus.html).

Uso:  python3 tests/e2e_app.py   (tras `npm run build`; falla si alguna comprobación no se cumple)
Red bloqueada: cualquier petición que no sea file:, data: o blob: cuenta como fallo, igual que un error de consola.
"""
import csv
import io
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
      const datos = [p.name, ...p.assets.flatMap(a => [a.name, a.owner, ...a.tags]), ...p.findings.flatMap(f => [f.title, f.technique || '', f.description || '', f.exception?.owner || '', f.exception?.reason || '', f.exception?.compensating || '']),
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

    expect(page.get_by_role("heading", level=1, name="Todavía no hay datos")).to_be_visible()
    check("estado vacío con las tres entradas", all(page.get_by_role("button", name=n).is_visible() for n in ("Cargar datos de demo", "Importar escaneo Nmap", "Definir el alcance")))
    page.get_by_role("button", name="Importar escaneo Nmap").click()
    check("la entrada «Importar escaneo Nmap» abre la ingesta sin salir del panel", page.get_by_role("dialog", name=re.compile("Nmap")).count() == 1)
    page.keyboard.press("Escape")
    flujo = page.locator(".cycle-flow").first
    check("con movimiento reducido, la ilustración del ciclo no se anima", flujo.evaluate("e => getComputedStyle(e).animationName") == "none")
    check("el título de la pestaña sigue a la vista", page.title().startswith("Panel de exposición"), page.title())

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

    for nombre, vista in [("Alcance y activos", "alcance"), ("Priorización", "priorizacion"), ("Rutas de ataque", "rutas"), ("Mapa ATT&CK", "mitre"), ("¿Y si…?", "simulacion"), ("Movilización", "movilizacion"), ("Ajustes y datos", "ajustes"), ("Inicio", "panel")]:
        nav(page, nombre)
        check(f"navegación a {nombre}", J(f"{S}.view") == vista and page.get_by_role("navigation", name="Secciones").get_by_role("button", name=nombre).get_attribute("aria-current") == "page")

    check("el panel avisa de los tickets fuera de plazo", page.get_by_text(re.compile(r"\d+ fuera de plazo \(SLA\)")).count() == 1)

    # Panel: franjas de exposición, tres acciones para hoy y un solo h1 por vista
    franjas = page.get_by_role("group", name="Franjas de exposición por activo")
    marcas = franjas.locator(".lane-mark")
    abiertos = J(f"{S}.project.findings.filter(f => f.status === 'abierto' || f.status === 'validado').length")
    check("una marca por hallazgo abierto en las franjas", marcas.count() == abiertos, f"{marcas.count()} de {abiertos}")
    anillos = J("[...document.querySelectorAll('main svg circle')].filter(c => Number(c.getAttribute('r')) > 30).length")
    check("el panel no usa anillos ni gráficos circulares", anillos == 0, anillos)
    marcas.first.focus()
    expect(franjas.get_by_role("tooltip")).to_be_visible()
    check("enfocar una marca muestra su ficha (teclado incluido)", len(franjas.get_by_role("tooltip").inner_text()) > 10)
    acciones = page.get_by_test_id("acciones-hoy").locator("li")
    check("tres acciones para hoy, con las rutas que rompe cada una", acciones.count() == 3 and "Rompe" in acciones.first.inner_text(), acciones.first.inner_text()[:80])
    acciones.first.get_by_role("button").click()
    check("una acción abre su hallazgo en Priorización", J(f"{S}.view") == "priorizacion" and J(f"{S}.selectedFinding") is not None)
    page.keyboard.press("Escape")
    for nombre in ["Inicio", "Alcance y activos", "Priorización", "Rutas de ataque", "Mapa ATT&CK", "¿Y si…?", "Movilización", "Ajustes y datos"]:
        nav(page, nombre)
        h1 = page.locator("h1")
        if h1.count() != 1:
            check(f"un solo h1 en {nombre}", False, h1.count())
    check("cada vista tiene exactamente un h1 visible", True)

    # Priorización: EPSS en una sola línea y detalle del hallazgo
    nav(page, "Priorización")
    celda = page.locator("td", has_text="94,4").first
    alto = celda.locator("xpath=.").bounding_box()["height"]
    texto = celda.inner_text()
    check("EPSS «94,4 %» con espacio duro y en una línea", " %" in texto and alto < 60, f"{texto!r} alto={alto}")
    page.locator("tr", has_text="Log4Shell en Apache Log4j 2").click()
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
    zoom = page.locator("[data-zoom]")
    page.get_by_role("button", name="Acercar").click()
    check("el grafo se acerca con el botón", float(zoom.get_attribute("data-zoom")) > 1)
    page.get_by_role("button", name="Ajustar a la vista").click()
    check("«Ajustar a la vista» vuelve al encuadre completo", zoom.get_attribute("data-zoom") == "1.00")
    nodos = page.locator("svg g.g-node").count()
    page.get_by_role("button", name="Solo esta ruta").click()
    ruta_nodos = page.locator("svg g.g-node").count()
    check("«Solo esta ruta» oculta lo ajeno a la ruta y la encuadra", ruta_nodos < nodos and float(zoom.get_attribute("data-zoom")) >= 1, f"{nodos} → {ruta_nodos}")
    check("la ruta seleccionada se anima como flujo", page.locator("path.path-flow").count() >= 1)
    page.get_by_role("button", name="Solo esta ruta").click()
    check("al salir de «Solo esta ruta» vuelven todos los nodos", page.locator("svg g.g-node").count() == nodos)

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

    # Mapa ATT&CK: matriz, ficha de técnica, ida y vuelta con el hallazgo, capa de Navigator y búsqueda por ID
    nav(page, "Mapa ATT&CK")
    check("la matriz ATT&CK muestra las 11 tácticas", page.get_by_test_id("matriz-attack").locator("section").count() == 11)
    celda = page.get_by_test_id("matriz-attack").get_by_test_id("tecnica-T1190")
    anunciados = int(re.search(r": (\d+) hallazgos", celda.get_attribute("aria-label")).group(1))
    celda.click()
    ficha = page.get_by_test_id("ficha-tecnica")
    check("la ficha de T1190 lista los hallazgos que anuncia su celda, Log4Shell incluido", ficha.locator("li").count() == anunciados >= 2 and "Log4Shell" in ficha.inner_text(), anunciados)
    ficha.locator("li button").first.click()
    check("un hallazgo de la ficha abre su detalle en Priorización", J(f"{S}.view") == "priorizacion" and J(f"{S}.selectedFinding") == "H-001")
    page.get_by_test_id("attack-hallazgo").get_by_role("button").first.click()
    check("un chip ATT&CK del hallazgo abre esa técnica en el mapa", J(f"{S}.view") == "mitre" and page.get_by_test_id("ficha-tecnica").count() == 1)
    page.keyboard.press("Escape")
    with page.expect_download() as d:
        page.get_by_role("button", name="Capa para Navigator").click()
    capa = json.loads(pathlib.Path(d.value.path()).read_text(encoding="utf-8-sig"))
    expuestas = page.locator("[data-testid=matriz-attack] [data-testid^=tecnica-]").count()
    check("la capa de Navigator es válida y trae una técnica por celda expuesta", capa["domain"] == "enterprise-attack" and capa["versions"]["layer"] == "4.5" and len(capa["techniques"]) == expuestas and all(1 <= t["score"] <= 3 for t in capa["techniques"]), (len(capa["techniques"]), expuestas))
    check("un hallazgo mitigado no aporta técnicas a la capa", "H-017" not in json.dumps(capa))
    page.get_by_role("button", name=re.compile("^Buscar")).click()
    caja = page.get_by_role("textbox", name=re.compile("Buscar activo"))
    expect(caja).to_be_focused()
    caja.fill("T1558.003")
    page.get_by_role("dialog").get_by_role("button", name=re.compile("Kerberoasting")).first.click()
    check("buscar por ID de técnica abre su ficha en el mapa", J(f"{S}.view") == "mitre" and page.get_by_role("dialog", name=re.compile("Kerberoasting")).count() == 1)
    page.keyboard.press("Escape")

    # Importador unificado: Nessus con plan previo, catálogo KEV y formato equivocado
    J(f"{S}.loadDemo()"); nav(page, "Priorización")
    antes = J(f"{S}.project.findings.length")
    page.get_by_role("button", name="Importar escáner").first.click()
    imp = page.get_by_test_id("importador-escaner")
    imp.locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / "nmap-ejemplo.xml"))
    expect(imp.get_by_role("alert").filter(has_text="Importar Nmap XML")).to_have_count(1)
    check("un Nmap en el importador de escáneres remite a su importador", True)
    imp.locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / "nessus-ejemplo.nessus"))
    plan = page.get_by_test_id("plan-importacion")
    expect(plan).to_be_visible()
    check("el plan de Nessus enseña nuevos, actualizados y duplicados antes de aplicar", "hallazgos nuevos" in plan.inner_text() and "duplicados fundidos" in plan.inner_text() and J(f"{S}.project.findings.length") == antes)
    page.get_by_role("button", name="Incorporar al proyecto").click()
    check("Nessus añade 2 hallazgos, actualiza Log4Shell sin duplicarlo y queda registrado", J(f"{S}.project.findings.length") == antes + 2 and J(f"{S}.project.findings.find(f => f.id === 'H-001').sources.includes('nessus')") and J(f"{S}.project.imports[0].source") == "nessus")
    page.get_by_role("button", name="Importar escáner").first.click()
    page.get_by_test_id("importador-escaner").locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / "kev-ejemplo.json"))
    expect(page.get_by_test_id("plan-inteligencia")).to_be_visible()
    page.get_by_role("button", name="Aplicar inteligencia").click()
    check("el catálogo KEV aplicado queda versionado en el proyecto", J(f"{S}.project.intel.kev.version") == "2026.10.07")
    # Cada importador con su fichero de ejemplo: plan previo con el nombre de la herramienta, sin aplicar
    page.get_by_role("button", name="Importar escáner").first.click()
    imp = page.get_by_test_id("importador-escaner")
    for fichero, herramienta in [("openvas-ejemplo.xml", "OpenVAS / Greenbone"), ("nuclei-ejemplo.jsonl", "Nuclei"), ("trivy-ejemplo.json", "Trivy"), ("sarif-ejemplo.sarif", "Semgrep")]:
        imp.locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / fichero))
        expect(page.get_by_test_id("plan-importacion")).to_contain_text(herramienta)
        check(f"{fichero}: plan previo de {herramienta} sin tocar el proyecto", J(f"{S}.project.imports.length") == 1)
    imp.locator('input[type="file"]').set_input_files(str(ROOT / "shared" / "samples" / "epss-ejemplo.csv"))
    expect(page.get_by_test_id("plan-inteligencia")).to_contain_text("FIRST EPSS")
    page.get_by_role("button", name="Aplicar inteligencia").click()
    check("el CSV de EPSS se aplica y queda versionado", J(f"{S}.project.intel.epss.count") == 11)

    # Riesgo aceptado: reglas de gobierno, ficha, retirada y caducidad al cargar
    J(f"{S}.selectFinding('H-014')")
    page.get_by_role("dialog").get_by_role("button", name="Aceptar riesgo").click()
    form = page.get_by_test_id("form-aceptacion")
    form.get_by_label("Responsable del riesgo").fill("")
    form.get_by_role("button", name="Aceptar riesgo").click()
    check("sin responsable ni motivo no se acepta y se explica por qué", J(f"{S}.project.findings.find(f => f.id === 'H-014').status") == "abierto" and form.get_by_text("Indica quién asume el riesgo").count() == 1 and form.get_by_text("control compensatorio.").count() == 1)
    form.get_by_label("Responsable del riesgo").fill("Responsable de sistemas")
    form.get_by_label("Motivo").fill("El proveedor certifica la versión corregida del bróker en diciembre")
    form.get_by_label(re.compile("^Control compensatorio")).fill("Puerto OpenWire filtrado y alerta de deserialización en el SIEM")
    form.get_by_role("button", name="Aceptar riesgo").click()
    h8 = J(f"{S}.project.findings.find(f => f.id === 'H-014')")
    check("la aceptación guarda responsable, caducidad a 90 días y estado previo", h8["status"] == "aceptado" and h8["exception"]["expires"] == "2027-01-06" and h8["exception"]["previous"] == "abierto")
    J(f"{S}.selectFinding('H-014')")
    check("la ficha del hallazgo muestra la aceptación", page.get_by_test_id("ficha-riesgo").filter(has_text="Responsable de sistemas").count() == 1)
    page.get_by_role("dialog").get_by_role("button", name="Retirar").click()
    check("retirar la aceptación lo devuelve a abierto y conserva la ficha", J(f"{S}.project.findings.find(f => f.id === 'H-014').status") == "abierto" and page.get_by_test_id("ficha-riesgo").filter(has_text="Aceptación retirada").count() == 1)
    page.keyboard.press("Escape")
    J(f"""(() => {{ const st = {S}; const p = structuredClone(st.project); const f = p.findings.find(x => x.id === 'H-019'); f.exception.expires = '2026-10-01'; st.replaceProject(p); }})()""")
    check("una aceptación caducada vuelve sola a su estado anterior al cargar el proyecto", J(f"{S}.project.findings.find(f => f.id === 'H-019').status") == "abierto" and page.get_by_text(re.compile("Ha caducado 1 aceptación de riesgo")).count() == 1)

    # Perfil de ponderación
    nav(page, "Ajustes y datos")
    indice = J(f"{S}.project.findings.length")
    perfil = page.get_by_test_id("perfil-ponderacion")
    perfil.get_by_role("button", name="Banca y finanzas").click()
    check("el perfil de banca se guarda en el proyecto y cambia los pesos", J(f"{S}.project.profile") == "banca" and perfil.get_by_text("Amenaza dirigida").count() == 1)
    check("Ajustes enseña los catálogos en uso y el registro de importaciones", page.get_by_test_id("inteligencia").get_by_text(re.compile("versión 2026.10.07")).count() == 1 and page.get_by_test_id("registro-importaciones").locator("li").count() >= 1)
    perfil.get_by_role("button", name="General").click()

    # ¿Y si…?: borrador sin tocar el proyecto, plan voraz y grupo que solo corta junto
    J(f"{S}.loadDemo()")
    nav(page, "¿Y si…?")
    proyecto = J(f"JSON.stringify({S}.project)")
    page.get_by_label("Dar por corregido H-001").check()
    check("marcar un hallazgo lo simula al instante", J(f"{S}.simFixed") == ["H-001"] and "antes" in page.get_by_test_id("sim-indice").inner_text())
    page.get_by_role("button", name="Simular el plan").click()
    check("el plan simulado deja cero rutas hacia las joyas de la corona", re.search(r"\n0\n", page.get_by_test_id("sim-rutas").inner_text()) is not None, page.get_by_test_id("sim-rutas").inner_text())
    check("el plan propone juntos los dos fallos de Citrix", page.get_by_test_id("pasos-plan").get_by_text("solo juntos cortan su arista").count() == 1)
    check("la simulación no modifica el proyecto", J(f"JSON.stringify({S}.project)") == proyecto)
    nav(page, "Inicio"); nav(page, "¿Y si…?")
    check("el borrador se conserva al navegar", len(J(f"{S}.simFixed")) > 1)
    page.get_by_role("button", name="Vaciar").click()
    check("«Vaciar» quita el borrador", J(f"{S}.simFixed") == [])

    # Movilización: SLA, ciclos, informe con cinco acciones y exportaciones Jira/GitHub
    nav(page, "Movilización")
    check("el cumplimiento de SLA se muestra en porcentaje", re.fullmatch(r"\d+ %", page.get_by_test_id("sla-global").inner_text()) is not None, page.get_by_test_id("sla-global").inner_text())
    check("el informe trae cinco acciones y los riesgos aceptados", page.get_by_test_id("cinco-acciones").locator("ol > li").count() == 5 and "H-019" in page.get_by_test_id("informe-aceptados").inner_text())
    ciclos = page.get_by_test_id("panel-ciclos")
    ciclos.get_by_label("Nombre del ciclo").fill("Ciclo de octubre")
    ciclos.get_by_role("button", name="Cerrar ciclo").click()
    check("cerrar un ciclo guarda la instantánea con su nombre", J(f"{S}.project.snapshots.length") == 1 and J(f"{S}.project.snapshots[0].label") == "Ciclo de octubre" and ciclos.get_by_role("button", name="Actualizar el cierre de hoy").count() == 1)
    with page.expect_download() as d:
        page.get_by_role("button", name="Jira CSV").click()
    jira = pathlib.Path(d.value.path()).read_text(encoding="utf-8-sig")
    tickets = J(f"{S}.project.findings.filter(f => f.status === 'abierto' || f.status === 'validado').length")
    filas = list(csv.reader(io.StringIO(jira)))
    check("el CSV de Jira trae cabecera del asistente y una fila por ticket", filas[0][:4] == ["Summary", "Issue Type", "Priority", "Due Date"] and len(filas) - 1 == tickets and all(f[2] in ("Highest", "High", "Medium", "Low") for f in filas[1:]), (len(filas) - 1, tickets))
    with page.expect_download() as d:
        page.get_by_role("button", name="GitHub Issues").click()
    issues = json.loads(pathlib.Path(d.value.path()).read_text(encoding="utf-8"))
    check("el JSON de GitHub trae un issue por ticket con título, cuerpo y etiquetas", len(issues) == tickets and all(set(i) == {"title", "body", "labels"} for i in issues))
    with page.expect_download() as d:
        page.get_by_role("button", name="Informe .md").click()
    informe = pathlib.Path(d.value.path()).read_text(encoding="utf-8")
    check("el informe Markdown incluye perfil, cinco acciones y riesgos aceptados", all(x in informe for x in ("Perfil de ponderación", "## Cinco acciones", "## Riesgos aceptados")))

    # Pasos de remediación con casillas: se guardan en el proyecto
    J(f"{S}.setView('priorizacion')"); J(f"{S}.selectFinding('H-001')")
    detalle = page.get_by_role("dialog")
    detalle.locator("input[type=checkbox]").first.check()
    check("marcar un paso actualiza el progreso del hallazgo", detalle.get_by_test_id("pasos-hechos").inner_text().startswith("1/") and J(f"{S}.project.progress['H-001']") == [0])
    check("el detalle enlaza NVD, CISA KEV y FIRST EPSS sin consultarlos", all(detalle.get_by_role("link", name=re.compile(n)).count() == 1 for n in ("NVD", "CISA KEV", "FIRST EPSS")))
    page.keyboard.press("Escape")

    # Informe imprimible: portada y nada de la interfaz
    nav(page, "Movilización")
    page.emulate_media(media="print")
    check("al imprimir aparece la portada del informe", page.locator(".print-cover").is_visible())
    check("al imprimir no salen barra lateral, cabecera ni tickets", not page.locator("aside").first.is_visible() and not page.locator("header.no-print, .no-print header").first.is_visible())
    pdf = tmp / "informe.pdf"
    page.pdf(path=str(pdf), format="A4", print_background=True)
    paginas = pdf.read_bytes().count(b"/Type /Page") - pdf.read_bytes().count(b"/Type /Pages")
    check("el informe en PDF ocupa entre 2 y 5 páginas A4", 2 <= paginas <= 5, paginas)
    page.emulate_media(media="screen")

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
    check("exportar y reimportar conserva el progreso de remediación", J(f"{S}.project.progress?.['H-001']") == [0], J(f"{S}.project.progress"))

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
    for v in ["panel", "alcance", "priorizacion", "rutas", "mitre", "simulacion", "movilizacion", "ajustes"]:
        J(f"{S}.setView('{v}')")
        restos[v] = restos_en_espanol(page)
    J(f"{S}.setView('mitre')"); page.locator("[data-testid^=tecnica-]:visible").first.click()
    restos["ficha-tecnica"] = restos_en_espanol(page)
    page.keyboard.press("Escape")
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
    check("en inglés no queda texto de interfaz en español (17 pantallas)", not sucios, sucios)
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
    check("en móvil, Priorización muestra tarjetas y no la tabla", page.get_by_test_id("tarjetas-hallazgos").is_visible() and not page.locator("table").first.is_visible())
    page.evaluate("document.getElementById('contenido').scrollTop = 600")
    page.wait_for_timeout(200)
    aviso = page.get_by_text("Caso de ejemplo con datos ficticios.")
    check("el aviso de datos de ejemplo no se queda fijo al desplazar", aviso.bounding_box() is None or aviso.bounding_box()["y"] < 0, aviso.bounding_box())
    cuenta = page.get_by_role("button", name=re.compile("^Cuenta"))
    check("en móvil la cuenta está en la barra superior", cuenta.count() == 1)
    ancho = page.evaluate("document.documentElement.scrollWidth")
    check("sin desplazamiento horizontal de la página", ancho <= 390, ancho)
    # Nada recortado: ningún texto visible se sale de la pantalla (salvo dentro de zonas con desplazamiento horizontal).
    recorte = """() => {
      const W = window.innerWidth;
      const scrollable = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true; } return false; };
      const out = [];
      for (const el of document.querySelectorAll('main td, main th, main li, main p, main h2, main h3, main dd')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
        if (r.right > W + 1 && !scrollable(el)) out.push(el.tagName + ': ' + (el.textContent || '').trim().slice(0, 40));
      }
      return out.slice(0, 5);
    }"""
    for v in ["panel", "alcance", "priorizacion", "rutas", "mitre", "simulacion", "movilizacion", "ajustes"]:
        page.evaluate(f"{S}.setView('{v}')")
        page.wait_for_timeout(250)
        fuera = page.evaluate(recorte)
        check(f"en móvil, «{v}» no recorta contenido por la derecha", not fuera, fuera)
    page.evaluate(f"{S}.setView('movilizacion')")
    check("en móvil, los riesgos principales se ven como tarjetas", page.get_by_test_id("tarjetas-riesgos").is_visible())
    page.evaluate(f"{S}.setView('mitre')")
    check("en móvil, el mapa ATT&CK es una lista por táctica y no la matriz", page.get_by_test_id("lista-attack").is_visible() and not page.get_by_test_id("matriz-attack").is_visible())
    barra.get_by_role("button", name="Más").click()
    page.get_by_role("button", name="Mapa ATT&CK").click()
    check("«Más» lleva al mapa ATT&CK", page.evaluate(f"{S}.view") == "mitre")
    barra.get_by_role("button", name="Más").click()
    page.get_by_role("button", name="¿Y si…?").click()
    check("«Más» lleva a la simulación", page.evaluate(f"{S}.view") == "simulacion")
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
