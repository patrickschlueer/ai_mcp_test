import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, ApiResponse } from '../models/user.model';

export interface UserFilterCriteria {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UserFilterPreset {
  id: string;
  name: string;
  criteria: UserFilterCriteria;
  isDefault?: boolean;
}

/**
 * User Service
 * 
 * Handles all HTTP operations for user management including filtering
 * Follows Angular best practices: One class per file
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Get all users without filters
   */
  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl);
  }

  /**
   * Get filtered users with pagination
   */
  getFilteredUsers(criteria: UserFilterCriteria): Observable<ApiResponse<User[]>> {
    const params = this.buildHttpParams(criteria);
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/filter`, { params });
  }

  /**
   * Get users with quick filter presets
   */
  getUsersWithQuickFilter(preset: 'active' | 'inactive' | 'admins' | 'recent'): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/quick-filter/${preset}`);
  }

  /**
   * Search users by text query
   */
  searchUsers(query: string, limit: number = 20): Observable<ApiResponse<User[]>> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
    
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get available filter options (roles, etc.)
   */
  getFilterOptions(): Observable<ApiResponse<{
    roles: string[];
    departments: string[];
    statuses: string[];
  }>> {
    return this.http.get<ApiResponse<{
      roles: string[];
      departments: string[];
      statuses: string[];
    }>>(`${this.apiUrl}/filter-options`);
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

  /**
   * Bulk operations on filtered users
   */
  bulkUpdateUsers(userIds: string[], updates: Partial<User>): Observable<ApiResponse<User[]>> {
    return this.http.patch<ApiResponse<User[]>>(`${this.apiUrl}/bulk`, {
      userIds,
      updates
    });
  }

  /**
   * Bulk delete filtered users
   */
  bulkDeleteUsers(userIds: string[]): Observable<ApiResponse<{ deletedCount: number }>> {
    return this.http.delete<ApiResponse<{ deletedCount: number }>>(`${this.apiUrl}/bulk`, {
      body: { userIds }
    });
  }

  /**
   * Export filtered users
   */
  exportUsers(criteria: UserFilterCriteria, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    const params = this.buildHttpParams({ ...criteria, format });
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Save filter preset
   */
  saveFilterPreset(preset: Omit<UserFilterPreset, 'id'>): Observable<ApiResponse<UserFilterPreset>> {
    return this.http.post<ApiResponse<UserFilterPreset>>(`${this.apiUrl}/filter-presets`, preset);
  }

  /**
   * Get saved filter presets
   */
  getFilterPresets(): Observable<ApiResponse<UserFilterPreset[]>> {
    return this.http.get<ApiResponse<UserFilterPreset[]>>(`${this.apiUrl}/filter-presets`);
  }

  /**
   * Delete filter preset
   */
  deleteFilterPreset(presetId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/filter-presets/${presetId}`);
  }

  /**
   * Build HTTP params from filter criteria
   */
  private buildHttpParams(criteria: UserFilterCriteria & { format?: string }): HttpParams {
    let params = new HttpParams();

    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else if (typeof value === 'boolean') {
          params = params.set(key, value.toString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });

    return params;
  }

  /**
   * Sanitize filter input to prevent XSS
   */
  private sanitizeFilterInput(input: string): string {
    return input
      .replace(/[<>"'&]/g, '')
      .trim()
      .substring(0, 100); // Limit length
  }
}