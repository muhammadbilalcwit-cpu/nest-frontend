'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, Button, Badge } from '@/components/ui';
import { useChatStore } from '@/stores/chat.store';
import type { ChatConversation } from '@/types';

interface ConversationItemProps {
  conversation: ChatConversation;
  isOnline: boolean;
  currentUserId: number;
  onClick: () => void;
  onDelete: () => Promise<boolean>;
  isDeleting: boolean;
}

export function ConversationItem({
  conversation,
  isOnline,
  currentUserId,
  onClick,
  onDelete,
  isDeleting,
}: ConversationItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const otherUser = conversation.otherUser;
  const isTyping = otherUser ? typingUsers.has(otherUser.id) : false;
  const displayName = otherUser
    ? `${otherUser.firstname || ''} ${otherUser.lastname || ''}`.trim() || otherUser.email
    : 'Unknown User';

  const isUnread = (conversation.unreadCount || 0) > 0;
  const isSentByMe = conversation.lastMessageSenderId === currentUserId;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await onDelete();
    setShowDeleteConfirm(false);

    if (!success) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={clsx(
          'w-full px-4 py-3 flex items-start gap-3 transition-all text-left border-l-2',
          isUnread
            ? 'bg-primary-50/60 dark:bg-primary-900/15 border-l-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/25'
            : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
        )}
      >
        {/* Avatar */}
        <Avatar
          src={otherUser?.profilePicture}
          name={displayName}
          size="lg"
          isOnline={isOnline}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                'font-medium truncate',
                isUnread
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-dark-text'
              )}
            >
              {displayName}
            </span>
            {conversation.lastMessageAt && (
              <span className="text-xs text-slate-400 dark:text-dark-muted flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                  addSuffix: false,
                })}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {isTyping ? (
              <p className="text-sm truncate text-primary-500 dark:text-primary-400 italic font-medium">
                typing...
              </p>
            ) : (
              <p
                className={clsx(
                  'text-sm truncate',
                  isUnread
                    ? 'text-slate-700 dark:text-dark-text font-medium'
                    : 'text-slate-500 dark:text-dark-muted'
                )}
              >
                {isSentByMe && 'You: '}
                {conversation.lastMessage || 'No messages yet'}
              </p>
            )}
            {isUnread && (
              <Badge
                label={String(conversation.unreadCount)}
                variant="primary"
                className="ml-2 flex-shrink-0"
              />
            )}
          </div>
        </div>
      </button>

      {/* Delete button - shows on hover */}
      {!showDeleteConfirm && (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="absolute right-2 bottom-2 p-1.5 rounded-full
            opacity-0 group-hover:opacity-100 transition-opacity
            bg-white dark:bg-slate-700 shadow-sm
            hover:bg-red-100 dark:hover:bg-red-900/30
            text-slate-400 hover:text-red-500 dark:hover:text-red-400"
          title="Delete conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 flex items-center justify-center gap-2 px-4">
          <span className="text-sm text-slate-600 dark:text-slate-300">Delete?</span>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="!px-3 !py-1 !text-sm"
          >
            {isDeleting ? 'Deleting...' : 'Yes'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancelDelete}
            disabled={isDeleting}
            className="!px-3 !py-1 !text-sm"
          >
            No
          </Button>
        </div>
      )}
    </div>
  );
}
