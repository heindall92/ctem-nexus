import { describe, expect, it } from 'vitest';
import { acceptRisk, addDays, exceptionState, expireExceptions, expiringSoon, MAX_ACCEPT_DAYS, revokeRisk, validateException } from './exceptions';
import { parseProject } from './io';
import type { Finding } from './types';

const T = '2026-10-08';
const f: Finding = {
  id: 'H-1', title: 'Copias sin cifrar', kind: 'configuracion', cve: null, cvss: 5.5, epss: null, kev: false, exploitPublic: false,
  assetId: 'a1', status: 'validado', remediation: 'weak_config', detectedAt: '2026-09-01', leadsTo: [],
};
const ok = { owner: 'Dirección financiera', reason: 'Migración del proveedor en el cuarto trimestre', expires: addDays(T, 60), compensating: 'Red de copias aislada' };

describe('validación de la aceptación', () => {
  it('acepta una petición completa', () => {
    expect(validateException(f, ok, T, 'media')).toEqual([]);
  });
  it('exige responsable, motivo y una caducidad futura de un año como mucho', () => {
    expect(validateException(f, { ...ok, owner: ' ', reason: 'corto', expires: T }, T, 'media')).toEqual(['responsable', 'motivo', 'pasada']);
    expect(validateException(f, { ...ok, expires: addDays(T, MAX_ACCEPT_DAYS + 1) }, T, 'media')).toEqual(['lejana']);
    expect(validateException(f, { ...ok, expires: addDays(T, MAX_ACCEPT_DAYS) }, T, 'media')).toEqual([]);
    expect(validateException(f, { ...ok, expires: '2026-13-40' }, T, 'media')).toEqual(['fecha']);
  });
  it('en crítica y alta exige control compensatorio', () => {
    expect(validateException(f, { ...ok, compensating: '' }, T, 'alta')).toEqual(['compensatorio']);
    expect(validateException(f, { ...ok, compensating: '' }, T, 'baja')).toEqual([]);
  });
  it('no se acepta lo mitigado o no explotable', () => {
    expect(validateException({ status: 'mitigado' }, ok, T, 'media')).toContain('estado');
  });
});

describe('ciclo de vida', () => {
  it('aceptar guarda el estado previo y la fecha; retirar lo devuelve', () => {
    const a = acceptRisk(f, ok, T);
    expect(a).toMatchObject({ status: 'aceptado', exception: { previous: 'validado', approvedAt: T, expires: ok.expires } });
    const r = revokeRisk(a);
    expect(r.status).toBe('validado');
    expect(r.exception?.owner).toBe(ok.owner);
  });
  it('renovar conserva el estado original, no «aceptado»', () => {
    const a = acceptRisk(acceptRisk(f, ok, T), { ...ok, expires: addDays(T, 120) }, addDays(T, 30));
    expect(a.exception).toMatchObject({ previous: 'validado', approvedAt: addDays(T, 30) });
  });
  it('estado de la excepción con aviso a 14 días', () => {
    expect(exceptionState({ expires: addDays(T, 30) }, T).state).toBe('vigente');
    expect(exceptionState({ expires: addDays(T, 14) }, T)).toEqual({ state: 'por_caducar', daysLeft: 14 });
    expect(exceptionState({ expires: addDays(T, -1) }, T).state).toBe('caducada');
  });
  it('al cargar, las vencidas vuelven a su estado y las vigentes no se tocan', () => {
    const vencida = acceptRisk({ ...f, id: 'A' }, { ...ok, expires: addDays(T, 5) }, T);
    const vigente = acceptRisk({ ...f, id: 'B', status: 'abierto' }, ok, T);
    const sinFicha: Finding = { ...f, id: 'C', status: 'aceptado' };
    const later = addDays(T, 10);
    const { findings, expired } = expireExceptions([vencida, vigente, sinFicha, f], later);
    expect(expired).toEqual(['A', 'C']);
    expect(findings.map((x) => x.status)).toEqual(['validado', 'aceptado', 'abierto', 'validado']);
    expect(findings[0].exception?.expires).toBe(addDays(T, 5));
    const same = [vigente];
    expect(expireExceptions(same, T).findings).toBe(same);
  });
  it('lista las que caducan pronto, de la más próxima a la más lejana', () => {
    const a = acceptRisk({ ...f, id: 'A' }, { ...ok, expires: addDays(T, 10) }, T);
    const b = acceptRisk({ ...f, id: 'B' }, { ...ok, expires: addDays(T, 3) }, T);
    const c = acceptRisk({ ...f, id: 'C' }, { ...ok, expires: addDays(T, 90) }, T);
    expect(expiringSoon([a, b, c], T).map((x) => x.id)).toEqual(['B', 'A']);
  });
});

describe('proyecto: perfil, inteligencia, importaciones e instantáneas', () => {
  it('se conservan al exportar e importar y se sanean', () => {
    const p = {
      format: 'ctem-nexus', version: 1, name: 'P', demo: false, assets: [], ranges: [], edges: [], findings: [],
      profile: 'banca',
      intel: { kev: { version: '2026.10.07', released: '2026-10-07', count: 1300, importedAt: '2026-10-08' }, epss: { model: 'v2025.03.14', scoreDate: 'mal', count: -4, importedAt: '2026-10-08' } },
      imports: [{ at: '2026-10-08', source: 'nessus', tool: 'Nessus', file: 'a.nessus', newAssets: 1, newFindings: 2, updated: 3, reopened: 0 }, { at: 'x', source: 'nessus' }, { at: '2026-10-08', source: 'otro' }],
      snapshots: [
        { at: '2026-10-08', label: 'Ciclo 2', profile: 'banca', exposureIndex: 71.26, open: 12, byBand: { critica: 3, alta: 4, media: 3, baja: 2 }, kev: 4, attackPaths: 5, accepted: 1, overdue: 2, mttrDays: 9.33 },
        { at: '2026-09-08', label: 'Ciclo 1', profile: 'xx', exposureIndex: 900, open: 15, byBand: {}, kev: 5, attackPaths: 7, accepted: 0, overdue: 4, mttrDays: null },
      ],
    };
    const r = parseProject(JSON.stringify(p))!;
    expect(r.profile).toBe('banca');
    expect(r.intel?.kev?.count).toBe(1300);
    expect(r.intel?.epss).toMatchObject({ scoreDate: '', count: 0 });
    expect(r.imports).toHaveLength(1);
    expect(r.snapshots?.map((x) => x.at)).toEqual(['2026-09-08', '2026-10-08']);
    expect(r.snapshots?.[0]).toMatchObject({ profile: 'defecto', exposureIndex: 100, byBand: { critica: 0, alta: 0, media: 0, baja: 0 } });
    expect(r.snapshots?.[1]).toMatchObject({ exposureIndex: 71.3, mttrDays: 9.3 });
    expect(parseProject(JSON.stringify({ ...p, profile: 'hack' }))?.profile).toBeUndefined();
  });
});
