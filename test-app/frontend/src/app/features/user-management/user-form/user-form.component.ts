import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user.model';

/**
 * User Form Component
 * 
 * Formular zum Erstellen und Bearbeiten von Users
 * Location: /features/user-management/ (feature-spezifisch!)
 */
@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css'
})
export class UserFormComponent {
  @Input() user: User = this.getEmptyUser();
  @Input() editMode: boolean = false;
  @Output() save = new EventEmitter<User>();
  @Output() cancel = new EventEmitter<void>();

  onSubmit() {
    if (!this.user.name || !this.user.email) {
      return;
    }
    this.save.emit(this.user);
  }

  onCancel() {
    this.cancel.emit();
  }

  private getEmptyUser(): User {
    return {
      name: '',
      email: '',
      role: 'User'
    };
  }
}
