'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { PageHeader, Pagination, LoadingSpinner } from '@/components/ui';
import { MessageAttachment } from '@/components/chat/MessageAttachment';
import { Avatar } from '@/components/ui';
import { Search, AlertCircle, MessageSquare, ChevronLeft, Users } from 'lucide-react';
import { chatApi } from '@/services/api';
import clsx from 'clsx';
import type { ChatMessage, ChatUser, MessageSender, ConversationInfo } from '@/types';

interface SearchResult {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
  messageSenders: Record<string, MessageSender>;
  conversationInfo: Record<string, ConversationInfo>;
}

function formatUTCDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = (utcToday - utcDate) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 'Today (UTC)';
  if (diffDays === 1) return 'Yesterday (UTC)';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function formatUTCTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes} UTC`;
}

function groupMessagesByDate(messages: ChatMessage[]): Record<string, ChatMessage[]> {
  const groups: Record<string, ChatMessage[]> = {};
  for (const msg of messages) {
    const key = new Date(msg.createdAt).toISOString().substring(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return groups;
}

function getUserDisplayName(user: ChatUser | MessageSender): string {
  const parts = [user.firstname, user.lastname].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return 'email' in user ? user.email : `User ${user.id}`;
}

function getSenderDisplayName(sender: MessageSender): string {
  const parts = [sender.firstname, sender.lastname].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : `User ${sender.id}`;
}

export default function CompliancePage() {
  // User list state
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected user & messages state
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const limit = 50;
  const totalPages = result ? Math.ceil(result.total / limit) : 0;

  // Load users filtered by compliance policy scope
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await chatApi.getComplianceScopedUsers();
        setUsers(res.data?.data || res.data || []);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosErr?.response?.status === 403) {
          setError(axiosErr.response.data?.detail || 'No active compliance policy found.');
        }
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getUserDisplayName(u).toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  // Fetch messages for selected user
  const fetchMessages = useCallback(async (userId: number, fetchPage = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await chatApi.getComplianceUserMessages(userId, fetchPage, limit);
      const data = res.data?.data || res.data;
      setResult({
        messages: data.messages || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
        messageSenders: data.messageSenders || {},
        conversationInfo: data.conversationInfo || {},
      });
      setPage(fetchPage);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = axiosErr?.response?.status;
      const detail = axiosErr?.response?.data?.detail;

      if (status === 403) {
        setError(detail || 'Access denied. You may not have an active compliance policy.');
      } else {
        setError(detail || 'Failed to fetch messages. Please try again.');
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user);
    setResult(null);
    setError(null);
    setPage(1);
    fetchMessages(user.id, 1);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setResult(null);
    setError(null);
  };

  const handlePageChange = (newPage: number) => {
    if (selectedUser) {
      fetchMessages(selectedUser.id, newPage);
    }
  };

  const dateGroups = result ? groupMessagesByDate(result.messages) : {};

  return (
    <DashboardLayout title="Compliance">
      <PageHeader
        title="Compliance Message Viewer"
        subtitle="Audited access to chat messages under your compliance policy"
      />

      {selectedUser ? (
        // ─── Message View ─────────────────────────────────────────
        <>
          {/* Selected user header */}
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </button>
              <Avatar
                src={selectedUser.profilePicture}
                name={getUserDisplayName(selectedUser)}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {getUserDisplayName(selectedUser)}
                </p>
                <p className="text-xs text-slate-500 dark:text-dark-muted">
                  {selectedUser.email}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="card p-4 mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="card p-8 flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2 text-sm text-slate-500">Loading messages...</span>
            </div>
          )}

          {/* Messages */}
          {result && !error && !isLoading && (
            <>
              {/* Stats */}
              <div className="card p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-dark-muted">
                    Showing <span className="font-medium">{result.messages.length}</span> of{' '}
                    <span className="font-medium">{result.total}</span> messages
                  </div>
                  {totalPages > 1 && (
                    <div className="text-sm text-slate-600 dark:text-dark-muted">
                      Page <span className="font-medium">{page}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </div>
                  )}
                </div>
              </div>

              {result.messages.length === 0 ? (
                <div className="card p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-dark-muted">No messages found for this user</p>
                </div>
              ) : (
                <div className="card p-4 mb-6">
                  <div className="space-y-4">
                    {Object.entries(dateGroups).map(([dateKey, msgs]) => (
                      <div key={dateKey}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <span className="text-xs font-medium text-slate-500 dark:text-dark-muted">
                              {formatUTCDate(msgs[0].createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="space-y-3">
                          {msgs.map((msg) => (
                            <ComplianceMessageBubble
                              key={msg._id}
                              message={msg}
                              senders={result!.messageSenders}
                              conversationInfo={result!.conversationInfo}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </>
      ) : (
        // ─── User List View ───────────────────────────────────────
        <>
          {/* Search users */}
          <div className="card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* User list */}
          {usersLoading ? (
            <div className="card p-8 flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2 text-sm text-slate-500">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="card p-8 text-center">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-dark-muted">
                {searchQuery ? 'No users match your search' : 'No users available'}
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-slate-200 dark:divide-dark-border">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Avatar
                    src={user.profilePicture}
                    name={getUserDisplayName(user)}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dark-muted truncate">
                      {user.email}
                    </p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-4">
            All message access is logged in the compliance audit trail
          </p>
        </>
      )}
    </DashboardLayout>
  );
}

// Read-only message bubble for compliance viewer
function ComplianceMessageBubble({
  message,
  senders,
  conversationInfo,
}: {
  message: ChatMessage;
  senders: Record<string, MessageSender>;
  conversationInfo: Record<string, ConversationInfo>;
}) {
  const hasAttachment = message.attachment && message.attachment.type;
  const hasText = message.content && message.content.trim().length > 0;

  const sender = senders[String(message.senderId)];
  const senderName = sender ? getSenderDisplayName(sender) : `User ${message.senderId}`;

  // Check if this message belongs to a group conversation
  const groupInfo = conversationInfo[message.conversationId];
  const isGroupMessage = !!groupInfo;

  // For DMs show recipient name, for groups show group name
  const recipient = !isGroupMessage && message.recipientId ? senders[String(message.recipientId)] : null;
  const recipientName = recipient ? getSenderDisplayName(recipient) : (!isGroupMessage && message.recipientId) ? `User ${message.recipientId}` : null;

  return (
    <div className="flex items-start gap-3">
      {/* Sender avatar */}
      <Avatar
        src={sender?.profilePicture}
        name={senderName}
        size="sm"
      />

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-medium text-slate-700 dark:text-dark-text">
            {senderName}
          </span>
          {isGroupMessage && (
            <span className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400">
              <Users className="w-3 h-3" />
              {groupInfo.groupName}
            </span>
          )}
          {recipientName && (
            <span className="text-xs text-slate-400 dark:text-dark-muted">
              → {recipientName}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-dark-muted">
            {formatUTCTime(message.createdAt)}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
          {/* Attachment */}
          {hasAttachment && (
            <div className={clsx(hasText && 'mb-2')}>
              <MessageAttachment attachment={message.attachment!} isOwn={false} />
            </div>
          )}

          {/* Text */}
          {hasText ? (
            <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : !hasAttachment ? (
            <p className="text-sm italic text-slate-400">[empty message]</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
