import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { User } from './models/user.model';
import { UserService } from './services/user.service';
import { HeaderComponent } from './shared/header/header.component';
import { AlertComponent } from './shared/alert/alert.component';
import { UserFormComponent } from './features/user-management/user-form/user-form.component';
import { UserListComponent } from './features/user-management/user-list/user-list.component';

/**
 * App Component
 * 
 * Container Component - koordiniert nur Sub-Components
 * Regel: Max 400 Zeilen - alles in separate .ts, .html, .css Files!
 * 
 * Component-Struktur:
 * - HeaderComponent (wiederverwendbar → /shared/)
 * - AlertComponent (wiederverwendbar → /shared/)
 * - UserFormComponent (feature-spezifisch)
 * - UserListComponent (feature-spezifisch)
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    HeaderComponent,
    AlertComponent,
    UserFormComponent,
    UserListComponent
  ],
  providers: [UserService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  users: User[] = [];
  currentUser: User = this.getEmptyUser();
  editMode = false;
  loading = false;
  alertMessage = '';
  alertType: 'success' | 'error' = 'success';

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        this.showAlert('Failed to load users. Is the backend running?', 'error');
        this.loading = false;
        console.error('Error loading users:', error);
      }
    });
  }

  saveUser(user: User) {
    if (!user.name || !user.email) {
      this.showAlert('Please fill in all required fields', 'error');
      return;
    }

    if (this.editMode && user.id) {
      // Update
      this.userService.updateUser(user.id, user).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('User updated successfully!', 'success');
            this.loadUsers();
            this.cancelEdit();
          }
        },
        error: (error) => {
          this.showAlert(error.error?.message || 'Failed to update user', 'error');
        }
      });
    } else {
      // Create
      this.userService.createUser(user).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('User created successfully!', 'success');
            this.loadUsers();
            this.currentUser = this.getEmptyUser();
          }
        },
        error: (error) => {
          this.showAlert(error.error?.message || 'Failed to create user', 'error');
        }
      });
    }
  }

  editUser(user: User) {
    this.currentUser = { ...user };
    this.editMode = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteUser(id: string) {
    this.userService.deleteUser(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.showAlert('User deleted successfully!', 'success');
          this.loadUsers();
        }
      },
      error: (error) => {
        this.showAlert('Failed to delete user', 'error');
      }
    });
  }

  cancelEdit() {
    this.currentUser = this.getEmptyUser();
    this.editMode = false;
  }

  getEmptyUser(): User {
    return {
      name: '',
      email: '',
      role: 'User'
    };
  }

  showAlert(message: string, type: 'success' | 'error') {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = '';
    }, 5000);
  }
}
