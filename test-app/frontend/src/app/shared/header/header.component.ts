import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Header Component
 * 
 * Wiederverwendbare Header-Component für App-Titel und Untertitel
 * Location: /shared/ (wiederverwendbar!)
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() title: string = 'Application';
  @Input() subtitle: string = '';
}
