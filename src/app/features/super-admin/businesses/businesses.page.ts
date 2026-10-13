import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminBusiness } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UiModalComponent } from '../../../shared/components/ui-modal/ui-modal.component';
import { UiTextFieldComponent } from '../../../shared/components/ui-text-field/ui-text-field.component';

@Component({
  selector: 'app-super-admin-businesses-page',
  imports: [ReactiveFormsModule, LucideIconComponent, UiButtonComponent, UiModalComponent, UiTextFieldComponent],
  templateUrl: './businesses.page.html',
  styleUrl: './businesses.page.css'
})
export class BusinessesPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly authService = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  readonly businesses = signal<AdminBusiness[]>([]);
  readonly isLoading = signal(false);
  readonly isLoggingOut = signal(false);
  readonly error = signal('');

  readonly isCreateModalOpen = signal(false);
  readonly isSaving = signal(false);

  readonly generatedCode = signal('');
  readonly codeCopied = signal(false);

  readonly blockTarget = signal<AdminBusiness | null>(null);
  readonly isTogglingBlock = signal(false);

  readonly createForm;

  constructor(private readonly formBuilder: FormBuilder) {
    this.createForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]],
      business_type: ['']
    });
  }

  ngOnInit(): void {
    void this.loadBusinesses();
  }

  async loadBusinesses(): Promise<void> {
    this.error.set('');
    this.isLoading.set(true);

    try {
      const businesses = await firstValueFrom(this.apiService.adminListBusinesses());
      this.businesses.set(businesses);
    } catch {
      this.error.set('No se pudieron cargar los negocios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openAnalytics(): void {
    void this.router.navigateByUrl('/admin/analytics');
  }

  openCreateModal(): void {
    this.createForm.reset({ name: '', business_type: '' });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid || this.isSaving()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const { name, business_type } = this.createForm.getRawValue();
    this.isSaving.set(true);

    try {
      await firstValueFrom(this.apiService.adminCreateBusiness({ name, business_type: business_type || null }));
      this.isCreateModalOpen.set(false);
      await this.loadBusinesses();
    } catch {
      this.error.set('No se pudo crear el negocio.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async generateOwnerCode(business: AdminBusiness): Promise<void> {
    this.error.set('');

    try {
      const invitationCode = await firstValueFrom(this.apiService.adminCreateOwnerInvitationCode(business.id));
      this.generatedCode.set(invitationCode.code);
      this.codeCopied.set(false);
    } catch {
      this.error.set('No se pudo generar el codigo de invitacion.');
    }
  }

  closeCodeModal(): void {
    this.generatedCode.set('');
  }

  async copyCode(): Promise<void> {
    if (!this.generatedCode()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.generatedCode());
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles sin interaccion previa; se ignora en silencio.
    }
  }

  askToggleBlock(business: AdminBusiness): void {
    this.blockTarget.set(business);
  }

  cancelToggleBlock(): void {
    this.blockTarget.set(null);
  }

  async confirmToggleBlock(): Promise<void> {
    const business = this.blockTarget();

    if (!business || this.isTogglingBlock()) {
      return;
    }

    this.isTogglingBlock.set(true);

    try {
      const updated = await firstValueFrom(this.apiService.adminSetBusinessBlocked(business.id, !business.blocked));
      this.businesses.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      this.blockTarget.set(null);
    } catch {
      this.error.set('No se pudo actualizar el bloqueo del negocio.');
    } finally {
      this.isTogglingBlock.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);

    try {
      await this.authService.signOut();
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    } finally {
      this.isLoggingOut.set(false);
    }
  }
}
