import { Component, computed, input } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Grafico de dona en SVG propio, con leyenda y porcentajes. */
@Component({
  selector: 'app-donut-chart',
  template: `
    @if (total() === 0) {
      <p class="empty">Sin datos en este periodo.</p>
    } @else {
      <div class="wrap">
        <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="ariaLabel()">
          <circle cx="60" cy="60" r="44" fill="none" stroke="#eef2f6" stroke-width="18" />
          @for (arc of arcs(); track arc.label) {
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              [attr.stroke]="arc.color"
              stroke-width="18"
              [attr.stroke-dasharray]="arc.dash"
              [attr.stroke-dashoffset]="arc.offset"
              transform="rotate(-90 60 60)"
            >
              <title>{{ arc.label }}: {{ arc.value }} ({{ arc.percent }}%)</title>
            </circle>
          }
          <text x="60" y="58" text-anchor="middle" class="center-value">{{ total() }}</text>
          <text x="60" y="74" text-anchor="middle" class="center-label">{{ centerLabel() }}</text>
        </svg>
        <ul class="legend">
          @for (arc of arcs(); track arc.label) {
            <li>
              <span class="swatch" [style.background]="arc.color"></span>
              <span class="name">{{ arc.label }}</span>
              <strong>{{ arc.value }}</strong>
              <span class="pct">{{ arc.percent }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .wrap {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      flex-wrap: wrap;
    }
    svg {
      width: 9.5rem;
      height: 9.5rem;
      flex-shrink: 0;
    }
    .center-value {
      font-size: 20px;
      font-weight: 800;
      fill: #0e182c;
    }
    .center-label {
      font-size: 8px;
      fill: #6b7385;
    }
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.45rem;
      flex: 1;
      min-width: 9rem;
      font-size: 0.85rem;
      color: #2a3144;
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .swatch {
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .name {
      flex: 1;
    }
    .pct {
      color: #6b7385;
      min-width: 3rem;
      text-align: right;
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
export class DonutChartComponent {
  readonly slices = input.required<DonutSlice[]>();
  readonly centerLabel = input('citas');
  readonly ariaLabel = input('Grafico de dona');

  private readonly circumference = 2 * Math.PI * 44;

  readonly total = computed(() => this.slices().reduce((sum, s) => sum + s.value, 0));

  readonly arcs = computed(() => {
    const total = this.total();
    let consumed = 0;

    return this.slices()
      .filter((s) => s.value > 0)
      .map((s) => {
        const length = (s.value / total) * this.circumference;
        const arc = {
          ...s,
          percent: Math.round((s.value * 1000) / total) / 10,
          dash: `${length} ${this.circumference - length}`,
          offset: -consumed
        };
        consumed += length;
        return arc;
      });
  });
}
