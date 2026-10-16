import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiButtonComponent } from '../ui-button/ui-button.component';
import { UiModalComponent } from '../ui-modal/ui-modal.component';

/** Confirmacion antes de cancelar una cita: muestra de cual se trata y que el cliente sera avisado. */
@Component({
  selector: 'app-cancel-appointment-dialog',
  imports: [UiModalComponent, UiButtonComponent],
  templateUrl: './cancel-appointment-dialog.component.html',
  styleUrl: './cancel-appointment-dialog.component.css'
})
export class CancelAppointmentDialogComponent {
  @Input({ required: true }) clientName = '';
  @Input({ required: true }) serviceName = '';
  @Input() time = '';
  @Input() hasPhone = false;
  @Input() isLoading = false;
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly dismissed = new EventEmitter<void>();
}
