import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Employment, MeResponse } from '../models/goagenda.models';
import { GoagendaApiService } from './goagenda-api.service';

const ACCESS_TOKEN_KEY = 'goagenda_access_token';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apiService = inject(GoagendaApiService);

  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly me = signal<MeResponse | null>(null);
  private readonly businessInfoComplete = signal<boolean | null>(null);

  private loadPromise: Promise<MeResponse | null> | null = null;
  private businessInfoPromise: Promise<boolean> | null = null;

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));
  readonly isSuperAdmin = computed(() => this.me()?.is_super_admin ?? false);
  readonly employments = computed<Employment[]>(() => this.me()?.employments ?? []);
  readonly currentEmployment = computed(() => this.employments().find((e) => e.active));
  readonly businessId = computed(() => this.currentEmployment()?.business_id ?? '');
  readonly employeeId = computed(() => this.currentEmployment()?.employee_id ?? '');
  readonly role = computed(() => this.currentEmployment()?.role);
  // Default true: si por algun motivo el campo no llega, nunca se debe
  // bloquear por accidente el panel de un negocio que ya funcionaba.
  readonly onboardingCompleted = computed(() => this.currentEmployment()?.business_onboarding_completed ?? true);
  // Flag por negocio: con los domicilios desactivados la app se comporta como antes.
  readonly homeVisitsEnabled = computed(() => this.currentEmployment()?.business_home_visits_enabled ?? false);
  // Default true: sin el dato (backend anterior) el aviso simplemente no se muestra.
  readonly statsIntroSeen = computed(() => this.currentEmployment()?.stats_intro_seen ?? true);
  readonly onboardingStep = computed(() => this.currentEmployment()?.business_onboarding_step ?? 1);

  get token(): string | null {
    return this.accessToken();
  }

  saveAccessToken(token: string): void {
    this.accessToken.set(token);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  /** Refleja el flag de domicilios en la sesion sin volver a pedir /me (evita parpadeos en el panel). */
  setHomeVisitsEnabled(enabled: boolean): void {
    this.me.update((me) =>
      me
        ? {
            ...me,
            employments: me.employments.map((e) =>
              e.business_id === this.businessId() ? { ...e, business_home_visits_enabled: enabled } : e
            )
          }
        : me
    );
  }

  /** Refleja en la sesion que el aviso de estadisticas ya se vio, para que no reaparezca sin volver a pedir /me. */
  setStatsIntroSeen(): void {
    this.me.update((me) =>
      me
        ? {
            ...me,
            employments: me.employments.map((e) =>
              e.business_id === this.businessId() ? { ...e, stats_intro_seen: true } : e
            )
          }
        : me
    );
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.me.set(null);
    this.businessInfoComplete.set(null);
    this.loadPromise = null;
    this.businessInfoPromise = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  /** Carga GET /me una sola vez (memoizado); no llama a la API si no hay token. */
  async ensureLoaded(): Promise<MeResponse | null> {
    if (!this.accessToken()) {
      return null;
    }

    if (this.me()) {
      return this.me();
    }

    this.loadPromise ??= this.fetchMe();
    const me = await this.loadPromise;

    // Si la carga fallo por algo transitorio (ver fetchMe: no se cerro la
    // sesion), se libera la memoizacion para que el siguiente intento
    // vuelva a pedir /me en vez de quedar con este fallo cacheado para
    // siempre y seguir mandando al usuario a login con un token que en
    // realidad todavia es valido.
    if (!me && this.accessToken()) {
      this.loadPromise = null;
    }

    return me;
  }

  /** Fuerza un re-fetch de GET /me (ej: despues de redimir un codigo de invitacion). */
  async refresh(): Promise<MeResponse | null> {
    this.me.set(null);
    this.businessInfoComplete.set(null);
    this.loadPromise = null;
    this.businessInfoPromise = null;
    return this.ensureLoaded();
  }

  /** Verifica (memoizado) si al negocio actual le falta completar datos (telefono de WhatsApp). */
  async ensureBusinessInfoChecked(): Promise<boolean> {
    if (this.businessInfoComplete() !== null) {
      return this.businessInfoComplete()!;
    }

    this.businessInfoPromise ??= this.fetchBusinessInfoComplete();
    return this.businessInfoPromise;
  }

  private async fetchMe(): Promise<MeResponse | null> {
    try {
      const me = await firstValueFrom(this.apiService.getMe());
      this.me.set(me);
      return me;
    } catch (error) {
      // Solo un rechazo real de credenciales (401/403) significa que la
      // sesion quedo invalida y hay que cerrarla. Cualquier otro fallo (caida
      // de red, 500, timeout) es transitorio: antes esto cerraba la sesion
      // completa ante CUALQUIER error de /me, lo que desconectaba al usuario
      // por un simple hipo de conexion aunque su token siguiera siendo valido.
      if (this.isAuthError(error)) {
        this.clearSession();
      }
      return null;
    }
  }

  private isAuthError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
  }

  private async fetchBusinessInfoComplete(): Promise<boolean> {
    const businessId = this.businessId();

    if (!businessId) {
      return false;
    }

    try {
      const settings = await firstValueFrom(this.apiService.getBusinessSettings(businessId));
      const complete = Boolean(settings.phone_number && settings.phone_number.trim());
      this.businessInfoComplete.set(complete);
      return complete;
    } catch {
      return false;
    }
  }
}
