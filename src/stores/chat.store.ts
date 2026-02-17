import { create } from 'zustand';
import type {
  ChatUser,
  ChatConversation,
  ChatMessage,
  ChatMessageReceived,
  ChatStatusUpdatePayload,
  MessageConfirmedPayload,
  MessageAttachment,
  MessageMention,
} from '@/types';
import { chatApi } from '@/services/api';
import { isChatConnected as isConnected } from '@/services/chat-socket';
import { useAuthStore } from './auth.store';

import {
  sendChatMessage,
  sendTypingIndicator,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToUserOnline,
  subscribeToUserOffline,
  subscribeToMessageDeleted,
  subscribeToStatusUpdate,
  subscribeToMessageConfirmed,
} from '@/services/socket-events/chat.events';

// Store unsubscribe functions to prevent memory leaks
let unsubscribeFunctions: Array<() => void> = [];

// Track recently processed message IDs to prevent duplicates for recipients
// (defensive measure for edge cases like socket reconnection)
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 100;

interface ChatConfig {
  deleteForEveryoneHours: number;
  maxImageSize: number;
  maxVideoSize: number;
  maxDocumentSize: number;
  maxVoiceSize: number;
  chatAccessRoles: string[];
}

const DEFAULT_CHAT_CONFIG: ChatConfig = {
  deleteForEveryoneHours: 48,
  maxImageSize: 10_485_760,
  maxVideoSize: 52_428_800,
  maxDocumentSize: 26_214_400,
  maxVoiceSize: 5_242_880,
  chatAccessRoles: [],
};

interface ChatStore {
  // State
  isOpen: boolean;
  windowMode: 'sidebar' | 'floating';
  isLoading: boolean;
  isDeleting: boolean;
  chatConfig: ChatConfig;
  chatableUsers: ChatUser[];
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  unreadCount: number;
  typingUsers: Set<number>;
  onlineUsers: Set<number>;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setWindowMode: (mode: 'sidebar' | 'floating') => void;

  fetchChatConfig: () => Promise<void>;
  initializeChat: () => Promise<void>;
  cleanupChat: () => void;

  fetchChatableUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;

  selectConversation: (conversation: ChatConversation) => Promise<void>;
  startConversation: (userId: number) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;

  sendMessage: (content: string, attachment?: MessageAttachment, mentions?: MessageMention[]) => Promise<boolean>;
  setTyping: (isTyping: boolean) => void;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<boolean>;

  handleIncomingMessage: (data: ChatMessageReceived) => Promise<void>;
  handleTyping: (senderId: number, isTyping: boolean) => void;
  handleUserOnline: (userId: number) => void;
  handleUserOffline: (userId: number) => void;
  handleMessageDeleted: (messageId: string, conversationId: string) => void;
  handleStatusUpdate: (data: ChatStatusUpdatePayload) => void;
  handleMessageConfirmed: (data: MessageConfirmedPayload) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial State
  isOpen: false,
  windowMode: 'sidebar',
  isLoading: false,
  isDeleting: false,
  chatConfig: DEFAULT_CHAT_CONFIG,
  chatableUsers: [],
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  typingUsers: new Set(),
  onlineUsers: new Set(),

  // UI Actions
  openChat: () => set({ isOpen: true, windowMode: 'sidebar' }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen, ...(!state.isOpen ? { windowMode: 'sidebar' } : {}) })),
  setWindowMode: (mode) => set({ windowMode: mode }),

  // Fetch chat config independently (called on auth, before initializeChat)
  fetchChatConfig: async () => {
    try {
      const res = await chatApi.getChatConfig();
      if (res.data?.data) {
        set({ chatConfig: res.data.data });
      } else {
        console.warn('[Chat] Config response missing data:', res.data);
      }
    } catch (err) {
      console.error('[Chat] Failed to fetch config:', err);
    }
  },

  // Initialize chat (subscribe to events and fetch data)
  // Note: Socket connection is managed centrally by auth.store
  initializeChat: async () => {
    // Clean up any existing subscriptions before creating new ones
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    unsubscribeFunctions = [];

    // Wait for socket to be connected (managed by auth.store)
    if (!isConnected()) {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (isConnected()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout after 3s
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 3000);
      });
    }

    // Subscribe to real-time events and store unsubscribe functions
    unsubscribeFunctions.push(
      subscribeToMessages((data) => {
        get().handleIncomingMessage(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToTyping((data) => {
        get().handleTyping(data.senderId, data.isTyping);
      })
    );

    unsubscribeFunctions.push(
      subscribeToUserOnline((data) => {
        get().handleUserOnline(data.userId);
      })
    );

    unsubscribeFunctions.push(
      subscribeToUserOffline((data) => {
        get().handleUserOffline(data.userId);
      })
    );

    unsubscribeFunctions.push(
      subscribeToMessageDeleted((data) => {
        get().handleMessageDeleted(data.messageId, data.conversationId);
      })
    );

    unsubscribeFunctions.push(
      subscribeToStatusUpdate((data) => {
        get().handleStatusUpdate(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToMessageConfirmed((data) => {
        get().handleMessageConfirmed(data);
      })
    );

    // Fetch initial data (config already fetched by fetchChatConfig)
    await Promise.all([
      get().fetchChatableUsers(),
      get().fetchConversations(),
      get().fetchUnreadCount(),
    ]);
  },

  // Cleanup chat (unsubscribe from events and reset state)
  // Note: Socket disconnection is managed centrally by auth.store on logout
  cleanupChat: () => {
    // Unsubscribe from all socket events to prevent memory leaks
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    unsubscribeFunctions = [];

    // Clear processed message IDs
    processedMessageIds.clear();

    // Reset data state but preserve UI state (isOpen, windowMode)
    // so the chat window stays open across page navigations.
    // On logout, canAccessChat becomes false and ChatSidebar returns null.
    set({
      isDeleting: false,
      chatableUsers: [],
      conversations: [],
      activeConversation: null,
      messages: [],
      unreadCount: 0,
      typingUsers: new Set(),
      onlineUsers: new Set(),
    });
  },

  // Fetch users that the current user can chat with
  fetchChatableUsers: async () => {
    try {
      const response = await chatApi.getChatableUsers();
      const users = response.data.data;

      // Merge online users into the set (don't replace — runs in parallel with fetchConversations)
      set((state) => {
        const newOnlineUsers = new Set(state.onlineUsers);
        users.forEach((user) => {
          if (user.isOnline) {
            newOnlineUsers.add(user.id);
          }
        });
        return { chatableUsers: users, onlineUsers: newOnlineUsers };
      });
    } catch (error) {
      console.error('Failed to fetch chatable users:', error);
    }
  },

  // Fetch all conversations
  fetchConversations: async () => {
    try {
      const response = await chatApi.getConversations();
      const conversations = response.data.data;

      // Merge conversation partners' online status into the set
      // (catches users like super_admin who may not be in chatableUsers)
      set((state) => {
        const newOnlineUsers = new Set(state.onlineUsers);
        conversations.forEach((conv) => {
          if (conv.otherUser?.isOnline) {
            newOnlineUsers.add(conv.otherUser.id);
          }
        });
        return { conversations, onlineUsers: newOnlineUsers };
      });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  // Fetch messages for a conversation
  fetchMessages: async (conversationId: string) => {
    try {
      set({ isLoading: true });
      const response = await chatApi.getMessages(conversationId);
      const messages = response.data.data.messages;

      set({ messages });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch direct (1:1) unread count (groups counted separately in ChatToggleButton)
  fetchUnreadCount: async () => {
    try {
      const response = await chatApi.getUnreadCount();
      set({ unreadCount: response.data.data.direct });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  // Select a conversation and load its messages
  selectConversation: async (conversation: ChatConversation) => {
    set({ activeConversation: conversation, messages: [], isLoading: true });
    await get().fetchMessages(conversation._id);

    // Mark messages as read
    markMessagesAsRead(conversation._id);

    // Update unread count in conversations list
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      ),
    }));

    // Recalculate total unread count
    await get().fetchUnreadCount();
  },

  // Start a new conversation with a user
  startConversation: async (userId: number) => {
    try {
      set({ isLoading: true });
      const response = await chatApi.getOrCreateConversation(userId);
      const conversation = response.data.data;

      // Add to conversations list if not already there
      set((state) => {
        const exists = state.conversations.some((c) => c._id === conversation._id);
        return {
          conversations: exists
            ? state.conversations
            : [conversation, ...state.conversations],
          activeConversation: conversation,
        };
      });

      await get().fetchMessages(conversation._id);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete a conversation (soft delete)
  deleteConversation: async (conversationId: string) => {
    try {
      set({ isDeleting: true });
      await chatApi.deleteConversation(conversationId);

      // Remove from conversations list and update unread count
      set((state) => {
        const deletedConv = state.conversations.find(
          (c) => c._id === conversationId
        );
        const deletedUnreadCount = deletedConv?.unreadCount || 0;

        return {
          conversations: state.conversations.filter(
            (c) => c._id !== conversationId
          ),
          // Clear active conversation if it was deleted
          activeConversation:
            state.activeConversation?._id === conversationId
              ? null
              : state.activeConversation,
          // Clear messages if active conversation was deleted
          messages:
            state.activeConversation?._id === conversationId
              ? []
              : state.messages,
          // Subtract deleted conversation's unread count from global count
          unreadCount: Math.max(0, state.unreadCount - deletedUnreadCount),
        };
      });

      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    } finally {
      set({ isDeleting: false });
    }
  },

  // Send a message with optimistic update (enterprise pattern)
  sendMessage: async (content: string, attachment?: MessageAttachment, mentions?: MessageMention[]) => {
    const { activeConversation } = get();
    if (!activeConversation) return false;

    const recipientId = activeConversation.otherUser?.id;
    if (!recipientId) return false;

    // Get current user ID from auth store
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return false;

    // Create optimistic message (shown immediately)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      conversationId: activeConversation._id,
      senderId: currentUser.id,
      recipientId,
      content,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachment: attachment || null,
      mentions: mentions || undefined,
    };

    // Add optimistic message immediately (instant UI feedback)
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    // Determine last message preview (WhatsApp-style attachment labels)
    let lastMessagePreview = content;
    if (attachment) {
      const attachmentLabels: Record<string, string> = {
        image: '📷 Photo',
        video: '🎥 Video',
        document: '📄 Document',
        voice: '🎤 Voice message',
      };
      lastMessagePreview = content || attachmentLabels[attachment.type] || '📎 Attachment';
    }

    // Update conversation list to show latest message
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === activeConversation._id
          ? {
              ...c,
              lastMessage: lastMessagePreview,
              lastMessageSenderId: currentUser.id,
              lastMessageAt: optimisticMessage.createdAt,
            }
          : c
      ),
    }));

    // Send to backend with tempId for confirmation mapping
    const result = await sendChatMessage({
      tempId,
      recipientId,
      content,
      attachment,
      mentions,
    });

    if (!result.success) {
      // Remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      console.error('Failed to send message:', result.error);
    }

    return result.success;
  },

  // Set typing indicator
  setTyping: (isTyping: boolean) => {
    const { activeConversation } = get();
    if (!activeConversation?.otherUser) return;

    sendTypingIndicator({
      recipientId: activeConversation.otherUser.id,
      isTyping,
    });
  },

  // Delete a message
  deleteMessage: async (messageId: string, forEveryone: boolean) => {
    try {
      await chatApi.deleteMessage(messageId, forEveryone);

      if (forEveryone) {
        // Mark message as deleted in local state (shows "This message was deleted")
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true, content: '' } : m
          ),
        }));
      } else {
        // Remove message from local state (delete for me only)
        set((state) => ({
          messages: state.messages.filter((m) => m._id !== messageId),
        }));
      }

      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  },

  // Handle incoming message
  handleIncomingMessage: async (data: ChatMessageReceived) => {
    const { message, conversation } = data;
    const { activeConversation, chatableUsers } = get();
    const currentUser = useAuthStore.getState().user;
    const isOwnMessage = message.senderId === currentUser?.id;

    // Prevent duplicate messages using global tracking
    if (processedMessageIds.has(message._id)) {
      return;
    }

    // Track this message ID (with size limit to prevent memory leak)
    processedMessageIds.add(message._id);
    if (processedMessageIds.size > MAX_PROCESSED_IDS) {
      // Remove oldest entries (first added)
      const iterator = processedMessageIds.values();
      for (let i = 0; i < 20; i++) {
        const oldest = iterator.next().value;
        if (oldest) processedMessageIds.delete(oldest);
      }
    }

    // Generate last message preview (WhatsApp-style attachment labels)
    let lastMessagePreview = message.content;
    if (message.attachment) {
      const attachmentLabels: Record<string, string> = {
        image: '📷 Photo',
        video: '🎥 Video',
        document: '📄 Document',
        voice: '🎤 Voice message',
      };
      lastMessagePreview = message.content || attachmentLabels[message.attachment.type] || '📎 Attachment';
    }

    // If this is the active conversation, add message to list
    if (activeConversation?._id === conversation._id) {
      set((state) => ({
        messages: [...state.messages, message],
      }));

      // Mark as read immediately
      markMessagesAsRead(conversation._id);
    } else if (!isOwnMessage) {
      // Only increment unread count for OTHER people's messages
      // (own messages from another session should not trigger unread)
      set((state) => ({ unreadCount: state.unreadCount + 1 }));
    }

    // Update or add conversation to list
    set((state) => {
      const existingIndex = state.conversations.findIndex(
        (c) => c._id === conversation._id
      );

      if (existingIndex >= 0) {
        // Update existing conversation
        const updatedConversations = [...state.conversations];
        updatedConversations[existingIndex] = {
          ...updatedConversations[existingIndex],
          lastMessage: lastMessagePreview,
          lastMessageSenderId: message.senderId,
          lastMessageAt: message.createdAt,
          unreadCount:
            activeConversation?._id === conversation._id || isOwnMessage
              ? (activeConversation?._id === conversation._id ? 0 : updatedConversations[existingIndex].unreadCount || 0)
              : (updatedConversations[existingIndex].unreadCount || 0) + 1,
        };

        // Move to top
        const [updated] = updatedConversations.splice(existingIndex, 1);
        return { conversations: [updated, ...updatedConversations] };
      } else {
        // Conversation was deleted or is new - need to add it with proper data
        // Find the other user from chatableUsers to get their info
        const otherUserId = isOwnMessage ? message.recipientId : message.senderId;
        const otherUser = chatableUsers.find((u) => u.id === otherUserId);

        const newConversation = {
          ...conversation,
          lastMessage: lastMessagePreview,
          lastMessageSenderId: message.senderId,
          lastMessageAt: message.createdAt,
          unreadCount: isOwnMessage ? 0 : 1,
          otherUser: otherUser || conversation.otherUser,
        };

        return { conversations: [newConversation, ...state.conversations] };
      }
    });
  },

  // Handle typing indicator
  handleTyping: (senderId: number, isTyping: boolean) => {
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      if (isTyping) {
        newTypingUsers.add(senderId);
      } else {
        newTypingUsers.delete(senderId);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  // Handle user coming online
  handleUserOnline: (userId: number) => {
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(userId);
      return {
        onlineUsers: newOnlineUsers,
        chatableUsers: state.chatableUsers.map((u) =>
          u.id === userId ? { ...u, isOnline: true } : u
        ),
      };
    });
  },

  // Handle user going offline
  handleUserOffline: (userId: number) => {
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(userId);
      return {
        onlineUsers: newOnlineUsers,
        chatableUsers: state.chatableUsers.map((u) =>
          u.id === userId ? { ...u, isOnline: false } : u
        ),
      };
    });
  },

  // Handle message deleted event (from WebSocket when someone deletes for everyone)
  handleMessageDeleted: (messageId: string, conversationId: string) => {
    const { activeConversation } = get();

    // Only update if we're viewing this conversation
    if (activeConversation?._id === conversationId) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: '' } : m
        ),
      }));
    }
  },

  // Handle message status update (delivered/read) from recipient
  handleStatusUpdate: (data: ChatStatusUpdatePayload) => {
    const { activeConversation } = get();

    // Only update if we're viewing this conversation
    if (activeConversation?._id === data.conversationId) {
      set((state) => ({
        messages: state.messages.map((m) =>
          data.messageIds.includes(m._id) ? { ...m, status: data.status } : m
        ),
      }));
    }
  },

  // Handle message confirmation (tempId → realId mapping)
  // Called after RabbitMQ consumer saves message to MongoDB
  handleMessageConfirmed: (data: MessageConfirmedPayload) => {
    // Check if this session has the optimistic message (only the sending session does)
    const hasTempMessage = get().messages.some((m) => m._id === data.tempId);

    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === data.tempId ? { ...m, _id: data.messageId } : m
      ),
    }));

    // Only mark as processed if this session had the optimistic message.
    // Other sessions (multi-device) don't have the tempId and need to
    // receive the full message via chat:receive instead.
    if (hasTempMessage) {
      processedMessageIds.add(data.messageId);
    }
  },
}));
