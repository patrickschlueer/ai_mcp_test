import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import * as UserActions from './user.actions';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLogin?: string;
  department?: string;
  location?: string;
}

export interface UserFilter {
  searchTerm: string;
  roles: string[];
  statuses: string[];
  departments: string[];
  locations: string[];
  dateRange: {
    from?: string;
    to?: string;
  };
  sortBy: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastLogin';
  sortDirection: 'asc' | 'desc';
}

export interface UserState extends EntityState<User> {
  loading: boolean;
  error: string | null;
  filter: UserFilter;
  filteredUserIds: string[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  quickFilters: {
    activeUsers: boolean;
    admins: boolean;
    recentlyCreated: boolean;
  };
}

export const userAdapter: EntityAdapter<User> = createEntityAdapter<User>({
  selectId: (user: User) => user.id,
  sortComparer: false
});

export const initialUserFilter: UserFilter = {
  searchTerm: '',
  roles: [],
  statuses: [],
  departments: [],
  locations: [],
  dateRange: {},
  sortBy: 'firstName',
  sortDirection: 'asc'
};

export const initialState: UserState = userAdapter.getInitialState({
  loading: false,
  error: null,
  filter: initialUserFilter,
  filteredUserIds: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 25,
  quickFilters: {
    activeUsers: false,
    admins: false,
    recentlyCreated: false
  }
});

export const userReducer = createReducer(
  initialState,

  // Load Users
  on(UserActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UserActions.loadUsersSuccess, (state, { users }) => {
    const newState = userAdapter.setAll(users, state);
    return {
      ...newState,
      loading: false,
      error: null,
      totalCount: users.length
    };
  }),

  on(UserActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Filter Actions
  on(UserActions.updateFilter, (state, { filter }) => ({
    ...state,
    filter: {
      ...state.filter,
      ...filter
    },
    currentPage: 1
  })),

  on(UserActions.clearFilter, (state) => ({
    ...state,
    filter: initialUserFilter,
    filteredUserIds: [],
    currentPage: 1,
    quickFilters: {
      activeUsers: false,
      admins: false,
      recentlyCreated: false
    }
  })),

  on(UserActions.applyQuickFilter, (state, { filterType, active }) => {
    const quickFilters = {
      ...state.quickFilters,
      [filterType]: active
    };

    let updatedFilter = { ...state.filter };
    
    if (filterType === 'activeUsers' && active) {
      updatedFilter.statuses = ['active'];
    } else if (filterType === 'admins' && active) {
      updatedFilter.roles = ['admin'];
    } else if (filterType === 'recentlyCreated' && active) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      updatedFilter.dateRange = {
        from: thirtyDaysAgo.toISOString().split('T')[0]
      };
    }

    return {
      ...state,
      quickFilters,
      filter: updatedFilter,
      currentPage: 1
    };
  }),

  on(UserActions.setFilteredUsers, (state, { userIds }) => ({
    ...state,
    filteredUserIds: userIds
  })),

  // Search Actions
  on(UserActions.searchUsers, (state, { searchTerm }) => ({
    ...state,
    filter: {
      ...state.filter,
      searchTerm
    },
    currentPage: 1
  })),

  // Sort Actions
  on(UserActions.sortUsers, (state, { sortBy, sortDirection }) => ({
    ...state,
    filter: {
      ...state.filter,
      sortBy,
      sortDirection
    }
  })),

  // Pagination Actions
  on(UserActions.setPage, (state, { page }) => ({
    ...state,
    currentPage: page
  })),

  on(UserActions.setPageSize, (state, { pageSize }) => ({
    ...state,
    pageSize,
    currentPage: 1
  })),

  // CRUD Actions
  on(UserActions.addUser, (state, { user }) => {
    return userAdapter.addOne(user, {
      ...state,
      totalCount: state.totalCount + 1
    });
  }),

  on(UserActions.updateUser, (state, { user }) => {
    return userAdapter.updateOne({
      id: user.id,
      changes: user
    }, state);
  }),

  on(UserActions.deleteUser, (state, { id }) => {
    return userAdapter.removeOne(id, {
      ...state,
      totalCount: state.totalCount - 1,
      filteredUserIds: state.filteredUserIds.filter(userId => userId !== id)
    });
  }),

  on(UserActions.deleteUsers, (state, { ids }) => {
    return userAdapter.removeMany(ids, {
      ...state,
      totalCount: state.totalCount - ids.length,
      filteredUserIds: state.filteredUserIds.filter(userId => !ids.includes(userId))
    });
  })
);

// Entity Selectors
export const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal,
} = userAdapter.getSelectors();