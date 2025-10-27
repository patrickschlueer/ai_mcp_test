import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { SharedModule } from '../../../shared/shared.module';
import { User } from '../../../core/models/user.model';
import * as UserSelectors from '../../../core/store/user/user.selectors';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let mockStore: MockStore;
  
  const mockUsers: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      imports: [SharedModule],
      providers: [
        provideMockStore({
          initialState: {},
          selectors: [
            { selector: UserSelectors.selectAllUsers, value: mockUsers },
            { selector: UserSelectors.selectUsersLoading, value: false },
            { selector: UserSelectors.selectUsersError, value: null }
          ]
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(MockStore);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty search term', () => {
      expect(component.searchTerm).toBe('');
    });

    it('should display all users initially', (done) => {
      component.filteredUsers$.subscribe(users => {
        expect(users).toEqual(mockUsers);
        expect(users.length).toBe(3);
        done();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by name', (done) => {
      component.onSearchChange('John');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(1);
          expect(users[0].name).toBe('John Doe');
          done();
        });
      }, 350); // Wait for debounce
    });

    it('should filter users by email', (done) => {
      component.onSearchChange('jane@example.com');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(1);
          expect(users[0].email).toBe('jane@example.com');
          done();
        });
      }, 350);
    });

    it('should filter users by role', (done) => {
      component.onSearchChange('admin');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(1);
          expect(users[0].role).toBe('admin');
          done();
        });
      }, 350);
    });

    it('should return empty array for no matches', (done) => {
      component.onSearchChange('nonexistent');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(0);
          done();
        });
      }, 350);
    });

    it('should be case insensitive', (done) => {
      component.onSearchChange('JOHN');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(1);
          expect(users[0].name).toBe('John Doe');
          done();
        });
      }, 350);
    });

    it('should handle partial matches', (done) => {
      component.onSearchChange('Jo');
      
      setTimeout(() => {
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(2); // John Doe and Bob Johnson
          done();
        });
      }, 350);
    });
  });

  describe('Debounce Behavior', () => {
    it('should debounce search input', () => {
      spyOn(component, 'filterUsers').and.callThrough();
      
      component.onSearchChange('J');
      component.onSearchChange('Jo');
      component.onSearchChange('Joh');
      component.onSearchChange('John');
      
      expect(component.filterUsers).toHaveBeenCalledTimes(4);
      expect(component.searchTerm).toBe('John');
    });

    it('should update search term immediately', () => {
      component.onSearchChange('test');
      expect(component.searchTerm).toBe('test');
    });
  });

  describe('Template Rendering', () => {
    it('should render search input', () => {
      const searchInput = fixture.debugElement.query(By.css('app-search-input'));
      expect(searchInput).toBeTruthy();
    });

    it('should render user counter', () => {
      const userCounter = fixture.debugElement.query(By.css('app-user-counter'));
      expect(userCounter).toBeTruthy();
    });

    it('should render user list when users exist', () => {
      const userList = fixture.debugElement.query(By.css('.user-list'));
      expect(userList).toBeTruthy();
    });

    it('should pass correct props to search input', () => {
      const searchInput = fixture.debugElement.query(By.css('app-search-input'));
      expect(searchInput.componentInstance.placeholder).toBe('Nach Benutzern suchen...');
      expect(searchInput.componentInstance.value).toBe('');
    });

    it('should pass correct count to user counter', () => {
      const userCounter = fixture.debugElement.query(By.css('app-user-counter'));
      expect(userCounter.componentInstance.total).toBe(3);
      expect(userCounter.componentInstance.filtered).toBe(3);
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockStore.overrideSelector(UserSelectors.selectAllUsers, []);
      mockStore.refreshState();
      fixture.detectChanges();
    });

    it('should show empty state when no users', () => {
      const emptyState = fixture.debugElement.query(By.css('app-empty-state-message'));
      expect(emptyState).toBeTruthy();
    });

    it('should not show user list when no users', () => {
      const userList = fixture.debugElement.query(By.css('.user-list'));
      expect(userList).toBeFalsy();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockStore.overrideSelector(UserSelectors.selectUsersLoading, true);
      mockStore.refreshState();
      fixture.detectChanges();
    });

    it('should show loading indicator when loading', () => {
      const loadingIndicator = fixture.debugElement.query(By.css('.loading'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should hide user list when loading', () => {
      const userList = fixture.debugElement.query(By.css('.user-list'));
      expect(userList).toBeFalsy();
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mockStore.overrideSelector(UserSelectors.selectUsersError, 'Failed to load users');
      mockStore.refreshState();
      fixture.detectChanges();
    });

    it('should show error message when error occurs', () => {
      const errorMessage = fixture.debugElement.query(By.css('.error'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Failed to load users');
    });
  });

  describe('Search Input Events', () => {
    let searchInput: DebugElement;

    beforeEach(() => {
      searchInput = fixture.debugElement.query(By.css('app-search-input'));
    });

    it('should handle search change event', () => {
      spyOn(component, 'onSearchChange');
      
      searchInput.triggerEventHandler('searchChange', 'test');
      
      expect(component.onSearchChange).toHaveBeenCalledWith('test');
    });

    it('should handle search clear event', () => {
      component.searchTerm = 'test';
      spyOn(component, 'onSearchChange');
      
      searchInput.triggerEventHandler('searchClear', null);
      
      expect(component.onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const searchInput = fixture.debugElement.query(By.css('app-search-input'));
      expect(searchInput.componentInstance.ariaLabel).toBe('Benutzer suchen');
    });

    it('should have proper heading structure', () => {
      const heading = fixture.debugElement.query(By.css('h1'));
      expect(heading).toBeTruthy();
    });

    it('should have proper role attributes', () => {
      const userList = fixture.debugElement.query(By.css('.user-list'));
      expect(userList.nativeElement.getAttribute('role')).toBe('list');
    });
  });

  describe('Performance', () => {
    it('should not perform unnecessary filtering', () => {
      spyOn(component, 'filterUsers').and.callThrough();
      
      // Set same search term multiple times
      component.onSearchChange('John');
      component.onSearchChange('John');
      component.onSearchChange('John');
      
      // Should still call filterUsers for each call (debouncing is handled internally)
      expect(component.filterUsers).toHaveBeenCalledTimes(3);
    });

    it('should handle large user lists efficiently', (done) => {
      const largeUserList: User[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: i % 2 === 0 ? 'admin' : 'user'
      }));

      mockStore.overrideSelector(UserSelectors.selectAllUsers, largeUserList);
      mockStore.refreshState();
      fixture.detectChanges();

      const startTime = performance.now();
      component.onSearchChange('User 1');
      
      setTimeout(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
        done();
      }, 350);
    });
  });

  describe('Integration', () => {
    it('should work correctly with store updates', (done) => {
      const newUsers: User[] = [
        { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'user' }
      ];

      component.onSearchChange('Alice');
      
      setTimeout(() => {
        mockStore.overrideSelector(UserSelectors.selectAllUsers, [...mockUsers, ...newUsers]);
        mockStore.refreshState();
        fixture.detectChanges();
        
        component.filteredUsers$.subscribe(users => {
          expect(users.length).toBe(1);
          expect(users[0].name).toBe('Alice Brown');
          done();
        });
      }, 350);
    });
  });
});