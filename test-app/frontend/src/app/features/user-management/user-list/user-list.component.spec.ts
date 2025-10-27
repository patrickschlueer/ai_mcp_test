import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let mockUsers: User[];

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers']);

    mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'active',
        createdAt: new Date('2024-01-01')
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        status: 'inactive',
        createdAt: new Date('2024-01-02')
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@test.com',
        role: 'user',
        status: 'active',
        createdAt: new Date('2024-01-03')
      }
    ];

    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    userService.getUsers.and.returnValue(of(mockUsers));

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with empty searchQuery', () => {
      expect(component.searchQuery).toBe('');
    });

    it('should load users on init', () => {
      fixture.detectChanges();
      expect(userService.getUsers).toHaveBeenCalled();
      expect(component.users).toEqual(mockUsers);
    });

    it('should initialize filteredUsers with all users', () => {
      fixture.detectChanges();
      expect(component.filteredUsers).toEqual(mockUsers);
    });
  });

  describe('filterUsers method', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter users by name (case insensitive)', () => {
      component.searchQuery = 'john';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].name).toBe('John Doe');
    });

    it('should filter users by email (case insensitive)', () => {
      component.searchQuery = 'jane@example';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].email).toBe('jane@example.com');
    });

    it('should return multiple matching users', () => {
      component.searchQuery = 'user';
      component.filterUsers();

      const userRoleUsers = component.filteredUsers.filter(u => u.role === 'user');
      expect(userRoleUsers.length).toBe(2);
    });

    it('should return empty array when no matches found', () => {
      component.searchQuery = 'nonexistent';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(0);
    });

    it('should return all users when search query is empty', () => {
      component.searchQuery = '';
      component.filterUsers();

      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should handle whitespace-only search query', () => {
      component.searchQuery = '   ';
      component.filterUsers();

      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should filter by partial name match', () => {
      component.searchQuery = 'Jo';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(2);
      const names = component.filteredUsers.map(u => u.name);
      expect(names).toContain('John Doe');
      expect(names).toContain('Bob Johnson');
    });

    it('should filter by partial email match', () => {
      component.searchQuery = 'example';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(2);
      const emails = component.filteredUsers.map(u => u.email);
      expect(emails).toContain('john@example.com');
      expect(emails).toContain('jane@example.com');
    });
  });

  describe('onSearchChange method', () => {
    beforeEach(() => {
      fixture.detectChanges();
      spyOn(component, 'filterUsers');
    });

    it('should update searchQuery and call filterUsers', () => {
      const searchTerm = 'test search';
      component.onSearchChange(searchTerm);

      expect(component.searchQuery).toBe(searchTerm);
      expect(component.filterUsers).toHaveBeenCalled();
    });

    it('should handle empty search term', () => {
      component.onSearchChange('');

      expect(component.searchQuery).toBe('');
      expect(component.filterUsers).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render all users initially', () => {
      const userElements = fixture.debugElement.queryAll(By.css('.user-item'));
      expect(userElements.length).toBe(3);
    });

    it('should update displayed users when filtered', () => {
      component.searchQuery = 'john';
      component.filterUsers();
      fixture.detectChanges();

      const userElements = fixture.debugElement.queryAll(By.css('.user-item'));
      expect(userElements.length).toBe(1);
    });

    it('should display user count correctly', () => {
      const countElement = fixture.debugElement.query(By.css('.user-count'));
      if (countElement) {
        expect(countElement.nativeElement.textContent).toContain('3');
      }
    });

    it('should show filtered count when search is applied', () => {
      component.searchQuery = 'john';
      component.filterUsers();
      fixture.detectChanges();

      const countElement = fixture.debugElement.query(By.css('.user-count'));
      if (countElement) {
        expect(countElement.nativeElement.textContent).toContain('1');
      }
    });

    it('should display no results message when no users match filter', () => {
      component.searchQuery = 'nonexistent';
      component.filterUsers();
      fixture.detectChanges();

      const noResultsElement = fixture.debugElement.query(By.css('.no-results'));
      expect(noResultsElement).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined users array', () => {
      component.users = undefined as any;
      component.searchQuery = 'test';
      
      expect(() => component.filterUsers()).not.toThrow();
      expect(component.filteredUsers).toEqual([]);
    });

    it('should handle null searchQuery', () => {
      component.searchQuery = null as any;
      
      expect(() => component.filterUsers()).not.toThrow();
      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should handle special characters in search', () => {
      component.searchQuery = '@example.com';
      component.filterUsers();

      expect(component.filteredUsers.length).toBe(2);
    });

    it('should handle numeric search terms', () => {
      component.searchQuery = '1';
      component.filterUsers();

      // Should not match anything in name/email for our test data
      expect(component.filteredUsers.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should not modify original users array during filtering', () => {
      const originalUsers = [...mockUsers];
      component.searchQuery = 'john';
      component.filterUsers();

      expect(component.users).toEqual(originalUsers);
    });

    it('should create new filteredUsers array on each filter', () => {
      const firstFilter = component.filteredUsers;
      component.searchQuery = 'test';
      component.filterUsers();
      const secondFilter = component.filteredUsers;

      expect(firstFilter).not.toBe(secondFilter);
    });
  });
});