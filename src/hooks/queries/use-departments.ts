import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { Department } from '@/types';

/** Fetches all departments. */
export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: async (): Promise<Department[]> => {
      const res = await departmentsApi.getAll();
      return res.data.data;
    },
  });
}

/** Fetches a single department by ID. */
export function useDepartment(id: number) {
  return useQuery({
    queryKey: queryKeys.departments.detail(id),
    queryFn: async (): Promise<Department> => {
      const res = await departmentsApi.getById(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

/** Fetches departments for a specific company. */
export function useDepartmentsByCompany(companyId: number) {
  return useQuery({
    queryKey: queryKeys.departments.byCompany(companyId),
    queryFn: async (): Promise<Department[]> => {
      const res = await departmentsApi.getByCompany(companyId);
      return res.data.data;
    },
    enabled: !!companyId,
  });
}
