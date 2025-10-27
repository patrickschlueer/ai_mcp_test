import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';

export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  isDefault?: boolean;
}

export interface QuickFilter {
  id: string;
  label: string;
  criteria: FilterCriteria;
  count?: number;
}

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterComponent implements OnInit, OnDestroy {
  @Input() fields: { key: string; label: string; type: string; options?: any[] }[] = [];
  @Input() data: any[] = [];
  @Input() presets: FilterPreset[] = [];
  @Input() quickFilters: QuickFilter[] = [];
  @Input() maxRecordsClientSide = 5000;
  @Input() showAdvanced = true;
  @Input() showPresets = true;
  @Input() showQuickFilters = true;
  @Input() debounceTime = 300;
  
  @Output() filterChange = new EventEmitter<any[]>();
  @Output() criteriaChange = new EventEmitter<FilterCriteria[]>();
  @Output() presetSave = new EventEmitter<FilterPreset>();
  @Output() presetDelete = new EventEmitter<string>();
  @Output() serverSideFilter = new EventEmitter<FilterCriteria[]>();

  filterForm: FormGroup;
  filteredData$ = new BehaviorSubject<any[]>([]);
  isAdvancedOpen = false;
  isPresetPanelOpen = false;
  isMobile = false;
  activeQuickFilters: string[] = [];
  filterHistory: FilterCriteria[][] = [];
  currentHistoryIndex = -1;
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private searchSubject$ = new BehaviorSubject<string>('');
  private criteriaSubject$ = new BehaviorSubject<FilterCriteria[]>([]);

  readonly operators = {
    text: [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' }
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'greaterThan', label: 'Greater than' },
      { value: 'lessThan', label: 'Less than' },
      { value: 'between', label: 'Between' }
    ],
    date: [
      { value: 'equals', label: 'On' },
      { value: 'greaterThan', label: 'After' },
      { value: 'lessThan', label: 'Before' },
      { value: 'between', label: 'Between' }
    ],
    boolean: [
      { value: 'equals', label: 'Is' }
    ],
    select: [
      { value: 'equals', label: 'Equals' }
    ]
  };

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      criteria: this.fb.array([])
    });
    
    this.checkMobileView();
  }

  ngOnInit(): void {
    this.initializeFilter();
    this.setupReactiveFiltering();
    this.setupWindowResize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilter(): void {
    // Initialize with data
    this.filteredData$.next([...this.data]);
    
    // Setup search term reactive filtering
    this.filterForm.get('searchTerm')?.valueChanges.pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchSubject$.next(this.sanitizeInput(term || ''));
    });

    // Initialize quick filter counts
    this.updateQuickFilterCounts();
  }

  private setupReactiveFiltering(): void {
    // Combine search and criteria for filtering
    combineLatest([
      this.searchSubject$.pipe(startWith('')),
      this.criteriaSubject$.pipe(startWith([])),
      this.filteredData$.pipe(startWith([]))
    ]).pipe(
      debounceTime(this.debounceTime),
      map(([searchTerm, criteria]) => ({ searchTerm, criteria })),
      takeUntil(this.destroy$)
    ).subscribe(({ searchTerm, criteria }) => {
      this.applyFilters(searchTerm, criteria);
    });
  }

  private setupWindowResize(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkMobileView());
    }
  }

  private checkMobileView(): void {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
    }
  }

  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input.replace(/<[^>]*>/g, '').trim();
  }

  get criteriaArray(): FormArray {
    return this.filterForm.get('criteria') as FormArray;
  }

  addCriteria(criteria?: FilterCriteria): void {
    const field = this.fields[0];
    const newCriteria = this.fb.group({
      field: [criteria?.field || field?.key || ''],
      operator: [criteria?.operator || 'contains'],
      value: [criteria?.value || ''],
      type: [criteria?.type || field?.type || 'text']
    });

    this.criteriaArray.push(newCriteria);
    
    // Subscribe to changes
    newCriteria.valueChanges.pipe(
      debounceTime(this.debounceTime),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateCriteriaFromForm();
    });
  }

  removeCriteria(index: number): void {
    if (this.criteriaArray.length > 0) {
      this.criteriaArray.removeAt(index);
      this.updateCriteriaFromForm();
    }
  }

  private updateCriteriaFromForm(): void {
    const criteria = this.criteriaArray.value.filter((c: FilterCriteria) => 
      c.field && c.operator && (c.value !== null && c.value !== '')
    );
    
    this.addToHistory(criteria);
    this.criteriaSubject$.next(criteria);
    this.criteriaChange.emit(criteria);
  }

  private applyFilters(searchTerm: string, criteria: FilterCriteria[]): void {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      // Check if we should use server-side filtering
      if (this.data.length > this.maxRecordsClientSide) {
        this.serverSideFilter.emit(criteria);
        return;
      }

      let filtered = [...this.data];

      // Apply search term filter
      if (searchTerm) {
        filtered = this.applySearchFilter(filtered, searchTerm);
      }

      // Apply criteria filters
      if (criteria.length > 0) {
        filtered = this.applyCriteriaFilters(filtered, criteria);
      }

      // Apply quick filters
      if (this.activeQuickFilters.length > 0) {
        filtered = this.applyQuickFilters(filtered);
      }

      this.filteredData$.next(filtered);
      this.filterChange.emit(filtered);
      this.updateQuickFilterCounts();
      
    } catch (error) {
      this.errorMessage = 'Error applying filters. Please try again.';
      console.error('Filter error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private applySearchFilter(data: any[], searchTerm: string): any[] {
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
      return this.fields.some(field => {
        const value = item[field.key];
        if (value === null || value === undefined) return false;
        return value.toString().toLowerCase().includes(term);
      });
    });
  }

  private applyCriteriaFilters(data: any[], criteria: FilterCriteria[]): any[] {
    return data.filter(item => {
      return criteria.every(criterion => {
        return this.matchesCriterion(item, criterion);
      });
    });
  }

  private applyQuickFilters(data: any[]): any[] {
    return data.filter(item => {
      return this.activeQuickFilters.every(filterId => {
        const quickFilter = this.quickFilters.find(qf => qf.id === filterId);
        return quickFilter ? this.matchesCriterion(item, quickFilter.criteria) : true;
      });
    });
  }

  private matchesCriterion(item: any, criterion: FilterCriteria): boolean {
    const fieldValue = item[criterion.field];
    const filterValue = criterion.value;

    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    switch (criterion.operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'contains':
        return fieldValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase());
      case 'startsWith':
        return fieldValue.toString().toLowerCase().startsWith(filterValue.toString().toLowerCase());
      case 'endsWith':
        return fieldValue.toString().toLowerCase().endsWith(filterValue.toString().toLowerCase());
      case 'greaterThan':
        return Number(fieldValue) > Number(filterValue);
      case 'lessThan':
        return Number(fieldValue) < Number(filterValue);
      case 'between':
        if (Array.isArray(filterValue) && filterValue.length === 2) {
          const [min, max] = filterValue;
          return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
        }
        return false;
      default:
        return true;
    }
  }

  toggleQuickFilter(filterId: string): void {
    const index = this.activeQuickFilters.indexOf(filterId);
    if (index === -1) {
      this.activeQuickFilters.push(filterId);
    } else {
      this.activeQuickFilters.splice(index, 1);
    }
    
    this.updateCriteriaFromForm();
  }

  isQuickFilterActive(filterId: string): boolean {
    return this.activeQuickFilters.includes(filterId);
  }

  private updateQuickFilterCounts(): void {
    this.quickFilters.forEach(qf => {
      qf.count = this.data.filter(item => 
        this.matchesCriterion(item, qf.criteria)
      ).length;
    });
  }

  toggleAdvanced(): void {
    this.isAdvancedOpen = !this.isAdvancedOpen;
  }

  togglePresetPanel(): void {
    this.isPresetPanelOpen = !this.isPresetPanelOpen;
  }

  applyPreset(preset: FilterPreset): void {
    // Clear existing criteria
    while (this.criteriaArray.length !== 0) {
      this.criteriaArray.removeAt(0);
    }

    // Add preset criteria
    preset.criteria.forEach(criteria => {
      this.addCriteria(criteria);
    });

    this.isPresetPanelOpen = false;
  }

  saveAsPreset(): void {
    const criteria = this.criteriaArray.value;
    if (criteria.length === 0) {
      this.errorMessage = 'No criteria to save as preset';
      return;
    }

    const presetName = prompt('Enter preset name:');
    if (!presetName) return;

    const preset: FilterPreset = {
      id: Date.now().toString(),
      name: this.sanitizeInput(presetName),
      criteria: criteria
    };

    this.presetSave.emit(preset);
  }

  deletePreset(presetId: string): void {
    if (confirm('Are you sure you want to delete this preset?')) {
      this.presetDelete.emit(presetId);
    }
  }

  clearAll(): void {
    // Clear search
    this.filterForm.get('searchTerm')?.setValue('');
    
    // Clear criteria
    while (this.criteriaArray.length !== 0) {
      this.criteriaArray.removeAt(0);
    }
    
    // Clear quick filters
    this.activeQuickFilters = [];
    
    // Reset filtered data
    this.filteredData$.next([...this.data]);
    this.filterChange.emit([...this.data]);
  }

  private addToHistory(criteria: FilterCriteria[]): void {
    // Remove any history after current index
    this.filterHistory = this.filterHistory.slice(0, this.currentHistoryIndex + 1);
    
    // Add new state
    this.filterHistory.push([...criteria]);
    this.currentHistoryIndex++;
    
    // Limit history size
    if (this.filterHistory.length > 50) {
      this.filterHistory.shift();
      this.currentHistoryIndex--;
    }
  }

  canUndo(): boolean {
    return this.currentHistoryIndex > 0;
  }

  canRedo(): boolean {
    return this.currentHistoryIndex < this.filterHistory.length - 1;
  }

  undo(): void {
    if (this.canUndo()) {
      this.currentHistoryIndex--;
      this.restoreFromHistory();
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.currentHistoryIndex++;
      this.restoreFromHistory();
    }
  }

  private restoreFromHistory(): void {
    const criteria = this.filterHistory[this.currentHistoryIndex] || [];
    
    // Clear existing criteria
    while (this.criteriaArray.length !== 0) {
      this.criteriaArray.removeAt(0);
    }

    // Restore criteria
    criteria.forEach(c => this.addCriteria(c));
  }

  getOperatorsForField(fieldKey: string): { value: string; label: string }[] {
    const field = this.fields.find(f => f.key === fieldKey);
    if (!field) return this.operators.text;
    
    return this.operators[field.type as keyof typeof this.operators] || this.operators.text;
  }

  getFieldType(fieldKey: string): string {
    const field = this.fields.find(f => f.key === fieldKey);
    return field?.type || 'text';
  }

  getFieldOptions(fieldKey: string): any[] {
    const field = this.fields.find(f => f.key === fieldKey);
    return field?.options || [];
  }

  onFieldChange(index: number): void {
    const criteriaGroup = this.criteriaArray.at(index);
    const fieldKey = criteriaGroup.get('field')?.value;
    const fieldType = this.getFieldType(fieldKey);
    const operators = this.getOperatorsForField(fieldKey);
    
    // Update type and reset operator/value
    criteriaGroup.patchValue({
      type: fieldType,
      operator: operators[0]?.value || 'contains',
      value: ''
    });
  }

  exportFilters(): void {
    const filterData = {
      criteria: this.criteriaArray.value,
      searchTerm: this.filterForm.get('searchTerm')?.value,
      quickFilters: this.activeQuickFilters,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(filterData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filters-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importFilters(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const filterData = JSON.parse(e.target?.result as string);
        
        // Import search term
        if (filterData.searchTerm) {
          this.filterForm.get('searchTerm')?.setValue(filterData.searchTerm);
        }
        
        // Import criteria
        if (filterData.criteria && Array.isArray(filterData.criteria)) {
          while (this.criteriaArray.length !== 0) {
            this.criteriaArray.removeAt(0);
          }
          filterData.criteria.forEach((c: FilterCriteria) => this.addCriteria(c));
        }
        
        // Import quick filters
        if (filterData.quickFilters && Array.isArray(filterData.quickFilters)) {
          this.activeQuickFilters = filterData.quickFilters;
        }
        
      } catch (error) {
        this.errorMessage = 'Invalid filter file format';
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file);
    input.value = ''; // Reset input
  }
}