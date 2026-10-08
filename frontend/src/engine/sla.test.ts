import { describe, expect, it } from 'vitest';
import { daysBetween, shiftDate, slaInfo } from './sla';

const hoy = new Date('2026-10-08T10:00:00Z');

describe('SLA de remediación', () => {
  it('calcula la fecha límite y el estado respecto a hoy', () => {
    expect(slaInfo('2026-09-02', 3, hoy)).toEqual({ due: '2026-09-05', daysLeft: -33, state: 'vencido' });
    expect(slaInfo('2026-10-05', 3, hoy)).toEqual({ due: '2026-10-08', daysLeft: 0, state: 'hoy' });
    expect(slaInfo('2026-10-06', 3, hoy).state).toBe('proximo');
    expect(slaInfo('2026-10-01', 30, hoy)).toEqual({ due: '2026-10-31', daysLeft: 23, state: 'en_plazo' });
  });

  it('sin fecha de detección (o con una fecha inválida) cuenta desde hoy', () => {
    expect(slaInfo(undefined, 14, hoy)).toEqual({ due: '2026-10-22', daysLeft: 14, state: 'en_plazo' });
    expect(slaInfo('no-es-fecha', 3, hoy).due).toBe('2026-10-11');
  });

  it('desplazar fechas conserva los intervalos y respeta los valores vacíos', () => {
    expect(shiftDate('2026-09-02', 22)).toBe('2026-09-24');
    expect(shiftDate('2026-12-30', 3)).toBe('2027-01-02');
    expect(shiftDate(null, 5)).toBeNull();
    expect(daysBetween(new Date('2026-09-16T23:00:00Z'), hoy)).toBe(22);
  });
});
