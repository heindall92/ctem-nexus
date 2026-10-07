// Capturas del HTML autocontenido con los datos de demo.
// Escritorio 1440×900 y móvil 390×844, en claro y en oscuro: docs/screenshots/*.png
// Uso: npm run build && npm run capturas   (CHROME_PATH=/ruta/a/chrome si no se encuentra)
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
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache/ms-playwright');
  const local = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const root of [cache, local]) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
        const p = join(root, d, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  const pf = process.env.PROGRAMFILES || '';
  const pf86 = process.env['PROGRAMFILES(X86)'] || '';
  const localApp = process.env.LOCALAPPDATA || '';
  for (const p of [
    join(pf, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Google/Chrome/Application/chrome.exe'),
    join(localApp, 'Google/Chrome/Application/chrome.exe'),
    join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]) if (p && existsSync(p)) return p;
  return undefined;
}

const shots = [
  ['01-panel.png', null],
  ['02-priorizacion.png', 'Priorización'],
  ['03-detalle-hallazgo.png', 'detalle'],
  ['04-rutas-de-ataque.png', 'Rutas de ataque'],
  ['05-movilizacion.png', 'Movilización'],
  ['06-alcance.png', 'Alcance y activos'],
];

const browser = await chromium.launch({ executablePath: findChrome() });
const problems = [];

async function runSet({ width, height, theme, prefix, mobile }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) problems.push(`Petición externa: ${r.url()}`); });

  await page.goto(pathToFileURL(html).href);
  await page.getByRole('button', { name: 'Cargar datos de demo' }).first().click();
  await page.getByRole('button', { name: 'Ocultar aviso' }).waitFor();
  if (theme === 'light') await page.getByRole('switch', { name: 'Tema claro' }).first().click();

  const desktopNav = (name) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name });
  const go = async (name) => {
    if (!mobile) { await desktopNav(name).click(); return; }
    const tab = page.getByRole('navigation', { name: 'Más' }).getByRole('button', { name, exact: true });
    if (await tab.count()) { await tab.click(); return; }
    await page.getByRole('navigation', { name: 'Más' }).getByRole('button', { name: 'Más', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
  };

  for (const [file, target] of shots) {
    if (target === 'detalle') {
      await go('Priorización');
      await page.locator('tbody tr').first().click();
      await page.getByRole('dialog').waitFor();
    } else if (target) {
      await go(target);
    }
    for (const b of await page.getByRole('button', { name: 'Ocultar aviso' }).all()) await b.click().catch(() => {});
    for (const b of await page.getByRole('button', { name: 'Cerrar aviso' }).all()) await b.click().catch(() => {});
    await page.locator('#contenido').evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(350);
    const name = prefix ? `${prefix}-${file}` : file;
    await page.screenshot({ path: join(outDir, name) });
    console.log('✓', name);
    if (target === 'detalle') await page.keyboard.press('Escape');
  }
  await page.close();
}

await runSet({ width: 1440, height: 900, theme: 'dark', prefix: '', mobile: false });
await runSet({ width: 1440, height: 900, theme: 'light', prefix: 'claro', mobile: false });
await runSet({ width: 390, height: 844, theme: 'dark', prefix: 'movil', mobile: true });
await runSet({ width: 390, height: 844, theme: 'light', prefix: 'movil-claro', mobile: true });

await browser.close();
if (problems.length) { console.error('Problemas detectados:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log(`Capturas en ${outDir}`);
