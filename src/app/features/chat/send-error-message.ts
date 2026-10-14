import { HttpErrorResponse } from '@angular/common/http';

export const GENERIC_SEND_ERROR = 'No se pudo enviar el mensaje. Revisa tu conexion y toca enviar de nuevo.';

/** Status con los que el backend rechaza un envio por exceso de ritmo o uso (ver routes/chat_routes.py). */
const RATE_LIMIT_STATUS = 429;

/**
 * Mensaje que ve el cliente cuando falla el envio de un mensaje del chat.
 *
 * Si el backend rechazo el envio por ritmo (429), su `detail` ya es un texto
 * pensado para el cliente ("Estas enviando mensajes muy rapido. Espera un
 * momento..."): se muestra tal cual. Cualquier otro fallo (sin red, 5xx,
 * timeout, 4xx de validacion) conserva el mensaje generico, porque ahi el
 * `detail` puede ser tecnico (o una lista de errores de validacion) y no es
 * para mostrarse.
 */
export function userMessageForSendError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === RATE_LIMIT_STATUS) {
    const detail: unknown = error.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
  }

  return GENERIC_SEND_ERROR;
}
