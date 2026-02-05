import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Single socket instance for the entire app
let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

// Connection state listeners
type ConnectionListener = (connected: boolean) => void;
const connectionListeners = new Set<ConnectionListener>();

/**
 * Get the current socket instance (may be null if not connected)
 */
export const getSocket = (): Socket | null => socket;

/**
 * Check if socket is currently connected
 */
export const isConnected = (): boolean => socket?.connected ?? false;

/**
 * Connect to the WebSocket server
 * Returns existing connection if already connected
 * Returns pending connection promise if connection is in progress
 */
export const connectSocket = (): Promise<Socket> => {
  // Return existing connection
  if (socket?.connected) {
    return Promise.resolve(socket);
  }

  // Return pending connection
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const onConnect = () => {
      console.log('Socket connected:', socket?.id);
      connectionPromise = null;
      notifyConnectionListeners(true);
      resolve(socket!);
    };

    const onConnectError = (error: Error) => {
      console.error('Socket connection error:', error.message);
      connectionPromise = null;
      notifyConnectionListeners(false);
      reject(error);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);

    // Handle subsequent disconnects
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      notifyConnectionListeners(false);
    });

    // Handle reconnection
    socket.on('connect', () => {
      console.log('Socket reconnected:', socket?.id);
      notifyConnectionListeners(true);
    });
  });

  return connectionPromise;
};

/**
 * Disconnect from the WebSocket server
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connectionPromise = null;
    notifyConnectionListeners(false);
  }
};

/**
 * Subscribe to connection state changes
 */
export const onConnectionChange = (listener: ConnectionListener): (() => void) => {
  connectionListeners.add(listener);
  // Immediately notify with current state
  listener(isConnected());
  return () => {
    connectionListeners.delete(listener);
  };
};

const notifyConnectionListeners = (connected: boolean): void => {
  connectionListeners.forEach((listener) => listener(connected));
};

/**
 * Generic subscribe helper - subscribes to a socket event
 * Returns an unsubscribe function for cleanup
 */
export const subscribe = <T>(
  event: string,
  callback: (data: T) => void
): (() => void) => {
  const currentSocket = socket;
  if (!currentSocket) {
    console.warn(`Cannot subscribe to "${event}" - socket not connected`);
    return () => {};
  }

  currentSocket.on(event, callback);

  return () => {
    currentSocket.off(event, callback);
  };
};

/**
 * Generic emit helper - emits an event to the server
 */
export const emit = <T>(event: string, data?: T): void => {
  if (!socket?.connected) {
    console.warn(`Cannot emit "${event}" - socket not connected`);
    return;
  }
  socket.emit(event, data);
};

/**
 * Generic emit with acknowledgment and timeout
 * Returns a promise that resolves with the server response
 */
export const emitWithAck = <TPayload, TResponse>(
  event: string,
  data: TPayload,
  timeoutMs = 10000
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error(`Socket emit "${event}" timeout`));
      }
    }, timeoutMs);

    socket.emit(event, data, (response: TResponse) => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeoutId);
        resolve(response);
      }
    });
  });
};
