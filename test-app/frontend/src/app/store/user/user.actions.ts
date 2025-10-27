import { createAction, props } from '@ngrx/store';
import { User } from '../../models/user.interface';

// User CRUD Actions
export const loadUsers = createAction(
  '[User] Load Users'
);

export const loadUsersSuccess = createAction(
  '[User] Load Users Success',
  props<{ users: User[] }>()
);

export const loadUsersFailure = createAction(
  '[User] Load Users Failure',
  props<{ error: string }>()
);

export const createUser = createAction(
  '[User] Create User',
  props<{ user: Omit<User, 'id'> }>()
);

export const createUserSuccess = createAction(
  '[User] Create User Success',
  props<{ user: User }>()
);

export const createUserFailure = createAction(
  '[User] Create User Failure',
  props<{ error: string }>()
);

export const updateUser = createAction(
  '[User] Update User',
  props<{ id: number; changes: Partial<User> }>()
);

export const updateUserSuccess = createAction(
  '[User] Update User Success',
  props<{ user: User }>()
);

export const updateUserFailure = createAction(
  '[User] Update User Failure',
  props<{ error: string }>()
);

export const deleteUser = createAction(
  '[User] Delete User',
  props<{ id: number }>()
);

export const deleteUserSuccess = createAction(
  '[User] Delete User Success',
  props<{ id: number }>()
);

export const deleteUserFailure = createAction(
  '[User] Delete User Failure',
  props<{ error: string }>()
);

// User Filter Actions
export interface UserFilterCriteria {
  searchTerm?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  department?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  isAdmin?: boolean;
  tags?: string[];
}

export const setUserFilter = createAction(
  '[User Filter] Set Filter',
  props<{ filter: UserFilterCriteria }>()
);

export const updateUserFilter = createAction(
  '[User Filter] Update Filter',
  props<{ filter: Partial<UserFilterCriteria> }>()
);

export const clearUserFilter = createAction(
  '[User Filter] Clear Filter'
);

export const resetUserFilter = createAction(
  '[User Filter] Reset Filter'
);

// Quick Filter Actions
export const setQuickFilter = createAction(
  '[User Filter] Set Quick Filter',
  props<{ filterType: 'active' | 'inactive' | 'admins' | 'recent' | 'all' }>()
);

// Filter Preset Actions
export interface FilterPreset {
  id: string;
  name: string;
  filter: UserFilterCriteria;
  isDefault?: boolean;
}

export const saveFilterPreset = createAction(
  '[User Filter] Save Filter Preset',
  props<{ preset: Omit<FilterPreset, 'id'> }>()
);

export const loadFilterPresets = createAction(
  '[User Filter] Load Filter Presets'
);

export const loadFilterPresetsSuccess = createAction(
  '[User Filter] Load Filter Presets Success',
  props<{ presets: FilterPreset[] }>()
);

export const loadFilterPresetsFailure = createAction(
  '[User Filter] Load Filter Presets Failure',
  props<{ error: string }>()
);

export const applyFilterPreset = createAction(
  '[User Filter] Apply Filter Preset',
  props<{ presetId: string }>()
);

export const deleteFilterPreset = createAction(
  '[User Filter] Delete Filter Preset',
  props<{ presetId: string }>()
);

export const updateFilterPreset = createAction(
  '[User Filter] Update Filter Preset',
  props<{ presetId: string; changes: Partial<FilterPreset> }>()
);

// Advanced Filter Actions
export const toggleAdvancedFilter = createAction(
  '[User Filter] Toggle Advanced Filter',
  props<{ enabled: boolean }>()
);

export const addFilterCondition = createAction(
  '[User Filter] Add Filter Condition',
  props<{ field: keyof User; operator: string; value: any }>()
);

export const removeFilterCondition = createAction(
  '[User Filter] Remove Filter Condition',
  props<{ index: number }>()
);

export const updateFilterCondition = createAction(
  '[User Filter] Update Filter Condition',
  props<{ index: number; field?: keyof User; operator?: string; value?: any }>()
);

// Bulk Actions for Filtered Users
export const selectAllFilteredUsers = createAction(
  '[User] Select All Filtered Users'
);

export const bulkUpdateFilteredUsers = createAction(
  '[User] Bulk Update Filtered Users',
  props<{ changes: Partial<User> }>()
);

export const bulkDeleteFilteredUsers = createAction(
  '[User] Bulk Delete Filtered Users'
);

export const exportFilteredUsers = createAction(
  '[User] Export Filtered Users',
  props<{ format: 'csv' | 'json' | 'xlsx' }>()
);

// Filter Performance Actions
export const enableServerSideFiltering = createAction(
  '[User Filter] Enable Server Side Filtering',
  props<{ threshold: number }>()
);

export const setFilterDebounceTime = createAction(
  '[User Filter] Set Filter Debounce Time',
  props<{ debounceMs: number }>()
);

// Filter History Actions
export const saveFilterToHistory = createAction(
  '[User Filter] Save Filter To History',
  props<{ filter: UserFilterCriteria }>()
);

export const undoLastFilter = createAction(
  '[User Filter] Undo Last Filter'
);

export const redoLastFilter = createAction(
  '[User Filter] Redo Last Filter'
);

export const clearFilterHistory = createAction(
  '[User Filter] Clear Filter History'
);