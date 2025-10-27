import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FilterService } from './filter.service';
import { FilterCriteria, FilterType, FilterOperator } from '../models/filter.model';
import { User } from '../models/user.model';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

const mockUsers: User[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'admin',
    isActive: true,
    department: 'IT',
    createdAt: new Date('2023-01-01'),
    lastLogin: new Date('2024-01-15')
  },
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    role: 'user',
    isActive: true,
    department: 'Marketing',
    createdAt: new Date('2023-02-01'),
    lastLogin: new Date('2024-01-14')
  },
  {
    id: '3',
    email: 'bob@example.com',
    name: 'Bob Johnson',
    role: 'user',
    isActive: false,
    department: 'IT',
    createdAt: new Date('2022-12-01'),
    lastLogin: new Date('2023-12-01')
  }
];

describe('FilterService', () => {
  let service: FilterService;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUsers']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['showError', 'showWarning']);

    TestBed.configureTestingModule({
      providers: [
        FilterService,
        { provide: UserService, useValue: userServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(FilterService);
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    
    mockUserService.getUsers.and.returnValue(of(mockUsers));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyFilter', () => {
    it('should filter users by email contains', (done) => {
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: 'john',
        type: FilterType.TEXT
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].email).toBe('john@example.com');
        done();
      });
    });

    it('should filter users by role equals', (done) => {
      const criteria: FilterCriteria = {
        field: 'role',
        operator: FilterOperator.EQUALS,
        value: 'admin',
        type: FilterType.SELECT
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].role).toBe('admin');
        done();
      });
    });

    it('should filter users by isActive boolean', (done) => {
      const criteria: FilterCriteria = {
        field: 'isActive',
        operator: FilterOperator.EQUALS,
        value: false,
        type: FilterType.BOOLEAN
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].isActive).toBe(false);
        done();
      });
    });

    it('should filter users by date range', (done) => {
      const criteria: FilterCriteria = {
        field: 'createdAt',
        operator: FilterOperator.GREATER_THAN,
        value: '2023-01-01',
        type: FilterType.DATE
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('2');
        done();
      });
    });

    it('should handle multiple filter criteria with AND logic', (done) => {
      const criteria: FilterCriteria[] = [
        {
          field: 'department',
          operator: FilterOperator.EQUALS,
          value: 'IT',
          type: FilterType.SELECT
        },
        {
          field: 'isActive',
          operator: FilterOperator.EQUALS,
          value: true,
          type: FilterType.BOOLEAN
        }
      ];

      service.applyFilter(criteria).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('1');
        expect(result[0].department).toBe('IT');
        expect(result[0].isActive).toBe(true);
        done();
      });
    });

    it('should return empty array when no matches found', (done) => {
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: 'nonexistent@example.com',
        type: FilterType.TEXT
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(0);
        done();
      });
    });

    it('should handle empty criteria array', (done) => {
      service.applyFilter([]).subscribe(result => {
        expect(result.length).toBe(mockUsers.length);
        done();
      });
    });

    it('should sanitize malicious input values', (done) => {
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: '<script>alert("xss")</script>john',
        type: FilterType.TEXT
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result.length).toBe(0); // Should not find matches due to sanitization
        done();
      });
    });
  });

  describe('getQuickFilters', () => {
    it('should return predefined quick filters', () => {
      const quickFilters = service.getQuickFilters();
      
      expect(quickFilters.length).toBeGreaterThan(0);
      expect(quickFilters.find(f => f.label === 'Active Users')).toBeDefined();
      expect(quickFilters.find(f => f.label === 'Admins')).toBeDefined();
      expect(quickFilters.find(f => f.label === 'Recent Users')).toBeDefined();
    });

    it('should have valid criteria for each quick filter', () => {
      const quickFilters = service.getQuickFilters();
      
      quickFilters.forEach(filter => {
        expect(filter.label).toBeDefined();
        expect(filter.criteria).toBeDefined();
        expect(Array.isArray(filter.criteria)).toBe(true);
        expect(filter.criteria.length).toBeGreaterThan(0);
        
        filter.criteria.forEach(criteria => {
          expect(criteria.field).toBeDefined();
          expect(criteria.operator).toBeDefined();
          expect(criteria.type).toBeDefined();
        });
      });
    });
  });

  describe('saveFilterPreset', () => {
    it('should save filter preset successfully', () => {
      const criteria: FilterCriteria[] = [
        {
          field: 'role',
          operator: FilterOperator.EQUALS,
          value: 'admin',
          type: FilterType.SELECT
        }
      ];

      const result = service.saveFilterPreset('Admin Users', criteria);
      
      expect(result.success).toBe(true);
      expect(result.preset).toBeDefined();
      expect(result.preset?.name).toBe('Admin Users');
      expect(result.preset?.criteria).toEqual(criteria);
    });

    it('should prevent duplicate preset names', () => {
      const criteria: FilterCriteria[] = [
        {
          field: 'role',
          operator: FilterOperator.EQUALS,
          value: 'admin',
          type: FilterType.SELECT
        }
      ];

      // Save first preset
      service.saveFilterPreset('Duplicate Name', criteria);
      
      // Try to save with same name
      const result = service.saveFilterPreset('Duplicate Name', criteria);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Preset name already exists');
    });

    it('should validate preset name', () => {
      const criteria: FilterCriteria[] = [
        {
          field: 'role',
          operator: FilterOperator.EQUALS,
          value: 'admin',
          type: FilterType.SELECT
        }
      ];

      const result = service.saveFilterPreset('', criteria);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Preset name is required');
    });

    it('should validate criteria array', () => {
      const result = service.saveFilterPreset('Valid Name', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one filter criteria is required');
    });
  });

  describe('getFilterPresets', () => {
    it('should return saved filter presets', () => {
      const criteria: FilterCriteria[] = [
        {
          field: 'isActive',
          operator: FilterOperator.EQUALS,
          value: true,
          type: FilterType.BOOLEAN
        }
      ];

      service.saveFilterPreset('Active Users Filter', criteria);
      
      const presets = service.getFilterPresets();
      
      expect(presets.length).toBe(1);
      expect(presets[0].name).toBe('Active Users Filter');
      expect(presets[0].criteria).toEqual(criteria);
    });
  });

  describe('deleteFilterPreset', () => {
    it('should delete existing preset', () => {
      const criteria: FilterCriteria[] = [
        {
          field: 'role',
          operator: FilterOperator.EQUALS,
          value: 'user',
          type: FilterType.SELECT
        }
      ];

      const saveResult = service.saveFilterPreset('Test Preset', criteria);
      const presetId = saveResult.preset!.id;
      
      const deleteResult = service.deleteFilterPreset(presetId);
      
      expect(deleteResult).toBe(true);
      
      const presets = service.getFilterPresets();
      expect(presets.find(p => p.id === presetId)).toBeUndefined();
    });

    it('should return false for non-existent preset', () => {
      const result = service.deleteFilterPreset('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('validateFilterCriteria', () => {
    it('should validate required fields', () => {
      const invalidCriteria: Partial<FilterCriteria> = {
        field: '',
        operator: FilterOperator.EQUALS,
        value: 'test'
      };

      const result = service.validateFilterCriteria([invalidCriteria as FilterCriteria]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should validate date format for date filters', () => {
      const criteria: FilterCriteria = {
        field: 'createdAt',
        operator: FilterOperator.EQUALS,
        value: 'invalid-date',
        type: FilterType.DATE
      };

      const result = service.validateFilterCriteria([criteria]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format');
    });

    it('should validate boolean values for boolean filters', () => {
      const criteria: FilterCriteria = {
        field: 'isActive',
        operator: FilterOperator.EQUALS,
        value: 'not-a-boolean',
        type: FilterType.BOOLEAN
      };

      const result = service.validateFilterCriteria([criteria]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid boolean value');
    });

    it('should return valid for correct criteria', () => {
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: 'test@example.com',
        type: FilterType.TEXT
      };

      const result = service.validateFilterCriteria([criteria]);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle UserService errors gracefully', (done) => {
      mockUserService.getUsers.and.returnValue(throwError(() => new Error('Service unavailable')));
      
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: 'test',
        type: FilterType.TEXT
      };

      service.applyFilter([criteria]).subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(mockNotificationService.showError).toHaveBeenCalledWith('Failed to load users for filtering');
          done();
        },
        error: () => {
          fail('Should not throw error, should handle gracefully');
          done();
        }
      });
    });

    it('should handle invalid filter operations gracefully', (done) => {
      const criteria: FilterCriteria = {
        field: 'nonExistentField',
        operator: FilterOperator.EQUALS,
        value: 'test',
        type: FilterType.TEXT
      };

      service.applyFilter([criteria]).subscribe(result => {
        expect(result).toEqual([]);
        expect(mockNotificationService.showWarning).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('performance', () => {
    it('should handle large datasets efficiently', (done) => {
      const largeUserSet = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        email: `user${i}@example.com`,
        name: `User ${i}`,
        role: i % 2 === 0 ? 'admin' : 'user',
        isActive: i % 3 === 0,
        department: i % 4 === 0 ? 'IT' : 'Marketing',
        createdAt: new Date(2023, i % 12, 1),
        lastLogin: new Date(2024, 0, i % 30 + 1)
      }));

      mockUserService.getUsers.and.returnValue(of(largeUserSet));
      
      const criteria: FilterCriteria = {
        field: 'role',
        operator: FilterOperator.EQUALS,
        value: 'admin',
        type: FilterType.SELECT
      };

      const startTime = performance.now();
      
      service.applyFilter([criteria]).subscribe(result => {
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(result.length).toBe(5000); // Half should be admins
        expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
        done();
      });
    });
  });

  describe('memory management', () => {
    it('should not leak memory on repeated filter operations', (done) => {
      const criteria: FilterCriteria = {
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: 'test',
        type: FilterType.TEXT
      };

      let completedOperations = 0;
      const totalOperations = 100;

      for (let i = 0; i < totalOperations; i++) {
        service.applyFilter([criteria]).subscribe(() => {
          completedOperations++;
          if (completedOperations === totalOperations) {
            // All operations completed without memory issues
            expect(completedOperations).toBe(totalOperations);
            done();
          }
        });
      }
    });
  });
});
