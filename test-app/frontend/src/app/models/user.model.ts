export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export interface UserFilterCriteria {
  searchTerm?: string;
  roles?: UserRole[];
  statuses?: UserStatus[];
  departments?: string[];
  isActive?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
}

export interface UserFilterOptions {
  sortBy?: UserSortField;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  currentPage?: number;
}

export enum UserSortField {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  ROLE = 'role',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  LAST_LOGIN_AT = 'lastLoginAt'
}

export interface UserFilterPreset {
  id: string;
  name: string;
  description?: string;
  criteria: UserFilterCriteria;
  options?: UserFilterOptions;
  isDefault?: boolean;
  createdBy?: string;
  createdAt: Date;
}

export interface UserFilterState {
  criteria: UserFilterCriteria;
  options: UserFilterOptions;
  activePreset?: UserFilterPreset;
  availablePresets: UserFilterPreset[];
  isLoading: boolean;
  error?: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface UserBulkAction {
  type: 'activate' | 'deactivate' | 'delete' | 'changeRole' | 'changeDepartment';
  targetValue?: any;
  userIds: string[];
}

export interface FilterSuggestion {
  field: keyof UserFilterCriteria;
  value: any;
  displayText: string;
  count: number;
}

export const DEFAULT_FILTER_PRESETS: UserFilterPreset[] = [
  {
    id: 'active-users',
    name: 'Active Users',
    description: 'All active users in the system',
    criteria: { isActive: true, statuses: [UserStatus.ACTIVE] },
    options: { sortBy: UserSortField.LAST_NAME, sortDirection: 'asc' },
    isDefault: true,
    createdAt: new Date()
  },
  {
    id: 'admin-users',
    name: 'Administrators',
    description: 'All users with admin privileges',
    criteria: { roles: [UserRole.ADMIN] },
    options: { sortBy: UserSortField.FIRST_NAME, sortDirection: 'asc' },
    createdAt: new Date()
  },
  {
    id: 'recent-users',
    name: 'Recent Users',
    description: 'Users created in the last 30 days',
    criteria: { createdFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    options: { sortBy: UserSortField.CREATED_AT, sortDirection: 'desc' },
    createdAt: new Date()
  },
  {
    id: 'inactive-users',
    name: 'Inactive Users',
    description: 'Users who have not logged in recently',
    criteria: { 
      isActive: false,
      statuses: [UserStatus.INACTIVE, UserStatus.SUSPENDED]
    },
    options: { sortBy: UserSortField.LAST_LOGIN_AT, sortDirection: 'asc' },
    createdAt: new Date()
  }
];

export const FILTER_FIELD_LABELS: Record<keyof UserFilterCriteria, string> = {
  searchTerm: 'Search',
  roles: 'Roles',
  statuses: 'Status',
  departments: 'Departments',
  isActive: 'Active Status',
  createdFrom: 'Created From',
  createdTo: 'Created To',
  lastLoginFrom: 'Last Login From',
  lastLoginTo: 'Last Login To'
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.USER]: 'User',
  [UserRole.MODERATOR]: 'Moderator',
  [UserRole.VIEWER]: 'Viewer'
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.INACTIVE]: 'Inactive',
  [UserStatus.PENDING]: 'Pending',
  [UserStatus.SUSPENDED]: 'Suspended'
};