import { formatHHmm12h, formatHourLabel } from './date-utils';
import { Time12hPipe } from '../pipes/time12h.pipe';

// Intl separa la hora y "a. m." con un espacio fino; se normaliza para comparar.
const plano = (texto: string) => texto.replace(/\s+/g, ' ');

describe('formatHHmm12h', () => {
  it('convierte las horas de la API (24 h) a 12 h para mostrar', () => {
    expect(plano(formatHHmm12h('09:00'))).toBe('9:00 a. m.');
    expect(plano(formatHHmm12h('09:30:00'))).toBe('9:30 a. m.');
    expect(plano(formatHHmm12h('13:15'))).toBe('1:15 p. m.');
    expect(plano(formatHHmm12h('18:30'))).toBe('6:30 p. m.');
  });

  it('medianoche y mediodia', () => {
    expect(plano(formatHHmm12h('00:00'))).toBe('12:00 a. m.');
    expect(plano(formatHHmm12h('00:30'))).toBe('12:30 a. m.');
    expect(plano(formatHHmm12h('12:00'))).toBe('12:00 p. m.');
    expect(plano(formatHHmm12h('12:30'))).toBe('12:30 p. m.');
  });

  it('un valor que no es una hora se devuelve tal cual para no esconder el dato', () => {
    expect(formatHHmm12h('mañana')).toBe('mañana');
    expect(formatHHmm12h('')).toBe('');
    expect(formatHHmm12h(null)).toBe('');
    expect(formatHHmm12h(undefined)).toBe('');
  });
});

describe('formatHourLabel', () => {
  it('etiqueta una hora del dia sin minutos, en 12 h', () => {
    expect(plano(formatHourLabel(9))).toBe('9 a. m.');
    expect(plano(formatHourLabel(14))).toBe('2 p. m.');
    expect(plano(formatHourLabel(0))).toBe('12 a. m.');
    expect(plano(formatHourLabel(12))).toBe('12 p. m.');
  });
});

describe('Time12hPipe', () => {
  it('muestra en 12 h sin cambiar el valor', () => {
    const pipe = new Time12hPipe();
    expect(plano(pipe.transform('15:30'))).toBe('3:30 p. m.');
    expect(pipe.transform(null)).toBe('');
  });
});
