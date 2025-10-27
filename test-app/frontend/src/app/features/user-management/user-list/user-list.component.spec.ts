import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { EmptyStateMessageComponent } from '../../../shared/components/empty-state-message/empty-state-message.component';
import { UserCounterComponent } from '../components/user-counter/user-counter.component';
import { UserCardComponent } from '../components/user-card/user-card.component';
import { UserActions } from '../store/user.actions';
import { selectAllUsers, selectFilteredUsers, selectUsersLoading, selectUsersError, selectSearchTerm } from '../store/user.selectors';
import { User } from '../models/user.interface';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let store: MockStore;
  let debugElement: DebugElement;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'active',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'user',
      status: 'inactive',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03')
    }
  ];

  const initialState = {
    users: {
      entities: {},
      ids: [],
      loading: false,
      error: null,
      searchTerm: ''
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        UserListComponent,
        SearchInputComponent,
        EmptyStateMessageComponent,
        UserCounterComponent,
        UserCardComponent
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store) as MockStore;
    debugElement = fixture.debugElement;

    // Setup default selectors
    store.overrideSelector(selectAllUsers, mockUsers);
    store.overrideSelector(selectFilteredUsers, mockUsers);
    store.overrideSelector(selectUsersLoading, false);
    store.overrideSelector(selectUsersError, null);
    store.overrideSelector(selectSearchTerm, '');
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should dispatch loadUsers action on init', () => {
      spyOn(store, 'dispatch');
      
      component.ngOnInit();
      
      expect(store.dispatch).toHaveBeenCalledWith(UserActions.loadUsers());
    });

    it('should initialize with correct selectors', () => {
      component.ngOnInit();
      
      component.users$.subscribe(users => {
        expect(users).toEqual(mockUsers);
      });
      
      component.loading$.subscribe(loading => {
        expect(loading).toBe(false);
      });
      
      component.error$.subscribe(error => {
        expect(error).toBeNull();
      });
    });
  });

  describe('Template Structure', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render main container with correct class', () => {
      const container = debugElement.query(By.css('.user-list-container'));
      expect(container).toBeTruthy();
    });

    it('should render header with title and user counter', () => {
      const header = debugElement.query(By.css('.user-list-header'));
      const title = debugElement.query(By.css('.user-list-title'));
      const counter = debugElement.query(By.css('app-user-counter'));
      
      expect(header).toBeTruthy();
      expect(title).toBeTruthy();
      expect(title.nativeElement.textContent.trim()).toBe('Benutzer verwalten');
      expect(counter).toBeTruthy();
    });

    it('should render search input component', () => {
      const searchInput = debugElement.query(By.css('app-search-input'));
      expect(searchInput).toBeTruthy();
    });

    it('should render user list when users are available', () => {
      const userList = debugElement.query(By.css('.user-list'));
      const userCards = debugElement.queryAll(By.css('app-user-card'));
      
      expect(userList).toBeTruthy();
      expect(userCards.length).toBe(mockUsers.length);
    });

    it('should pass correct user data to user cards', () => {
      const userCards = debugElement.queryAll(By.css('app-user-card'));
      
      userCards.forEach((card, index) => {
        expect(card.componentInstance.user).toEqual(mockUsers[index]);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      store.overrideSelector(selectUsersLoading, true);
      store.refreshState();
      fixture.detectChanges();
      
      const loadingIndicator = debugElement.query(By.css('.loading-indicator'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should hide user list when loading', () => {
      store.overrideSelector(selectUsersLoading, true);
      store.refreshState();
      fixture.detectChanges();
      
      const userList = debugElement.query(By.css('.user-list'));
      expect(userList).toBeFalsy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no users available', () => {
      store.overrideSelector(selectFilteredUsers, []);
      store.overrideSelector(selectUsersLoading, false);
      store.refreshState();
      fixture.detectChanges();
      
      const emptyState = debugElement.query(By.css('app-empty-state-message'));
      expect(emptyState).toBeTruthy();
    });

    it('should show different empty state for filtered results', () => {
      store.overrideSelector(selectAllUsers, mockUsers);
      store.overrideSelector(selectFilteredUsers, []);
      store.overrideSelector(selectSearchTerm, 'xyz');
      store.overrideSelector(selectUsersLoading, false);
      store.refreshState();
      fixture.detectChanges();
      
      const emptyState = debugElement.query(By.css('app-empty-state-message'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.componentInstance.message).toBe('Keine Benutzer gefunden, die Ihren Suchkriterien entsprechen.');
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      const errorMessage = 'Failed to load users';
      store.overrideSelector(selectUsersError, errorMessage);
      store.refreshState();
      fixture.detectChanges();
      
      const errorElement = debugElement.query(By.css('.error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent.trim()).toContain(errorMessage);
    });

    it('should hide user list when error occurs', () => {
      store.overrideSelector(selectUsersError, 'Error message');
      store.refreshState();
      fixture.detectChanges();
      
      const userList = debugElement.query(By.css('.user-list'));
      expect(userList).toBeFalsy();
    });
  });

  describe('Search Functionality', () => {
    it('should handle search input changes', () => {
      spyOn(store, 'dispatch');
      const searchTerm = 'john';
      
      component.onSearchChange(searchTerm);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UserActions.setSearchTerm({ searchTerm })
      );
    });

    it('should display filtered users based on search term', () => {
      const filteredUsers = [mockUsers[0]]; // Only John Doe
      store.overrideSelector(selectFilteredUsers, filteredUsers);
      store.overrideSelector(selectSearchTerm, 'john');
      store.refreshState();
      fixture.detectChanges();
      
      const userCards = debugElement.queryAll(By.css('app-user-card'));
      expect(userCards.length).toBe(1);
      expect(userCards[0].componentInstance.user).toEqual(mockUsers[0]);
    });

    it('should clear search when clear button is clicked', () => {
      spyOn(store, 'dispatch');
      
      component.onSearchClear();
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UserActions.clearSearch()
      );
    });

    it('should update user counter component with filtered count', () => {
      const filteredUsers = [mockUsers[0]];
      store.overrideSelector(selectFilteredUsers, filteredUsers);
      store.refreshState();
      fixture.detectChanges();
      
      const userCounter = debugElement.query(By.css('app-user-counter'));
      expect(userCounter.componentInstance.count).toBe(1);
      expect(userCounter.componentInstance.total).toBe(mockUsers.length);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should focus search input on Ctrl+F', () => {
      fixture.detectChanges();
      const searchInput = debugElement.query(By.css('app-search-input'));
      spyOn(searchInput.componentInstance, 'focus');
      
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true
      });
      
      document.dispatchEvent(event);
      
      expect(searchInput.componentInstance.focus).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should handle user card click events', () => {
      spyOn(component, 'onUserSelect');
      fixture.detectChanges();
      
      const userCard = debugElement.query(By.css('app-user-card'));
      userCard.componentInstance.userClick.emit(mockUsers[0]);
      
      expect(component.onUserSelect).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should handle user edit events', () => {
      spyOn(component, 'onUserEdit');
      fixture.detectChanges();
      
      const userCard = debugElement.query(By.css('app-user-card'));
      userCard.componentInstance.userEdit.emit(mockUsers[0]);
      
      expect(component.onUserEdit).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should handle user delete events', () => {
      spyOn(component, 'onUserDelete');
      fixture.detectChanges();
      
      const userCard = debugElement.query(By.css('app-user-card'));
      userCard.componentInstance.userDelete.emit(mockUsers[0]);
      
      expect(component.onUserDelete).toHaveBeenCalledWith(mockUsers[0]);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      fixture.detectChanges();
      
      const container = debugElement.query(By.css('.user-list-container'));
      expect(container.nativeElement.getAttribute('role')).toBe('region');
      expect(container.nativeElement.getAttribute('aria-label')).toBe('Benutzer verwalten');
    });

    it('should announce search results to screen readers', () => {
      const filteredUsers = [mockUsers[0]];
      store.overrideSelector(selectFilteredUsers, filteredUsers);
      store.overrideSelector(selectSearchTerm, 'john');
      store.refreshState();
      fixture.detectChanges();
      
      const announcement = debugElement.query(By.css('[aria-live="polite"]'));
      expect(announcement).toBeTruthy();
      expect(announcement.nativeElement.textContent.trim()).toContain('1 Benutzer gefunden');
    });
  });

  describe('Performance', () => {
    it('should track users by id for change detection optimization', () => {
      expect(component.trackByUserId).toBeDefined();
      
      const result = component.trackByUserId(0, mockUsers[0]);
      expect(result).toBe(mockUsers[0].id);
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      component.ngOnInit();
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});