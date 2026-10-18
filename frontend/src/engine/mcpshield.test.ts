/* MCP-Shield → CTEM-Nexus: el sobre «hallazgos» que exporta MCP-Shield 1.6.0 (shared/samples/ecosistema/mcp-shield-hallazgos-ejemplo.json,
 * el mismo fichero que MCP-Shield prueba en su repositorio) se importa como hallazgos del equipo que ejecuta el cliente MCP. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ASSETS, DEMO_FINDINGS } from '../data/demo';
import { inferAttack } from './attack';
import { controlsFor } from './controls';
import { controlEvidence, detectEcosystem, ECO_FORMAT, MCP_CATEGORIES, parseEnvelope, parseMcpShield } from './ecosystem';
import { prioritize } from './engine';
import { parseProject } from './io';
import { planImport } from './merge';
import { GUIDES, guideIn } from './remediation';
import { SOURCE_LABEL } from './scanners';

const raw = readFileSync(resolve(__dirname, '../../../shared/samples/ecosistema/mcp-shield-hallazgos-ejemplo.json'), 'utf8');
const sample = JSON.parse(raw);
const env = parseEnvelope(sample)!;
const TODAY = '2026-10-18';

describe('detección y lectura del sobre de MCP-Shield', () => {
  it('se reconoce como sobre de MCP-Shield', () => {
    const d = detectEcosystem(raw, 'mcp-shield.ecosistema.json');
    expect(d.kind).toBe('mcpshield');
    expect(SOURCE_LABEL.mcpshield).toBe('MCP-Shield');
  });
  it('cada hallazgo llega, en un solo activo de tipo estación', () => {
    const p = parseMcpShield(env);
    expect(p.items).toHaveLength(sample.datos.length);
    expect(p.rejected).toBe(0);
    expect(p.hosts).toEqual([{ key: 'mcp:claude_desktop_config.json', ip: '', name: 'Cliente MCP · claude_desktop_config.json', type: 'estacion', exposed: false }]);
    expect(p).toMatchObject({ source: 'mcpshield', file: 'claude_desktop_config.json', riskScore: sample.resumen.riesgo, grade: 'F', complete: true, servers: sample.resumen.servidores });
    expect(p.tool).toBe(`MCP-Shield ${sample.origen.version}`);
  });
  it('la severidad pasa a la misma escala CVSS que el SARIF de MCP-Shield', () => {
    const p = parseMcpShield(env);
    const cvss = Object.fromEntries(sample.datos.map((d: { severity: string }, i: number) => [d.severity, p.items[i].cvss]));
    expect(cvss).toEqual({ critical: 9.5, high: 7.5, medium: 5, low: 2 });
  });
  it('el título lleva el servidor y la evidencia la regla, el fichero, la línea y la ruta JSON', () => {
    const it0 = parseMcpShield(env).items[0];
    expect(it0.title).toBe(`${sample.datos[0].title} [${sample.datos[0].server}]`);
    expect(it0.evidence).toContain(`MCP-Shield · ${sample.datos[0].ruleId}`);
    expect(it0.evidence).toContain(`claude_desktop_config.json:${sample.datos[0].line} · ${sample.datos[0].location}`);
  });
});

describe('guías, ATT&CK y controles por categoría', () => {
  const p = parseMcpShield(env);
  const byRule = (id: string) => p.items.find((i) => i.evidence.includes(id))!;
  it('cada categoría tiene su guía en los dos idiomas, sus técnicas y sus controles', () => {
    for (const [cat, rule] of Object.entries(MCP_CATEGORIES)) {
      expect(GUIDES[rule.remediation], cat).toBeDefined();
      expect(guideIn('en', rule.remediation).title, cat).not.toBe(GUIDES[rule.remediation].title);
      expect(controlsFor({ remediation: rule.remediation, kind: rule.kind }).length, cat).toBeGreaterThan(0);
      expect(inferAttack('', null, rule.kind, rule.remediation).length, cat).toBeGreaterThan(0);
    }
  });
  it('cadena de suministro → DES-09; secretos → ACC-06 (identidad); ficheros → ACC-02; tool poisoning → OPE-10; HTTP → guía de TLS', () => {
    expect(controlsFor({ remediation: byRule('MCPS-SC-001').remediation, kind: 'configuracion' })[0]).toBe('DES-09');
    expect(byRule('MCPS-SEC-001')).toMatchObject({ kind: 'identidad', remediation: 'mcp_secrets', attack: ['T1552.001'] });
    expect(controlsFor({ remediation: byRule('MCPS-FS-001').remediation, kind: 'configuracion' })[0]).toBe('ACC-02');
    expect(controlsFor({ remediation: byRule('MCPS-TP-001').remediation, kind: 'configuracion' })).toContain('OPE-10');
    expect(byRule('MCPS-SC-003')).toMatchObject({ remediation: 'tls_hardening', attack: ['T1040', 'T1557'] });
  });
});

describe('importación en el proyecto y evidencia para Rosetta', () => {
  const p = parseMcpShield(env);
  const project = { assets: DEMO_ASSETS, findings: DEMO_FINDINGS };
  it('sin destino crea el activo del cliente MCP; con destino usa el elegido', () => {
    const nuevo = planImport(p, project, { today: TODAY });
    expect(nuevo.newAssets).toHaveLength(1);
    expect(nuevo.newAssets[0]).toMatchObject({ type: 'estacion', name: 'Cliente MCP · claude_desktop_config.json', tags: ['mcpshield'] });
    expect(nuevo.newFindings).toHaveLength(p.items.length);
    expect(nuevo.newFindings.every((f) => f.sources?.[0] === 'mcpshield' && f.id.startsWith('MCP-'))).toBe(true);
    const target = DEMO_ASSETS[0].id;
    const fijo = planImport(p, project, { today: TODAY, targetAssetId: target });
    expect(fijo.newAssets).toHaveLength(0);
    expect(fijo.newFindings.every((f) => f.assetId === target)).toBe(true);
  });
  it('reimportar el mismo sobre no duplica hallazgos', () => {
    const first = planImport(p, project, { today: TODAY });
    const after = { assets: [...project.assets, ...first.newAssets], findings: [...project.findings, ...first.newFindings] };
    const again = planImport(p, after, { today: TODAY });
    expect(again.newFindings).toHaveLength(0);
    expect(again.newAssets).toHaveLength(0);
  });
  it('los hallazgos llegan a la evidencia por control que se exporta a Rosetta', () => {
    const plan = planImport(p, { assets: [], findings: [] }, { today: TODAY });
    const input = { assets: plan.newAssets, findings: plan.newFindings, edges: [] };
    const ev = controlEvidence(input.findings, input.assets, prioritize(input), new Date(`${TODAY}T00:00:00Z`));
    const ids = ev.map((e) => e.control);
    for (const c of ['DES-09', 'OPE-05', 'ACC-06', 'OPE-14', 'ACC-02', 'OPE-01', 'OPE-10', 'RED-03']) expect(ids, c).toContain(c);
    expect(ev.find((e) => e.control === 'ACC-06')!.ens).toContain('op.acc.5');
  });
  it('el proyecto guardado conserva la fuente y el registro de intercambios', () => {
    const plan = planImport(p, { assets: [], findings: [] }, { today: TODAY });
    const saved = JSON.stringify({ format: 'ctem-nexus', version: 1, name: 'x', assets: plan.newAssets, findings: plan.newFindings, edges: [], ecoLog: [{ at: TODAY, tool: 'mcp-shield', dir: 'entrada', tipo: 'hallazgos', detail: 'ok' }] });
    const back = parseProject(saved)!;
    expect(back.findings.every((f) => f.sources?.includes('mcpshield'))).toBe(true);
    expect(back.ecoLog?.[0].tool).toBe('mcp-shield');
  });
});

describe('un sobre hostil no rompe nada', () => {
  const hostile = (datos: unknown[], resumen: unknown = sample.resumen) =>
    parseEnvelope({ format: ECO_FORMAT, version: 1, origen: { herramienta: 'mcp-shield', version: '9', generado: '2026-10-18T09:30:00Z' }, tipo: 'hallazgos', proyecto: '../../etc/passwd', datos, resumen })!;
  it('descarta reglas, categorías y severidades desconocidas, y lo que no es un objeto', () => {
    const base = sample.datos[0];
    const p = parseMcpShield(hostile([base, { ...base, ruleId: 'XSS-1' }, { ...base, category: 'malware' }, { ...base, severity: 'grave' }, { ...base, title: '' }, 7, 'x']));
    expect(p.items).toHaveLength(1);
    expect(p.rejected).toBe(4);
  });
  it('recorta los textos, ignora CWE y líneas inválidas y un resumen imposible', () => {
    const base = sample.datos[0];
    const p = parseMcpShield(hostile([{ ...base, title: 'x'.repeat(5000), detail: '<script>'.repeat(500), cwe: 'CWE-ABC', line: -3 }], { riesgo: 900, nota: 'Z', servidores: 'muchos' }));
    expect(p.items[0].title.length).toBeLessThanOrEqual(200 + 3 + base.server.length);
    expect(p.items[0].description.length).toBeLessThanOrEqual(600 + 3 + 12 + 600);
    expect(p.items[0].evidence).not.toMatch(/CWE-ABC|:-3/);
    expect(p).toMatchObject({ riskScore: null, grade: '', servers: 0, complete: false });
  });
  it('el JSON se lee sin claves de prototipo', () => {
    const txt = raw.replace('"datos": [', '"datos": [{"__proto__": {"admin": true}, "constructor": {"x": 1}},');
    const d = detectEcosystem(txt);
    expect(d.kind).toBe('mcpshield');
    if (d.kind !== 'mcpshield') return;
    expect(parseMcpShield(d.envelope).rejected).toBe(1);
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });
});
