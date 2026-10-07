// Capturas 1440×900 del HTML autocontenido con los datos de demo: docs/screenshots/*.png
// Uso: npm run build && npm run capturas   (CHROME_PATH=/ruta/a/chrome si no se encuentra Chromium)
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const html = resolve(here, '../dist/ctem-nexus.html');
const outDir = resolve(here, '../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache/ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) if (existsSync(join(cache, d, sub))) return join(cache, d, sub);
    }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) return p;
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(String(e)));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) problems.push(`Petición externa: ${r.url()}`); });

await page.goto(pathToFileURL(html).href);
await page.getByRole('button', { name: 'Cargar datos de demo' }).first().click();
await page.waitForTimeout(400);

const nav = (name) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name });
const shot = async (file) => {
  for (const b of await page.getByRole('button', { name: 'Cerrar aviso' }).all()) await b.click().catch(() => {});
  await page.waitForTimeout(450); await page.screenshot({ path: join(outDir, file) }); console.log('✓', file); };

await shot('01-panel.png');
await nav('Priorización').click();
await shot('02-priorizacion.png');
await page.locator('tbody tr').first().click();
await shot('03-detalle-hallazgo.png');
await page.keyboard.press('Escape');
await nav('Rutas de ataque').click();
await shot('04-rutas-de-ataque.png');
await nav('Movilización').click();
await shot('05-movilizacion.png');
await nav('Alcance y activos').click();
await shot('06-alcance.png');

await browser.close();
if (problems.length) { console.error('Problemas detectados:\n' + problems.join('\n')); process.exit(1); }
console.log(`Capturas en ${outDir}`);
