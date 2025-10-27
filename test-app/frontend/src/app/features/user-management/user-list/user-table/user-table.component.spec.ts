import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { UserTableComponent } from './user-table.component';
import { User } from '../../models/user.model';
import { UserFilter } from '../../models/user-filter.model';

describe('UserTableComponent', () => {
  let component: UserTableComponent;
  let fixture: ComponentFixture<UserTableComponent>;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      status: 'Active',
      department: 'IT',
      lastLogin: new Date('2024-01-15'),
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      status: 'Inactive',
      department: 'HR',
      lastLogin: new Date('2024-01-10'),
      createdAt: new Date('2024-01-02')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'Moderator',
      status: 'Active',
      department: 'Marketing',
      lastLogin: new Date('2024-01-20'),
      createdAt: new Date('2024-01-03')
    }
  ];

  const defaultFilter: UserFilter = {
    searchTerm: '',
    role: null,
    status: null,
    department: null,
    dateRange: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserTableComponent);
    component = fixture.componentInstance;

    // Setup default inputs
    component.users = mockUsers;
    component.filter = new BehaviorSubject(defaultFilter);
    component.loading = false;
    component.error = null;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('User Display', () => {
    it('should display all users when no filter is applied', () => {
      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(3);
    });

    it('should display user information correctly', () => {
      const firstUserRow = fixture.debugElement.query(By.css('.user-row'));
      const nameCell = firstUserRow.query(By.css('.user-name'));
      const emailCell = firstUserRow.query(By.css('.user-email'));
      const roleCell = firstUserRow.query(By.css('.user-role'));
      const statusCell = firstUserRow.query(By.css('.user-status'));

      expect(nameCell.nativeElement.textContent.trim()).toBe('John Doe');
      expect(emailCell.nativeElement.textContent.trim()).toBe('john@example.com');
      expect(roleCell.nativeElement.textContent.trim()).toBe('Admin');
      expect(statusCell.nativeElement.textContent.trim()).toBe('Active');
    });

    it('should apply correct CSS classes for status', () => {
      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      const activeStatus = userRows[0].query(By.css('.user-status'));
      const inactiveStatus = userRows[1].query(By.css('.user-status'));

      expect(activeStatus.nativeElement.classList).toContain('status-active');
      expect(inactiveStatus.nativeElement.classList).toContain('status-inactive');
    });
  });

  describe('Filtering Functionality', () => {
    it('should filter users by search term (name)', () => {
      const searchFilter: UserFilter = {
        ...defaultFilter,
        searchTerm: 'John'
      };
      component.filter.next(searchFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-name')).nativeElement.textContent.trim()).toBe('John Doe');
    });

    it('should filter users by search term (email)', () => {
      const searchFilter: UserFilter = {
        ...defaultFilter,
        searchTerm: 'jane@example.com'
      };
      component.filter.next(searchFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-email')).nativeElement.textContent.trim()).toBe('jane@example.com');
    });

    it('should filter users by role', () => {
      const roleFilter: UserFilter = {
        ...defaultFilter,
        role: 'Admin'
      };
      component.filter.next(roleFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-role')).nativeElement.textContent.trim()).toBe('Admin');
    });

    it('should filter users by status', () => {
      const statusFilter: UserFilter = {
        ...defaultFilter,
        status: 'Active'
      };
      component.filter.next(statusFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(2);
      userRows.forEach(row => {
        expect(row.query(By.css('.user-status')).nativeElement.textContent.trim()).toBe('Active');
      });
    });

    it('should filter users by department', () => {
      const departmentFilter: UserFilter = {
        ...defaultFilter,
        department: 'IT'
      };
      component.filter.next(departmentFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-department')).nativeElement.textContent.trim()).toBe('IT');
    });

    it('should apply multiple filters simultaneously', () => {
      const multiFilter: UserFilter = {
        ...defaultFilter,
        status: 'Active',
        role: 'Admin'
      };
      component.filter.next(multiFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-name')).nativeElement.textContent.trim()).toBe('John Doe');
    });

    it('should show no results when filter matches no users', () => {
      const noMatchFilter: UserFilter = {
        ...defaultFilter,
        searchTerm: 'NonExistentUser'
      };
      component.filter.next(noMatchFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      const noResultsMessage = fixture.debugElement.query(By.css('.no-results'));

      expect(userRows.length).toBe(0);
      expect(noResultsMessage).toBeTruthy();
      expect(noResultsMessage.nativeElement.textContent.trim()).toContain('No users found');
    });

    it('should be case-insensitive for search terms', () => {
      const caseInsensitiveFilter: UserFilter = {
        ...defaultFilter,
        searchTerm: 'JOHN'
      };
      component.filter.next(caseInsensitiveFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      expect(userRows[0].query(By.css('.user-name')).nativeElement.textContent.trim()).toBe('John Doe');
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter users by last login date range', () => {
      const dateRangeFilter: UserFilter = {
        ...defaultFilter,
        dateRange: {
          startDate: new Date('2024-01-12'),
          endDate: new Date('2024-01-25'),
          field: 'lastLogin'
        }
      };
      component.filter.next(dateRangeFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(2); // John and Bob
    });

    it('should filter users by creation date range', () => {
      const dateRangeFilter: UserFilter = {
        ...defaultFilter,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          field: 'createdAt'
        }
      };
      component.filter.next(dateRangeFilter);
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(2); // John and Jane
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const userTable = fixture.debugElement.query(By.css('.user-table'));

      expect(loadingSpinner).toBeTruthy();
      expect(userTable).toBeFalsy();
    });

    it('should show error message when error is present', () => {
      component.error = 'Failed to load users';
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      const userTable = fixture.debugElement.query(By.css('.user-table'));

      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toContain('Failed to load users');
      expect(userTable).toBeFalsy();
    });

    it('should show user table when not loading and no error', () => {
      component.loading = false;
      component.error = null;
      fixture.detectChanges();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      const userTable = fixture.debugElement.query(By.css('.user-table'));

      expect(loadingSpinner).toBeFalsy();
      expect(errorMessage).toBeFalsy();
      expect(userTable).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should emit userSelect event when user row is clicked', () => {
      spyOn(component.userSelect, 'emit');

      const firstUserRow = fixture.debugElement.query(By.css('.user-row'));
      firstUserRow.nativeElement.click();

      expect(component.userSelect.emit).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should emit userEdit event when edit button is clicked', () => {
      spyOn(component.userEdit, 'emit');

      const editButton = fixture.debugElement.query(By.css('.edit-button'));
      editButton.nativeElement.click();

      expect(component.userEdit.emit).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should emit userDelete event when delete button is clicked', () => {
      spyOn(component.userDelete, 'emit');

      const deleteButton = fixture.debugElement.query(By.css('.delete-button'));
      deleteButton.nativeElement.click();

      expect(component.userDelete.emit).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should prevent event propagation on action button clicks', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-button'));
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      editButton.nativeElement.dispatchEvent(event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('should emit sortChange event when column header is clicked', () => {
      spyOn(component.sortChange, 'emit');

      const nameHeader = fixture.debugElement.query(By.css('.sortable-header[data-column="name"]'));
      nameHeader.nativeElement.click();

      expect(component.sortChange.emit).toHaveBeenCalledWith({
        column: 'name',
        direction: 'asc'
      });
    });

    it('should toggle sort direction on repeated clicks', () => {
      spyOn(component.sortChange, 'emit');

      const nameHeader = fixture.debugElement.query(By.css('.sortable-header[data-column="name"]'));
      
      // First click - ascending
      nameHeader.nativeElement.click();
      expect(component.sortChange.emit).toHaveBeenCalledWith({
        column: 'name',
        direction: 'asc'
      });

      // Second click - descending
      nameHeader.nativeElement.click();
      expect(component.sortChange.emit).toHaveBeenCalledWith({
        column: 'name',
        direction: 'desc'
      });
    });

    it('should display sort indicators correctly', () => {
      component.currentSort = { column: 'name', direction: 'asc' };
      fixture.detectChanges();

      const nameHeader = fixture.debugElement.query(By.css('.sortable-header[data-column="name"]'));
      const sortIndicator = nameHeader.query(By.css('.sort-indicator'));

      expect(sortIndicator).toBeTruthy();
      expect(sortIndicator.nativeElement.classList).toContain('sort-asc');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-button'));
      const deleteButton = fixture.debugElement.query(By.css('.delete-button'));

      expect(editButton.nativeElement.getAttribute('aria-label')).toContain('Edit user');
      expect(deleteButton.nativeElement.getAttribute('aria-label')).toContain('Delete user');
    });

    it('should have proper table structure for screen readers', () => {
      const table = fixture.debugElement.query(By.css('.user-table'));
      const headers = fixture.debugElement.queryAll(By.css('th'));

      expect(table.nativeElement.getAttribute('role')).toBe('table');
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach(header => {
        expect(header.nativeElement.tagName.toLowerCase()).toBe('th');
      });
    });

    it('should support keyboard navigation for sortable headers', () => {
      spyOn(component.sortChange, 'emit');

      const nameHeader = fixture.debugElement.query(By.css('.sortable-header[data-column="name"]'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      nameHeader.nativeElement.dispatchEvent(enterEvent);

      expect(component.sortChange.emit).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 3 === 0 ? 'Admin' : 'User',
        status: i % 2 === 0 ? 'Active' : 'Inactive',
        department: 'IT',
        lastLogin: new Date(),
        createdAt: new Date()
      }));

      const startTime = performance.now();
      component.users = largeUserSet;
      fixture.detectChanges();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should not re-render unnecessarily when filter observable emits same value', () => {
      let renderCount = 0;
      const originalNgDoCheck = component.ngDoCheck;
      component.ngDoCheck = () => {
        renderCount++;
        if (originalNgDoCheck) {
          originalNgDoCheck.call(component);
        }
      };

      // Emit same filter twice
      component.filter.next(defaultFilter);
      component.filter.next(defaultFilter);
      fixture.detectChanges();

      expect(renderCount).toBeLessThan(3); // Should not trigger excessive re-renders
    });
  });
});