import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';

import { UserListComponent } from './user-list.component';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;

  const mockUsers: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: '3',
      email: 'user3@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      role: 'USER',
      isActive: false,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03')
    }
  ];

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser']);
    userServiceSpy.getUsers.and.returnValue(of({ users: mockUsers, total: 3 }));
    userServiceSpy.deleteUser.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      declarations: [
        UserListComponent,
        UserTableRowComponent
      ],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(userService.getUsers).toHaveBeenCalled();
    expect(component.users).toEqual(mockUsers);
    expect(component.totalUsers).toBe(3);
  });

  it('should display user rows', () => {
    component.users = mockUsers;
    fixture.detectChanges();

    const userRows = fixture.debugElement.queryAll(By.css('app-user-table-row'));
    expect(userRows.length).toBe(3);
  });

  it('should filter users by search term', () => {
    component.users = mockUsers;
    component.ngOnInit();
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.css('input[type="search"]'));
    searchInput.nativeElement.value = 'john';
    searchInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      search: 'john'
    }));
  });

  it('should handle user deletion', () => {
    component.users = mockUsers;
    fixture.detectChanges();

    component.onDeleteUser('1');

    expect(userService.deleteUser).toHaveBeenCalledWith('1');
  });

  it('should show loading state', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const loadingElement = fixture.debugElement.query(By.css('.loading'));
    expect(loadingElement).toBeTruthy();
  });

  it('should handle role filter change', () => {
    component.ngOnInit();
    
    component.onRoleFilterChange('ADMIN');
    
    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      role: 'ADMIN'
    }));
  });

  it('should handle status filter change', () => {
    component.ngOnInit();
    
    component.onStatusFilterChange('inactive');
    
    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      isActive: false
    }));
  });

  it('should handle search input with debouncing', (done) => {
    component.ngOnInit();
    
    // Simulate multiple rapid search inputs
    component.onSearchInput();
    
    // Wait for debounce to complete
    setTimeout(() => {
      expect(userService.getUsers).toHaveBeenCalled();
      done();
    }, 350);
  });

  it('should handle pagination change', () => {
    component.ngOnInit();
    
    component.onPageChange(2);
    
    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 2
    }));
  });

  it('should handle page size change', () => {
    component.ngOnInit();
    
    component.onPageSizeChange(50);
    
    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      limit: 50
    }));
  });

  it('should sort users by column', () => {
    component.ngOnInit();
    
    component.onSort({ column: 'email', direction: 'asc' });
    
    expect(userService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
      sortBy: 'email',
      sortOrder: 'asc'
    }));
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load users';
    userService.getUsers.and.throwError(errorMessage);
    
    component.loadUsers();
    
    expect(component.error).toBe(errorMessage);
    expect(component.isLoading).toBeFalse();
  });

  it('should show empty state when no users', () => {
    component.users = [];
    component.totalUsers = 0;
    fixture.detectChanges();

    const emptyStateElement = fixture.debugElement.query(By.css('.no-results'));
    expect(emptyStateElement).toBeTruthy();
  });

  it('should reset filters', () => {
    component.searchForm.patchValue({
      search: 'test',
      role: 'ADMIN',
      status: 'inactive'
    });
    
    component.resetFilters();
    
    expect(component.searchForm.value.search).toBe('');
    expect(component.searchForm.value.role).toBe('');
    expect(component.searchForm.value.status).toBe('');
  });

  it('should export users', () => {
    spyOn(component, 'exportUsers');
    
    const exportButton = fixture.debugElement.query(By.css('.export-button'));
    exportButton?.nativeElement.click();
    
    expect(component.exportUsers).toHaveBeenCalled();
  });

  it('should open user creation dialog', () => {
    spyOn(component, 'openCreateUserDialog');
    
    const createButton = fixture.debugElement.query(By.css('.create-user-button'));
    createButton?.nativeElement.click();
    
    expect(component.openCreateUserDialog).toHaveBeenCalled();
  });
});