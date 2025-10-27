import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 * Features: Clientseitige Filterung nach Name und E-Mail
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserTableRowComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnChanges {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  filteredUsers: User[] = [];
  searchTerm: string = '';
  private debounceTimeout: any;

  ngOnInit() {
    this.filteredUsers = [...this.users];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users']) {
      this.filterUsers();
    }
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    
    // Debounce search for better performance
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.filterUsers();
    }, 300);
  }

  filterUsers() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.name.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower)
    );
  }

  clearSearch() {
    this.searchTerm = '';
    this.filterUsers();
  }

  onEdit(user: User) {
    this.edit.emit(user);
  }

  onDelete(userId: string) {
    this.delete.emit(userId);
  }

  onRefresh() {
    this.refresh.emit();
  }

  get hasSearchResults(): boolean {
    return this.filteredUsers.length > 0;
  }

  get isFiltered(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  get resultCount(): string {
    const filtered = this.filteredUsers.length;
    const total = this.users.length;
    
    if (this.isFiltered) {
      return `${filtered} von ${total} Benutzern`;
    }
    return `${total} Benutzer`;
  }
}