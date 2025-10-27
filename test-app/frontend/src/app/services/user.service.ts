import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  department?: string;
  skills?: string[];
}

export interface UserFilterCriteria {
  search?: string;
  roles?: string[];
  statuses?: string[];
  departments?: string[];
  skills?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: UserFilterCriteria;
  isDefault?: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_BASE_URL = '/api/users';
  private readonly FILTER_DEBOUNCE_TIME = 300;
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_CLIENT_SIDE_RECORDS = 5000;

  private filterCriteriaSubject = new BehaviorSubject<UserFilterCriteria>({});
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  // Cached data for performance
  private allUsersCache: User[] = [];
  private filteredUsersCache = new Map<string, User[]>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public readonly filterCriteria$ = this.filterCriteriaSubject.asObservable();
  public readonly loading$ = this.loadingSubject.asObservable();
  public readonly error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get filtered users with pagination
   */
  getUsers(criteria: UserFilterCriteria = {}, page = 1, pageSize = this.DEFAULT_PAGE_SIZE): Observable<PaginatedResponse<User>> {
    this.setLoading(true);
    this.clearError();

    // Use client-side filtering for small datasets
    if (this.shouldUseClientSideFiltering()) {
      return this.getClientSideFilteredUsers(criteria, page, pageSize);
    }

    // Server-side filtering for large datasets
    return this.getServerSideFilteredUsers(criteria, page, pageSize);
  }

  /**
   * Client-side filtering for better performance with small datasets
   */
  private getClientSideFilteredUsers(criteria: UserFilterCriteria, page: number, pageSize: number): Observable<PaginatedResponse<User>> {
    return this.getAllUsers().pipe(
      map(users => {
        const filtered = this.applyClientSideFilters(users, criteria);
        const total = filtered.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = filtered.slice(startIndex, endIndex);

        return {
          data: paginatedData,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        };
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Server-side filtering for large datasets
   */
  private getServerSideFilteredUsers(criteria: UserFilterCriteria, page: number, pageSize: number): Observable<PaginatedResponse<User>> {
    const params = this.buildHttpParams(criteria, page, pageSize);
    
    return this.http.get<PaginatedResponse<User>>(this.API_BASE_URL, { params }).pipe(
      map(response => ({
        ...response,
        data: response.data.map(user => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
        }))
      })),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get all users (used for client-side filtering)
   */
  private getAllUsers(): Observable<User[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.allUsersCache.length > 0 && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      return new Observable(observer => {
        observer.next(this.allUsersCache);
        observer.complete();
        this.setLoading(false);
      });
    }

    return this.http.get<User[]>(`${this.API_BASE_URL}/all`).pipe(
      map(users => users.map(user => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
      }))),
      map(users => {
        // Update cache
        this.allUsersCache = users;
        this.lastCacheUpdate = now;
        this.setLoading(false);
        return users;
      }),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Apply filters on client-side
   */
  private applyClientSideFilters(users: User[], criteria: UserFilterCriteria): User[] {
    let filtered = [...users];

    // Text search
    if (criteria.search?.trim()) {
      const searchTerm = this.sanitizeSearchTerm(criteria.search.toLowerCase());
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.department?.toLowerCase().includes(searchTerm)
      );
    }

    // Role filter
    if (criteria.roles?.length) {
      filtered = filtered.filter(user => criteria.roles!.includes(user.role));
    }

    // Status filter
    if (criteria.statuses?.length) {
      filtered = filtered.filter(user => criteria.statuses!.includes(user.status));
    }

    // Department filter
    if (criteria.departments?.length) {
      filtered = filtered.filter(user => 
        user.department && criteria.departments!.includes(user.department)
      );
    }

    // Skills filter
    if (criteria.skills?.length) {
      filtered = filtered.filter(user =>
        user.skills?.some(skill => criteria.skills!.includes(skill))
      );
    }

    // Date range filters
    if (criteria.createdAfter) {
      filtered = filtered.filter(user => user.createdAt >= criteria.createdAfter!);
    }

    if (criteria.createdBefore) {
      filtered = filtered.filter(user => user.createdAt <= criteria.createdBefore!);
    }

    if (criteria.lastLoginAfter) {
      filtered = filtered.filter(user => 
        user.lastLoginAt && user.lastLoginAt >= criteria.lastLoginAfter!
      );
    }

    if (criteria.lastLoginBefore) {
      filtered = filtered.filter(user => 
        user.lastLoginAt && user.lastLoginAt <= criteria.lastLoginBefore!
      );
    }

    return filtered;
  }

  /**
   * Build HTTP params for server-side filtering
   */
  private buildHttpParams(criteria: UserFilterCriteria, page: number, pageSize: number): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (criteria.search?.trim()) {
      params = params.set('search', this.sanitizeSearchTerm(criteria.search));
    }

    if (criteria.roles?.length) {
      params = params.set('roles', criteria.roles.join(','));
    }

    if (criteria.statuses?.length) {
      params = params.set('statuses', criteria.statuses.join(','));
    }

    if (criteria.departments?.length) {
      params = params.set('departments', criteria.departments.join(','));
    }

    if (criteria.skills?.length) {
      params = params.set('skills', criteria.skills.join(','));
    }

    if (criteria.createdAfter) {
      params = params.set('createdAfter', criteria.createdAfter.toISOString());
    }

    if (criteria.createdBefore) {
      params = params.set('createdBefore', criteria.createdBefore.toISOString());
    }

    if (criteria.lastLoginAfter) {
      params = params.set('lastLoginAfter', criteria.lastLoginAfter.toISOString());
    }

    if (criteria.lastLoginBefore) {
      params = params.set('lastLoginBefore', criteria.lastLoginBefore.toISOString());
    }

    return params;
  }

  /**
   * Get filter options for dropdowns
   */
  getFilterOptions(): Observable<{
    roles: string[];
    statuses: string[];
    departments: string[];
    skills: string[];
  }> {
    return this.http.get<{
      roles: string[];
      statuses: string[];
      departments: string[];
      skills: string[];
    }>(`${this.API_BASE_URL}/filter-options`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Save filter preset
   */
  saveFilterPreset(name: string, criteria: UserFilterCriteria): Observable<FilterPreset> {
    const preset = {
      name: this.sanitizeInput(name),
      criteria
    };

    return this.http.post<FilterPreset>(`${this.API_BASE_URL}/filter-presets`, preset).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get saved filter presets
   */
  getFilterPresets(): Observable<FilterPreset[]> {
    return this.http.get<FilterPreset[]>(`${this.API_BASE_URL}/filter-presets`).pipe(
      map(presets => presets.map(preset => ({
        ...preset,
        createdAt: new Date(preset.createdAt)
      }))),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Delete filter preset
   */
  deleteFilterPreset(presetId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/filter-presets/${presetId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Export filtered users
   */
  exportUsers(criteria: UserFilterCriteria, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    const params = this.buildHttpParams(criteria, 1, 99999)
      .set('format', format);

    return this.http.get(`${this.API_BASE_URL}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Update filter criteria and notify subscribers
   */
  updateFilterCriteria(criteria: UserFilterCriteria): void {
    this.filterCriteriaSubject.next(criteria);
  }

  /**
   * Get current filter criteria
   */
  getCurrentFilterCriteria(): UserFilterCriteria {
    return this.filterCriteriaSubject.value;
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterCriteriaSubject.next({});
    this.clearError();
  }

  /**
   * Quick filters for common use cases
   */
  applyQuickFilter(type: 'active-users' | 'admins' | 'recent-logins' | 'inactive-users'): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let criteria: UserFilterCriteria = {};

    switch (type) {
      case 'active-users':
        criteria = { statuses: ['active'] };
        break;
      case 'admins':
        criteria = { roles: ['admin'] };
        break;
      case 'recent-logins':
        criteria = { lastLoginAfter: thirtyDaysAgo };
        break;
      case 'inactive-users':
        criteria = { statuses: ['inactive'] };
        break;
    }

    this.updateFilterCriteria(criteria);
  }

  /**
   * Determine if client-side filtering should be used
   */
  private shouldUseClientSideFiltering(): boolean {
    return this.allUsersCache.length > 0 && this.allUsersCache.length <= this.MAX_CLIENT_SIDE_RECORDS;
  }

  /**
   * Sanitize search input to prevent XSS
   */
  private sanitizeSearchTerm(input: string): string {
    return input
      .replace(/[<>"'&]/g, '')
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Sanitize general input
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>"'&{}]/g, '')
      .trim()
      .substring(0, 255);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    this.setLoading(false);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid filter criteria';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 404:
          errorMessage = 'Users not found';
          break;
        case 500:
          errorMessage = 'Server error occurred';
          break;
        default:
          errorMessage = `Server Error: ${error.status}`;
      }
    }

    this.errorSubject.next(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.allUsersCache = [];
    this.filteredUsersCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Get debounced filter criteria for reactive filtering
   */
  getDebouncedFilterCriteria(): Observable<UserFilterCriteria> {
    return this.filterCriteria$.pipe(
      debounceTime(this.FILTER_DEBOUNCE_TIME),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }
}