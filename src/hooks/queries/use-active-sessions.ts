import { useQuery } from '@tanstack/react-query';
import { activeSessionsApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type {
  OnlineUsersWithSessionsResponse,
  AllCompaniesStatusResponse,
  CompanyUsersWithSessionsResponse,
} from '@/types';

// Fetches list of online users (legacy)
export function useOnlineUsers() {
  return useQuery({
    queryKey: queryKeys.activeSessions.onlineUsers,
    queryFn: async () => {
      const res = await activeSessionsApi.getOnlineUsers();
      return res.data.data;
    },
  });
}

// Fetches online users with their session details (company admin)
export function useOnlineUsersWithSessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.activeSessions.onlineUsersWithSessions,
    queryFn: async (): Promise<OnlineUsersWithSessionsResponse> => {
      const res = await activeSessionsApi.getOnlineUsersWithSessions();
      return res.data.data;
    },
    enabled,
  });
}

// Fetches status of all companies (super admin only)
export function useCompaniesStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.activeSessions.companiesStatus,
    queryFn: async (): Promise<AllCompaniesStatusResponse> => {
      const res = await activeSessionsApi.getAllCompaniesStatus();
      return res.data.data;
    },
    enabled,
  });
}

// Fetches users with sessions for a specific company (super admin only)
export function useCompanyUsersWithSessions(companyId: number) {
  return useQuery({
    queryKey: queryKeys.activeSessions.companyUsers(companyId),
    queryFn: async (): Promise<CompanyUsersWithSessionsResponse> => {
      const res = await activeSessionsApi.getCompanyUsersWithSessions(companyId);
      return res.data.data;
    },
    enabled: !!companyId,
  });
}
