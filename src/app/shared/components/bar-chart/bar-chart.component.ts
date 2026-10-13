import { Component, computed, input } from '@angular/core';

export interface BarChartSeries {
  name: string;
  color: string;
  values: number[];
}

/**
 * Grafico de barras verticales en SVG propio (el proyecto no usa una libreria
 * de graficos). Apila las series en cada barra. Cada barra lleva un <title>
 * con el detalle para el tooltip nativo y para lectores de pantalla.
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    @if (isEmpty()) {
      <p class="empty">Sin datos en este periodo.</p>
    } @else {
      <ul class="legend">
        @for (item of series(); track item.name) {
          <li><span class="swatch" [style.background]="item.color"></span>{{ item.name }}</li>
        }
      </ul>
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="ariaLabel()">
        @for (tick of ticks(); track tick.value) {
          <line [attr.x1]="left" [attr.x2]="width" [attr.y1]="tick.y" [attr.y2]="tick.y" class="grid" />
          <text [attr.x]="left - 6" [attr.y]="tick.y + 4" class="axis" text-anchor="end">{{ tick.value }}</text>
        }
        @for (bar of bars(); track bar.index) {
          <g>
            <title>{{ bar.title }}</title>
            @for (segment of bar.segments; track segment.color) {
              <rect [attr.x]="bar.x" [attr.y]="segment.y" [attr.width]="bar.width" [attr.height]="segment.height" [attr.fill]="segment.color" rx="2" />
            }
          </g>
          @if (bar.showLabel) {
            <text [attr.x]="bar.x + bar.width / 2" [attr.y]="height - 8" class="axis" text-anchor="middle">{{ bar.label }}</text>
          }
        }
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .grid {
      stroke: #e3e9f0;
      stroke-width: 1;
    }
    .axis {
      fill: #6b7385;
      font-size: 11px;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.9rem;
      list-style: none;
      margin: 0 0 0.5rem;
      padding: 0;
      font-size: 0.8rem;
      color: #4a5163;
    }
    .swatch {
      display: inline-block;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 3px;
      margin-right: 0.35rem;
    }
    .empty {
      margin: 0;
      padding: 1.5rem 0;
      text-align: center;
      color: #6b7385;
      font-size: 0.9rem;
    }
  `
})
export class BarChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<BarChartSeries[]>();
  readonly ariaLabel = input('Grafico de barras');

  readonly width = 640;
  readonly height = 220;
  readonly left = 34;
  private readonly top = 10;
  private readonly bottom = 28;

  readonly isEmpty = computed(() => this.labels().length === 0 || this.maxTotal() === 0);

  private readonly maxTotal = computed(() => {
    const totals = this.labels().map((_, i) => this.series().reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
    return Math.max(0, ...totals);
  });

  /** Paso "redondo" (1, 2, 5, 10 x 10^n) del eje Y, para que no salgan ticks como 12.5. */
  private readonly step = computed(() => {
    const max = this.maxTotal();
    if (max <= 4) {
      return 1;
    }
    const raw = max / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? raw;
  });

  private readonly niceMax = computed(() => {
    const max = this.maxTotal();
    return max <= 4 ? Math.max(max, 1) : Math.ceil(max / this.step()) * this.step();
  });

  private scale(value: number): number {
    const plotHeight = this.height - this.top - this.bottom;
    return (value / this.niceMax()) * plotHeight;
  }

  readonly ticks = computed(() => {
    const step = this.step();
    const count = Math.round(this.niceMax() / step);
    return Array.from({ length: count + 1 }, (_, i) => {
      const value = step * i;
      return { value, y: this.height - this.bottom - this.scale(value) };
    });
  });

  readonly bars = computed(() => {
    const labels = this.labels();
    const slot = (this.width - this.left) / Math.max(labels.length, 1);
    const barWidth = Math.max(Math.min(slot * 0.7, 36), 2);
    const everyN = Math.max(1, Math.ceil(labels.length / 10));

    return labels.map((label, index) => {
      let accumulated = 0;
      const segments = this.series()
        .map((s) => {
          const value = s.values[index] ?? 0;
          const heightPx = this.scale(value);
          const y = this.height - this.bottom - this.scale(accumulated) - heightPx;
          accumulated += value;
          return { color: s.color, y, height: heightPx };
        })
        .filter((segment) => segment.height > 0);

      const detail = this.series()
        .map((s) => `${s.name}: ${s.values[index] ?? 0}`)
        .join(' · ');

      return {
        index,
        label,
        showLabel: index % everyN === 0,
        x: this.left + slot * index + (slot - barWidth) / 2,
        width: barWidth,
        segments,
        title: `${label} — ${detail}`
      };
    });
  });
}
