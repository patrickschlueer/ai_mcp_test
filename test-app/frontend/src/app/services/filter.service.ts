import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, debounceTime, distinctUntilChanged } from 'rxjs';

export interface FilterCriteria {
  searchTerm?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  isDefault?: boolean;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: string;
  createdAt: Date;
  lastLogin?: Date;
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private readonly filterCriteria$ = new BehaviorSubject<FilterCriteria>({});
  private readonly sortConfig$ = new BehaviorSubject<SortConfig>({ field: 'name', direction: 'asc' });
  private readonly quickFilters$ = new BehaviorSubject<string[]>([]);
  
  private readonly defaultPresets: FilterPreset[] = [
    {
      id: 'active-users',
      name: 'Active Users',
      criteria: { status: 'active' },
      isDefault: true
    },
    {
      id: 'admin-users',
      name: 'Administrators',
      criteria: { role: 'admin', status: 'active' }
    },
    {
      id: 'recent-users',
      name: 'Recent Users',
      criteria: {
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      }
    }
  ];

  private readonly savedPresets$ = new BehaviorSubject<FilterPreset[]>(this.loadPresetsFromStorage());

  constructor() {
    // Auto-save filter presets to localStorage
    this.savedPresets$.subscribe(presets => {
      localStorage.setItem('filter-presets', JSON.stringify(presets));
    });
  }

  // Filter Criteria Management
  updateFilterCriteria(criteria: Partial<FilterCriteria>): void {
    const currentCriteria = this.filterCriteria$.value;
    const sanitizedCriteria = this.sanitizeFilterCriteria({ ...currentCriteria, ...criteria });
    this.filterCriteria$.next(sanitizedCriteria);
  }

  clearFilters(): void {
    this.filterCriteria$.next({});
  }

  getFilterCriteria(): Observable<FilterCriteria> {
    return this.filterCriteria$.asObservable().pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  getCurrentFilterCriteria(): FilterCriteria {
    return this.filterCriteria$.value;
  }

  // Sort Configuration
  updateSortConfig(config: SortConfig): void {
    const sanitizedConfig = this.sanitizeSortConfig(config);
    this.sortConfig$.next(sanitizedConfig);
  }

  getSortConfig(): Observable<SortConfig> {
    return this.sortConfig$.asObservable();
  }

  toggleSortDirection(field: string): void {
    const currentSort = this.sortConfig$.value;
    const newDirection = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    this.updateSortConfig({ field, direction: newDirection });
  }

  // Filter Application
  filterUsers(users: User[]): Observable<User[]> {
    return combineLatest([
      this.getFilterCriteria(),
      this.getSortConfig()
    ]).pipe(
      map(([criteria, sortConfig]) => {
        let filteredUsers = this.applyFilters(users, criteria);
        return this.applySorting(filteredUsers, sortConfig);
      })
    );
  }

  filterUsersSync(users: User[], criteria?: FilterCriteria, sortConfig?: SortConfig): User[] {
    const filterCriteria = criteria || this.getCurrentFilterCriteria();
    const sortConfiguration = sortConfig || this.sortConfig$.value;
    
    let filteredUsers = this.applyFilters(users, filterCriteria);
    return this.applySorting(filteredUsers, sortConfiguration);
  }

  private applyFilters(users: User[], criteria: FilterCriteria): User[] {
    return users.filter(user => {
      // Search term filter
      if (criteria.searchTerm) {
        const searchTerm = criteria.searchTerm.toLowerCase().trim();
        const searchableText = `${user.name} ${user.email} ${user.role}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (criteria.status && criteria.status !== 'all') {
        if (user.status !== criteria.status) {
          return false;
        }
      }

      // Role filter
      if (criteria.role) {
        if (user.role.toLowerCase() !== criteria.role.toLowerCase()) {
          return false;
        }
      }

      // Date range filter
      if (criteria.dateRange) {
        const userDate = new Date(user.createdAt);
        if (userDate < criteria.dateRange.from || userDate > criteria.dateRange.to) {
          return false;
        }
      }

      // Tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const hasMatchingTag = criteria.tags.some(tag => 
          user.tags.some(userTag => userTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  private applySorting(users: User[], sortConfig: SortConfig): User[] {
    return [...users].sort((a, b) => {
      let aValue: any = this.getNestedProperty(a, sortConfig.field);
      let bValue: any = this.getNestedProperty(b, sortConfig.field);

      // Handle dates
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      // Handle strings (case insensitive)
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;

      return sortConfig.direction === 'desc' ? -result : result;
    });
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Filter Presets
  getAllPresets(): Observable<FilterPreset[]> {
    return combineLatest([
      this.savedPresets$,
    ]).pipe(
      map(([saved]) => [...this.defaultPresets, ...saved])
    );
  }

  applyPreset(presetId: string): void {
    this.getAllPresets().pipe(
      map(presets => presets.find(p => p.id === presetId))
    ).subscribe(preset => {
      if (preset) {
        this.filterCriteria$.next(preset.criteria);
      }
    });
  }

  savePreset(name: string, criteria?: FilterCriteria): void {
    const currentCriteria = criteria || this.getCurrentFilterCriteria();
    const sanitizedName = this.sanitizeString(name);
    
    if (!sanitizedName.trim()) {
      throw new Error('Preset name cannot be empty');
    }

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: sanitizedName,
      criteria: currentCriteria
    };

    const currentPresets = this.savedPresets$.value;
    this.savedPresets$.next([...currentPresets, newPreset]);
  }

  deletePreset(presetId: string): void {
    const currentPresets = this.savedPresets$.value;
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    this.savedPresets$.next(updatedPresets);
  }

  // Quick Filters
  getQuickFilters(): Observable<string[]> {
    return this.quickFilters$.asObservable();
  }

  addQuickFilter(filter: string): void {
    const sanitizedFilter = this.sanitizeString(filter);
    if (!sanitizedFilter.trim()) return;

    const currentFilters = this.quickFilters$.value;
    if (!currentFilters.includes(sanitizedFilter)) {
      this.quickFilters$.next([...currentFilters, sanitizedFilter]);
    }
  }

  removeQuickFilter(filter: string): void {
    const currentFilters = this.quickFilters$.value;
    this.quickFilters$.next(currentFilters.filter(f => f !== filter));
  }

  // Utility Methods
  getFilterSummary(criteria?: FilterCriteria): string {
    const filterCriteria = criteria || this.getCurrentFilterCriteria();
    const parts: string[] = [];

    if (filterCriteria.searchTerm) {
      parts.push(`Search: "${filterCriteria.searchTerm}"`);
    }
    if (filterCriteria.status && filterCriteria.status !== 'all') {
      parts.push(`Status: ${filterCriteria.status}`);
    }
    if (filterCriteria.role) {
      parts.push(`Role: ${filterCriteria.role}`);
    }
    if (filterCriteria.dateRange) {
      parts.push('Date range applied');
    }
    if (filterCriteria.tags && filterCriteria.tags.length > 0) {
      parts.push(`Tags: ${filterCriteria.tags.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
  }

  hasActiveFilters(criteria?: FilterCriteria): boolean {
    const filterCriteria = criteria || this.getCurrentFilterCriteria();
    return Object.keys(filterCriteria).length > 0 && 
           Object.values(filterCriteria).some(value => 
             value !== undefined && value !== null && value !== '' &&
             !(Array.isArray(value) && value.length === 0)
           );
  }

  exportFilteredResults(users: User[], filename?: string): void {
    const filteredUsers = this.filterUsersSync(users);
    const csvContent = this.convertToCsv(filteredUsers);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `filtered-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }

  private convertToCsv(users: User[]): string {
    const headers = ['ID', 'Name', 'Email', 'Status', 'Role', 'Created At', 'Last Login', 'Tags'];
    const rows = users.map(user => [
      user.id,
      user.name,
      user.email,
      user.status,
      user.role,
      user.createdAt.toISOString(),
      user.lastLogin?.toISOString() || '',
      user.tags.join('; ')
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  // Security & Validation
  private sanitizeFilterCriteria(criteria: FilterCriteria): FilterCriteria {
    const sanitized: FilterCriteria = {};

    if (criteria.searchTerm !== undefined) {
      sanitized.searchTerm = this.sanitizeString(criteria.searchTerm);
    }
    if (criteria.status !== undefined) {
      sanitized.status = this.sanitizeStatus(criteria.status);
    }
    if (criteria.role !== undefined) {
      sanitized.role = this.sanitizeString(criteria.role);
    }
    if (criteria.dateRange !== undefined) {
      sanitized.dateRange = this.sanitizeDateRange(criteria.dateRange);
    }
    if (criteria.tags !== undefined) {
      sanitized.tags = criteria.tags.map(tag => this.sanitizeString(tag)).filter(tag => tag.trim());
    }

    return sanitized;
  }

  private sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    // Remove potential XSS vectors and limit length
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .substring(0, 500)
                .trim();
  }

  private sanitizeStatus(status: string): 'active' | 'inactive' | 'all' {
    const validStatuses: ('active' | 'inactive' | 'all')[] = ['active', 'inactive', 'all'];
    return validStatuses.includes(status as any) ? status as 'active' | 'inactive' | 'all' : 'all';
  }

  private sanitizeDateRange(dateRange: { from: Date; to: Date }): { from: Date; to: Date } | undefined {
    try {
      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return undefined;
      }
      
      // Ensure from is before to
      return from <= to ? { from, to } : { from: to, to: from };
    } catch {
      return undefined;
    }
  }

  private sanitizeSortConfig(config: SortConfig): SortConfig {
    const validFields = ['id', 'name', 'email', 'status', 'role', 'createdAt', 'lastLogin'];
    const validDirections: ('asc' | 'desc')[] = ['asc', 'desc'];
    
    return {
      field: validFields.includes(config.field) ? config.field : 'name',
      direction: validDirections.includes(config.direction) ? config.direction : 'asc'
    };
  }

  private loadPresetsFromStorage(): FilterPreset[] {
    try {
      const stored = localStorage.getItem('filter-presets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Memory Management
  ngOnDestroy(): void {
    this.filterCriteria$.complete();
    this.sortConfig$.complete();
    this.quickFilters$.complete();
    this.savedPresets$.complete();
  }
}