import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { UserFilter } from '../models/user-filter.model';
import { of, throwError } from 'rxjs';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2023-01-01'),
      department: 'IT'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'inactive',
      createdAt: new Date('2023-02-01'),
      department: 'HR'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'moderator',
      status: 'active',
      createdAt: new Date('2023-03-01'),
      department: 'IT'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('should return users without filters', () => {
      service.getUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should return users with query parameters when filters applied', () => {
      const filter: UserFilter = {
        search: 'John',
        role: 'admin',
        status: 'active',
        department: 'IT'
      };

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual([mockUsers[0]]);
      });

      const req = httpMock.expectOne('/api/users?search=John&role=admin&status=active&department=IT');
      expect(req.request.method).toBe('GET');
      req.flush([mockUsers[0]]);
    });

    it('should handle partial filters', () => {
      const filter: UserFilter = {
        role: 'user'
      };

      service.getUsers(filter).subscribe();

      const req = httpMock.expectOne('/api/users?role=user');
      expect(req.request.method).toBe('GET');
      req.flush([mockUsers[1]]);
    });

    it('should handle empty string filters by excluding them from query', () => {
      const filter: UserFilter = {
        search: '',
        role: 'admin',
        status: '',
        department: 'IT'
      };

      service.getUsers(filter).subscribe();

      const req = httpMock.expectOne('/api/users?role=admin&department=IT');
      expect(req.request.method).toBe('GET');
      req.flush([mockUsers[0]]);
    });

    it('should handle HTTP errors', () => {
      service.getUsers().subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getUserById', () => {
    it('should return a specific user', () => {
      const userId = '1';

      service.getUserById(userId).subscribe(user => {
        expect(user).toEqual(mockUsers[0]);
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers[0]);
    });

    it('should handle user not found', () => {
      const userId = 'nonexistent';

      service.getUserById(userId).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      req.flush('User not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', () => {
      const expectedOptions = {
        roles: ['admin', 'user', 'moderator'],
        statuses: ['active', 'inactive'],
        departments: ['IT', 'HR', 'Finance']
      };

      service.getFilterOptions().subscribe(options => {
        expect(options).toEqual(expectedOptions);
      });

      const req = httpMock.expectOne('/api/users/filter-options');
      expect(req.request.method).toBe('GET');
      req.flush(expectedOptions);
    });
  });

  describe('createUser', () => {
    it('should create a new user', () => {
      const newUser: Omit<User, 'id'> = {
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        department: 'Finance'
      };

      const createdUser: User = { id: '4', ...newUser };

      service.createUser(newUser).subscribe(user => {
        expect(user).toEqual(createdUser);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(createdUser);
    });

    it('should handle creation errors', () => {
      const newUser: Omit<User, 'id'> = {
        name: '',
        email: 'invalid-email',
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        department: 'Finance'
      };

      service.createUser(newUser).subscribe({
        next: () => fail('should have failed with validation error'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush('Validation failed', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', () => {
      const updatedUser: User = {
        ...mockUsers[0],
        name: 'John Updated'
      };

      service.updateUser(updatedUser).subscribe(user => {
        expect(user).toEqual(updatedUser);
      });

      const req = httpMock.expectOne(`/api/users/${updatedUser.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedUser);
      req.flush(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', () => {
      const userId = '1';

      service.deleteUser(userId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', () => {
      const errorEvent = new ErrorEvent('Network error');

      service.getUsers().subscribe({
        next: () => fail('should have failed with network error'),
        error: (error) => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.error(errorEvent);
    });
  });

  describe('filter validation', () => {
    it('should handle null filter values', () => {
      const filter: UserFilter = {
        search: null as any,
        role: undefined as any,
        status: 'active'
      };

      service.getUsers(filter).subscribe();

      const req = httpMock.expectOne('/api/users?status=active');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should encode special characters in filter values', () => {
      const filter: UserFilter = {
        search: 'test@domain.com',
        department: 'R&D'
      };

      service.getUsers(filter).subscribe();

      const req = httpMock.expectOne('/api/users?search=test%40domain.com&department=R%26D');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });
  });

  describe('performance considerations', () => {
    it('should handle large result sets', () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUsers[0],
        id: i.toString(),
        name: `User ${i}`
      }));

      service.getUsers().subscribe(users => {
        expect(users.length).toBe(1000);
        expect(users[0].name).toBe('User 0');
        expect(users[999].name).toBe('User 999');
      });

      const req = httpMock.expectOne('/api/users');
      req.flush(largeUserSet);
    });
  });
});