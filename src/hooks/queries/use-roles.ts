import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { Role } from '@/types';

/** Fetches all available roles. */
export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: async (): Promise<Role[]> => {
      const res = await rolesApi.getAll();
      return res.data.data;
    },
  });
}
