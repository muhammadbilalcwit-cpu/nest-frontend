'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { ChatConversationList } from './ChatConversationList';
import { ChatUserList } from './ChatUserList';
import { GroupList } from './GroupList';
import { SupportQueueList } from './SupportQueueList';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useAuthStore } from '@/stores/auth.store';

type TabType = 'conversations' | 'groups' | 'users' | 'support';

interface ChatTabsProps {
  onTabChange?: (tab: TabType) => void;
}

export { type TabType };

export function ChatTabs({ onTabChange }: ChatTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const directUnreadCount = useChatStore((s) => s.unreadCount);
  const groups = useGroupChatStore((s) => s.groups);
  const initializeGroupChat = useGroupChatStore((s) => s.initializeGroupChat);
  const supportWaitingCount = useChatStore((s) => s.supportWaitingCount);
  const supportUnreadCount = useChatStore((s) => s.supportUnreadCount);
  const supportBadgeCount = supportWaitingCount + supportUnreadCount;
  const hasRole = useAuthStore((s) => s.hasRole);

  // Customers only see Chats tab (no Groups, Users, Support)
  const isCustomer = hasRole('customer');

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
      case 'support':
        return 'Search customers...';
    }
  };

  return (
    <>
      {/* Tab buttons */}
      <div className="flex h-14 border-b border-slate-200 dark:border-dark-border px-2 pt-1.5 pb-0.5">
        <button
          onClick={() => handleTabChange('conversations')}
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
        {!isCustomer && (
          <>
            <button
              onClick={() => handleTabChange('groups')}
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
              onClick={() => handleTabChange('users')}
              className={clsx(
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === 'users'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted'
              )}
            >
              Users
            </button>
            <button
              onClick={() => handleTabChange('support')}
              className={clsx(
                'flex-1 py-3 text-sm font-medium transition-colors relative inline-flex items-center justify-center gap-1',
                activeTab === 'support'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700 dark:text-dark-muted'
              )}
            >
              Support
              {supportBadgeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-red-500 text-white rounded-full">
                  {supportBadgeCount > 99 ? '99+' : supportBadgeCount}
                </span>
              )}
            </button>
          </>
        )}
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
        {activeTab === 'support' && <SupportQueueList searchQuery={searchQuery} />}
      </div>
    </>
  );
}
