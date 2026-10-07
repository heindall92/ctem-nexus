/* Datos de EJEMPLO (ficticios) para explorar CTEM-Nexus. Direcciones de documentación (RFC 5737) y redes privadas.
 * Los valores de EPSS son orientativos: consulta FIRST EPSS y el catálogo CISA KEV antes de decidir con datos reales. */
import type { Asset, Finding, ManualEdge, NetworkRange } from '../engine/types';

export const DEMO_ASSETS: Asset[] = [
  { id: 'a01', name: 'Portal web de clientes', type: 'aplicacion_web', ip: '203.0.113.10', owner: 'Equipo Web', criticality: 4, internetExposed: true, tags: ['dmz', 'java'] },
  { id: 'a02', name: 'Exchange OWA', type: 'servidor', ip: '203.0.113.20', owner: 'Sistemas', criticality: 4, internetExposed: true, tags: ['dmz', 'correo'] },
  { id: 'a03', name: 'Citrix NetScaler Gateway', type: 'perimetro', ip: '203.0.113.30', owner: 'Redes', criticality: 4, internetExposed: true, tags: ['vpn', 'perímetro'] },
  { id: 'a04', name: 'Servidor de aplicaciones APP01', type: 'servidor', ip: '10.10.20.15', owner: 'Sistemas', criticality: 3, internetExposed: false, tags: ['interno'] },
  { id: 'a05', name: 'Estaciones de trabajo (VLAN 50)', type: 'estacion', ip: '10.10.50.0/24', owner: 'Puesto de trabajo', criticality: 2, internetExposed: false, tags: ['usuarios'] },
  { id: 'a06', name: 'Controlador de dominio DC01', type: 'controlador_dominio', ip: '10.10.10.5', owner: 'Identidad', criticality: 5, internetExposed: false, tags: ['ad', 'tier0'] },
  { id: 'a07', name: 'Entidad de certificación PKI-CA01', type: 'pki', ip: '10.10.10.8', owner: 'Identidad', criticality: 4, internetExposed: false, tags: ['adcs', 'tier0'] },
  { id: 'a08', name: 'ERP y base de datos financiera', type: 'base_datos', ip: '10.10.30.12', owner: 'Finanzas TI', criticality: 5, internetExposed: false, tags: ['sql', 'datos-sensibles'] },
];

export const DEMO_RANGES: NetworkRange[] = [
  { id: 'r01', cidr: '203.0.113.0/24', label: 'DMZ pública', inScope: true },
  { id: 'r02', cidr: '10.10.10.0/24', label: 'Servidores Tier 0', inScope: true },
  { id: 'r03', cidr: '10.10.20.0/24', label: 'Servidores de aplicación', inScope: true },
  { id: 'r04', cidr: '10.10.30.0/24', label: 'Bases de datos', inScope: true },
  { id: 'r05', cidr: '10.10.50.0/24', label: 'Puestos de usuario', inScope: true },
  { id: 'r06', cidr: '10.99.0.0/16', label: 'Laboratorio (fuera de alcance)', inScope: false },
];

const d = (s: string) => s;

export const DEMO_FINDINGS: Finding[] = [
  { id: 'H-001', title: 'Log4Shell en Apache Log4j 2', kind: 'cve', cve: 'CVE-2021-44228', cvss: 10, epss: 0.944, kev: true, exploitPublic: true, assetId: 'a01', status: 'validado', remediation: 'log4shell', detectedAt: d('2026-09-02'), technique: 'RCE en el portal y pivote a la red de aplicaciones', leadsTo: ['a04'], description: 'JNDI lookup en cabeceras HTTP registradas por la aplicación.' },
  { id: 'H-002', title: 'ProxyShell en Microsoft Exchange', kind: 'cve', cve: 'CVE-2021-34473', cvss: 9.8, epss: 0.943, kev: true, exploitPublic: true, assetId: 'a02', status: 'abierto', remediation: 'proxyshell', detectedAt: d('2026-09-02'), technique: 'Abuso de permisos de Exchange en AD (WriteDACL → DCSync)', leadsTo: ['a06'] },
  { id: 'H-003', title: 'Citrix Bleed: fuga de memoria y robo de sesiones', kind: 'cve', cve: 'CVE-2023-4966', cvss: 9.4, epss: 0.94, kev: true, exploitPublic: true, assetId: 'a03', status: 'abierto', remediation: 'citrix_bleed', detectedAt: d('2026-09-03'), technique: 'Secuestro de sesión VPN y acceso a los puestos internos', leadsTo: ['a05'] },
  { id: 'H-004', title: 'RCE sin autenticar en NetScaler Gateway', kind: 'cve', cve: 'CVE-2023-3519', cvss: 9.8, epss: 0.91, kev: true, exploitPublic: true, assetId: 'a03', status: 'abierto', remediation: 'citrix_bleed', detectedAt: d('2026-09-03'), technique: 'RCE en el appliance y acceso a la red interna', leadsTo: ['a05'] },
  { id: 'H-005', title: 'Cuenta de servicio svc_sql con SPN «kerberoastable»', kind: 'identidad', cvss: 8.1, epss: null, kev: false, exploitPublic: true, assetId: 'a06', status: 'abierto', remediation: 'kerberoast', detectedAt: d('2026-09-05'), technique: 'Kerberoasting de svc_sql y acceso a SQL Server', edgeFrom: 'a05', leadsTo: ['a08'], description: 'Contraseña de 2017, RC4 permitido, miembro de grupos con acceso al ERP.' },
  { id: 'H-006', title: 'Delegación sin restricciones en APP01', kind: 'identidad', cvss: 8.8, epss: null, kev: false, exploitPublic: true, assetId: 'a04', status: 'abierto', remediation: 'unconstrained_delegation', detectedAt: d('2026-09-05'), technique: 'Delegación sin restricciones + coerción del DC (PrinterBug)', leadsTo: ['a06'] },
  { id: 'H-007', title: 'ADCS ESC1: plantilla «UserAuth» permite SAN arbitrario', kind: 'configuracion', cvss: 9.0, epss: null, kev: false, exploitPublic: true, assetId: 'a07', status: 'abierto', remediation: 'adcs_esc1', detectedAt: d('2026-09-05'), technique: 'ADCS ESC1: certificado a nombre de un administrador del dominio', edgeFrom: 'a05', leadsTo: ['a06'] },
  { id: 'H-008', title: 'Firma SMB no obligatoria en servidores', kind: 'configuracion', cvss: 7.5, epss: null, kev: false, exploitPublic: true, assetId: 'a04', status: 'abierto', remediation: 'smb_signing', detectedAt: d('2026-09-06'), technique: 'NTLM relay hacia servidores sin firma SMB', edgeFrom: 'a05', leadsTo: ['a04'] },
  { id: 'H-009', title: 'Contraseña de administrador local reutilizada (sin LAPS)', kind: 'identidad', cvss: 7.8, epss: null, kev: false, exploitPublic: true, assetId: 'a05', status: 'abierto', remediation: 'laps', detectedAt: d('2026-09-06'), technique: 'Reutilización de credenciales de administrador local', leadsTo: ['a04'] },
  { id: 'H-010', title: 'SQL Server con cuenta «sa» y contraseña débil', kind: 'configuracion', cvss: 8.8, epss: null, kev: false, exploitPublic: true, assetId: 'a08', status: 'abierto', remediation: 'weak_credentials', detectedAt: d('2026-09-06'), technique: 'Credenciales débiles de SQL Server desde APP01', edgeFrom: 'a04', leadsTo: ['a08'] },
  { id: 'H-011', title: 'LLMNR y NBT-NS habilitados', kind: 'configuracion', cvss: 6.5, epss: null, kev: false, exploitPublic: true, assetId: 'a05', status: 'abierto', remediation: 'llmnr', detectedAt: d('2026-09-07'), technique: 'Envenenamiento LLMNR y captura de hashes NTLM', leadsTo: ['a04'] },
  { id: 'H-012', title: 'Servicio de cola de impresión activo en el DC', kind: 'configuracion', cvss: 6.8, epss: null, kev: false, exploitPublic: true, assetId: 'a06', status: 'abierto', remediation: 'print_spooler', detectedAt: d('2026-09-07') },
  { id: 'H-013', title: 'NTLM relay en Exchange (sin EPA)', kind: 'cve', cve: 'CVE-2024-21410', cvss: 9.8, epss: 0.31, kev: true, exploitPublic: false, assetId: 'a02', status: 'abierto', remediation: 'patch_cve', detectedAt: d('2026-09-02') },
  { id: 'H-014', title: 'Apache ActiveMQ: deserialización OpenWire', kind: 'cve', cve: 'CVE-2023-46604', cvss: 9.8, epss: 0.94, kev: true, exploitPublic: true, assetId: 'a04', status: 'abierto', remediation: 'patch_cve', detectedAt: d('2026-09-08') },
  { id: 'H-015', title: 'regreSSHion en OpenSSH', kind: 'cve', cve: 'CVE-2024-6387', cvss: 8.1, epss: 0.08, kev: false, exploitPublic: true, assetId: 'a04', status: 'no_explotable', remediation: 'patch_cve', detectedAt: d('2026-09-08'), description: 'Validado: glibc no vulnerable y LoginGraceTime=0 aplicado.' },
  { id: 'H-016', title: 'Microsoft Office: RCE mediante documentos', kind: 'cve', cve: 'CVE-2023-36884', cvss: 8.8, epss: 0.72, kev: true, exploitPublic: true, assetId: 'a05', status: 'abierto', remediation: 'patch_cve', detectedAt: d('2026-09-09') },
  { id: 'H-017', title: 'TLS 1.0/1.1 y cifrados débiles habilitados', kind: 'configuracion', cvss: 5.3, epss: null, kev: false, exploitPublic: false, assetId: 'a01', status: 'mitigado', remediation: 'tls_hardening', detectedAt: d('2026-09-02'), resolvedAt: d('2026-09-12') },
  { id: 'H-018', title: 'Usuarios sin preautenticación Kerberos (AS-REP roasting)', kind: 'identidad', cvss: 7.5, epss: null, kev: false, exploitPublic: true, assetId: 'a06', status: 'abierto', remediation: 'asrep_roast', detectedAt: d('2026-09-10') },
  { id: 'H-019', title: 'Copias de seguridad del ERP sin cifrar', kind: 'configuracion', cvss: 5.5, epss: null, kev: false, exploitPublic: false, assetId: 'a08', status: 'abierto', remediation: 'weak_config', detectedAt: d('2026-09-10') },
  { id: 'H-020', title: 'Inscripción web de ADCS por HTTP sin EPA (ESC8)', kind: 'configuracion', cvss: 8.1, epss: null, kev: false, exploitPublic: true, assetId: 'a07', status: 'mitigado', remediation: 'adcs_esc1', detectedAt: d('2026-09-05'), resolvedAt: d('2026-09-15') },
];

export const DEMO_EDGES: ManualEdge[] = [
  { id: 'e01', from: 'a05', to: 'a07', technique: 'Inscripción de certificados desde puestos de usuario' },
];
