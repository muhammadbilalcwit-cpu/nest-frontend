import { QueryClient } from '@tanstack/react-query';

// Global TanStack Query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Centralized query keys factory
export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'] as const,
  },

  users: {
    all: (includeInactive?: boolean) => ['users', { includeInactive }] as const,
    detail: (id: number) => ['users', id] as const,
  },

  companies: {
    all: ['companies'] as const,
    detail: (id: number) => ['companies', id] as const,
  },

  departments: {
    all: ['departments'] as const,
    detail: (id: number) => ['departments', id] as const,
    byCompany: (companyId: number) => ['departments', 'company', companyId] as const,
  },

  roles: {
    all: ['roles'] as const,
  },

  activityLogs: {
    all: (params?: { page?: number; limit?: number; method?: string; search?: string }) =>
      ['activityLogs', params] as const,
    byUser: (userId: number) => ['activityLogs', 'user', userId] as const,
  },

  activeSessions: {
    onlineUsers: ['activeSessions', 'online'] as const,
    onlineUsersWithSessions: ['activeSessions', 'sessions'] as const,
    companiesStatus: ['activeSessions', 'companies'] as const,
    companyUsers: (companyId: number) => ['activeSessions', 'company', companyId] as const,
  },

  notifications: {
    all: (page?: number, limit?: number) => ['notifications', { page, limit }] as const,
    unread: ['notifications', 'unread'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
} as const;
