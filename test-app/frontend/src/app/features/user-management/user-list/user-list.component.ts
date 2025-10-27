import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, takeUntil, catchError, of, startWith } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { User } from '../../../shared/models/user.interface';
import { UserService } from '../../../shared/services/user.service';
import { FilterPanelComponent } from '../components/filter-panel/filter-panel.component';
import { UserCardComponent } from '../components/user-card/user-card.component';
import { QuickFilterBarComponent } from '../components/quick-filter-bar/quick-filter-bar.component';
import { BulkActionsComponent } from '../components/bulk-actions/bulk-actions.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

import { UserManagementState } from '../store/user-management.state';
import { UserManagementActions } from '../store/user-management.actions';
import { selectFilteredUsers, selectUserFilters, selectUserManagementLoading, selectUserManagementError } from '../store/user-management.selectors';

export interface UserFilter {
  searchTerm: string;
  status: 'all' | 'active' | 'inactive';
  role: 'all' | 'admin' | 'user' | 'moderator';
  dateRange: {
    from: string | null;
    to: string | null;
  };
  sortBy: 'name' | 'email' | 'createdAt' | 'lastLogin';
  sortOrder: 'asc' | 'desc';
}

export interface BulkAction {
  type: 'activate' | 'deactivate' | 'delete' | 'changeRole';
  userIds: string[];
  metadata?: any;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FilterPanelComponent,
    UserCardComponent,
    QuickFilterBarComponent,
    BulkActionsComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    PaginationComponent,
    EmptyStateComponent
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store<UserManagementState>);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroy$ = new Subject<void>();

  // Component state
  private readonly filterState$ = new BehaviorSubject<UserFilter>({
    searchTerm: '',
    status: 'all',
    role: 'all',
    dateRange: { from: null, to: null },
    sortBy: 'name',
    sortOrder: 'asc'
  });

  private readonly selectedUsers$ = new BehaviorSubject<Set<string>>(new Set());
  private readonly currentPage$ = new BehaviorSubject<number>(1);
  private readonly pageSize$ = new BehaviorSubject<number>(20);
  private readonly showAdvancedFilters$ = new BehaviorSubject<boolean>(false);
  private readonly bulkActionsVisible$ = new BehaviorSubject<boolean>(false);

  // Form
  public readonly filterForm: FormGroup;

  // Observables for template
  public readonly loading$ = this.store.select(selectUserManagementLoading);
  public readonly error$ = this.store.select(selectUserManagementError);
  
  public readonly filteredUsers$: Observable<User[]>;
  public readonly paginatedUsers$: Observable<User[]>;
  public readonly totalUsers$: Observable<number>;
  public readonly totalPages$: Observable<number>;
  public readonly hasSelectedUsers$: Observable<boolean>;
  public readonly selectedUserCount$: Observable<number>;
  public readonly showBulkActions$: Observable<boolean>;
  
  // UI State
  public readonly showAdvancedFilters$ = this.showAdvancedFilters$.asObservable();
  public readonly currentFilter$ = this.filterState$.asObservable();
  public readonly currentPage$ = this.currentPage$.asObservable();
  public readonly pageSize$ = this.pageSize$.asObservable();

  // Constants
  public readonly QUICK_FILTERS = [
    { label: 'Active Users', filter: { status: 'active' } },
    { label: 'Administrators', filter: { role: 'admin' } },
    { label: 'Recent Users', filter: { sortBy: 'createdAt', sortOrder: 'desc' } },
    { label: 'Inactive Users', filter: { status: 'inactive' } }
  ] as const;

  public readonly SORT_OPTIONS = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'lastLogin', label: 'Last Login' }
  ] as const;

  public readonly PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

  constructor() {
    this.filterForm = this.createFilterForm();
    
    // Setup filtered users stream
    this.filteredUsers$ = combineLatest([
      this.store.select(selectFilteredUsers),
      this.filterState$
    ]).pipe(
      debounceTime(300),
      map(([users, filter]) => this.applyClientSideFiltering(users, filter)),
      catchError(error => {
        console.error('Error filtering users:', error);
        return of([]);
      })
    );

    // Setup pagination
    this.totalUsers$ = this.filteredUsers$.pipe(
      map(users => users.length)
    );

    this.totalPages$ = combineLatest([
      this.totalUsers$,
      this.pageSize$
    ]).pipe(
      map(([total, pageSize]) => Math.ceil(total / pageSize))
    );

    this.paginatedUsers$ = combineLatest([
      this.filteredUsers$,
      this.currentPage$,
      this.pageSize$
    ]).pipe(
      map(([users, page, pageSize]) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return users.slice(startIndex, endIndex);
      })
    );

    // Setup selection state
    this.hasSelectedUsers$ = this.selectedUsers$.pipe(
      map(selected => selected.size > 0)
    );

    this.selectedUserCount$ = this.selectedUsers$.pipe(
      map(selected => selected.size)
    );

    this.showBulkActions$ = combineLatest([
      this.hasSelectedUsers$,
      this.bulkActionsVisible$
    ]).pipe(
      map(([hasSelected, visible]) => hasSelected && visible)
    );
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.setupFormSubscriptions();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.filterState$.complete();
    this.selectedUsers$.complete();
    this.currentPage$.complete();
    this.pageSize$.complete();
    this.showAdvancedFilters$.complete();
    this.bulkActionsVisible$.complete();
  }

  private createFilterForm(): FormGroup {
    return this.formBuilder.group({
      searchTerm: [''],
      status: ['all'],
      role: ['all'],
      dateFrom: [''],
      dateTo: [''],
      sortBy: ['name'],
      sortOrder: ['asc']
    });
  }

  private initializeComponent(): void {
    // Load persisted filters from NgRx store
    this.store.select(selectUserFilters).pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if (filters) {
        this.filterState$.next(filters);
        this.updateFormFromFilter(filters);
      }
    });

    // Auto-save filters to store
    this.filterState$.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filter => {
      this.store.dispatch(UserManagementActions.updateFilters({ filters: filter }));
    });
  }

  private setupFormSubscriptions(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(formValue => {
      const filter: UserFilter = {
        searchTerm: this.sanitizeInput(formValue.searchTerm || ''),
        status: formValue.status || 'all',
        role: formValue.role || 'all',
        dateRange: {
          from: formValue.dateFrom || null,
          to: formValue.dateTo || null
        },
        sortBy: formValue.sortBy || 'name',
        sortOrder: formValue.sortOrder || 'asc'
      };
      
      this.filterState$.next(filter);
      this.resetPagination();
    });
  }

  private loadUsers(): void {
    this.store.dispatch(UserManagementActions.loadUsers());
  }

  private applyClientSideFiltering(users: User[], filter: UserFilter): User[] {
    let filtered = [...users];

    // Search term filtering
    if (filter.searchTerm.trim()) {
      const searchTerm = filter.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Status filtering
    if (filter.status !== 'all') {
      filtered = filtered.filter(user => 
        user.status === filter.status
      );
    }

    // Role filtering
    if (filter.role !== 'all') {
      filtered = filtered.filter(user => 
        user.role === filter.role
      );
    }

    // Date range filtering
    if (filter.dateRange.from || filter.dateRange.to) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.createdAt);
        const fromDate = filter.dateRange.from ? new Date(filter.dateRange.from) : null;
        const toDate = filter.dateRange.to ? new Date(filter.dateRange.to) : null;
        
        if (fromDate && userDate < fromDate) return false;
        if (toDate && userDate > toDate) return false;
        
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (filter.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'lastLogin':
          aVal = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bVal = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filter.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  private sanitizeInput(input: string): string {
    // Basic XSS protection - remove potential script tags and dangerous characters
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  private updateFormFromFilter(filter: UserFilter): void {
    this.filterForm.patchValue({
      searchTerm: filter.searchTerm,
      status: filter.status,
      role: filter.role,
      dateFrom: filter.dateRange.from,
      dateTo: filter.dateRange.to,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder
    }, { emitEvent: false });
  }

  private resetPagination(): void {
    this.currentPage$.next(1);
  }

  // Public methods for template
  public onQuickFilterApplied(quickFilter: Partial<UserFilter>): void {
    const currentFilter = this.filterState$.value;
    const newFilter = { ...currentFilter, ...quickFilter };
    this.filterState$.next(newFilter);
    this.updateFormFromFilter(newFilter);
  }

  public onAdvancedFiltersToggle(): void {
    this.showAdvancedFilters$.next(!this.showAdvancedFilters$.value);
  }

  public onUserSelection(userId: string, selected: boolean): void {
    const currentSelection = new Set(this.selectedUsers$.value);
    
    if (selected) {
      currentSelection.add(userId);
    } else {
      currentSelection.delete(userId);
    }
    
    this.selectedUsers$.next(currentSelection);
    this.bulkActionsVisible$.next(currentSelection.size > 0);
  }

  public onSelectAll(users: User[]): void {
    const allUserIds = users.map(user => user.id);
    this.selectedUsers$.next(new Set(allUserIds));
    this.bulkActionsVisible$.next(true);
  }

  public onDeselectAll(): void {
    this.selectedUsers$.next(new Set());
    this.bulkActionsVisible$.next(false);
  }

  public onBulkAction(action: BulkAction): void {
    this.store.dispatch(UserManagementActions.executeBulkAction({ action }));
    this.onDeselectAll();
  }

  public onPageChange(page: number): void {
    this.currentPage$.next(page);
  }

  public onPageSizeChange(pageSize: number): void {
    this.pageSize$.next(pageSize);
    this.resetPagination();
  }

  public onClearFilters(): void {
    const defaultFilter: UserFilter = {
      searchTerm: '',
      status: 'all',
      role: 'all',
      dateRange: { from: null, to: null },
      sortBy: 'name',
      sortOrder: 'asc'
    };
    
    this.filterState$.next(defaultFilter);
    this.updateFormFromFilter(defaultFilter);
    this.resetPagination();
  }

  public onRefresh(): void {
    this.loadUsers();
    this.onDeselectAll();
  }

  public isUserSelected(userId: string): boolean {
    return this.selectedUsers$.value.has(userId);
  }

  public trackByUserId(index: number, user: User): string {
    return user.id;
  }

  public getHighlightedText(text: string, searchTerm: string): SafeHtml {
    if (!searchTerm.trim()) {
      return this.sanitizer.sanitize(1, text) || '';
    }
    
    const sanitizedText = this.sanitizer.sanitize(1, text) || '';
    const sanitizedTerm = this.sanitizer.sanitize(1, searchTerm.trim()) || '';
    
    const regex = new RegExp(`(${sanitizedTerm})`, 'gi');
    const highlighted = sanitizedText.replace(regex, '<mark>$1</mark>');
    
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}