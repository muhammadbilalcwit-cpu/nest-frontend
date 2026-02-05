// Re-export socket manager
export {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
  onConnectionChange,
} from "../socket-manager";

// Re-export notification events
export {
  subscribeToNotifications,
  subscribeToUnreadNotifications,
  subscribeToUnreadCount,
  subscribeToForceDisconnect,
  subscribeToUserStatusChanged,
  subscribeToSessionAdded,
  subscribeToSessionRemoved,
  subscribeToSessionExpired,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.events";

// Re-export chat events
export {
  subscribeToMessages,
  subscribeToTyping,
  subscribeToUserOnline,
  subscribeToUserOffline,
  subscribeToMessageDeleted,
  sendChatMessage,
  sendTypingIndicator,
  markMessagesAsRead,
} from "./chat.events";
