export interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  profilePicture?: string | null;
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

// New notification format (from database)
export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  actorId: number | null;
  actorEmail: string | null;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
}

export interface UnreadNotificationsPayload {
  notifications: NotificationPayload[];
  count: number;
}

export interface PaginatedNotifications {
  notifications: NotificationPayload[];
  total: number;
  page: number;
  limit: number;
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

// Session details for each active session
export interface SessionDetails {
  id: number;
  browser: string;
  os: string;
  ipAddress: string | null;
  loginAt: string;
  lastActivityAt: string;
}

// Online user with their sessions (NEW - only online users shown)
export interface OnlineUserWithSessions {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  sessions: SessionDetails[];
}

// Legacy: Online user status (kept for backward compatibility)
export interface OnlineUserInfo {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  isOnline: boolean;
}

// Real-time user status change event payload
export interface UserStatusPayload {
  userId: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  isOnline: boolean;
  companyId: number;
}

// Real-time session added event payload
export interface SessionAddedPayload {
  sessionId: number;
  userId: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  browser: string;
  os: string;
  ipAddress: string | null;
  loginAt: string;
  lastActivityAt: string;
  companyId: number;
}

// Real-time session removed event payload
export interface SessionRemovedPayload {
  sessionId: number;
  userId: number;
  companyId: number;
}

// Real-time session expired event payload
export interface SessionExpiredPayload {
  sessionId: number;
  reason: 'expired' | 'revoked' | 'logout';
  message: string;
}

// Response for company admin - only online users with sessions
export interface OnlineUsersWithSessionsResponse {
  users: OnlineUserWithSessions[];
  onlineUsers: number;
  totalSessions: number;
}

// Legacy response type (kept for backward compatibility)
export interface CompanyUsersStatusResponse {
  users: OnlineUserInfo[];
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

export interface RevokeSessionResponse {
  userId: number;
  sessionsInvalidated: boolean;
  socketsDisconnected: number;
}

export interface RevokeSpecificSessionResponse {
  sessionId: number;
  userId: number;
  socketsDisconnected: number;
}

// Company status for super_admin view
export interface CompanyStatus {
  id: number;
  name: string;
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

export interface AllCompaniesStatusResponse {
  companies: CompanyStatus[];
  totalCompanies: number;
  totalUsers: number;
  totalOnline: number;
  totalOffline: number;
}

// Response for super_admin drill-down - only online users with sessions
export interface CompanyUsersWithSessionsResponse {
  company: { id: number; name: string };
  users: OnlineUserWithSessions[];
  onlineUsers: number;
  totalSessions: number;
}

// Legacy response type (kept for backward compatibility)
export interface CompanyUsersDetailResponse {
  company: { id: number; name: string };
  users: OnlineUserInfo[];
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

// ─── Mutation Input Types ─────────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  departmentId?: number;
  companyId?: number;
  roleSlug?: string;
}

export interface UpdateUserInput {
  firstname?: string;
  lastname?: string;
  password?: string;
  departmentId?: number;
  roleSlug?: string;
}

export interface UpdateProfileInput {
  firstname?: string;
  lastname?: string;
  password?: string;
  currentPassword?: string;
}

export interface CreateDepartmentInput {
  name: string;
  companyId: number;
}

export interface UpdateInput<T> {
  id: number;
  data: Partial<T>;
}

export interface RevokeCompanySessionInput {
  companyId: number;
  sessionId: number;
}

// ─── Query Parameter Types ────────────────────────────────────────────────────

export interface ActivityLogsParams {
  page?: number;
  limit?: number;
  method?: string;
  search?: string;
}
