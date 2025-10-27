import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from './user.state';
import { User, UserRole, UserStatus } from '../../models/user.interface';

// Feature selector
export const selectUserState = createFeatureSelector<UserState>('users');

// Base selectors
export const selectAllUsers = createSelector(
  selectUserState,
  (state: UserState) => state.users
);

export const selectUsersLoading = createSelector(
  selectUserState,
  (state: UserState) => state.loading
);

export const selectUsersError = createSelector(
  selectUserState,
  (state: UserState) => state.error
);

export const selectCurrentFilters = createSelector(
  selectUserState,
  (state: UserState) => state.filters
);

export const selectFilterPresets = createSelector(
  selectUserState,
  (state: UserState) => state.filterPresets
);

export const selectActiveFilterPreset = createSelector(
  selectUserState,
  (state: UserState) => state.activeFilterPreset
);

// Filtered users based on current filters
export const selectFilteredUsers = createSelector(
  selectAllUsers,
  selectCurrentFilters,
  (users: User[], filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      return users;
    }

    return users.filter(user => {
      // Name filter (case-insensitive partial match)
      if (filters.name && filters.name.trim()) {
        const nameMatch = user.name.toLowerCase().includes(filters.name.toLowerCase()) ||
                         user.email.toLowerCase().includes(filters.name.toLowerCase());
        if (!nameMatch) return false;
      }

      // Role filter
      if (filters.roles && filters.roles.length > 0) {
        if (!filters.roles.includes(user.role)) return false;
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(user.status)) return false;
      }

      // Date range filter (created)
      if (filters.createdFrom) {
        const createdDate = new Date(user.createdAt);
        const fromDate = new Date(filters.createdFrom);
        if (createdDate < fromDate) return false;
      }

      if (filters.createdTo) {
        const createdDate = new Date(user.createdAt);
        const toDate = new Date(filters.createdTo);
        if (createdDate > toDate) return false;
      }

      // Last login filter
      if (filters.lastLoginFrom && user.lastLoginAt) {
        const lastLoginDate = new Date(user.lastLoginAt);
        const fromDate = new Date(filters.lastLoginFrom);
        if (lastLoginDate < fromDate) return false;
      }

      if (filters.lastLoginTo && user.lastLoginAt) {
        const lastLoginDate = new Date(user.lastLoginAt);
        const toDate = new Date(filters.lastLoginTo);
        if (lastLoginDate > toDate) return false;
      }

      return true;
    });
  }
);

// Quick filter selectors
export const selectActiveUsers = createSelector(
  selectAllUsers,
  (users: User[]) => users.filter(user => user.status === UserStatus.ACTIVE)
);

export const selectAdminUsers = createSelector(
  selectAllUsers,
  (users: User[]) => users.filter(user => user.role === UserRole.ADMIN)
);

export const selectInactiveUsers = createSelector(
  selectAllUsers,
  (users: User[]) => users.filter(user => user.status === UserStatus.INACTIVE)
);

export const selectRecentUsers = createSelector(
  selectAllUsers,
  (users: User[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return users.filter(user => {
      const createdDate = new Date(user.createdAt);
      return createdDate >= thirtyDaysAgo;
    });
  }
);

export const selectUsersWithoutLogin = createSelector(
  selectAllUsers,
  (users: User[]) => users.filter(user => !user.lastLoginAt)
);

// Statistics selectors
export const selectUserStatistics = createSelector(
  selectAllUsers,
  (users: User[]) => {
    const total = users.length;
    const active = users.filter(user => user.status === UserStatus.ACTIVE).length;
    const inactive = users.filter(user => user.status === UserStatus.INACTIVE).length;
    const admins = users.filter(user => user.role === UserRole.ADMIN).length;
    const editors = users.filter(user => user.role === UserRole.EDITOR).length;
    const viewers = users.filter(user => user.role === UserRole.VIEWER).length;
    
    return {
      total,
      active,
      inactive,
      admins,
      editors,
      viewers,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }
);

export const selectFilteredUserStatistics = createSelector(
  selectFilteredUsers,
  (users: User[]) => {
    const total = users.length;
    const active = users.filter(user => user.status === UserStatus.ACTIVE).length;
    const inactive = users.filter(user => user.status === UserStatus.INACTIVE).length;
    const admins = users.filter(user => user.role === UserRole.ADMIN).length;
    const editors = users.filter(user => user.role === UserRole.EDITOR).length;
    const viewers = users.filter(user => user.role === UserRole.VIEWER).length;
    
    return {
      total,
      active,
      inactive,
      admins,
      editors,
      viewers,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }
);

// Search and pagination selectors
export const selectFilteredAndSortedUsers = createSelector(
  selectFilteredUsers,
  selectUserState,
  (users: User[], state: UserState) => {
    let sortedUsers = [...users];
    
    // Apply sorting
    if (state.sortBy && state.sortDirection) {
      sortedUsers.sort((a, b) => {
        const aValue = a[state.sortBy as keyof User];
        const bValue = b[state.sortBy as keyof User];
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return state.sortDirection === 'desc' ? comparison * -1 : comparison;
      });
    }
    
    return sortedUsers;
  }
);

// Pagination selector
export const selectPaginatedUsers = createSelector(
  selectFilteredAndSortedUsers,
  selectUserState,
  (users: User[], state: UserState) => {
    const startIndex = state.currentPage * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    
    return {
      users: users.slice(startIndex, endIndex),
      totalUsers: users.length,
      totalPages: Math.ceil(users.length / state.pageSize),
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      hasNextPage: endIndex < users.length,
      hasPreviousPage: state.currentPage > 0
    };
  }
);

// User by ID selector factory
export const selectUserById = (userId: string) => createSelector(
  selectAllUsers,
  (users: User[]) => users.find(user => user.id === userId)
);

// Filter validation selectors
export const selectHasActiveFilters = createSelector(
  selectCurrentFilters,
  (filters) => {
    if (!filters) return false;
    
    return !!(filters.name?.trim() ||
             (filters.roles && filters.roles.length > 0) ||
             (filters.statuses && filters.statuses.length > 0) ||
             filters.createdFrom ||
             filters.createdTo ||
             filters.lastLoginFrom ||
             filters.lastLoginTo);
  }
);

export const selectFilterResultCount = createSelector(
  selectFilteredUsers,
  (users: User[]) => users.length
);