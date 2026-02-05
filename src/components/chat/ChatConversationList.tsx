'use client';

import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { ConversationItem } from './ConversationItem';

interface ChatConversationListProps {
  searchQuery: string;
}

export function ChatConversationList({ searchQuery }: ChatConversationListProps) {
  const conversations = useChatStore((s) => s.conversations);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const isDeleting = useChatStore((s) => s.isDeleting);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const otherUser = conv.otherUser;
    if (!otherUser) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      otherUser.email.toLowerCase().includes(searchLower) ||
      (otherUser.firstname?.toLowerCase() || '').includes(searchLower) ||
      (otherUser.lastname?.toLowerCase() || '').includes(searchLower)
    );
  });

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 dark:text-dark-muted">
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start a chat from the Users tab</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-dark-border">
      {filteredConversations.map((conversation) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          isOnline={onlineUsers.has(conversation.otherUser?.id || 0)}
          currentUserId={user?.id || 0}
          onClick={() => selectConversation(conversation)}
          onDelete={() => deleteConversation(conversation._id)}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}
