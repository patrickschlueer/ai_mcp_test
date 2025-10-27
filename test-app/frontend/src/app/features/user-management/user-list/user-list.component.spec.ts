import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { UserService } from '../../../core/services/user.service';
import { User, UserRole } from '../../../core/models/user.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;

  const mockUsers: User[] = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: UserRole.ADMIN,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: UserRole.USER,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ];

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser']);

    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      imports: [
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    userService.getUsers.and.returnValue(of(mockUsers));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    component.ngOnInit();
    
    expect(userService.getUsers).toHaveBeenCalled();
    expect(component.users).toEqual(mockUsers);
    expect(component.filteredUsers).toEqual(mockUsers);
  });

  it('should display users in table', () => {
    component.ngOnInit();
    fixture.detectChanges();

    const tableRows = fixture.debugElement.queryAll(By.css('mat-row'));
    expect(tableRows.length).toBe(mockUsers.length);

    const firstRowCells = tableRows[0].queryAll(By.css('mat-cell'));
    expect(firstRowCells[0].nativeElement.textContent.trim()).toBe('John');
    expect(firstRowCells[1].nativeElement.textContent.trim()).toBe('Doe');
    expect(firstRowCells[2].nativeElement.textContent.trim()).toBe('john.doe@example.com');
    expect(firstRowCells[3].nativeElement.textContent.trim()).toBe('ADMIN');
  });

  it('should filter users by role', () => {
    component.users = mockUsers;
    component.filteredUsers = mockUsers;

    component.onRoleFilterChange(UserRole.ADMIN);
    
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].role).toBe(UserRole.ADMIN);
  });

  it('should show all users when no role filter is applied', () => {
    component.users = mockUsers;
    component.filteredUsers = [];

    component.onRoleFilterChange('');
    
    expect(component.filteredUsers).toEqual(mockUsers);
  });

  it('should call deleteUser when delete button is clicked', () => {
    userService.deleteUser.and.returnValue(of(void 0));
    spyOn(component, 'loadUsers');

    component.deleteUser(1);

    expect(userService.deleteUser).toHaveBeenCalledWith(1);
  });

  it('should reload users after successful deletion', () => {
    userService.deleteUser.and.returnValue(of(void 0));
    spyOn(component, 'loadUsers');

    component.deleteUser(1);

    expect(component.loadUsers).toHaveBeenCalled();
  });
});