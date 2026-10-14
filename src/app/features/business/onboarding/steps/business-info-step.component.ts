import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../../core/services/goagenda-api.service';
import { SessionService } from '../../../../core/services/session.service';
import { BusinessAddressFormComponent } from '../../../../shared/components/business-address-form/business-address-form.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiTextFieldComponent } from '../../../../shared/components/ui-text-field/ui-text-field.component';
import { WHATSAPP_PHONE_PATTERN, notBlankValidator } from '../../../../shared/utils/form-validators';

@Component({
  selector: 'app-onboarding-business-info',
  imports: [ReactiveFormsModule, UiButtonComponent, UiTextFieldComponent, BusinessAddressFormComponent],
  templateUrl: './business-info-step.component.html',
  styleUrl: './step.css'
})
export class BusinessInfoStepComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  @Input({ required: true }) businessId!: string;
  @ViewChild(BusinessAddressFormComponent) private readonly addressForm?: BusinessAddressFormComponent;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, notBlankValidator]],
    owner_name: ['', [Validators.required]],
    phone_number: ['', [Validators.required, Validators.pattern(WHATSAPP_PHONE_PATTERN)]]
  });

  get nameError(): string | null {
    if (!this.form.controls.name.touched) {
      return null;
    }
    if (this.form.controls.name.hasError('required') || this.form.controls.name.hasError('blank')) {
      return 'El nombre del negocio es obligatorio.';
    }
    return null;
  }

  get ownerNameError(): string | null {
    return this.form.controls.owner_name.touched && this.form.controls.owner_name.hasError('required')
      ? 'Tu nombre es obligatorio.'
      : null;
  }

  get phoneError(): string | null {
    if (!this.form.controls.phone_number.touched) {
      return null;
    }
    if (this.form.controls.phone_number.hasError('required')) {
      return 'El WhatsApp del negocio es obligatorio.';
    }
    if (this.form.controls.phone_number.hasError('pattern')) {
      return 'Ingresa un numero de WhatsApp valido (solo digitos, con codigo de pais opcional).';
    }
    return null;
  }

  ngOnInit(): void {
    void this.loadCurrentData();
  }

  private async loadCurrentData(): Promise<void> {
    if (!this.businessId) {
      return;
    }

    this.isLoading.set(true);

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(this.businessId));
      this.form.patchValue({
        // "name" de businesses lo exige el super admin al crear el negocio, asi que
        // ya trae un valor real (no un default vacio/placeholder) que el dueño puede
        // corregir aqui mismo antes de continuar.
        name: settings.name ?? '',
        owner_name: this.sessionService.currentEmployment()?.name ?? '',
        phone_number: settings.phone_number ?? ''
      });
    } catch {
      this.error.set('No se pudo cargar la informacion del negocio.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submit(): Promise<void> {
    // La direccion es obligatoria para terminar el onboarding: se valida junto con el resto.
    const addressFormInvalid = this.addressForm?.form.invalid ?? false;
    if (this.form.invalid || addressFormInvalid || this.isSaving()) {
      this.form.markAllAsTouched();
      this.addressForm?.form.markAllAsTouched();
      return;
    }

    const { name, owner_name, phone_number } = this.form.getRawValue();
    const employeeId = this.sessionService.employeeId();
    this.isSaving.set(true);
    this.error.set('');

    try {
      await firstValueFrom(
        this.apiService.updateBusinessInfo({ business_id: this.businessId, name: name.trim(), phone_number: phone_number.trim() })
      );

      if (employeeId) {
        await firstValueFrom(this.apiService.updateEmployee(employeeId, { name: owner_name.trim() }));
      }

      if (this.addressForm && !(await this.addressForm.save())) {
        return;
      }

      this.next.emit();
    } catch {
      this.error.set('No se pudo guardar la informacion del negocio.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
