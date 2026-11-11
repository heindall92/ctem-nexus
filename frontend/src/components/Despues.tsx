/* Pintado progresivo para proyectos grandes: lo secundario se monta en la tarea siguiente, cuando lo principal ya se
 * ve. Así ninguna vista bloquea la página de una vez (con 50.000 hallazgos, Movilización pasaba de 100 ms). Mientras,
 * un hueco de la altura aproximada evita que la página salte. Con proyectos pequeños no hace nada. */
import { useEffect, useState, type ReactNode } from 'react';

export function Despues({ si, alto, children }: { si: boolean; alto: number; children: ReactNode }) {
  const [listo, setListo] = useState(!si);
  useEffect(() => {
    if (listo) return;
    const t = setTimeout(() => setListo(true), 0);
    return () => clearTimeout(t);
  }, [listo]);
  if (listo) return <>{children}</>;
  return <div aria-hidden="true" data-despues="1" style={{ minHeight: alto }} />;
}
