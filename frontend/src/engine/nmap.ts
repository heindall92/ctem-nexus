/* Parser de reportes XML de Nmap (-oX) para el navegador y el motor TS sin dependencias externas. */
import type { Asset, AssetType, Finding, NetworkRange } from './types';

const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;

/** Verifica si una IP es de rango privado (RFC 1918 / RFC 4193) o local. */
export function isPrivateIp(ip: string): boolean {
  const clean = ip.trim();
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  if (/^10\./.test(clean)) return true;
  if (/^192\.168\./.test(clean)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return true;
  if (/^169\.254\./.test(clean)) return true; // Link-local
  if (/^(fc00|fe80)/i.test(clean)) return true; // IPv6 local
  return false;
}

export interface NmapParseResult {
  assets: Asset[];
  findings: Finding[];
  ranges: NetworkRange[];
  totalHosts: number;
  totalFindings: number;
}

/**
 * Parsea el contenido XML generado por Nmap (nmap -sV -sC -oX escaneo.xml ...).
 * Funciona de manera universal en navegadores (vía DOMParser) y con respaldo de expresiones regulares.
 */
export function parseNmapXml(xmlText: string): NmapParseResult {
  const assets: Asset[] = [];
  const findings: Finding[] = [];
  const subnets = new Set<string>();

  // Detección de entorno DOMParser (navegador)
  let xmlDoc: Document | null = null;
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        xmlDoc = null;
      }
    } catch {
      xmlDoc = null;
    }
  }

  if (xmlDoc) {
    const hostNodes = xmlDoc.getElementsByTagName('host');
    for (let i = 0; i < hostNodes.length; i++) {
      const host = hostNodes[i];
      const statusElem = host.getElementsByTagName('status')[0];
      if (statusElem && statusElem.getAttribute('state') !== 'up') {
        continue;
      }

      // Dirección IP
      let ip = '';
      const addrNodes = host.getElementsByTagName('address');
      for (let j = 0; j < addrNodes.length; j++) {
        const addr = addrNodes[j];
        const addrType = addr.getAttribute('addrtype');
        if (addrType === 'ipv4' || (!ip && addrType === 'ipv6') || !ip) {
          ip = addr.getAttribute('addr') || '';
        }
      }
      if (!ip) continue;

      // Inferencia de subred /24 para IPv4
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        const parts = ip.split('.');
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}.0/24`);
      }

      // Hostname
      let hostname = ip;
      const hostnamesElem = host.getElementsByTagName('hostnames')[0];
      if (hostnamesElem) {
        const hnNodes = hostnamesElem.getElementsByTagName('hostname');
        for (let j = 0; j < hnNodes.length; j++) {
          const name = hnNodes[j].getAttribute('name');
          if (name) {
            hostname = name;
            break;
          }
        }
      }

      // Puertos y servicios
      const openPorts: string[] = [];
      const portNumbers: number[] = [];
      const detectedCves = new Set<string>();

      const portNodes = host.getElementsByTagName('port');
      for (let j = 0; j < portNodes.length; j++) {
        const port = portNodes[j];
        const stateElem = port.getElementsByTagName('state')[0];
        if (stateElem && stateElem.getAttribute('state') === 'open') {
          const portId = Number(port.getAttribute('portid') || 0);
          const proto = port.getAttribute('protocol') || 'tcp';
          if (portId > 0) portNumbers.push(portId);

          const svsElem = port.getElementsByTagName('service')[0];
          const svcName = svsElem?.getAttribute('name') || '';

          let tag = `${proto}:${portId}`;
          if (svcName) tag += `/${svcName}`;
          openPorts.push(tag);

          // Scripts NSE asociados al puerto
          const scriptNodes = port.getElementsByTagName('script');
          for (let k = 0; k < scriptNodes.length; k++) {
            const outText = scriptNodes[k].getAttribute('output') || '';
            const matches = outText.match(CVE_RE);
            if (matches) {
              for (const m of matches) detectedCves.add(m.toUpperCase());
            }
          }
        }
      }

      // Clasificación de activo y criticidad
      const isDc = portNumbers.some((p) => p === 88 || p === 389 || p === 636) || openPorts.some((p) => p.includes('ldap') || p.includes('kerberos'));
      const isDb = portNumbers.some((p) => [1433, 1521, 3306, 5432, 27017, 6379].includes(p));
      const isWeb = portNumbers.some((p) => [80, 443, 8080, 8443, 8000, 5000].includes(p)) || openPorts.some((p) => p.includes('http'));
      const isPublic = !isPrivateIp(ip);

      let assetType: AssetType = 'servidor';
      let criticality: Asset['criticality'] = 3;

      if (isDc) {
        assetType = 'controlador_dominio';
        criticality = 5;
      } else if (isDb) {
        assetType = 'base_datos';
        criticality = 4;
      } else if (isPublic) {
        assetType = 'perimetro';
        criticality = 4;
      } else if (isWeb) {
        assetType = 'aplicacion_web';
        criticality = 3;
      } else if (portNumbers.some((p) => [22, 3389, 445].includes(p))) {
        assetType = 'servidor';
        criticality = 3;
      } else {
        assetType = 'estacion';
        criticality = 2;
      }

      const assetId = `nmap_${ip.replace(/[.:]/g, '_')}`;
      assets.push({
        id: assetId,
        name: hostname,
        type: assetType,
        ip,
        owner: 'TI / Operaciones',
        criticality,
        internetExposed: isPublic,
        tags: openPorts.slice(0, 8),
      });

      // Generación de hallazgos
      for (const cve of Array.from(detectedCves).sort()) {
        findings.push({
          id: `F-NMAP-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Vulnerabilidad ${cve} en ${hostname}`,
          kind: 'cve',
          cve,
          cvss: 7.5,
          epss: 0.5,
          kev: false,
          exploitPublic: true,
          assetId,
          status: 'abierto',
          remediation: 'parchear-vulnerabilidad',
          description: `Vulnerabilidad reportada por script de escaneo Nmap en ${ip}.`,
          leadsTo: [],
        });
      }

      if (portNumbers.includes(23)) {
        findings.push({
          id: `F-NMAP-TELNET-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Servicio Telnet sin cifrar en ${hostname}`,
          kind: 'configuracion',
          cve: null,
          cvss: 7.5,
          epss: null,
          kev: false,
          exploitPublic: false,
          assetId,
          status: 'abierto',
          remediation: 'desactivar-telnet',
          description: `Puerto 23/TCP activo en ${ip}; transmite credenciales en texto plano.`,
          leadsTo: [],
        });
      }

      if (portNumbers.includes(445) && !isDc) {
        findings.push({
          id: `F-NMAP-SMB-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Puerto SMB expuesto en ${hostname}`,
          kind: 'configuracion',
          cve: null,
          cvss: 6.0,
          epss: null,
          kev: false,
          exploitPublic: false,
          assetId,
          status: 'abierto',
          remediation: 'firma-smb',
          description: `Puerto 445/TCP activo en ${ip}. Requiere verificar firma SMB obligatoria.`,
          leadsTo: [],
        });
      }
    }
  } else {
    // Respaldo por expresiones regulares para entornos de test (ej. Node / Vitest sin jsdom)
    const hostRegex = /<host[\s\S]*?<\/host>/gi;
    let match: RegExpExecArray | null;

    while ((match = hostRegex.exec(xmlText)) !== null) {
      const hostBlock = match[0];
      if (/<status[^>]*state="down"/i.test(hostBlock)) continue;

      const addrMatch = /<address[^>]*addr="([^"]+)"[^>]*addrtype="ipv[46]"/i.exec(hostBlock) || /<address[^>]*addr="([^"]+)"/i.exec(hostBlock);
      const ip = addrMatch ? addrMatch[1] : '';
      if (!ip) continue;

      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        const parts = ip.split('.');
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}.0/24`);
      }

      const hnMatch = /<hostname[^>]*name="([^"]+)"/i.exec(hostBlock);
      const hostname = hnMatch ? hnMatch[1] : ip;

      const portRegex = /<port[^>]*protocol="([^"]+)"[^>]*portid="(\d+)"[\s\S]*?<\/port>/gi;
      let pMatch: RegExpExecArray | null;
      const openPorts: string[] = [];
      const portNumbers: number[] = [];
      const detectedCves = new Set<string>();

      while ((pMatch = portRegex.exec(hostBlock)) !== null) {
        const pBlock = pMatch[0];
        if (/<state[^>]*state="open"/i.test(pBlock)) {
          const proto = pMatch[1];
          const portId = Number(pMatch[2]);
          portNumbers.push(portId);

          const svcMatch = /<service[^>]*name="([^"]+)"/i.exec(pBlock);
          const svcName = svcMatch ? svcMatch[1] : '';

          let tag = `${proto}:${portId}`;
          if (svcName) tag += `/${svcName}`;
          openPorts.push(tag);

          const scriptMatches = pBlock.match(CVE_RE);
          if (scriptMatches) {
            for (const cm of scriptMatches) detectedCves.add(cm.toUpperCase());
          }
        }
      }

      const isDc = portNumbers.some((p) => p === 88 || p === 389 || p === 636) || openPorts.some((p) => p.includes('ldap') || p.includes('kerberos'));
      const isDb = portNumbers.some((p) => [1433, 1521, 3306, 5432, 27017, 6379].includes(p));
      const isWeb = portNumbers.some((p) => [80, 443, 8080, 8443, 8000, 5000].includes(p)) || openPorts.some((p) => p.includes('http'));
      const isPublic = !isPrivateIp(ip);

      let assetType: AssetType = 'servidor';
      let criticality: Asset['criticality'] = 3;

      if (isDc) {
        assetType = 'controlador_dominio';
        criticality = 5;
      } else if (isDb) {
        assetType = 'base_datos';
        criticality = 4;
      } else if (isPublic) {
        assetType = 'perimetro';
        criticality = 4;
      } else if (isWeb) {
        assetType = 'aplicacion_web';
        criticality = 3;
      } else if (portNumbers.some((p) => [22, 3389, 445].includes(p))) {
        assetType = 'servidor';
        criticality = 3;
      } else {
        assetType = 'estacion';
        criticality = 2;
      }

      const assetId = `nmap_${ip.replace(/[.:]/g, '_')}`;
      assets.push({
        id: assetId,
        name: hostname,
        type: assetType,
        ip,
        owner: 'TI / Operaciones',
        criticality,
        internetExposed: isPublic,
        tags: openPorts.slice(0, 8),
      });

      for (const cve of Array.from(detectedCves).sort()) {
        findings.push({
          id: `F-NMAP-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Vulnerabilidad ${cve} en ${hostname}`,
          kind: 'cve',
          cve,
          cvss: 7.5,
          epss: 0.5,
          kev: false,
          exploitPublic: true,
          assetId,
          status: 'abierto',
          remediation: 'parchear-vulnerabilidad',
          description: `Vulnerabilidad detectada en escaneo Nmap en ${ip}.`,
          leadsTo: [],
        });
      }

      if (portNumbers.includes(23)) {
        findings.push({
          id: `F-NMAP-TELNET-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Servicio Telnet sin cifrar en ${hostname}`,
          kind: 'configuracion',
          cve: null,
          cvss: 7.5,
          epss: null,
          kev: false,
          exploitPublic: false,
          assetId,
          status: 'abierto',
          remediation: 'desactivar-telnet',
          description: `Puerto 23/TCP activo en ${ip}.`,
          leadsTo: [],
        });
      }
    }
  }

  const ranges: NetworkRange[] = Array.from(subnets).sort().map((cidr, idx) => ({
    id: `r-nmap-${idx + 1}`,
    cidr,
    label: `Subred descubierta ${cidr}`,
    inScope: true,
  }));

  return {
    assets,
    findings,
    ranges,
    totalHosts: assets.length,
    totalFindings: findings.length,
  };
}
