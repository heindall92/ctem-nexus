/* Constantes del motor. Deben coincidir EXACTAMENTE con backend/app/engine/prioritization.py
 * (lo comprueban frontend/src/engine/engine.test.ts y backend/tests/test_parity.py). */
import type { Band, ProfileId } from './types';

export const ENGINE_VERSION = '1.1.0';

export interface Weights { severidad: number; explotabilidad: number; criticidad: number; exposicion: number; proximidad: number }

/** Perfiles de ponderación. Cada uno suma 100 (lo comprueban las pruebas de los dos motores).
 * - defecto: equilibrio general entre severidad, explotación y negocio.
 * - ot: entornos industriales; pesa más la criticidad del proceso y la cercanía a la zona de control que el CVSS.
 * - banca: amenaza dirigida (DORA, TLPT): pesa más la explotación real y la exposición a Internet. */
export const PROFILES: Record<ProfileId, Weights> = {
  defecto: { severidad: 30, explotabilidad: 25, criticidad: 20, exposicion: 10, proximidad: 15 },
  ot: { severidad: 20, explotabilidad: 20, criticidad: 30, exposicion: 10, proximidad: 20 },
  banca: { severidad: 25, explotabilidad: 30, criticidad: 20, exposicion: 15, proximidad: 10 },
};
export const PROFILE_IDS: ProfileId[] = ['defecto', 'ot', 'banca'];
export const DEFAULT_PROFILE: ProfileId = 'defecto';
export const WEIGHTS = PROFILES.defecto;

/** Explotabilidad: KEV = 1; exploit público = 0,6; si no, EPSS. Se toma el máximo. */
export const EXPLOIT_PUBLIC_FLOOR = 0.6;
/** Proximidad: 1 − saltos / PROXIMITY_HOPS (0 a 4 o más saltos de una joya de la corona). */
export const PROXIMITY_HOPS = 4;
/** Hallazgo confirmado (validado) en la fase de Validación. */
export const VALIDATED_BONUS = 5;
/** Hallazgo validado como no explotable: la puntuación se multiplica por este factor. */
export const NOT_EXPLOITABLE_FACTOR = 0.25;

export const BAND_THRESHOLDS: Array<[Band, number]> = [
  ['critica', 80],
  ['alta', 60],
  ['media', 40],
  ['baja', 0],
];

export const SLA_DAYS: Record<Band, number> = { critica: 3, alta: 14, media: 30, baja: 90 };

export const BAND_LABEL: Record<Band, string> = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };

/** Rutas de ataque: profundidad máxima y tope de rutas enumeradas. */
export const MAX_PATH_DEPTH = 8;
export const MAX_PATHS = 2000;
/** Un nodo o arista es punto de estrangulamiento si aparece en ≥ CHOKE_SHARE de las rutas (y en ≥ 2). */
export const CHOKE_SHARE = 0.4;
export const CHOKE_MIN_PATHS = 2;

export const INTERNET_ID = 'internet';
