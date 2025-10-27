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
  department?: string;
  status: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}