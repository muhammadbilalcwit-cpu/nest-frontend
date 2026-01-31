import { create } from 'zustand';
import type { NotificationPayload } from '@/types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/socket';

interface NotificationStore {
  notifications: NotificationPayload[];
  unreadCount: number;
  addNotification: (notification: NotificationPayload) => void;
  setNotifications: (notifications: NotificationPayload[]) => void;
  setUnreadCount: (count: number) => void;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification: NotificationPayload) => {
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  setNotifications: (notifications: NotificationPayload[]) => {
    set({ notifications });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  markAsRead: async (notificationId: number) => {
    try {
      const response = await markNotificationAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: response.unreadCount,
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
