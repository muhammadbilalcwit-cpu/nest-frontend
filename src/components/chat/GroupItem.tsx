'use client';

import { useState, useMemo } from 'react';
import { LogOut, Users } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, Button, Badge } from '@/components/ui';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import type { GroupConversation, SystemMessageType } from '@/types';

interface GroupItemProps {
  group: GroupConversation;
  currentUserId: number;
  onClick: () => void;
  onLeave: () => Promise<boolean>;
  isLeaving: boolean;
}

export function GroupItem({
  group,
  currentUserId,
  onClick,
  onLeave,
  isLeaving,
}: GroupItemProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const groupTypingUsers = useGroupChatStore((s) => s.typingUsers);
  const typingInGroup = groupTypingUsers.get(group._id);
  const isTyping = typingInGroup && typingInGroup.size > 0;

  const getTypingUserName = (userId: number): string => {
    const user = chatableUsers.find((u) => u.id === userId);
    if (user) return `${user.firstname || ''}`.trim() || 'Someone';
    const member = group.members?.find((m) => m.id === userId);
    if (member) return `${member.firstname || ''}`.trim() || 'Someone';
    return 'Someone';
  };

  const isUnread = (group.unreadCount || 0) > 0;
  const isSentByMe = group.lastMessageSenderId === currentUserId;
  const isAdmin = group.groupAdmin === currentUserId;
  const memberCount = group.participants?.length || 0;

  // Generate display text for system message preview (shows "you" for current user)
  const getLastMessageText = useMemo((): string => {
    // Get user name by ID — check chatableUsers first, then group members, then embedded names from API
    const getUserName = (userId: number, embeddedName?: string | null): string => {
      const user = chatableUsers.find((u) => u.id === userId);
      if (user) return `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown';
      const member = group.members?.find((m) => m.id === userId);
      if (member) return `${member.firstname || ''} ${member.lastname || ''}`.trim() || 'Unknown';
      // Fallback to embedded name from API (handles former members, cross-company users)
      return embeddedName || 'Unknown';
    };

    const { lastMessageSystemType, lastMessageTargetUserId, lastMessageActorUserId, lastMessage,
            lastMessageActorName, lastMessageTargetName } = group;

    // If not a system message, return original
    if (!lastMessageSystemType || !lastMessageTargetUserId) {
      return lastMessage || `${memberCount} members`;
    }

    const isTargetCurrentUser = lastMessageTargetUserId === currentUserId;
    const isActorCurrentUser = lastMessageActorUserId === currentUserId;

    const targetName = isTargetCurrentUser ? 'you' : getUserName(lastMessageTargetUserId, lastMessageTargetName);
    const actorName = lastMessageActorUserId
      ? (isActorCurrentUser ? 'You' : getUserName(lastMessageActorUserId, lastMessageActorName))
      : '';

    switch (lastMessageSystemType as SystemMessageType) {
      case 'member_added':
        return `${actorName} added ${targetName}`;
      case 'member_removed':
        return `${actorName} removed ${targetName}`;
      case 'member_left':
        return isTargetCurrentUser ? 'You left' : `${targetName} left`;
      case 'admin_changed':
        return isTargetCurrentUser ? 'You are now the admin' : `${targetName} is now the admin`;
      case 'group_created':
        return isActorCurrentUser ? 'You created this group' : `${actorName} created this group`;
      default:
        return lastMessage || `${memberCount} members`;
    }
  }, [group, currentUserId, chatableUsers, memberCount]);

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await onLeave();
    setShowLeaveConfirm(false);

    if (!success) {
      toast.error('Failed to leave group');
    }
  };

  const handleCancelLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLeaveConfirm(false);
  };

  return (
    <div className="relative group/item">
      <button
        onClick={onClick}
        className={clsx(
          'w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left',
          isUnread && 'bg-primary-50 dark:bg-primary-900/20'
        )}
      >
        {/* Group Avatar */}
        <div className="relative">
          {group.groupAvatar ? (
            <Avatar src={group.groupAvatar} name={group.groupName} size="lg" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={clsx(
                  'font-medium truncate',
                  isUnread
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-dark-text'
                )}
              >
                {group.groupName}
              </span>
              {isAdmin && (
                <span className="text-xs text-primary-600 dark:text-primary-400 flex-shrink-0">
                  Admin
                </span>
              )}
            </div>
            {group.lastMessageAt && (
              <span className="text-xs text-slate-400 dark:text-dark-muted flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(group.lastMessageAt), {
                  addSuffix: false,
                })}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {isTyping ? (
              <p className="text-sm truncate text-green-500 dark:text-green-400 italic">
                {typingInGroup!.size === 1
                  ? `${getTypingUserName(Array.from(typingInGroup!)[0])} is typing...`
                  : `${typingInGroup!.size} people are typing...`}
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
                {isSentByMe && !group.lastMessageSystemType && 'You: '}
                {getLastMessageText}
              </p>
            )}
            {isUnread && (
              <Badge
                label={String(group.unreadCount)}
                variant="primary"
                className="ml-2 flex-shrink-0"
              />
            )}
          </div>
        </div>
      </button>

      {/* Leave button - shows on hover for all users */}
      {!showLeaveConfirm && (
        <button
          onClick={handleLeaveClick}
          disabled={isLeaving}
          className="absolute right-2 bottom-2 p-1.5 rounded-full
            opacity-0 group-hover/item:opacity-100 transition-opacity
            bg-white dark:bg-slate-700 shadow-sm
            hover:bg-red-100 dark:hover:bg-red-900/30
            text-slate-400 hover:text-red-500 dark:hover:text-red-400"
          title="Leave group"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/95 flex items-center justify-center gap-2 px-4">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {isAdmin ? 'Leave group?' : 'Leave group?'}
          </span>
          <Button
            variant="danger"
            onClick={handleConfirmLeave}
            disabled={isLeaving}
            className="!px-3 !py-1 !text-sm"
          >
            {isLeaving ? 'Leaving...' : 'Yes'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancelLeave}
            disabled={isLeaving}
            className="!px-3 !py-1 !text-sm"
          >
            No
          </Button>
        </div>
      )}
    </div>
  );
}
