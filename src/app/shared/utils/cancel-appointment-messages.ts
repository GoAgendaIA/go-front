import { HttpErrorResponse } from '@angular/common/http';
import { CancelAppointmentResponse } from '../../core/models/goagenda.models';

/** Texto que ve el profesional despues de cancelar: dice si el cliente fue avisado y que hacer si no. */
export function cancellationNotice(result: CancelAppointmentResponse): string {
  const aviso: Record<CancelAppointmentResponse['aviso_cliente'], string> = {
    enviado: 'Cita cancelada. Le avisamos al cliente por WhatsApp.',
    sin_whatsapp: 'Cita cancelada. El cliente no tiene un WhatsApp registrado: avísale por otro medio.',
    no_disponible:
      'Cita cancelada. El aviso por WhatsApp todavía no está disponible: avísale al cliente por otro medio.',
    fallo: 'Cita cancelada, pero no se pudo enviar el aviso por WhatsApp: avísale al cliente por otro medio.'
  };
  const base = aviso[result.aviso_cliente] ?? aviso.fallo;
  return result.tiene_pago ? `${base} Esta cita tenía un abono pagado: coordina la devolución con el cliente.` : base;
}

/** Mensaje de error al intentar cancelar. */
export function cancellationError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 409) {
      return 'Esta cita ya estaba cancelada.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para cancelar esta cita.';
    }
    if (error.status === 400 && typeof error.error?.detail === 'string') {
      return error.error.detail;
    }
  }
  return 'No se pudo cancelar la cita. Inténtalo de nuevo.';
}
