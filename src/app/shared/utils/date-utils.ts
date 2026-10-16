const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const WEEKDAY_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado'
];
const MONTH_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

export function weekdayShortLabel(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function formatMonthYear(date: Date): string {
  const month = MONTH_LONG[date.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

const timeFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

const hourFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: true });

export function formatTime12h(date: Date): string {
  return timeFormatter.format(date);
}

/**
 * Hora para MOSTRAR en 12 h a partir de 'HH:mm' o 'HH:mm:ss' (24 h, el formato en el que la API
 * guarda y devuelve las horas, y el que usan los valores internos). Si no se puede interpretar
 * devuelve el texto tal cual, para no esconder un dato.
 */
export function formatHHmm12h(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) {
    return value ?? '';
  }
  return timeFormatter.format(new Date(2000, 0, 1, Number(match[1]), Number(match[2])));
}

/** Etiqueta de una hora del dia (0-23) sin minutos, en 12 h: 14 -> '2 p. m.'. */
export function formatHourLabel(hour: number): string {
  return hourFormatter.format(new Date(2000, 0, 1, hour, 0));
}

export function formatFullDate(date: Date): string {
  const weekday = WEEKDAY_LONG[date.getDay()];
  const month = MONTH_LONG[date.getMonth()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()} de ${month} ${date.getFullYear()}`;
}

export function formatRelativeTime(date: Date): string {
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (diffSec < 60) {
    return 'Justo ahora';
  }

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) {
    return `Hace ${diffHour} h`;
  }

  const diffDay = Math.round(diffHour / 24);
  return `Hace ${diffDay} d`;
}
