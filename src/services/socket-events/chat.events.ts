import { chatSubscribe as subscribe, chatEmit as emit, getChatSocket as getSocket } from '../chat-socket';
import type {
  SendMessagePayload,
  TypingPayload,
  ChatMessageReceived,
  ChatMessageDeletedPayload,
  ChatStatusUpdatePayload,
  MessageConfirmedPayload,
  SendGroupMessagePayload,
  GroupTypingPayload,
  GroupMessageReceivedPayload,
  GroupMemberAddedPayload,
  GroupMemberRemovedPayload,
  GroupMemberLeftPayload,
  GroupMembersAddedPayload,
  GroupUpdatedPayload,
  GroupMessagesReadPayload,
  GroupMessageDeliveredPayload,
  GroupMessageDeletedPayload,
  GroupTypingIndicatorPayload,
  GroupSystemMessagePayload,
} from '@/types';

// Event names with chat: prefix
const EVENTS = {
  // Incoming events (1:1 chat)
  RECEIVE: 'chat:receive',
  TYPING: 'chat:typing',
  MESSAGE_CONFIRMED: 'chat:message_confirmed',
  MESSAGE_DELETED: 'chat:message_deleted',
  STATUS_UPDATED: 'chat:status_updated',
  // Outgoing events (1:1 chat)
  SEND: 'chat:send',
  READ: 'chat:read',
  // Group events (incoming)
  GROUP_MESSAGE: 'chat:group_message',
  GROUP_TYPING: 'chat:group_typing',
  GROUP_MEMBER_ADDED: 'chat:group_member_added',
  GROUP_MEMBER_REMOVED: 'chat:group_member_removed',
  GROUP_MEMBER_LEFT: 'chat:group_member_left', // When member leaves (notifies remaining)
  GROUP_MEMBERS_ADDED: 'chat:group_members_added', // When new members added (notifies existing)
  GROUP_UPDATED: 'chat:group_updated', // When group info updated
  GROUP_MESSAGES_READ: 'chat:group_messages_read',
  GROUP_MESSAGE_DELIVERED: 'chat:group_message_delivered',
  GROUP_MESSAGE_DELETED: 'chat:group_message_deleted', // When message deleted for everyone
  GROUP_SYSTEM_MESSAGE: 'chat:group_system_message', // WhatsApp-style system messages
  // Group events (outgoing)
  GROUP_SEND: 'chat:group_send',
  GROUP_READ: 'chat:group_read',
} as const;

// Timeout for message sending
const MESSAGE_TIMEOUT_MS = 10000;

// ============ Subscriptions ============

/**
 * Subscribe to incoming chat messages
 */
export const subscribeToMessages = (
  callback: (data: ChatMessageReceived) => void
): (() => void) => {
  return subscribe(EVENTS.RECEIVE, callback);
};

/**
 * Subscribe to typing indicators
 */
export const subscribeToTyping = (
  callback: (data: { senderId: number; isTyping: boolean }) => void
): (() => void) => {
  return subscribe(EVENTS.TYPING, callback);
};

/**
 * Subscribe to user online status
 * FastAPI chat service emits 'user:online' directly
 */
export const subscribeToUserOnline = (
  callback: (data: { userId: number }) => void
): (() => void) => {
  return subscribe('user:online', callback);
};

/**
 * Subscribe to user offline status
 * FastAPI chat service emits 'user:offline' directly
 */
export const subscribeToUserOffline = (
  callback: (data: { userId: number }) => void
): (() => void) => {
  return subscribe('user:offline', callback);
};

/**
 * Subscribe to the full online user list
 * FastAPI sends this on initial connection so the UI has accurate status from the start
 */
export const subscribeToOnlineList = (
  callback: (data: { userIds: number[] }) => void
): (() => void) => {
  return subscribe('users:online_list', callback);
};

/**
 * Subscribe to customer online status (for support agents)
 */
export const subscribeToCustomerOnline = (
  callback: (data: { customerId: number; companyId: number }) => void
): (() => void) => {
  return subscribe('customer:online', callback);
};

/**
 * Subscribe to customer offline status (for support agents)
 */
export const subscribeToCustomerOffline = (
  callback: (data: { customerId: number; companyId: number }) => void
): (() => void) => {
  return subscribe('customer:offline', callback);
};

/**
 * Subscribe to message deleted events (when someone deletes for everyone)
 */
export const subscribeToMessageDeleted = (
  callback: (data: ChatMessageDeletedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.MESSAGE_DELETED, callback);
};

/**
 * Subscribe to message status updates (delivered/read)
 * Notifies sender when their messages are delivered or read by recipient
 */
export const subscribeToStatusUpdate = (
  callback: (data: ChatStatusUpdatePayload) => void
): (() => void) => {
  return subscribe(EVENTS.STATUS_UPDATED, callback);
};

/**
 * Subscribe to message confirmation events
 * Maps tempId to real MongoDB ID after message is saved
 */
export const subscribeToMessageConfirmed = (
  callback: (data: MessageConfirmedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.MESSAGE_CONFIRMED, callback);
};

// ============ Emitters ============

/**
 * Send a chat message
 * Message is saved by RabbitMQ consumer, delivered via chat:receive
 */
export const sendChatMessage = (
  payload: SendMessagePayload
): Promise<{ success: boolean; error?: string }> => {
  const socket = getSocket();

  if (!socket?.connected) {
    return Promise.resolve({ success: false, error: 'Socket not connected' });
  }

  return new Promise((resolve) => {
    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({ success: false, error: 'Message send timeout' });
      }
    }, MESSAGE_TIMEOUT_MS);

    socket.emit(
      EVENTS.SEND,
      payload,
      (response: { success: boolean; error?: string }) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutId);
          resolve(response);
        }
      }
    );
  });
};

/**
 * Send typing indicator
 */
export const sendTypingIndicator = (payload: TypingPayload): void => {
  emit(EVENTS.TYPING, payload);
};

/**
 * Mark messages as read in a conversation
 */
export const markMessagesAsRead = (conversationId: string): void => {
  emit(EVENTS.READ, { conversationId });
};

// ============ Group Subscriptions ============

/**
 * Subscribe to incoming group messages
 */
export const subscribeToGroupMessages = (
  callback: (data: GroupMessageReceivedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MESSAGE, callback);
};

/**
 * Subscribe to group typing indicators
 */
export const subscribeToGroupTyping = (
  callback: (data: GroupTypingIndicatorPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_TYPING, callback);
};

/**
 * Subscribe to being added to a group
 */
export const subscribeToGroupMemberAdded = (
  callback: (data: GroupMemberAddedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MEMBER_ADDED, callback);
};

/**
 * Subscribe to being removed from a group
 */
export const subscribeToGroupMemberRemoved = (
  callback: (data: GroupMemberRemovedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MEMBER_REMOVED, callback);
};

/**
 * Subscribe to member left events (for remaining members)
 * Notifies when a member leaves so remaining can update member count in real-time
 */
export const subscribeToGroupMemberLeft = (
  callback: (data: GroupMemberLeftPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MEMBER_LEFT, callback);
};

/**
 * Subscribe to new members added events (for existing members)
 * Notifies existing members when admin adds new members
 */
export const subscribeToGroupMembersAdded = (
  callback: (data: GroupMembersAddedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MEMBERS_ADDED, callback);
};

/**
 * Subscribe to group updated events (name, avatar changes)
 */
export const subscribeToGroupUpdated = (
  callback: (data: GroupUpdatedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_UPDATED, callback);
};

/**
 * Subscribe to group messages read status updates
 * Notifies sender when their messages are read by group members
 */
export const subscribeToGroupMessagesRead = (
  callback: (data: GroupMessagesReadPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MESSAGES_READ, callback);
};

/**
 * Subscribe to group message delivered status updates
 * Notifies sender when their message is delivered to a member
 */
export const subscribeToGroupMessageDelivered = (
  callback: (data: GroupMessageDeliveredPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MESSAGE_DELIVERED, callback);
};

/**
 * Subscribe to group message deleted events
 * Notifies all group members when a message is deleted for everyone
 */
export const subscribeToGroupMessageDeleted = (
  callback: (data: GroupMessageDeletedPayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_MESSAGE_DELETED, callback);
};

/**
 * Subscribe to group system messages (WhatsApp-style)
 * These are permanent messages like "Admin added John", "John left"
 */
export const subscribeToGroupSystemMessage = (
  callback: (data: GroupSystemMessagePayload) => void
): (() => void) => {
  return subscribe(EVENTS.GROUP_SYSTEM_MESSAGE, callback);
};

// ============ Group Emitters ============

/**
 * Send a group message
 */
export const sendGroupMessage = (
  payload: SendGroupMessagePayload
): Promise<{ success: boolean; error?: string }> => {
  const socket = getSocket();

  if (!socket?.connected) {
    return Promise.resolve({ success: false, error: 'Socket not connected' });
  }

  return new Promise((resolve) => {
    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({ success: false, error: 'Message send timeout' });
      }
    }, MESSAGE_TIMEOUT_MS);

    socket.emit(
      EVENTS.GROUP_SEND,
      payload,
      (response: { success: boolean; error?: string }) => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeoutId);
          resolve(response);
        }
      }
    );
  });
};

/**
 * Send group typing indicator
 */
export const sendGroupTypingIndicator = (payload: GroupTypingPayload): void => {
  emit(EVENTS.GROUP_TYPING, payload);
};

/**
 * Mark group messages as read
 */
export const markGroupMessagesAsRead = (groupId: string): void => {
  emit(EVENTS.GROUP_READ, { groupId });
};

// ============ Support Queue Subscriptions ============

/**
 * Subscribe to new support queue items
 * Dispatches a window event so SupportQueueList can refresh
 */
export const subscribeToSupportQueueNew = (
  callback: (data: any) => void
): (() => void) => {
  return subscribe('support:queue:new', callback);
};

/**
 * Subscribe to support queue updates (accept, resolve)
 */
export const subscribeToSupportQueueUpdated = (
  callback: (data: any) => void
): (() => void) => {
  return subscribe('support:queue:updated', callback);
};
