/* Listas largas sin congelar la página: solo se pintan las filas visibles (y un margen), y el resto se sustituye por
 * un hueco de su altura. Con 5.000 hallazgos, la tabla de Priorización pasaba de 171.000 nodos y 1,8 s por entrar.
 *
 * Por debajo de UMBRAL filas no hace nada: la demo y las listas cortas se pintan enteras, como siempre (búsqueda del
 * navegador, impresión y lectores de pantalla las ven completas). Por encima, la tabla declara aria-rowcount y cada
 * fila su aria-rowindex, para que un lector de pantalla sepa dónde está. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export const UMBRAL = 150;
const MARGEN = 12;

export interface Ventana { activa: boolean; inicio: number; fin: number; arriba: number; abajo: number }

/**
 * @param total     filas de la lista
 * @param altoBase  altura estimada de una fila (px); se corrige con la media de las filas pintadas
 * @param contenedor el elemento que hace scroll (la tabla con su barra, o #contenido para la página)
 * @param ancla     el elemento donde empiezan las filas (tbody o ul)
 */
export function useVentana(total: number, altoBase: number, contenedor: RefObject<HTMLElement | null> | (() => HTMLElement | null), ancla: RefObject<HTMLElement | null>): Ventana {
  const activa = total > UMBRAL;
  const [alto, setAlto] = useState(altoBase);
  const [rango, setRango] = useState<[number, number]>([0, Math.min(total, 40)]);
  const cont = useCallback(() => (typeof contenedor === 'function' ? contenedor() : contenedor.current), [contenedor]);

  const calcular = useCallback(() => {
    const c = cont();
    const a = ancla.current;
    if (!activa || !c || !a) return;
    // Si la lista es su propio contenedor de scroll, empieza en 0.
    const arribaAncla = a === c ? 0 : a.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
    const desde = c.scrollTop - arribaAncla;
    const inicio = Math.max(0, Math.min(total - 1, Math.floor(desde / alto) - MARGEN));
    const fin = Math.min(total, Math.max(inicio + 1, Math.ceil((desde + c.clientHeight) / alto) + MARGEN));
    setRango((r) => (r[0] === inicio && r[1] === fin ? r : [inicio, fin]));
  }, [activa, alto, ancla, cont, total]);

  useEffect(() => {
    const c = cont();
    if (!activa || !c) return;
    let raf = 0;
    const alMover = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(calcular); };
    c.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    calcular();
    return () => { cancelAnimationFrame(raf); c.removeEventListener('scroll', alMover); window.removeEventListener('resize', alMover); };
  }, [activa, calcular, cont]);

  // La altura real de las filas (las tarjetas de móvil varían): media de las primeras pintadas, sin contar los huecos.
  // Se mide UNA vez: si se volviera a medir con cada ventana, filas de alturas distintas darían medias distintas, la
  // ventana cambiaría y la media otra vez, sin parar.
  const medido = useRef(false);
  useLayoutEffect(() => {
    const a = ancla.current;
    if (!activa || !a || medido.current) return;
    const filas = [...a.children].filter((x) => !(x as HTMLElement).dataset.hueco) as HTMLElement[];
    if (!filas.length) return;
    const media = filas.reduce((s, f) => s + f.offsetHeight, 0) / filas.length;
    medido.current = true;
    if (media > 0 && Math.abs(media - alto) > 1) setAlto(media);
  });

  // Si la lista cambia (filtro, importación), se vuelve a calcular el rango.
  useEffect(() => { calcular(); }, [total, calcular]);

  if (!activa) return { activa: false, inicio: 0, fin: total, arriba: 0, abajo: 0 };
  const [inicio, finBruto] = rango;
  const fin = Math.min(total, finBruto);
  return { activa: true, inicio: Math.min(inicio, fin), fin, arriba: Math.min(inicio, fin) * alto, abajo: Math.max(0, total - fin) * alto };
}

/** ¿Se cumple la consulta de medios? Para pintar solo la tabla o solo las tarjetas, no las dos ocultando una. */
export function useMedia(consulta: string): boolean {
  const leer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(consulta).matches;
  const [si, setSi] = useState(leer);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(consulta);
    const cambio = () => setSi(m.matches);
    m.addEventListener('change', cambio);
    cambio();
    return () => m.removeEventListener('change', cambio);
  }, [consulta]);
  return si;
}
