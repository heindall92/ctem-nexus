import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.resolve(__dirname, '../node_modules/lucide-react/dist/esm/icons');
const outIconsDir = path.resolve(__dirname, '../../docs/assets/icons');
const outStackDir = path.resolve(__dirname, '../../docs/assets/stack');

fs.mkdirSync(outIconsDir, { recursive: true });
fs.mkdirSync(outStackDir, { recursive: true });

const requestedIcons = [
  'route',
  'grid-3x3',
  'flask-conical',
  'file-search',
  'brain-circuit',
  'list-checks',
  'camera',
  'radar',
  'terminal',
  'cpu',
  'calculator',
  'shield-check',
  'shield-alert',
  'folder-tree',
  'orbit',
  'crosshair',
  'flame',
  'waypoints',
  'file-text',
  'settings',
  'crown',
  'network',
  'sparkles',
  'layers',
  'user',
  'check-check',
  'server',
  'database',
  'globe',
];

for (const name of requestedIcons) {
  const iconFile = path.join(iconsDir, `${name}.mjs`);
  if (!fs.existsSync(iconFile)) {
    console.warn(`Icon not found: ${name}`);
    continue;
  }
  const mod = await import(`file://${iconFile.replace(/\\/g, '/')}`);
  const iconData = mod.__iconData;
  if (!iconData || !iconData.node) continue;

  const elements = iconData.node.map(([tag, attrs]) => {
    const attrStr = Object.entries(attrs)
      .filter(([k]) => k !== 'key')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `  <${tag} ${attrStr} />`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n${elements}\n</svg>\n`;
  fs.writeFileSync(path.join(outIconsDir, `${name}.svg`), svg, 'utf-8');
}

console.log(`Generated ${requestedIcons.length} Lucide SVG icons in docs/assets/icons/`);

// Generar SVGs estilizados para la tabla YAML del Stack tecnológico
const stackBadges = {
  gartner: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#E07B39" fill-opacity="0.15"/><circle cx="24" cy="24" r="14" fill="none" stroke="#E07B39" stroke-width="2.5"/><path d="M24 16v8l6 4" stroke="#E07B39" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  nmap: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#3DDCC4" fill-opacity="0.15"/><path d="M14 24a10 10 0 0 1 20 0M18 24a6 6 0 0 1 12 0M22 24a2 2 0 0 1 4 0" stroke="#3DDCC4" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="24" x2="24" y2="34" stroke="#3DDCC4" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  cisa: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#D9534F" fill-opacity="0.15"/><path d="M24 12l11 4v8c0 8-5 13-11 16-6-3-11-8-11-16v-8z" fill="none" stroke="#D9534F" stroke-width="2.5"/><path d="M20 24l3 3 6-6" stroke="#D9534F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  react: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#3178C6" fill-opacity="0.15"/><circle cx="24" cy="24" r="3" fill="#61DAFB"/><ellipse cx="24" cy="24" rx="14" ry="5.5" fill="none" stroke="#61DAFB" stroke-width="2" transform="rotate(30 24 24)"/><ellipse cx="24" cy="24" rx="14" ry="5.5" fill="none" stroke="#61DAFB" stroke-width="2" transform="rotate(90 24 24)"/><ellipse cx="24" cy="24" rx="14" ry="5.5" fill="none" stroke="#61DAFB" stroke-width="2" transform="rotate(150 24 24)"/></svg>`,
  typescript: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#3178C6"/><text x="24" y="32" font-family="system-ui,sans-serif" font-weight="bold" font-size="22" fill="#fff" text-anchor="middle">TS</text></svg>`,
  tailwind: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#06B6D4" fill-opacity="0.15"/><path d="M14 26c1.5-3 4-4.5 7.5-4.5 5 0 6 5 9 5s4.5-2 6-4.5c-1.5 3-4 4.5-7.5 4.5-5 0-6-5-9-5s-4.5 2-6 4.5zm-3 8c1.5-3 4-4.5 7.5-4.5 5 0 6 5 9 5s4.5-2 6-4.5c-1.5 3-4 4.5-7.5 4.5-5 0-6-5-9-5s-4.5 2-6 4.5z" fill="#06B6D4"/></svg>`,
  fastapi: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#009688" fill-opacity="0.15"/><path d="M26 13L16 27h7l-2 10 11-14h-8l2-10z" fill="#009688"/></svg>`,
  python: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#3776AB" fill-opacity="0.15"/><path d="M23.5 12c-6 0-5.5 2.5-5.5 2.5l.01 2.6h5.6v.8H15.8S12 17.5 12 23.5s3.3 5.7 3.3 5.7h2v-2.8s-.1-3.3 3.3-3.3h5.7s3.2.1 3.2-3.1v-5.4s.5-2.6-6-2.6zm-1.8 1.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm2.8 22.4c6 0 5.5-2.5 5.5-2.5l-.01-2.6h-5.6v-.8h7.8s3.8.4 3.8-5.6-3.3-5.7-3.3-5.7h-2v2.8s.1 3.3-3.3 3.3h-5.7s-3.2-.1-3.2 3.1v5.4s-.5 2.6 6 2.6zm1.8-1.6a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" fill="#3776AB"/></svg>`,
  lucide: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#F56565" fill-opacity="0.15"/><path d="M24 14l10 6v10l-10 6-10-6V20z" fill="none" stroke="#F56565" stroke-width="2.5"/><circle cx="24" cy="25" r="3" fill="#F56565"/></svg>`,
  nodejs: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#539E43" fill-opacity="0.15"/><path d="M24 13l11 6.5v13L24 39l-11-6.5v-13z" fill="none" stroke="#539E43" stroke-width="2.5"/><path d="M24 23v9m0-9l7-4m-7 4l-7-4" stroke="#539E43" stroke-width="2"/></svg>`,
  vitest: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#FCC72B" fill-opacity="0.15"/><path d="M15 15l9 18 9-18" fill="none" stroke="#729B1B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="19" r="4" fill="#FCC72B"/></svg>`,
  pytest: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#0A9EDC" fill-opacity="0.15"/><text x="24" y="31" font-family="system-ui,sans-serif" font-weight="bold" font-size="16" fill="#0A9EDC" text-anchor="middle">pytest</text></svg>`,
  csp: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#2E8B57" fill-opacity="0.15"/><path d="M24 13l10 4v8c0 7-4 11-10 14-6-3-10-7-10-14v-8z" fill="none" stroke="#2E8B57" stroke-width="2.5"/><circle cx="24" cy="26" r="3" fill="#2E8B57"/></svg>`,
};

for (const [key, svg] of Object.entries(stackBadges)) {
  fs.writeFileSync(path.join(outStackDir, `${key}.svg`), svg, 'utf-8');
}
console.log(`Generated stack badges in docs/assets/stack/`);
