'use client';

import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';

export function ChatToggleButton() {
  const toggleChat = useChatStore((s) => s.toggleChat);
  const isOpen = useChatStore((s) => s.isOpen);
  const directUnreadCount = useChatStore((s) => s.unreadCount);

  const groups = useGroupChatStore((s) => s.groups);
  const groupUnreadCount = useMemo(() => {
    return groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
  }, [groups]);

  const supportWaitingCount = useChatStore((s) => s.supportWaitingCount);
  const supportUnreadCount = useChatStore((s) => s.supportUnreadCount);
  const unreadCount = directUnreadCount + groupUnreadCount + supportWaitingCount + supportUnreadCount;

  const hasRole = useAuthStore((s) => s.hasRole);
  const chatAccessRoles = useChatStore((s) => s.chatConfig.chatAccessRoles);

  // Show chat only for roles defined in backend config
  const canAccessChat = chatAccessRoles.length > 0 && hasRole(chatAccessRoles as import('@/types').RoleSlug[]);

  // Hide FAB when chat window is open (floating window replaces it)
  if (!canAccessChat || isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Button
        data-chat-toggle
        onClick={toggleChat}
        icon={<MessageCircle className="w-6 h-6" />}
        className="!p-4 !rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
      />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
