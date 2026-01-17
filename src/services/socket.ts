import { io, Socket } from 'socket.io-client';
import type { NotificationPayload } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

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

export const subscribeToNotifications = (
  callback: (notification: NotificationPayload) => void
): (() => void) => {
  const currentSocket = socket || connectSocket();

  currentSocket.on('notification', callback);

  return () => {
    currentSocket.off('notification', callback);
  };
};

export const getSocket = (): Socket | null => socket;
