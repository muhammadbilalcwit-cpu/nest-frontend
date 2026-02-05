'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import clsx from 'clsx';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { IconActionButton, Badge, Avatar } from '@/components/ui';
import { ChatTabs } from './ChatTabs';
import { ChatWindow } from './ChatWindow';
import { GroupChatWindow } from './GroupChatWindow';
import { GroupInfoModal } from './GroupInfoModal';

type ChatView = 'list' | 'chat' | 'group';

export function ChatSidebar() {
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const isOpen = useChatStore((s) => s.isOpen);
  const closeChat = useChatStore((s) => s.closeChat);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const initializeChat = useChatStore((s) => s.initializeChat);
  const cleanupChat = useChatStore((s) => s.cleanupChat);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const activeGroup = useGroupChatStore((s) => s.activeGroup);
  const clearActiveGroup = useGroupChatStore((s) => s.clearActiveGroup);
  const cleanupGroupChat = useGroupChatStore((s) => s.cleanupGroupChat);

  const hasRole = useAuthStore((s) => s.hasRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const hasOpenOverlay = useUIStore((s) => s.hasOpenOverlay);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Only show chat for managers and users (not admins)
  const canAccessChat = hasRole(['manager', 'user']);

  // Determine current view based on active conversation or group
  const currentView: ChatView = activeGroup
    ? 'group'
    : activeConversation
      ? 'chat'
      : 'list';

  // Initialize chat when authenticated and can access
  useEffect(() => {
    if (isAuthenticated && canAccessChat) {
      initializeChat();
    }

    return () => {
      cleanupChat();
      cleanupGroupChat();
    };
  }, [isAuthenticated, canAccessChat, initializeChat, cleanupChat, cleanupGroupChat]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeChat]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if any overlay (lightbox/modal) is open
      if (hasOpenOverlay()) return;

      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        // Don't close if clicking on the chat toggle button
        const target = e.target as HTMLElement;
        if (target.closest('[data-chat-toggle]')) return;

        closeChat();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeChat, hasOpenOverlay]);

  if (!canAccessChat) {
    return null;
  }

  // Handle back button click
  const handleBack = () => {
    if (activeGroup) {
      clearActiveGroup();
    } else if (activeConversation) {
      useChatStore.setState({ activeConversation: null });
    }
  };

  const otherUser = activeConversation?.otherUser;
  const displayName = otherUser
    ? `${otherUser.firstname || ''} ${otherUser.lastname || ''}`.trim() || otherUser.email
    : '';

  // Render header content based on view
  const renderHeader = () => {
    if (activeGroup) {
      return (
        <>
          <IconActionButton
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={handleBack}
            className="!p-1.5"
          />
          {activeGroup.groupAvatar ? (
            <Avatar
              src={activeGroup.groupAvatar}
              name={activeGroup.groupName}
              size="sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setShowGroupInfo(true)}
            className="flex flex-col text-left hover:opacity-80 transition-opacity"
          >
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {activeGroup.groupName}
            </span>
            <span className="text-xs text-slate-500 dark:text-dark-muted">
              {activeGroup.participants?.length || 0} members • Tap for info
            </span>
          </button>
        </>
      );
    }

    if (otherUser) {
      return (
        <>
          <IconActionButton
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={handleBack}
            className="!p-1.5"
          />
          <Avatar
            src={otherUser.profilePicture}
            name={displayName}
            size="sm"
            isOnline={onlineUsers.has(otherUser.id)}
          />
          <span className="font-semibold text-slate-900 dark:text-white">
            {displayName}
          </span>
        </>
      );
    }

    return (
      <>
        <MessageCircle className="w-5 h-5 text-primary-600" />
        <span className="font-semibold text-slate-900 dark:text-white">
          Messages
        </span>
        {unreadCount > 0 && (
          <Badge label={String(unreadCount)} variant="primary" />
        )}
      </>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Chat Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={clsx(
          'fixed right-0 top-0 h-full w-96 bg-white dark:bg-dark-card',
          'border-l border-slate-200 dark:border-dark-border',
          'shadow-xl z-50 flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-3">{renderHeader()}</div>
          <IconActionButton
            icon={<X className="w-5 h-5" />}
            onClick={closeChat}
            className="!p-1.5"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'group' ? (
            <GroupChatWindow />
          ) : currentView === 'chat' ? (
            <ChatWindow />
          ) : (
            <div className="h-full flex flex-col">
              <ChatTabs />
            </div>
          )}
        </div>
      </div>

      {/* Group Info Modal */}
      {showGroupInfo && activeGroup && (
        <GroupInfoModal
          group={activeGroup}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  );
}
