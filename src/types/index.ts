export interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  profilePicture?: string | null;
  role?: Role | string;
  roles?: (Role | string)[];
  department?: Department;
  company?: Company;
  isActive?: boolean;
  deactivatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
}

export interface Company {
  id: number;
  name: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: number;
  name: string;
  company?: Company;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  userId: number;
  username: string;
  companyId: number | null;
  ipAddress: string;
  api: string;
  method: string;
  reason: string;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  roles: string[];
  departmentId?: number;
  companyId?: number;
}

// New notification format (from database)
export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  actorId: number | null;
  actorEmail: string | null;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
}

export interface UnreadNotificationsPayload {
  notifications: NotificationPayload[];
  count: number;
}

export interface PaginatedNotifications {
  notifications: NotificationPayload[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  message: string;
  status_code: number;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginationMeta;
}

export type RoleSlug = 'super_admin' | 'company_admin' | 'manager' | 'user';

// Session details for each active session
export interface SessionDetails {
  id: number;
  browser: string;
  os: string;
  ipAddress: string | null;
  loginAt: string;
  lastActivityAt: string;
}

// Online user with their sessions (NEW - only online users shown)
export interface OnlineUserWithSessions {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  sessions: SessionDetails[];
}

// Legacy: Online user status (kept for backward compatibility)
export interface OnlineUserInfo {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  isOnline: boolean;
}

// Real-time user status change event payload
export interface UserStatusPayload {
  userId: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  isOnline: boolean;
  companyId: number;
}

// Real-time session added event payload
export interface SessionAddedPayload {
  sessionId: number;
  userId: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  browser: string;
  os: string;
  ipAddress: string | null;
  loginAt: string;
  lastActivityAt: string;
  companyId: number;
}

// Real-time session removed event payload
export interface SessionRemovedPayload {
  sessionId: number;
  userId: number;
  companyId: number;
}

// Real-time session expired event payload
export interface SessionExpiredPayload {
  sessionId: number;
  reason: 'expired' | 'revoked' | 'logout';
  message: string;
}

// Response for company admin - only online users with sessions
export interface OnlineUsersWithSessionsResponse {
  users: OnlineUserWithSessions[];
  onlineUsers: number;
  totalSessions: number;
}

// Legacy response type (kept for backward compatibility)
export interface CompanyUsersStatusResponse {
  users: OnlineUserInfo[];
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

export interface RevokeSessionResponse {
  userId: number;
  sessionsInvalidated: boolean;
  socketsDisconnected: number;
}

export interface RevokeSpecificSessionResponse {
  sessionId: number;
  userId: number;
  socketsDisconnected: number;
}

// Company status for super_admin view
export interface CompanyStatus {
  id: number;
  name: string;
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

export interface AllCompaniesStatusResponse {
  companies: CompanyStatus[];
  totalCompanies: number;
  totalUsers: number;
  totalOnline: number;
  totalOffline: number;
}

// Response for super_admin drill-down - only online users with sessions
export interface CompanyUsersWithSessionsResponse {
  company: { id: number; name: string };
  users: OnlineUserWithSessions[];
  onlineUsers: number;
  totalSessions: number;
}

// Legacy response type (kept for backward compatibility)
export interface CompanyUsersDetailResponse {
  company: { id: number; name: string };
  users: OnlineUserInfo[];
  totalUsers: number;
  onlineCount: number;
  offlineCount: number;
}

// ─── Mutation Input Types ─────────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  departmentId?: number;
  companyId?: number;
  roleSlug?: string;
}

export interface UpdateUserInput {
  firstname?: string;
  lastname?: string;
  password?: string;
  departmentId?: number;
  roleSlug?: string;
}

export interface UpdateProfileInput {
  firstname?: string;
  lastname?: string;
  password?: string;
  currentPassword?: string;
}

export interface CreateDepartmentInput {
  name: string;
  companyId: number;
}

export interface UpdateInput<T> {
  id: number;
  data: Partial<T>;
}

export interface RevokeCompanySessionInput {
  companyId: number;
  sessionId: number;
}

// ─── Query Parameter Types ────────────────────────────────────────────────────

export interface ActivityLogsParams {
  page?: number;
  limit?: number;
  method?: string;
  search?: string;
}

// ─── Compliance Types ─────────────────────────────────────────────────────────

export interface MessageSender {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profilePicture: string | null;
}

export interface ConversationInfo {
  groupName: string;
  groupAvatar: string | null;
  isGroup: boolean;
}

// ─── Chat Types ────────────────────────────────────────────────────────────────

export interface ChatUser {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  profilePicture: string | null;
  isOnline?: boolean;
}

export interface ChatConversation {
  _id: string;
  participants: number[];
  lastMessage: string | null;
  lastMessageSenderId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  otherUser?: ChatUser;
  unreadCount?: number;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

// Mention types for chat messages (WhatsApp-style)
export interface MessageMention {
  userId: number;
  displayName: string;
  position: number;
  length: number;
}

// Attachment types for chat messages (WhatsApp-style)
export type AttachmentType = 'image' | 'video' | 'document' | 'voice';

export interface MessageAttachment {
  type: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  originalFilename: string;
  size: number;
  mimeType: string;
  duration?: number; // seconds (for voice/video)
  waveform?: number[]; // Voice note visualization
  width?: number; // Image/video dimensions
  height?: number;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: number;
  recipientId: number;
  content: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedFor?: number[];
  deletedAt?: string | null;
  attachment?: MessageAttachment | null;
  mentions?: MessageMention[];
}

export interface ChatMessageDeletedPayload {
  messageId: string;
  conversationId: string;
}

export interface SendMessagePayload {
  tempId: string;
  recipientId: number;
  content: string;
  attachment?: MessageAttachment;
  mentions?: MessageMention[];
}

export interface TypingPayload {
  recipientId: number;
  isTyping: boolean;
}

export interface ChatMessageReceived {
  message: ChatMessage;
  conversation: ChatConversation;
}

/**
 * Payload for message confirmation event
 * Maps frontend tempId to real MongoDB ID after save
 */
export interface MessageConfirmedPayload {
  tempId: string;
  messageId: string;
  conversationId: string;
}

export interface ChatStatusUpdatePayload {
  conversationId: string;
  status: 'delivered' | 'read';
  messageIds: string[];
  readBy?: number;
}

export interface ChatUnreadPayload {
  messages: ChatMessage[];
  count: number;
}

// ─── Group Chat Types ──────────────────────────────────────────────────────────

export interface GroupMember {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profilePicture?: string | null;
  isOnline?: boolean;
}

export interface GroupConversation {
  _id: string;
  participants: number[];
  isGroup: true;
  groupName: string;
  groupAvatar: string | null;
  groupAdmin: number;
  companyId: number;
  lastMessage: string | null;
  lastMessageSenderId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  unreadCount?: number;
  memberJoinedAt?: Record<string, string>; // Maps memberId to join timestamp
  // System message metadata for lastMessage (to display "you" in previews)
  lastMessageSystemType?: SystemMessageType | null;
  lastMessageTargetUserId?: number | null;
  lastMessageActorUserId?: number | null;
  lastMessageActorName?: string | null;
  lastMessageTargetName?: string | null;
}

/**
 * System Message Types - WhatsApp-style inline notifications
 */
export type SystemMessageType =
  | 'member_added'    // "Admin added John"
  | 'member_removed'  // "Admin removed John"
  | 'member_left'     // "John left"
  | 'admin_changed'   // "John is now the admin"
  | 'group_created';  // "Group created by Admin"

export interface GroupMessage {
  _id: string;
  conversationId: string;
  senderId: number;
  recipientId: null;
  content: string;
  status: MessageStatus;
  isGroupMessage: true;
  deliveredTo: Array<{ userId: number; timestamp: string }>;
  readBy: Array<{ userId: number; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedFor?: number[];
  deletedAt?: string | null;
  // System message fields (WhatsApp-style)
  isSystemMessage?: boolean;
  systemMessageType?: SystemMessageType;
  targetUserId?: number | null;
  actorUserId?: number | null;
  actorName?: string | null;
  targetName?: string | null;
  // Attachment field
  attachment?: MessageAttachment | null;
  // Mentions fields
  mentions?: MessageMention[];
  mentionsAll?: boolean;
}

export interface CreateGroupPayload {
  name: string;
  memberIds: number[];
  avatar?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  avatar?: string;
}

export interface AddGroupMembersPayload {
  memberIds: number[];
}

export interface SendGroupMessagePayload {
  tempId: string;
  groupId: string;
  content: string;
  attachment?: MessageAttachment;
  mentions?: MessageMention[];
  mentionsAll?: boolean;
}

export interface GroupTypingPayload {
  groupId: string;
  isTyping: boolean;
}

export interface GroupMessageReceivedPayload {
  message: GroupMessage;
  conversation: GroupConversation;
}

export interface GroupMemberAddedPayload {
  groupId: string;
  group?: GroupConversation; // Full group data for instant display (WhatsApp-style)
}

export interface GroupMemberRemovedPayload {
  groupId: string;
}

// When a member leaves or is removed - notifies remaining members
export interface GroupMemberLeftPayload {
  groupId: string;
  leftUserId: number;
  newAdminId?: number; // If admin left and a new admin was assigned
}

// When new members are added - notifies existing members
export interface GroupMembersAddedPayload {
  groupId: string;
  newMemberIds: number[];
  group: GroupConversation; // Updated group data with new members
}

// When group info is updated (name, avatar)
export interface GroupUpdatedPayload {
  group: GroupConversation;
}

export interface GroupMessagesReadPayload {
  groupId: string;
  readByUserId: number;
  messageIds: string[];
}

export interface GroupMessageDeliveredPayload {
  groupId: string;
  messageId: string;
  deliveredToUserId: number;
}

export interface GroupMessageDeletedPayload {
  groupId: string;
  messageId: string;
}

export interface GroupTypingIndicatorPayload {
  groupId: string;
  senderId: number;
  isTyping: boolean;
}

export interface GroupMessageInfo {
  deliveredTo: Array<{
    userId: number;
    timestamp: string;
    user: { firstname: string | null; lastname: string | null; profilePicture: string | null } | null;
  }>;
  readBy: Array<{
    userId: number;
    timestamp: string;
    user: { firstname: string | null; lastname: string | null; profilePicture: string | null } | null;
  }>;
  pending: Array<{
    userId: number;
    user: { firstname: string | null; lastname: string | null; profilePicture: string | null } | null;
  }>;
}

/**
 * System message socket event payload (WhatsApp-style inline notifications)
 */
export interface GroupSystemMessagePayload {
  groupId: string;
  message: GroupMessage;
}
