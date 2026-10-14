import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { GENERIC_SEND_ERROR, userMessageForSendError } from './send-error-message';

const rechazo = (status: number, body: unknown) => new HttpErrorResponse({ status, error: body });

describe('userMessageForSendError', () => {
  it('muestra el mensaje del servidor cuando el limite de ritmo rechaza el envio (429)', () => {
    const detail = 'Estás enviando mensajes muy rápido. Espera un momento e inténtalo de nuevo.';
    expect(userMessageForSendError(rechazo(429, { detail }))).toBe(detail);
  });

  it('recorta espacios del mensaje del servidor', () => {
    expect(userMessageForSendError(rechazo(429, { detail: '  Espera un momento.  ' }))).toBe('Espera un momento.');
  });

  it('usa el mensaje generico si el 429 no trae un texto utilizable', () => {
    expect(userMessageForSendError(rechazo(429, null))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(429, {}))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(429, { detail: '   ' }))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(429, { detail: [{ msg: 'x' }] }))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(429, 'texto plano'))).toBe(GENERIC_SEND_ERROR);
  });

  it('no expone el detalle de otros errores (pueden ser tecnicos)', () => {
    expect(userMessageForSendError(rechazo(500, { detail: 'Traceback interno' }))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(404, { detail: 'session_id invalido' }))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(422, { detail: [{ loc: ['body', 'mensaje'] }] }))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(rechazo(0, null))).toBe(GENERIC_SEND_ERROR);
  });

  it('usa el generico ante timeouts y errores desconocidos', () => {
    expect(userMessageForSendError(new TimeoutError())).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(new Error('boom'))).toBe(GENERIC_SEND_ERROR);
    expect(userMessageForSendError(undefined)).toBe(GENERIC_SEND_ERROR);
  });
});
