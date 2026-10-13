import { DatePipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminBusiness,
  MetricsAlert,
  MetricsBusinessRow,
  MetricsComparisonItem,
  MetricsGroupBy,
  MetricsOrigin,
  MetricsResponse
} from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SupabaseAuthService } from '../../../core/services/supabase-auth.service';
import { BarChartComponent, BarChartSeries } from '../../../shared/components/bar-chart/bar-chart.component';
import { DonutChartComponent, DonutSlice } from '../../../shared/components/donut-chart/donut-chart.component';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';

type PeriodPreset = '7' | '30' | '90' | 'custom';

const COLOR_IA = '#03a580';
const COLOR_MANUAL = '#1d293d';
const COLOR_OTHER = '#9aa7b8';

const ORIGIN_LABEL: Record<MetricsOrigin, string> = {
  ai: 'Asistente (IA)',
  manual: 'Manual (panel)',
  web: 'Web',
  unknown: 'Sin clasificar'
};
const ORIGIN_COLOR: Record<MetricsOrigin, string> = {
  ai: COLOR_IA,
  manual: COLOR_MANUAL,
  web: '#e0a526',
  unknown: COLOR_OTHER
};

const STATE_LABEL: Record<string, string> = {
  pending: 'Pendientes',
  pending_payment: 'Pendientes de pago',
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas'
};
const STATE_COLOR: Record<string, string> = {
  pending: '#9aa7b8',
  pending_payment: '#e0a526',
  confirmed: '#2f80ed',
  completed: COLOR_IA,
  cancelled: '#bd2e2e'
};

const ALERT_LABEL: Record<string, string> = {
  sin_configurar: 'Sin configurar',
  sin_primera_cita: 'Sin primera cita',
  inactivo: 'Inactivo',
  cancelacion_alta: 'Cancelacion alta',
  conversion_baja: 'Conversion baja',
  solo_manual: 'Solo agenda manual',
  ia_sin_citas: 'IA sin citas'
};

const STATE_BADGE_LABEL: Record<string, string> = { activo: 'Activo', inactivo: 'Inactivo', sin_uso: 'Sin uso' };

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return toIsoDate(date);
}

@Component({
  selector: 'app-super-admin-analytics-page',
  imports: [
    DatePipe,
    KeyValuePipe,
    FormsModule,
    LucideIconComponent,
    BarChartComponent,
    DonutChartComponent,
    CopCurrencyPipe
  ],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css'
})
export class AnalyticsPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly authService = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  // --- filtros ---
  readonly preset = signal<PeriodPreset>('30');
  readonly desde = signal(shiftDays(toIsoDate(new Date()), -29));
  readonly hasta = signal(toIsoDate(new Date()));
  readonly groupBy = signal<MetricsGroupBy>('day');
  readonly comparar = signal(false);
  readonly businessId = signal('');
  readonly inactividadDias = signal(14);

  // --- estado ---
  readonly businesses = signal<AdminBusiness[]>([]);
  readonly data = signal<MetricsResponse | null>(null);
  readonly isLoading = signal(false);
  readonly isLoggingOut = signal(false);
  readonly error = signal('');

  readonly isGlobal = computed(() => !this.businessId());
  readonly selectedBusinessName = computed(
    () => this.businesses().find((b) => b.id === this.businessId())?.name ?? 'Negocio'
  );

  // --- datos derivados para los graficos ---
  readonly evolutionLabels = computed(() => this.evolutionPoints().map((p) => this.formatPeriod(p.periodo)));

  private readonly evolutionPoints = computed(() => {
    const data = this.data();
    if (!data) {
      return [];
    }

    const byPeriod = new Map(data.citas.evolucion.map((p) => [p.periodo, p]));

    // Por dia se rellenan los dias sin citas con 0, para que el eje de
    // tiempo no se vea "comprimido" y el cero sea visible. Semana/mes
    // muestran solo los periodos con datos.
    if (data.periodo.agrupado_por !== 'day') {
      return data.citas.evolucion;
    }

    const points = [];
    for (let day = data.periodo.desde; day <= data.periodo.hasta; day = shiftDays(day, 1)) {
      points.push(byPeriod.get(day) ?? { periodo: day, total: 0, ia: 0, manual: 0 });
    }
    return points;
  });

  readonly evolutionSeries = computed<BarChartSeries[]>(() => {
    const points = this.evolutionPoints();
    return [
      { name: 'Asistente (IA)', color: COLOR_IA, values: points.map((p) => p.ia) },
      { name: 'Manual', color: COLOR_MANUAL, values: points.map((p) => p.manual) },
      {
        name: 'Sin clasificar',
        color: COLOR_OTHER,
        values: points.map((p) => Math.max(0, p.total - p.ia - p.manual))
      }
    ];
  });

  readonly originSlices = computed<DonutSlice[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return (Object.keys(ORIGIN_LABEL) as MetricsOrigin[]).map((origin) => ({
      label: ORIGIN_LABEL[origin],
      value: data.ia.por_origen[origin]?.total ?? 0,
      color: ORIGIN_COLOR[origin]
    }));
  });

  readonly stateRows = computed(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    const total = data.citas.total;
    return Object.entries(data.citas.por_estado).map(([state, count]) => ({
      key: state,
      label: STATE_LABEL[state] ?? state,
      color: STATE_COLOR[state] ?? COLOR_OTHER,
      count,
      percent: total ? Math.round((count * 1000) / total) / 10 : 0
    }));
  });

  readonly serviceRows = computed(() => {
    const rows = this.data()?.rendimiento.servicios_mas_agendados ?? [];
    const max = Math.max(1, ...rows.map((r) => r.total));
    return rows.map((r) => ({ ...r, width: (r.total / max) * 100 }));
  });

  readonly weekdayLabels = computed(() =>
    (this.data()?.rendimiento.citas_por_dia_semana ?? []).map((d) => d.dia.slice(0, 3))
  );
  readonly weekdaySeries = computed<BarChartSeries[]>(() => [
    {
      name: 'Citas',
      color: COLOR_IA,
      values: (this.data()?.rendimiento.citas_por_dia_semana ?? []).map((d) => d.total)
    }
  ]);

  readonly hourLabels = computed(() =>
    (this.data()?.rendimiento.citas_por_hora ?? []).map((h) => `${String(h.hora).padStart(2, '0')}h`)
  );
  readonly hourSeries = computed<BarChartSeries[]>(() => [
    {
      name: 'Citas',
      color: COLOR_MANUAL,
      values: (this.data()?.rendimiento.citas_por_hora ?? []).map((h) => h.total)
    }
  ]);

  readonly sortedBusinesses = computed(() => {
    const rows = this.data()?.negocios ?? [];
    return [...rows].sort((a, b) => b.citas_en_periodo - a.citas_en_periodo);
  });

  readonly activeAlerts = computed<MetricsAlert[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return this.isGlobal() ? (data.alertas ?? []) : (data.negocio?.alertas ?? []);
  });

  readonly conversionBars = computed(() => {
    const convs = this.data()?.ia.conversaciones;
    if (!convs) {
      return [];
    }
    const max = Math.max(1, convs.iniciadas);
    return [
      { label: 'Conversaciones iniciadas', value: convs.iniciadas, width: 100, color: COLOR_MANUAL },
      { label: 'Terminaron en cita', value: convs.con_cita, width: (convs.con_cita / max) * 100, color: COLOR_IA },
      {
        label: 'Necesitaron a una persona',
        value: convs.transferidas_a_humano,
        width: (convs.transferidas_a_humano / max) * 100,
        color: '#e0a526'
      }
    ];
  });

  ngOnInit(): void {
    void this.loadBusinesses();
    void this.load();
  }

  private async loadBusinesses(): Promise<void> {
    try {
      this.businesses.set(await firstValueFrom(this.apiService.adminListBusinesses()));
    } catch {
      // El selector de negocio es opcional: el panel global funciona sin el.
    }
  }

  async load(refresh = false): Promise<void> {
    this.error.set('');
    this.isLoading.set(true);

    const params = {
      desde: this.desde(),
      hasta: this.hasta(),
      group_by: this.groupBy(),
      comparar: this.comparar(),
      inactividad_dias: this.inactividadDias(),
      refrescar: refresh
    };

    try {
      const businessId = this.businessId();
      const response = businessId
        ? await firstValueFrom(this.apiService.adminGetBusinessMetrics(businessId, params))
        : await firstValueFrom(this.apiService.adminGetGlobalMetrics(params));
      this.data.set(response);
    } catch (error: unknown) {
      const detail = (error as { error?: { detail?: unknown } })?.error?.detail;
      this.error.set(typeof detail === 'string' ? detail : 'No se pudieron cargar las metricas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setPreset(preset: PeriodPreset): void {
    this.preset.set(preset);

    if (preset !== 'custom') {
      const today = toIsoDate(new Date());
      this.hasta.set(today);
      this.desde.set(shiftDays(today, -(Number(preset) - 1)));
      void this.load();
    }
  }

  onDateChange(): void {
    this.preset.set('custom');
    if (this.desde() && this.hasta() && this.desde() <= this.hasta()) {
      void this.load();
    } else {
      this.error.set('La fecha inicial no puede ser posterior a la final.');
    }
  }

  setGroupBy(value: MetricsGroupBy): void {
    this.groupBy.set(value);
    void this.load();
  }

  toggleCompare(): void {
    this.comparar.update((v) => !v);
    void this.load();
  }

  selectBusiness(id: string): void {
    this.businessId.set(id);
    void this.load();
  }

  openBusiness(row: MetricsBusinessRow): void {
    this.selectBusiness(row.business_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- formato ---
  formatPeriod(period: string): string {
    const [year, month, day] = period.split('-');
    if (!day) {
      return `${month}/${year.slice(2)}`;
    }
    return `${day}/${month}`;
  }

  percent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value}%`;
  }

  usd(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return `US$ ${value.toFixed(value < 1 ? 4 : 2)}`;
  }

  delta(item: MetricsComparisonItem | undefined, inverse = false): { text: string; tone: 'up' | 'down' | 'flat' } | null {
    if (!item || item.variacion === null) {
      return null;
    }
    if (item.variacion === 0) {
      return { text: 'Sin cambio', tone: 'flat' };
    }
    const sign = item.variacion > 0 ? '+' : '';
    const pct = item.variacion_pct === null ? '' : ` (${sign}${item.variacion_pct}%)`;
    const positive = item.variacion > 0;
    // En indicadores donde subir es malo (cancelacion), el color se invierte.
    const good = inverse ? !positive : positive;
    return { text: `${sign}${item.variacion}${pct}`, tone: good ? 'up' : 'down' };
  }

  alertLabel(type: string): string {
    return ALERT_LABEL[type] ?? type;
  }

  stateBadge(state: string): string {
    return STATE_BADGE_LABEL[state] ?? state;
  }

  weekTotal(row: MetricsBusinessRow): number {
    return row.citas_por_semana[0] ?? 0;
  }

  goBack(): void {
    void this.router.navigateByUrl('/admin');
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
