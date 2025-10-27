import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, ApiResponse } from '../models/user.model';

/**
 * User Service
 * 
 * Handles all HTTP operations for user management
 * Follows Angular best practices: One class per file
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Get all users
   */
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl);
  }

  /**
   * Get single user by ID
   */
  getUser(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new user
   */
  createUser(user: User): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, user);
  }

  /**
   * Update existing user
   */
  updateUser(id: string, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, user);
  }

  /**
   * Delete user by ID
   */
  deleteUser(id: string): Observable<ApiResponse<User>> {
    return this.http.delete<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }
}
