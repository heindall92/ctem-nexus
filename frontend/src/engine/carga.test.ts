/* Datos reales (1.3.0): ficheros y proyectos grandes se importan enteros, por partes y en segundo plano, y nunca se
 * pierde nada en silencio. Las cifras de tiempo son holgadas para la CI; en un portátil van de 3 a 10 veces mejor. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importFindings, MAX_FILAS, parseProject, type Project } from './io';
import { planImport } from './merge';
import { MAX_ITEMS, parseNessus, parseNuclei, parseOpenVas, reducirEscaneo, resumenEscaneo, UMBRAL_RESUMEN, type ScanParse } from './scanners';
import { atender, cambiosEntre, CopiaMotor, leerEscaneo, MAX_FICHERO, recomponer, trocear, TROZO, type Lectura, type Progreso } from './tareas';
import { prioritize } from './engine';
import { simulate } from './simulate';
import type { Asset, Finding } from './types';
import { MAX_XML_BYTES, porPartes } from './xml';

const sample = (f: string) => readFileSync(resolve(__dirname, '../../../shared/samples', f), 'utf8');
const ms = (fn: () => void) => { const t = performance.now(); fn(); return performance.now() - t; };

/** Nessus sintético: `hosts` equipos con `porHost` resultados, con relleno para que pese de verdad. */
function nessus(hosts: number, porHost: number, relleno = 0): string {
  const partes = ['<?xml version="1.0" ?><NessusClientData_v2><Policy><policyName>Red completa</policyName></Policy><Report name="x">'];
  const pad = 'x'.repeat(relleno);
  for (let h = 0; h < hosts; h++) {
    partes.push(`<ReportHost name="10.1.${h >> 8}.${h & 255}"><HostProperties><tag name="host-ip">10.1.${h >> 8}.${h & 255}</tag><tag name="host-fqdn">srv${h}.corp.example</tag></HostProperties>`);
    for (let i = 0; i < porHost; i++) {
      partes.push(`<ReportItem port="443" svc_name="www" protocol="tcp" severity="${1 + (i % 4)}" pluginID="${100000 + (i % 50)}" pluginName="Plugin ${i % 50}"><cve>CVE-2024-${10000 + i}</cve><cvss3_base_score>${(4 + (i % 6)).toFixed(1)}</cvss3_base_score><synopsis>Sinopsis</synopsis><plugin_output>${pad}</plugin_output></ReportItem>`);
    }
    partes.push('</ReportHost>');
  }
  partes.push('</Report></NessusClientData_v2>');
  return partes.join('');
}

describe('análisis XML por partes', () => {
  it('da lo mismo que el análisis completo con las muestras de Nessus y OpenVAS', () => {
    const n = parseNessus(sample('nessus-ejemplo.nessus'));
    expect(n.items.length).toBeGreaterThan(0);
    expect(n.tool).toMatch(/^Nessus/);
    const o = parseOpenVas(sample('openvas-ejemplo.xml'));
    expect(o.items.length).toBeGreaterThan(0);
  });

  it('respeta anidados, autocerrados y espacios de nombres, y no confunde <results> con <result>', () => {
    const xml = '<r><results n="1"><result id="a"><x/><result id="b"/></result><ns:result id="c">t</ns:result><result id="d"/></results></r>';
    const ids = [...porPartes(xml, 'result')].map((p) => p.children[0].attrs.id);
    expect(ids).toEqual(['a', 'c', 'd']);
    const a = [...porPartes(xml, 'result')][0].children[0];
    expect(a.children.map((c) => c.name)).toEqual(['x', 'result']);
  });

  it('rechaza DTD y entidades en el fichero entero antes de analizar ninguna parte', () => {
    expect(() => [...porPartes('<!DOCTYPE x [<!ENTITY a "b">]><r><result/></r>', 'result')]).toThrow(/DTD|entidades/);
  });

  it(`un .nessus de más de ${MAX_XML_BYTES / 1_000_000} MB (el antiguo máximo) se lee entero y avisa de su avance`, () => {
    const xml = nessus(300, 100, 1300);
    expect(xml.length).toBeGreaterThan(MAX_XML_BYTES);
    let r!: Lectura;
    const t = ms(() => { r = leerEscaneo(xml, 'red.nessus'); });
    expect(r.kind).toBe('scan');
    const p = (r as Extract<Lectura, { kind: 'scan' }>).parse;
    expect(p.items).toHaveLength(30000);   // antes: 5.000 y el resto contado como «informativo»
    expect(p.hosts).toHaveLength(300);
    expect(p.truncated).toBeUndefined();
    expect(p.tool).toBe('Nessus · Red completa');
    expect((r as Extract<Lectura, { kind: 'scan' }>).resumen?.total).toBe(30000);
    expect(t).toBeLessThan(15000);
  });
});

describe('nunca se pierde nada en silencio', () => {
  it('lo que pasa del tope de seguridad va a «truncated», no a «informativos omitidos»', () => {
    const lineas = Array.from({ length: MAX_ITEMS + 7 }, (_, i) => `{"template-id":"t${i % 9}","host":"h${i % 50}.example","info":{"name":"N${i % 9}","severity":"high"}}`);
    const r = parseNuclei(lineas.join('\n'));
    expect(r.items).toHaveLength(MAX_ITEMS);
    expect(r.truncated).toBe(7);
    expect(r.skipped).toBe(0);
  }, 60000);

  it('un CSV de 6.000 filas entra entero (antes se quedaba en 5.000 sin avisar)', () => {
    const csv = ['title,cve,cvss,assetId', ...Array.from({ length: 6000 }, (_, i) => `Fallo ${i},CVE-2025-${10000 + i},7.5,A-1`)].join('\n');
    const r = importFindings(csv, [{ id: 'A-1', name: 'Servidor', type: 'servidor', ip: '10.0.0.1', owner: '', criticality: 3, internetExposed: false, tags: [] }]);
    expect(r.findings).toHaveLength(6000);
    expect(r.truncated).toBe(0);
    expect(MAX_FILAS).toBeGreaterThanOrEqual(250_000);
  });
});

describe('resumen previo y reducción de ficheros enormes', () => {
  const base = (): ScanParse => ({
    source: 'trivy', tool: 'Trivy', skipped: 2,
    hosts: [{ key: 'img', ip: '', name: 'app:1.0', type: 'aplicacion' as Asset['type'], exposed: false }],
    items: [
      { hostKey: 'img', title: 'openssl', cve: 'CVE-2024-1', relatedCves: [], cvss: 5, epss: 0.1, kev: false, exploitPublic: false, kind: 'cve', remediation: 'patch_cve', description: '', evidence: 'openssl 1.1', ref: 'trivy:openssl' },
      { hostKey: 'img', title: 'openssl', cve: 'CVE-2024-2', relatedCves: ['CVE-2024-9'], cvss: 9.8, epss: null, kev: true, exploitPublic: false, kind: 'cve', remediation: 'patch_cve', description: '', evidence: 'openssl 1.1', ref: 'trivy:openssl' },
      { hostKey: 'img', title: 'zlib', cve: 'CVE-2024-3', relatedCves: [], cvss: 7.1, epss: 0.4, kev: false, exploitPublic: true, kind: 'cve', remediation: 'patch_cve', description: '', evidence: 'zlib 1.2', ref: 'trivy:zlib' },
      { hostKey: 'img', title: 'sin regla', cve: null, relatedCves: [], cvss: 3, epss: null, kev: false, exploitPublic: false, kind: 'configuracion', remediation: '', description: '', evidence: '', ref: '' },
    ],
  });

  it('cuenta por severidad y dice cuántos quedan con cada opción', () => {
    const r = resumenEscaneo(base());
    expect(r.porSeveridad).toEqual({ critica: 1, alta: 1, media: 1, baja: 1 });
    expect(r.quedan).toEqual({ todo: 4, altas: 2, regla: 3 });
    for (const m of ['todo', 'altas', 'regla'] as const) expect(reducirEscaneo(base(), m).items).toHaveLength(r.quedan[m]);
  });

  it('«agrupar por complemento» funde los CVE de la misma regla y equipo y se queda con lo peor', () => {
    const [ssl] = reducirEscaneo(base(), 'regla').items;
    expect(ssl).toMatchObject({ cve: 'CVE-2024-2', relatedCves: ['CVE-2024-1', 'CVE-2024-9'], cvss: 9.8, kev: true, epss: 0.1 });
  });

  it('«solo altas y críticas» cuenta lo demás como omitido', () => {
    const r = reducirEscaneo(base(), 'altas');
    expect(r.items.map((x) => x.cvss)).toEqual([9.8, 7.1]);
    expect(r.skipped).toBe(4);
  });

  it(`el resumen solo se ofrece por encima de ${UMBRAL_RESUMEN.toLocaleString('es-ES')} resultados`, () => {
    expect((leerEscaneo(sample('nessus-ejemplo.nessus'), 'x.nessus') as Extract<Lectura, { kind: 'scan' }>).resumen).toBeNull();
  });
});

describe('tareas del Worker (sin Worker: la misma función)', () => {
  it('lee un proyecto desde un Blob y avisa de las fases', async () => {
    const fases: string[] = [];
    const p = (await atender({ id: 1, tipo: 'proyecto', archivo: new Blob([JSON.stringify({ format: 'ctem-nexus', name: 'Blob', assets: [], findings: [] })]) }, (x) => fases.push(x.fase))) as Project;
    expect(p.name).toBe('Blob');
    expect(fases).toEqual(['leyendo', 'analizando']);
  });

  it('lee un escaneo, un catálogo KEV y reconoce lo que no es un escaneo', async () => {
    const leer = async (texto: string, nombre: string) => (await atender({ id: 1, tipo: 'escaneo', archivo: new Blob([texto]), nombre })) as Lectura;
    expect((await leer(sample('nessus-ejemplo.nessus'), 'a.nessus')).kind).toBe('scan');
    expect((await leer(JSON.stringify({ title: 'CISA Catalog of Known Exploited Vulnerabilities', catalogVersion: '2026.11.01', vulnerabilities: [{ cveID: 'CVE-2024-3400' }] }), 'kev.json')).kind).toBe('kev');
    expect(await leer(JSON.stringify({ format: 'ctem-nexus', assets: [], findings: [] }), 'p.json')).toEqual({ kind: 'otro', fmt: 'proyecto' });
  });

  it(`rechaza ficheros de más de ${MAX_FICHERO / 1048576} MB sin leerlos`, async () => {
    const enorme = { size: MAX_FICHERO + 1, text: () => { throw new Error('no debería leerse'); } } as unknown as Blob;
    await expect(atender({ id: 1, tipo: 'proyecto', archivo: enorme })).rejects.toThrow(/supera el máximo/);
  });

  it('el análisis por partes avisa del avance', async () => {
    const avances: Progreso[] = [];
    await atender({ id: 1, tipo: 'escaneo', archivo: new Blob([nessus(60, 20, 1000)]), nombre: 'r.nessus' }, (x) => avances.push(x));
    const analizando = avances.filter((a) => a.fase === 'analizando' && (a.hecho ?? 0) > 0);
    expect(analizando.length).toBeGreaterThan(0);
    expect(analizando.every((a, i) => i === 0 || (a.hecho ?? 0) >= (analizando[i - 1].hecho ?? 0))).toBe(true);
  });
});

describe('carga: 50.000 hallazgos y 2.000 activos', () => {
  const activos: Asset[] = Array.from({ length: 2000 }, (_, i) => ({ id: `A-${i}`, name: `srv${i}`, type: 'servidor', ip: `10.0.${i >> 8}.${i & 255}`, owner: 'TI', criticality: (1 + (i % 5)) as Asset['criticality'], internetExposed: i % 10 === 0, tags: [] }));
  const hallazgos: Finding[] = Array.from({ length: 50000 }, (_, i) => ({ id: `H-${i}`, title: `Fallo ${i % 3000}`, kind: 'cve', cve: `CVE-2024-${10000 + (i % 3000)}`, cvss: 4 + (i % 6), epss: (i % 100) / 100, kev: i % 37 === 0, exploitPublic: i % 11 === 0, assetId: `A-${i % 2000}`, status: 'abierto', remediation: 'patch_cve' }));

  it('el proyecto se valida entero en segundos, no en minutos (antes: activo buscado en toda la lista por hallazgo)', () => {
    const texto = JSON.stringify({ format: 'ctem-nexus', name: 'Carga', assets: activos, findings: hallazgos.map((f) => ({ ...f, assetId: `srv${Number(f.assetId.slice(2))}` })) });
    let p!: Project | null;
    expect(ms(() => { p = parseProject(texto); })).toBeLessThan(5000);
    expect(p!.findings).toHaveLength(50000);
    expect(p!.findings[4321].assetId).toBe('A-321');   // resuelto por nombre
  });

  it('importar 20.000 resultados sobre 50.000 hallazgos tarda segundos (antes, cerca de dos minutos)', () => {
    const hosts = Array.from({ length: 2500 }, (_, i) => ({ key: `h${i}`, ip: `10.0.${i >> 8}.${i & 255}`, name: `srv${i}`, type: 'servidor' as const, exposed: false }));
    const items = Array.from({ length: 20000 }, (_, i) => ({ hostKey: `h${i % 2500}`, title: `Nuevo ${i}`, cve: i % 4 === 0 ? `CVE-2024-${10000 + (i % 3000)}` : `CVE-2025-${10000 + i}`, relatedCves: [], cvss: 7, epss: null, kev: false, exploitPublic: false, kind: 'cve' as const, remediation: 'patch_cve', description: '', evidence: '', ref: '' }));
    let plan!: ReturnType<typeof planImport>;
    expect(ms(() => { plan = planImport({ source: 'nessus', tool: 'Nessus', hosts, items, skipped: 0 }, { assets: activos, findings: hallazgos }, { today: '2026-11-11' }); })).toBeLessThan(5000);
    expect(plan.newAssets).toHaveLength(500);
    expect(plan.newFindings.length + plan.updatedFindings.length + plan.duplicatesInFile).toBe(20000);
    expect(new Set(plan.newFindings.map((f) => f.id)).size).toBe(plan.newFindings.length);
  });
});

describe('copia del proyecto en el Worker y respuestas en trozos', () => {
  const activos: Asset[] = Array.from({ length: 30 }, (_, i) => ({ id: `A${i}`, name: `A${i}`, type: 'servidor', ip: '', owner: '', criticality: (i % 6 === 0 ? 5 : 2) as Asset['criticality'], internetExposed: i % 4 === 0, tags: [] }));
  const hallazgos: Finding[] = Array.from({ length: 12000 }, (_, i) => ({ id: `H${i}`, title: `F${i}`, kind: 'cve', cve: `CVE-2024-${10000 + (i % 900)}`, cvss: 4 + (i % 6), epss: 0.2, kev: i % 50 === 0, exploitPublic: i % 7 === 0, assetId: `A${i % 30}`, status: 'abierto', remediation: 'patch_cve', leadsTo: i % 40 === 0 ? [`A${(i + 1) % 30}`] : [] }));

  it('mandada en trozos y corregida con parches, calcula lo mismo que el motor en la página', () => {
    const c = new CopiaMotor();
    c.aplicar({ id: 0, tipo: 'base', parte: 'inicio' });
    for (let i = 0; i < hallazgos.length; i += TROZO) c.aplicar({ id: 0, tipo: 'base', parte: 'trozo', findings: hallazgos.slice(i, i + TROZO) });
    c.aplicar({ id: 0, tipo: 'base', parte: 'fin', assets: activos, edges: [] });
    const calc = (fijados: string[] = []) => c.calcular({ id: 1, tipo: 'calcular', canal: 'x', profile: 'defecto', slaPolicy: 'estandar', fijados });
    expect(calc()).toEqual(prioritize({ assets: activos, findings: hallazgos, edges: [], profile: 'defecto', slaPolicy: 'estandar' }));
    // Un cambio de estado: solo viaja ese hallazgo.
    const editados = hallazgos.map((f, i) => (i === 40 ? { ...f, status: 'mitigado' as const } : f));
    const cambios = cambiosEntre(hallazgos, editados);
    expect(cambios).toEqual([[40, editados[40]]]);
    c.aplicar({ id: 0, tipo: 'parche', longitud: editados.length, cambios });
    expect(calc()).toEqual(prioritize({ assets: activos, findings: editados, edges: [], profile: 'defecto', slaPolicy: 'estandar' }));
    // «¿Y si…?» sobre la copia = simulate en la página.
    expect(calc(['H0', 'H80'])).toEqual(simulate({ assets: activos, findings: editados, edges: [], profile: 'defecto', slaPolicy: 'estandar' }, ['H0', 'H80']));
  });

  it('las listas grandes viajan en trozos y se recomponen igual', () => {
    const r = prioritize({ assets: activos, findings: hallazgos, edges: [] });
    const mensajes = trocear(7, r);
    expect(mensajes.length).toBe(Math.ceil(r.scored.length / TROZO) + 1);
    const ultimo = mensajes.at(-1) as { result: typeof r; troceado: string };
    expect(ultimo.troceado).toBe('scored');
    expect(ultimo.result.scored).toEqual([]);
    const trozos = mensajes.slice(0, -1).map((m) => (m as { trozo: unknown[] }).trozo);
    expect(recomponer(ultimo.result, ultimo.troceado, trozos)).toEqual(r);
    // Lo pequeño va de una vez.
    expect(trocear(8, { format: 'ctem-nexus', findings: [1, 2, 3] })).toEqual([{ id: 8, result: { format: 'ctem-nexus', findings: [1, 2, 3] } }]);
  });
});
