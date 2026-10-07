import { describe, expect, it } from 'vitest';
import { parseBloodHoundJson } from './bloodhound';

describe('bloodhound active directory parser', () => {
  it('parsea computadoras y usuarios detectando DC como joya de la corona y kerberoasting', () => {
    const sampleData = {
      data: [
        {
          ObjectIdentifier: 'S-1-5-21-12345-1001',
          Properties: {
            name: 'DC01.CORP.LOCAL',
            operatingsystem: 'Windows Server 2022 Datacenter',
            highvalue: true,
            PrimaryGroupSID: 'S-1-5-21-12345-516',
          },
        },
        {
          ObjectIdentifier: 'S-1-5-21-12345-1002',
          Properties: {
            name: 'SRV-FILE.CORP.LOCAL',
            operatingsystem: 'Windows Server 2019',
            unconstraineddelegation: true,
          },
        },
        {
          ObjectIdentifier: 'S-1-5-21-12345-1100',
          Properties: {
            name: 'SQL_SERVICE@CORP.LOCAL',
            hasspn: true,
            enabled: true,
          },
        },
        {
          ObjectIdentifier: 'S-1-5-21-12345-1101',
          Properties: {
            name: 'USUARIO_VULN@CORP.LOCAL',
            dontreqpreauth: true,
            enabled: true,
          },
        },
      ],
      meta: { type: 'computers_and_users', count: 4, version: 5 },
    };

    const res = parseBloodHoundJson(JSON.stringify(sampleData));
    expect(res.summary.totalComputers).toBe(2);
    expect(res.summary.domainControllers).toBe(1);
    expect(res.summary.kerberoastable).toBe(1);
    expect(res.summary.asrepRoastable).toBe(1);
    expect(res.summary.unconstrainedDelegation).toBe(1);

    // Comprobar que DC01 se clasifica como Joya de la corona (criticidad 5)
    const dc = res.assets.find((a) => a.name === 'DC01.CORP.LOCAL');
    expect(dc).toBeDefined();
    expect(dc?.type).toBe('controlador_dominio');
    expect(dc?.criticality).toBe(5);

    // Comprobar que el hallazgo de Kerberoasting se generó y enlaza al DC
    const kerb = res.findings.find((f) => f.remediation === 'kerberoast');
    expect(kerb).toBeDefined();
    expect(kerb?.title).toContain('Kerberoasting');
    expect(kerb?.leadsTo).toContain(dc?.id);
  });
});
