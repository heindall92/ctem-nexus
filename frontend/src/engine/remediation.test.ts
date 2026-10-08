import { describe, expect, it } from 'vitest';
import { GUIDES, guideIn } from './remediation';
import { GUIDES_EN } from './remediation-en';

describe('guías de remediación en inglés', () => {
  it('cubren las mismas guías con el mismo número de pasos', () => {
    expect(Object.keys(GUIDES_EN).sort()).toEqual(Object.keys(GUIDES).sort());
    for (const k of Object.keys(GUIDES)) expect(GUIDES_EN[k].steps.length, k).toBe(GUIDES[k].steps.length);
  });

  it('conservan los comandos de verificación (solo cambia el comentario)', () => {
    for (const k of Object.keys(GUIDES)) {
      const cmd = (s: string) => s.split('   #')[0].trim();
      if (/^[A-Z][a-z]+ (de nuevo|el|la)/.test(GUIDES[k].verify) || /^Repetir|^Revisar/.test(GUIDES[k].verify)) continue;
      expect(cmd(GUIDES_EN[k].verify), k).toBe(cmd(GUIDES[k].verify));
    }
  });

  it('guideIn devuelve la guía del idioma y la de respaldo por tipo', () => {
    expect(guideIn('en', 'log4shell').title).toBe('Remove Log4Shell (Log4j 2)');
    expect(guideIn('es', 'log4shell').title).toBe('Eliminar Log4Shell (Log4j 2)');
    expect(guideIn('en', 'desconocida', 'identidad').title).toBe('Fix the identity issue');
    expect(guideIn('en', 'log4shell').reference).toBe(GUIDES.log4shell.reference);
  });
});
