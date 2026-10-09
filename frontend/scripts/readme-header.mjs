// Genera la cabecera y el pie del README (docs/assets/readme/) con iconos Lucide y un grafo de ataque estilizado:
// Internet → entradas → estrangulamiento → activos críticos. Sin servicios de terceros.
// Uso: node scripts/readme-header.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const icons = path.resolve(here, '../node_modules/lucide-react/dist/esm/icons');
const out = path.resolve(here, '../../docs/assets/readme');
fs.mkdirSync(out, { recursive: true });

const icon = async (name, x, y, size, color, sw = 2) => {
  const { __iconData } = await import(`file://${path.join(icons, `${name}.mjs`).replace(/\\/g, '/')}`);
  const body = __iconData.node.map(([tag, a]) => `<${tag} ${Object.entries(a).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  const s = size / 24;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${s})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
};

const ACC = '#4D86FF';
const CRIT = '#FF5A5F';
const CHOKE = '#FFB020';
// Nodos del grafo (x, y, icono, color, radio)
const N = {
  inet: [760, 160, 'globe', '#A3AAB2', 30],
  web: [880, 80, 'app-window', ACC, 26],
  vpn: [880, 240, 'door-open', ACC, 26],
  app: [1000, 160, 'server', CHOKE, 30],
  dc: [1140, 90, 'crown', CRIT, 30],
  erp: [1140, 230, 'crown', CRIT, 30],
};
const E = [['inet', 'web'], ['inet', 'vpn'], ['web', 'app'], ['vpn', 'app'], ['app', 'dc'], ['app', 'erp'], ['vpn', 'erp']];
const ruta = ['inet', 'vpn', 'app', 'dc'];
const enRuta = (a, b) => ruta.some((n, i) => n === a && ruta[i + 1] === b);

let aristas = '';
for (const [a, b] of E) {
  const [x1, y1] = N[a]; const [x2, y2] = N[b];
  aristas += enRuta(a, b)
    ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CRIT}" stroke-width="3" stroke-linecap="round" class="r"/>`
    : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2A3340" stroke-width="2" stroke-linecap="round"/>`;
}
let nodos = '';
for (const [, [x, y, ic, col, r]] of Object.entries(N)) {
  nodos += `<circle cx="${x}" cy="${y}" r="${r}" fill="#0C1118" stroke="${col}" stroke-opacity=".55" stroke-width="2"/>`;
  nodos += await icon(ic, x, y, r, col);
}

const cabecera = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="320" viewBox="0 0 1280 320" role="img" aria-label="CTEM-Nexus · Gestión continua de la exposición a amenazas">
  <title>CTEM-Nexus · Gestión continua de la exposición a amenazas</title>
  <style>
    .t { animation: sube 1.1s cubic-bezier(.32,.72,0,1) both; }
    .r { stroke-dasharray: 8 10; animation: fluye 1.6s linear infinite; }
    @keyframes sube { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes fluye { to { stroke-dashoffset: -36; } }
    @media (prefers-reduced-motion: reduce) { .t, .r { animation: none; } }
  </style>
  <defs>
    <radialGradient id="halo" cx="0.75" cy="0.5" r="0.55"><stop offset="0" stop-color="${ACC}" stop-opacity=".20"/><stop offset="1" stop-color="#05070D" stop-opacity="0"/></radialGradient>
    <pattern id="rej" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#FFFFFF" stroke-opacity=".035"/></pattern>
    <clipPath id="c"><rect width="1280" height="320" rx="32"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="1280" height="320" fill="#05070D"/>
    <rect width="1280" height="320" fill="url(#rej)"/>
    <rect width="1280" height="320" fill="url(#halo)"/>
    ${aristas}
    ${nodos}
  </g>
  <g class="t" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif">
    <rect x="80" y="72" width="44" height="44" rx="11" fill="${ACC}"/>
    ${await icon('waypoints', 102, 94, 26, '#041226', 2.25)}
    <text x="140" y="104" fill="#7AA6FF" font-size="19" font-weight="700" letter-spacing="5">GARTNER CTEM · CÓDIGO ABIERTO</text>
    <text x="76" y="190" fill="#FFFFFF" font-size="80" font-weight="800" letter-spacing="2">CTEM-Nexus</text>
    <text x="80" y="236" fill="#C9D6E3" font-size="24" font-weight="500">Del escaneo al plan de remediación, en tu navegador</text>
    <text x="80" y="272" fill="#7D8C9C" font-size="18" font-weight="500">CVSS · EPSS · CISA KEV · Rutas de ataque · Puntos de estrangulamiento</text>
  </g>
</svg>
`;

const pie = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="90" viewBox="0 0 1280 90" role="img" aria-label="CTEM-Nexus"><title>CTEM-Nexus</title>
  <defs><clipPath id="c"><rect width="1280" height="90" rx="24"/></clipPath></defs>
  <g clip-path="url(#c)"><rect width="1280" height="90" fill="#05070D"/>
    ${Array.from({ length: 23 }, (_, i) => {
      const x = 40 + i * 54.5; const y = 45 + Math.sin(i * 0.9) * 14;
      const nx = 40 + (i + 1) * 54.5; const ny = 45 + Math.sin((i + 1) * 0.9) * 14;
      const o = (0.3 + 0.7 * Math.sin((i / 22) * Math.PI)).toFixed(2);
      return `<g opacity="${o}"><line x1="${x}" y1="${y.toFixed(1)}" x2="${nx}" y2="${ny.toFixed(1)}" stroke="#2A3340" stroke-width="2"/><circle cx="${x}" cy="${y.toFixed(1)}" r="5" fill="${i % 7 === 3 ? CRIT : i % 5 === 2 ? CHOKE : ACC}"/></g>`;
    }).join('')}
  </g>
</svg>
`;

fs.writeFileSync(path.join(out, 'cabecera.svg'), cabecera);
fs.writeFileSync(path.join(out, 'pie.svg'), pie);
console.log('OK docs/assets/readme/cabecera.svg y pie.svg');
