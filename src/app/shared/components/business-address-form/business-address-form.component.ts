import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BusinessAddressKind } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { notBlankValidator } from '../../utils/form-validators';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

export const ADDRESS_MAX_LENGTH = 300;

/**
 * Direccion del negocio. Texto libre a proposito: no se exige formato (sin '#', guiones ni
 * numeros), no se valida contra ningun mapa y sirve igual una calle que "vereda La Cita,
 * despues del puente". La ubicacion del dispositivo es opcional.
 *
 * Se usa en el onboarding (el padre llama a save() al continuar) y en Ajustes
 * (con su propio boton de guardar: showSaveButton).
 */
@Component({
  selector: 'app-business-address-form',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent],
  templateUrl: './business-address-form.component.html',
  styleUrl: './business-address-form.component.css'
})
export class BusinessAddressFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiService = inject(GoagendaApiService);

  @Input({ required: true }) businessId!: string;
  @Input() showSaveButton = false;
  @Output() readonly saved = new EventEmitter<void>();

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isLocating = signal(false);
  readonly error = signal('');
  readonly locationError = signal('');
  readonly successMessage = signal('');
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    kind: ['formal' as BusinessAddressKind],
    address: ['', [Validators.required, notBlankValidator, Validators.maxLength(ADDRESS_MAX_LENGTH)]],
    city: ['', [Validators.maxLength(120)]],
    notes: ['', [Validators.maxLength(ADDRESS_MAX_LENGTH)]]
  });

  readonly kinds: { value: BusinessAddressKind; label: string; hint: string; placeholder: string }[] = [
    {
      value: 'formal',
      label: 'Con direccion',
      hint: 'Calle, carrera, numero, local o apartamento. Escribela como quieras, sin un formato fijo.',
      placeholder: 'Ej. Calle 10 # 5-20, local 3'
    },
    {
      value: 'referencias',
      label: 'Por referencias',
      hint: 'Para veredas, fincas o sectores sin nomenclatura: cuenta como llegar.',
      placeholder: 'Ej. Vereda La Cita, despues del puente, casa amarilla'
    }
  ];

  get currentKind() {
    return this.kinds.find((k) => k.value === this.form.controls.kind.value) ?? this.kinds[0];
  }

  get addressError(): string | null {
    const control = this.form.controls.address;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required') || control.hasError('blank')) {
      return 'La direccion del negocio es obligatoria.';
    }
    if (control.hasError('maxlength')) {
      return `La direccion no puede pasar de ${ADDRESS_MAX_LENGTH} caracteres.`;
    }
    return null;
  }

  get mapUrl(): string | null {
    const lat = this.lat();
    const lng = this.lng();
    return lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.businessId) {
      return;
    }
    this.isLoading.set(true);
    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(this.businessId));
      this.form.patchValue({
        kind: settings.address_kind === 'referencias' ? 'referencias' : 'formal',
        address: settings.address ?? '',
        city: settings.address_city ?? '',
        notes: settings.address_notes ?? ''
      });
      this.lat.set(settings.address_lat ?? null);
      this.lng.set(settings.address_lng ?? null);
    } catch {
      this.error.set('No se pudo cargar la direccion del negocio.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectKind(kind: BusinessAddressKind): void {
    this.form.controls.kind.setValue(kind);
  }

  useMyLocation(): void {
    this.locationError.set('');
    if (!('geolocation' in navigator)) {
      this.locationError.set('Tu navegador no permite obtener la ubicacion. Puedes seguir sin ella.');
      return;
    }
    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.lat.set(Number(position.coords.latitude.toFixed(6)));
        this.lng.set(Number(position.coords.longitude.toFixed(6)));
        this.isLocating.set(false);
      },
      () => {
        this.locationError.set('No se pudo obtener tu ubicacion (revisa el permiso del navegador). Puedes seguir sin ella.');
        this.isLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  clearLocation(): void {
    this.lat.set(null);
    this.lng.set(null);
  }

  /** Valida y guarda. Devuelve true si quedo guardada (el padre decide si avanza). */
  async save(): Promise<boolean> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    if (this.isSaving()) {
      return false;
    }

    const { kind, address, city, notes } = this.form.getRawValue();
    this.isSaving.set(true);
    this.error.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.apiService.updateBusinessAddress({
          business_id: this.businessId,
          address: address.trim(),
          address_kind: kind,
          address_city: city.trim() || null,
          address_notes: notes.trim() || null,
          address_lat: this.lat(),
          address_lng: this.lng()
        })
      );
      this.successMessage.set('Direccion guardada.');
      this.saved.emit();
      return true;
    } catch {
      this.error.set('No se pudo guardar la direccion del negocio.');
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }
}
