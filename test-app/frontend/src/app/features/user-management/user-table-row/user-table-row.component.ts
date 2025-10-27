import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';

/**
 * User Table Row Component
 * 
 * Einzelne Zeile in der User-Tabelle
 * Splitting-Grund: Verhindert dass UserListComponent > 400 Zeilen wird
 */
@Component({
  selector: 'app-user-table-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-table-row.component.html',
  styleUrl: './user-table-row.component.css'
})
export class UserTableRowComponent {
  @Input() user!: User;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();

  onEdit() {
    this.edit.emit(this.user);
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this user?')) {
      this.delete.emit(this.user.id!);
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
