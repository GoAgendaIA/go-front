import { HttpErrorResponse } from '@angular/common/http';
import { CancelAppointmentResponse } from '../../core/models/goagenda.models';
import { cancellationError, cancellationNotice } from './cancel-appointment-messages';

const respuesta = (aviso: CancelAppointmentResponse['aviso_cliente'], tienePago = false): CancelAppointmentResponse => ({
  cita: { id: 'c1', status: 'cancelled' },
  aviso_cliente: aviso,
  tiene_pago: tienePago
});

describe('cancellationNotice', () => {
  it('dice que el cliente fue avisado por WhatsApp', () => {
    expect(cancellationNotice(respuesta('enviado'))).toBe('Cita cancelada. Le avisamos al cliente por WhatsApp.');
  });

  it('si no se pudo avisar, le dice al profesional que avise por otro medio', () => {
    for (const aviso of ['sin_whatsapp', 'no_disponible', 'fallo'] as const) {
      expect(cancellationNotice(respuesta(aviso))).toContain('por otro medio');
    }
  });

  it('advierte que hay un abono por devolver', () => {
    expect(cancellationNotice(respuesta('enviado', true))).toContain('coordina la devolución');
    expect(cancellationNotice(respuesta('enviado', false))).not.toContain('abono');
  });

  it('un aviso desconocido se trata como fallo', () => {
    const rara = { ...respuesta('enviado'), aviso_cliente: 'otro' } as unknown as CancelAppointmentResponse;
    expect(cancellationNotice(rara)).toContain('no se pudo enviar el aviso');
  });
});

describe('cancellationError', () => {
  const http = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

  it('mensajes claros segun el estado', () => {
    expect(cancellationError(http(409))).toBe('Esta cita ya estaba cancelada.');
    expect(cancellationError(http(403))).toBe('No tienes permiso para cancelar esta cita.');
    expect(cancellationError(http(400, { detail: 'No se puede cancelar una cita ya completada' }))).toBe(
      'No se puede cancelar una cita ya completada'
    );
  });

  it('cualquier otra falla usa el mensaje generico', () => {
    expect(cancellationError(http(500))).toBe('No se pudo cancelar la cita. Inténtalo de nuevo.');
    expect(cancellationError(new Error('x'))).toBe('No se pudo cancelar la cita. Inténtalo de nuevo.');
  });
});
