'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  subscribeToNotifications,
  subscribeToUnreadNotifications,
  subscribeToUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/socket';
import type { NotificationPayload } from '@/types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  addNotification: (notification: NotificationPayload) => void;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  // Add new notification to the list
  const addNotification = useCallback((notification: NotificationPayload) => {
    setNotifications((prev) => {
      // Avoid duplicates by checking id
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      return [notification, ...prev].slice(0, 50); // Keep last 50 notifications
    });
    // Only increment if notification is unread
    if (!notification.isRead) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear notifications on logout
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Subscribe to real-time notifications
    const unsubNotifications = subscribeToNotifications((notification) => {
      addNotification(notification);
    });

    // Subscribe to unread notifications (sent on connect for offline users)
    const unsubUnread = subscribeToUnreadNotifications((payload) => {
      setNotifications(payload.notifications);
      setUnreadCount(payload.count);
    });

    // Subscribe to unread count updates
    const unsubCount = subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubNotifications();
      unsubUnread();
      unsubCount();
    };
  }, [isAuthenticated, addNotification]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Clear all notifications from local state
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
