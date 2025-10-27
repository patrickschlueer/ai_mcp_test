import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { User } from '../../../shared/models/user.interface';
import { UserFilter } from '../../../shared/models/user-filter.interface';
import { UserActions } from '../../../store/user/user.actions';
import { selectFilteredUsers, selectUserFilter, selectUsersLoading, selectUsersError } from '../../../store/user/user.selectors';
import { UserState } from '../../../store/user/user.reducer';

// Mock components
@Component({
  selector: 'app-filter-panel',
  template: '<div></div>'
})
class MockFilterPanelComponent {
  @Input() filter!: UserFilter;
  @Input() loading = false;
  @Output() filterChange = new EventEmitter<UserFilter>();
  @Output() clearFilter = new EventEmitter<void>();
}

@Component({
  selector: 'app-user-table',
  template: '<div></div>'
})
class MockUserTableComponent {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() sortColumn = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Output() sortChange = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() userSelect = new EventEmitter<User>();
  @Output() userDelete = new EventEmitter<User>();
  @Output() userEdit = new EventEmitter<User>();
}

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let store: MockStore<UserState>;
  
  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      department: 'IT',
      createdAt: new Date('2023-01-01'),
      lastLogin: new Date('2023-12-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'inactive',
      department: 'HR',
      createdAt: new Date('2023-02-01'),
      lastLogin: new Date('2023-11-01')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'moderator',
      status: 'active',
      department: 'Sales',
      createdAt: new Date('2023-03-01'),
      lastLogin: new Date('2023-12-15')
    }
  ];

  const initialFilter: UserFilter = {
    searchTerm: '',
    role: null,
    status: null,
    department: null,
    dateRange: null
  };

  const initialState = {
    users: {
      entities: {},
      ids: [],
      loading: false,
      error: null,
      filter: initialFilter
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        UserListComponent,
        MockFilterPanelComponent,
        MockUserTableComponent
      ],
      imports: [NoopAnimationsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    
    // Setup selector mocks
    store.overrideSelector(selectFilteredUsers, mockUsers);
    store.overrideSelector(selectUserFilter, initialFilter);
    store.overrideSelector(selectUsersLoading, false);
    store.overrideSelector(selectUsersError, null);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default filter', () => {
    expect(component.filter$).toBeDefined();
    component.filter$.subscribe(filter => {
      expect(filter).toEqual(initialFilter);
    });
  });

  it('should load users on init', () => {
    spyOn(store, 'dispatch');
    
    component.ngOnInit();
    
    expect(store.dispatch).toHaveBeenCalledWith(UserActions.loadUsers());
  });

  it('should display filtered users', () => {
    component.users$.subscribe(users => {
      expect(users).toEqual(mockUsers);
      expect(users.length).toBe(3);
    });
  });

  it('should handle filter changes', () => {
    spyOn(store, 'dispatch');
    const newFilter: UserFilter = {
      searchTerm: 'John',
      role: 'admin',
      status: 'active',
      department: null,
      dateRange: null
    };
    
    component.onFilterChange(newFilter);
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.setFilter({ filter: newFilter })
    );
  });

  it('should handle filter clear', () => {
    spyOn(store, 'dispatch');
    
    component.onClearFilter();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.clearFilter()
    );
  });

  it('should handle sort changes', () => {
    spyOn(store, 'dispatch');
    const sortConfig = { column: 'name', direction: 'asc' as const };
    
    component.onSortChange(sortConfig);
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.setSorting({ sortColumn: 'name', sortDirection: 'asc' })
    );
  });

  it('should handle user selection', () => {
    spyOn(component.userSelect, 'emit');
    const user = mockUsers[0];
    
    component.onUserSelect(user);
    
    expect(component.userSelect.emit).toHaveBeenCalledWith(user);
  });

  it('should handle user deletion', () => {
    spyOn(store, 'dispatch');
    const user = mockUsers[0];
    
    component.onUserDelete(user);
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.deleteUser({ userId: user.id })
    );
  });

  it('should handle user edit', () => {
    spyOn(component.userEdit, 'emit');
    const user = mockUsers[0];
    
    component.onUserEdit(user);
    
    expect(component.userEdit.emit).toHaveBeenCalledWith(user);
  });

  it('should render filter panel component', () => {
    const filterPanel = fixture.debugElement.query(By.css('app-filter-panel'));
    expect(filterPanel).toBeTruthy();
  });

  it('should render user table component', () => {
    const userTable = fixture.debugElement.query(By.css('app-user-table'));
    expect(userTable).toBeTruthy();
  });

  it('should pass correct props to filter panel', () => {
    const filterPanel = fixture.debugElement.query(By.css('app-filter-panel'));
    const filterPanelComponent = filterPanel.componentInstance as MockFilterPanelComponent;
    
    expect(filterPanelComponent.filter).toEqual(initialFilter);
    expect(filterPanelComponent.loading).toBeFalse();
  });

  it('should pass correct props to user table', () => {
    const userTable = fixture.debugElement.query(By.css('app-user-table'));
    const userTableComponent = userTable.componentInstance as MockUserTableComponent;
    
    expect(userTableComponent.users).toEqual(mockUsers);
    expect(userTableComponent.loading).toBeFalse();
  });

  it('should handle loading state', () => {
    store.overrideSelector(selectUsersLoading, true);
    store.refreshState();
    fixture.detectChanges();
    
    component.loading$.subscribe(loading => {
      expect(loading).toBeTrue();
    });
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load users';
    store.overrideSelector(selectUsersError, errorMessage);
    store.refreshState();
    fixture.detectChanges();
    
    component.error$.subscribe(error => {
      expect(error).toBe(errorMessage);
    });
  });

  it('should filter users by search term', () => {
    const filteredUsers = [mockUsers[0]];
    store.overrideSelector(selectFilteredUsers, filteredUsers);
    store.refreshState();
    fixture.detectChanges();
    
    component.users$.subscribe(users => {
      expect(users).toEqual(filteredUsers);
      expect(users.length).toBe(1);
      expect(users[0].name).toBe('John Doe');
    });
  });

  it('should filter users by role', () => {
    const adminUsers = mockUsers.filter(user => user.role === 'admin');
    store.overrideSelector(selectFilteredUsers, adminUsers);
    store.refreshState();
    fixture.detectChanges();
    
    component.users$.subscribe(users => {
      expect(users).toEqual(adminUsers);
      expect(users.every(user => user.role === 'admin')).toBeTrue();
    });
  });

  it('should filter users by status', () => {
    const activeUsers = mockUsers.filter(user => user.status === 'active');
    store.overrideSelector(selectFilteredUsers, activeUsers);
    store.refreshState();
    fixture.detectChanges();
    
    component.users$.subscribe(users => {
      expect(users).toEqual(activeUsers);
      expect(users.every(user => user.status === 'active')).toBeTrue();
    });
  });

  it('should filter users by department', () => {
    const itUsers = mockUsers.filter(user => user.department === 'IT');
    store.overrideSelector(selectFilteredUsers, itUsers);
    store.refreshState();
    fixture.detectChanges();
    
    component.users$.subscribe(users => {
      expect(users).toEqual(itUsers);
      expect(users.every(user => user.department === 'IT')).toBeTrue();
    });
  });

  it('should handle empty filter results', () => {
    store.overrideSelector(selectFilteredUsers, []);
    store.refreshState();
    fixture.detectChanges();
    
    component.users$.subscribe(users => {
      expect(users).toEqual([]);
      expect(users.length).toBe(0);
    });
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should emit filter change from child component', () => {
    const filterPanel = fixture.debugElement.query(By.css('app-filter-panel'));
    const newFilter: UserFilter = {
      searchTerm: 'test',
      role: 'admin',
      status: null,
      department: null,
      dateRange: null
    };
    
    spyOn(store, 'dispatch');
    filterPanel.componentInstance.filterChange.emit(newFilter);
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.setFilter({ filter: newFilter })
    );
  });

  it('should emit clear filter from child component', () => {
    const filterPanel = fixture.debugElement.query(By.css('app-filter-panel'));
    
    spyOn(store, 'dispatch');
    filterPanel.componentInstance.clearFilter.emit();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.clearFilter()
    );
  });

  it('should emit sort change from child component', () => {
    const userTable = fixture.debugElement.query(By.css('app-user-table'));
    const sortConfig = { column: 'email', direction: 'desc' as const };
    
    spyOn(store, 'dispatch');
    userTable.componentInstance.sortChange.emit(sortConfig);
    
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.setSorting({ sortColumn: 'email', sortDirection: 'desc' })
    );
  });

  it('should emit user events from child component', () => {
    const userTable = fixture.debugElement.query(By.css('app-user-table'));
    const user = mockUsers[0];
    
    spyOn(component.userSelect, 'emit');
    spyOn(component.userEdit, 'emit');
    spyOn(store, 'dispatch');
    
    userTable.componentInstance.userSelect.emit(user);
    userTable.componentInstance.userEdit.emit(user);
    userTable.componentInstance.userDelete.emit(user);
    
    expect(component.userSelect.emit).toHaveBeenCalledWith(user);
    expect(component.userEdit.emit).toHaveBeenCalledWith(user);
    expect(store.dispatch).toHaveBeenCalledWith(
      UserActions.deleteUser({ userId: user.id })
    );
  });
});