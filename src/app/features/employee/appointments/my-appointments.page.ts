import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { SessionService } from '../../../core/services/session.service';
import { CancelAppointmentDialogComponent } from '../../../shared/components/cancel-appointment-dialog/cancel-appointment-dialog.component';
import { cancellationError, cancellationNotice } from '../../../shared/utils/cancel-appointment-messages';
import { AppointmentCardComponent } from '../../../shared/components/appointment-card/appointment-card.component';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import {
  formatFullDate,
  formatMonthYear,
  formatTime12h,
  getWeekDays,
  isSameDay,
  toDateKey,
  weekdayShortLabel
} from '../../../shared/utils/date-utils';

interface AppointmentView {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  time: string;
  status: AppointmentStatus;
  dateKey: string;
  scheduledAt: Date;
}

@Component({
  selector: 'app-my-appointments-page',
  imports: [AppointmentCardComponent, CancelAppointmentDialogComponent, LucideIconComponent],
  templateUrl: './my-appointments.page.html',
  styleUrl: './my-appointments.page.css'
})
export class MyAppointmentsPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);
  private readonly realtimeService = inject(RealtimeService);

  readonly today = new Date();
  readonly selectedDate = signal(new Date());
  readonly appointments = signal<AppointmentView[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly cancelTarget = signal<AppointmentView | null>(null);
  readonly isCancelling = signal(false);

  readonly weekDays = computed(() => getWeekDays(this.selectedDate()));
  readonly monthLabel = computed(() => formatMonthYear(this.selectedDate()));
  readonly fullDateLabel = computed(() => formatFullDate(this.selectedDate()));
  readonly isToday = computed(() => isSameDay(this.selectedDate(), this.today));
  readonly appointmentsForSelectedDay = computed(() => {
    const dateKey = toDateKey(this.selectedDate());
    return this.appointments().filter((appointment) => appointment.dateKey === dateKey);
  });

  constructor() {
    // Recarga la agenda cuando llega un evento de cita (no de chat) del empleado activo por WebSocket.
    effect(() => {
      const event = this.realtimeService.lastEvent();

      if (
        event &&
        event.type !== 'chat.escalated' &&
        event.business_id === this.sessionService.businessId() &&
        event.appointment.employee_id === this.sessionService.employeeId()
      ) {
        void this.loadAppointments();
      }
    });
  }

  ngOnInit(): void {
    void this.loadAppointments();
  }

  openCancel(appointment: AppointmentView): void {
    this.notice.set('');
    this.error.set('');
    this.cancelTarget.set(appointment);
  }

  closeCancel(): void {
    if (!this.isCancelling()) {
      this.cancelTarget.set(null);
    }
  }

  async confirmCancel(): Promise<void> {
    const target = this.cancelTarget();
    if (!target || this.isCancelling()) {
      return;
    }

    this.isCancelling.set(true);
    try {
      const result = await firstValueFrom(this.apiService.cancelAppointment(target.id));
      this.cancelTarget.set(null);
      this.notice.set(cancellationNotice(result));
      await this.loadAppointments();
    } catch (error) {
      this.cancelTarget.set(null);
      this.error.set(cancellationError(error));
    } finally {
      this.isCancelling.set(false);
    }
  }

  async loadAppointments(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const employeeId = this.sessionService.employeeId();

    if (!businessId || !employeeId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.listAppointments({ business_id: businessId, employee_id: employeeId, limit: 200 })
      );

      this.appointments.set(
        response.appointments.map((record) => {
          const scheduledAt = new Date(record.scheduled_at);

          const view: AppointmentView = {
            id: record.id,
            clientName: record.client_name,
            clientPhone: record.client_phone,
            serviceName: record.services?.name ?? 'Servicio',
            price: record.services?.price ?? 0,
            time: formatTime12h(scheduledAt),
            status: record.status,
            dateKey: toDateKey(scheduledAt),
            scheduledAt
          };

          return view;
        })
      );
    } catch {
      this.error.set('No se pudieron cargar tus citas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Ya paso la hora de esta cita - se pinta atenuada en el calendario. */
  isPastAppointment(appointment: AppointmentView): boolean {
    return appointment.scheduledAt.getTime() < Date.now();
  }

  weekdayLabel(date: Date): string {
    return weekdayShortLabel(date);
  }

  isSelected(date: Date): boolean {
    return isSameDay(date, this.selectedDate());
  }

  isTodayDate(date: Date): boolean {
    return isSameDay(date, this.today);
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
  }

  shiftWeek(days: number): void {
    const current = this.selectedDate();
    this.selectedDate.set(new Date(current.getFullYear(), current.getMonth(), current.getDate() + days));
  }
}
