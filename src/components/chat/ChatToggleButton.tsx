'use client';

import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import clsx from 'clsx';
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

  const unreadCount = directUnreadCount + groupUnreadCount;

  const hasRole = useAuthStore((s) => s.hasRole);

  // Only show for managers and users (not admins)
  const canAccessChat = hasRole(['manager', 'user']);

  if (!canAccessChat) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Button
        data-chat-toggle
        onClick={toggleChat}
        icon={<MessageCircle className="w-6 h-6" />}
        className={clsx(
          '!p-4 !rounded-full shadow-lg transition-all',
          'hover:scale-105 active:scale-95',
          isOpen && '!bg-slate-600 hover:!bg-slate-700'
        )}
      />

      {/* Unread badge */}
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
