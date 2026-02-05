import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { User } from '@/types';

// Fetches all users. Pass true to include inactive users
export function useUsers(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.users.all(includeInactive),
    queryFn: async (): Promise<User[]> => {
      const res = await usersApi.getAll(includeInactive);
      return res.data.data;
    },
  });
}

// Fetches a single user by ID
export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async (): Promise<User> => {
      const res = await usersApi.getById(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}
