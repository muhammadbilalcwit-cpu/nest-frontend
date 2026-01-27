import { io, Socket } from 'socket.io-client';
import type {
  NotificationPayload,
  UnreadNotificationsPayload,
  UserStatusPayload,
  SessionAddedPayload,
  SessionRemovedPayload,
  SessionExpiredPayload,
} from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true, // Important: Sends cookies for JWT auth
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Subscribe to real-time notifications
export const subscribeToNotifications = (
  callback: (notification: NotificationPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('notification', callback);

  return () => {
    currentSocket.off('notification', callback);
  };
};

// Subscribe to unread notifications (sent on connect for offline users)
export const subscribeToUnreadNotifications = (
  callback: (payload: UnreadNotificationsPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('unread-notifications', callback);

  return () => {
    currentSocket.off('unread-notifications', callback);
  };
};

// Subscribe to unread count updates
export const subscribeToUnreadCount = (
  callback: (count: number) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('unread-count', (payload: { count: number }) => {
    callback(payload.count);
  });

  return () => {
    currentSocket.off('unread-count');
  };
};

// Mark single notification as read via WebSocket
export const markNotificationAsRead = (
  notificationId: number
): Promise<{ success: boolean; unreadCount: number }> => {
  return new Promise((resolve, reject) => {
    const currentSocket = socket || connectSocket();

    if (!currentSocket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    currentSocket.emit(
      'mark-read',
      { notificationId },
      (response: { success: boolean; unreadCount: number }) => {
        resolve(response);
      }
    );
  });
};

// Mark all notifications as read via WebSocket
export const markAllNotificationsAsRead = (): Promise<{
  markedCount: number;
  unreadCount: number;
}> => {
  return new Promise((resolve, reject) => {
    const currentSocket = socket || connectSocket();

    if (!currentSocket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    currentSocket.emit(
      'mark-all-read',
      {},
      (response: { markedCount: number; unreadCount: number }) => {
        resolve(response);
      }
    );
  });
};

// Subscribe to force disconnect event (session revoked by admin)
export const subscribeToForceDisconnect = (
  callback: (payload: { reason: string }) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('force-disconnect', callback);

  return () => {
    currentSocket.off('force-disconnect', callback);
  };
};

// Subscribe to user status changes (online/offline) for real-time updates
export const subscribeToUserStatusChanged = (
  callback: (payload: UserStatusPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('user-status-changed', callback);

  return () => {
    currentSocket.off('user-status-changed', callback);
  };
};

export const getSocket = (): Socket | null => socket;

export const isSocketConnected = (): boolean => socket?.connected ?? false;

// Subscribe to session added events (new session connected)
export const subscribeToSessionAdded = (
  callback: (payload: SessionAddedPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('session-added', callback);

  return () => {
    currentSocket.off('session-added', callback);
  };
};

// Subscribe to session removed events (session disconnected or revoked)
export const subscribeToSessionRemoved = (
  callback: (payload: SessionRemovedPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('session-removed', callback);

  return () => {
    currentSocket.off('session-removed', callback);
  };
};

// Subscribe to session expired events (session expired by cron or revoked)
export const subscribeToSessionExpired = (
  callback: (payload: SessionExpiredPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('session-expired', callback);

  return () => {
    currentSocket.off('session-expired', callback);
  };
};
