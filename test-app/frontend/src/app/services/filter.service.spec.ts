import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { User } from '../interfaces/user.interface';

describe('FilterService', () => {
  let service: FilterService;
  let mockUsers: User[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
    
    mockUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2023-01-15')
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        isActive: false,
        createdAt: new Date('2023-02-20')
      },
      {
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@test.com',
        role: 'moderator',
        isActive: true,
        createdAt: new Date('2023-03-10')
      },
      {
        id: 4,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2023-01-05')
      }
    ];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('filterUsers', () => {
    it('should return all users when no filters are applied', () => {
      const filters = {};
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toEqual(mockUsers);
    });

    it('should filter users by name', () => {
      const filters = { name: 'John' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should filter users by email', () => {
      const filters = { email: 'test.com' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('bob@test.com');
    });

    it('should filter users by role', () => {
      const filters = { role: 'user' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'user')).toBe(true);
    });

    it('should filter users by active status', () => {
      const filters = { isActive: true };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(3);
      expect(result.every(user => user.isActive === true)).toBe(true);
    });

    it('should filter users by inactive status', () => {
      const filters = { isActive: false };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });

    it('should apply multiple filters simultaneously', () => {
      const filters = { role: 'user', isActive: true };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice Johnson');
    });

    it('should perform case-insensitive search for text fields', () => {
      const filters = { name: 'JOHN' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should return empty array when no users match filters', () => {
      const filters = { name: 'NonExistent' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(0);
    });

    it('should filter by partial matches in name and email', () => {
      const filters = { name: 'o' };
      const result = service.filterUsers(mockUsers, filters);
      expect(result).toHaveLength(2); // John Doe, Bob Wilson
    });
  });

  describe('getUniqueRoles', () => {
    it('should return unique roles from users array', () => {
      const roles = service.getUniqueRoles(mockUsers);
      expect(roles).toEqual(['admin', 'user', 'moderator']);
    });

    it('should return empty array for empty users array', () => {
      const roles = service.getUniqueRoles([]);
      expect(roles).toEqual([]);
    });

    it('should handle duplicate roles correctly', () => {
      const usersWithDuplicates = [
        ...mockUsers,
        { id: 5, name: 'Test', email: 'test@test.com', role: 'admin', isActive: true, createdAt: new Date() }
      ];
      const roles = service.getUniqueRoles(usersWithDuplicates);
      expect(roles).toEqual(['admin', 'user', 'moderator']);
    });
  });

  describe('resetFilters', () => {
    it('should return empty filter object', () => {
      const filters = service.resetFilters();
      expect(filters).toEqual({});
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false for empty filters', () => {
      const result = service.hasActiveFilters({});
      expect(result).toBe(false);
    });

    it('should return true when filters are applied', () => {
      const filters = { name: 'John' };
      const result = service.hasActiveFilters(filters);
      expect(result).toBe(true);
    });

    it('should return false for filters with empty string values', () => {
      const filters = { name: '', email: '' };
      const result = service.hasActiveFilters(filters);
      expect(result).toBe(false);
    });

    it('should return true for boolean filters', () => {
      const filters = { isActive: false };
      const result = service.hasActiveFilters(filters);
      expect(result).toBe(true);
    });
  });

  describe('getFilteredCount', () => {
    it('should return correct count of filtered users', () => {
      const filters = { role: 'user' };
      const count = service.getFilteredCount(mockUsers, filters);
      expect(count).toBe(2);
    });

    it('should return total count when no filters applied', () => {
      const count = service.getFilteredCount(mockUsers, {});
      expect(count).toBe(4);
    });

    it('should return zero for no matches', () => {
      const filters = { name: 'NonExistent' };
      const count = service.getFilteredCount(mockUsers, filters);
      expect(count).toBe(0);
    });
  });

  describe('sanitizeFilterValue', () => {
    it('should sanitize malicious script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>test';
      const sanitized = service.sanitizeFilterValue(maliciousInput);
      expect(sanitized).toBe('test');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      const htmlInput = '<div>Hello <b>World</b></div>';
      const sanitized = service.sanitizeFilterValue(htmlInput);
      expect(sanitized).toBe('Hello World');
    });

    it('should handle normal text input', () => {
      const normalInput = 'Normal text input';
      const sanitized = service.sanitizeFilterValue(normalInput);
      expect(sanitized).toBe('Normal text input');
    });

    it('should trim whitespace', () => {
      const inputWithSpaces = '  test input  ';
      const sanitized = service.sanitizeFilterValue(inputWithSpaces);
      expect(sanitized).toBe('test input');
    });
  });

  describe('error handling', () => {
    it('should handle null users array gracefully', () => {
      const filters = { name: 'test' };
      const result = service.filterUsers(null as any, filters);
      expect(result).toEqual([]);
    });

    it('should handle undefined users array gracefully', () => {
      const filters = { name: 'test' };
      const result = service.filterUsers(undefined as any, filters);
      expect(result).toEqual([]);
    });

    it('should handle null filter values', () => {
      const filters = { name: null };
      const result = service.filterUsers(mockUsers, filters as any);
      expect(result).toEqual(mockUsers);
    });

    it('should handle undefined filter values', () => {
      const filters = { name: undefined };
      const result = service.filterUsers(mockUsers, filters as any);
      expect(result).toEqual(mockUsers);
    });
  });
});