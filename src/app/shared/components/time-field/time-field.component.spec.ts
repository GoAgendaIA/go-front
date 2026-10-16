import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Component, signal } from '@angular/core';
import { TimeFieldComponent, fromTimeParts, toTimeParts } from './time-field.component';

describe('conversion de partes', () => {
  it('24 h -> 12 h', () => {
    expect(toTimeParts('09:00')).toEqual({ hour: 9, minute: 0, period: 'am' });
    expect(toTimeParts('13:30')).toEqual({ hour: 1, minute: 30, period: 'pm' });
    expect(toTimeParts('00:15')).toEqual({ hour: 12, minute: 15, period: 'am' });
    expect(toTimeParts('12:00')).toEqual({ hour: 12, minute: 0, period: 'pm' });
    expect(toTimeParts('23:55:00')).toEqual({ hour: 11, minute: 55, period: 'pm' });
  });

  it('un valor vacio o invalido se muestra como 9:00 a. m.', () => {
    expect(toTimeParts('')).toEqual({ hour: 9, minute: 0, period: 'am' });
    expect(toTimeParts(null)).toEqual({ hour: 9, minute: 0, period: 'am' });
    expect(toTimeParts('xx')).toEqual({ hour: 9, minute: 0, period: 'am' });
  });

  it('12 h -> 24 h, incluyendo medianoche y mediodia', () => {
    expect(fromTimeParts({ hour: 9, minute: 0, period: 'am' })).toBe('09:00');
    expect(fromTimeParts({ hour: 1, minute: 30, period: 'pm' })).toBe('13:30');
    expect(fromTimeParts({ hour: 12, minute: 0, period: 'am' })).toBe('00:00');
    expect(fromTimeParts({ hour: 12, minute: 45, period: 'pm' })).toBe('12:45');
    expect(fromTimeParts({ hour: 11, minute: 5, period: 'pm' })).toBe('23:05');
  });

  it('ida y vuelta: todas las horas en punto vuelven al mismo valor', () => {
    for (let h = 0; h < 24; h++) {
      const valor = `${String(h).padStart(2, '0')}:00`;
      expect(fromTimeParts(toTimeParts(valor))).toBe(valor);
    }
  });
});

@Component({
  imports: [TimeFieldComponent, FormsModule],
  template: `<app-time-field ariaLabel="Hora de apertura, Lunes" [ngModel]="valor()" (ngModelChange)="valor.set($event)" />`
})
class AnfitrionComponent {
  valor = signal('14:30');
}

describe('TimeFieldComponent', () => {
  async function montar() {
    TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const selects = (el: HTMLElement) => Array.from(el.querySelectorAll('select')) as HTMLSelectElement[];

  function elegir(select: HTMLSelectElement, valor: string) {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  it('muestra el valor 24 h del modelo en 12 h', async () => {
    const fixture = await montar();
    const [hora, minutos, periodo] = selects(fixture.nativeElement);
    expect(hora.value).toBe('2');
    expect(minutos.value).toBe('30');
    expect(periodo.value).toBe('pm');
  });

  it('al elegir devuelve el valor en 24 h', async () => {
    const fixture = await montar();
    const [hora, , periodo] = selects(fixture.nativeElement);

    elegir(hora, '9');
    expect(fixture.componentInstance.valor()).toBe('21:30');
    elegir(periodo, 'am');
    expect(fixture.componentInstance.valor()).toBe('09:30');
  });

  it('medianoche y mediodia al cambiar a. m. / p. m.', async () => {
    const fixture = await montar();
    const [hora, , periodo] = selects(fixture.nativeElement);
    elegir(hora, '12');
    elegir(periodo, 'am');
    expect(fixture.componentInstance.valor()).toBe('00:30');
    elegir(periodo, 'pm');
    expect(fixture.componentInstance.valor()).toBe('12:30');
  });

  it('ofrece un minuto fuera de los multiplos de 5 si la hora guardada lo tiene, sin alterarla', async () => {
    const fixture = await montar();
    fixture.componentInstance.valor.set('09:07');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve)); // ngModel escribe el valor en una microtarea
    fixture.detectChanges();
    const [, minutos] = selects(fixture.nativeElement);
    expect(Array.from(minutos.options).map((o) => o.text)).toContain('07');
    expect(minutos.value).toBe('7');
  });

  it('se actualiza cuando el valor llega despues (el horario guardado carga de forma asincrona)', async () => {
    const fixture = await montar();
    fixture.componentInstance.valor.set('19:45');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    const [hora, minutos, periodo] = selects(fixture.nativeElement);
    expect([hora.value, minutos.value, periodo.value]).toEqual(['7', '45', 'pm']);
  });

  it('etiqueta cada selector para lectores de pantalla', async () => {
    const fixture = await montar();
    const etiquetas = selects(fixture.nativeElement).map((s) => s.getAttribute('aria-label'));
    expect(etiquetas).toEqual([
      'Hora de apertura, Lunes, hora',
      'Hora de apertura, Lunes, minutos',
      'Hora de apertura, Lunes, a. m. o p. m.'
    ]);
  });
});
