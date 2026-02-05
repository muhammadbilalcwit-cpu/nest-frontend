'use client';

import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { UserItem } from './UserItem';

interface ChatUserListProps {
  searchQuery: string;
}

export function ChatUserList({ searchQuery }: ChatUserListProps) {
  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const startConversation = useChatStore((s) => s.startConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const isLoading = useChatStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  const filteredUsers = chatableUsers.filter((u) => {
    // Don't show current user
    if (u.id === user?.id) return false;

    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(searchLower) ||
      (u.firstname?.toLowerCase() || '').includes(searchLower) ||
      (u.lastname?.toLowerCase() || '').includes(searchLower)
    );
  });

  // Sort: online users first
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aOnline = onlineUsers.has(a.id) ? 1 : 0;
    const bOnline = onlineUsers.has(b.id) ? 1 : 0;
    return bOnline - aOnline;
  });

  if (sortedUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 dark:text-dark-muted">
        <p className="text-sm">No users found</p>
        {!searchQuery && (
          <p className="text-xs mt-1">No department members available</p>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-dark-border">
      {sortedUsers.map((chatUser) => (
        <UserItem
          key={chatUser.id}
          user={chatUser}
          isOnline={onlineUsers.has(chatUser.id)}
          isLoading={isLoading}
          onClick={() => startConversation(chatUser.id)}
        />
      ))}
    </div>
  );
}
