import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

/**
 * Layout del super admin: barra superior con logo y cierre de sesion, y
 * menu lateral (en movil, barra inferior, igual que el panel del negocio).
 * La pantalla principal es la analitica; las otras opciones son crear
 * negocios y crear cuentas de administracion.
 */
@Component({
  selector: 'app-admin-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideIconComponent],
  templateUrl: './admin-shell.page.html',
  styleUrl: './admin-shell.page.css'
})
export class AdminShellPageComponent {
  private readonly authService = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  readonly isLoggingOut = signal(false);

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
