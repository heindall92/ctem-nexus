/* Motor ATT&CK: tabla de técnicas Enterprise v14.1, inferencia desde hallazgos y exportación a Navigator. */
import type { Band, Finding } from './types';

// ────────────────────────── Táctica ──────────────────────────
export type TacticId =
  | 'initial-access' | 'execution' | 'persistence' | 'privilege-escalation'
  | 'defense-evasion' | 'credential-access' | 'discovery'
  | 'lateral-movement' | 'collection' | 'exfiltration' | 'impact';

export interface Tactic {
  id: TacticId;
  name: string;
  nameEs: string;
  taId: string; // TA0001…
}

export const TACTICS: Tactic[] = [
  { id: 'initial-access',        name: 'Initial Access',        nameEs: 'Acceso inicial',         taId: 'TA0001' },
  { id: 'execution',             name: 'Execution',             nameEs: 'Ejecución',              taId: 'TA0002' },
  { id: 'persistence',           name: 'Persistence',           nameEs: 'Persistencia',           taId: 'TA0003' },
  { id: 'privilege-escalation',  name: 'Privilege Escalation',  nameEs: 'Escalada de privilegios', taId: 'TA0004' },
  { id: 'defense-evasion',       name: 'Defense Evasion',       nameEs: 'Evasión de defensa',     taId: 'TA0005' },
  { id: 'credential-access',     name: 'Credential Access',     nameEs: 'Acceso a credenciales',  taId: 'TA0006' },
  { id: 'discovery',             name: 'Discovery',             nameEs: 'Descubrimiento',         taId: 'TA0007' },
  { id: 'lateral-movement',      name: 'Lateral Movement',      nameEs: 'Movimiento lateral',     taId: 'TA0008' },
  { id: 'collection',            name: 'Collection',            nameEs: 'Recolección',            taId: 'TA0009' },
  { id: 'exfiltration',          name: 'Exfiltration',          nameEs: 'Exfiltración',           taId: 'TA0010' },
  { id: 'impact',                name: 'Impact',                nameEs: 'Impacto',                taId: 'TA0040' },
];

// ────────────────────────── Técnicas ──────────────────────────
export interface AttackTechnique {
  id: string;      // "T1190"
  name: string;
  nameEs: string;
  tactic: TacticId;
}

export const TECHNIQUES: AttackTechnique[] = [
  // Initial Access
  { id: 'T1190',     name: 'Exploit Public-Facing Application', nameEs: 'Explotación de aplicación expuesta', tactic: 'initial-access' },
  { id: 'T1133',     name: 'External Remote Services',          nameEs: 'Servicios remotos externos',        tactic: 'initial-access' },
  { id: 'T1189',     name: 'Drive-by Compromise',               nameEs: 'Compromiso por navegación',         tactic: 'initial-access' },
  { id: 'T1566',     name: 'Phishing',                          nameEs: 'Phishing',                         tactic: 'initial-access' },
  { id: 'T1078',     name: 'Valid Accounts',                    nameEs: 'Cuentas válidas',                  tactic: 'initial-access' },
  { id: 'T1195',     name: 'Supply Chain Compromise',           nameEs: 'Compromiso de cadena de suministro', tactic: 'initial-access' },

  // Execution
  { id: 'T1059',     name: 'Command and Scripting Interpreter', nameEs: 'Intérprete de comandos',           tactic: 'execution' },
  { id: 'T1203',     name: 'Exploitation for Client Execution', nameEs: 'Explotación de cliente',          tactic: 'execution' },
  { id: 'T1072',     name: 'Software Deployment Tools',         nameEs: 'Herramientas de despliegue',       tactic: 'execution' },
  { id: 'T1059.007', name: 'JavaScript',                        nameEs: 'JavaScript (XSS/SSTI)',            tactic: 'execution' },

  // Persistence
  { id: 'T1505.003', name: 'Web Shell',                         nameEs: 'Shell web',                       tactic: 'persistence' },
  { id: 'T1543.003', name: 'Windows Service',                   nameEs: 'Servicio de Windows',             tactic: 'persistence' },
  { id: 'T1098',     name: 'Account Manipulation',              nameEs: 'Manipulación de cuentas',         tactic: 'persistence' },
  { id: 'T1197',     name: 'BITS Jobs',                         nameEs: 'Trabajos BITS',                   tactic: 'persistence' },
  { id: 'T1525',     name: 'Implant Internal Image',            nameEs: 'Imagen de contenedor maliciosa',  tactic: 'persistence' },

  // Privilege Escalation
  { id: 'T1068',     name: 'Exploitation for Privilege Escalation', nameEs: 'Explotación para escalar privilegios', tactic: 'privilege-escalation' },
  { id: 'T1134',     name: 'Access Token Manipulation',         nameEs: 'Manipulación de token de acceso', tactic: 'privilege-escalation' },
  { id: 'T1134.001', name: 'Token Impersonation/Theft',         nameEs: 'Suplantación de token',          tactic: 'privilege-escalation' },
  { id: 'T1548',     name: 'Abuse Elevation Control Mechanism', nameEs: 'Abuso de control de elevación',  tactic: 'privilege-escalation' },
  { id: 'T1611',     name: 'Escape to Host',                    nameEs: 'Escape de contenedor',           tactic: 'privilege-escalation' },

  // Defense Evasion
  { id: 'T1562',     name: 'Impair Defenses',                   nameEs: 'Degradar defensas',              tactic: 'defense-evasion' },
  { id: 'T1070',     name: 'Indicator Removal',                 nameEs: 'Borrado de indicadores',         tactic: 'defense-evasion' },
  { id: 'T1140',     name: 'Deobfuscate/Decode Files',          nameEs: 'Deofuscar ficheros',             tactic: 'defense-evasion' },
  { id: 'T1078.001', name: 'Default Accounts',                  nameEs: 'Cuentas por defecto',            tactic: 'defense-evasion' },
  { id: 'T1484.001', name: 'Group Policy Modification',         nameEs: 'Modificación de GPO',            tactic: 'defense-evasion' },

  // Credential Access
  { id: 'T1110',     name: 'Brute Force',                       nameEs: 'Fuerza bruta',                   tactic: 'credential-access' },
  { id: 'T1552',     name: 'Unsecured Credentials',             nameEs: 'Credenciales sin proteger',      tactic: 'credential-access' },
  { id: 'T1552.001', name: 'Credentials In Files',              nameEs: 'Credenciales en ficheros',       tactic: 'credential-access' },
  { id: 'T1555',     name: 'Credentials from Password Stores',  nameEs: 'Credenciales de gestores',       tactic: 'credential-access' },
  { id: 'T1558',     name: 'Steal or Forge Kerberos Tickets',   nameEs: 'Forja de tickets Kerberos',      tactic: 'credential-access' },
  { id: 'T1558.003', name: 'Kerberoasting',                     nameEs: 'Kerberoasting',                  tactic: 'credential-access' },
  { id: 'T1558.004', name: 'AS-REP Roasting',                   nameEs: 'AS-REP Roasting',                tactic: 'credential-access' },
  { id: 'T1040',     name: 'Network Sniffing',                   nameEs: 'Captura de red',                 tactic: 'credential-access' },
  { id: 'T1557',     name: 'Adversary-in-the-Middle',           nameEs: 'Adversario en medio',            tactic: 'credential-access' },
  { id: 'T1557.001', name: 'LLMNR/NBT-NS Poisoning',            nameEs: 'Envenenamiento LLMNR/NBT-NS',    tactic: 'credential-access' },
  { id: 'T1649',     name: 'Steal or Forge Authentication Certificates', nameEs: 'Robo o forja de certificados (AD CS)', tactic: 'credential-access' },
  { id: 'T1003.006', name: 'DCSync',                            nameEs: 'DCSync',                         tactic: 'credential-access' },

  // Discovery
  { id: 'T1046',     name: 'Network Service Discovery',         nameEs: 'Descubrimiento de servicios',    tactic: 'discovery' },
  { id: 'T1087.002', name: 'Domain Account',                    nameEs: 'Cuentas de dominio',             tactic: 'discovery' },
  { id: 'T1069.002', name: 'Domain Groups',                     nameEs: 'Grupos de dominio',              tactic: 'discovery' },
  { id: 'T1083',     name: 'File and Directory Discovery',       nameEs: 'Descubrimiento de ficheros',     tactic: 'discovery' },
  { id: 'T1135',     name: 'Network Share Discovery',           nameEs: 'Descubrimiento de recursos SMB', tactic: 'discovery' },

  // Lateral Movement
  { id: 'T1210',     name: 'Exploitation of Remote Services',   nameEs: 'Explotación de servicios remotos', tactic: 'lateral-movement' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol',           nameEs: 'Protocolo RDP',                  tactic: 'lateral-movement' },
  { id: 'T1021.002', name: 'SMB/Windows Admin Shares',          nameEs: 'Compartidos SMB',                tactic: 'lateral-movement' },
  { id: 'T1021.004', name: 'SSH',                               nameEs: 'SSH',                            tactic: 'lateral-movement' },
  { id: 'T1550.002', name: 'Pass the Hash',                     nameEs: 'Pass the Hash',                  tactic: 'lateral-movement' },

  // Collection
  { id: 'T1005',     name: 'Data from Local System',            nameEs: 'Datos del sistema local',        tactic: 'collection' },
  { id: 'T1213',     name: 'Data from Information Repositories', nameEs: 'Repositorios de información',   tactic: 'collection' },

  // Exfiltration
  { id: 'T1048',     name: 'Exfiltration Over Alternative Protocol', nameEs: 'Exfiltración por protocolo alternativo', tactic: 'exfiltration' },

  // Impact
  { id: 'T1486',     name: 'Data Encrypted for Impact',         nameEs: 'Cifrado de datos (ransomware)',  tactic: 'impact' },
  { id: 'T1489',     name: 'Service Stop',                      nameEs: 'Parada de servicios',           tactic: 'impact' },
  { id: 'T1499',     name: 'Endpoint Denial of Service',        nameEs: 'DoS de endpoint',               tactic: 'impact' },
];

const TECH_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]));

// ────────────────────────── Inferencia ──────────────────────────

// Claves reales de remediation.ts (Finding.remediation) → técnicas ATT&CK que la corrección cierra.
const REMEDIATION_TECHNIQUES: Record<string, string[]> = {
  log4shell:                ['T1190', 'T1059'],
  proxyshell:               ['T1190', 'T1505.003'],
  citrix_bleed:             ['T1190', 'T1133'],
  kerberoast:               ['T1558.003'],
  asrep_roast:              ['T1558.004'],
  unconstrained_delegation: ['T1134.001', 'T1558'],
  adcs_esc1:                ['T1649', 'T1068', 'T1558'],
  smb_signing:              ['T1557.001', 'T1021.002'],
  llmnr:                    ['T1557.001', 'T1040'],
  laps:                     ['T1552', 'T1550.002'],
  weak_credentials:         ['T1078.001', 'T1110'],
  print_spooler:            ['T1068', 'T1543.003'],
  tls_hardening:            ['T1040', 'T1557'],
  identity_generic:         ['T1078', 'T1552'],
  web_injection:            ['T1190', 'T1059'],
  web_xss:                  ['T1059.007', 'T1189'],
  // web_hardening y ad_hygiene son genéricas: deciden el título o el tipo.
  // patch_cve y weak_config son genéricas: deciden el título o el tipo.
};

// Último recurso por tipo, solo si ni la guía ni el título dicen nada. La configuración genérica no se adivina.
const KIND_TECHNIQUES: Record<string, string[]> = {
  cve:           ['T1190'],
  configuracion: [],
  identidad:     ['T1078'],
};

// Patrones de título (inglés de los escáneres y español del analista). Se aplican todos los que encajen.
const TITLE_PATTERNS: Array<{ re: RegExp; ids: string[] }> = [
  { re: /kerberoast/i,                                        ids: ['T1558.003'] },
  { re: /as-?rep.?roast|preautentica|pre-?auth/i,              ids: ['T1558.004'] },
  { re: /pass.the.hash|\bpth\b/i,                             ids: ['T1550.002'] },
  { re: /ldap.{0,12}(anon|an[oó]nim)|anonymous.?ldap/i,       ids: ['T1087.002', 'T1069.002'] },
  { re: /smb.?sign|firma smb/i,                               ids: ['T1557.001', 'T1021.002'] },
  { re: /\bllmnr\b|nbt-?ns|\bmdns\b/i,                        ids: ['T1557.001', 'T1040'] },
  { re: /\bntlm\b.{0,20}relay|relay.{0,20}\bntlm\b/i,         ids: ['T1557'] },
  { re: /null.?session|null.?share|sesi[oó]n nula/i,          ids: ['T1135', 'T1087.002'] },
  { re: /\brce\b|remote code exec|ejecuci[oó]n remota|command inject/i, ids: ['T1059'] },
  { re: /deseriali[sz]/i,                                     ids: ['T1059'] },
  { re: /sql.?inject|\bsqli\b|inyecci[oó]n sql/i,             ids: ['T1190'] },
  { re: /\bxss\b|cross.site.script/i,                         ids: ['T1059.007', 'T1189'] },
  { re: /\bssrf\b|\bxxe\b/i,                                  ids: ['T1190'] },
  { re: /\bssti\b|server.side.template/i,                     ids: ['T1059'] },
  { re: /path.traversal|directory.traversal|recorrido de directorios/i, ids: ['T1083'] },
  { re: /\.git\b|\.env\b|backup file|fichero de copia/i,      ids: ['T1552.001', 'T1213'] },
  { re: /secret|secreto|api.?key|clave de api|access.?token|credential.{0,10}(in|en) (file|fichero|code|c[oó]digo)|hard-?coded/i, ids: ['T1552.001'] },
  { re: /phishing/i,                                          ids: ['T1566'] },
  { re: /\boffice\b|\bmacro|documento malicioso|malicious document/i, ids: ['T1203', 'T1566'] },
  { re: /brute.?force|fuerza bruta|password.?spray/i,         ids: ['T1110'] },
  { re: /default.{0,12}(credential|password|account)|credenciales? por defecto|contrase[nñ]a (d[eé]bil|por defecto)|weak password/i, ids: ['T1078.001', 'T1110'] },
  { re: /reutiliza|password reuse|\blaps\b/i,                 ids: ['T1550.002', 'T1078'] },
  { re: /privilege escalat|escalada de privilegios/i,         ids: ['T1068'] },
  { re: /web.?shell/i,                                        ids: ['T1505.003'] },
  { re: /delegaci[oó]n|delegation/i,                          ids: ['T1134.001'] },
  { re: /\badcs\b|certificate template|plantilla de certificado|\besc\d{1,2}\b/i, ids: ['T1649', 'T1068', 'T1558'] },
  { re: /dcsync|replicating directory changes|replicaci[oó]n de directorio/i, ids: ['T1003.006'] },
  { re: /\bgpo\b|group policy|directiva de grupo/i,          ids: ['T1484.001'] },
  { re: /\brdp\b|remote desktop|escritorio remoto/i,          ids: ['T1133', 'T1021.001'] },
  { re: /\bssh\b/i,                                           ids: ['T1021.004'] },
  { re: /\bvpn\b|gateway|netscaler|citrix|fortigate|pulse secure|globalprotect/i, ids: ['T1133'] },
  { re: /ssl\s?v?[23]\b|ssl version [23]|tls\s?(v|version\s)?1\.[01]\b|cifrados? d[eé]bil|weak cipher/i, ids: ['T1040', 'T1557'] },
  { re: /log4j|log4shell/i,                                   ids: ['T1190', 'T1059'] },
  { re: /proxyshell|proxylogon/i,                             ids: ['T1190', 'T1505.003'] },
  { re: /eternalblue|ms17-010/i,                              ids: ['T1210'] },
  { re: /print.?nightmare|print spooler|cola de impresi[oó]n/i, ids: ['T1068', 'T1543.003'] },
  { re: /container escape|escape de contenedor|privileged container|contenedor privilegiado/i, ids: ['T1611'] },
  { re: /run(s|ning)? as root|se ejecuta como root|user root|usuario root/i, ids: ['T1611', 'T1068'] },
  { re: /supply.chain|cadena de suministro|dependency confusion|typosquat/i, ids: ['T1195'] },
  { re: /copias? de seguridad|backups?\b/i,                   ids: ['T1005', 'T1486'] },
  { re: /denial of service|denegaci[oó]n de servicio|\bdos\b/i, ids: ['T1499'] },
];

/**
 * Infiere técnicas ATT&CK a partir del título, CVE, tipo y guía de remediación.
 * Devuelve un array sin duplicados de IDs válidos, limitado a 6.
 */
export function inferAttack(title: string, cve: string | null, kind: string, remediation: string): string[] {
  const seen = new Set<string>();
  const add = (ids: string[]) => { for (const id of ids) if (TECH_BY_ID.has(id)) seen.add(id); };

  // 1. Guía de remediación específica → técnicas directas
  if (REMEDIATION_TECHNIQUES[remediation]) add(REMEDIATION_TECHNIQUES[remediation]);

  // 2. Patrones en el título
  for (const { re, ids } of TITLE_PATTERNS) if (re.test(title)) add(ids);

  // 3. Con CVE y sin otra pista: vulnerabilidad explotable en un servicio
  if (seen.size === 0 && cve) add(['T1190']);

  // 4. Último recurso: por tipo de hallazgo
  if (seen.size === 0 && KIND_TECHNIQUES[kind]) add(KIND_TECHNIQUES[kind]);

  return [...seen].slice(0, 6);
}

// ────────────────────────── Exposición por técnica ──────────────────────────

/** Un hallazgo cuenta mientras deja la técnica al alcance del atacante: abierto, validado o con el riesgo aceptado. */
export const isLive = (f: Pick<Finding, 'status'>) => f.status !== 'mitigado' && f.status !== 'no_explotable';

export interface TechniqueCount {
  technique: AttackTechnique;
  count: number;       // hallazgos vivos que habilitan la técnica
  findingIds: string[];
}

/** Técnicas del hallazgo: las que fijó el analista o, si no hay, las inferidas (siempre al día con el motor). */
export function techniquesOf(f: Pick<Finding, 'attack' | 'title' | 'cve' | 'kind' | 'remediation'>): string[] {
  const manual = (f.attack ?? []).filter((id) => TECH_BY_ID.has(id));
  return manual.length ? manual : inferAttack(f.title, f.cve ?? null, f.kind, f.remediation);
}

export const techniqueById = (id: string) => TECH_BY_ID.get(id);

/** Técnica → hallazgos vivos que la habilitan. */
export function buildCoverage(findings: Finding[]): Map<string, TechniqueCount> {
  const map = new Map<string, TechniqueCount>();
  for (const f of findings) {
    if (!isLive(f)) continue;
    for (const id of techniquesOf(f)) {
      const tech = TECH_BY_ID.get(id);
      if (!tech) continue;
      const entry = map.get(id) ?? { technique: tech, count: 0, findingIds: [] };
      entry.count++;
      if (!entry.findingIds.includes(f.id)) entry.findingIds.push(f.id);
      map.set(id, entry);
    }
  }
  return map;
}

const BAND_RANK: Record<Band, number> = { critica: 4, alta: 3, media: 2, baja: 1 };

export interface TechniqueExposure extends TechniqueCount {
  /** Banda más grave entre los hallazgos vivos que habilitan la técnica. */
  band: Band;
  /** Puntuación más alta (0–100). */
  maxScore: number;
}

/** Exposición por técnica con la banda y la puntuación de priorización, ordenada de más a menos grave. */
export function techniqueExposure(findings: Finding[], scored: Array<{ id: string; band: Band; score: number }>): TechniqueExposure[] {
  const sc = new Map(scored.map((x) => [x.id, x]));
  const out: TechniqueExposure[] = [];
  for (const e of buildCoverage(findings).values()) {
    let band: Band = 'baja';
    let maxScore = 0;
    for (const id of e.findingIds) {
      const x = sc.get(id);
      if (!x) continue;
      if (BAND_RANK[x.band] > BAND_RANK[band]) band = x.band;
      maxScore = Math.max(maxScore, x.score);
    }
    out.push({ ...e, band, maxScore });
  }
  return out.sort((a, b) => BAND_RANK[b.band] - BAND_RANK[a.band] || b.maxScore - a.maxScore || a.technique.id.localeCompare(b.technique.id));
}

/** Enlace oficial de la técnica (las subtécnicas usan /T1558/003/). */
export const techniqueUrl = (id: string) => `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`;

/** Por táctica: técnicas con exposición / técnicas del catálogo. */
export function tacticSummary(coverage: Map<string, TechniqueCount>): Map<TacticId, { covered: number; total: number }> {
  const total = new Map<TacticId, number>();
  const covered = new Map<TacticId, number>();
  for (const t of TECHNIQUES) { total.set(t.tactic, (total.get(t.tactic) ?? 0) + 1); }
  for (const { technique } of coverage.values()) { covered.set(technique.tactic, (covered.get(technique.tactic) ?? 0) + 1); }
  const out = new Map<TacticId, { covered: number; total: number }>();
  for (const tac of TACTICS) out.set(tac.id, { covered: covered.get(tac.id) ?? 0, total: total.get(tac.id) ?? 0 });
  return out;
}

// ────────────────────────── Exportación ATT&CK Navigator ──────────────────────────

export interface NavigatorTechEntry {
  techniqueID: string;
  score: number;
  comment: string;
  enabled: boolean;
  showSubtechniques: boolean;
}

export interface NavigatorLayer {
  name: string;
  versions: { attack: string; navigator: string; layer: string };
  domain: 'enterprise-attack';
  description: string;
  sorting: number;
  layout: { layout: string; showName: boolean; showID: boolean };
  hideDisabled: boolean;
  techniques: NavigatorTechEntry[];
  gradient: { colors: string[]; minValue: number; maxValue: number };
  legendItems: Array<{ color: string; label: string }>;
  metadata: Array<{ name: string; value: string }>;
}

export const ATTACK_VERSION = '14';

/**
 * Capa de ATT&CK Navigator con la exposición viva: puntuación = hallazgos que habilitan la técnica (tope 3).
 * Sin «tactic» para que Navigator marque la técnica en todas las tácticas donde aparece.
 */
export function toNavigatorLayer(
  findings: Finding[],
  opts: { name?: string; today?: string; lang?: 'es' | 'en' } = {},
): NavigatorLayer {
  const es = (opts.lang ?? 'es') === 'es';
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const byId = new Map(findings.map((f) => [f.id, f]));
  const techniques: NavigatorTechEntry[] = [...buildCoverage(findings).values()]
    .sort((a, b) => a.technique.id.localeCompare(b.technique.id))
    .map((e) => {
      const refs = e.findingIds.map((id) => { const f = byId.get(id)!; return f.cve ? `${id} (${f.cve})` : id; });
      return {
        techniqueID: e.technique.id,
        score: Math.min(e.count, 3),
        comment: `${e.count} ${es ? (e.count === 1 ? 'hallazgo vivo' : 'hallazgos vivos') : (e.count === 1 ? 'live finding' : 'live findings')}: ${refs.join(', ')}`.slice(0, 500),
        enabled: true,
        showSubtechniques: true,
      };
    });
  return {
    name: (opts.name ?? (es ? 'CTEM-Nexus · Exposición por técnica' : 'CTEM-Nexus · Exposure by technique')).slice(0, 120),
    versions: { attack: ATTACK_VERSION, navigator: '4.9.1', layer: '4.5' },
    domain: 'enterprise-attack',
    description: es
      ? `Técnicas que los hallazgos abiertos, validados o aceptados dejan al alcance de un atacante (${today}). Puntuación: hallazgos por técnica, tope 3.`
      : `Techniques that open, validated or accepted findings leave within an attacker's reach (${today}). Score: findings per technique, capped at 3.`,
    sorting: 3,
    layout: { layout: 'side', showName: true, showID: true },
    hideDisabled: false,
    techniques,
    gradient: { colors: ['#fff4d6', '#f59e0b', '#c2410c'], minValue: 1, maxValue: 3 },
    legendItems: [
      { color: '#fff4d6', label: es ? '1 hallazgo' : '1 finding' },
      { color: '#f59e0b', label: es ? '2 hallazgos' : '2 findings' },
      { color: '#c2410c', label: es ? '3 o más' : '3 or more' },
    ],
    metadata: [{ name: 'generator', value: 'CTEM-Nexus' }, { name: 'date', value: today }],
  };
}
