import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { Company } from '@/types';

// Fetches all companies
export function useCompanies(enabled = true) {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: async (): Promise<Company[]> => {
      const res = await companiesApi.getAll();
      return res.data.data;
    },
    enabled,
  });
}

// Fetches a single company by ID
export function useCompany(id: number) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: async (): Promise<Company> => {
      const res = await companiesApi.getById(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}
