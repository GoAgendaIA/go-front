import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { TimeFieldComponent } from '../time-field/time-field.component';

export interface DayRowView {
  key: string;
  label: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  lunchStart: string;
  lunchEnd: string;
}

@Component({
  selector: 'app-weekly-hours-editor',
  imports: [FormsModule, LucideIconComponent, TimeFieldComponent],
  templateUrl: './weekly-hours-editor.component.html',
  styleUrl: './weekly-hours-editor.component.css'
})
export class WeeklyHoursEditorComponent {
  @Input({ required: true }) days!: DayRowView[];
  @Input() isLoading = false;
  @Output() readonly dayToggled = new EventEmitter<DayRowView>();
  @Output() readonly dayTimesChanged = new EventEmitter<DayRowView>();

  toggleDay(day: DayRowView): void {
    this.dayToggled.emit(day);
  }

  onTimeChange(day: DayRowView): void {
    this.dayTimesChanged.emit(day);
  }
}
