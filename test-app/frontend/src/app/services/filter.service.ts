import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, distinctUntilChanged } from 'rxjs';

export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greater' | 'less' | 'between';
  value: any;
  label?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  isDefault?: boolean;
}

export interface FilterState {
  activeCriteria: FilterCriteria[];
  activePreset?: string;
  searchTerm: string;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private readonly filterStateSubject = new BehaviorSubject<FilterState>({
    activeCriteria: [],
    searchTerm: '',
    sortDirection: 'asc'
  });

  private readonly presetsSubject = new BehaviorSubject<FilterPreset[]>([
    {
      id: 'active-users',
      name: 'Active Users',
      criteria: [{ field: 'isActive', operator: 'equals', value: true }],
      isDefault: true
    },
    {
      id: 'admins',
      name: 'Administrators',
      criteria: [{ field: 'role', operator: 'equals', value: 'admin' }]
    },
    {
      id: 'recent-users',
      name: 'Recent Users',
      criteria: [{ field: 'createdAt', operator: 'greater', value: this.getDateDaysAgo(30) }]
    }
  ]);

  public readonly filterState$ = this.filterStateSubject.asObservable();
  public readonly presets$ = this.presetsSubject.asObservable();
  public readonly hasActiveFilters$ = this.filterState$.pipe(
    map(state => state.activeCriteria.length > 0 || state.searchTerm.length > 0),
    distinctUntilChanged()
  );

  addCriteria(criteria: FilterCriteria): void {
    const currentState = this.filterStateSubject.value;
    const sanitizedCriteria = this.sanitizeCriteria(criteria);
    
    // Remove existing criteria for the same field
    const filteredCriteria = currentState.activeCriteria.filter(
      c => c.field !== sanitizedCriteria.field
    );
    
    this.filterStateSubject.next({
      ...currentState,
      activeCriteria: [...filteredCriteria, sanitizedCriteria],
      activePreset: undefined
    });
  }

  removeCriteria(field: string): void {
    const currentState = this.filterStateSubject.value;
    this.filterStateSubject.next({
      ...currentState,
      activeCriteria: currentState.activeCriteria.filter(c => c.field !== field),
      activePreset: undefined
    });
  }

  updateSearchTerm(searchTerm: string): void {
    const sanitizedTerm = this.sanitizeSearchTerm(searchTerm);
    const currentState = this.filterStateSubject.value;
    
    this.filterStateSubject.next({
      ...currentState,
      searchTerm: sanitizedTerm,
      activePreset: undefined
    });
  }

  applyPreset(presetId: string): void {
    const preset = this.presetsSubject.value.find(p => p.id === presetId);
    if (!preset) return;

    const currentState = this.filterStateSubject.value;
    this.filterStateSubject.next({
      ...currentState,
      activeCriteria: [...preset.criteria],
      activePreset: presetId,
      searchTerm: ''
    });
  }

  setSorting(sortBy: string, direction: 'asc' | 'desc'): void {
    const currentState = this.filterStateSubject.value;
    this.filterStateSubject.next({
      ...currentState,
      sortBy,
      sortDirection: direction
    });
  }

  clearAllFilters(): void {
    this.filterStateSubject.next({
      activeCriteria: [],
      searchTerm: '',
      sortDirection: 'asc',
      activePreset: undefined
    });
  }

  filterData<T>(data: T[], filterState?: FilterState): T[] {
    const state = filterState || this.filterStateSubject.value;
    let filteredData = [...data];

    // Apply search term
    if (state.searchTerm) {
      filteredData = this.applySearchFilter(filteredData, state.searchTerm);
    }

    // Apply criteria filters
    state.activeCriteria.forEach(criteria => {
      filteredData = this.applyCriteriaFilter(filteredData, criteria);
    });

    // Apply sorting
    if (state.sortBy) {
      filteredData = this.applySorting(filteredData, state.sortBy, state.sortDirection);
    }

    return filteredData;
  }

  getFilteredData$<T>(data$: Observable<T[]>): Observable<T[]> {
    return combineLatest([
      data$,
      this.filterState$
    ]).pipe(
      map(([data, filterState]) => this.filterData(data, filterState)),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }

  createPreset(name: string, criteria: FilterCriteria[]): void {
    const sanitizedName = this.sanitizePresetName(name);
    const newPreset: FilterPreset = {
      id: this.generatePresetId(sanitizedName),
      name: sanitizedName,
      criteria: criteria.map(c => this.sanitizeCriteria(c))
    };

    const currentPresets = this.presetsSubject.value;
    this.presetsSubject.next([...currentPresets, newPreset]);
  }

  deletePreset(presetId: string): void {
    const currentPresets = this.presetsSubject.value;
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    this.presetsSubject.next(updatedPresets);

    // Clear active preset if it was deleted
    const currentState = this.filterStateSubject.value;
    if (currentState.activePreset === presetId) {
      this.filterStateSubject.next({
        ...currentState,
        activePreset: undefined
      });
    }
  }

  private sanitizeCriteria(criteria: FilterCriteria): FilterCriteria {
    return {
      field: this.sanitizeString(criteria.field),
      operator: criteria.operator,
      value: this.sanitizeFilterValue(criteria.value),
      label: criteria.label ? this.sanitizeString(criteria.label) : undefined
    };
  }

  private sanitizeSearchTerm(term: string): string {
    return this.sanitizeString(term).slice(0, 100); // Limit search term length
  }

  private sanitizePresetName(name: string): string {
    return this.sanitizeString(name).slice(0, 50); // Limit preset name length
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return '';
    return str.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, '')
              .trim();
  }

  private sanitizeFilterValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value instanceof Date) {
      return value;
    }
    return String(value).slice(0, 100);
  }

  private applySearchFilter<T>(data: T[], searchTerm: string): T[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item as any).some(value => {
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }

  private applyCriteriaFilter<T>(data: T[], criteria: FilterCriteria): T[] {
    return data.filter(item => {
      const itemValue = (item as any)[criteria.field];
      return this.matchesCriteria(itemValue, criteria);
    });
  }

  private matchesCriteria(itemValue: any, criteria: FilterCriteria): boolean {
    const { operator, value } = criteria;
    
    switch (operator) {
      case 'equals':
        return itemValue === value;
      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      case 'startsWith':
        return String(itemValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'endsWith':
        return String(itemValue).toLowerCase().endsWith(String(value).toLowerCase());
      case 'greater':
        return itemValue > value;
      case 'less':
        return itemValue < value;
      case 'between':
        return Array.isArray(value) && itemValue >= value[0] && itemValue <= value[1];
      default:
        return false;
    }
  }

  private applySorting<T>(data: T[], sortBy: string, direction: 'asc' | 'desc'): T[] {
    return data.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];
      
      let comparison = 0;
      if (aValue > bValue) comparison = 1;
      if (aValue < bValue) comparison = -1;
      
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  private generatePresetId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }

  private getDateDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}