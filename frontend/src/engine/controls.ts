/* Correspondencia hallazgo → controles (sin DOM).
 *
 * Cada guía de remediación (Finding.remediation) apunta a uno o varios controles unificados de Rosetta Multinorma
 * (OPE-04, ACC-07…). Los identificadores de ENS, ISO/IEC 27001:2022 (Anexo A), NIS2 (Reglamento de Ejecución
 * 2024/2690 y art. 21.2), NIST CSF 2.0 y DORA se copian del catálogo de Rosetta para que las dos herramientas digan
 * lo mismo. Solo identificadores: ningún texto de normas ISO (lo comprueba controls.test.ts). */
import type { Finding } from './types';

export interface ControlRef {
  /** Control unificado de Rosetta Multinorma. */
  id: string;
  title: string;
  titleEn: string;
  ens: string[];
  iso27001: string[];
  nis2: string[];
  nist: string[];
  dora: string[];
}

const C = (id: string, title: string, titleEn: string, ens: string[], iso27001: string[], nis2: string[], nist: string[], dora: string[] = []): ControlRef =>
  ({ id, title, titleEn, ens, iso27001, nis2, nist, dora });

/** Subconjunto del catálogo de Rosetta 2.10 que toca la gestión de la exposición. */
export const CONTROLS: Record<string, ControlRef> = {
  'OPE-01': C('OPE-01', 'Configuración segura y bastionado', 'Secure configuration and hardening', ['op.exp.2'], ['A8.9'], ['6.3'], ['PR.PS-01']),
  'OPE-02': C('OPE-02', 'Gestión de la configuración', 'Configuration management', ['op.exp.3'], ['A8.9'], ['6.3'], ['ID.AM-08', 'PR.PS-01']),
  'OPE-04': C('OPE-04', 'Mantenimiento y parches de seguridad', 'Maintenance and security patching', ['op.exp.4'], ['A8.8', 'A7.13'], ['6.6', '6.4'], ['PR.PS-02', 'PR.PS-03'], ['7', '9']),
  'OPE-05': C('OPE-05', 'Gestión y divulgación de vulnerabilidades', 'Vulnerability management and disclosure', ['op.exp.4', 'op.mon.3', 'mp.s.2'], ['A8.8'], ['6.10'], ['ID.RA-01', 'ID.RA-08'], ['25']),
  'OPE-08': C('OPE-08', 'Registro de actividad', 'Activity logging', ['op.exp.8', 'op.mon.1'], ['A8.15'], ['3.2'], ['PR.PS-04']),
  'OPE-10': C('OPE-10', 'Monitorización y detección de intrusiones', 'Monitoring and intrusion detection', ['op.mon.1', 'op.mon.3', 'op.exp.8', 'mp.s.4'], ['A8.16'], ['3.2'], ['DE.CM-01', 'DE.CM-03', 'DE.CM-09', 'DE.AE-03'], ['10']),
  'OPE-14': C('OPE-14', 'Criptografía y gestión de claves', 'Cryptography and key management', ['op.exp.10', 'mp.si.2', 'mp.eq.3'], ['A8.24'], ['9'], ['PR.DS-01', 'PR.DS-10'], ['9']),
  'ACC-01': C('ACC-01', 'Identificación y gestión de identidades', 'Identity management', ['op.acc.1', 'op.acc.5'], ['A5.16'], ['11.5'], ['PR.AA-01', 'PR.AA-02']),
  'ACC-02': C('ACC-02', 'Control de acceso y mínimo privilegio', 'Access control and least privilege', ['op.acc.2', 'op.acc.4'], ['A5.15', 'A8.3'], ['11.1'], ['PR.AA-05'], ['9']),
  'ACC-03': C('ACC-03', 'Gestión y revisión de derechos de acceso', 'Access rights management and review', ['op.acc.4', 'op.acc.5'], ['A5.18'], ['11.2'], ['PR.AA-05']),
  'ACC-05': C('ACC-05', 'Cuentas privilegiadas y sistemas de administración', 'Privileged accounts and admin systems', ['op.acc.2', 'op.acc.3', 'op.acc.4'], ['A8.2', 'A8.18'], ['11.3', '11.4'], []),
  'ACC-06': C('ACC-06', 'Autenticación segura', 'Secure authentication', ['op.acc.5', 'op.acc.6', 'op.acc.1'], ['A5.17', 'A8.5'], ['11.6'], ['PR.AA-03', 'PR.AA-04']),
  'ACC-07': C('ACC-07', 'Autenticación multifactor', 'Multi-factor authentication', ['op.acc.5', 'op.acc.6'], ['A8.5'], ['11.7', '21.2.j'], ['PR.AA-03'], ['9']),
  'RED-01': C('RED-01', 'Seguridad y perímetro de red', 'Network security and perimeter', ['mp.com.1', 'mp.com.4', 'op.pl.2', 'op.mon.1'], ['A8.20', 'A8.21'], ['6.7'], ['PR.IR-01'], ['9']),
  'RED-02': C('RED-02', 'Segregación de redes y flujos', 'Network and flow segregation', ['mp.com.4', 'op.ext.4', 'mp.com.1', 'op.pl.2'], ['A8.22'], ['6.8'], ['ID.AM-03', 'PR.IR-01']),
  'RED-03': C('RED-03', 'Protección de las comunicaciones', 'Communications protection', ['mp.com.2', 'mp.com.3'], ['A8.24', 'A8.20', 'A8.21'], ['9', '21.2.j'], ['PR.DS-02']),
  'DES-07': C('DES-07', 'Protección de servicios y aplicaciones web', 'Web service and application protection', ['mp.s.2'], ['A8.26', 'A8.29'], ['6.5'], []),
  'DES-09': C('DES-09', 'Lista de materiales de software (SBOM) y componentes de terceros', 'Software bill of materials (SBOM) and third-party components', [], ['A8.28'], [], ['GV.SC-09', 'ID.AM-02']),
};

/** Guía de remediación → controles (el primero es el principal). */
export const REMEDIATION_CONTROLS: Record<string, string[]> = {
  log4shell: ['OPE-04', 'OPE-05', 'DES-09'],
  proxyshell: ['OPE-04', 'OPE-05', 'ACC-02'],
  citrix_bleed: ['OPE-04', 'OPE-05', 'RED-01'],
  kerberoast: ['ACC-06', 'ACC-05'],
  unconstrained_delegation: ['ACC-02', 'ACC-05'],
  adcs_esc1: ['ACC-06', 'OPE-01', 'OPE-14'],
  smb_signing: ['RED-03', 'OPE-01'],
  laps: ['ACC-05', 'ACC-06'],
  weak_credentials: ['ACC-06', 'ACC-07'],
  llmnr: ['OPE-01', 'RED-02'],
  print_spooler: ['OPE-01', 'OPE-02'],
  asrep_roast: ['ACC-06', 'ACC-07'],
  tls_hardening: ['RED-03', 'OPE-14'],
  patch_cve: ['OPE-04', 'OPE-05'],
  weak_config: ['OPE-01', 'OPE-02'],
  identity_generic: ['ACC-01', 'ACC-03'],
  web_injection: ['DES-07', 'OPE-05'],
  web_xss: ['DES-07', 'OPE-05'],
  web_hardening: ['DES-07', 'OPE-01'],
  ad_hygiene: ['OPE-01', 'ACC-02'],
};

/** Controles de un hallazgo: por su guía o, si no la tiene, por su tipo. */
export function controlsFor(f: Pick<Finding, 'remediation' | 'kind' | 'sources'>): string[] {
  const byGuide = REMEDIATION_CONTROLS[f.remediation];
  if (byGuide) return byGuide;
  if (f.sources?.some((s) => s === 'trivy' || s === 'sarif')) return ['OPE-05', 'DES-09'];
  if (f.kind === 'cve') return ['OPE-04', 'OPE-05'];
  if (f.kind === 'identidad') return ['ACC-01', 'ACC-03'];
  return ['OPE-01', 'OPE-02'];
}

/* ───────────── ARGOS: dónde practicar cada corrección ───────────── */

export const ARGOS_WEB = 'https://heindall92.github.io/argos-grc/';

export interface ArgosLink { id: string; name: string; nameEn: string; why: string; whyEn: string }

/** Máquinas de ARGOS relacionadas con cada guía (la URL abre la máquina: #maquina/<id>). */
const ARGOS_MACHINES: Record<string, ArgosLink> = {
  vulns: { id: 'm-vulnerabilidades', name: 'Del escáner al plan', nameEn: 'From scanner to plan', why: 'Priorizar un informe de vulnerabilidades y defender los plazos ante el comité.', whyEn: 'Prioritise a vulnerability report and defend the deadlines before the committee.' },
  ad: { id: 'm-directorio', name: 'El dominio de Hespéride', nameEn: 'The Hesperide domain', why: 'Convertir hallazgos de Active Directory en no conformidades de op.acc y un plan de tratamiento.', whyEn: 'Turn Active Directory findings into op.acc nonconformities and a treatment plan.' },
  baja: { id: 'm-baja', name: 'El exempleado', nameEn: 'The former employee', why: 'Gestión de identidades, bajas y doble factor.', whyEn: 'Identity lifecycle, leavers and MFA.' },
  despliegue: { id: 'm-despliegue', name: 'Viernes de despliegue', nameEn: 'Friday deployment', why: 'Gestión de cambios y parches sin romper producción.', whyEn: 'Change and patch management without breaking production.' },
};

const REMEDIATION_ARGOS: Record<string, Array<keyof typeof ARGOS_MACHINES>> = {
  log4shell: ['vulns', 'despliegue'], proxyshell: ['vulns', 'despliegue'], citrix_bleed: ['vulns', 'despliegue'], patch_cve: ['vulns', 'despliegue'],
  kerberoast: ['ad'], unconstrained_delegation: ['ad'], adcs_esc1: ['ad'], smb_signing: ['ad'], laps: ['ad'], asrep_roast: ['ad'], llmnr: ['ad'], print_spooler: ['ad'],
  weak_credentials: ['baja', 'ad'], identity_generic: ['baja', 'ad'],
  tls_hardening: ['vulns'], weak_config: ['vulns', 'despliegue'],
  web_injection: ['vulns', 'despliegue'], web_xss: ['vulns', 'despliegue'], web_hardening: ['vulns'], ad_hygiene: ['ad'],
};

export function argosFor(f: Pick<Finding, 'remediation' | 'kind'>): ArgosLink[] {
  const keys = REMEDIATION_ARGOS[f.remediation] ?? (f.kind === 'identidad' ? ['ad'] : ['vulns']);
  return keys.map((k) => ARGOS_MACHINES[k]);
}

export const argosUrl = (id: string) => `${ARGOS_WEB}#maquina/${encodeURIComponent(id)}`;
