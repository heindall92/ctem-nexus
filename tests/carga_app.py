"""Prueba de carga de CTEM-Nexus: un proyecto sintético de 50.000 hallazgos y 2.000 activos, sobre el HTML real.

Uso:  python3 tests/carga_app.py   (tras `npm run build`)
Mide, con la red bloqueada, lo que ve quien lo usa: importar, calcular, entrar en cada vista, recargar y exportar.
Falla si se pierde un solo hallazgo o si se superan los máximos de la Fase 8 (holgados para la CI, que es más
lenta que un portátil). Deja las cifras en tests/artifacts/carga.json.
"""
import json
import os
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from e2e_app import APP, OUT, S, check, esperar, resultados  # noqa: E402

HALLAZGOS = 50_000
ACTIVOS = 2_000
VISTAS = ["Inicio", "Alcance y activos", "Priorización", "Rutas de ataque", "Mapa ATT&CK", "¿Y si…?", "Movilización", "Ecosistema", "Ajustes y datos"]
# Máximos en la CI. La aceptación de la Fase 8 es 300 ms por vista y 100 ms por tarea en un equipo normal; la CI
# compartida va de 2 a 3 veces más lenta, así que aquí se exige el doble.
MAX_VISTA_MS = 600
MAX_TAREA_MS = 200

LARGAS = """window.__largas = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}"""

# Entra en una vista y espera a que se pinte (su título h1 cambia y pasa un fotograma más); devuelve los ms.
ENTRAR = """async (nombre) => {
  const nav = document.querySelector('nav[aria-label="Secciones"]');
  const b = [...nav.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(nombre));
  const titulo = () => document.querySelector('#contenido h1')?.textContent ?? '';
  const antes = titulo();
  window.__largas = [];
  const t = performance.now();
  b.click();
  for (let i = 0; i < 600 && titulo() === antes; i++) await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  return Math.round(performance.now() - t);
}"""


def proyecto():
    """Red sintética: 2.000 activos (1 de cada 20 expuesto, 1 de cada 40 crítico) y 50.000 hallazgos; 1 de cada 25
    abre paso a otro activo, de modo que hay rutas de ataque de verdad que calcular y cortar."""
    activos = [{"id": f"A-{i}", "name": f"nodo-{i:04d}.carga.example", "type": "servidor" if i % 3 else "estacion", "ip": f"10.{i // 65536}.{i // 256 % 256}.{i % 256}",
                "owner": f"Equipo {i % 12}", "criticality": 5 if i % 40 == 0 else 1 + i % 4, "internetExposed": i % 20 == 1, "tags": []} for i in range(ACTIVOS)]
    hallazgos = []
    for i in range(HALLAZGOS):
        a = i % ACTIVOS
        h = {"id": f"H-{i}", "title": f"Vulnerabilidad {i % 4000}", "kind": "cve", "cve": f"CVE-2024-{10000 + i % 4000}", "cvss": round(3 + (i % 70) / 10, 1),
             "epss": round((i % 97) / 100, 2), "kev": i % 41 == 0, "exploitPublic": i % 13 == 0, "assetId": f"A-{a}",
             "status": ["abierto", "abierto", "abierto", "validado", "mitigado"][i % 5], "remediation": "patch_cve", "detectedAt": "2026-09-01"}
        if i % 25 == 0:
            h["leadsTo"] = [f"A-{(a + 1 + i % 7) % ACTIVOS}"]
        hallazgos.append(h)
    return {"format": "ctem-nexus", "version": 1, "name": "Carga 50.000", "demo": False, "assets": activos, "ranges": [], "findings": hallazgos, "edges": []}


def main():
    tmp = OUT / "tmp"
    tmp.mkdir(exist_ok=True)
    fichero = tmp / "carga-50000.json"
    fichero.write_text(json.dumps(proyecto()), encoding="utf-8")
    cifras = {"hallazgos": HALLAZGOS, "activos": ACTIVOS, "mb": round(fichero.stat().st_size / 1048576, 1)}
    print(f"Carga · {HALLAZGOS:,} hallazgos y {ACTIVOS:,} activos ({cifras['mb']} MB)".replace(",", "."))
    with sync_playwright() as p:
        b = p.chromium.launch()
        # Sin reloj fijo (a diferencia del e2e): aquí se mide el tiempo de verdad.
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce", accept_downloads=True)
        ctx.add_init_script(LARGAS)
        page = ctx.new_page()
        problemas = []
        page.on("console", lambda m: problemas.append(f"consola: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: problemas.append(f"excepción: {e}"))
        page.on("request", lambda r: None if re.match(r"^(file|data|blob):", r.url) else problemas.append(f"petición externa: {r.url}"))
        page.goto(APP)
        esperar(page, f"!!window.__CTEM__ && {S}.guardado.estado === 'guardado'", 10000)

        # Importar: se lee y valida en el Worker.
        page.get_by_role("navigation", name="Secciones").get_by_role("button", name="Ajustes y datos").click()
        page.evaluate("window.__largas = []")
        t0 = page.evaluate("performance.now()")
        page.locator('input[type=file][accept*="json"]').first.set_input_files(str(fichero))
        esperar(page, f"{S}.project.findings.length === {HALLAZGOS}", 120000)
        cifras["importar_ms"] = round(page.evaluate("performance.now()") - t0)
        cifras["importar_tarea_max_ms"] = max(page.evaluate("window.__largas") or [0])
        check(f"se importan los {HALLAZGOS:,} hallazgos y {ACTIVOS:,} activos".replace(",", "."), page.evaluate(f"{S}.project.assets.length") == ACTIVOS)

        # Calcular: el motor va en el Worker; la página sigue respondiendo.
        esperar(page, "!document.querySelector('[data-testid=aviso-calculo]').textContent", 120000)
        cifras["calcular_ms"] = round(page.evaluate("performance.now()") - t0) - cifras["importar_ms"]
        esperar(page, f"{S}.guardado.estado === 'guardado'", 60000)
        cifras["calculo_y_guardado_tarea_max_ms"] = max(page.evaluate("window.__largas") or [0])

        # Cada vista.
        # Cada vista, tres veces (saliendo a otra entre medias): la mediana, para que el ruido de la CI no decida.
        cifras["vistas"] = {}
        for vista in VISTAS:
            medidas = []
            for _ in range(3):
                page.evaluate(ENTRAR, "Alcance y activos" if vista != "Alcance y activos" else "Rutas de ataque")
                page.wait_for_timeout(200)
                ms = page.evaluate(ENTRAR, vista)
                page.wait_for_timeout(200)
                medidas.append((ms, max(page.evaluate("window.__largas") or [0])))
            cifras["vistas"][vista] = {"ms": sorted(m[0] for m in medidas)[1], "tarea_max_ms": sorted(m[1] for m in medidas)[1]}
        lentas = {v: c for v, c in cifras["vistas"].items() if c["ms"] > MAX_VISTA_MS or c["tarea_max_ms"] > MAX_TAREA_MS}
        check(f"cada vista se pinta en menos de {MAX_VISTA_MS} ms y sin tareas de más de {MAX_TAREA_MS} ms", not lentas, json.dumps(lentas, ensure_ascii=False))

        # Recargar: sigue todo (IndexedDB).
        t0 = page.evaluate("performance.now()")
        page.reload()
        esperar(page, f"!!window.__CTEM__ && {S}.guardado.estado === 'guardado' && {S}.project.findings.length === {HALLAZGOS}", 60000)
        cifras["recargar_ms"] = round(page.evaluate("performance.now()"))
        check("al recargar siguen los 50.000 hallazgos", True)
        check(f"importar, calcular y guardar no bloquean la página más de {MAX_TAREA_MS} ms", max(cifras["importar_tarea_max_ms"], cifras["calculo_y_guardado_tarea_max_ms"]) <= MAX_TAREA_MS,
              f"importar {cifras['importar_tarea_max_ms']} ms, calcular y guardar {cifras['calculo_y_guardado_tarea_max_ms']} ms")

        # Exportar: el JSON descargado lleva todo.
        page.get_by_role("navigation", name="Secciones").get_by_role("button", name="Ajustes y datos").click()
        page.evaluate("window.__largas = []")
        with page.expect_download(timeout=60000) as d:
            page.get_by_role("button", name="Exportar proyecto JSON").click()
        cifras["exportar_tarea_max_ms"] = max(page.evaluate("window.__largas") or [0])
        exportado = json.loads(pathlib.Path(d.value.path()).read_text(encoding="utf-8"))
        check("el proyecto exportado lleva los 50.000 hallazgos y los 2.000 activos", len(exportado["findings"]) == HALLAZGOS and len(exportado["assets"]) == ACTIVOS)
        check(f"exportar no bloquea la página más de {MAX_TAREA_MS} ms", cifras["exportar_tarea_max_ms"] <= MAX_TAREA_MS, f"{cifras['exportar_tarea_max_ms']} ms")
        check("carga: sin errores de consola ni peticiones", not problemas, "; ".join(problemas[:3]))
        ctx.close()
        b.close()

    (OUT / "carga.json").write_text(json.dumps(cifras, ensure_ascii=False, indent=2), encoding="utf-8")
    # En GitHub Actions, una tabla en el resumen de la ejecución.
    resumen = os.environ.get("GITHUB_STEP_SUMMARY")
    if resumen:
        filas = [f"| {v} | {c['ms']} | {c['tarea_max_ms']} |" for v, c in cifras["vistas"].items()]
        with open(resumen, "a", encoding="utf-8") as f:
            f.write("\n".join([
                f"### Carga · {HALLAZGOS:,} hallazgos y {ACTIVOS:,} activos ({cifras['mb']} MB)".replace(",", "."), "",
                f"Importar: {cifras['importar_ms']} ms (tarea más larga {cifras['importar_tarea_max_ms']} ms) · calcular: {cifras['calcular_ms']} ms · "
                f"recargar: {cifras['recargar_ms']} ms · exportar: tarea más larga {cifras['exportar_tarea_max_ms']} ms", "",
                "| Vista | ms hasta pintarse (mediana de 3) | tarea más larga (ms) |", "|---|---:|---:|", *filas, "",
            ]))
    print(json.dumps(cifras, ensure_ascii=False, indent=2))
    fallos = [r for r in resultados if not r[1]]
    print(f"\ncarga: {len(resultados) - len(fallos)}/{len(resultados)} comprobaciones superadas")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
