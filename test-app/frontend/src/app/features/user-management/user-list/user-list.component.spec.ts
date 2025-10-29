import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserListComponent } from './user-list.component';
import { User } from '../../../models/user.model';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  const mockUsers: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    {
      id: '2',
      email: 'user2@example.com',
      name: 'User Two',
      role: 'ADMIN',
      isActive: false,
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MatTableModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display loading spinner when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('should display users table when not loading', () => {
    component.users = mockUsers;
    component.loading = false;
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('mat-table'));
    expect(table).toBeTruthy();

    const rows = fixture.debugElement.queryAll(By.css('mat-row'));
    expect(rows.length).toBe(2);
  });

  it('should filter users based on search term', () => {
    component.users = mockUsers;
    component.searchTerm = 'User One';
    fixture.detectChanges();

    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].name).toBe('User One');
  });

  it('should emit userEdit event when edit button is clicked', () => {
    spyOn(component.userEdit, 'emit');
    component.users = mockUsers;
    component.loading = false;
    fixture.detectChanges();

    const editButton = fixture.debugElement.query(By.css('[data-test="edit-user"]'));
    editButton.nativeElement.click();

    expect(component.userEdit.emit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('should emit userDelete event when delete button is clicked', () => {
    spyOn(component.userDelete, 'emit');
    component.users = mockUsers;
    component.loading = false;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('[data-test="delete-user"]'));
    deleteButton.nativeElement.click();

    expect(component.userDelete.emit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('should update search term when input changes', () => {
    const searchInput = fixture.debugElement.query(By.css('input[placeholder="Search users..."]'));
    
    searchInput.nativeElement.value = 'test';
    searchInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.searchTerm).toBe('test');
  });

  it('should show "No users found" when filteredUsers is empty', () => {
    component.users = [];
    component.loading = false;
    fixture.detectChanges();

    const noUsersMessage = fixture.debugElement.query(By.css('.no-users'));
    expect(noUsersMessage).toBeTruthy();
    expect(noUsersMessage.nativeElement.textContent.trim()).toBe('No users found.');
  });

  it('should display correct user status badge', () => {
    component.users = mockUsers;
    component.loading = false;
    fixture.detectChanges();

    const statusBadges = fixture.debugElement.queryAll(By.css('.status-badge'));
    expect(statusBadges[0].nativeElement.textContent.trim()).toBe('Active');
    expect(statusBadges[1].nativeElement.textContent.trim()).toBe('Inactive');
  });
});