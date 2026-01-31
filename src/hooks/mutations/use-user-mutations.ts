import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { queryKeys } from '@/lib/query-client';
import type { CreateUserInput, UpdateUserInput, UpdateProfileInput, UpdateInput, User } from '@/types';

/** Creates a new user. Invalidates users cache on success. */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Updates an existing user. Invalidates users cache on success. */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateInput<UpdateUserInput>) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Soft deletes a user. Invalidates users cache on success. */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Assigns roles to a user. Invalidates users cache on success. */
export function useAssignRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleSlugs }: { id: number; roleSlugs: string[] }) =>
      usersApi.assignRoles(id, roleSlugs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Removes a role from a user. Invalidates users cache on success. */
export function useRemoveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, slug }: { id: number; slug: string }) => usersApi.removeRole(id, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Updates user active/inactive status. Invalidates users cache on success. */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      usersApi.updateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/** Updates current user's own profile. Invalidates profile cache on success. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
}

/** Uploads avatar for current user. Invalidates profile cache on success. */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
}

/** Removes avatar for current user. Invalidates profile cache on success. */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.removeAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
}
