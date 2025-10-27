import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserTableRowComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  onEdit(user: User) {
    this.edit.emit(user);
  }

  onDelete(userId: string) {
    this.delete.emit(userId);
  }

  onRefresh() {
    this.refresh.emit();
  }
}
