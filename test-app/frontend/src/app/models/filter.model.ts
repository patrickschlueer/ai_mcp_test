/**
 * Filter model definitions for user filtering functionality
 * Supports hybrid state management and progressive filtering
 */

/**
 * Supported filter operators for different data types
 */
export enum FilterOperator {
  // String operators
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  NOT_EQUALS = 'notEquals',
  NOT_CONTAINS = 'notContains',
  
  // Numeric operators
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  
  // Array operators
  IN = 'in',
  NOT_IN = 'notIn',
  
  // Boolean operators
  IS_TRUE = 'isTrue',
  IS_FALSE = 'isFalse',
  
  // Date operators
  AFTER = 'after',
  BEFORE = 'before',
  BETWEEN = 'between',
  
  // Null/Empty operators
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull'
}

/**
 * Data types for filter values
 */
export enum FilterDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object'
}

/**
 * Logical operators for combining multiple filter criteria
 */
export enum FilterLogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

/**
 * Single filter criterion definition
 */
export interface FilterCriterion {
  /** Unique identifier for the filter criterion */
  id: string;
  
  /** Field name to filter on (supports dot notation for nested fields) */
  field: string;
  
  /** Filter operator to apply */
  operator: FilterOperator;
  
  /** Value(s) to filter by */
  value: any;
  
  /** Data type of the field being filtered */
  dataType: FilterDataType;
  
  /** Whether this criterion is currently active */
  active: boolean;
  
  /** Display label for UI */
  label?: string;
  
  /** Optional metadata for complex filters */
  metadata?: Record<string, any>;
}

/**
 * Filter group for combining multiple criteria
 */
export interface FilterGroup {
  /** Unique identifier for the filter group */
  id: string;
  
  /** Logical operator for combining criteria in this group */
  operator: FilterLogicalOperator;
  
  /** Filter criteria in this group */
  criteria: FilterCriterion[];
  
  /** Nested filter groups for complex logic */
  groups?: FilterGroup[];
  
  /** Whether this group is currently active */
  active: boolean;
  
  /** Display label for UI */
  label?: string;
}

/**
 * Complete filter criteria configuration
 */
export interface FilterCriteria {
  /** Unique identifier for the filter configuration */
  id: string;
  
  /** Name/title of the filter */
  name: string;
  
  /** Root filter group */
  rootGroup: FilterGroup;
  
  /** Whether the filter is currently applied */
  active: boolean;
  
  /** Timestamp when filter was created */
  createdAt: Date;
  
  /** Timestamp when filter was last modified */
  lastModified: Date;
  
  /** User ID who created the filter */
  createdBy?: string;
  
  /** Whether this is a system-defined or user-defined filter */
  isSystemFilter: boolean;
  
  /** Whether this filter can be saved as a preset */
  isSaveable: boolean;
  
  /** Tags for categorizing filters */
  tags?: string[];
  
  /** Description of what this filter does */
  description?: string;
}

/**
 * Predefined filter presets for quick filtering
 */
export interface FilterPreset {
  /** Unique identifier for the preset */
  id: string;
  
  /** Display name of the preset */
  name: string;
  
  /** Description of what this preset filters */
  description: string;
  
  /** Filter criteria for this preset */
  criteria: FilterCriteria;
  
  /** Category for organizing presets */
  category: string;
  
  /** Icon class for UI display */
  iconClass?: string;
  
  /** Sort order for display */
  sortOrder: number;
  
  /** Whether this preset is visible to users */
  isVisible: boolean;
  
  /** Whether users can modify this preset */
  isEditable: boolean;
}

/**
 * Filter options and metadata for a specific field
 */
export interface FilterFieldOptions {
  /** Field name */
  field: string;
  
  /** Display label for the field */
  label: string;
  
  /** Data type of the field */
  dataType: FilterDataType;
  
  /** Allowed operators for this field */
  allowedOperators: FilterOperator[];
  
  /** Whether this field supports multiple values */
  supportsMultipleValues: boolean;
  
  /** Predefined values for selection (for dropdowns) */
  predefinedValues?: Array<{ value: any; label: string }>;
  
  /** Whether this field is searchable */
  isSearchable: boolean;
  
  /** Whether this field can be used in quick filters */
  isQuickFilterable: boolean;
  
  /** Validation rules for filter values */
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  
  /** Field category for grouping in UI */
  category?: string;
  
  /** Help text for users */
  helpText?: string;
}

/**
 * Filter application result with metadata
 */
export interface FilterResult<T = any> {
  /** Filtered data items */
  items: T[];
  
  /** Total count of items matching filter */
  totalCount: number;
  
  /** Number of items before filtering */
  originalCount: number;
  
  /** Applied filter criteria */
  appliedCriteria: FilterCriteria;
  
  /** Performance metrics */
  metrics: {
    /** Time taken to apply filter (in milliseconds) */
    executionTime: number;
    
    /** Whether server-side filtering was used */
    isServerFiltered: boolean;
    
    /** Memory usage estimate */
    memoryUsage?: number;
  };
  
  /** Any warnings or notices about the filter application */
  warnings?: string[];
}

/**
 * Filter state for component state management
 */
export interface FilterState {
  /** Current filter criteria */
  currentFilter: FilterCriteria | null;
  
  /** Available filter presets */
  presets: FilterPreset[];
  
  /** Available fields for filtering */
  availableFields: FilterFieldOptions[];
  
  /** Recently used filters */
  recentFilters: FilterCriteria[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Whether advanced filter panel is open */
  isAdvancedPanelOpen: boolean;
  
  /** Search term for filter fields */
  fieldSearchTerm: string;
  
  /** Current filter validation errors */
  validationErrors: Record<string, string[]>;
}