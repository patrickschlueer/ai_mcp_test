export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.MODERATOR]: 'Moderator',
  [UserRole.USER]: 'User',
  [UserRole.GUEST]: 'Guest'
};

export const USER_ROLE_PRIORITIES: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4,
  [UserRole.MODERATOR]: 3,
  [UserRole.USER]: 2,
  [UserRole.GUEST]: 1
};

export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role] || role;
}

export function getUserRolePriority(role: UserRole): number {
  return USER_ROLE_PRIORITIES[role] || 0;
}

export function compareUserRoles(roleA: UserRole, roleB: UserRole): number {
  return getUserRolePriority(roleB) - getUserRolePriority(roleA);
}