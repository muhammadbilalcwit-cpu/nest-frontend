'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, ArrowLeft, Users, Minus, X, Maximize2, PanelRight } from 'lucide-react';
import clsx from 'clsx';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { IconActionButton, Badge, Avatar } from '@/components/ui';
import { ChatTabs } from './ChatTabs';
import { ChatWindow } from './ChatWindow';
import { GroupChatWindow } from './GroupChatWindow';
import { GroupInfoModal } from './GroupInfoModal';

type ChatView = 'list' | 'chat' | 'group';
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;

export function ChatSidebar() {
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const isOpen = useChatStore((s) => s.isOpen);
  const closeChat = useChatStore((s) => s.closeChat);
  const windowMode = useChatStore((s) => s.windowMode);
  const setWindowMode = useChatStore((s) => s.setWindowMode);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const fetchChatConfig = useChatStore((s) => s.fetchChatConfig);
  const initializeChat = useChatStore((s) => s.initializeChat);
  const cleanupChat = useChatStore((s) => s.cleanupChat);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const activeGroup = useGroupChatStore((s) => s.activeGroup);
  const clearActiveGroup = useGroupChatStore((s) => s.clearActiveGroup);
  const cleanupGroupChat = useGroupChatStore((s) => s.cleanupGroupChat);
  const groups = useGroupChatStore((s) => s.groups);

  const groupUnreadCount = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const totalUnreadCount = unreadCount + groupUnreadCount;

  const hasRole = useAuthStore((s) => s.hasRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const windowRef = useRef<HTMLDivElement>(null);

  // Drag state (refs to avoid re-renders during drag)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const positionRef = useRef<{ x: number; y: number } | null>(null);

  // Resize state
  const isResizingRef = useRef(false);
  const resizeDirectionRef = useRef<ResizeDirection>('se');
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, left: 0, top: 0 });

  // Show chat only for roles defined in backend config
  const chatAccessRoles = useChatStore((s) => s.chatConfig.chatAccessRoles);
  const canAccessChat = chatAccessRoles.length > 0 && hasRole(chatAccessRoles as import('@/types').RoleSlug[]);

  // Determine current view based on active conversation or group
  const currentView: ChatView = activeGroup
    ? 'group'
    : activeConversation
      ? 'chat'
      : 'list';

  // Fetch chat config as soon as authenticated (independent of canAccessChat)
  useEffect(() => {
    if (isAuthenticated) {
      fetchChatConfig();
    }
  }, [isAuthenticated, fetchChatConfig]);

  // Initialize chat only after config confirms access
  useEffect(() => {
    if (isAuthenticated && canAccessChat) {
      initializeChat();
    }

    return () => {
      cleanupChat();
      cleanupGroupChat();
    };
  }, [isAuthenticated, canAccessChat, initializeChat, cleanupChat, cleanupGroupChat]);

  // Minimize on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeChat]);

  // Reset position and inline styles when chat opens or window mode changes
  useEffect(() => {
    if (windowRef.current) {
      positionRef.current = null;
      windowRef.current.style.left = '';
      windowRef.current.style.top = '';
      windowRef.current.style.right = '';
      windowRef.current.style.bottom = '';
      windowRef.current.style.width = '';
      windowRef.current.style.height = '';
    }
  }, [isOpen, windowMode]);

  // --- Drag handlers ---
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !windowRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    let newX = dragStartRef.current.elX + dx;
    let newY = dragStartRef.current.elY + dy;
    const w = windowRef.current.offsetWidth;
    const h = windowRef.current.offsetHeight;
    newX = Math.max(0, Math.min(window.innerWidth - w, newX));
    newY = Math.max(0, Math.min(window.innerHeight - h, newY));
    positionRef.current = { x: newX, y: newY };
    windowRef.current.style.left = `${newX}px`;
    windowRef.current.style.top = `${newY}px`;
    windowRef.current.style.right = 'auto';
    windowRef.current.style.bottom = 'auto';
  }, []);

  const handleDragUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragUp);
  }, [handleDragMove]);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!windowRef.current) return;

    isDraggingRef.current = true;
    document.body.style.userSelect = 'none';
    const rect = windowRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragUp);
  }, [handleDragMove, handleDragUp]);

  // --- Resize handlers ---
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !windowRef.current) return;
    const dir = resizeDirectionRef.current;
    const start = resizeStartRef.current;
    const dx = e.clientX - start.mouseX;
    const dy = e.clientY - start.mouseY;

    let newWidth = start.width;
    let newHeight = start.height;
    let newLeft = start.left;
    let newTop = start.top;

    // Horizontal resize
    if (dir.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, start.width + dx);
    }
    if (dir.includes('w')) {
      newWidth = Math.max(MIN_WIDTH, start.width - dx);
      newLeft = start.left + (start.width - newWidth);
    }

    // Vertical resize
    if (dir.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, start.height + dy);
    }
    if (dir === 'n' || dir === 'ne' || dir === 'nw') {
      newHeight = Math.max(MIN_HEIGHT, start.height - dy);
      newTop = start.top + (start.height - newHeight);
    }

    // Clamp to viewport
    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);
    if (newLeft + newWidth > window.innerWidth) newWidth = window.innerWidth - newLeft;
    if (newTop + newHeight > window.innerHeight) newHeight = window.innerHeight - newTop;

    positionRef.current = { x: newLeft, y: newTop };
    windowRef.current.style.left = `${newLeft}px`;
    windowRef.current.style.top = `${newTop}px`;
    windowRef.current.style.right = 'auto';
    windowRef.current.style.bottom = 'auto';
    windowRef.current.style.width = `${newWidth}px`;
    windowRef.current.style.height = `${newHeight}px`;
  }, []);

  const handleResizeUp = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeUp);
  }, [handleResizeMove]);

  const startResize = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    if (!windowRef.current) return;

    isResizingRef.current = true;
    resizeDirectionRef.current = direction;
    document.body.style.userSelect = 'none';

    const rect = windowRef.current.getBoundingClientRect();
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };

    // Ensure we're in absolute positioning mode before resize
    if (!positionRef.current) {
      positionRef.current = { x: rect.left, y: rect.top };
      windowRef.current.style.left = `${rect.left}px`;
      windowRef.current.style.top = `${rect.top}px`;
      windowRef.current.style.right = 'auto';
      windowRef.current.style.bottom = 'auto';
    }

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  }, [handleResizeMove, handleResizeUp]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragUp);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };
  }, [handleDragMove, handleDragUp, handleResizeMove, handleResizeUp]);

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

  const toggleWindowMode = () => {
    setWindowMode(windowMode === 'sidebar' ? 'floating' : 'sidebar');
  };

  const otherUser = activeConversation?.otherUser;
  const displayName = otherUser
    ? `${otherUser.firstname || ''} ${otherUser.lastname || ''}`.trim() || otherUser.email
    : '';

  // Render header left content based on view
  const renderHeaderLeft = () => {
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
            className="flex flex-col text-left hover:opacity-80 transition-opacity min-w-0"
          >
            <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
              {activeGroup.groupName}
            </span>
            <span className="text-xs text-slate-500 dark:text-dark-muted">
              {activeGroup.participants?.length || 0} members
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
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {displayName}
          </span>
        </>
      );
    }

    return (
      <>
        <MessageCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
        <span className="font-semibold text-slate-900 dark:text-white">
          Messages
        </span>
        {totalUnreadCount > 0 && (
          <Badge label={String(totalUnreadCount)} variant="primary" />
        )}
      </>
    );
  };

  const isSidebar = windowMode === 'sidebar';

  return (
    <>
      {/* Chat Window — sidebar (default) or floating (pop-out) */}
      <div
        ref={windowRef}
        className={clsx(
          'fixed z-50 flex flex-col',
          'bg-white dark:bg-dark-card',
          'border border-slate-200 dark:border-dark-border',
          'shadow-2xl',
          isSidebar
            ? [
                // Sidebar mode — full height right panel
                'right-0 top-0 h-full w-96',
                'border-l border-t-0 border-b-0 border-r-0',
                'transition-transform duration-300 ease-out',
                isOpen ? 'translate-x-0' : 'translate-x-full',
              ]
            : [
                // Floating mode — draggable window
                'rounded-2xl',
                'w-96 h-[550px]',
                'bottom-6 right-6',
                'transition-all duration-200 ease-out',
                isOpen
                  ? 'scale-100 opacity-100 pointer-events-auto'
                  : 'scale-95 opacity-0 pointer-events-none',
              ]
        )}
      >
        {/* Resize handles — floating mode only */}
        {isOpen && !isSidebar && (
          <>
            <div className="absolute -top-1 left-3 right-3 h-2 cursor-n-resize z-10" onMouseDown={(e) => startResize(e, 'n')} />
            <div className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-10" onMouseDown={(e) => startResize(e, 's')} />
            <div className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-10" onMouseDown={(e) => startResize(e, 'w')} />
            <div className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-10" onMouseDown={(e) => startResize(e, 'e')} />
            <div className="absolute -top-1 -left-1 w-4 h-4 cursor-nw-resize z-20" onMouseDown={(e) => startResize(e, 'nw')} />
            <div className="absolute -top-1 -right-1 w-4 h-4 cursor-ne-resize z-20" onMouseDown={(e) => startResize(e, 'ne')} />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 cursor-sw-resize z-20" onMouseDown={(e) => startResize(e, 'sw')} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize z-20" onMouseDown={(e) => startResize(e, 'se')} />
          </>
        )}

        {/* Header — draggable in floating mode */}
        <div
          className={clsx(
            'h-14 flex items-center justify-between px-3 border-b border-slate-200 dark:border-dark-border flex-shrink-0 select-none',
            !isSidebar && 'cursor-grab active:cursor-grabbing'
          )}
          onMouseDown={isSidebar ? undefined : handleHeaderMouseDown}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {renderHeaderLeft()}
          </div>

          {/* Window controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            <IconActionButton
              icon={<Minus className="w-4 h-4" />}
              onClick={closeChat}
              className="!p-1.5"
              title="Minimize"
            />
            <IconActionButton
              icon={isSidebar
                ? <Maximize2 className="w-3.5 h-3.5" />
                : <PanelRight className="w-3.5 h-3.5" />
              }
              onClick={toggleWindowMode}
              className="!p-1.5"
              title={isSidebar ? 'Pop out' : 'Dock to sidebar'}
            />
            <IconActionButton
              icon={<X className="w-4 h-4" />}
              onClick={closeChat}
              className="!p-1.5"
              title="Close"
            />
          </div>
        </div>

        {/* Content */}
        <div className={clsx('flex-1 overflow-hidden', !isSidebar && 'rounded-b-2xl')}>
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
