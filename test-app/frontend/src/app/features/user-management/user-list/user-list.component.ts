import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an mit Filterung
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 * Filter Features: Suche nach Name/Email, clientseitige Filterung
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserTableRowComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  // Filter properties
  searchTerm: string = '';
  filteredUsers: User[] = [];
  
  // RxJS subjects for debounced search
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.filterUsers();
      });

    // Initial filter
    this.filterUsers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    // Re-filter when users input changes
    this.filterUsers();
  }

  /**
   * Filter users based on search term
   * Searches in name and email fields (case-insensitive)
   */
  filterUsers() {
    if (!this.users) {
      this.filteredUsers = [];
      return;
    }

    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  }

  /**
   * Handle search input with debouncing
   */
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  /**
   * Clear search filter
   */
  clearSearch() {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  /**
   * Get filtered users count for display
   */
  get filteredCount(): number {
    return this.filteredUsers.length;
  }

  /**
   * Get total users count for display
   */
  get totalCount(): number {
    return this.users.length;
  }

  /**
   * Check if filter is active
   */
  get isFiltered(): boolean {
    return this.searchTerm.trim() !== '';
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
}