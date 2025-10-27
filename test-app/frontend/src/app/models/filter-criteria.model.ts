export interface FilterCriteria {
  searchText?: string;
  role?: string;
  isActive?: boolean;
  department?: string;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
  sortBy?: 'name' | 'email' | 'role' | 'lastLogin' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}