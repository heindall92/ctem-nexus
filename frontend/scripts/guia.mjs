// Capturas de la guía práctica «De un Nmap a un plan de remediación con SLA» (docs/GUIA.md).
// Recorre la interfaz como lo haría una persona, con los ficheros de ejemplo de shared/samples: docs/guia/*.png
// Uso: npm run build && npm run guia   (CHROME_PATH=/ruta/a/chrome si no se encuentra)
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const html = resolve(here, '../dist/ctem-nexus.html');
const samples = resolve(here, '../../shared/samples');
const outDir = resolve(here, '../../docs/guia');
mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH || '', join(homedir(), '.cache/ms-playwright')].filter(Boolean)) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
        const p = join(root, d, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) return p;
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' });
const problems = [];
page.on('pageerror', (e) => problems.push(String(e)));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) problems.push(`Petición externa: ${r.url()}`); });

const nav = (name) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name }).click();
const quiet = async () => {
  for (const b of await page.getByRole('button', { name: /^(Ocultar aviso|Cerrar aviso)$/ }).all()) await b.click().catch(() => {});
  await page.waitForTimeout(300);
};
const shot = async (file, locator) => {
  await quiet();
  if (locator) await locator.screenshot({ path: join(outDir, file) });
  else await page.screenshot({ path: join(outDir, file) });
  console.log('✓', file);
};

await page.goto(pathToFileURL(html).href);
await page.getByRole('button', { name: 'Cargar datos de demo' }).first().waitFor();
await shot('01-inicio.png');

// 1. Alcance con Nmap (sobre la demo, para tener contexto completo)
await page.getByRole('button', { name: 'Cargar datos de demo' }).first().click();
await nav('Alcance y activos');
await page.getByRole('button', { name: 'Importar Nmap XML' }).first().click();
const nmap = page.getByRole('dialog', { name: /Nmap/ });
await nmap.locator('input[type="file"]').setInputFiles(join(samples, 'nmap-ejemplo.xml'));
await nmap.getByRole('button', { name: 'Analizar escaneo' }).click();
await nmap.getByText('Escaneo analizado con éxito').waitFor();
await shot('02-nmap.png');
await nmap.getByRole('button', { name: 'Incorporar activos al programa CTEM' }).click();
if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');

// 2. Descubrimiento: escáner con plan previo
await nav('Priorización');
await page.getByRole('button', { name: 'Importar escáner' }).first().click();
const imp = page.getByTestId('importador-escaner');
await imp.locator('input[type="file"]').setInputFiles(join(samples, 'nessus-ejemplo.nessus'));
await page.getByTestId('plan-importacion').waitFor();
await shot('03-plan-escaner.png');
await page.getByRole('button', { name: 'Incorporar al proyecto' }).click();
for (const f of ['kev-ejemplo.json', 'epss-ejemplo.csv']) {
  await page.getByRole('button', { name: 'Importar escáner' }).first().click();
  await page.getByTestId('importador-escaner').locator('input[type="file"]').setInputFiles(join(samples, f));
  await page.getByTestId('plan-inteligencia').waitFor();
  await page.getByRole('button', { name: 'Aplicar inteligencia' }).click();
}

// 3. Contexto de negocio desde el ecosistema: BIA de KAIROS y categoría ENS de Compliance Studio
await nav('Ecosistema');
const eco = page.getByTestId('eco-importar').locator('input[type="file"]');
await eco.setInputFiles(join(samples, 'ecosistema/kairos-meridiano.json'));
await page.getByTestId('eco-kairos').locator('tbody tr').first().waitFor();
await page.getByTestId('eco-kairos').scrollIntoViewIfNeeded();
await shot('04-kairos.png');
await page.getByRole('button', { name: 'Aplicar criticidades' }).click();
await eco.setInputFiles(join(samples, 'ecosistema/studio-meridiano.json'));
await page.getByRole('button', { name: 'Usar la categoría ENS' }).click();

// 4. Priorización explicada
await nav('Priorización');
await page.locator('#contenido').evaluate((el) => el.scrollTo(0, 0));
await shot('05-priorizacion.png');
await page.locator('tbody tr:visible').first().click();
await page.getByRole('dialog').waitFor();
await shot('06-detalle.png');
await page.keyboard.press('Escape');

// 5. Rutas de ataque y puntos de estrangulamiento
await nav('Rutas de ataque');
await shot('07-rutas.png');

// 6. ¿Y si…?: el plan que más rutas rompe
await nav('¿Y si…?');
await page.getByRole('button', { name: 'Simular el plan' }).click();
await shot('08-simulacion.png');
await page.getByRole('button', { name: 'Vaciar' }).click().catch(() => {});

// 7. Movilización: SLA, tickets e informe
await nav('Movilización');
await page.locator('#contenido').evaluate((el) => el.scrollTo(0, 0));
await shot('09-movilizacion.png');

// 8. Cerrar el círculo con Rosetta
await nav('Ecosistema');
await eco.setInputFiles(join(samples, 'ecosistema/rosetta-a-ctem.json'));
await page.getByRole('button', { name: 'Vincular con Rosetta' }).click();
await page.getByTestId('eco-contradicciones').scrollIntoViewIfNeeded();
await shot('10-rosetta.png');

await browser.close();
if (problems.length) { console.error('Problemas detectados:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log(`Capturas de la guía en ${outDir}`);
