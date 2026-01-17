'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToNotifications } from '@/services/socket';
import type { NotificationPayload } from '@/types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationPayload[];
  unreadCount: number;
  addNotification: (notification: NotificationPayload) => void;
  clearNotifications: () => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  const addNotification = useCallback((notification: NotificationPayload) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
    setUnreadCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToNotifications((notification) => {
      addNotification(notification);
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, addNotification]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        clearNotifications,
        markAllAsRead,
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
