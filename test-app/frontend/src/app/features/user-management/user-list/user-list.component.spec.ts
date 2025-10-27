import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { User } from '../../../core/models/user.model';
import { UserRole } from '../../../core/models/user-role.enum';
import { selectUsers, selectUsersLoading } from '../../../core/store/selectors/user.selectors';
import { loadUsers } from '../../../core/store/actions/user.actions';

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
      role: UserRole.ADMIN,
      createdAt: new Date('2023-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: UserRole.USER,
      createdAt: new Date('2023-01-02')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: UserRole.USER,
      createdAt: new Date('2023-01-03')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [
        provideMockStore({
          initialState: {
            users: {
              users: [],
              loading: false,
              error: null
            }
          }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(MockStore);
    compiled = fixture.nativeElement;

    mockStore.overrideSelector(selectUsers, mockUsers);
    mockStore.overrideSelector(selectUsersLoading, false);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty search term', () => {
    expect(component.searchTerm).toBe('');
  });

  it('should initialize filteredUsers as empty array', () => {
    expect(component.filteredUsers).toEqual([]);
  });

  it('should dispatch loadUsers action on init', () => {
    const dispatchSpy = spyOn(mockStore, 'dispatch');
    
    component.ngOnInit();
    
    expect(dispatchSpy).toHaveBeenCalledWith(loadUsers());
  });

  it('should set filteredUsers to all users when initialized', () => {
    fixture.detectChanges();
    
    expect(component.filteredUsers).toEqual(mockUsers);
  });

  describe('filterUsers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter users by name (case insensitive)', () => {
      component.searchTerm = 'john';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([
        mockUsers[0] // John Doe
      ]);
    });

    it('should filter users by email (case insensitive)', () => {
      component.searchTerm = 'jane.smith';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([
        mockUsers[1] // Jane Smith
      ]);
    });

    it('should handle partial matches in name', () => {
      component.searchTerm = 'jo';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([
        mockUsers[0], // John Doe
        mockUsers[2]  // Bob Johnson
      ]);
    });

    it('should handle partial matches in email', () => {
      component.searchTerm = '@example.com';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should return empty array for no matches', () => {
      component.searchTerm = 'nonexistent';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([]);
    });

    it('should return all users for empty search term', () => {
      component.searchTerm = '';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should trim whitespace from search term', () => {
      component.searchTerm = '  john  ';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([
        mockUsers[0] // John Doe
      ]);
    });

    it('should handle special characters in search term', () => {
      const userWithSpecialChars = {
        id: '4',
        name: 'Test User-Name',
        email: 'test.user+tag@example.com',
        role: UserRole.USER,
        createdAt: new Date()
      };
      
      component.users = [...mockUsers, userWithSpecialChars];
      component.searchTerm = 'user-name';
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([userWithSpecialChars]);
    });
  });

  describe('onSearchTermChange', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update searchTerm and call filterUsers', () => {
      const filterSpy = spyOn(component, 'filterUsers');
      
      component.onSearchTermChange('test search');
      
      expect(component.searchTerm).toBe('test search');
      expect(filterSpy).toHaveBeenCalled();
    });

    it('should handle empty string', () => {
      const filterSpy = spyOn(component, 'filterUsers');
      
      component.onSearchTermChange('');
      
      expect(component.searchTerm).toBe('');
      expect(filterSpy).toHaveBeenCalled();
    });
  });

  describe('template integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display search input', () => {
      const searchInput = compiled.querySelector('input[type="search"]');
      expect(searchInput).toBeTruthy();
    });

    it('should bind search input to searchTerm', () => {
      const searchInput = compiled.querySelector('input[type="search"]') as HTMLInputElement;
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      
      expect(component.searchTerm).toBe('test');
    });

    it('should display filtered users count', () => {
      component.searchTerm = 'john';
      component.filterUsers();
      fixture.detectChanges();
      
      const userInfo = compiled.querySelector('.user-list__info');
      expect(userInfo?.textContent).toContain('1');
    });

    it('should display "No users found" when filteredUsers is empty', () => {
      component.searchTerm = 'nonexistent';
      component.filterUsers();
      fixture.detectChanges();
      
      const emptyState = compiled.querySelector('.user-list__empty');
      expect(emptyState?.textContent).toContain('No users found');
    });

    it('should display user cards for filtered users', () => {
      component.searchTerm = 'john';
      component.filterUsers();
      fixture.detectChanges();
      
      const userCards = compiled.querySelectorAll('.user-card');
      expect(userCards.length).toBe(1);
    });

    it('should display loading state', () => {
      mockStore.overrideSelector(selectUsersLoading, true);
      mockStore.refreshState();
      fixture.detectChanges();
      
      const loadingElement = compiled.querySelector('.user-list__loading');
      expect(loadingElement).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA attributes on search input', () => {
      const searchInput = compiled.querySelector('input[type="search"]');
      
      expect(searchInput?.getAttribute('aria-label')).toBeTruthy();
      expect(searchInput?.getAttribute('placeholder')).toBeTruthy();
    });

    it('should have proper role attributes on list container', () => {
      const userList = compiled.querySelector('.user-list__grid');
      expect(userList?.getAttribute('role')).toBe('list');
    });

    it('should announce filter results to screen readers', () => {
      component.searchTerm = 'john';
      component.filterUsers();
      fixture.detectChanges();
      
      const srOnly = compiled.querySelector('.sr-only');
      expect(srOnly?.textContent).toContain('1 user found');
    });
  });

  describe('performance', () => {
    it('should not filter when users array is empty', () => {
      component.users = [];
      component.searchTerm = 'test';
      
      component.filterUsers();
      
      expect(component.filteredUsers).toEqual([]);
    });

    it('should handle large datasets efficiently', () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: UserRole.USER,
        createdAt: new Date()
      }));
      
      component.users = largeUserSet;
      component.searchTerm = 'User 1';
      
      const startTime = performance.now();
      component.filterUsers();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
      expect(component.filteredUsers.length).toBeGreaterThan(0);
    });
  });
})