import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { FilterComponent } from './filter.component';
import { FilterCriteria, FilterType } from '../../models/filter.model';

@Component({
  template: `
    <app-filter
      [criteria]="criteria"
      [availableFields]="availableFields"
      [isLoading]="isLoading"
      (filtersChanged)="onFiltersChanged($event)"
      (filtersCleared)="onFiltersCleared()"
      (presetSaved)="onPresetSaved($event)"
      (presetLoaded)="onPresetLoaded($event)">
    </app-filter>
  `
})
class TestHostComponent {
  criteria: FilterCriteria[] = [];
  availableFields = [
    { key: 'name', label: 'Name', type: FilterType.TEXT },
    { key: 'email', label: 'Email', type: FilterType.TEXT },
    { key: 'role', label: 'Role', type: FilterType.SELECT, options: ['admin', 'user', 'guest'] },
    { key: 'createdAt', label: 'Created Date', type: FilterType.DATE },
    { key: 'isActive', label: 'Active', type: FilterType.BOOLEAN }
  ];
  isLoading = false;

  onFiltersChanged(criteria: FilterCriteria[]): void {
    this.criteria = criteria;
  }

  onFiltersCleared(): void {
    this.criteria = [];
  }

  onPresetSaved(name: string): void {}

  onPresetLoaded(criteria: FilterCriteria[]): void {
    this.criteria = criteria;
  }
}

describe('FilterComponent', () => {
  let component: FilterComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        FilterComponent,
        TestHostComponent
      ],
      imports: [
        FormsModule,
        ReactiveFormsModule
      ]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    debugElement = hostFixture.debugElement.query(By.directive(FilterComponent));
    component = debugElement.componentInstance;
    fixture = debugElement.componentInstance;
  });

  beforeEach(() => {
    hostFixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty criteria', () => {
      expect(component.criteria).toEqual([]);
    });

    it('should receive available fields from parent', () => {
      expect(component.availableFields).toEqual(hostComponent.availableFields);
    });

    it('should initialize reactive form', () => {
      expect(component.filterForm).toBeDefined();
      expect(component.filterForm.get('field')).toBeDefined();
      expect(component.filterForm.get('operator')).toBeDefined();
      expect(component.filterForm.get('value')).toBeDefined();
    });
  });

  describe('Adding Filters', () => {
    beforeEach(() => {
      component.filterForm.patchValue({
        field: 'name',
        operator: 'contains',
        value: 'John'
      });
    });

    it('should add new filter criteria', () => {
      const initialCount = component.criteria.length;
      component.addFilter();
      
      expect(component.criteria.length).toBe(initialCount + 1);
      expect(component.criteria[component.criteria.length - 1]).toEqual({
        id: jasmine.any(String),
        field: 'name',
        operator: 'contains',
        value: 'John',
        type: FilterType.TEXT
      });
    });

    it('should emit filtersChanged event when adding filter', () => {
      spyOn(component.filtersChanged, 'emit');
      component.addFilter();
      
      expect(component.filtersChanged.emit).toHaveBeenCalledWith(component.criteria);
    });

    it('should reset form after adding filter', () => {
      component.addFilter();
      
      expect(component.filterForm.get('field')?.value).toBe('');
      expect(component.filterForm.get('operator')?.value).toBe('');
      expect(component.filterForm.get('value')?.value).toBe('');
    });

    it('should not add filter with empty field', () => {
      component.filterForm.patchValue({ field: '' });
      const initialCount = component.criteria.length;
      
      component.addFilter();
      
      expect(component.criteria.length).toBe(initialCount);
    });

    it('should not add filter with empty value', () => {
      component.filterForm.patchValue({ value: '' });
      const initialCount = component.criteria.length;
      
      component.addFilter();
      
      expect(component.criteria.length).toBe(initialCount);
    });
  });

  describe('Removing Filters', () => {
    beforeEach(() => {
      component.criteria = [
        { id: '1', field: 'name', operator: 'contains', value: 'John', type: FilterType.TEXT },
        { id: '2', field: 'email', operator: 'contains', value: '@test', type: FilterType.TEXT }
      ];
    });

    it('should remove filter by id', () => {
      component.removeFilter('1');
      
      expect(component.criteria.length).toBe(1);
      expect(component.criteria.find(c => c.id === '1')).toBeUndefined();
    });

    it('should emit filtersChanged event when removing filter', () => {
      spyOn(component.filtersChanged, 'emit');
      component.removeFilter('1');
      
      expect(component.filtersChanged.emit).toHaveBeenCalledWith(component.criteria);
    });

    it('should handle removing non-existent filter gracefully', () => {
      const initialCount = component.criteria.length;
      component.removeFilter('non-existent');
      
      expect(component.criteria.length).toBe(initialCount);
    });
  });

  describe('Clearing Filters', () => {
    beforeEach(() => {
      component.criteria = [
        { id: '1', field: 'name', operator: 'contains', value: 'John', type: FilterType.TEXT }
      ];
    });

    it('should clear all filters', () => {
      component.clearFilters();
      
      expect(component.criteria.length).toBe(0);
    });

    it('should emit filtersCleared event', () => {
      spyOn(component.filtersCleared, 'emit');
      component.clearFilters();
      
      expect(component.filtersCleared.emit).toHaveBeenCalled();
    });

    it('should reset form when clearing filters', () => {
      component.filterForm.patchValue({ field: 'name', operator: 'contains', value: 'test' });
      component.clearFilters();
      
      expect(component.filterForm.get('field')?.value).toBe('');
      expect(component.filterForm.get('operator')?.value).toBe('');
      expect(component.filterForm.get('value')?.value).toBe('');
    });
  });

  describe('Field Selection', () => {
    it('should update available operators when field changes', () => {
      component.onFieldChange('name');
      
      expect(component.availableOperators.length).toBeGreaterThan(0);
      expect(component.availableOperators).toContain('contains');
      expect(component.availableOperators).toContain('equals');
    });

    it('should reset operator and value when field changes', () => {
      component.filterForm.patchValue({ operator: 'contains', value: 'test' });
      component.onFieldChange('email');
      
      expect(component.filterForm.get('operator')?.value).toBe('');
      expect(component.filterForm.get('value')?.value).toBe('');
    });

    it('should set selected field type', () => {
      component.onFieldChange('role');
      
      expect(component.selectedFieldType).toBe(FilterType.SELECT);
    });

    it('should update available options for select fields', () => {
      component.onFieldChange('role');
      
      expect(component.availableOptions).toEqual(['admin', 'user', 'guest']);
    });
  });

  describe('Quick Filters', () => {
    it('should apply quick filter for active users', () => {
      spyOn(component.filtersChanged, 'emit');
      component.applyQuickFilter('active');
      
      expect(component.criteria.length).toBe(1);
      expect(component.criteria[0].field).toBe('isActive');
      expect(component.criteria[0].value).toBe(true);
      expect(component.filtersChanged.emit).toHaveBeenCalled();
    });

    it('should apply quick filter for admins', () => {
      spyOn(component.filtersChanged, 'emit');
      component.applyQuickFilter('admins');
      
      expect(component.criteria.length).toBe(1);
      expect(component.criteria[0].field).toBe('role');
      expect(component.criteria[0].value).toBe('admin');
      expect(component.filtersChanged.emit).toHaveBeenCalled();
    });

    it('should apply quick filter for recent users', () => {
      spyOn(component.filtersChanged, 'emit');
      component.applyQuickFilter('recent');
      
      expect(component.criteria.length).toBe(1);
      expect(component.criteria[0].field).toBe('createdAt');
      expect(component.criteria[0].operator).toBe('gte');
      expect(component.filtersChanged.emit).toHaveBeenCalled();
    });
  });

  describe('Filter Presets', () => {
    it('should save current filters as preset', () => {
      component.criteria = [
        { id: '1', field: 'name', operator: 'contains', value: 'John', type: FilterType.TEXT }
      ];
      spyOn(component.presetSaved, 'emit');
      
      component.savePreset('My Preset');
      
      expect(component.presetSaved.emit).toHaveBeenCalledWith('My Preset');
    });

    it('should load preset filters', () => {
      const presetCriteria: FilterCriteria[] = [
        { id: '1', field: 'role', operator: 'equals', value: 'admin', type: FilterType.SELECT }
      ];
      spyOn(component.presetLoaded, 'emit');
      
      component.loadPreset(presetCriteria);
      
      expect(component.criteria).toEqual(presetCriteria);
      expect(component.presetLoaded.emit).toHaveBeenCalledWith(presetCriteria);
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      component.filterForm.patchValue({ field: '', operator: 'contains', value: 'test' });
      
      expect(component.isFormValid()).toBeFalsy();
    });

    it('should validate form completeness', () => {
      component.filterForm.patchValue({ field: 'name', operator: 'contains', value: 'test' });
      
      expect(component.isFormValid()).toBeTruthy();
    });

    it('should sanitize input values', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = component.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('UI Interaction', () => {
    it('should toggle advanced mode', () => {
      const initialMode = component.isAdvancedMode;
      component.toggleAdvancedMode();
      
      expect(component.isAdvancedMode).toBe(!initialMode);
    });

    it('should handle loading state', () => {
      hostComponent.isLoading = true;
      hostFixture.detectChanges();
      
      expect(component.isLoading).toBeTruthy();
    });

    it('should disable form when loading', () => {
      component.isLoading = true;
      hostFixture.detectChanges();
      
      expect(component.filterForm.disabled).toBeTruthy();
    });
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const fieldSelect = debugElement.query(By.css('select[data-testid="field-select"]'));
      expect(fieldSelect.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      const addButton = debugElement.query(By.css('button[data-testid="add-filter"]'));
      expect(addButton.nativeElement.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
