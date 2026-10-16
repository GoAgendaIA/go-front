import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { AnalyticsPageComponent } from './analytics.page';

const por = (total: number) => ({ total, porcentaje: null });

function datos(ia: Record<string, unknown>, extras: Record<string, unknown> = {}): any {
  return {
    periodo: { desde: '2026-09-16', hasta: '2026-10-15', anterior: null, agrupado_por: 'day' },
    criterios: {},
    generado_en: '2026-10-15T12:00:00Z',
    actualizacion_segundos: 60,
    cache: false,
    tarjetas: { citas_creadas: 10, clientes_unicos: 6, citas_ia: 4, citas_manuales: 6 },
    clientes: { total_registrados: 8, nuevos_en_periodo: 2, recurrentes: 2, sin_volver: { dias: 45, total: 1 } },
    citas: {
      total: 10,
      por_estado: { pending: 0, pending_payment: 0, confirmed: 9, completed: 0, cancelled: 1 },
      reprogramadas: 0, tasa_cancelacion: 10, porcentaje_completadas: 0, pagos_vencidos: 0, evolucion: []
    },
    ia: {
      por_origen: { ai: por(4), manual: por(6), web: por(0), unknown: por(0) },
      porcentaje_citas_ia: 40, canceladas_por_ia: 0, reprogramadas_por_ia: 0,
      conversaciones: { iniciadas: 8, con_cita: 4, transferidas_a_humano: 0, conversion: 50 },
      costo_usd: 0.6, costo_por_cita_ia_usd: 0.15,
      tokens: { llamadas: 0, entrada: 0, cacheados: 0, salida: 0, porcentaje_cache: null, re_llamadas_anti_alucinacion: 0,
                llamadas_por_conversacion: null, tokens_entrada_por_conversacion: null, costo_por_conversacion_usd: null },
      ...ia
    },
    rendimiento: {
      servicios_mas_agendados: [], citas_por_dia_semana: [], citas_por_hora: [],
      domicilios: { total: 0, porcentaje: 0 },
      ingresos_estimados: { completadas: 0, por_realizar: 0, recargos_domicilio: 0 }
    },
    negocios: [],
    adopcion: { negocios_registrados: 0, negocios_activos: 0, negocios_inactivos: 0, negocios_sin_uso: 0, porcentaje_activos: null,
                con_servicios: 0, con_horario: 0, usan_ia: 0, solo_agendamiento_manual: 0,
                dias_hasta_primera_cita: { mediana: null, negocios_medidos: 0 }, dejaron_de_usar: 0, inactividad_dias: 45 },
    alertas: [],
    ...extras
  };
}

async function montar(respuesta: unknown) {
  const api = {
    adminListBusinesses: vi.fn().mockReturnValue(of([])),
    adminGetGlobalMetrics: vi.fn().mockReturnValue(of(respuesta)),
    adminGetBusinessMetrics: vi.fn().mockReturnValue(of(respuesta))
  };
  TestBed.configureTestingModule({ providers: [{ provide: GoagendaApiService, useValue: api }, provideRouter([])] });
  const fixture = TestBed.createComponent(AnalyticsPageComponent);
  fixture.detectChanges();
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, component: fixture.componentInstance, el, texto: (el.textContent ?? '').replace(/\s+/g, ' ') };
}

describe('Costo promedio de IA por cita (COP)', () => {
  it('muestra el promedio en pesos con su calculo y la tasa usada', async () => {
    const { el, texto } = await montar(
      datos({ costo_cop: 2400, costo_por_cita_ia_cop: 600, tasa_cop_por_usd: 4000 })
    );
    const tarjeta = el.querySelector('.cost-card');
    expect(tarjeta).not.toBeNull();
    const t = (tarjeta?.textContent ?? '').replace(/\s+/g, ' ');
    expect(t).toContain('Costo promedio de IA por cita');
    expect(t).toMatch(/\$\s?600/);           // 600 pesos por cita
    expect(t).toMatch(/\$\s?2\.400/);        // costo total en pesos
    expect(t).toContain('Citas agendadas por la IA');
    expect(t).toMatch(/1 US\$ = \$\s?4\.000/);
    expect(texto).toContain('COP_POR_USD');
  });

  it('sin citas de IA no inventa un promedio y lo dice', async () => {
    const { el } = await montar(datos({ costo_cop: 2400, costo_por_cita_ia_cop: null, tasa_cop_por_usd: 4000 }));
    const t = (el.querySelector('.cost-card')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(t).toContain('—');
    expect(t).toContain('Sin citas agendadas por la IA');
  });

  it('con un backend anterior (sin los campos en pesos) no se rompe', async () => {
    const { el } = await montar(datos({}));
    const t = (el.querySelector('.cost-card')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(t).toContain('Costo promedio de IA por cita');
    expect(t).not.toContain('Tasa usada');
  });

  it('compara con el periodo anterior: que el costo suba se marca como malo', async () => {
    const respuesta = datos(
      { costo_cop: 2400, costo_por_cita_ia_cop: 600, tasa_cop_por_usd: 4000 },
      {
        periodo: { desde: '2026-09-16', hasta: '2026-10-15', anterior: { desde: '2026-08-17', hasta: '2026-09-15' }, agrupado_por: 'day' },
        comparacion: { costo_por_cita_ia_cop: { actual: 600, anterior: 400, variacion: 200, variacion_pct: 50 } }
      }
    );
    const { el } = await montar(respuesta);
    const delta = el.querySelector('.cost-card .delta');
    expect(delta?.textContent).toContain('+200');
    expect(delta?.textContent).toContain('vs. periodo anterior');
    expect(delta?.className).toContain('down');
  });

  it('la tabla por negocio muestra el costo por cita en pesos', async () => {
    const fila = {
      business_id: 'b1', nombre: 'Barberia', registrado_en: null, bloqueado: false, onboarding_completado: true,
      estado: 'activo', ultima_actividad: null, configuracion: { servicios_activos: 1, tiene_horario: true }, usa_ia: true,
      citas_en_periodo: 5, citas_ia_en_periodo: 2, citas_manuales_en_periodo: 3, porcentaje_citas_ia: 40,
      tasa_cancelacion: 0, conversion: 50, costo_ia_usd: 0.3, costo_por_cita_ia_cop: 600, dias_hasta_primera_cita: 1,
      citas_por_semana: [1, 0, 0, 0], alertas: []
    };
    const { texto } = await montar(datos({ costo_cop: 1200, costo_por_cita_ia_cop: 600, tasa_cop_por_usd: 4000 }, { negocios: [fila] }));
    expect(texto).toContain('Costo / cita IA');
    expect(texto).toMatch(/Barberia.*\$\s?600/);
  });

  it('cop() da pesos sin decimales y guion si no hay dato', async () => {
    const { component } = await montar(datos({}));
    expect(component.cop(1250).replace(/\s/g, '')).toBe('$1.250');
    expect(component.cop(0).replace(/\s/g, '')).toBe('$0');
    expect(component.cop(null)).toBe('—');
    expect(component.cop(undefined)).toBe('—');
  });
});
