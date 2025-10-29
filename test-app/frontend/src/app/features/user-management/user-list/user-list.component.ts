import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an mit Filterfunktionalität
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserTableRowComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  @Input() set users(value: User[]) {
    this.usersSubject.next(value);
  }
  get users(): User[] {
    return this.usersSubject.value;
  }
  @Input() loading: boolean = false;
  @Output() edit = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();

  filterText: string = '';
  filteredUsers$: Observable<User[]>;
  
  private usersSubject = new BehaviorSubject<User[]>([]);
  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.filteredUsers$ = combineLatest([
      this.usersSubject.asObservable(),
      this.filterSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
    ]).pipe(
      map(([users, filterText]) => this.filterUsers(users, filterText)),
      takeUntil(this.destroy$)
    );

    // Initialize with empty filter
    this.filterSubject.next('');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChange(filterText: string) {
    this.filterText = filterText;
    this.filterSubject.next(filterText);
  }

  onFilterKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.clearFilter();
    }
  }

  clearFilter() {
    this.filterText = '';
    this.filterSubject.next('');
  }

  private filterUsers(users: User[], filterText: string): User[] {
    if (!filterText || filterText.trim() === '') {
      return users;
    }

    const searchTerm = filterText.toLowerCase().trim();
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
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
}