/* Agrupación de hallazgos para Priorización: el mismo CVE en 200 equipos es una fila que se despliega, no 200 filas.
 *
 * Recibe las filas ya filtradas y ordenadas por puntuación y devuelve lo que se pinta: filas sueltas y grupos. Un
 * grupo (dos o más hallazgos con el mismo CVE) ocupa el lugar de su miembro mejor puntuado; si está desplegado, sus
 * miembros van justo debajo, en el mismo orden. Sin DOM: se prueba en Node. */
import type { Finding, ScoredFinding } from '../engine/types';

export interface Grupo {
  clave: string;
  cve: string;
  titulo: string;
  miembros: ScoredFinding[];
  /** Activos distintos afectados. */
  activos: number;
  abiertos: number;
  kev: boolean;
  exploit: boolean;
  enRuta: boolean;
  cvss: number;
  epss: number | null;
}

export type Elemento =
  | { tipo: 'fila'; s: ScoredFinding; grupo?: string }
  | { tipo: 'grupo'; g: Grupo; abierto: boolean };

const cerrado = (f: Finding) => f.status === 'mitigado' || f.status === 'no_explotable';

export function agrupar(filas: ScoredFinding[], fById: Map<string, Finding>, desplegados: ReadonlySet<string>): { elementos: Elemento[]; grupos: number } {
  // Una pasada: cada fila busca su hallazgo una vez y suma a su grupo (miembros, activos, abiertos, señales).
  const fs: (Finding | undefined)[] = new Array(filas.length);
  const porCve = new Map<string, { g: Grupo; activos: Set<string> }>();
  for (let i = 0; i < filas.length; i++) {
    const s = filas[i];
    const f = fById.get(s.id);
    fs[i] = f;
    if (!f?.cve) continue;
    let a = porCve.get(f.cve);
    if (!a) {
      a = { g: { clave: f.cve, cve: f.cve, titulo: f.title, miembros: [], activos: 0, abiertos: 0, kev: false, exploit: false, enRuta: false, cvss: f.cvss, epss: null }, activos: new Set() };
      porCve.set(f.cve, a);
    }
    const g = a.g;
    g.miembros.push(s);
    a.activos.add(f.assetId);
    if (!cerrado(f)) g.abiertos++;
    if (f.kev) g.kev = true;
    if (f.exploitPublic) g.exploit = true;
    if (s.onAttackPath) g.enRuta = true;
    if (f.cvss > g.cvss) g.cvss = f.cvss;
    if (f.epss != null && (g.epss == null || f.epss > g.epss)) g.epss = f.epss;
  }
  const elementos: Elemento[] = [];
  let grupos = 0;
  for (let i = 0; i < filas.length; i++) {
    const s = filas[i];
    const f = fs[i];
    const a = f?.cve ? porCve.get(f.cve) : undefined;
    if (!a || a.g.miembros.length < 2) { elementos.push({ tipo: 'fila', s }); continue; }
    if (a.g.miembros[0] !== s) continue;   // el grupo ya se pintó en el lugar de su mejor miembro (el primero)
    grupos++;
    a.g.activos = a.activos.size;
    const abierto = desplegados.has(a.g.clave);
    elementos.push({ tipo: 'grupo', g: a.g, abierto });
    if (abierto) for (const m of a.g.miembros) elementos.push({ tipo: 'fila', s: m, grupo: a.g.clave });
  }
  return { elementos, grupos };
}
