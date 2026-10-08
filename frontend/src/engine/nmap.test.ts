import { describe, expect, it } from 'vitest';
import { isPrivateIp, parseNmapXml } from './nmap';

describe('nmap parser', () => {
  it('detecta IPs privadas correctamente', () => {
    expect(isPrivateIp('10.0.1.5')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('172.20.0.10')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('203.0.113.195')).toBe(false);
  });

  it('parsea un reporte XML de Nmap extrayendo activos, criticidad y hallazgos', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <nmaprun scanner="nmap">
      <host>
        <status state="up"/>
        <address addr="10.10.10.5" addrtype="ipv4"/>
        <hostnames><hostname name="dc-principal.corp.local"/></hostnames>
        <ports>
          <port protocol="tcp" portid="88"><state state="open"/><service name="kerberos-sec"/></port>
          <port protocol="tcp" portid="389"><state state="open"/><service name="ldap"/></port>
        </ports>
      </host>
      <host>
        <status state="up"/>
        <address addr="203.0.113.50" addrtype="ipv4"/>
        <hostnames><hostname name="vpn-gateway"/></hostnames>
        <ports>
          <port protocol="tcp" portid="443">
            <state state="open"/>
            <service name="https"/>
            <script id="vulners" output="Found CVE-2023-4966"/>
          </port>
        </ports>
      </host>
      <host>
        <status state="down"/>
        <address addr="10.10.10.99" addrtype="ipv4"/>
      </host>
    </nmaprun>`;

    const res = parseNmapXml(xml);
    expect(res.totalHosts).toBe(2);

    const dc = res.assets.find((a) => a.ip === '10.10.10.5');
    expect(dc).toBeDefined();
    expect(dc?.type).toBe('controlador_dominio');
    expect(dc?.criticality).toBe(5);
    expect(dc?.internetExposed).toBe(false);

    const gw = res.assets.find((a) => a.ip === '203.0.113.50');
    expect(gw).toBeDefined();
    expect(gw?.internetExposed).toBe(true);
    expect(gw?.type).toBe('perimetro');

    expect(res.findings.length).toBeGreaterThanOrEqual(1);
    const cve = res.findings.find((f) => f.cve === 'CVE-2023-4966');
    expect(cve).toBeDefined();
    expect(cve?.assetId).toBe(gw?.id);
  });

  it('rechaza XML con entidades o DTD (XXE, «billion laughs») y acepta el DOCTYPE de Nmap', () => {
    expect(() => parseNmapXml('<!DOCTYPE r [<!ENTITY a "x">]><nmaprun>&a;</nmaprun>')).toThrow(/DTD/);
    expect(() => parseNmapXml('<!DOCTYPE r SYSTEM "file:///etc/passwd"><nmaprun/>')).toThrow(/DTD/);
    const real = parseNmapXml('<?xml version="1.0"?><!DOCTYPE nmaprun><nmaprun><host><status state="up"/><address addr="10.0.0.1" addrtype="ipv4"/></host></nmaprun>');
    expect(real.totalHosts).toBe(1);
  });
});
