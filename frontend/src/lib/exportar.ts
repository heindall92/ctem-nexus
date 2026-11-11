/* Exportar el proyecto sin congelar la página. Con pocos hallazgos, el JSON de siempre (con sangría, legible). Con
 * muchos, compacto y por partes: cada trozo de hallazgos se convierte en una tarea corta y en su propio Blob, y el
 * fichero final los une sin copiar (con 50.000 hallazgos, hacerlo de una vez bloqueaba medio segundo). */
import type { Project } from '../engine/io';
import { downloadBlob, stamp } from './download';

export const UMBRAL_EXPORTAR = 2000;
const TROZO = 2000;
const MIME = 'application/json';
const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

export async function proyectoComoBlob(p: Project): Promise<Blob> {
  if (p.findings.length <= UMBRAL_EXPORTAR) return new Blob([JSON.stringify(p, null, 2)], { type: MIME });
  // El resto del proyecto, con una marca donde van los hallazgos (así se conserva el orden de las claves).
  const marca = '\u0000hallazgos\u0000';
  const trozos = JSON.stringify({ ...p, findings: marca }).split(JSON.stringify(marca));
  if (trozos.length !== 2) return new Blob([JSON.stringify(p)], { type: MIME });   // la marca aparece en un texto: de una vez
  const [antes, despues] = trozos;
  const partes: BlobPart[] = [antes, '['];
  for (let i = 0; i < p.findings.length; i += TROZO) {
    if (i) partes.push(',');
    partes.push(new Blob([p.findings.slice(i, i + TROZO).map((f) => JSON.stringify(f)).join(',')]));
    await pausa();
  }
  partes.push(']', despues);
  return new Blob(partes, { type: MIME });
}

/** Descarga el proyecto como ctem-nexus-AAAA-MM-DD.json. */
export async function exportarProyecto(p: Project): Promise<void> {
  downloadBlob(`ctem-nexus-${stamp()}.json`, await proyectoComoBlob(p));
}
