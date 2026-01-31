import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import {
  subscribeToUnreadNotifications,
  subscribeToUnreadCount,
} from '@/services/socket';

/** Syncs notification store with WebSocket events for unread notifications. */
export function useNotificationSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);

  useEffect(() => {
    if (!isAuthenticated) {
      clearNotifications();
      return;
    }

    const unsubUnread = subscribeToUnreadNotifications((payload) => {
      setNotifications(payload.notifications);
      setUnreadCount(payload.count);
    });

    const unsubCount = subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubUnread();
      unsubCount();
    };
  }, [isAuthenticated, setNotifications, setUnreadCount, clearNotifications]);
}
