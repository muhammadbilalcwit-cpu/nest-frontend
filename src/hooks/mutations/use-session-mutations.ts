import { useMutation, useQueryClient } from '@tanstack/react-query';
import { activeSessionsApi } from '@/services/api';
import type { RevokeCompanySessionInput } from '@/types';

// Revokes all sessions for a user (force logout)
export function useRevokeAllUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => activeSessionsApi.revokeAllUserSessions(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });
}

// Revokes a specific session by ID
export function useRevokeSpecificSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => activeSessionsApi.revokeSpecificSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });
}

// Revokes all sessions in the admin's company
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activeSessionsApi.revokeAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });
}

// Super Admin mutations

// Revokes all sessions for a specific company (super admin only)
export function useRevokeAllSessionsForCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) => activeSessionsApi.revokeAllSessionsForCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });
}

// Revokes a specific session in a company (super admin only)
export function useRevokeSpecificSessionForCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, sessionId }: RevokeCompanySessionInput) =>
      activeSessionsApi.revokeSpecificSessionForCompany(companyId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
  });
}
