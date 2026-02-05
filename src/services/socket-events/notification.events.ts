import { subscribe, emitWithAck, getSocket } from '../socket-manager';
import type {
  NotificationPayload,
  UnreadNotificationsPayload,
  UserStatusPayload,
  SessionAddedPayload,
  SessionRemovedPayload,
  SessionExpiredPayload,
} from '@/types';

// Event names
const EVENTS = {
  // Incoming events
  NOTIFICATION: 'notification',
  UNREAD_NOTIFICATIONS: 'unread-notifications',
  UNREAD_COUNT: 'unread-count',
  FORCE_DISCONNECT: 'force-disconnect',
  USER_STATUS_CHANGED: 'user-status-changed',
  SESSION_ADDED: 'session-added',
  SESSION_REMOVED: 'session-removed',
  SESSION_EXPIRED: 'session-expired',
  // Outgoing events
  MARK_READ: 'mark-read',
  MARK_ALL_READ: 'mark-all-read',
} as const;

// ============ Subscriptions ============

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (
  callback: (notification: NotificationPayload) => void
): (() => void) => {
  return subscribe(EVENTS.NOTIFICATION, callback);
};

/**
 * Subscribe to unread notifications (sent on connect for offline users)
 */
export const subscribeToUnreadNotifications = (
  callback: (payload: UnreadNotificationsPayload) => void
): (() => void) => {
  return subscribe(EVENTS.UNREAD_NOTIFICATIONS, callback);
};

/**
 * Subscribe to unread count updates
 */
export const subscribeToUnreadCount = (
  callback: (count: number) => void
): (() => void) => {
  const socket = getSocket();
  if (!socket) {
    console.warn('Cannot subscribe to unread-count - socket not connected');
    return () => {};
  }

  const handler = (payload: { count: number }) => {
    callback(payload.count);
  };

  socket.on(EVENTS.UNREAD_COUNT, handler);

  return () => {
    socket.off(EVENTS.UNREAD_COUNT, handler);
  };
};

/**
 * Subscribe to force disconnect event (session revoked by admin)
 */
export const subscribeToForceDisconnect = (
  callback: (payload: { reason: string }) => void
): (() => void) => {
  return subscribe(EVENTS.FORCE_DISCONNECT, callback);
};

/**
 * Subscribe to user status changes (online/offline) for real-time updates
 */
export const subscribeToUserStatusChanged = (
  callback: (payload: UserStatusPayload) => void
): (() => void) => {
  return subscribe(EVENTS.USER_STATUS_CHANGED, callback);
};

/**
 * Subscribe to session added events (new session connected)
 */
export const subscribeToSessionAdded = (
  callback: (payload: SessionAddedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.SESSION_ADDED, callback);
};

/**
 * Subscribe to session removed events (session disconnected or revoked)
 */
export const subscribeToSessionRemoved = (
  callback: (payload: SessionRemovedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.SESSION_REMOVED, callback);
};

/**
 * Subscribe to session expired events (session expired by cron or revoked)
 */
export const subscribeToSessionExpired = (
  callback: (payload: SessionExpiredPayload) => void
): (() => void) => {
  return subscribe(EVENTS.SESSION_EXPIRED, callback);
};

// ============ Emitters ============

/**
 * Mark single notification as read via WebSocket
 */
export const markNotificationAsRead = (
  notificationId: number
): Promise<{ success: boolean; unreadCount: number }> => {
  return emitWithAck(EVENTS.MARK_READ, { notificationId });
};

/**
 * Mark all notifications as read via WebSocket
 */
export const markAllNotificationsAsRead = (): Promise<{
  markedCount: number;
  unreadCount: number;
}> => {
  return emitWithAck(EVENTS.MARK_ALL_READ, {});
};
