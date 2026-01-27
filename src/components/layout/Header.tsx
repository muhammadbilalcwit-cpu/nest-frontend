'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  Bell,
  Sun,
  Moon,
  User,
  Check,
  CheckCheck,
} from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('created')) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    if (type.includes('updated')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    if (type.includes('deleted')) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    if (type.includes('activated')) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (type.includes('deactivated')) return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  };

  // Handle notification click - mark as read
  const handleNotificationClick = async (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border flex items-center justify-between px-6">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-slate-500" />
          ) : (
            <Sun className="w-5 h-5 text-dark-muted" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-500 dark:text-dark-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-slate-200 dark:border-dark-border overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-border flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({unreadCount} unread)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-dark-muted">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                      className={clsx(
                        'px-4 py-3 border-b border-slate-100 dark:border-dark-border last:border-0 transition-colors cursor-pointer',
                        notification.isRead
                          ? 'bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          : 'bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx('p-2 rounded-lg', getNotificationIcon(notification.type))}>
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={clsx(
                              'text-sm',
                              notification.isRead
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-slate-900 dark:text-white font-medium'
                            )}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                            {notification.actorEmail && (
                              <span>By {notification.actorEmail} • </span>
                            )}
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-dark-border">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {user?.firstname || user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-slate-500 dark:text-dark-muted">{user?.email}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
