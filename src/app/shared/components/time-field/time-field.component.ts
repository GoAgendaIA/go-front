import { Component, Input, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type Period = 'am' | 'pm';

export interface TimeParts {
  hour: number;
  minute: number;
  period: Period;
}

/** 'HH:mm' (24 h) -> partes en 12 h. Un valor vacio o invalido se muestra como 9:00 a. m. */
export function toTimeParts(value: string | null | undefined): TimeParts {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) {
    return { hour: 9, minute: 0, period: 'am' };
  }
  const hour24 = Number(match[1]) % 24;
  return { hour: hour24 % 12 || 12, minute: Number(match[2]) % 60, period: hour24 >= 12 ? 'pm' : 'am' };
}

/** Partes en 12 h -> 'HH:mm' (24 h): 12 a. m. = 00:xx y 12 p. m. = 12:xx. */
export function fromTimeParts(parts: TimeParts): string {
  const hour24 = (parts.hour % 12) + (parts.period === 'pm' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/**
 * Selector de hora SIEMPRE en 12 h (hora, minutos y a. m./p. m.). El <input type="time"> nativo
 * se muestra segun el idioma del sistema del dispositivo, asi que en muchos aparatos salia en
 * 24 h y no se puede forzar desde CSS. El valor (ngModel) sigue siendo 'HH:mm' en 24 h.
 */
@Component({
  selector: 'app-time-field',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeFieldComponent), multi: true }],
  templateUrl: './time-field.component.html',
  styleUrl: './time-field.component.css'
})
export class TimeFieldComponent implements ControlValueAccessor {
  @Input() ariaLabel = 'Hora';

  readonly hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  private readonly baseMinutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Senales: la app no usa zone.js, asi que un cambio hecho por ngModel (p. ej. al terminar de
  // cargar el horario guardado) solo se pinta si el estado es una senal.
  readonly parts = signal<TimeParts>(toTimeParts(null));
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** De 5 en 5; si la hora guardada tiene otro minuto (ej. 09:07) tambien se ofrece, para no alterarla. */
  readonly minutes = computed(() => {
    const minuto = this.parts().minute;
    return this.baseMinutes.includes(minuto) ? this.baseMinutes : [...this.baseMinutes, minuto].sort((a, b) => a - b);
  });

  pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  writeValue(value: string | null): void {
    this.parts.set(toTimeParts(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  update(partial: Partial<TimeParts>): void {
    this.parts.update((actual) => ({ ...actual, ...partial }));
    this.onChange(fromTimeParts(this.parts()));
    this.onTouched();
  }

  onHour(event: Event): void {
    this.update({ hour: Number((event.target as HTMLSelectElement).value) });
  }

  onMinute(event: Event): void {
    this.update({ minute: Number((event.target as HTMLSelectElement).value) });
  }

  onPeriod(event: Event): void {
    this.update({ period: (event.target as HTMLSelectElement).value as Period });
  }
}
