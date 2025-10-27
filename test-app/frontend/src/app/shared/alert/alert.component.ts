import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Alert Component
 * 
 * Wiederverwendbare Alert/Notification Component
 * Location: /shared/ (wiederverwendbar!)
 */
@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css'
})
export class AlertComponent {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
