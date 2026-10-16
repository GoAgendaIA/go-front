import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HomeVisitZone } from '../../../core/models/goagenda.models';
import { notBlankValidator } from '../../../shared/utils/form-validators';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { SessionService } from '../../../core/services/session.service';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { Employee, ServiceItem } from '../../../core/models/goagenda.models';
import { AppointmentCardComponent } from '../../../shared/components/appointment-card/appointment-card.component';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';
import { Time12hPipe } from '../../../shared/pipes/time12h.pipe';
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
  employeeId: string | null;
  employeeName: string;
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
  selector: 'app-appointments-page',
  imports: [
    ReactiveFormsModule,
    AppointmentCardComponent,
    LucideIconComponent,
    UiButtonComponent,
    UiModalComponent,
    UiTextFieldComponent,
    CopCurrencyPipe,
    Time12hPipe
  ],
  templateUrl: './appointments.page.html',
  styleUrl: './appointments.page.css'
})
export class AppointmentsPageComponent implements OnInit {
  readonly today = new Date();
  readonly selectedDate = signal(new Date());
  readonly services = signal<ServiceItem[]>([]);
  readonly zones = signal<HomeVisitZone[]>([]);
  readonly homeVisitsEnabled = computed(() => this.sessionService.homeVisitsEnabled());
  readonly employees = signal<Employee[]>([]);
  readonly appointments = signal<AppointmentView[]>([]);
  readonly isLoading = signal(false);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');
  readonly agendaFilter = signal('');
  readonly availableSlots = signal<string[]>([]);
  readonly isLoadingSlots = signal(false);

  readonly isAvailabilityModalOpen = signal(false);
  readonly availabilitySlots = signal<string[]>([]);
  readonly isLoadingAvailability = signal(false);
  readonly highlightedAppointmentId = signal<string | null>(null);
  private pendingHighlightId: string | null = null;
  private highlightTimeout?: ReturnType<typeof setTimeout>;

  readonly weekDays = computed(() => getWeekDays(this.selectedDate()));
  readonly monthLabel = computed(() => formatMonthYear(this.selectedDate()));
  readonly fullDateLabel = computed(() => formatFullDate(this.selectedDate()));
  readonly isToday = computed(() => isSameDay(this.selectedDate(), this.today));
  readonly appointmentsForSelectedDay = computed(() => {
    const dateKey = toDateKey(this.selectedDate());
    const filter = this.agendaFilter();
    return this.appointments().filter(
      (appointment) => appointment.dateKey === dateKey && (!filter || appointment.employeeId === filter)
    );
  });

  private readonly realtimeService = inject(RealtimeService);

  readonly form;
  readonly availabilityForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: GoagendaApiService,
    private readonly sessionService: SessionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group({
      client_name: ['', [Validators.required]],
      // Opcional: un cliente presencial agendado manualmente puede no tener
      // WhatsApp (ver routes/manual_appointments.py en el backend, que ya
      // acepta client_phone vacio). Si se deja vacio, simplemente no se le
      // manda confirmacion ni recordatorio por WhatsApp a esa cita.
      client_phone: [''],
      service_id: ['', [Validators.required]],
      employee_id: ['', [Validators.required]],
      time: ['', [Validators.required]],
      is_home_visit: [false],
      address: [''],
      zone: ['']
    });

    this.availabilityForm = this.formBuilder.nonNullable.group({
      employee_id: [''],
      service_id: [''],
      date: [toDateKey(this.selectedDate())]
    });

    // Recalcula los turnos libres cada vez que cambia el empleado o el servicio elegido.
    this.form.controls.employee_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => void this.refreshAvailableSlots());
    this.form.controls.service_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      void this.refreshAvailableSlots();

      // Un servicio que no se hace a domicilio no puede quedar marcado como domicilio.
      if (!this.selectedServiceOffersHomeVisit && this.form.controls.is_home_visit.value) {
        this.form.controls.is_home_visit.setValue(false);
      }
    });

    // La direccion solo es obligatoria (y editable) cuando la cita es a domicilio.
    this.form.controls.is_home_visit.valueChanges.pipe(takeUntilDestroyed()).subscribe((isHomeVisit) => {
      const address = this.form.controls.address;

      if (isHomeVisit && !this.selectedServiceOffersHomeVisit) {
        this.form.controls.is_home_visit.setValue(false);
        return;
      }

      const zone = this.form.controls.zone;

      if (isHomeVisit) {
        address.setValidators([Validators.required, notBlankValidator]);
        // Si el negocio definio zonas de cobertura, hay que elegir una.
        if (this.zones().length > 0) {
          zone.setValidators([Validators.required]);
        }
      } else {
        address.clearValidators();
        address.setValue('');
        zone.clearValidators();
        zone.setValue('');
      }
      address.updateValueAndValidity();
      zone.updateValueAndValidity();
    });

    // Recarga el calendario cuando llega un evento de cita (no de chat) del negocio activo por WebSocket.
    effect(() => {
      const event = this.realtimeService.lastEvent();

      if (event && event.type !== 'chat.escalated' && event.business_id === this.sessionService.businessId()) {
        void this.loadAppointments();
      }
    });

    // Al llegar desde el link de una notificacion (?date=...&highlight=...):
    // posiciona el calendario en ese dia y deja pendiente el resaltado hasta
    // que la cita realmente exista en appointments() (puede llegar antes de
    // que loadAppointments() termine).
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const dateParam = params.get('date');
      const highlightId = params.get('highlight');

      if (!dateParam && !highlightId) {
        return;
      }

      if (dateParam) {
        const parsed = new Date(`${dateParam}T00:00:00`);
        if (!isNaN(parsed.getTime())) {
          this.selectedDate.set(parsed);
        }
      }

      if (highlightId) {
        this.pendingHighlightId = highlightId;
        this.tryHighlightPending();
      }

      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    });

    effect(() => {
      this.appointments();
      this.tryHighlightPending();
    });
  }

  /**
   * Resalta la cita apuntada por una notificacion (bug QA: el click en la
   * notificacion no hacia nada) reintentando hasta que appointments() ya
   * la tenga cargada, ya que el click puede llegar a esta pagina antes de
   * que loadAppointments() termine.
   */
  private tryHighlightPending(): void {
    if (!this.pendingHighlightId) {
      return;
    }

    const id = this.pendingHighlightId;
    if (!this.appointments().some((appointment) => appointment.id === id)) {
      return;
    }

    this.pendingHighlightId = null;
    this.highlightedAppointmentId.set(id);

    setTimeout(() => {
      document.querySelector(`[data-appointment-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);

    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.highlightTimeout = setTimeout(() => this.highlightedAppointmentId.set(null), 2500);
  }

  ngOnInit(): void {
    void Promise.all([this.loadServices(), this.loadEmployees()]).then(() => this.loadAppointments());
  }

  async loadServices(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const services = await firstValueFrom(this.apiService.listServices(businessId));
      this.services.set(services);
    } catch {
      this.error.set('No se pudo cargar el catalogo de servicios.');
    }

    try {
      const zones = await firstValueFrom(this.apiService.listHomeVisitZones(businessId));
      this.zones.set(zones.filter((zone) => zone.active));
    } catch {
      this.zones.set([]);
    }
  }

  async loadEmployees(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    try {
      const employees = await firstValueFrom(this.apiService.listEmployees(businessId));
      this.employees.set(employees);
    } catch {
      this.error.set('No se pudo cargar la lista de empleados.');
    }
  }

  async loadAppointments(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.apiService.listAppointments({ business_id: businessId, limit: 200 }));

      this.appointments.set(
        response.appointments.map((record) => {
          const scheduledAt = new Date(record.scheduled_at);

          const view: AppointmentView = {
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employees?.name || 'Sin nombre',
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
      this.error.set('No se pudieron cargar las citas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Ya paso la hora de esta cita (comparado contra el momento en que se pinta la tarjeta) - se pinta atenuada en el calendario. */
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

  setAgendaFilter(employeeId: string): void {
    this.agendaFilter.set(employeeId);
  }

  openAgendarModal(): void {
    const defaultEmployeeId = this.sessionService.currentEmployment()?.employee_id ?? '';
    this.form.reset({
      client_name: '',
      client_phone: '',
      service_id: '',
      employee_id: defaultEmployeeId,
      time: '',
      is_home_visit: false,
      address: '',
      zone: ''
    });
    this.isModalOpen.set(true);
    void this.refreshAvailableSlots();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async refreshAvailableSlots(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const { employee_id, service_id } = this.form.getRawValue();

    if (!businessId || !employee_id || !service_id) {
      this.availableSlots.set([]);
      return;
    }

    this.isLoadingSlots.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.getAvailableSlots({
          business_id: businessId,
          employee_id,
          service_id,
          date: toDateKey(this.selectedDate())
        })
      );
      this.availableSlots.set(response.available_slots);

      const currentTime = this.form.controls.time.value;
      if (currentTime && !response.available_slots.includes(currentTime)) {
        this.form.controls.time.setValue('');
      }
    } catch {
      this.availableSlots.set([]);
    } finally {
      this.isLoadingSlots.set(false);
    }
  }

  openAvailabilityModal(): void {
    const defaultEmployeeId = this.sessionService.currentEmployment()?.employee_id ?? '';
    this.availabilityForm.reset({ employee_id: defaultEmployeeId, service_id: '', date: toDateKey(this.selectedDate()) });
    this.availabilitySlots.set([]);
    this.isAvailabilityModalOpen.set(true);
  }

  closeAvailabilityModal(): void {
    this.isAvailabilityModalOpen.set(false);
  }

  async searchAvailability(): Promise<void> {
    const businessId = this.sessionService.businessId();
    const { employee_id, service_id, date } = this.availabilityForm.getRawValue();

    if (!businessId || !employee_id || !date) {
      return;
    }

    this.isLoadingAvailability.set(true);

    try {
      const response = await firstValueFrom(
        this.apiService.getAvailableSlots({
          business_id: businessId,
          employee_id,
          date,
          service_id: service_id || undefined
        })
      );
      this.availabilitySlots.set(response.available_slots);
    } catch {
      this.availabilitySlots.set([]);
    } finally {
      this.isLoadingAvailability.set(false);
    }
  }

  get selectedServiceOffersHomeVisit(): boolean {
    const serviceId = this.form.controls.service_id.value;
    return this.services().find((service) => service.id === serviceId)?.offers_home_visit ?? false;
  }

  get selectedZoneFee(): number {
    const name = this.form.controls.zone.value;
    return this.zones().find((zone) => zone.name === name)?.fee ?? 0;
  }

  get addressError(): string | null {
    const control = this.form.controls.address;
    return control.touched && control.invalid ? 'La direccion del cliente es obligatoria.' : null;
  }

  async submit(): Promise<void> {
    const businessId = this.sessionService.businessId();

    if (this.form.invalid || !businessId || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { client_name, client_phone, service_id, employee_id, time, is_home_visit, address, zone } = this.form.getRawValue();
    const dateKey = toDateKey(this.selectedDate());
    const fecha_hora = `${dateKey}T${time}:00`;

    this.isSaving.set(true);
    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.createManualAppointment({
          business_id: businessId,
          employee_id,
          client_name,
          client_phone,
          service_id,
          fecha_hora,
          ...(is_home_visit ? { address: address.trim(), ...(zone ? { zone } : {}) } : {})
        })
      );

      this.isModalOpen.set(false);
      await this.loadAppointments();
    } catch {
      this.error.set('No se pudo agendar la cita.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
