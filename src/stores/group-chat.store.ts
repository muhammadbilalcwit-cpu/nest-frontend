import { create } from 'zustand';
import type {
  ChatUser,
  GroupConversation,
  GroupMessage,
  GroupMessageReceivedPayload,
  GroupMessagesReadPayload,
  GroupMessageDeliveredPayload,
  GroupMessageDeletedPayload,
  GroupTypingIndicatorPayload,
  GroupMemberAddedPayload,
  GroupMemberRemovedPayload,
  GroupMemberLeftPayload,
  GroupMembersAddedPayload,
  CreateGroupPayload,
  MessageConfirmedPayload,
  GroupSystemMessagePayload,
  MessageAttachment,
  MessageMention,
} from '@/types';
import { chatApi } from '@/services/api';
import { isChatConnected as isConnected } from '@/services/chat-socket';
import { useAuthStore } from './auth.store';

import {
  sendGroupMessage,
  sendGroupTypingIndicator,
  markGroupMessagesAsRead,
  subscribeToGroupMessages,
  subscribeToGroupTyping,
  subscribeToGroupMemberAdded,
  subscribeToGroupMemberRemoved,
  subscribeToGroupMemberLeft,
  subscribeToGroupMembersAdded,
  subscribeToGroupMessagesRead,
  subscribeToGroupMessageDelivered,
  subscribeToGroupMessageDeleted,
  subscribeToMessageConfirmed,
  subscribeToGroupSystemMessage,
} from '@/services/socket-events/chat.events';

// Store unsubscribe functions to prevent memory leaks
let unsubscribeFunctions: Array<() => void> = [];

// Track recently processed message IDs to prevent duplicates
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 100;

// Debounce fetchGroups to prevent multiple rapid calls
let fetchGroupsTimeout: ReturnType<typeof setTimeout> | null = null;
let isFetchingGroups = false;

// System notification for member events (join/leave)
interface SystemNotification {
  id: string;
  groupId: string;
  message: string;
  type: 'member_joined' | 'member_left' | 'admin_changed';
  timestamp: number;
}

interface GroupChatStore {
  // State
  isLoading: boolean;
  groups: GroupConversation[];
  activeGroup: GroupConversation | null;
  messages: GroupMessage[];
  messageSenders: Record<string, { id: number; firstname: string | null; lastname: string | null; profilePicture: string | null }>; // userId -> user details from API
  typingUsers: Map<string, Set<number>>; // groupId -> Set of userIds typing
  chatableUsers: ChatUser[];
  systemNotifications: SystemNotification[]; // Notifications for member events

  // Actions
  initializeGroupChat: (chatableUsers: ChatUser[]) => Promise<void>;
  cleanupGroupChat: () => void;

  fetchGroups: () => Promise<void>;
  fetchGroupMessages: (groupId: string) => Promise<void>;

  selectGroup: (group: GroupConversation) => Promise<void>;
  clearActiveGroup: () => void;

  createGroup: (data: CreateGroupPayload) => Promise<GroupConversation | null>;
  updateGroup: (
    groupId: string,
    data: { name?: string; avatar?: string }
  ) => Promise<boolean>;
  addMembers: (groupId: string, memberIds: number[]) => Promise<boolean>;
  removeMember: (groupId: string, memberId: number) => Promise<boolean>;
  leaveGroup: (groupId: string, newAdminId?: number) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;

  sendMessage: (content: string, attachment?: MessageAttachment, mentions?: MessageMention[], mentionsAll?: boolean) => Promise<boolean>;
  deleteMessage: (messageId: string, forEveryone: boolean) => Promise<boolean>;
  setTyping: (isTyping: boolean) => void;

  // System notifications
  addSystemNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void;
  clearSystemNotifications: (groupId: string) => void;

  // Event handlers
  handleIncomingGroupMessage: (data: GroupMessageReceivedPayload) => Promise<void>;
  handleGroupTyping: (data: GroupTypingIndicatorPayload) => void;
  handleGroupMessagesRead: (data: GroupMessagesReadPayload) => void;
  handleGroupMessageDelivered: (data: GroupMessageDeliveredPayload) => void;
  handleGroupMessageDeleted: (data: GroupMessageDeletedPayload) => void;
  handleGroupMemberAdded: (data: GroupMemberAddedPayload) => void;
  handleGroupMemberRemoved: (data: GroupMemberRemovedPayload) => void;
  handleGroupMemberLeft: (data: GroupMemberLeftPayload) => void;
  handleGroupMembersAdded: (data: GroupMembersAddedPayload) => void;
  handleMessageConfirmed: (data: MessageConfirmedPayload) => void;
  handleGroupSystemMessage: (data: GroupSystemMessagePayload) => void;
}

export const useGroupChatStore = create<GroupChatStore>((set, get) => ({
  // Initial State
  isLoading: false,
  groups: [],
  activeGroup: null,
  messages: [],
  messageSenders: {},
  typingUsers: new Map(),
  chatableUsers: [],
  systemNotifications: [],

  // Initialize group chat (subscribe to events and fetch data)
  initializeGroupChat: async (chatableUsers: ChatUser[]) => {
    // Clean up any existing subscriptions
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    unsubscribeFunctions = [];

    // Store chatableUsers for member lookups
    set({ chatableUsers });

    // Wait for socket to be connected
    if (!isConnected()) {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (isConnected()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 3000);
      });
    }

    // Subscribe to group events
    unsubscribeFunctions.push(
      subscribeToGroupMessages((data) => {
        get().handleIncomingGroupMessage(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToGroupTyping((data) => {
        get().handleGroupTyping(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToGroupMemberAdded((data) => {
        get().handleGroupMemberAdded(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToGroupMemberRemoved((data) => {
        get().handleGroupMemberRemoved(data);
      })
    );

    // Subscribe to member left events (for remaining members to update count)
    unsubscribeFunctions.push(
      subscribeToGroupMemberLeft((data) => {
        get().handleGroupMemberLeft(data);
      })
    );

    // Subscribe to members added events (for existing members)
    unsubscribeFunctions.push(
      subscribeToGroupMembersAdded((data) => {
        get().handleGroupMembersAdded(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToGroupMessagesRead((data) => {
        get().handleGroupMessagesRead(data);
      })
    );

    unsubscribeFunctions.push(
      subscribeToGroupMessageDelivered((data) => {
        get().handleGroupMessageDelivered(data);
      })
    );

    // Subscribe to group message deleted (real-time delete for everyone)
    unsubscribeFunctions.push(
      subscribeToGroupMessageDeleted((data) => {
        get().handleGroupMessageDeleted(data);
      })
    );

    // Subscribe to message confirmed (tempId → realId mapping)
    unsubscribeFunctions.push(
      subscribeToMessageConfirmed((data) => {
        get().handleMessageConfirmed(data);
      })
    );

    // Subscribe to system messages (WhatsApp-style permanent notifications)
    unsubscribeFunctions.push(
      subscribeToGroupSystemMessage((data) => {
        get().handleGroupSystemMessage(data);
      })
    );

    // Fetch groups
    await get().fetchGroups();
  },

  // Cleanup group chat
  cleanupGroupChat: () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    unsubscribeFunctions = [];
    processedMessageIds.clear();

    set({
      isLoading: false,
      groups: [],
      activeGroup: null,
      messages: [],
      typingUsers: new Map(),
      chatableUsers: [],
    });
  },

  // Fetch all groups (with deduplication to prevent rapid multiple calls)
  fetchGroups: async () => {
    if (isFetchingGroups) {
      return;
    }

    if (fetchGroupsTimeout) {
      clearTimeout(fetchGroupsTimeout);
      fetchGroupsTimeout = null;
    }

    try {
      isFetchingGroups = true;
      const response = await chatApi.getGroups();
      set({ groups: response.data.data });
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      isFetchingGroups = false;
    }
  },

  // Fetch messages for a group
  fetchGroupMessages: async (groupId: string) => {
    try {
      set({ isLoading: true });
      const response = await chatApi.getGroupMessages(groupId);
      const data = response.data.data;
      const messages = data.messages as unknown as GroupMessage[];

      set({
        messages,
        messageSenders: data.messageSenders || {},
      });
    } catch (error) {
      console.error('Failed to fetch group messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Select a group and load messages
  selectGroup: async (group: GroupConversation) => {
    // Clear any active 1:1 conversation to prevent split-panel conflicts
    const { useChatStore } = await import('./chat.store');
    useChatStore.setState({ activeConversation: null });
    set({ activeGroup: group, messages: [], messageSenders: {}, isLoading: true });
    await get().fetchGroupMessages(group._id);

    // Mark messages as read
    markGroupMessagesAsRead(group._id);

    // Update unread count
    set((state) => ({
      groups: state.groups.map((g) =>
        g._id === group._id ? { ...g, unreadCount: 0 } : g
      ),
    }));
  },

  // Clear active group
  clearActiveGroup: () => {
    set({ activeGroup: null, messages: [] });
  },

  // Create a new group
  createGroup: async (data: CreateGroupPayload) => {
    try {
      set({ isLoading: true });
      const response = await chatApi.createGroup(data);
      const newGroup = response.data.data;

      set((state) => ({
        groups: [newGroup, ...state.groups],
      }));

      return newGroup;
    } catch (error) {
      console.error('Failed to create group:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // Update group info
  updateGroup: async (groupId: string, data: { name?: string; avatar?: string }) => {
    try {
      const response = await chatApi.updateGroup(groupId, data);
      const updatedGroup = response.data.data;

      set((state) => ({
        groups: state.groups.map((g) =>
          g._id === groupId ? { ...g, ...updatedGroup } : g
        ),
        activeGroup:
          state.activeGroup?._id === groupId
            ? { ...state.activeGroup, ...updatedGroup }
            : state.activeGroup,
      }));

      return true;
    } catch (error) {
      console.error('Failed to update group:', error);
      return false;
    }
  },

  // Add members to group
  addMembers: async (groupId: string, memberIds: number[]) => {
    try {
      const response = await chatApi.addGroupMembers(groupId, { memberIds });
      const updatedGroup = response.data.data;

      set((state) => ({
        groups: state.groups.map((g) =>
          g._id === groupId ? updatedGroup : g
        ),
        activeGroup:
          state.activeGroup?._id === groupId ? updatedGroup : state.activeGroup,
      }));

      return true;
    } catch (error) {
      console.error('Failed to add members:', error);
      return false;
    }
  },

  // Remove member from group
  removeMember: async (groupId: string, memberId: number) => {
    try {
      const response = await chatApi.removeGroupMember(groupId, memberId);
      const updatedGroup = response.data.data;

      set((state) => ({
        groups: state.groups.map((g) =>
          g._id === groupId ? updatedGroup : g
        ),
        activeGroup:
          state.activeGroup?._id === groupId ? updatedGroup : state.activeGroup,
      }));

      return true;
    } catch (error) {
      console.error('Failed to remove member:', error);
      return false;
    }
  },

  // Leave a group (any member can leave, admin can specify new admin)
  leaveGroup: async (groupId: string, newAdminId?: number) => {
    try {
      await chatApi.leaveGroup(groupId, newAdminId);

      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        activeGroup:
          state.activeGroup?._id === groupId ? null : state.activeGroup,
        messages: state.activeGroup?._id === groupId ? [] : state.messages,
      }));

      return true;
    } catch (error) {
      console.error('Failed to leave group:', error);
      return false;
    }
  },

  // Delete a group (admin only)
  deleteGroup: async (groupId: string) => {
    try {
      await chatApi.deleteGroup(groupId);

      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        activeGroup:
          state.activeGroup?._id === groupId ? null : state.activeGroup,
        messages: state.activeGroup?._id === groupId ? [] : state.messages,
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete group:', error);
      return false;
    }
  },

  // Send a message to the active group
  sendMessage: async (content: string, attachment?: MessageAttachment, mentions?: MessageMention[], mentionsAll?: boolean) => {
    const { activeGroup } = get();
    if (!activeGroup) return false;

    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return false;

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: GroupMessage = {
      _id: tempId,
      conversationId: activeGroup._id,
      senderId: currentUser.id,
      recipientId: null,
      content,
      status: 'sent',
      isGroupMessage: true,
      deliveredTo: [],
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachment: attachment || null,
      mentions: mentions || undefined,
      mentionsAll: mentionsAll || undefined,
    };

    // Add optimistic message immediately
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

    // Update group in list
    set((state) => ({
      groups: state.groups.map((g) =>
        g._id === activeGroup._id
          ? {
              ...g,
              lastMessage: lastMessagePreview,
              lastMessageSenderId: currentUser.id,
              lastMessageAt: optimisticMessage.createdAt,
            }
          : g
      ),
    }));

    // Send via WebSocket
    const result = await sendGroupMessage({
      tempId,
      groupId: activeGroup._id,
      content,
      attachment,
      mentions,
      mentionsAll,
    });

    if (!result.success) {
      // Remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      console.error('Failed to send group message:', result.error);
    }

    return result.success;
  },

  // Delete a message (for me or for everyone)
  deleteMessage: async (messageId: string, forEveryone: boolean) => {
    try {
      await chatApi.deleteMessage(messageId, forEveryone);

      if (forEveryone) {
        // Update message to show "This message was deleted"
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: '', attachment: null }
              : m
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

  // Set typing indicator
  setTyping: (isTyping: boolean) => {
    const { activeGroup } = get();
    if (!activeGroup) return;

    sendGroupTypingIndicator({
      groupId: activeGroup._id,
      isTyping,
    });
  },

  // Add system notification (e.g., "John joined", "Mary left")
  addSystemNotification: (notification) => {
    const id = `sys-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newNotification: SystemNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      systemNotifications: [...state.systemNotifications, newNotification],
    }));

    // Auto-clear after 5 seconds
    setTimeout(() => {
      set((state) => ({
        systemNotifications: state.systemNotifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },

  // Clear all system notifications for a group
  clearSystemNotifications: (groupId: string) => {
    set((state) => ({
      systemNotifications: state.systemNotifications.filter((n) => n.groupId !== groupId),
    }));
  },

  // Handle incoming group message
  handleIncomingGroupMessage: async (data: GroupMessageReceivedPayload) => {
    const { message, conversation } = data;
    const { activeGroup } = get();
    const currentUser = useAuthStore.getState().user;
    const isOwnMessage = message.senderId === currentUser?.id;

    // Prevent duplicates
    if (processedMessageIds.has(message._id)) {
      return;
    }

    processedMessageIds.add(message._id);
    if (processedMessageIds.size > MAX_PROCESSED_IDS) {
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

    // Track if this is for the active group
    const isActiveGroup = activeGroup?._id === conversation._id;

    // If this is the active group, add message and mark as read
    if (isActiveGroup) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
      // Mark as read since user is viewing this group
      markGroupMessagesAsRead(conversation._id);
    }

    // Optimistically increment unread for non-active groups (if not sent by us)
    const shouldIncrementUnread = !isActiveGroup && message.senderId !== currentUser?.id;

    // Update group metadata with optimistic unread count
    set((state) => {
      const existingIndex = state.groups.findIndex(
        (g) => g._id === conversation._id
      );

      if (existingIndex >= 0) {
        const updatedGroups = [...state.groups];
        const existing = updatedGroups[existingIndex];
        updatedGroups[existingIndex] = {
          ...existing,
          lastMessage: lastMessagePreview,
          lastMessageSenderId: message.senderId,
          lastMessageAt: message.createdAt,
          // Reset system message metadata since this is a regular message
          lastMessageSystemType: null,
          lastMessageTargetUserId: null,
          lastMessageActorUserId: null,
          // For active group, keep unreadCount at 0 (we just marked as read)
          // For inactive groups, optimistically increment
          ...(isActiveGroup
            ? { unreadCount: 0 }
            : shouldIncrementUnread
              ? { unreadCount: (existing.unreadCount || 0) + 1 }
              : {}),
        };

        // Move to top
        const [updated] = updatedGroups.splice(existingIndex, 1);
        return { groups: [updated, ...updatedGroups] };
      }

      // New group - add it with optimistic count
      return {
        groups: [
          {
            ...conversation,
            lastMessage: lastMessagePreview,
            lastMessageSenderId: message.senderId,
            lastMessageAt: message.createdAt,
            unreadCount: shouldIncrementUnread ? 1 : 0,
          },
          ...state.groups,
        ],
      };
    });

    // Only fetch fresh data from server if NOT the active group
    // For active group, we've already marked as read locally - fetching now would cause
    // a race condition (server might not have processed the read yet)
    if (!isActiveGroup) {
      get().fetchGroups();
    }
  },

  // Handle typing indicator
  handleGroupTyping: (data: GroupTypingIndicatorPayload) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const groupTyping = newTypingUsers.get(data.groupId) || new Set();

      if (data.isTyping) {
        groupTyping.add(data.senderId);
      } else {
        groupTyping.delete(data.senderId);
      }

      newTypingUsers.set(data.groupId, groupTyping);
      return { typingUsers: newTypingUsers };
    });
  },

  // Handle messages read notification
  handleGroupMessagesRead: (data: GroupMessagesReadPayload) => {
    const { activeGroup } = get();

    if (activeGroup?._id === data.groupId) {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (data.messageIds.includes(m._id)) {
            const existingReadBy = m.readBy || [];
            const alreadyRead = existingReadBy.some(
              (r) => r.userId === data.readByUserId
            );
            if (!alreadyRead) {
              return {
                ...m,
                readBy: [
                  ...existingReadBy,
                  { userId: data.readByUserId, timestamp: new Date().toISOString() },
                ],
              };
            }
          }
          return m;
        }),
      }));
    }
  },

  // Handle message delivered notification
  handleGroupMessageDelivered: (data: GroupMessageDeliveredPayload) => {
    const { activeGroup } = get();

    if (activeGroup?._id === data.groupId) {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m._id === data.messageId) {
            const existingDeliveredTo = m.deliveredTo || [];
            const alreadyDelivered = existingDeliveredTo.some(
              (d) => d.userId === data.deliveredToUserId
            );
            if (!alreadyDelivered) {
              return {
                ...m,
                deliveredTo: [
                  ...existingDeliveredTo,
                  {
                    userId: data.deliveredToUserId,
                    timestamp: new Date().toISOString(),
                  },
                ],
              };
            }
          }
          return m;
        }),
      }));
    }
  },

  // Handle group message deleted (real-time update when someone deletes for everyone)
  handleGroupMessageDeleted: (data: GroupMessageDeletedPayload) => {
    const { activeGroup } = get();

    // Update message to show as deleted if we're viewing this group
    if (activeGroup?._id === data.groupId) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === data.messageId
            ? { ...m, isDeleted: true, content: '', attachment: null }
            : m
        ),
      }));
    }
  },

  // Handle being added to a group (WhatsApp-style instant notification)
  handleGroupMemberAdded: (data: GroupMemberAddedPayload) => {
    if (data.group) {
      set((state) => {
        const exists = state.groups.some((g) => g._id === data.group!._id);
        if (exists) {
          return state;
        }
        // Add group with unreadCount: 1 (system message always exists on creation), fetchGroups will sync real count
        return {
          groups: [{ ...data.group!, unreadCount: 1 }, ...state.groups],
        };
      });
    }
    // Fetch fresh data from server to get accurate unread count
    get().fetchGroups();
  },

  // Handle being removed from a group
  handleGroupMemberRemoved: (data: GroupMemberRemovedPayload) => {
    set((state) => ({
      groups: state.groups.filter((g) => g._id !== data.groupId),
      activeGroup:
        state.activeGroup?._id === data.groupId ? null : state.activeGroup,
      messages:
        state.activeGroup?._id === data.groupId ? [] : state.messages,
    }));
  },

  // Handle member left event (for remaining members to update count in real-time)
  // WhatsApp behavior - members see count decrease instantly
  // Note: System messages are now permanent (stored in MongoDB) and delivered via handleGroupSystemMessage
  handleGroupMemberLeft: (data: GroupMemberLeftPayload) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g._id === data.groupId) {
          return {
            ...g,
            participants: g.participants.filter((p) => p !== data.leftUserId),
            members: g.members?.filter((m) => m.id !== data.leftUserId),
            // Update admin if changed
            groupAdmin: data.newAdminId ?? g.groupAdmin,
          };
        }
        return g;
      }),
      // Update active group if it's the one that changed
      activeGroup:
        state.activeGroup?._id === data.groupId
          ? {
              ...state.activeGroup,
              participants: state.activeGroup.participants.filter(
                (p) => p !== data.leftUserId
              ),
              members: state.activeGroup.members?.filter(
                (m) => m.id !== data.leftUserId
              ),
              groupAdmin: data.newAdminId ?? state.activeGroup.groupAdmin,
            }
          : state.activeGroup,
    }));

  },

  // Handle new members added (for existing members to see count increase)
  // WhatsApp behavior - members see count increase instantly
  // Note: System messages are now permanent (stored in MongoDB) and delivered via handleGroupSystemMessage
  handleGroupMembersAdded: (data: GroupMembersAddedPayload) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g._id === data.groupId ? { ...g, ...data.group } : g
      ),
      // Update active group if it's the one that changed
      activeGroup:
        state.activeGroup?._id === data.groupId
          ? { ...state.activeGroup, ...data.group }
          : state.activeGroup,
    }));
  },

  // Handle message confirmation (tempId → realId mapping)
  // This replaces the temporary ID with the real MongoDB ID after server confirms
  handleMessageConfirmed: (data: MessageConfirmedPayload) => {
    const { tempId, messageId, conversationId } = data;
    const { activeGroup, messages } = get();

    // Only update if this is for the active group and message exists
    const hasTempMessage = activeGroup?._id === conversationId && messages.some((m) => m._id === tempId);
    if (hasTempMessage) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === tempId ? { ...m, _id: messageId } : m
        ),
      }));
      // Mark as processed so chat:group_message doesn't create a duplicate.
      // Other sessions (multi-device) don't have the tempId and need to
      // receive the full message via chat:group_message instead.
      processedMessageIds.add(messageId);
    }
  },

  // Handle system message (WhatsApp-style permanent notifications)
  handleGroupSystemMessage: (data: GroupSystemMessagePayload) => {
    const { groupId, message } = data;
    const { activeGroup } = get();
    const currentUser = useAuthStore.getState().user;

    // Prevent duplicates
    if (processedMessageIds.has(message._id)) {
      return;
    }

    processedMessageIds.add(message._id);
    if (processedMessageIds.size > MAX_PROCESSED_IDS) {
      const iterator = processedMessageIds.values();
      for (let i = 0; i < 20; i++) {
        const oldest = iterator.next().value;
        if (oldest) processedMessageIds.delete(oldest);
      }
    }

    const isActiveGroup = activeGroup?._id === groupId;

    // If viewing this group, add message and mark as read
    if (isActiveGroup) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
      markGroupMessagesAsRead(groupId);
    }

    // Optimistically increment unread for non-active groups (if not sent by us)
    const shouldIncrementUnread = !isActiveGroup && message.senderId !== currentUser?.id;

    // Update group metadata (include embedded names from system message for real-time display)
    const updatedGroupMetadata = {
      lastMessage: message.content,
      lastMessageAt: message.createdAt,
      lastMessageSenderId: message.senderId,
      lastMessageSystemType: message.systemMessageType || null,
      lastMessageTargetUserId: message.targetUserId || null,
      lastMessageActorUserId: message.actorUserId || null,
      lastMessageActorName: message.actorName || null,
      lastMessageTargetName: message.targetName || null,
      ...(isActiveGroup ? { unreadCount: 0 } : {}),
    };

    set((state) => ({
      groups: state.groups.map((g) =>
        g._id === groupId
          ? {
              ...g,
              ...updatedGroupMetadata,
              ...(shouldIncrementUnread ? { unreadCount: (g.unreadCount || 0) + 1 } : {}),
            }
          : g
      ),
      activeGroup:
        state.activeGroup?._id === groupId
          ? { ...state.activeGroup, ...updatedGroupMetadata }
          : state.activeGroup,
    }));

    // Only fetch from server if NOT the active group (avoids race condition)
    if (!isActiveGroup) {
      get().fetchGroups();
    }
  },
}));
