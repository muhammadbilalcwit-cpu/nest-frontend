import { useQuery } from '@tanstack/react-query';
import { activityLogsApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { ActivityLogsParams, ActivityLog } from '@/types';

/** Fetches paginated activity logs with optional filters. */
export function useActivityLogs(params: ActivityLogsParams = {}) {
  const cleanParams: ActivityLogsParams = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.method) cleanParams.method = params.method;
  if (params.search) cleanParams.search = params.search;

  return useQuery({
    queryKey: queryKeys.activityLogs.all(cleanParams),
    queryFn: async () => {
      const res = await activityLogsApi.getAll(cleanParams);
      return res.data.data;
    },
  });
}

/** Fetches activity logs for a specific user. */
export function useActivityLogsByUser(userId: number) {
  return useQuery({
    queryKey: queryKeys.activityLogs.byUser(userId),
    queryFn: async (): Promise<ActivityLog[]> => {
      const res = await activityLogsApi.getByUserId(userId);
      return res.data.data;
    },
    enabled: !!userId,
  });
}
