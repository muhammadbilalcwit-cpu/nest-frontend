import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { Company, UpdateInput } from '@/types';

/** Creates a new company. Invalidates companies cache on success. */
export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

/** Updates an existing company. Invalidates companies cache on success. */
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateInput<Company>) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

/** Deletes a company. Invalidates companies cache on success. */
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}
