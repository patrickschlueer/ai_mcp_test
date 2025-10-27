/**
 * User Status Enumeration
 * Defines all possible user status values for filtering and display
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived'
}

/**
 * User Status Display Labels
 * Maps enum values to human-readable labels
 */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.INACTIVE]: 'Inactive',
  [UserStatus.PENDING]: 'Pending',
  [UserStatus.SUSPENDED]: 'Suspended',
  [UserStatus.ARCHIVED]: 'Archived'
};

/**
 * User Status Colors
 * Maps enum values to CSS color classes for visual distinction
 */
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'status-active',
  [UserStatus.INACTIVE]: 'status-inactive',
  [UserStatus.PENDING]: 'status-pending',
  [UserStatus.SUSPENDED]: 'status-suspended',
  [UserStatus.ARCHIVED]: 'status-archived'
};

/**
 * Helper function to get all user status values as array
 * Useful for dropdown options and validation
 */
export function getUserStatusValues(): UserStatus[] {
  return Object.values(UserStatus);
}

/**
 * Helper function to check if a string is a valid user status
 */
export function isValidUserStatus(value: string): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

/**
 * Helper function to get status label by enum value
 */
export function getUserStatusLabel(status: UserStatus): string {
  return USER_STATUS_LABELS[status] || status;
}

/**
 * Helper function to get status color class by enum value
 */
export function getUserStatusColorClass(status: UserStatus): string {
  return USER_STATUS_COLORS[status] || 'status-default';
}