export interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  role?: Role | string;
  roles?: (Role | string)[];
  department?: Department;
  company?: Company;
  isActive?: boolean;
  deactivatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
}

export interface Company {
  id: number;
  name: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: number;
  name: string;
  company?: Company;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  userId: number;
  username: string;
  companyId: number | null;
  ipAddress: string;
  api: string;
  method: string;
  reason: string;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  roles: string[];
  departmentId?: number;
  companyId?: number;
}

export interface NotificationPayload {
  type: string;
  message: string;
  data?: unknown;
  performedBy?: { id: number; email: string };
  timestamp: string;
}

export interface ApiResponse<T> {
  message: string;
  status_code: number;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}

export type RoleSlug = 'super_admin' | 'company_admin' | 'manager' | 'user';
