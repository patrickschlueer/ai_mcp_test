import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UserService, User } from './user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  providers: [UserService],
  template: `
    <div class="container">
      <header>
        <h1>🚀 User Management System</h1>
        <p class="subtitle">AI Agent PoC - CRUD Application</p>
      </header>

      <!-- Alert Messages -->
      <div class="alert" [class.success]="alertType === 'success'" 
           [class.error]="alertType === 'error'" 
           *ngIf="alertMessage">
        {{ alertMessage }}
      </div>

      <!-- User Form -->
      <div class="card form-card">
        <h2>{{ editMode ? 'Edit User' : 'Add New User' }}</h2>
        <form (ngSubmit)="saveUser()">
          <div class="form-group">
            <label for="name">Name *</label>
            <input 
              id="name" 
              type="text" 
              [(ngModel)]="currentUser.name" 
              name="name"
              placeholder="Enter name" 
              required>
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              id="email" 
              type="email" 
              [(ngModel)]="currentUser.email" 
              name="email"
              placeholder="Enter email" 
              required>
          </div>

          <div class="form-group">
            <label for="role">Role</label>
            <select id="role" [(ngModel)]="currentUser.role" name="role">
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary">
              {{ editMode ? '💾 Update User' : '➕ Create User' }}
            </button>
            <button type="button" class="btn btn-secondary" 
                    (click)="cancelEdit()" *ngIf="editMode">
              ❌ Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Users List -->
      <div class="card">
        <div class="card-header">
          <h2>Users ({{ users.length }})</h2>
          <button class="btn btn-refresh" (click)="loadUsers()">
            🔄 Refresh
          </button>
        </div>

        <div class="loading" *ngIf="loading">Loading users...</div>

        <div class="no-data" *ngIf="!loading && users.length === 0">
          No users found. Create one above!
        </div>

        <table *ngIf="!loading && users.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td><strong>{{ user.name }}</strong></td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge" [class.badge-admin]="user.role === 'Admin'">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td class="actions">
                <button class="btn btn-edit" (click)="editUser(user)">
                  ✏️ Edit
                </button>
                <button class="btn btn-delete" (click)="deleteUser(user.id!)">
                  🗑️ Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .subtitle {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .alert {
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      animation: slideIn 0.3s ease;
    }

    .alert.success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .alert.error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card h2 {
      color: #333;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 500;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-refresh {
      background: #28a745;
      color: white;
      padding: 8px 16px;
      font-size: 0.9rem;
    }

    .btn-refresh:hover {
      background: #218838;
    }

    .btn-edit {
      background: #ffc107;
      color: #333;
      padding: 8px 16px;
      font-size: 0.9rem;
    }

    .btn-edit:hover {
      background: #e0a800;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
      padding: 8px 16px;
      font-size: 0.9rem;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f8f9fa;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #dee2e6;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #dee2e6;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .actions {
      display: flex;
      gap: 10px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      background: #e3f2fd;
      color: #1976d2;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .badge-admin {
      background: #fff3e0;
      color: #f57c00;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 1.1rem;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
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
    // 🤖 Automated test modification at 2025-10-26T23:52:04.459Z
    console.log('GitHub MCP Test - Modified at 2025-10-26T23:52:04.459Z');
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

  saveUser() {
    if (!this.currentUser.name || !this.currentUser.email) {
      this.showAlert('Please fill in all required fields', 'error');
      return;
    }

    if (this.editMode && this.currentUser.id) {
      // Update
      this.userService.updateUser(this.currentUser.id, this.currentUser).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('User updated successfully!', 'success');
            this.loadUsers();
            this.cancelEdit();
          }
        },
        error: (error) => {
          this.showAlert(error.error?.message || 'Failed to update user', 'error');
          console.error('Error updating user:', error);
        }
      });
    } else {
      // Create
      this.userService.createUser(this.currentUser).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('User created successfully!', 'success');
            this.loadUsers();
            this.currentUser = this.getEmptyUser();
          }
        },
        error: (error) => {
          this.showAlert(error.error?.message || 'Failed to create user', 'error');
          console.error('Error creating user:', error);
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
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('User deleted successfully!', 'success');
            this.loadUsers();
          }
        },
        error: (error) => {
          this.showAlert('Failed to delete user', 'error');
          console.error('Error deleting user:', error);
        }
      });
    }
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

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
