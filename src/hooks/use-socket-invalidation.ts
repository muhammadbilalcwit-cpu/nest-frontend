import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToNotifications } from '@/services/socket';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { queryKeys } from '@/lib/query-client';

/** Bridges WebSocket events with TanStack Query cache invalidation. */
export function useSocketInvalidation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    // Only subscribe to notifications when authenticated
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToNotifications((notification) => {
      addNotification(notification);

      const invalidationMap: Record<string, readonly (readonly unknown[])[]> = {
        'company:created': [queryKeys.companies.all],
        'company:updated': [queryKeys.companies.all],
        'company:deleted': [queryKeys.companies.all],
        'department:created': [queryKeys.departments.all],
        'department:updated': [queryKeys.departments.all],
        'department:deleted': [queryKeys.departments.all],
        'user:created': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:updated': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:deleted': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:activated': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:deactivated': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:roles_assigned': [queryKeys.users.all(true), queryKeys.users.all(false)],
        'user:role_removed': [queryKeys.users.all(true), queryKeys.users.all(false)],
      };

      const keysToInvalidate = invalidationMap[notification.type];
      if (keysToInvalidate) {
        keysToInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [...key] });
        });
      }
    });

    return unsubscribe;
  }, [queryClient, isAuthenticated, addNotification]);
}
