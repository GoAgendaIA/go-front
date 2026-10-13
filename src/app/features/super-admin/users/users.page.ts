import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SuperAdminUser } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

const MIN_PASSWORD_LENGTH = 8;

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirm_password')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-super-admin-users-page',
  imports: [DatePipe, ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiModalComponent, UiTextFieldComponent],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css'
})
export class UsersPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly admins = signal<SuperAdminUser[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal('');

  readonly revokeTarget = signal<SuperAdminUser | null>(null);
  readonly isRevoking = signal(false);
  readonly revokeError = signal('');

  readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm_password: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    this.isLoading.set(true);

    try {
      this.admins.set(await firstValueFrom(this.apiService.adminListSuperAdmins()));
    } catch {
      this.error.set('No se pudieron cargar las cuentas de administracion.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openModal(): void {
    this.form.reset({ email: '', password: '', confirm_password: '' });
    this.formError.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  askRevoke(admin: SuperAdminUser): void {
    this.revokeError.set('');
    this.revokeTarget.set(admin);
  }

  cancelRevoke(): void {
    if (!this.isRevoking()) {
      this.revokeTarget.set(null);
    }
  }

  async confirmRevoke(): Promise<void> {
    const target = this.revokeTarget();

    if (!target || this.isRevoking()) {
      return;
    }

    this.revokeError.set('');
    this.isRevoking.set(true);

    try {
      await firstValueFrom(this.apiService.adminRevokeSuperAdmin(target.user_id));
      this.admins.update((rows) => rows.filter((row) => row.user_id !== target.user_id));
      this.revokeTarget.set(null);
      this.success.set(`Se revoco el acceso de ${target.email ?? 'la cuenta'}. Ya no puede usar el panel de administracion.`);
    } catch (error: unknown) {
      const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
      this.revokeError.set(typeof detail === 'string' ? detail : 'No se pudo revocar el acceso.');
    } finally {
      this.isRevoking.set(false);
    }
  }

  fieldError(name: 'email' | 'password' | 'confirm_password'): string {
    const control = this.form.controls[name];

    if (!control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (name === 'email' && control.hasError('email')) {
      return 'Escribe un correo valido.';
    }
    if (name === 'password' && control.hasError('minlength')) {
      return `Minimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (name === 'confirm_password' && this.form.hasError('passwordMismatch')) {
      return 'Las contrasenas no coinciden.';
    }
    return '';
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.formError.set('');
    this.isSaving.set(true);

    this.success.set('');

    try {
      const created = await firstValueFrom(this.apiService.adminCreateSuperAdmin({ email, password }));
      this.admins.update((rows) => [created, ...rows]);
      this.isModalOpen.set(false);
      this.success.set(`Cuenta creada: ${created.email}. Ya puede iniciar sesion con ese correo y la contrasena asignada.`);
    } catch (error: unknown) {
      const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
      this.formError.set(typeof detail === 'string' ? detail : 'No se pudo crear la cuenta.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
