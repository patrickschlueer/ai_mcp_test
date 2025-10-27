import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 * Filter-Logik wurde entfernt und zu separaten Filter-Components verschoben
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
  @Input() filteredUsers: User[] = []; // Gefilterte Users von Parent-Component
  @Input() totalCount: number = 0; // Gesamt-Anzahl für Anzeige
  @Input() showEmptyState: boolean = false; // Zeigt Empty-State wenn keine gefilterten Ergebnisse
  
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();
  @Output() sort = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() bulkAction = new EventEmitter<{action: string, userIds: string[]}>();

  // Bulk-Selection State
  selectedUserIds: Set<string> = new Set();
  selectAll: boolean = false;
  
  // Sort State
  currentSortColumn: string = '';
  currentSortDirection: 'asc' | 'desc' = 'asc';

  /**
   * Gibt die anzuzeigenden Users zurück
   * Verwendet filteredUsers wenn verfügbar, sonst alle users
   */
  get displayUsers(): User[] {
    return this.filteredUsers.length > 0 || this.showEmptyState ? this.filteredUsers : this.users;
  }

  /**
   * Prüft ob alle sichtbaren Users ausgewählt sind
   */
  get allVisibleSelected(): boolean {
    const visibleUsers = this.displayUsers;
    return visibleUsers.length > 0 && visibleUsers.every(user => this.selectedUserIds.has(user.id));
  }

  /**
   * Prüft ob einige aber nicht alle Users ausgewählt sind (für indeterminate state)
   */
  get someSelected(): boolean {
    const visibleUsers = this.displayUsers;
    const selectedVisible = visibleUsers.filter(user => this.selectedUserIds.has(user.id));
    return selectedVisible.length > 0 && selectedVisible.length < visibleUsers.length;
  }

  onEdit(user: User) {
    this.edit.emit(user);
  }

  onDelete(userId: string) {
    this.delete.emit(userId);
    // Entferne aus Selection wenn gelöscht
    this.selectedUserIds.delete(userId);
  }

  onRefresh() {
    this.clearSelection();
    this.refresh.emit();
  }

  /**
   * Sortierung für Spalte umschalten
   */
  onSort(column: string) {
    if (this.currentSortColumn === column) {
      this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortColumn = column;
      this.currentSortDirection = 'asc';
    }
    
    this.sort.emit({
      column: this.currentSortColumn,
      direction: this.currentSortDirection
    });
  }

  /**
   * Einzelnen User für Bulk-Actions auswählen/abwählen
   */
  onSelectUser(userId: string, selected: boolean) {
    if (selected) {
      this.selectedUserIds.add(userId);
    } else {
      this.selectedUserIds.delete(userId);
    }
  }

  /**
   * Alle sichtbaren Users auswählen/abwählen
   */
  onSelectAll(selected: boolean) {
    if (selected) {
      this.displayUsers.forEach(user => this.selectedUserIds.add(user.id));
    } else {
      this.displayUsers.forEach(user => this.selectedUserIds.delete(user.id));
    }
    this.selectAll = selected;
  }

  /**
   * Prüft ob ein User ausgewählt ist
   */
  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.has(userId);
  }

  /**
   * Bulk-Action ausführen
   */
  onBulkAction(action: string) {
    if (this.selectedUserIds.size > 0) {
      this.bulkAction.emit({
        action,
        userIds: Array.from(this.selectedUserIds)
      });
      
      // Nach Bulk-Action Selection clearen
      if (action === 'delete') {
        this.clearSelection();
      }
    }
  }

  /**
   * Selection zurücksetzen
   */
  clearSelection() {
    this.selectedUserIds.clear();
    this.selectAll = false;
  }

  /**
   * CSS-Klasse für Sort-Icon
   */
  getSortIconClass(column: string): string {
    if (this.currentSortColumn !== column) {
      return 'sort-icon';
    }
    return `sort-icon sort-${this.currentSortDirection}`;
  }

  /**
   * Tracking-Funktion für ngFor Performance
   */
  trackByUserId(index: number, user: User): string {
    return user.id;
  }
}