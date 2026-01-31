/**
 * @fileoverview TanStack Query Client Configuration
 *
 * Central configuration for TanStack Query including:
 * - QueryClient instance with default options
 * - Centralized query keys factory for consistent cache management
 *
 * @example
 * // Import query client for provider
 * import { queryClient } from '@/lib/query-client';
 * <QueryClientProvider client={queryClient}>
 *
 * @example
 * // Import query keys for hooks
 * import { queryKeys } from '@/lib/query-client';
 * useQuery({ queryKey: queryKeys.users.all() })
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack Query client instance.
 *
 * Default configuration:
 * - staleTime: 30s - Data is considered fresh for 30 seconds
 * - gcTime: 5min - Unused cache data is garbage collected after 5 minutes
 * - retry: 1 - Failed requests are retried once
 * - refetchOnWindowFocus: false - Don't refetch when window regains focus
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (garbage collection time)
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't auto-refetch on focus
    },
  },
});

/**
 * Centralized query keys factory.
 *
 * Benefits:
 * - Prevents typos in query keys
 * - Enables easy cache invalidation
 * - Type-safe query key generation
 * - Single source of truth for all query keys
 *
 * @example
 * // In a query hook
 * queryKey: queryKeys.users.all(true)  // ['users', { includeInactive: true }]
 *
 * @example
 * // Invalidate all user queries
 * queryClient.invalidateQueries({ queryKey: ['users'] });
 *
 * @example
 * // Invalidate specific user
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(123) });
 */
export const queryKeys = {
  /** Authentication related queries */
  auth: {
    /** Current user profile */
    profile: ['auth', 'profile'] as const,
  },

  /** User queries */
  users: {
    /** All users list (optionally include inactive) */
    all: (includeInactive?: boolean) => ['users', { includeInactive }] as const,
    /** Single user by ID */
    detail: (id: number) => ['users', id] as const,
  },

  /** Company queries */
  companies: {
    /** All companies list */
    all: ['companies'] as const,
    /** Single company by ID */
    detail: (id: number) => ['companies', id] as const,
  },

  /** Department queries */
  departments: {
    /** All departments list */
    all: ['departments'] as const,
    /** Single department by ID */
    detail: (id: number) => ['departments', id] as const,
    /** Departments filtered by company */
    byCompany: (companyId: number) => ['departments', 'company', companyId] as const,
  },

  /** Role queries */
  roles: {
    /** All roles list */
    all: ['roles'] as const,
  },

  /** Activity log queries */
  activityLogs: {
    /** Paginated activity logs with filters */
    all: (params?: { page?: number; limit?: number; method?: string; search?: string }) =>
      ['activityLogs', params] as const,
    /** Activity logs for specific user */
    byUser: (userId: number) => ['activityLogs', 'user', userId] as const,
  },

  /** Active session queries (admin) */
  activeSessions: {
    /** Online users list */
    onlineUsers: ['activeSessions', 'online'] as const,
    /** Online users with session details */
    onlineUsersWithSessions: ['activeSessions', 'sessions'] as const,
    /** All companies status (super admin) */
    companiesStatus: ['activeSessions', 'companies'] as const,
    /** Users in specific company (super admin) */
    companyUsers: (companyId: number) => ['activeSessions', 'company', companyId] as const,
  },

  /** Notification queries */
  notifications: {
    /** Paginated notifications */
    all: (page?: number, limit?: number) => ['notifications', { page, limit }] as const,
    /** Unread notifications */
    unread: ['notifications', 'unread'] as const,
    /** Unread count only */
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
} as const;
