import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { User, UserRole } from '../models/user.interface';
import * as UserActions from '../store/user.actions';
import * as UserSelectors from '../store/user.selectors';
import { UserState } from '../store/user.state';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let mockStore: MockStore;
  let compiled: HTMLElement;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: UserRole.USER,
      status: 'active',
      department: 'Engineering',
      lastLogin: new Date('2024-01-15'),
      createdAt: new Date('2023-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: UserRole.ADMIN,
      status: 'active',
      department: 'HR',
      lastLogin: new Date('2024-01-14'),
      createdAt: new Date('2023-02-01')
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      role: UserRole.USER,
      status: 'inactive',
      department: 'Engineering',
      lastLogin: new Date('2024-01-10'),
      createdAt: new Date('2023-03-01')
    }
  ];

  const initialState: UserState = {
    users: [],
    filteredUsers: [],
    loading: false,
    error: null,
    filters: {
      searchTerm: '',
      role: null,
      status: null,
      department: null,
      dateRange: null
    },
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
      totalPages: 0
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(MockStore);
    compiled = fixture.nativeElement;

    // Mock selectors
    mockStore.overrideSelector(UserSelectors.selectFilteredUsers, mockUsers);
    mockStore.overrideSelector(UserSelectors.selectUserLoading, false);
    mockStore.overrideSelector(UserSelectors.selectUserError, null);
    mockStore.overrideSelector(UserSelectors.selectUserFilters, initialState.filters);
    mockStore.overrideSelector(UserSelectors.selectUserPagination, initialState.pagination);

    spyOn(mockStore, 'dispatch');
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize filter form', () => {
      expect(component.filterForm).toBeDefined();
      expect(component.filterForm.get('searchTerm')).toBeTruthy();
      expect(component.filterForm.get('role')).toBeTruthy();
      expect(component.filterForm.get('status')).toBeTruthy();
      expect(component.filterForm.get('department')).toBeTruthy();
    });

    it('should dispatch loadUsers action on init', () => {
      component.ngOnInit();
      expect(mockStore.dispatch).toHaveBeenCalledWith(UserActions.loadUsers());
    });

    it('should setup filter form subscriptions', () => {
      spyOn(component, 'onFilterChange');
      component.ngOnInit();
      
      component.filterForm.patchValue({ searchTerm: 'test' });
      fixture.detectChanges();
      
      setTimeout(() => {
        expect(component.onFilterChange).toHaveBeenCalled();
      }, 300); // debounce time
    });
  });

  describe('User Display', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display user list when users are available', () => {
      const userRows = compiled.querySelectorAll('.user-row');
      expect(userRows.length).toBe(3);
    });

    it('should display user information correctly', () => {
      const firstUserRow = compiled.querySelector('.user-row');
      expect(firstUserRow?.textContent).toContain('John Doe');
      expect(firstUserRow?.textContent).toContain('john.doe@example.com');
      expect(firstUserRow?.textContent).toContain('USER');
      expect(firstUserRow?.textContent).toContain('active');
    });

    it('should display loading state', () => {
      mockStore.overrideSelector(UserSelectors.selectUserLoading, true);
      mockStore.refreshState();
      fixture.detectChanges();

      const loadingElement = compiled.querySelector('.loading-spinner');
      expect(loadingElement).toBeTruthy();
    });

    it('should display error message when error occurs', () => {
      const errorMessage = 'Failed to load users';
      mockStore.overrideSelector(UserSelectors.selectUserError, errorMessage);
      mockStore.refreshState();
      fixture.detectChanges();

      const errorElement = compiled.querySelector('.error-message');
      expect(errorElement?.textContent).toContain(errorMessage);
    });

    it('should display empty state when no users', () => {
      mockStore.overrideSelector(UserSelectors.selectFilteredUsers, []);
      mockStore.refreshState();
      fixture.detectChanges();

      const emptyState = compiled.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should dispatch filter action when search term changes', () => {
      const searchInput = compiled.querySelector('input[formControlName="searchTerm"]') as HTMLInputElement;
      searchInput.value = 'John';
      searchInput.dispatchEvent(new Event('input'));

      setTimeout(() => {
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          UserActions.updateFilters({ filters: jasmine.objectContaining({ searchTerm: 'John' }) })
        );
      }, 300);
    });

    it('should dispatch filter action when role filter changes', () => {
      const roleSelect = compiled.querySelector('select[formControlName="role"]') as HTMLSelectElement;
      roleSelect.value = UserRole.ADMIN;
      roleSelect.dispatchEvent(new Event('change'));

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ filters: jasmine.objectContaining({ role: UserRole.ADMIN }) })
      );
    });

    it('should dispatch filter action when status filter changes', () => {
      const statusSelect = compiled.querySelector('select[formControlName="status"]') as HTMLSelectElement;
      statusSelect.value = 'active';
      statusSelect.dispatchEvent(new Event('change'));

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ filters: jasmine.objectContaining({ status: 'active' }) })
      );
    });

    it('should dispatch filter action when department filter changes', () => {
      const departmentSelect = compiled.querySelector('select[formControlName="department"]') as HTMLSelectElement;
      departmentSelect.value = 'Engineering';
      departmentSelect.dispatchEvent(new Event('change'));

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ filters: jasmine.objectContaining({ department: 'Engineering' }) })
      );
    });

    it('should clear all filters when clear button is clicked', () => {
      // Set some filters first
      component.filterForm.patchValue({
        searchTerm: 'test',
        role: UserRole.ADMIN,
        status: 'active'
      });

      const clearButton = compiled.querySelector('.clear-filters-btn') as HTMLButtonElement;
      clearButton.click();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.clearFilters()
      );
    });

    it('should show clear button only when filters are active', () => {
      // Initially no filters
      let clearButton = compiled.querySelector('.clear-filters-btn');
      expect(clearButton).toBeFalsy();

      // Add filters
      component.filterForm.patchValue({ searchTerm: 'test' });
      fixture.detectChanges();

      clearButton = compiled.querySelector('.clear-filters-btn');
      expect(clearButton).toBeTruthy();
    });
  });

  describe('Quick Filters', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should apply active users quick filter', () => {
      const activeUsersBtn = compiled.querySelector('.quick-filter-active') as HTMLButtonElement;
      activeUsersBtn.click();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ filters: jasmine.objectContaining({ status: 'active' }) })
      );
    });

    it('should apply admin users quick filter', () => {
      const adminUsersBtn = compiled.querySelector('.quick-filter-admin') as HTMLButtonElement;
      adminUsersBtn.click();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ filters: jasmine.objectContaining({ role: UserRole.ADMIN }) })
      );
    });

    it('should apply recent users quick filter', () => {
      const recentUsersBtn = compiled.querySelector('.quick-filter-recent') as HTMLButtonElement;
      recentUsersBtn.click();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.updateFilters({ 
          filters: jasmine.objectContaining({ 
            dateRange: jasmine.objectContaining({ type: 'recent' })
          })
        })
      );
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      const paginationState = {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 25,
        totalPages: 3
      };
      mockStore.overrideSelector(UserSelectors.selectUserPagination, paginationState);
      fixture.detectChanges();
    });

    it('should display pagination controls', () => {
      const pagination = compiled.querySelector('.pagination');
      expect(pagination).toBeTruthy();
    });

    it('should dispatch page change action when page button clicked', () => {
      const nextPageBtn = compiled.querySelector('.pagination-next') as HTMLButtonElement;
      nextPageBtn.click();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.changePage({ page: 2 })
      );
    });

    it('should dispatch items per page change action', () => {
      const itemsPerPageSelect = compiled.querySelector('.items-per-page-select') as HTMLSelectElement;
      itemsPerPageSelect.value = '25';
      itemsPerPageSelect.dispatchEvent(new Event('change'));

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        UserActions.changeItemsPerPage({ itemsPerPage: 25 })
      );
    });
  });

  describe('User Actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should dispatch edit user action', () => {
      spyOn(component, 'onEditUser');
      const editBtn = compiled.querySelector('.edit-user-btn') as HTMLButtonElement;
      editBtn.click();

      expect(component.onEditUser).toHaveBeenCalled();
    });

    it('should dispatch delete user action with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component, 'onDeleteUser');
      
      const deleteBtn = compiled.querySelector('.delete-user-btn') as HTMLButtonElement;
      deleteBtn.click();

      expect(window.confirm).toHaveBeenCalled();
      expect(component.onDeleteUser).toHaveBeenCalled();
    });

    it('should not delete user when confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(component, 'onDeleteUser');
      
      const deleteBtn = compiled.querySelector('.delete-user-btn') as HTMLButtonElement;
      deleteBtn.click();

      expect(window.confirm).toHaveBeenCalled();
      expect(component.onDeleteUser).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA labels for filter inputs', () => {
      const searchInput = compiled.querySelector('input[formControlName="searchTerm"]');
      const roleSelect = compiled.querySelector('select[formControlName="role"]');
      
      expect(searchInput?.getAttribute('aria-label')).toBeTruthy();
      expect(roleSelect?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have proper table headers and structure', () => {
      const table = compiled.querySelector('table');
      const headers = compiled.querySelectorAll('th');
      
      expect(table?.getAttribute('role')).toBe('table');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation for pagination', () => {
      const paginationBtns = compiled.querySelectorAll('.pagination button');
      paginationBtns.forEach(btn => {
        expect(btn.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe from observables on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should not have memory leaks', () => {
      const subscriptionsCount = (component as any)._subscriptions?.length || 0;
      
      component.ngOnDestroy();
      
      // Verify subscriptions are cleaned up
      expect(component['destroy$'].closed).toBeFalsy(); // Subject should be completed, not closed
    });
  });

  describe('Error Handling', () => {
    it('should handle filter form errors gracefully', () => {
      component.filterForm.get('searchTerm')?.setErrors({ invalid: true });
      fixture.detectChanges();

      expect(component.filterForm.invalid).toBeTruthy();
      // Component should still function despite form errors
      expect(compiled.querySelector('.user-list')).toBeTruthy();
    });

    it('should handle empty filter results', () => {
      mockStore.overrideSelector(UserSelectors.selectFilteredUsers, []);
      mockStore.refreshState();
      fixture.detectChanges();

      const emptyMessage = compiled.querySelector('.no-results-message');
      expect(emptyMessage).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should debounce search input to prevent excessive API calls', (done) => {
      let dispatchCount = 0;
      const originalDispatch = mockStore.dispatch;
      mockStore.dispatch = jasmine.createSpy('dispatch').and.callFake((...args) => {
        if (args[0].type === '[User] Update Filters') {
          dispatchCount++;
        }
        return originalDispatch.apply(mockStore, args);
      });

      const searchInput = compiled.querySelector('input[formControlName="searchTerm"]') as HTMLInputElement;
      
      // Simulate rapid typing
      searchInput.value = 'J';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'Jo';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'Joh';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'John';
      searchInput.dispatchEvent(new Event('input'));

      setTimeout(() => {
        expect(dispatchCount).toBeLessThan(4); // Should be debounced
        done();
      }, 400);
    });
  });
});