import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { UserFilter } from '../models/user-filter.model';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      isActive: false,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'moderator',
      isActive: true,
      createdAt: new Date('2024-02-01')
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
    it('should return all users without filter', () => {
      service.getUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
        expect(users.length).toBe(3);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should return filtered users by name', () => {
      const filter: UserFilter = {
        name: 'John'
      };

      const filteredUsers = [mockUsers[0]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(1);
        expect(users[0].name).toContain('John');
      });

      const req = httpMock.expectOne('/api/users?name=John');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should return filtered users by email', () => {
      const filter: UserFilter = {
        email: 'jane@example.com'
      };

      const filteredUsers = [mockUsers[1]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(1);
        expect(users[0].email).toBe('jane@example.com');
      });

      const req = httpMock.expectOne('/api/users?email=jane@example.com');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should return filtered users by role', () => {
      const filter: UserFilter = {
        role: 'admin'
      };

      const filteredUsers = [mockUsers[0]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(1);
        expect(users[0].role).toBe('admin');
      });

      const req = httpMock.expectOne('/api/users?role=admin');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should return filtered users by active status', () => {
      const filter: UserFilter = {
        isActive: true
      };

      const filteredUsers = [mockUsers[0], mockUsers[2]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(2);
        users.forEach(user => {
          expect(user.isActive).toBe(true);
        });
      });

      const req = httpMock.expectOne('/api/users?isActive=true');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should return filtered users by date range', () => {
      const filter: UserFilter = {
        createdAfter: new Date('2024-01-10'),
        createdBefore: new Date('2024-01-20')
      };

      const filteredUsers = [mockUsers[1]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/users?createdAfter=2024-01-10T00:00:00.000Z&createdBefore=2024-01-20T00:00:00.000Z');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should return filtered users with multiple criteria', () => {
      const filter: UserFilter = {
        role: 'user',
        isActive: false,
        name: 'Jane'
      };

      const filteredUsers = [mockUsers[1]];

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual(filteredUsers);
        expect(users.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/users?role=user&isActive=false&name=Jane');
      expect(req.request.method).toBe('GET');
      req.flush(filteredUsers);
    });

    it('should handle empty filter results', () => {
      const filter: UserFilter = {
        name: 'NonExistentUser'
      };

      service.getUsers(filter).subscribe(users => {
        expect(users).toEqual([]);
        expect(users.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/users?name=NonExistentUser');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should handle HTTP error', () => {
      const filter: UserFilter = {
        name: 'John'
      };

      service.getUsers(filter).subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/users?name=John');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getUserById', () => {
    it('should return user by id', () => {
      const userId = '1';
      const expectedUser = mockUsers[0];

      service.getUserById(userId).subscribe(user => {
        expect(user).toEqual(expectedUser);
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedUser);
    });

    it('should handle user not found', () => {
      const userId = '999';

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

  describe('createUser', () => {
    it('should create a new user', () => {
      const newUser: Omit<User, 'id' | 'createdAt'> = {
        name: 'New User',
        email: 'newuser@example.com',
        role: 'user',
        isActive: true
      };

      const createdUser: User = {
        ...newUser,
        id: '4',
        createdAt: new Date()
      };

      service.createUser(newUser).subscribe(user => {
        expect(user).toEqual(createdUser);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(createdUser);
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', () => {
      const userId = '1';
      const updatedUser: User = {
        ...mockUsers[0],
        name: 'Updated Name'
      };

      service.updateUser(userId, updatedUser).subscribe(user => {
        expect(user).toEqual(updatedUser);
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedUser);
      req.flush(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', () => {
      const userId = '1';

      service.deleteUser(userId).subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('getFilteredUsersCount', () => {
    it('should return count of filtered users', () => {
      const filter: UserFilter = {
        isActive: true
      };

      const expectedCount = { count: 2 };

      service.getFilteredUsersCount(filter).subscribe(result => {
        expect(result).toEqual(expectedCount);
      });

      const req = httpMock.expectOne('/api/users/count?isActive=true');
      expect(req.request.method).toBe('GET');
      req.flush(expectedCount);
    });
  });

  describe('getRoles', () => {
    it('should return available user roles', () => {
      const expectedRoles = ['admin', 'moderator', 'user'];

      service.getRoles().subscribe(roles => {
        expect(roles).toEqual(expectedRoles);
      });

      const req = httpMock.expectOne('/api/users/roles');
      expect(req.request.method).toBe('GET');
      req.flush(expectedRoles);
    });
  });
});
