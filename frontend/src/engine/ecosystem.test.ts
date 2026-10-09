/* Ecosistema: sobre común, detección, importadores y exportadores con los ficheros de ejemplo de shared/samples/ecosistema. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ANCHOR, DEMO_ASSETS, DEMO_EDGES, DEMO_FINDINGS } from '../data/demo';
import { SLA_POLICIES } from './constants';
import {
  AD_RULES, applyKairos, bestAsset, contradictions, controlEvidence, detectEcosystem, ECO_FORMAT, ensCategoryOf, kairosPlan, levelFromRecovery,
  makeEnvelope, nameSimilarity, ownerRows, parseAdAuditor, parseEnvelope, planOwners, rosettaStates, SLA_FOR_CATEGORY, studioCategory,
  studioInfo, toKairos, toNorvik, toStudio,
} from './ecosystem';
import { prioritize } from './engine';
import { techniqueById } from './attack';
import { parseProject } from './io';
import { planImport } from './merge';

const dir = resolve(__dirname, '../../../shared/samples/ecosistema');
const sample = (f: string) => readFileSync(resolve(dir, f), 'utf8');
const TODAY = new Date(`${DEMO_ANCHOR}T00:00:00Z`);
const input = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS, edges: DEMO_EDGES };
const result = prioritize(input);

describe('sobre yrd-ecosistema', () => {
  it('se crea y se valida de ida y vuelta', () => {
    const env = makeEnvelope('indicadores', [{ a: 1 }], '0.6.0', { proyecto: 'X' }, new Date('2026-10-09T10:00:00.123Z'));
    expect(env.origen).toEqual({ herramienta: 'ctem-nexus', version: '0.6.0', generado: '2026-10-09T10:00:00Z' });
    expect(parseEnvelope(JSON.parse(JSON.stringify(env)))).toEqual(env);
  });
  it('rechaza formato, versión, herramienta o tipo desconocidos', () => {
    const ok = { format: ECO_FORMAT, version: 1, origen: { herramienta: 'rosetta', version: '2.10.0', generado: '2026-10-09T10:00:00Z' }, tipo: 'controles', datos: [] };
    expect(parseEnvelope(ok)).not.toBeNull();
    expect(parseEnvelope({ ...ok, format: 'otro' })).toBeNull();
    expect(parseEnvelope({ ...ok, version: 2 })).toBeNull();
    expect(parseEnvelope({ ...ok, origen: { ...ok.origen, herramienta: 'excel' } })).toBeNull();
    expect(parseEnvelope({ ...ok, tipo: 'malware' })).toBeNull();
    expect(parseEnvelope({ ...ok, datos: 'x' })).toBeNull();
  });
  it('descarta claves de prototipo y datos que no son objetos', () => {
    const text = `{"format":"yrd-ecosistema","version":1,"origen":{"herramienta":"norvik","version":"1","generado":"2026-10-09"},"tipo":"responsables","datos":[{"__proto__":{"admin":true},"activo":"a01","responsable":"Ana"},7,"x"]}`;
    const d = detectEcosystem(text);
    expect(d.kind).toBe('sobre');
    if (d.kind !== 'sobre') return;
    expect(d.envelope.datos).toHaveLength(1);
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });
});

describe('detección de ficheros', () => {
  it('reconoce cada fichero de ejemplo de shared/samples/ecosistema', () => {
    for (const [file, kind] of [
      ['kairos-meridiano.json', 'kairos'], ['studio-meridiano.json', 'studio'], ['ens-ad-auditor-meridiano.json', 'adauditor'],
      ['responsables-norvik.csv', 'responsables-csv'], ['responsables-norvik.json', 'sobre'],
    ]) expect(detectEcosystem(sample(file), file).kind, file).toBe(kind);
  });
  it('reconoce las copias de KAIROS y de Compliance Studio y avisa de los demás proyectos', () => {
    const k = JSON.parse(sample('kairos-meridiano.json'));
    const kb = detectEcosystem(JSON.stringify({ app: 'kairos', version: '1.0', ws: {}, proyectos: [{ id: 'p1', state: k }, { id: 'p2', state: k }] }));
    expect(kb.kind === 'kairos' && kb.others).toBe(1);
    const s = JSON.parse(sample('studio-meridiano.json'));
    const sb = detectEcosystem(JSON.stringify({ kind: 'ens-studio-backup', projects: [{ id: 'x', state: s }] }));
    expect(sb.kind).toBe('studio');
  });
  it('un proyecto de Rosetta y lo desconocido', () => {
    expect(detectEcosystem(JSON.stringify({ controles: { 'OPE-04': { estado: 'implantado' } }, alcance: {} })).kind).toBe('rosetta');
    expect(detectEcosystem('{"hola":1}').kind).toBe('desconocido');
    expect(detectEcosystem('no es nada').kind).toBe('desconocido');
  });
});

describe('emparejamiento por nombre', () => {
  it('parecido de nombres sin tildes ni palabras vacías', () => {
    expect(nameSimilarity('Controlador de dominio DC01 (Active Directory)', 'Controlador de dominio DC01')).toBeGreaterThan(0.6);
    expect(nameSimilarity('Exchange OWA (correo)', 'Exchange OWA')).toBeGreaterThan(0.6);
    expect(nameSimilarity('Laboratorio de pruebas', 'Portal web de clientes')).toBe(0);
  });
  it('prefiere la etiqueta explícita y la IP', () => {
    const assets = [{ ...DEMO_ASSETS[0], tags: ['kairos:A-09'] }, ...DEMO_ASSETS.slice(1)];
    expect(bestAsset(assets, { id: 'A-09', name: 'otra cosa' }, 'kairos')).toEqual({ assetId: 'a01', score: 1 });
    expect(bestAsset(DEMO_ASSETS, { name: 'x', ip: '10.10.10.5' }, 'kairos').assetId).toBe('a06');
    expect(bestAsset(DEMO_ASSETS, { name: 'Impresora del almacén' }, 'kairos').assetId).toBeNull();
  });
});

describe('KAIROS → criticidad', () => {
  const plan = kairosPlan(JSON.parse(sample('kairos-meridiano.json')), DEMO_ASSETS);
  it('nivel por RTO (y MTPD si falta)', () => {
    expect([levelFromRecovery(2, 8), levelFromRecovery(4, 24), levelFromRecovery(8, 48), levelFromRecovery(48, 72), levelFromRecovery(100, 200), levelFromRecovery(null, 12), levelFromRecovery(null, null)]).toEqual([5, 5, 4, 3, 2, 4, 2]);
  });
  it('propaga por dependencias entre activos y empareja con la demo', () => {
    expect(plan.functions).toBe(4);
    expect(plan.unsupported).toBe(1); // el laboratorio no da soporte a ninguna función
    const by = Object.fromEntries(plan.items.map((i) => [i.kid, i]));
    expect(by['A-01'].criticality).toBe(5); // F-01, RTO 4 h
    expect(by['A-04'].criticality).toBe(5); // APP01: el portal depende de él
    expect(by['A-06'].criticality).toBe(5); // AD: todo depende de él
    expect(by['A-06'].functions.map((f) => f.id).sort()).toEqual(['F-01', 'F-02', 'F-03', 'F-04']);
    expect(by['A-02'].criticality).toBe(4); // correo, RTO 24 h
    expect(Object.fromEntries(plan.items.map((i) => [i.kid, i.match]))).toEqual({ 'A-01': 'a01', 'A-02': 'a02', 'A-03': 'a03', 'A-04': 'a04', 'A-05': 'a08', 'A-06': 'a06' });
  });
  it('al aplicar sube la criticidad, etiqueta y respeta al responsable que ya había', () => {
    const r = applyKairos(DEMO_ASSETS, plan.items.map((item) => ({ item, assetId: item.match! })));
    const a04 = r.assets.find((a) => a.id === 'a04')!;
    expect(a04.criticality).toBe(5);
    expect(a04.tags).toContain('kairos:A-04');
    expect(a04.owner).toBe('Sistemas');
    expect(r.changed).toBeGreaterThan(0);
    // Re-aplicar no cambia nada.
    expect(applyKairos(r.assets, plan.items.map((item) => ({ item, assetId: item.match! }))).changed).toBe(0);
  });
  it('devuelve a KAIROS el riesgo de interrupción de los activos vinculados', () => {
    const assets = applyKairos(DEMO_ASSETS, plan.items.map((item) => ({ item, assetId: item.match! }))).assets;
    const out = toKairos(assets, DEMO_FINDINGS, prioritize({ ...input, assets }));
    expect(out.map((x) => x.activo).sort()).toEqual(['A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06']);
    const portal = out.find((x) => x.activo === 'A-01')!;
    expect(portal.criticos).toBeGreaterThan(0);
    expect(portal.riesgoInterrupcion).toBe('alto');
  });
});

describe('ENS AD Auditor → hallazgos', () => {
  const ad = parseAdAuditor(JSON.parse(sample('ens-ad-auditor-meridiano.json')));
  it('traduce cada alerta con su guía, su CVSS equivalente y su técnica ATT&CK', () => {
    expect(ad.domain).toBe('meridiano.local');
    expect(ad.sample).toBe(true);
    expect(ad.items).toHaveLength(6);
    expect(ad.daPath).toBe(3);
    const k = ad.items.find((i) => i.ref === 'kerberoasting')!;
    expect(k).toMatchObject({ remediation: 'kerberoast', cvss: 7.5, kind: 'identidad', attack: ['T1558.003'], exploitPublic: true });
    expect(k.evidence).toContain('ENS: op.acc.5');
    expect(ad.items.find((i) => i.ref === 'adcs_esc')!.cvss).toBe(9);
  });
  it('se funde con los hallazgos del controlador de dominio de la demo', () => {
    const plan = planImport(ad, { assets: DEMO_ASSETS, findings: DEMO_FINDINGS }, { targetAssetId: 'a06', today: DEMO_ANCHOR });
    expect(plan.newAssets).toHaveLength(0);
    expect(plan.newFindings.every((f) => f.id.startsWith('ADA-') && f.sources?.includes('adauditor') && f.assetId === 'a06')).toBe(true);
    expect(plan.newFindings.length + plan.updatedFindings.length).toBe(6);
    expect(plan.newFindings.find((f) => f.remediation === 'identity_generic')?.attack).toEqual(['T1003.006', 'T1098']);
  });
  it('todas las técnicas ATT&CK de las reglas están en el catálogo de la matriz', () => {
    const missing = Object.entries(AD_RULES).flatMap(([k, r]) => r.attack.filter((id) => !techniqueById(id)).map((id) => `${k}: ${id}`));
    expect(missing).toEqual([]);
  });
  it('descarta alertas mal formadas', () => {
    const bad = parseAdAuditor({ alerts: [{ finding: { finding_type: 'x', title: 'y' }, risk: 'Enorme' }, 5, { risk: 'Alto' }] });
    expect(bad.items).toHaveLength(0);
    expect(bad.rejected).toBe(3);
  });
});

describe('Compliance Studio', () => {
  it('categoría del sistema con los alias del ENS', () => {
    expect(ensCategoryOf([{ D: 'b', I: 'm' }]).category).toBe('MEDIA');
    expect(ensCategoryOf([{ C: 'ALTO' }, { D: 'BAJO' }]).category).toBe('ALTA');
    expect(ensCategoryOf([{ T: 'bajo' }]).category).toBe('BÁSICA');
    expect(ensCategoryOf([{ D: '' }]).category).toBeNull();
    const info = studioInfo(JSON.parse(sample('studio-meridiano.json')), 'x');
    expect(info.category).toBe('MEDIA');
    expect(info.levels).toEqual({ D: 'MEDIO', I: 'MEDIO', C: 'MEDIO', A: 'MEDIO', T: 'BAJO' });
    expect(SLA_POLICIES[SLA_FOR_CATEGORY.ALTA].critica).toBeLessThan(SLA_POLICIES[SLA_FOR_CATEGORY['BÁSICA']].critica);
  });
  it('la política ENS ALTA acorta los plazos del motor', () => {
    const alta = prioritize({ ...input, slaPolicy: 'ens_alta' });
    expect(alta.slaPolicy).toBe('ens_alta');
    expect(alta.scored.find((s) => s.band === 'critica')!.slaDays).toBe(2);
    expect(prioritize({ ...input, slaPolicy: 'inventada' as never }).slaPolicy).toBe('estandar');
  });
  it('exporta evidencia técnica con categorías que Studio admite', () => {
    const STUDIO = ['SQLI', 'XSS', 'AUTH_MFA', 'BRUTE', 'TLS', 'DEFCREDS', 'OUTDATED', 'IDOR', 'LOGGING', 'INFOLEAK', 'NETSEG', 'PHISHING', 'DOS', 'BACKUP'];
    const out = toStudio(DEMO_FINDINGS, DEMO_ASSETS, result, { id: 'CTEM', name: 'Meridiano' }, 'Meridiano');
    expect(out.formato).toBe('ens-studio-hallazgos');
    expect(out.hallazgos.length).toBeGreaterThan(5);
    for (const h of out.hallazgos) {
      expect(STUDIO).toContain(h.categoria);
      expect(h.id).toMatch(/^CN-[\w.-]+$/);
      expect(h.activoId).toBe('CTEM');
      expect(['abierto', 'cerrado']).toContain(h.estado);
      expect(h.cvss).toBeGreaterThanOrEqual(0);
    }
    expect(studioCategory({ kind: 'cve', remediation: 'log4shell', cve: 'CVE-2021-44228' })).toBe('OUTDATED');
  });
});

describe('Rosetta', () => {
  const ev = controlEvidence(DEMO_FINDINGS, DEMO_ASSETS, result, TODAY);
  it('agrupa los hallazgos activos por control, del peor al mejor', () => {
    expect(ev.length).toBeGreaterThan(4);
    expect(ev[0].peor).toBeGreaterThanOrEqual(ev[ev.length - 1].peor);
    const ope04 = ev.find((e) => e.control === 'OPE-04')!;
    expect(ope04.ens).toEqual(['op.exp.4']);
    expect(ope04.iso27001).toContain('A8.8');
    expect(ope04.abiertos).toBe(Object.values(ope04.porBanda).reduce((a, b) => a + b, 0));
    expect(ope04.hallazgos.every((h) => h.estado === 'abierto' || h.estado === 'validado')).toBe(true);
  });
  it('detecta controles implantados con exposición crítica o alta', () => {
    const link = { generado: '', proyecto: 'Meridiano', estados: { 'OPE-04': 'implantado' as const, 'ACC-06': 'parcial' as const } };
    const c = contradictions(ev, link);
    expect(c.map((x) => x.control)).toEqual(['OPE-04']);
    expect(contradictions(ev, undefined)).toEqual([]);
  });
  it('lee estados del proyecto de Rosetta y del sobre «controles» (con la evidencia devuelta)', () => {
    const p = rosettaStates({ project: { controles: { 'OPE-04': { estado: 'implantado' }, 'ACC-07': { estado: 'raro' }, x: { estado: 'parcial' } }, alcance: {} }, name: 'R' });
    expect(p.link.estados).toEqual({ 'OPE-04': 'implantado' });
    const env = parseEnvelope({ format: ECO_FORMAT, version: 1, origen: { herramienta: 'rosetta', version: '2.11.0', generado: '2026-10-09T10:00:00Z' }, tipo: 'controles', proyecto: 'R', datos: [{ control: 'OPE-04', estado: 'parcial', ctem: { control: 'OPE-04', abiertos: 2 } }] })!;
    const r = rosettaStates({ envelope: env });
    expect(r.link).toMatchObject({ proyecto: 'R', estados: { 'OPE-04': 'parcial' } });
    expect(r.evidence).toEqual([{ control: 'OPE-04', abiertos: 2 }]);
  });

  // Ida y vuelta CTEM-Nexus → Rosetta → CTEM-Nexus. `npm run golden` regenera el fichero de salida; Rosetta (sus pruebas)
  // lo importa y deja su respuesta en rosetta-a-ctem.json, que debe devolver la evidencia sin pérdida.
  const outFile = resolve(dir, 'ctem-a-rosetta.json');
  it('el sobre para Rosetta coincide con el fichero de ida', () => {
    const env = makeEnvelope('hallazgos', ev, 'ejemplo', { proyecto: 'Ejemplo · Industrias Meridiano S.A.', resumen: { indice: result.summary.exposureIndex, abiertos: result.summary.openFindings } }, new Date('2026-09-16T09:00:00Z'));
    if (process.env.GOLDEN === '1' || !existsSync(outFile)) writeFileSync(outFile, JSON.stringify(env, null, 2) + '\n');
    expect(JSON.parse(readFileSync(outFile, 'utf8'))).toEqual(JSON.parse(JSON.stringify(env)));
  });
  it('Rosetta devuelve la evidencia de cada control sin pérdida', () => {
    const back = detectEcosystem(sample('rosetta-a-ctem.json'));
    expect(back.kind).toBe('sobre');
    if (back.kind !== 'sobre') return;
    expect(back.envelope.origen.herramienta).toBe('rosetta');
    const r = rosettaStates({ envelope: back.envelope });
    const sent = JSON.parse(readFileSync(outFile, 'utf8')).datos;
    const byControl = (a: Array<Record<string, unknown>>) => [...a].sort((x, y) => String(x.control).localeCompare(String(y.control)));
    expect(byControl(r.evidence)).toEqual(byControl(sent));
    expect(Object.keys(r.link.estados).length).toBeGreaterThanOrEqual(sent.length);
  });
});

describe('Norvik', () => {
  it('responsables desde CSV: por nombre e IP, y sin activo lo que no casa', () => {
    const d = detectEcosystem(sample('responsables-norvik.csv'));
    expect(d.kind).toBe('responsables-csv');
    if (d.kind !== 'responsables-csv') return;
    const plan = planOwners(DEMO_ASSETS, ownerRows({ rows: d.rows }));
    expect(plan.changes.map((c) => [c.assetId, c.after])).toEqual([
      ['a01', 'Lucía Romero (Product Owner web)'], ['a06', 'Javier Ortiz (Responsable de Identidad)'], ['a08', 'Marta Gil (Responsable de Finanzas TI)'],
    ]);
    expect(plan.unmatched).toEqual(['Servidor inexistente']);
  });
  it('responsables desde el sobre', () => {
    const d = detectEcosystem(sample('responsables-norvik.json'));
    if (d.kind !== 'sobre') throw new Error('no es un sobre');
    expect(planOwners(DEMO_ASSETS, ownerRows({ envelope: d.envelope })).changes.map((c) => c.assetId)).toEqual(['a01', 'a03']);
  });
  it('indicadores del ciclo con histórico', () => {
    const ind = toNorvik(DEMO_FINDINGS, DEMO_ASSETS, result, [{ at: '2026-09-01', exposureIndex: 80, open: 10, overdue: 2, mttrDays: 12 }], TODAY);
    const by = Object.fromEntries(ind.map((x) => [x.indicador, x]));
    expect(by.indice_exposicion.valor).toBe(result.summary.exposureIndex);
    expect(by.sla_cumplimiento.unidad).toBe('%');
    expect(by.historico).toMatchObject({ fecha: '2026-09-01', valor: 80 });
  });
});

describe('ficheros de ejemplo de salida (los valida el esquema en pytest)', () => {
  const NOW = new Date('2026-09-16T09:00:00Z');
  const write = (file: string, env: unknown) => {
    const out = resolve(dir, file);
    if (process.env.GOLDEN === '1' || !existsSync(out)) writeFileSync(out, JSON.stringify(env, null, 2) + '\n');
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual(JSON.parse(JSON.stringify(env)));
  };
  it('KAIROS y Norvik', () => {
    const plan = kairosPlan(JSON.parse(sample('kairos-meridiano.json')), DEMO_ASSETS);
    const assets = applyKairos(DEMO_ASSETS, plan.items.map((item) => ({ item, assetId: item.match! }))).assets;
    const r = prioritize({ ...input, assets });
    write('ctem-a-kairos.json', makeEnvelope('activos', toKairos(assets, DEMO_FINDINGS, r), 'ejemplo', { proyecto: 'Ejemplo · Industrias Meridiano S.A.' }, NOW));
    write('ctem-a-norvik.json', makeEnvelope('indicadores', toNorvik(DEMO_FINDINGS, DEMO_ASSETS, result, [], TODAY), 'ejemplo', { proyecto: 'Ejemplo · Industrias Meridiano S.A.' }, NOW));
    write('ctem-a-studio.json', toStudio(DEMO_FINDINGS, DEMO_ASSETS, result, { id: 'CTEM', name: 'Industrias Meridiano' }, 'Ejemplo · Industrias Meridiano S.A.'));
  });
});

describe('proyecto', () => {
  it('guarda y sanea la política de plazos, la categoría ENS, los estados de Rosetta y el registro', () => {
    const p = parseProject(JSON.stringify({
      format: 'ctem-nexus', version: 1, name: 'x', assets: [], findings: [], edges: [], ranges: [],
      slaPolicy: 'ens_alta', ens: { category: 'ALTA', levels: { C: 'ALTO', X: 'ALTO', D: 'ENORME' }, project: 'S', at: '2026-10-09' },
      rosetta: { generado: 'g', proyecto: 'R', estados: { 'OPE-04': 'implantado', 'ope-1': 'implantado', 'ACC-07': 'raro' }, at: 'no' },
      ecoLog: [{ at: '2026-10-09', tool: 'kairos', dir: 'entrada', tipo: 'bia', detail: 'ok' }, { at: '2026-10-09', tool: 'excel', dir: 'salida', tipo: 'x', detail: '' }],
    }))!;
    expect(p.slaPolicy).toBe('ens_alta');
    expect(p.ens).toEqual({ category: 'ALTA', levels: { C: 'ALTO' }, project: 'S', at: '2026-10-09' });
    expect(p.rosetta).toEqual({ generado: 'g', proyecto: 'R', estados: { 'OPE-04': 'implantado' }, at: '' });
    expect(p.ecoLog).toHaveLength(1);
    expect(parseProject(JSON.stringify({ format: 'ctem-nexus', version: 1, name: 'x', slaPolicy: 'rapida' }))!.slaPolicy).toBeUndefined();
  });
});
