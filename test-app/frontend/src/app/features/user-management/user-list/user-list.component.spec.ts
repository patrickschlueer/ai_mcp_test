import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { User } from '../../../shared/models/user.model';
import * as UserActions from '../../../store/actions/user.actions';
import { selectAllUsers, selectUsersLoading } from '../../../store/selectors/user.selectors';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Admin',
      status: 'Active',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'User',
      status: 'Inactive',
      createdAt: new Date('2024-01-02')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'Moderator',
      status: 'Active',
      createdAt: new Date('2024-01-03')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [
        provideMockStore({
          initialState: {},
          selectors: [
            { selector: selectAllUsers, value: mockUsers },
            { selector: selectUsersLoading, value: false }
          ]
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    expect(dispatchSpy).toHaveBeenCalledWith(UserActions.loadUsers());
  });

  it('should display all users initially', () => {
    const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
    expect(userRows.length).toBe(3);
  });

  describe('Search functionality', () => {
    it('should initialize searchTerm as empty string', () => {
      expect(component.searchTerm).toBe('');
    });

    it('should filter users by name when searchTerm is set', () => {
      component.searchTerm = 'John';
      component.filterUsers();
      fixture.detectChanges();

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].name).toBe('John Doe');
    });

    it('should filter users by email when searchTerm is set', () => {
      component.searchTerm = 'jane.smith';
      component.filterUsers();
      fixture.detectChanges();

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].email).toBe('jane.smith@example.com');
    });

    it('should be case insensitive when filtering', () => {
      component.searchTerm = 'JOHN';
      component.filterUsers();
      fixture.detectChanges();

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].name).toBe('John Doe');
    });

    it('should show all users when searchTerm is empty', () => {
      component.searchTerm = '';
      component.filterUsers();
      fixture.detectChanges();

      expect(component.filteredUsers.length).toBe(3);
    });

    it('should show no users when searchTerm matches nothing', () => {
      component.searchTerm = 'nonexistent';
      component.filterUsers();
      fixture.detectChanges();

      expect(component.filteredUsers.length).toBe(0);
    });

    it('should filter users when onSearchChange is called', () => {
      spyOn(component, 'filterUsers');
      
      component.onSearchChange('test search');
      
      expect(component.searchTerm).toBe('test search');
      expect(component.filterUsers).toHaveBeenCalled();
    });

    it('should update displayed users after filtering', () => {
      component.searchTerm = 'Jane';
      component.filterUsers();
      fixture.detectChanges();

      const userRows = fixture.debugElement.queryAll(By.css('.user-row'));
      expect(userRows.length).toBe(1);
      
      const nameCell = userRows[0].query(By.css('.user-name'));
      expect(nameCell.nativeElement.textContent.trim()).toBe('Jane Smith');
    });

    it('should handle partial matches in name and email', () => {
      component.searchTerm = 'o';
      component.filterUsers();
      fixture.detectChanges();

      // Should match 'John Doe', 'Bob Johnson'
      expect(component.filteredUsers.length).toBe(2);
      expect(component.filteredUsers.some(user => user.name === 'John Doe')).toBe(true);
      expect(component.filteredUsers.some(user => user.name === 'Bob Johnson')).toBe(true);
    });
  });

  describe('User display', () => {
    it('should display user information correctly', () => {
      const firstUserRow = fixture.debugElement.query(By.css('.user-row'));
      
      const nameElement = firstUserRow.query(By.css('.user-name'));
      const emailElement = firstUserRow.query(By.css('.user-email'));
      const roleElement = firstUserRow.query(By.css('.user-role'));
      const statusElement = firstUserRow.query(By.css('.user-status'));

      expect(nameElement.nativeElement.textContent.trim()).toBe('John Doe');
      expect(emailElement.nativeElement.textContent.trim()).toBe('john.doe@example.com');
      expect(roleElement.nativeElement.textContent.trim()).toBe('Admin');
      expect(statusElement.nativeElement.textContent.trim()).toBe('Active');
    });

    it('should show loading state', () => {
      store.overrideSelector(selectUsersLoading, true);
      store.refreshState();
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading'));
      expect(loadingElement).toBeTruthy();
    });

    it('should show empty state when no users match filter', () => {
      component.searchTerm = 'nonexistent';
      component.filterUsers();
      fixture.detectChanges();

      const emptyStateElement = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyStateElement).toBeTruthy();
    });
  });

  describe('User actions', () => {
    it('should dispatch edit user action when edit button is clicked', () => {
      const editButton = fixture.debugElement.query(By.css('.edit-btn'));
      editButton.nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        UserActions.selectUser({ user: mockUsers[0] })
      );
    });

    it('should dispatch delete user action when delete button is clicked', () => {
      const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
      deleteButton.nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        UserActions.deleteUser({ id: mockUsers[0].id })
      );
    });
  });

  describe('Component lifecycle', () => {
    it('should initialize filteredUsers with all users on init', () => {
      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should update filteredUsers when users change', () => {
      const newUsers: User[] = [
        {
          id: '4',
          name: 'New User',
          email: 'new.user@example.com',
          role: 'User',
          status: 'Active',
          createdAt: new Date()
        }
      ];

      store.overrideSelector(selectAllUsers, newUsers);
      store.refreshState();
      fixture.detectChanges();

      expect(component.filteredUsers).toEqual(newUsers);
    });

    it('should maintain search filter when users update', () => {
      component.searchTerm = 'John';
      component.filterUsers();
      
      const updatedUsers = [
        ...mockUsers,
        {
          id: '4',
          name: 'Johnny Cash',
          email: 'johnny.cash@example.com',
          role: 'User',
          status: 'Active',
          createdAt: new Date()
        }
      ];

      store.overrideSelector(selectAllUsers, updatedUsers);
      store.refreshState();
      fixture.detectChanges();
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(2);
      expect(component.filteredUsers.some(user => user.name === 'John Doe')).toBe(true);
      expect(component.filteredUsers.some(user => user.name === 'Johnny Cash')).toBe(true);
    });
  });
});