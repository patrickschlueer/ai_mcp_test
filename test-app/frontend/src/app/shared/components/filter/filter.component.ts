import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface FilterCriterion {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | Date | [string | number | Date, string | number | Date];
  logicalOperator?: 'AND' | 'OR';
}

export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriterion[];
  isDefault?: boolean;
}

export interface FilterConfig {
  fields: FilterField[];
  presets?: FilterPreset[];
  enableQuickFilters?: boolean;
  maxCriteria?: number;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { value: any; label: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FilterState {
  criteria: FilterCriterion[];
  activePreset?: string;
  isExpanded: boolean;
  quickFilters: { [key: string]: boolean };
}

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css'
})
export class FilterComponent implements OnInit, OnDestroy {
  @Input() config!: FilterConfig;
  @Input() initialState?: Partial<FilterState>;
  @Input() disabled = false;
  @Input() showPresets = true;
  @Input() showQuickFilters = true;
  @Input() compact = false;

  @Output() filterChange = new EventEmitter<FilterCriterion[]>();
  @Output() presetSelected = new EventEmitter<FilterPreset>();
  @Output() filterReset = new EventEmitter<void>();
  @Output() stateChange = new EventEmitter<FilterState>();

  filterForm!: FormGroup;
  state: FilterState = {
    criteria: [],
    isExpanded: false,
    quickFilters: {}
  };

  operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'between', label: 'Between' }
  ];

  logicalOperators = [
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' }
  ];

  private destroy$ = new Subject<void>();
  private filterChangeSubject = new Subject<FilterCriterion[]>();

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {
    this.initializeForm();
    this.setupFilterChangeStream();
  }

  ngOnInit(): void {
    this.initializeState();
    this.setupFormSubscriptions();
    this.initializeQuickFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      criteria: this.fb.array([])
    });
  }

  private initializeState(): void {
    if (this.initialState) {
      this.state = { ...this.state, ...this.initialState };
    }

    // Initialize criteria from state
    if (this.state.criteria.length > 0) {
      this.state.criteria.forEach(criterion => {
        this.addCriterion(criterion);
      });
    } else {
      this.addCriterion();
    }
  }

  private setupFormSubscriptions(): void {
    this.criteriaArray.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(criteria => {
        this.onCriteriaChange(criteria);
      });
  }

  private setupFilterChangeStream(): void {
    this.filterChangeSubject
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(criteria => {
        this.filterChange.emit(criteria);
      });
  }

  private initializeQuickFilters(): void {
    if (this.config.presets) {
      this.config.presets.forEach(preset => {
        if (preset.isDefault) {
          this.state.quickFilters[preset.id] = false;
        }
      });
    }
  }

  get criteriaArray(): FormArray {
    return this.filterForm.get('criteria') as FormArray;
  }

  addCriterion(criterion?: FilterCriterion): void {
    const maxCriteria = this.config.maxCriteria || 10;
    if (this.criteriaArray.length >= maxCriteria) {
      return;
    }

    const criterionGroup = this.createCriterionGroup(criterion);
    this.criteriaArray.push(criterionGroup);
  }

  private createCriterionGroup(criterion?: FilterCriterion): FormGroup {
    const defaultField = this.config.fields[0]?.key || '';
    
    return this.fb.group({
      field: [criterion?.field || defaultField],
      operator: [criterion?.operator || 'equals'],
      value: [criterion?.value || ''],
      logicalOperator: [criterion?.logicalOperator || 'AND']
    });
  }

  removeCriterion(index: number): void {
    if (this.criteriaArray.length > 1) {
      this.criteriaArray.removeAt(index);
    }
  }

  private onCriteriaChange(criteria: FilterCriterion[]): void {
    // Sanitize input values to prevent XSS
    const sanitizedCriteria = criteria.map(criterion => ({
      ...criterion,
      value: this.sanitizeValue(criterion.value)
    }));

    this.state.criteria = sanitizedCriteria;
    this.emitStateChange();
    this.filterChangeSubject.next(sanitizedCriteria);
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Basic XSS protection
      return value.replace(/<script[^>]*>.*?<\/script>/gi, '')
                 .replace(/<[^>]*>/g, '')
                 .trim();
    }
    return value;
  }

  toggleExpanded(): void {
    this.state.isExpanded = !this.state.isExpanded;
    this.emitStateChange();
  }

  selectPreset(preset: FilterPreset): void {
    this.state.activePreset = preset.id;
    
    // Clear existing criteria
    while (this.criteriaArray.length > 0) {
      this.criteriaArray.removeAt(0);
    }

    // Add preset criteria
    preset.criteria.forEach(criterion => {
      this.addCriterion(criterion);
    });

    this.presetSelected.emit(preset);
    this.emitStateChange();
  }

  toggleQuickFilter(filterId: string): void {
    this.state.quickFilters[filterId] = !this.state.quickFilters[filterId];
    
    const preset = this.config.presets?.find(p => p.id === filterId);
    if (preset && this.state.quickFilters[filterId]) {
      this.selectPreset(preset);
    }

    this.emitStateChange();
  }

  resetFilters(): void {
    // Clear form
    while (this.criteriaArray.length > 0) {
      this.criteriaArray.removeAt(0);
    }
    
    // Add one empty criterion
    this.addCriterion();
    
    // Reset state
    this.state = {
      criteria: [],
      isExpanded: false,
      quickFilters: {}
    };

    this.filterReset.emit();
    this.emitStateChange();
  }

  getFieldOptions(fieldKey: string): { value: any; label: string }[] {
    const field = this.config.fields.find(f => f.key === fieldKey);
    return field?.options || [];
  }

  getFieldType(fieldKey: string): string {
    const field = this.config.fields.find(f => f.key === fieldKey);
    return field?.type || 'text';
  }

  getAvailableOperators(fieldKey: string): { value: string; label: string }[] {
    const fieldType = this.getFieldType(fieldKey);
    
    switch (fieldType) {
      case 'number':
      case 'date':
        return this.operators;
      case 'boolean':
        return this.operators.filter(op => op.value === 'equals');
      case 'select':
        return this.operators.filter(op => ['equals', 'contains'].includes(op.value));
      default:
        return this.operators.filter(op => op.value !== 'between');
    }
  }

  private emitStateChange(): void {
    this.stateChange.emit({ ...this.state });
  }

  // Accessibility helpers
  getAriaLabel(index: number): string {
    return `Filter criterion ${index + 1}`;
  }

  getRemoveButtonAriaLabel(index: number): string {
    return `Remove filter criterion ${index + 1}`;
  }

  // Validation helpers
  isCriterionValid(index: number): boolean {
    const criterion = this.criteriaArray.at(index);
    if (!criterion) return false;

    const field = criterion.get('field')?.value;
    const operator = criterion.get('operator')?.value;
    const value = criterion.get('value')?.value;

    return !!(field && operator && (value !== '' && value !== null && value !== undefined));
  }

  hasValidCriteria(): boolean {
    const criteriaCount = this.criteriaArray.length;
    if (criteriaCount === 0) return false;

    let validCount = 0;
    for (let i = 0; i < criteriaCount; i++) {
      if (this.isCriterionValid(i)) {
        validCount++;
      }
    }

    return validCount > 0;
  }

  getActiveFiltersCount(): number {
    return this.state.criteria.filter(c => 
      c.value !== '' && c.value !== null && c.value !== undefined
    ).length;
  }

  // Memory management
  trackByCriterion(index: number, item: any): number {
    return index;
  }

  trackByPreset(index: number, preset: FilterPreset): string {
    return preset.id;
  }
}