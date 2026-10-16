import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { NotificationToastComponent } from '../../../shared/components/notification-toast/notification-toast.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-business-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent, NotificationBellComponent, NotificationToastComponent],
  templateUrl: './business-shell.page.html',
  styleUrl: './business-shell.page.css'
})
export class BusinessShellPageComponent {
  private readonly sessionService = inject(SessionService);
  private readonly apiService = inject(GoagendaApiService);
  private readonly router = inject(Router);

  readonly homeVisitsEnabled = computed(() => this.sessionService.homeVisitsEnabled());
  readonly isBlocked = computed(() => Boolean(this.sessionService.currentEmployment()?.business_blocked));

  /** Aviso de primera vez del panel de estadisticas: una sola vez por dueño, recordado en el servidor. */
  readonly showStatsHint = computed(() => !this.sessionService.statsIntroSeen() && !this.isBlocked());

  /**
   * Cantidad de pestañas visibles en el menu inferior del celular (Citas, Estadisticas, Servicios,
   * Domicilios si aplica, Horario y Ajustes; «Empleados» solo se ve en escritorio). La flecha del
   * aviso apunta a la pestaña de Estadisticas, que es la segunda.
   */
  readonly mobileTabCount = computed(() => 5 + (this.homeVisitsEnabled() ? 1 : 0));

  /** Oculta el aviso al instante y lo recuerda en el servidor; si el guardado falla no molesta al dueño. */
  dismissStatsHint(): void {
    if (this.sessionService.statsIntroSeen()) {
      return;
    }
    this.sessionService.setStatsIntroSeen();
    const businessId = this.sessionService.businessId();
    if (businessId) {
      void firstValueFrom(this.apiService.markStatsIntroSeen(businessId)).catch(() => undefined);
    }
  }

  openStats(): void {
    this.dismissStatsHint();
    void this.router.navigateByUrl('/business/stats');
  }
}
