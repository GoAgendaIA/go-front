import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';

/** Como se ve la cita: completada (ya paso), cancelada, confirmada (por venir) o con algo pendiente. */
export type AppointmentVisualState = 'completed' | 'cancelled' | 'confirmed' | 'pending';

const LABELS: Record<AppointmentVisualState, string> = {
  completed: 'completada',
  cancelled: 'cancelada',
  confirmed: 'confirmada',
  pending: 'pendiente'
};

/**
 * Estado que se le muestra a la persona. El estado guardado ("confirmed") no cambia solo
 * cuando la cita ya ocurrio, asi que una cita no cancelada cuya hora paso se ve como
 * completada: la misma regla con la que el backend suma los ingresos.
 */
export function appointmentVisualState(status: AppointmentStatus, isPast: boolean): AppointmentVisualState {
  if (status === 'cancelled') {
    return 'cancelled';
  }
  if (status === 'completed' || isPast) {
    return 'completed';
  }
  if (status === 'pending' || status === 'pending_payment') {
    return 'pending';
  }
  return 'confirmed';
}

/**
 * Tarjeta de una cita: franja de color a la izquierda, icono circular segun el estado,
 * cliente y servicio, y una etiqueta con el estado. Mantiene los datos de siempre
 * (hora, precio, telefono y profesional) bajo el servicio.
 */
@Component({
  selector: 'app-appointment-card',
  imports: [CopCurrencyPipe],
  templateUrl: './appointment-card.component.html',
  styleUrl: './appointment-card.component.css'
})
export class AppointmentCardComponent {
  @Input({ required: true }) clientName = '';
  @Input({ required: true }) serviceName = '';
  @Input({ required: true }) status: AppointmentStatus = 'confirmed';
  @Input() time = '';
  @Input() price: number | null = null;
  @Input() phone = '';
  /** Solo se muestra cuando hay varios profesionales y la agenda no esta filtrada por uno. */
  @Input() employeeName = '';
  @Input() isPast = false;
  @Input() highlighted = false;
  /** Muestra el boton «Cancelar cita» (solo aplica si la cita aun puede cancelarse). */
  @Input() cancellable = false;
  @Output() readonly cancelRequested = new EventEmitter<void>();

  get state(): AppointmentVisualState {
    return appointmentVisualState(this.status, this.isPast);
  }

  /** Una cita cancelada o ya completada no se puede volver a cancelar. */
  get canCancel(): boolean {
    return this.cancellable && (this.state === 'confirmed' || this.state === 'pending');
  }

  get label(): string {
    if (this.state === 'pending' && this.status === 'pending_payment') {
      return 'pago pendiente';
    }
    return LABELS[this.state];
  }
}
