// Tras `vite build --mode singlefile`: añade una CSP estricta con hashes del script y del estilo incrustados
// y copia el HTML autocontenido a dist/ctem-nexus.html y a la raíz del repositorio (ctem-nexus.html).
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const front = resolve(here, '..');
const src = resolve(front, 'dist-single/index.html');
let html = readFileSync(src, 'utf8');

const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.trim());
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (/<script\b[^>]*\bsrc=/.test(html) || /<link\b[^>]*rel="stylesheet"/.test(html)) throw new Error('El HTML no es autocontenido');
if (/https?:\/\/(?!127\.0\.0\.1|localhost|www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
  console.warn('Aviso: hay URL externas en el marcado (no se cargan, pero revísalas).');
}

const csp = [
  "default-src 'none'",
  `script-src ${scripts.map(sha).join(' ')}`,
  `style-src ${styles.map(sha).join(' ')}`,
  "font-src data:",
  "img-src data: blob:",
  // La API opcional solo puede estar en la máquina local.
  "connect-src http://127.0.0.1:* http://localhost:*",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');
html = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);

const out = resolve(front, 'dist/ctem-nexus.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
copyFileSync(out, resolve(front, '../ctem-nexus.html'));
rmSync(resolve(front, 'dist-single'), { recursive: true, force: true });
console.log(`ctem-nexus.html · ${(statSync(out).size / 1024).toFixed(0)} KB · ${scripts.length} script(s), ${styles.length} estilo(s) con hash en la CSP`);
