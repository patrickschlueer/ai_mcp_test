import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { User } from '../../interfaces/user.interface';
import { UserFilter, SortDirection } from '../../interfaces/user-filter.interface';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserTableComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() currentFilter: UserFilter | null = null;
  
  @Output() userSelected = new EventEmitter<User>();
  @Output() userEdit = new EventEmitter<User>();
  @Output() userDelete = new EventEmitter<User>();
  @Output() bulkAction = new EventEmitter<{action: string, users: User[]}>(); 
  @Output() sortChange = new EventEmitter<{field: string, direction: SortDirection}>();
  @Output() filterChange = new EventEmitter<UserFilter>();

  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Table state
  selectedUsers: Set<User['id']> = new Set();
  allSelected = false;
  sortField = '';
  sortDirection: SortDirection = 'asc';
  
  // Quick filters
  quickFilters = [
    { key: 'all', label: 'All Users', active: true },
    { key: 'active', label: 'Active', active: false },
    { key: 'inactive', label: 'Inactive', active: false },
    { key: 'admin', label: 'Admins', active: false },
    { key: 'recent', label: 'Recent', active: false }
  ];

  // Search and filter state
  searchTerm = '';
  showAdvancedFilters = false;
  
  // Advanced filter form
  advancedFilter: UserFilter = {
    search: '',
    status: null,
    role: null,
    department: null,
    createdAfter: null,
    createdBefore: null,
    lastLoginAfter: null,
    lastLoginBefore: null
  };

  // Bulk action options
  bulkActions = [
    { value: 'activate', label: 'Activate Users' },
    { value: 'deactivate', label: 'Deactivate Users' },
    { value: 'delete', label: 'Delete Users' },
    { value: 'export', label: 'Export Users' }
  ];

  selectedBulkAction = '';

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.initializeFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.applySearch(searchTerm);
      });
  }

  private initializeFilters(): void {
    if (this.currentFilter) {
      this.advancedFilter = { ...this.currentFilter };
      this.searchTerm = this.currentFilter.search || '';
    }
  }

  // Quick filter methods
  onQuickFilterClick(filterKey: string): void {
    this.quickFilters.forEach(filter => {
      filter.active = filter.key === filterKey;
    });

    const filter: UserFilter = { search: this.searchTerm };

    switch (filterKey) {
      case 'active':
        filter.status = 'active';
        break;
      case 'inactive':
        filter.status = 'inactive';
        break;
      case 'admin':
        filter.role = 'admin';
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.createdAfter = thirtyDaysAgo.toISOString().split('T')[0];
        break;
    }

    this.advancedFilter = filter;
    this.filterChange.emit(filter);
  }

  // Search methods
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = this.sanitizeInput(target.value);
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  private applySearch(searchTerm: string): void {
    const filter: UserFilter = {
      ...this.advancedFilter,
      search: searchTerm
    };
    this.filterChange.emit(filter);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Advanced filter methods
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  onAdvancedFilterChange(): void {
    const filter = { ...this.advancedFilter };
    this.filterChange.emit(filter);
  }

  clearAdvancedFilters(): void {
    this.advancedFilter = {
      search: this.searchTerm,
      status: null,
      role: null,
      department: null,
      createdAfter: null,
      createdBefore: null,
      lastLoginAfter: null,
      lastLoginBefore: null
    };
    this.onAdvancedFilterChange();
  }

  // Sorting methods
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.sortChange.emit({
      field: this.sortField,
      direction: this.sortDirection
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕️';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Selection methods
  onSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.allSelected = target.checked;
    
    if (this.allSelected) {
      this.users.forEach(user => this.selectedUsers.add(user.id));
    } else {
      this.selectedUsers.clear();
    }
  }

  onSelectUser(user: User, event: Event): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      this.selectedUsers.add(user.id);
    } else {
      this.selectedUsers.delete(user.id);
      this.allSelected = false;
    }
    
    this.updateSelectAllState();
  }

  private updateSelectAllState(): void {
    this.allSelected = this.users.length > 0 && 
                     this.selectedUsers.size === this.users.length;
  }

  isUserSelected(userId: User['id']): boolean {
    return this.selectedUsers.has(userId);
  }

  getSelectedUsers(): User[] {
    return this.users.filter(user => this.selectedUsers.has(user.id));
  }

  // Bulk actions
  onBulkActionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedBulkAction = target.value;
  }

  executeBulkAction(): void {
    if (!this.selectedBulkAction || this.selectedUsers.size === 0) {
      return;
    }

    const selectedUsers = this.getSelectedUsers();
    this.bulkAction.emit({
      action: this.selectedBulkAction,
      users: selectedUsers
    });

    // Reset selection after action
    this.selectedUsers.clear();
    this.allSelected = false;
    this.selectedBulkAction = '';
  }

  // User action methods
  onUserClick(user: User): void {
    this.userSelected.emit(user);
  }

  onEditUser(user: User, event: Event): void {
    event.stopPropagation();
    this.userEdit.emit(user);
  }

  onDeleteUser(user: User, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
      this.userDelete.emit(user);
    }
  }

  // Utility methods
  private sanitizeInput(input: string): string {
    // Basic XSS protection
    return input
      .replace(/[<>"']/g, '')
      .trim()
      .substring(0, 100); // Limit length
  }

  formatDate(date: string | Date): string {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getUserStatusClass(status: string): string {
    return `user-status user-status--${status}`;
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrator',
      'user': 'User',
      'moderator': 'Moderator',
      'viewer': 'Viewer'
    };
    return roleMap[role] || role;
  }

  trackByUserId(index: number, user: User): User['id'] {
    return user.id;
  }
}