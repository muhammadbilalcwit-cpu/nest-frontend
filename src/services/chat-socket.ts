/**
 * Separate Socket.IO connection for the Chat microservice (FastAPI).
 * Keeps the main socket-manager connected to NestJS for notifications.
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const CHAT_SOCKET_URL =
  process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || 'http://localhost:8006';

let chatSocket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

type ConnectionListener = (connected: boolean) => void;
const connectionListeners = new Set<ConnectionListener>();

export const getChatSocket = (): Socket | null => chatSocket;

export const isChatConnected = (): boolean => chatSocket?.connected ?? false;

export const connectChatSocket = (): Promise<Socket> => {
  if (chatSocket?.connected) {
    return Promise.resolve(chatSocket);
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    chatSocket = io(CHAT_SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Function-based auth: reads fresh token on every connection/reconnection attempt
      auth: (cb) => {
        const token = getAccessToken();
        cb(token ? { token } : {});
      },
    });

    const onConnect = () => {
      console.log('Chat socket connected:', chatSocket?.id);
      connectionPromise = null;
      notifyListeners(true);
      resolve(chatSocket!);
    };

    const onConnectError = (error: Error) => {
      console.warn('Chat socket connection error (will auto-reconnect):', error.message);
      connectionPromise = null;
      notifyListeners(false);
      // Don't reject — socket.io auto-reconnection is enabled and will keep retrying.
      // Rejecting here causes unhandled promise rejections that crash Next.js.
      resolve(chatSocket!);
    };

    chatSocket.once('connect', onConnect);
    chatSocket.once('connect_error', onConnectError);

    chatSocket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
      notifyListeners(false);
    });

    chatSocket.on('connect', () => {
      console.log('Chat socket reconnected:', chatSocket?.id);
      notifyListeners(true);
    });
  });

  return connectionPromise;
};

export const disconnectChatSocket = (): void => {
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
    connectionPromise = null;
    notifyListeners(false);
  }
};

export const onChatConnectionChange = (
  listener: ConnectionListener
): (() => void) => {
  connectionListeners.add(listener);
  listener(isChatConnected());
  return () => {
    connectionListeners.delete(listener);
  };
};

const notifyListeners = (connected: boolean): void => {
  connectionListeners.forEach((listener) => listener(connected));
};

/** Subscribe to a chat socket event. Returns unsubscribe function. */
export const chatSubscribe = <T>(
  event: string,
  callback: (data: T) => void
): (() => void) => {
  const s = chatSocket;
  if (!s) {
    console.warn(`Cannot subscribe to "${event}" - chat socket not connected`);
    return () => {};
  }
  s.on(event, callback);
  return () => {
    s.off(event, callback);
  };
};

/** Emit an event on the chat socket. */
export const chatEmit = <T>(event: string, data?: T): void => {
  if (!chatSocket?.connected) {
    console.warn(`Cannot emit "${event}" - chat socket not connected`);
    return;
  }
  chatSocket.emit(event, data);
};

/** Emit with acknowledgment on the chat socket. */
export const chatEmitWithAck = <TPayload, TResponse>(
  event: string,
  data: TPayload,
  timeoutMs = 10000
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    if (!chatSocket?.connected) {
      reject(new Error('Chat socket not connected'));
      return;
    }

    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error(`Chat socket emit "${event}" timeout`));
      }
    }, timeoutMs);

    chatSocket.emit(event, data, (response: TResponse) => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeoutId);
        resolve(response);
      }
    });
  });
};
