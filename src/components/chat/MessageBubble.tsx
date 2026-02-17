'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Trash2, Ban } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';
import { MessageAttachment } from './MessageAttachment';
import { MentionText } from './MentionText';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const user = useAuthStore((s) => s.user);

  // WhatsApp-style: only show "Delete for everyone" within time window (from backend config)
  const deleteForEveryoneHours = useChatStore((s) => s.chatConfig.deleteForEveryoneHours);
  const canDeleteForEveryone = isOwn &&
    (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60) <= deleteForEveryoneHours;

  // Calculate menu position when opening
  useEffect(() => {
    if (showDeleteMenu && deleteButtonRef.current) {
      const rect = deleteButtonRef.current.getBoundingClientRect();
      const menuWidth = 160; // w-40 = 10rem = 160px
      const viewportWidth = window.innerWidth;

      // Calculate left position, ensuring menu stays within viewport
      let left = isOwn ? rect.right - menuWidth : rect.left;
      if (left + menuWidth > viewportWidth - 16) {
        // Would overflow right, align to right edge of button
        left = rect.right - menuWidth;
      }
      if (left < 16) {
        // Would overflow left, keep some padding
        left = 16;
      }

      setMenuPosition({
        top: rect.bottom + 4, // 4px gap
        left,
      });
    }
  }, [showDeleteMenu, isOwn]);

  // Click outside detection for delete menu
  useEffect(() => {
    if (!showDeleteMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside both the button and the menu
      const isOutsideButton = deleteButtonRef.current && !deleteButtonRef.current.contains(target);
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);

      if (isOutsideButton && isOutsideMenu) {
        setShowDeleteMenu(false);
      }
    };

    // Use mousedown to capture before other handlers
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteMenu]);

  const handleDelete = async (forEveryone: boolean) => {
    setIsDeleting(true);
    const success = await deleteMessage(message._id, forEveryone);
    setIsDeleting(false);
    setShowDeleteMenu(false);

    if (!success) {
      toast.error('Failed to delete message');
    }
  };

  // Check if message has attachment
  const hasAttachment = message.attachment && message.attachment.type;
  const hasText = message.content && message.content.trim().length > 0;

  // If message is deleted, show "This message was deleted"
  if (message.isDeleted) {
    return (
      <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={clsx(
            'max-w-[75%] px-4 py-2 rounded-2xl',
            isOwn
              ? 'bg-primary-400/50 rounded-br-md'
              : 'bg-slate-100/50 dark:bg-slate-700/50 rounded-bl-md'
          )}
        >
          <p className="text-sm italic flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Ban className="w-3.5 h-3.5" />
            This message was deleted
          </p>
          <div
            className={clsx(
              'flex items-center justify-end gap-1 mt-1',
              'text-slate-400 dark:text-dark-muted'
            )}
          >
            <span className="text-xs">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex group', isOwn ? 'justify-end' : 'justify-start')}>
      <div className="relative max-w-[75%]">
        {/* Message bubble */}
        <div
          className={clsx(
            'rounded-2xl overflow-hidden',
            isOwn
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md',
            // Only add padding if there's text content
            hasAttachment && !hasText ? 'p-1' : 'px-4 py-2'
          )}
        >
          {/* Attachment */}
          {hasAttachment && (
            <div className={clsx(hasText && 'mb-2')}>
              <MessageAttachment attachment={message.attachment!} isOwn={isOwn} />
            </div>
          )}

          {/* Text content */}
          {hasText && (
            <p className="text-sm whitespace-pre-wrap break-words">
              <MentionText
                content={message.content}
                currentUserId={user?.id}
                isOwn={isOwn}
                mentions={message.mentions}
              />
            </p>
          )}

          {/* Timestamp and status */}
          <div
            className={clsx(
              'flex items-center justify-end gap-1 mt-1',
              isOwn ? 'text-primary-200' : 'text-slate-400 dark:text-dark-muted',
              // Adjust padding if only attachment (no text)
              hasAttachment && !hasText && 'px-2 pb-1'
            )}
          >
            <span className="text-xs">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {isOwn && (
              <span className="ml-1">
                {message.status === 'read' ? (
                  <CheckCheck className="w-4 h-4 text-sky-300 drop-shadow-[0_0_2px_rgba(125,211,252,0.8)]" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 opacity-90" />
                ) : (
                  <Check className="w-3.5 h-3.5 opacity-70" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Delete button wrapper - positioned at top corner */}
        <div className={clsx('absolute -top-1', isOwn ? '-left-1' : '-right-1')}>
          <button
            ref={deleteButtonRef}
            onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteMenu(!showDeleteMenu);
            }}
            disabled={isDeleting}
            className={clsx(
              'p-1 rounded-full bg-white dark:bg-slate-700 shadow-md',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-red-100 dark:hover:bg-red-900/30',
              'text-slate-400 hover:text-red-500 dark:hover:text-red-400',
              'disabled:opacity-50',
              showDeleteMenu && 'opacity-100'
            )}
            title="Delete message"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Delete menu - rendered via portal to avoid overflow issues */}
          {showDeleteMenu && menuPosition && createPortal(
            <div
              ref={menuRef}
              onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
              className="fixed w-40 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
              style={{
                zIndex: 9999,
                top: menuPosition.top,
                left: menuPosition.left,
              }}
            >
              <Button
                variant="secondary"
                onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(false);
                }}
                disabled={isDeleting}
                className="!w-full !justify-start !px-3 !py-2 !rounded-none !text-sm"
              >
                Delete for me
              </Button>
              {canDeleteForEveryone && (
                <Button
                  variant="danger"
                  onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(true);
                  }}
                  disabled={isDeleting}
                  className="!w-full !justify-start !px-3 !py-2 !rounded-none !text-sm"
                >
                  Delete for everyone
                </Button>
              )}
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
