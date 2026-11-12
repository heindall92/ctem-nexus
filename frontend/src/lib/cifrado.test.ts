import { describe, expect, it } from 'vitest';
import { aBase64, aTexto, cifrar, deBase64, derivarClave, descifrar, esSobreCifrado, fuerzaFrase, ITERACIONES } from './cifrado';

const texto = (u: Uint8Array) => new TextDecoder().decode(u);
const bytes = (s: string) => new TextEncoder().encode(s);

describe('cifrado del proyecto (AES-256-GCM, PBKDF2-SHA-256)', () => {
  it('cifra y descifra; el sobre no contiene el texto en claro', async () => {
    const clave = await derivarClave('caballo correcto batería grapa');
    expect(clave.kdf.iter).toBe(ITERACIONES);
    const claro = JSON.stringify({ name: 'Industrias Meridiano', assets: [{ name: 'dc01.meridiano.local', ip: '10.10.1.5' }] });
    const sobre = await cifrar(bytes(claro), clave);
    expect(esSobreCifrado(sobre)).toBe(true);
    const fichero = JSON.stringify(aTexto(sobre));
    for (const secreto of ['Meridiano', 'dc01', '10.10.1.5', 'assets']) expect(fichero).not.toContain(secreto);
    expect(texto(await descifrar(sobre, clave))).toBe(claro);
    expect(texto(await descifrar(JSON.parse(fichero), clave))).toBe(claro);
  });

  it('la misma frase con la sal guardada vuelve a abrirlo; otra frase no', async () => {
    const clave = await derivarClave('frase de paso larga y buena');
    const sobre = await cifrar(bytes('secreto'), clave);
    const otra = await derivarClave('frase de paso larga y buena', sobre.kdf);
    expect(texto(await descifrar(sobre, otra))).toBe('secreto');
    const mala = await derivarClave('frase de paso larga y mala', sobre.kdf);
    await expect(descifrar(sobre, mala)).rejects.toThrow(/no es correcta/);
  });

  it('un solo byte cambiado se detecta (GCM autentica)', async () => {
    const clave = await derivarClave('otra frase de paso cualquiera');
    const sobre = aTexto(await cifrar(bytes('hallazgos'), clave));
    const d = deBase64(sobre.datos); d[0] ^= 1;
    await expect(descifrar({ ...sobre, datos: aBase64(d) }, clave)).rejects.toThrow(/alterado/);
  });

  it('cada cifrado usa un IV nuevo y cada clave nueva una sal nueva', async () => {
    const a = await derivarClave('una frase para probar ivs');
    const b = await derivarClave('una frase para probar ivs');
    expect(a.kdf.sal).not.toBe(b.kdf.sal);
    const s1 = await cifrar(bytes('x'), a), s2 = await cifrar(bytes('x'), a);
    expect(s1.iv).not.toBe(s2.iv);
  });

  it('rechaza parámetros manipulados (iteraciones ridículas o enormes)', async () => {
    await expect(derivarClave('frase', { alg: 'PBKDF2-SHA-256', iter: 1, sal: 'AAAA' })).rejects.toThrow(/no admitidos/);
    await expect(derivarClave('frase', { alg: 'PBKDF2-SHA-256', iter: 1e9, sal: 'AAAA' })).rejects.toThrow(/no admitidos/);
    expect(esSobreCifrado({ format: 'ctem-nexus-cifrado', version: 1 })).toBe(false);
  });

  it('base64 por trozos aguanta datos grandes', () => {
    const grande = Uint8Array.from({ length: 200_000 }, (_, i) => i % 251);
    expect(deBase64(aBase64(grande))).toEqual(grande);
  });

  it('la fuerza de la frase la marca sobre todo la longitud', () => {
    expect(fuerzaFrase('corta')).toBe(0);
    expect(fuerzaFrase('aaaaaaaaaaaaaaaa')).toBe(1);
    expect(fuerzaFrase('unafrasedoce')).toBe(1);
    expect(fuerzaFrase('caballo correcto batería grapa')).toBe(4);
  });
});
