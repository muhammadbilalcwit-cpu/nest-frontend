'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { ChatConversationList } from './ChatConversationList';
import { ChatUserList } from './ChatUserList';
import { GroupList } from './GroupList';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';

type TabType = 'conversations' | 'groups' | 'users';

export function ChatTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [searchQuery, setSearchQuery] = useState('');

  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const directUnreadCount = useChatStore((s) => s.unreadCount);
  const groups = useGroupChatStore((s) => s.groups);
  const initializeGroupChat = useGroupChatStore((s) => s.initializeGroupChat);

  const groupUnreadCount = useMemo(() => {
    return groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
  }, [groups]);

  // Initialize group chat when component mounts
  useEffect(() => {
    if (chatableUsers.length > 0) {
      initializeGroupChat(chatableUsers);
    }
  }, [chatableUsers, initializeGroupChat]);

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'conversations':
        return 'Search chats...';
      case 'groups':
        return 'Search groups...';
      case 'users':
        return 'Search users...';
    }
  };

  return (
    <>
      {/* Tab buttons */}
      <div className="flex border-b border-slate-200 dark:border-dark-border">
        <button
          onClick={() => setActiveTab('conversations')}
          className={clsx(
            'flex-1 py-3 text-sm font-medium transition-colors relative',
            activeTab === 'conversations'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted'
          )}
        >
          Chats
          {directUnreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-red-500 text-white rounded-full">
              {directUnreadCount > 99 ? '99+' : directUnreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={clsx(
            'flex-1 py-3 text-sm font-medium transition-colors relative',
            activeTab === 'groups'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted'
          )}
        >
          Groups
          {groupUnreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-red-500 text-white rounded-full">
              {groupUnreadCount > 99 ? '99+' : groupUnreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={clsx(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted'
          )}
        >
          Users
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 dark:border-dark-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={getPlaceholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800
                       border-0 rounded-lg focus:ring-2 focus:ring-primary-500
                       placeholder:text-slate-400 dark:placeholder:text-dark-muted"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'conversations' && (
          <ChatConversationList searchQuery={searchQuery} />
        )}
        {activeTab === 'groups' && <GroupList searchQuery={searchQuery} />}
        {activeTab === 'users' && <ChatUserList searchQuery={searchQuery} />}
      </div>
    </>
  );
}
