/**
 * User Model
 * 
 * Definiert die Struktur eines Users im System
 * Regel: One interface per file
 */
export interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response Wrapper
 * 
 * Standard-Response-Format für alle API-Calls
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}
