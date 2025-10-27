import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, startWith, takeUntil } from 'rxjs/operators';
import { User } from '../../../models/user.model';
import { UserTableRowComponent } from '../user-table-row/user-table-row.component';

/**
 * User List Component
 * 
 * Zeigt Liste aller Users in einer Tabelle an mit Filterfunktionalität
 * Component Split: Verwendet UserTableRowComponent für einzelne Zeilen
 * Features: Echtzeit-Suche mit debouncing, filtert nach Name und Email
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
  filteredUsers$!: Observable<User[]>;
  private users$ = new BehaviorSubject<User[]>([]);
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Initialize filtered users observable with search functionality
    const searchTerm$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

    this.filteredUsers$ = combineLatest([
      this.users$.asObservable(),
      searchTerm$
    ]).pipe(
      map(([users, searchTerm]) => this.filterUsers(users, searchTerm || '')),
      takeUntil(this.destroy$)
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    // Update users observable when input changes
    if (this.users) {
      this.users$.next(this.users);
    }
  }

  private filterUsers(users: User[], searchTerm: string): User[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return users;
    }

    const term = searchTerm.toLowerCase().trim();
    return users.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
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
}