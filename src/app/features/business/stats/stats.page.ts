import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BusinessStatsResponse, MetricsComparisonItem, MetricsOrigin } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';
import { BarChartComponent, BarChartSeries } from '../../../shared/components/bar-chart/bar-chart.component';
import { DonutChartComponent, DonutSlice } from '../../../shared/components/donut-chart/donut-chart.component';
import { CopCurrencyPipe } from '../../../shared/pipes/cop-currency.pipe';
import { formatHourLabel } from '../../../shared/utils/date-utils';

export type StatsPeriod = '7' | '30' | 'month' | 'last-month';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const COLOR_PRINCIPAL = '#03a580';
const COLOR_SECUNDARIO = '#1d293d';

const ORIGIN_LABEL: Record<MetricsOrigin, string> = {
  ai: 'Asistente de GoAgenda',
  manual: 'Agendadas por ti',
  web: 'Web',
  unknown: 'Sin clasificar'
};
const ORIGIN_COLOR: Record<MetricsOrigin, string> = {
  ai: COLOR_PRINCIPAL,
  manual: COLOR_SECUNDARIO,
  web: '#e0a526',
  unknown: '#9aa7b8'
};

export const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes pasado' }
];

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Rango [desde, hasta] (inclusive, YYYY-MM-DD) del periodo elegido, en la fecha local del dispositivo. */
export function periodRange(period: StatsPeriod, today: Date = new Date()): { desde: string; hasta: string } {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (period) {
    case '7':
      return { desde: isoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 6)), hasta: isoDate(base) };
    case 'month':
      return { desde: isoDate(new Date(base.getFullYear(), base.getMonth(), 1)), hasta: isoDate(base) };
    case 'last-month':
      return {
        desde: isoDate(new Date(base.getFullYear(), base.getMonth() - 1, 1)),
        hasta: isoDate(new Date(base.getFullYear(), base.getMonth(), 0))
      };
    default:
      return { desde: isoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() - 29)), hasta: isoDate(base) };
  }
}

@Component({
  selector: 'app-stats-page',
  imports: [BarChartComponent, DonutChartComponent, LucideIconComponent, CopCurrencyPipe],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.css'
})
export class StatsPageComponent implements OnInit {
  private readonly apiService = inject(GoagendaApiService);
  private readonly sessionService = inject(SessionService);

  readonly periods = PERIOD_OPTIONS;
  readonly period = signal<StatsPeriod>('30');
  readonly data = signal<BusinessStatsResponse | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal('');

  /** «16 sep – 15 oct 2026»: el periodo que se esta viendo, para que no haya duda. */
  readonly periodCaption = computed(() => {
    const periodo = this.data()?.periodo;
    if (!periodo) {
      return '';
    }
    const corto = (iso: string) => {
      const [, mes, dia] = iso.split('-').map(Number);
      return `${dia} ${MESES_CORTOS[mes - 1]}`;
    };
    return `${corto(periodo.desde)} – ${corto(periodo.hasta)} ${periodo.hasta.slice(0, 4)}`;
  });

  /** Embudo del asistente: de las conversaciones atendidas, cuantas terminaron en cita o pasaron a una persona. */
  readonly funnelRows = computed(() => {
    const convs = this.data()?.asistente.conversaciones;
    if (!convs) {
      return [];
    }
    const max = Math.max(1, convs.iniciadas);
    return [
      { label: 'Conversaciones atendidas', value: convs.iniciadas, width: 100, color: COLOR_SECUNDARIO },
      { label: 'Terminaron en una cita', value: convs.con_cita, width: (convs.con_cita / max) * 100, color: COLOR_PRINCIPAL },
      { label: 'Pasaron a una persona', value: convs.transferidas_a_humano, width: (convs.transferidas_a_humano / max) * 100, color: '#e0a526' }
    ];
  });

  /** Las citas anteriores al seguimiento de origen no se pueden clasificar: se avisa para no confundir el porcentaje. */
  readonly hasUnclassified = computed(() => (this.data()?.asistente.por_origen.unknown?.total ?? 0) > 0);

  readonly hasActivity = computed(() => (this.data()?.tarjetas.citas_creadas ?? 0) > 0);

  readonly originSlices = computed<DonutSlice[]>(() => {
    const origen = this.data()?.asistente.por_origen;
    if (!origen) {
      return [];
    }
    return (Object.keys(ORIGIN_LABEL) as MetricsOrigin[])
      .map((key) => ({ label: ORIGIN_LABEL[key], value: origen[key]?.total ?? 0, color: ORIGIN_COLOR[key] }))
      .filter((slice) => slice.value > 0);
  });

  readonly evolutionLabels = computed(() => (this.data()?.citas.evolucion ?? []).map((p) => {
      const [, mes, dia] = p.periodo.split('-').map(Number);
      return `${dia} ${MESES_CORTOS[mes - 1]}`;
    }));
  readonly evolutionSeries = computed<BarChartSeries[]>(() => [
    { name: 'Citas', color: COLOR_PRINCIPAL, values: (this.data()?.citas.evolucion ?? []).map((p) => p.total) }
  ]);

  readonly weekdayLabels = computed(() =>
    (this.data()?.rendimiento.citas_por_dia_semana ?? []).map((d) => d.dia.slice(0, 3))
  );
  readonly weekdaySeries = computed<BarChartSeries[]>(() => [
    {
      name: 'Citas',
      color: COLOR_PRINCIPAL,
      values: (this.data()?.rendimiento.citas_por_dia_semana ?? []).map((d) => d.total)
    }
  ]);

  readonly hourLabels = computed(() => (this.data()?.rendimiento.citas_por_hora ?? []).map((h) => formatHourLabel(h.hora)));
  readonly hourSeries = computed<BarChartSeries[]>(() => [
    { name: 'Citas', color: COLOR_SECUNDARIO, values: (this.data()?.rendimiento.citas_por_hora ?? []).map((h) => h.total) }
  ]);

  readonly serviceRows = computed(() => {
    const rows = this.data()?.rendimiento.servicios_mas_agendados ?? [];
    const max = Math.max(1, ...rows.map((r) => r.total));
    return rows.map((r) => ({ ...r, width: (r.total / max) * 100 }));
  });

  readonly busiestWeekday = computed(() => {
    const dias = this.data()?.rendimiento.citas_por_dia_semana ?? [];
    const top = dias.reduce<{ dia: string; total: number } | null>((m, d) => (!m || d.total > m.total ? d : m), null);
    return top && top.total > 0 ? top : null;
  });

  ngOnInit(): void {
    void this.load();
  }

  selectPeriod(period: StatsPeriod): void {
    if (this.period() === period) {
      return;
    }
    this.period.set(period);
    void this.load();
  }

  async load(refresh = false): Promise<void> {
    const businessId = this.sessionService.businessId();
    if (!businessId) {
      return;
    }

    this.error.set('');
    this.isLoading.set(true);
    const { desde, hasta } = periodRange(this.period());

    try {
      this.data.set(
        await firstValueFrom(
          this.apiService.getBusinessStats(businessId, {
            desde,
            hasta,
            group_by: 'day',
            comparar: true,
            refrescar: refresh
          })
        )
      );
    } catch {
      this.error.set('No se pudieron cargar las estadísticas. Inténtalo de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  percent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${String(value).replace('.', ',')} %`;
  }

  /**
   * Variacion frente al periodo anterior: el valor («+12 %») va en el chip y la aclaracion («vs. periodo
   * anterior») aparte, para que el chip nunca se parta en dos lineas.
   */
  delta(
    item: MetricsComparisonItem | undefined,
    inverse = false
  ): { value: string; caption: string; tone: 'up' | 'down' | 'flat' | 'none' } {
    if (!item || item.variacion_pct === null || item.variacion_pct === undefined) {
      return { value: '', caption: 'Sin datos del periodo anterior', tone: 'none' };
    }
    if (item.variacion_pct === 0) {
      return { value: 'Igual', caption: 'que el periodo anterior', tone: 'flat' };
    }
    const subio = item.variacion_pct > 0;
    const valor = `${subio ? '▲ +' : '▼ '}${String(item.variacion_pct).replace('.', ',')} %`;
    // En algunas metricas (cancelaciones) subir es malo.
    const bueno = inverse ? !subio : subio;
    return { value: valor, caption: 'vs. periodo anterior', tone: bueno ? 'up' : 'down' };
  }
}
