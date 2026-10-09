/* CTEM-Nexus · modelo de datos compartido por la interfaz, el motor y la API (backend/app/models.py). */

export type AssetType =
  | 'servidor'
  | 'estacion'
  | 'aplicacion_web'
  | 'base_datos'
  | 'controlador_dominio'
  | 'pki'
  | 'perimetro'
  | 'nube'
  | 'identidad';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  ip: string; // IP o CIDR
  owner: string;
  criticality: 1 | 2 | 3 | 4 | 5;
  internetExposed: boolean;
  tags: string[];
}

export interface NetworkRange {
  id: string;
  cidr: string;
  label: string;
  inScope: boolean;
}

export type FindingKind = 'cve' | 'configuracion' | 'identidad';
export type FindingStatus = 'abierto' | 'validado' | 'no_explotable' | 'mitigado' | 'aceptado';

/** Origen de un hallazgo (importador o alta manual). */
export type FindingSource = 'manual' | 'csv' | 'nmap' | 'bloodhound' | 'nessus' | 'openvas' | 'nuclei' | 'trivy' | 'sarif' | 'adauditor' | 'zap' | 'burp' | 'pingcastle' | 'certipy';

/** Aceptación formal del riesgo: el hallazgo sale de los abiertos hasta que caduca (y vuelve a abierto). */
export interface RiskException {
  owner: string;
  reason: string;
  /** Fecha de caducidad (AAAA-MM-DD). */
  expires: string;
  compensating: string;
  /** Fecha de aprobación (AAAA-MM-DD). */
  approvedAt: string;
  /** Estado al que vuelve al caducar o revocarse. */
  previous: 'abierto' | 'validado';
}

export interface Finding {
  id: string;
  title: string;
  kind: FindingKind;
  cve?: string | null;
  cvss: number; // 0–10 (en hallazgos sin CVE, severidad equivalente estimada)
  epss?: number | null; // 0–1
  kev: boolean;
  exploitPublic: boolean;
  assetId: string;
  status: FindingStatus;
  remediation: string; // clave de la guía de remediación
  description?: string;
  detectedAt?: string; // ISO 8601 (fecha)
  resolvedAt?: string | null;
  /** Movimiento que habilita el hallazgo en la ruta de ataque. */
  technique?: string | null;
  /** Nodo de origen de la arista (por defecto, el activo afectado). */
  edgeFrom?: string | null;
  /** Nodos a los que da acceso. */
  leadsTo?: string[];
  /** Otros CVE del mismo hallazgo (p. ej. un parche acumulativo de Nessus). */
  relatedCves?: string[];
  /** Herramientas que lo han detectado (deduplicación entre fuentes). */
  sources?: FindingSource[];
  /** Evidencias fusionadas (puertos, rutas, paquetes), en texto. */
  evidence?: string;
  /** Técnicas MITRE ATT&CK explícitas (Txxxx o Txxxx.yyy). Si no hay, se infieren. */
  attack?: string[];
  /** Aceptación del riesgo vigente o la última caducada. */
  exception?: RiskException | null;
  /** Evidencia de la validación ofensiva (retest.ts). */
  validation?: import('./retest').Validation | null;
  /** Verificación de la corrección de un hallazgo mitigado (retest.ts). */
  retest?: import('./retest').Retest | null;
}

export interface ManualEdge {
  id: string;
  from: string;
  to: string;
  technique: string;
}

export type ProfileId = 'defecto' | 'ot' | 'banca';

/** Política de plazos de corrección por banda (la del ENS sale de la categoría del sistema). */
export type SlaPolicy = 'estandar' | 'ens_basica' | 'ens_media' | 'ens_alta';

export interface EngineInput {
  assets: Asset[];
  findings: Finding[];
  edges: ManualEdge[];
  /** Perfil de ponderación (por defecto, «defecto»). */
  profile?: ProfileId;
  /** Política de plazos (por defecto, «estandar»). */
  slaPolicy?: SlaPolicy;
}

export type Band = 'critica' | 'alta' | 'media' | 'baja';

export interface Factor {
  key: 'severidad' | 'explotabilidad' | 'criticidad' | 'exposicion' | 'proximidad' | 'validacion';
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface ScoredFinding {
  id: string;
  score: number;
  band: Band;
  factors: Factor[];
  explanation: string;
  hopsToCrown: number | null;
  onAttackPath: boolean;
  slaDays: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: AssetType | 'internet';
  criticality: number;
  entry: boolean;
  crown: boolean;
}

export interface GraphEdge {
  id: string; // "from->to"
  from: string;
  to: string;
  techniques: string[];
  findingIds: string[];
  manual: boolean;
}

export interface ChokePoint {
  id: string;
  kind: 'nodo' | 'arista';
  label: string;
  paths: number;
  share: number; // 0–1
}

export interface AttackPath {
  nodes: string[];
  target: string;
  length: number;
}

export interface GraphAnalysis {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: AttackPath[];
  truncated: boolean;
  chokePoints: ChokePoint[];
  nodePathCount: Record<string, number>;
  edgePathCount: Record<string, number>;
}

export interface Summary {
  exposureIndex: number;
  openFindings: number;
  byBand: Record<Band, number>;
  kevOpen: number;
  assetsAtRisk: number;
  chokePoints: number;
  attackPaths: number;
  mttrDays: number | null;
  /** Hallazgos con el riesgo aceptado (fuera de los abiertos, pero sus rutas siguen en el grafo). */
  accepted: number;
}

export interface EngineResult {
  engine: 'ts' | 'python';
  version: string;
  profile: ProfileId;
  slaPolicy: SlaPolicy;
  scored: ScoredFinding[];
  graph: GraphAnalysis;
  summary: Summary;
}
