import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { of } from 'rxjs';

import { FilterComponent } from './filter.component';
import { FilterState, FilterType } from '../../models/filter.model';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;
  let compiled: HTMLElement;

  const mockFilterState: FilterState = {
    searchTerm: '',
    filters: {
      role: '',
      status: '',
      department: ''
    },
    isAdvanced: false,
    appliedFilters: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilterComponent],
      imports: [ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    
    // Set default inputs
    component.filterState = { ...mockFilterState };
    component.filterOptions = {
      roles: ['admin', 'user', 'moderator'],
      statuses: ['active', 'inactive', 'pending'],
      departments: ['IT', 'HR', 'Finance']
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Search Input', () => {
    it('should render search input', () => {
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      expect(searchInput.placeholder).toBe('Search users...');
    });

    it('should emit search term changes', () => {
      spyOn(component.searchChange, 'emit');
      
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      searchInput.value = 'John Doe';
      searchInput.dispatchEvent(new Event('input'));
      
      expect(component.searchChange.emit).toHaveBeenCalledWith('John Doe');
    });

    it('should debounce search input', (done) => {
      spyOn(component.searchChange, 'emit');
      
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      
      // Rapid typing simulation
      searchInput.value = 'J';
      searchInput.dispatchEvent(new Event('input'));
      
      searchInput.value = 'Jo';
      searchInput.dispatchEvent(new Event('input'));
      
      searchInput.value = 'John';
      searchInput.dispatchEvent(new Event('input'));
      
      // Should only emit once after debounce
      setTimeout(() => {
        expect(component.searchChange.emit).toHaveBeenCalledTimes(1);
        expect(component.searchChange.emit).toHaveBeenCalledWith('John');
        done();
      }, 350);
    });
  });

  describe('Quick Filters', () => {
    it('should render quick filter buttons', () => {
      const quickFilters = compiled.querySelectorAll('.quick-filter-btn');
      expect(quickFilters.length).toBe(3);
      
      const filterTexts = Array.from(quickFilters).map(btn => btn.textContent?.trim());
      expect(filterTexts).toContain('Active Users');
      expect(filterTexts).toContain('Admins');
      expect(filterTexts).toContain('Recent');
    });

    it('should apply quick filter on click', () => {
      spyOn(component.quickFilterChange, 'emit');
      
      const activeUsersBtn = compiled.querySelector('[data-testid="quick-filter-active"]') as HTMLButtonElement;
      activeUsersBtn.click();
      
      expect(component.quickFilterChange.emit).toHaveBeenCalledWith('active');
    });

    it('should highlight active quick filter', () => {
      component.activeQuickFilter = 'active';
      fixture.detectChanges();
      
      const activeBtn = compiled.querySelector('[data-testid="quick-filter-active"]') as HTMLButtonElement;
      expect(activeBtn.classList.contains('active')).toBe(true);
    });
  });

  describe('Advanced Filters Toggle', () => {
    it('should toggle advanced filters visibility', () => {
      const toggleBtn = compiled.querySelector('.advanced-toggle') as HTMLButtonElement;
      
      expect(component.showAdvancedFilters).toBe(false);
      
      toggleBtn.click();
      expect(component.showAdvancedFilters).toBe(true);
      
      toggleBtn.click();
      expect(component.showAdvancedFilters).toBe(false);
    });

    it('should show/hide advanced filter panel', () => {
      component.showAdvancedFilters = false;
      fixture.detectChanges();
      
      let advancedPanel = compiled.querySelector('.advanced-filters');
      expect(advancedPanel).toBeFalsy();
      
      component.showAdvancedFilters = true;
      fixture.detectChanges();
      
      advancedPanel = compiled.querySelector('.advanced-filters');
      expect(advancedPanel).toBeTruthy();
    });
  });

  describe('Advanced Filter Controls', () => {
    beforeEach(() => {
      component.showAdvancedFilters = true;
      fixture.detectChanges();
    });

    it('should render filter dropdowns', () => {
      const roleSelect = compiled.querySelector('[data-testid="role-filter"]') as HTMLSelectElement;
      const statusSelect = compiled.querySelector('[data-testid="status-filter"]') as HTMLSelectElement;
      const departmentSelect = compiled.querySelector('[data-testid="department-filter"]') as HTMLSelectElement;
      
      expect(roleSelect).toBeTruthy();
      expect(statusSelect).toBeTruthy();
      expect(departmentSelect).toBeTruthy();
    });

    it('should populate dropdown options', () => {
      const roleSelect = compiled.querySelector('[data-testid="role-filter"]') as HTMLSelectElement;
      const options = roleSelect.querySelectorAll('option');
      
      expect(options.length).toBe(4); // 3 roles + "All" option
      expect(options[0].textContent).toBe('All Roles');
      expect(options[1].textContent).toBe('admin');
    });

    it('should emit filter changes', () => {
      spyOn(component.filterChange, 'emit');
      
      const roleSelect = compiled.querySelector('[data-testid="role-filter"]') as HTMLSelectElement;
      roleSelect.value = 'admin';
      roleSelect.dispatchEvent(new Event('change'));
      
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        type: FilterType.ROLE,
        value: 'admin'
      });
    });
  });

  describe('Applied Filters', () => {
    beforeEach(() => {
      component.filterState = {
        ...mockFilterState,
        appliedFilters: [
          { type: FilterType.ROLE, value: 'admin', label: 'Role: Admin' },
          { type: FilterType.STATUS, value: 'active', label: 'Status: Active' }
        ]
      };
      fixture.detectChanges();
    });

    it('should display applied filter tags', () => {
      const filterTags = compiled.querySelectorAll('.filter-tag');
      expect(filterTags.length).toBe(2);
      
      expect(filterTags[0].textContent).toContain('Role: Admin');
      expect(filterTags[1].textContent).toContain('Status: Active');
    });

    it('should remove filter on tag close', () => {
      spyOn(component.filterRemove, 'emit');
      
      const removeBtn = compiled.querySelector('.filter-tag .remove-btn') as HTMLButtonElement;
      removeBtn.click();
      
      expect(component.filterRemove.emit).toHaveBeenCalledWith({
        type: FilterType.ROLE,
        value: 'admin',
        label: 'Role: Admin'
      });
    });

    it('should show clear all button when filters applied', () => {
      const clearAllBtn = compiled.querySelector('.clear-all-btn') as HTMLButtonElement;
      expect(clearAllBtn).toBeTruthy();
      expect(clearAllBtn.textContent?.trim()).toBe('Clear All');
    });

    it('should emit clear all filters', () => {
      spyOn(component.clearAllFilters, 'emit');
      
      const clearAllBtn = compiled.querySelector('.clear-all-btn') as HTMLButtonElement;
      clearAllBtn.click();
      
      expect(component.clearAllFilters.emit).toHaveBeenCalled();
    });
  });

  describe('Filter Reset', () => {
    it('should reset search and filters', () => {
      spyOn(component.filterReset, 'emit');
      component.showAdvancedFilters = true;
      
      component.resetFilters();
      
      expect(component.showAdvancedFilters).toBe(false);
      expect(component.activeQuickFilter).toBe('');
      expect(component.filterReset.emit).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      expect(searchInput.getAttribute('aria-label')).toBe('Search users');
      
      const toggleBtn = compiled.querySelector('.advanced-toggle') as HTMLButtonElement;
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should update ARIA expanded state', () => {
      const toggleBtn = compiled.querySelector('.advanced-toggle') as HTMLButtonElement;
      
      component.showAdvancedFilters = true;
      fixture.detectChanges();
      
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should support keyboard navigation', () => {
      const toggleBtn = compiled.querySelector('.advanced-toggle') as HTMLButtonElement;
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      toggleBtn.dispatchEvent(enterEvent);
      
      expect(component.showAdvancedFilters).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize search input', () => {
      spyOn(component.searchChange, 'emit');
      
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      searchInput.value = '<script>alert("xss")</script>test';
      searchInput.dispatchEvent(new Event('input'));
      
      setTimeout(() => {
        expect(component.searchChange.emit).toHaveBeenCalledWith('test');
      }, 350);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing filter options gracefully', () => {
      component.filterOptions = undefined as any;
      fixture.detectChanges();
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle null filter state', () => {
      component.filterState = null as any;
      fixture.detectChanges();
      
      expect(component).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should not emit duplicate search terms', () => {
      spyOn(component.searchChange, 'emit');
      
      const searchInput = compiled.querySelector('.search-input') as HTMLInputElement;
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      
      setTimeout(() => {
        expect(component.searchChange.emit).toHaveBeenCalledTimes(1);
      }, 350);
    });
  });
});