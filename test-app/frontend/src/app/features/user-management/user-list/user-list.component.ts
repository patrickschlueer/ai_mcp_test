import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an mit Filterung
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserTableRowComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];
  @Input() loading: boolean = false;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  searchControl = new FormControl('');
  filteredUsers: User[] = [];
  filterLoading = false;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.filteredUsers = [...this.users];
    this.setupSearchFilter();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    this.applyFilter(this.searchControl.value || '');
  }

  private setupSearchFilter() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.applyFilter(searchTerm || '');
      });
  }

  private applyFilter(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filterLoading = true;
    
    // Simulate async filtering for UX
    setTimeout(() => {
      const term = searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.role && user.role.toLowerCase().includes(term))
      );
      this.filterLoading = false;
    }, 100);
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  onEdit(user: User) {
    this.edit.emit(user);
  }

  onDelete(userId: string) {
    this.delete.emit(userId);
  }

  onRefresh() {
    this.refresh.emit();
  }

  get hasSearchTerm(): boolean {
    return !!(this.searchControl.value && this.searchControl.value.trim());
  }

  get userCount(): number {
    return this.filteredUsers.length;
  }

  get totalUserCount(): number {
    return this.users.length;
  }

  get isFiltered(): boolean {
    return this.userCount !== this.totalUserCount;
  }
}