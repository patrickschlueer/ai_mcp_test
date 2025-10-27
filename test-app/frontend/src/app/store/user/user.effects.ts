import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, mergeMap, withLatestFrom, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserService } from '../../services/user.service';
import { UserActions } from './user.actions';
import { selectUserFilters, selectAllUsers } from './user.selectors';

@Injectable()
export class UserEffects {

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUsers),
      switchMap(() =>
        this.userService.getUsers().pipe(
          map(users => UserActions.loadUsersSuccess({ users })),
          catchError(error => of(UserActions.loadUsersFailure({ error: error.message })))
        )
      )
    )
  );

  filterUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.setFilter, UserActions.updateFilter, UserActions.clearFilter),
      debounceTime(300),
      distinctUntilChanged(),
      withLatestFrom(this.store.select(selectUserFilters), this.store.select(selectAllUsers)),
      switchMap(([action, filters, users]) => {
        const filteredUsers = this.applyFilters(users, filters);
        return of(UserActions.setFilteredUsers({ users: filteredUsers }));
      }),
      catchError(error => of(UserActions.filterUsersFailure({ error: error.message })))
    )
  );

  searchUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.searchUsers),
      debounceTime(250),
      distinctUntilChanged(),
      withLatestFrom(this.store.select(selectAllUsers)),
      switchMap(([action, users]) => {
        const searchTerm = action.searchTerm.toLowerCase().trim();
        
        if (!searchTerm) {
          return of(UserActions.searchUsersSuccess({ users }));
        }

        const searchResults = users.filter(user => 
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
        );

        return of(UserActions.searchUsersSuccess({ users: searchResults }));
      }),
      catchError(error => of(UserActions.searchUsersFailure({ error: error.message })))
    )
  );

  applyQuickFilter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.applyQuickFilter),
      withLatestFrom(this.store.select(selectAllUsers)),
      switchMap(([action, users]) => {
        let filteredUsers = users;

        switch (action.filterType) {
          case 'active':
            filteredUsers = users.filter(user => user.isActive);
            break;
          case 'inactive':
            filteredUsers = users.filter(user => !user.isActive);
            break;
          case 'admin':
            filteredUsers = users.filter(user => user.role === 'admin');
            break;
          case 'user':
            filteredUsers = users.filter(user => user.role === 'user');
            break;
          case 'recent':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filteredUsers = users.filter(user => new Date(user.createdAt) > oneWeekAgo);
            break;
          default:
            filteredUsers = users;
        }

        return of(UserActions.applyQuickFilterSuccess({ users: filteredUsers, filterType: action.filterType }));
      }),
      catchError(error => of(UserActions.applyQuickFilterFailure({ error: error.message })))
    )
  );

  saveFilterPreset$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.saveFilterPreset),
      withLatestFrom(this.store.select(selectUserFilters)),
      switchMap(([action, currentFilters]) => {
        const preset = {
          id: this.generatePresetId(),
          name: action.name,
          filters: { ...currentFilters },
          createdAt: new Date().toISOString()
        };

        // In real app, this would call a service to persist the preset
        return of(UserActions.saveFilterPresetSuccess({ preset }));
      }),
      catchError(error => of(UserActions.saveFilterPresetFailure({ error: error.message })))
    )
  );

  loadFilterPreset$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadFilterPreset),
      withLatestFrom(this.store.select(selectAllUsers)),
      switchMap(([action, users]) => {
        const filteredUsers = this.applyFilters(users, action.preset.filters);
        
        return of(
          UserActions.setFilter({ filters: action.preset.filters }),
          UserActions.setFilteredUsers({ users: filteredUsers }),
          UserActions.loadFilterPresetSuccess({ preset: action.preset })
        );
      }),
      catchError(error => of(UserActions.loadFilterPresetFailure({ error: error.message })))
    )
  );

  exportFilteredUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.exportFilteredUsers),
      withLatestFrom(this.store.select(selectUserFilters)),
      switchMap(([action, filters]) => {
        // In real app, this would call a service to export data
        const exportData = {
          format: action.format,
          filters: filters,
          timestamp: new Date().toISOString()
        };

        return of(UserActions.exportFilteredUsersSuccess({ exportData }));
      }),
      catchError(error => of(UserActions.exportFilteredUsersFailure({ error: error.message })))
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private userService: UserService
  ) {}

  private applyFilters(users: any[], filters: any): any[] {
    if (!filters || Object.keys(filters).length === 0) {
      return users;
    }

    return users.filter(user => {
      // Role filter
      if (filters.role && filters.role.length > 0) {
        if (!filters.role.includes(user.role)) {
          return false;
        }
      }

      // Status filter
      if (filters.isActive !== undefined && filters.isActive !== null) {
        if (user.isActive !== filters.isActive) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const userDate = new Date(user.createdAt);
        
        if (filters.dateFrom && userDate < new Date(filters.dateFrom)) {
          return false;
        }
        
        if (filters.dateTo && userDate > new Date(filters.dateTo)) {
          return false;
        }
      }

      // Custom field filters
      if (filters.customFields && Object.keys(filters.customFields).length > 0) {
        for (const [key, value] of Object.entries(filters.customFields)) {
          if (value && user[key] !== value) {
            return false;
          }
        }
      }

      // Text-based filters with XSS protection
      if (filters.searchText) {
        const sanitizedSearch = this.sanitizeInput(filters.searchText.toLowerCase());
        const searchableText = `${user.name} ${user.email} ${user.role}`.toLowerCase();
        
        if (!searchableText.includes(sanitizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }

  private sanitizeInput(input: string): string {
    // Basic XSS protection for filter inputs
    return input
      .replace(/[<>"'&]/g, '')
      .trim()
      .substring(0, 100); // Limit length
  }

  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}