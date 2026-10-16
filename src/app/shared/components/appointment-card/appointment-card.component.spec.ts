import { TestBed } from '@angular/core/testing';
import { AppointmentCardComponent, appointmentVisualState } from './appointment-card.component';

function crear(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(AppointmentCardComponent);
  for (const [clave, valor] of Object.entries({ clientName: 'Daniel Velez', serviceName: 'Corte de cabello', ...inputs })) {
    fixture.componentRef.setInput(clave, valor);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('appointmentVisualState', () => {
  it('una cita cancelada siempre se ve cancelada, aunque ya haya pasado', () => {
    expect(appointmentVisualState('cancelled', true)).toBe('cancelled');
    expect(appointmentVisualState('cancelled', false)).toBe('cancelled');
  });

  it('una cita no cancelada cuya hora ya paso se ve completada (el estado guardado sigue en confirmed)', () => {
    expect(appointmentVisualState('confirmed', true)).toBe('completed');
    expect(appointmentVisualState('completed', false)).toBe('completed');
  });

  it('una cita por venir se ve confirmada, o pendiente si espera el pago', () => {
    expect(appointmentVisualState('confirmed', false)).toBe('confirmed');
    expect(appointmentVisualState('pending_payment', false)).toBe('pending');
    expect(appointmentVisualState('pending', false)).toBe('pending');
  });
});

describe('AppointmentCardComponent', () => {
  it('muestra cliente, servicio y la etiqueta del estado', () => {
    const el = crear({ status: 'confirmed', isPast: false });
    expect(el.querySelector('.client')?.textContent).toBe('Daniel Velez');
    expect(el.querySelector('.service')?.textContent).toBe('Corte de cabello');
    expect(el.querySelector('.pill')?.textContent).toBe('confirmada');
    expect(el.querySelector('.card')?.classList.contains('state-confirmed')).toBe(true);
  });

  it('una cita cancelada lleva su estado y etiqueta', () => {
    const el = crear({ status: 'cancelled' });
    expect(el.querySelector('.pill')?.textContent).toBe('cancelada');
    expect(el.querySelector('.card')?.classList.contains('state-cancelled')).toBe(true);
  });

  it('una cita pasada se muestra completada con el icono de check y el reloj', () => {
    const el = crear({ status: 'confirmed', isPast: true });
    expect(el.querySelector('.pill')?.textContent).toBe('completada');
    expect(el.querySelector('.icon-badge')).not.toBeNull();
  });

  it('distingue el pago pendiente', () => {
    const el = crear({ status: 'pending_payment', isPast: false });
    expect(el.querySelector('.pill')?.textContent).toBe('pago pendiente');
  });

  it('conserva los datos de la cita: hora, precio, telefono y profesional', () => {
    const el = crear({ status: 'confirmed', time: '3:00 pm', price: 15000, phone: '3001234567', employeeName: 'Chenier' });
    const detalles = el.querySelector('.details')?.textContent ?? '';
    expect(detalles).toContain('3:00 pm');
    expect(detalles).toContain('15.000');
    expect(detalles).toContain('3001234567');
    expect(detalles).toContain('Chenier');
  });

  it('sin datos extra no dibuja la fila de detalles', () => {
    const el = crear({ status: 'confirmed' });
    expect(el.querySelector('.details')).toBeNull();
  });
});
