import type { RoleSlug } from '@/types';

// Defines which roles can access each dashboard route
export const ROUTE_PERMISSIONS: Record<string, RoleSlug[]> = {
  '/dashboard': ['super_admin', 'company_admin', 'manager', 'user'],
  '/dashboard/companies': ['super_admin'],
  '/dashboard/departments': ['super_admin', 'company_admin'],
  '/dashboard/users': ['super_admin', 'company_admin', 'manager'],
  '/dashboard/roles': ['super_admin'],
  '/dashboard/activity-logs': ['super_admin', 'company_admin'],
  '/dashboard/active-sessions': ['super_admin', 'company_admin'],
  '/dashboard/support': ['super_admin', 'company_admin', 'manager', 'user'],
  '/dashboard/compliance': ['super_admin', 'company_admin', 'manager', 'user'],
};

// Check if a given pathname is allowed for the user's roles
export function isRouteAllowed(
  pathname: string,
  hasRole: (role: RoleSlug | RoleSlug[]) => boolean,
): boolean {
  const allowedRoles = ROUTE_PERMISSIONS[pathname];

  // No restriction defined — accessible to all authenticated users
  if (!allowedRoles) return true;

  return hasRole(allowedRoles);
}
