import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BusinessStatsResponse } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { SessionService } from '../../../core/services/session.service';
import { StatsPageComponent, periodRange } from './stats.page';

const DATOS: BusinessStatsResponse = {
  periodo: { desde: '2026-09-16', hasta: '2026-10-15', anterior: { desde: '2026-08-17', hasta: '2026-09-15' }, agrupado_por: 'day' },
  generado_en: '2026-10-15T12:00:00Z',
  tarjetas: { citas_creadas: 12, clientes_unicos: 8, citas_ia: 9, citas_manuales: 3 },
  clientes: { total_registrados: 20, nuevos_en_periodo: 5, recurrentes: 3, sin_volver: { dias: 45, total: 4 } },
  citas: {
    total: 12,
    por_estado: { pending: 0, pending_payment: 0, confirmed: 10, completed: 0, cancelled: 2 },
    reprogramadas: 1,
    tasa_cancelacion: 16.7,
    porcentaje_completadas: 0,
    pagos_vencidos: 0,
    evolucion: [{ periodo: '2026-10-05', total: 4, ia: 3, manual: 1 }]
  },
  asistente: {
    porcentaje_citas_ia: 75,
    por_origen: {
      ai: { total: 9, porcentaje: 75 },
      manual: { total: 3, porcentaje: 25 },
      web: { total: 0, porcentaje: 0 },
      unknown: { total: 0, porcentaje: 0 }
    },
    canceladas_por_ia: 0,
    reprogramadas_por_ia: 0,
    conversaciones: { iniciadas: 20, con_cita: 9, transferidas_a_humano: 2, conversion: 45 }
  },
  rendimiento: {
    servicios_mas_agendados: [
      { service_id: 's1', nombre: 'Corte', total: 8, porcentaje: 80 },
      { service_id: 's2', nombre: 'Barba', total: 2, porcentaje: 20 }
    ],
    citas_por_dia_semana: [
      { dia: 'lunes', total: 1 },
      { dia: 'sabado', total: 7 }
    ],
    citas_por_hora: [{ hora: 14, total: 5 }],
    domicilios: { total: 0, porcentaje: 0 },
    ingresos_estimados: { completadas: 150000, por_realizar: 90000, citas_por_realizar: 6, recargos_domicilio: 0 }
  },
  comparacion: {
    citas_creadas: { actual: 12, anterior: 10, variacion: 2, variacion_pct: 20 },
    tasa_cancelacion: { actual: 16.7, anterior: 10, variacion: 6.7, variacion_pct: 67 }
  }
};

function montar(respuesta: unknown = of(DATOS)) {
  const api = { getBusinessStats: vi.fn().mockReturnValue(respuesta) };
  TestBed.configureTestingModule({
    providers: [
      { provide: GoagendaApiService, useValue: api },
      { provide: SessionService, useValue: { businessId: () => 'biz-1' } }
    ]
  });
  const fixture = TestBed.createComponent(StatsPageComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, api };
}

describe('periodRange', () => {
  const hoy = new Date(2026, 9, 15); // 15 de octubre de 2026

  it('ultimos 7 y 30 dias incluyen hoy', () => {
    expect(periodRange('7', hoy)).toEqual({ desde: '2026-10-09', hasta: '2026-10-15' });
    expect(periodRange('30', hoy)).toEqual({ desde: '2026-09-16', hasta: '2026-10-15' });
  });

  it('este mes llega hasta hoy y el mes pasado es el mes completo', () => {
    expect(periodRange('month', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-15' });
    expect(periodRange('last-month', hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
  });

  it('el mes pasado cruza el cambio de año', () => {
    expect(periodRange('last-month', new Date(2027, 0, 10))).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });
});

describe('StatsPageComponent', () => {
  it('pide las estadisticas del negocio con comparacion y el periodo por defecto (30 dias)', async () => {
    const { api } = montar();
    await Promise.resolve();
    const [businessId, params] = api.getBusinessStats.mock.calls[0];
    expect(businessId).toBe('biz-1');
    expect(params.comparar).toBe(true);
    expect(params.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('muestra las cifras principales y los ingresos', async () => {
    const { fixture } = montar();
    await Promise.resolve();
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Citas agendadas');
    expect(texto).toContain('12');
    expect(texto.replace(/\s+/g, ' ')).toContain('150.000');
    expect(texto).toContain('6 citas futuras');
    expect(texto).toContain('75 %');
    expect(texto).toContain('Corte');
  });

  it('no muestra datos internos de la plataforma', async () => {
    const { fixture } = montar();
    await Promise.resolve();
    fixture.detectChanges();
    const texto = ((fixture.nativeElement as HTMLElement).textContent ?? '').toLowerCase();
    for (const prohibido of ['costo', 'token', 'presupuesto', 'usd']) {
      expect(texto).not.toContain(prohibido);
    }
  });

  it('el dia mas fuerte sale de las citas por dia de la semana', async () => {
    const { component } = montar();
    await Promise.resolve();
    expect(component.busiestWeekday()).toEqual({ dia: 'sabado', total: 7 });
  });

  it('compara con el periodo anterior: subir cancelaciones se marca como malo', async () => {
    const { component } = montar();
    expect(component.delta(DATOS.comparacion?.citas_creadas)).toEqual({
      text: '+20 % frente al periodo anterior',
      tone: 'up'
    });
    expect(component.delta(DATOS.comparacion?.tasa_cancelacion, true).tone).toBe('down');
    expect(component.delta(undefined).tone).toBe('none');
    expect(component.delta({ actual: 1, anterior: 1, variacion: 0, variacion_pct: 0 }).tone).toBe('flat');
  });

  it('cambiar de periodo vuelve a consultar; elegir el mismo no', async () => {
    const { component, api } = montar();
    await Promise.resolve();
    component.selectPeriod('30');
    expect(api.getBusinessStats).toHaveBeenCalledTimes(1);
    component.selectPeriod('7');
    expect(api.getBusinessStats).toHaveBeenCalledTimes(2);
    expect(api.getBusinessStats.mock.calls[1][1].desde).not.toBe(api.getBusinessStats.mock.calls[0][1].desde);
  });

  it('informa el error y permite reintentar', async () => {
    const { component, fixture } = montar(throwError(() => new Error('500')));
    await Promise.resolve();
    fixture.detectChanges();
    expect(component.error()).toContain('No se pudieron cargar');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reintentar');
  });

  it('sin citas en el periodo explica que aun no hay datos', async () => {
    const vacio = { ...DATOS, tarjetas: { ...DATOS.tarjetas, citas_creadas: 0 } };
    const { fixture } = montar(of(vacio));
    await Promise.resolve();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aún no hay citas');
  });
});
