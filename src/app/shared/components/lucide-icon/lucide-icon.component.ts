import { Component, Input } from '@angular/core';

export type LucideIconName =
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'calendar'
  | 'calendar-check'
  | 'calendar-x'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'clock'
  | 'more-vertical'
  | 'phone'
  | 'copy'
  | 'scissors'
  | 'settings'
  | 'bell'
  | 'utensils'
  | 'store'
  | 'log-out'
  | 'refresh-cw'
  | 'plus'
  | 'pencil'
  | 'trash-2'
  | 'shopping-bag'
  | 'clipboard-list'
  | 'user'
  | 'circle-check-big'
  | 'send'
  | 'message-circle'
  | 'volume-2'
  | 'volume-x'
  | 'qr-code'
  | 'download'
  | 'info'
  | 'search'
  | 'map-pin'
  | 'credit-card'
  | 'chart-column'
  | 'users'
  | 'x';

type IconElement =
  | { type: 'path'; d: string }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number; ry?: number };

interface LucideIconData {
  viewBox: string;
  elements: IconElement[];
}

const path = (d: string): IconElement => ({ type: 'path', d });
const circle = (cx: number, cy: number, r: number): IconElement => ({ type: 'circle', cx, cy, r });
const rect = (x: number, y: number, width: number, height: number, rx?: number, ry?: number): IconElement => ({
  type: 'rect',
  x,
  y,
  width,
  height,
  rx,
  ry
});

const LUCIDE_ICONS: Record<LucideIconName, LucideIconData> = {
  mail: {
    viewBox: '0 0 24 24',
    elements: [path('m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7'), path('M2 5h20v14H2z')]
  },
  lock: {
    viewBox: '0 0 24 24',
    elements: [path('M16 11V8a4 4 0 0 0-8 0v3'), path('M4 11h16v10H4z')]
  },
  eye: {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0'
      ),
      path('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6')
    ]
  },
  'eye-off': {
    viewBox: '0 0 24 24',
    elements: [
      path('M10.733 5.076A10.744 10.744 0 0 1 12 5c4.597 0 8.463 2.943 9.542 7a10.523 10.523 0 0 1-4.084 5.073'),
      path('m14.084 14.158-.01.01a3 3 0 0 1-4.242-4.242'),
      path('M17.479 17.499A10.75 10.75 0 0 1 12 19c-4.597 0-8.463-2.943-9.542-7a10.535 10.535 0 0 1 2.679-4.043'),
      path('m2 2 20 20')
    ]
  },
  calendar: {
    viewBox: '0 0 24 24',
    elements: [path('M8 2v3'), path('M16 2v3'), rect(3, 3, 18, 18, 2), path('M3 9h18')]
  },
  'calendar-check': {
    viewBox: '0 0 24 24',
    elements: [
      path('M8 2v3'),
      path('M16 2v3'),
      rect(3, 3, 18, 18, 2),
      path('M3 9h18'),
      path('m9 15 2 2 4-4')
    ]
  },
  'calendar-x': {
    viewBox: '0 0 24 24',
    elements: [
      path('M8 2v3'),
      path('M16 2v3'),
      rect(3, 3, 18, 18, 2),
      path('M3 9h18'),
      path('m14 13-4 4'),
      path('m10 13 4 4')
    ]
  },
  'chevron-left': { viewBox: '0 0 24 24', elements: [path('m15 18-6-6 6-6')] },
  'chevron-right': { viewBox: '0 0 24 24', elements: [path('m9 18 6-6-6-6')] },
  'chevron-down': { viewBox: '0 0 24 24', elements: [path('m6 9 6 6 6-6')] },
  clock: { viewBox: '0 0 24 24', elements: [circle(12, 12, 10), path('M12 6v6l4 2')] },
  'more-vertical': {
    viewBox: '0 0 24 24',
    elements: [circle(12, 12, 1), circle(12, 5, 1), circle(12, 19, 1)]
  },
  phone: {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384'
      )
    ]
  },
  copy: {
    viewBox: '0 0 24 24',
    elements: [rect(8, 8, 14, 14, 2, 2), path('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2')]
  },
  scissors: {
    viewBox: '0 0 24 24',
    elements: [
      circle(6, 6, 3),
      path('M8.12 8.12 12 12'),
      path('M20 4 8.12 15.88'),
      circle(6, 18, 3),
      path('M14.8 14.8 20 20')
    ]
  },
  settings: {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'
      ),
      circle(12, 12, 3)
    ]
  },
  bell: {
    viewBox: '0 0 24 24',
    elements: [
      path('M10.268 21a2 2 0 0 0 3.464 0'),
      path(
        'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'
      )
    ]
  },
  'map-pin': {
    viewBox: '0 0 24 24',
    elements: [
      path('M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'),
      circle(12, 10, 3)
    ]
  },
  utensils: {
    viewBox: '0 0 24 24',
    elements: [
      path('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2'),
      path('M7 2v20'),
      path('M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7')
    ]
  },
  store: {
    viewBox: '0 0 24 24',
    elements: [
      path('M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5'),
      path(
        'M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244'
      ),
      path('M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05')
    ]
  },
  'log-out': {
    viewBox: '0 0 24 24',
    elements: [path('m16 17 5-5-5-5'), path('M21 12H9'), path('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4')]
  },
  'refresh-cw': {
    viewBox: '0 0 24 24',
    elements: [
      path('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'),
      path('M21 3v5h-5'),
      path('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'),
      path('M8 16H3v5')
    ]
  },
  plus: { viewBox: '0 0 24 24', elements: [path('M5 12h14'), path('M12 5v14')] },
  pencil: {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'
      ),
      path('m15 5 4 4')
    ]
  },
  'trash-2': {
    viewBox: '0 0 24 24',
    elements: [
      path('M10 11v6'),
      path('M14 11v6'),
      path('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'),
      path('M3 6h18'),
      path('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')
    ]
  },
  'shopping-bag': {
    viewBox: '0 0 24 24',
    elements: [
      path('M16 10a4 4 0 0 1-8 0'),
      path('M3.103 6.034h17.794'),
      path(
        'M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z'
      )
    ]
  },
  'clipboard-list': {
    viewBox: '0 0 24 24',
    elements: [
      rect(8, 2, 8, 4, 1, 1),
      path('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'),
      path('M12 11h4'),
      path('M12 16h4'),
      path('M8 11h.01'),
      path('M8 16h.01')
    ]
  },
  user: {
    viewBox: '0 0 24 24',
    elements: [path('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), circle(12, 7, 4)]
  },
  'circle-check-big': {
    viewBox: '0 0 24 24',
    elements: [path('M21.801 10A10 10 0 1 1 17 3.335'), path('m9 11 3 3L22 4')]
  },
  send: {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z'
      ),
      path('m21.854 2.147-10.94 10.939')
    ]
  },
  'message-circle': {
    viewBox: '0 0 24 24',
    elements: [path('M7.9 20A9 9 0 1 0 4 16.1L2 22Z')]
  },
  'volume-2': {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'
      ),
      path('M16 9a5 5 0 0 1 0 6'),
      path('M19.364 18.364a9 9 0 0 0 0-12.728')
    ]
  },
  'volume-x': {
    viewBox: '0 0 24 24',
    elements: [
      path(
        'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'
      ),
      path('m22 8-6 6'),
      path('m16 8 6 6')
    ]
  },
  'qr-code': {
    viewBox: '0 0 24 24',
    elements: [
      rect(3, 3, 5, 5, 1),
      rect(16, 3, 5, 5, 1),
      rect(3, 16, 5, 5, 1),
      path('M21 16h-3a2 2 0 0 0-2 2v3'),
      path('M21 21v.01'),
      path('M12 7v3a2 2 0 0 1-2 2H7'),
      path('M3 12h.01'),
      path('M12 3h.01'),
      path('M12 16v.01'),
      path('M16 12h1'),
      path('M21 12v.01'),
      path('M12 21v-1')
    ]
  },
  download: {
    viewBox: '0 0 24 24',
    elements: [path('M12 15V3'), path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), path('m7 10 5 5 5-5')]
  },
  info: {
    viewBox: '0 0 24 24',
    elements: [circle(12, 12, 10), path('M12 16v-4'), path('M12 8h.01')]
  },
  search: {
    viewBox: '0 0 24 24',
    elements: [circle(11, 11, 8), path('m21 21-4.3-4.3')]
  },
  'credit-card': {
    viewBox: '0 0 24 24',
    elements: [rect(2, 5, 20, 14, 2, 2), path('M2 10h20')]
  },
  x: { viewBox: '0 0 24 24', elements: [path('M18 6 6 18'), path('m6 6 12 12')] },
  users: {
    viewBox: '0 0 24 24',
    elements: [
      path('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
      circle(9, 7, 4),
      path('M22 21v-2a4 4 0 0 0-3-3.87'),
      path('M16 3.13a4 4 0 0 1 0 7.75')
    ]
  },
  'chart-column': {
    viewBox: '0 0 24 24',
    elements: [path('M3 3v16a2 2 0 0 0 2 2h16'), path('M18 17V9'), path('M13 17V5'), path('M8 17v-3')]
  }
};

@Component({
  selector: 'app-lucide-icon',
  template: `
    <svg
      [attr.viewBox]="icon().viewBox"
      fill="none"
      [attr.width]="size"
      [attr.height]="size"
      [attr.stroke-width]="strokeWidth"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (el of icon().elements; track $index) {
        @if (el.type === 'path') {
          <path [attr.d]="el.d" />
        } @else if (el.type === 'circle') {
          <circle [attr.cx]="el.cx" [attr.cy]="el.cy" [attr.r]="el.r" />
        } @else {
          <rect [attr.x]="el.x" [attr.y]="el.y" [attr.width]="el.width" [attr.height]="el.height" [attr.rx]="el.rx" [attr.ry]="el.ry" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      line-height: 0;
    }

    svg {
      display: block;
    }
  `
})
export class LucideIconComponent {
  @Input({ required: true }) name!: LucideIconName;
  @Input() size = 24;
  @Input() strokeWidth = 1.75;

  icon(): LucideIconData {
    return LUCIDE_ICONS[this.name] ?? LUCIDE_ICONS.mail;
  }
}
