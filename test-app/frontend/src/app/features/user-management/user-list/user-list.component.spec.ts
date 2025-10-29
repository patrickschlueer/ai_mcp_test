import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { UserListComponent } from './user-list.component';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../shared/models/user.model';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { selectAllUsers, selectUsersLoading } from '../../../store/user/user.selectors';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let store: MockStore;
  let debugElement: DebugElement;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      isActive: false,
      createdAt: new Date('2024-01-02')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@company.com',
      isActive: true,
      createdAt: new Date('2024-01-03')
    }
  ];

  const initialState = {
    users: {
      ids: ['1', '2', '3'],
      entities: {
        '1': mockUsers[0],
        '2': mockUsers[1],
        '3': mockUsers[2]
      },
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser']);

    await TestBed.configureTestingModule({
      declarations: [UserListComponent, SearchInputComponent],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    store = TestBed.inject(MockStore);
    debugElement = fixture.debugElement;

    // Setup selectors
    store.overrideSelector(selectAllUsers, mockUsers);
    store.overrideSelector(selectUsersLoading, false);

    userService.getUsers.and.returnValue(of(mockUsers));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with empty filter text', () => {
      expect(component.filterText).toBe('');
    });

    it('should load users on init', () => {
      fixture.detectChanges();
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should set up filteredUsers$ observable', () => {
      fixture.detectChanges();
      expect(component.filteredUsers$).toBeDefined();
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show all users when filter text is empty', (done) => {
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(3);
        expect(users).toEqual(mockUsers);
        done();
      });
    });

    it('should filter users by name', (done) => {
      component.onFilterChange('John');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('John Doe');
        done();
      });
    });

    it('should filter users by email', (done) => {
      component.onFilterChange('jane.smith@example.com');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0].email).toBe('jane.smith@example.com');
        done();
      });
    });

    it('should filter users case-insensitively', (done) => {
      component.onFilterChange('JANE');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('Jane Smith');
        done();
      });
    });

    it('should return empty array when no users match filter', (done) => {
      component.onFilterChange('nonexistent');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(0);
        done();
      });
    });

    it('should filter by partial matches in name', (done) => {
      component.onFilterChange('Jo');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(2);
        expect(users.some(u => u.name === 'John Doe')).toBeTruthy();
        expect(users.some(u => u.name === 'Bob Johnson')).toBeTruthy();
        done();
      });
    });

    it('should filter by partial matches in email domain', (done) => {
      component.onFilterChange('example.com');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(2);
        expect(users.every(u => u.email.includes('example.com'))).toBeTruthy();
        done();
      });
    });

    it('should update filterText property when onFilterChange is called', () => {
      const filterValue = 'test filter';
      component.onFilterChange(filterValue);
      expect(component.filterText).toBe(filterValue);
    });

    it('should reset filter when empty string is provided', (done) => {
      // First apply a filter
      component.onFilterChange('John');
      
      // Then reset it
      component.onFilterChange('');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(3);
        expect(component.filterText).toBe('');
        done();
      });
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render search input component', () => {
      const searchInput = debugElement.query(By.css('app-search-input'));
      expect(searchInput).toBeTruthy();
    });

    it('should pass correct placeholder to search input', () => {
      const searchInput = debugElement.query(By.css('app-search-input'));
      expect(searchInput.attributes['placeholder']).toBe('Nach Name oder Email suchen...');
    });

    it('should bind filterText to search input value', () => {
      component.filterText = 'test value';
      fixture.detectChanges();
      
      const searchInput = debugElement.query(By.css('app-search-input'));
      expect(searchInput.properties['value']).toBe('test value');
    });

    it('should call onFilterChange when search input value changes', () => {
      spyOn(component, 'onFilterChange');
      
      const searchInput = debugElement.query(By.css('app-search-input'));
      const searchInputComponent = searchInput.componentInstance;
      
      searchInputComponent.valueChange.emit('new filter');
      
      expect(component.onFilterChange).toHaveBeenCalledWith('new filter');
    });

    it('should render user cards for filtered users', () => {
      component.onFilterChange('John');
      fixture.detectChanges();
      
      const userCards = debugElement.queryAll(By.css('.user-card'));
      expect(userCards.length).toBe(1);
    });

    it('should display "Keine Benutzer gefunden" when no users match filter', () => {
      component.onFilterChange('nonexistent');
      fixture.detectChanges();
      
      const noResultsMessage = debugElement.query(By.css('.no-users'));
      expect(noResultsMessage).toBeTruthy();
      expect(noResultsMessage.nativeElement.textContent.trim()).toBe('Keine Benutzer gefunden.');
    });

    it('should not display "Keine Benutzer gefunden" when users are found', () => {
      component.onFilterChange('John');
      fixture.detectChanges();
      
      const noResultsMessage = debugElement.query(By.css('.no-users'));
      expect(noResultsMessage).toBeFalsy();
    });
  });

  describe('Observable Stream Behavior', () => {
    it('should create new filtered results when users$ changes', (done) => {
      const newUsers: User[] = [
        {
          id: '4',
          name: 'Alice Wonder',
          email: 'alice@test.com',
          isActive: true,
          createdAt: new Date('2024-01-04')
        }
      ];

      store.overrideSelector(selectAllUsers, newUsers);
      store.refreshState();
      fixture.detectChanges();

      component.filteredUsers$.subscribe(users => {
        expect(users).toEqual(newUsers);
        done();
      });
    });

    it('should maintain filter when users list updates', (done) => {
      component.onFilterChange('Alice');
      
      const newUsers: User[] = [
        ...mockUsers,
        {
          id: '4',
          name: 'Alice Wonder',
          email: 'alice@test.com',
          isActive: true,
          createdAt: new Date('2024-01-04')
        }
      ];

      store.overrideSelector(selectAllUsers, newUsers);
      store.refreshState();
      fixture.detectChanges();

      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('Alice Wonder');
        done();
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when loading is true', () => {
      store.overrideSelector(selectUsersLoading, true);
      store.refreshState();
      fixture.detectChanges();
      
      const loadingIndicator = debugElement.query(By.css('.loading'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should not display loading indicator when loading is false', () => {
      store.overrideSelector(selectUsersLoading, false);
      store.refreshState();
      fixture.detectChanges();
      
      const loadingIndicator = debugElement.query(By.css('.loading'));
      expect(loadingIndicator).toBeFalsy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined filter text gracefully', (done) => {
      component.onFilterChange(null as any);
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(3);
        done();
      });
    });

    it('should handle empty users array', (done) => {
      store.overrideSelector(selectAllUsers, []);
      store.refreshState();
      fixture.detectChanges();
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(0);
        done();
      });
    });

    it('should trim whitespace from filter text', (done) => {
      component.onFilterChange('  John  ');
      
      component.filteredUsers$.subscribe(users => {
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('John Doe');
        done();
      });
    });
  });
});