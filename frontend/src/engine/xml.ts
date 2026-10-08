/* Analizador XML mínimo y seguro, igual en el navegador y en Node (sin DOM ni dependencias).
 *
 * - Rechaza DTD internas o externas y declaraciones de entidades (XXE, «billion laughs») antes de analizar.
 * - Solo resuelve las cinco entidades predefinidas y las referencias numéricas; nunca carga nada externo.
 * - Limita tamaño y número de elementos para que un fichero malicioso no bloquee la pestaña. */

export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

export const MAX_XML_BYTES = 40_000_000;
export const MAX_XML_NODES = 1_000_000;

/** Lanza si el XML declara entidades o una DTD con subconjunto, SYSTEM o PUBLIC. */
export function assertSafeXmlText(xml: string, max = MAX_XML_BYTES): void {
  if (xml.length > max) throw new Error(`El archivo supera el máximo de ${Math.round(max / 1_000_000)} MB.`);
  if (/<!ENTITY/i.test(xml) || /<!DOCTYPE[^>]*(\[|SYSTEM|PUBLIC)/i.test(xml)) {
    throw new Error('El XML declara entidades o una DTD: se rechaza por seguridad.');
  }
}

const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  if (!s.includes('&')) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

const local = (name: string) => {
  const i = name.indexOf(':');
  return (i >= 0 ? name.slice(i + 1) : name).toLowerCase();
};

const ATTR_RE = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

/** Analiza el documento y devuelve un nodo raíz virtual («#document») con los elementos de primer nivel. */
export function parseXml(xml: string): XNode {
  assertSafeXmlText(xml);
  const root: XNode = { name: '#document', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  let count = 0;
  let i = 0;
  const n = xml.length;
  while (i < n) {
    const lt = xml.indexOf('<', i);
    const textEnd = lt === -1 ? n : lt;
    if (textEnd > i) {
      const raw = xml.slice(i, textEnd);
      if (raw.trim()) stack[stack.length - 1].text += decodeEntities(raw);
    }
    if (lt === -1) break;
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9);
      stack[stack.length - 1].text += xml.slice(lt + 9, end === -1 ? n : end);
      i = end === -1 ? n : end + 3;
    } else if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt + 2);
      i = end === -1 ? n : end + 2;
    } else if (xml.startsWith('<!', lt)) {
      const end = xml.indexOf('>', lt + 2);
      i = end === -1 ? n : end + 1;
    } else if (xml[lt + 1] === '/') {
      const end = xml.indexOf('>', lt + 2);
      const name = local(xml.slice(lt + 2, end === -1 ? n : end).trim());
      // Cierra hasta el elemento abierto con ese nombre (tolera etiquetas mal anidadas sin romperse).
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) { stack.length = k; break; }
      }
      i = end === -1 ? n : end + 1;
    } else {
      // Etiqueta de apertura: busca el «>» que no esté dentro de comillas.
      let j = lt + 1;
      let q: string | null = null;
      while (j < n) {
        const c = xml[j];
        if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break;
        j++;
      }
      const body = xml.slice(lt + 1, j);
      const selfClosing = body.endsWith('/');
      const inner = selfClosing ? body.slice(0, -1) : body;
      const m = /^[^\s/>]+/.exec(inner);
      if (m) {
        if (++count > MAX_XML_NODES) throw new Error('El XML tiene demasiados elementos.');
        const attrs: Record<string, string> = Object.create(null);
        ATTR_RE.lastIndex = 0;
        let a: RegExpExecArray | null;
        const rest = inner.slice(m[0].length);
        while ((a = ATTR_RE.exec(rest))) attrs[local(a[1])] = decodeEntities(a[3] ?? a[4] ?? '');
        const node: XNode = { name: local(m[0]), attrs, children: [], text: '' };
        stack[stack.length - 1].children.push(node);
        if (!selfClosing) stack.push(node);
      }
      i = j + 1;
    }
  }
  return root;
}

/* ───────────── Consultas ───────────── */

export const child = (el: XNode | undefined, name: string): XNode | undefined => el?.children.find((c) => c.name === name);
export const childrenOf = (el: XNode | undefined, name: string): XNode[] => (el ? el.children.filter((c) => c.name === name) : []);
export const textOf = (el: XNode | undefined, name?: string): string => ((name ? child(el, name) : el)?.text ?? '').trim();

/** Todos los descendientes con ese nombre (recorrido en profundidad, sin recursión para no desbordar la pila). */
export function descendants(el: XNode, name: string): XNode[] {
  const out: XNode[] = [];
  const stack: XNode[] = [...el.children].reverse();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.name === name) out.push(cur);
    for (let k = cur.children.length - 1; k >= 0; k--) stack.push(cur.children[k]);
  }
  return out;
}
