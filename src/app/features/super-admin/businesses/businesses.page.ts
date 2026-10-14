import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminBusiness, AiBudgetRow } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
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

  readonly businesses = signal<AdminBusiness[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal('');

  readonly isCreateModalOpen = signal(false);
  readonly isSaving = signal(false);

  readonly generatedCode = signal('');
  readonly codeCopied = signal(false);

  // Presupuesto mensual de IA (US$) y gasto del mes por negocio.
  readonly budgets = signal<Record<string, AiBudgetRow>>({});
  readonly defaultBudgetUsd = signal(5);
  readonly hardCutoffActive = signal(false);
  readonly budgetTarget = signal<AdminBusiness | null>(null);
  readonly budgetInput = signal('');
  readonly budgetError = signal('');
  readonly isSavingBudget = signal(false);

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

    await this.loadBudgets();
  }

  /** El presupuesto es informacion adicional: si falla, la lista de negocios sigue funcionando. */
  private async loadBudgets(): Promise<void> {
    try {
      const response = await firstValueFrom(this.apiService.adminListAiBudgets());
      this.budgets.set(Object.fromEntries(response.presupuestos.map((row) => [row.business_id, row])));
      this.defaultBudgetUsd.set(response.presupuesto_por_defecto_usd);
      this.hardCutoffActive.set(response.corte_duro_activo);
    } catch {
      this.budgets.set({});
    }
  }

  budgetOf(business: AdminBusiness): AiBudgetRow | null {
    return this.budgets()[business.id] ?? null;
  }

  budgetBarWidth(row: AiBudgetRow): number {
    return Math.min(100, row.porcentaje_usado ?? 0);
  }

  budgetState(row: AiBudgetRow): 'ok' | 'warn' | 'over' {
    const percent = row.porcentaje_usado ?? 0;
    return percent >= 100 ? 'over' : percent >= 80 ? 'warn' : 'ok';
  }

  openBudgetModal(business: AdminBusiness): void {
    const row = this.budgetOf(business);
    this.budgetInput.set(String(row?.presupuesto_efectivo_usd ?? this.defaultBudgetUsd()));
    this.budgetError.set('');
    this.budgetTarget.set(business);
  }

  closeBudgetModal(): void {
    if (!this.isSavingBudget()) {
      this.budgetTarget.set(null);
    }
  }

  async saveBudget(): Promise<void> {
    const business = this.budgetTarget();

    if (!business || this.isSavingBudget()) {
      return;
    }

    const value = Number(this.budgetInput().replace(',', '.'));

    if (!Number.isFinite(value) || value <= 0 || value > 1000) {
      this.budgetError.set('Escribe un monto entre 0.01 y 1000 USD.');
      return;
    }

    this.budgetError.set('');
    this.isSavingBudget.set(true);

    try {
      await firstValueFrom(this.apiService.adminSetAiBudget(business.id, value));
      await this.loadBudgets();
      this.budgetTarget.set(null);
    } catch (error: unknown) {
      const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
      this.budgetError.set(typeof detail === 'string' ? detail : 'No se pudo guardar el presupuesto.');
    } finally {
      this.isSavingBudget.set(false);
    }
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
}
