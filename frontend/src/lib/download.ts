/* Descargas locales (Blob + enlace temporal): no sale nada del equipo. */
export function download(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const bom = mime.startsWith('text/csv') ? '\uFEFF' : '';
  const url = URL.createObjectURL(new Blob([bom + content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFile(file: File, maxBytes = 10 * 1024 * 1024): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error(`El archivo supera ${Math.round(maxBytes / 1048576)} MB.`));
  return file.text();
}

export const stamp = () => new Date().toISOString().slice(0, 10);
