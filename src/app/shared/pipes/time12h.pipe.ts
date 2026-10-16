import { Pipe, PipeTransform } from '@angular/core';
import { formatHHmm12h } from '../utils/date-utils';

/** 'HH:mm' (24 h, como lo entrega la API) -> '3:00 p. m.'. Solo cambia lo que se ve, nunca el valor. */
@Pipe({ name: 'time12h' })
export class Time12hPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatHHmm12h(value);
  }
}
