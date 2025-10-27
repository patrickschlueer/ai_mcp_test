/**
 * Filter operator enumeration for user filtering functionality
 * Defines available comparison operations for filter criteria
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  BETWEEN = 'between',
  REGEX = 'regex'
}

/**
 * Human-readable labels for filter operators
 */
export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  [FilterOperator.EQUALS]: 'Equals',
  [FilterOperator.NOT_EQUALS]: 'Not Equals',
  [FilterOperator.CONTAINS]: 'Contains',
  [FilterOperator.NOT_CONTAINS]: 'Does Not Contain',
  [FilterOperator.STARTS_WITH]: 'Starts With',
  [FilterOperator.ENDS_WITH]: 'Ends With',
  [FilterOperator.GREATER_THAN]: 'Greater Than',
  [FilterOperator.LESS_THAN]: 'Less Than',
  [FilterOperator.GREATER_THAN_OR_EQUAL]: 'Greater Than or Equal',
  [FilterOperator.LESS_THAN_OR_EQUAL]: 'Less Than or Equal',
  [FilterOperator.IN]: 'In List',
  [FilterOperator.NOT_IN]: 'Not In List',
  [FilterOperator.IS_NULL]: 'Is Empty',
  [FilterOperator.IS_NOT_NULL]: 'Is Not Empty',
  [FilterOperator.BETWEEN]: 'Between',
  [FilterOperator.REGEX]: 'Matches Pattern'
};

/**
 * Operators that work with string values
 */
export const STRING_OPERATORS = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.CONTAINS,
  FilterOperator.NOT_CONTAINS,
  FilterOperator.STARTS_WITH,
  FilterOperator.ENDS_WITH,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
  FilterOperator.IS_NULL,
  FilterOperator.IS_NOT_NULL,
  FilterOperator.REGEX
];

/**
 * Operators that work with numeric values
 */
export const NUMERIC_OPERATORS = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.GREATER_THAN,
  FilterOperator.LESS_THAN,
  FilterOperator.GREATER_THAN_OR_EQUAL,
  FilterOperator.LESS_THAN_OR_EQUAL,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
  FilterOperator.IS_NULL,
  FilterOperator.IS_NOT_NULL,
  FilterOperator.BETWEEN
];

/**
 * Operators that work with date values
 */
export const DATE_OPERATORS = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.GREATER_THAN,
  FilterOperator.LESS_THAN,
  FilterOperator.GREATER_THAN_OR_EQUAL,
  FilterOperator.LESS_THAN_OR_EQUAL,
  FilterOperator.IS_NULL,
  FilterOperator.IS_NOT_NULL,
  FilterOperator.BETWEEN
];

/**
 * Operators that work with boolean values
 */
export const BOOLEAN_OPERATORS = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.IS_NULL,
  FilterOperator.IS_NOT_NULL
];

/**
 * Operators that don't require a value input
 */
export const NO_VALUE_OPERATORS = [
  FilterOperator.IS_NULL,
  FilterOperator.IS_NOT_NULL
];

/**
 * Operators that require multiple values
 */
export const MULTI_VALUE_OPERATORS = [
  FilterOperator.IN,
  FilterOperator.NOT_IN,
  FilterOperator.BETWEEN
];