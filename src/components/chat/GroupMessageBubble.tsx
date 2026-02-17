'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Info, Trash2, Ban } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { Avatar, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { MessageInfoModal } from './MessageInfoModal';
import { MessageAttachment } from './MessageAttachment';
import { MentionText } from './MentionText';
import type { GroupMessage } from '@/types';

interface GroupMessageBubbleProps {
  message: GroupMessage;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string | null;
  totalMembers: number; // Total members excluding sender
}

export function GroupMessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
  totalMembers,
}: GroupMessageBubbleProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const deleteMessage = useGroupChatStore((s) => s.deleteMessage);

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
      let left = rect.left;
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
  }, [showDeleteMenu]);

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

  // Check if current user is mentioned in this message
  const isMentioned = (() => {
    if (!user?.id || isOwn) return false;

    // Check @all mention
    if (message.mentionsAll) return true;

    // Check individual mentions
    if (message.mentions?.some(m => m.userId === user.id)) return true;

    return false;
  })();

  // Calculate message status for group messages
  const getMessageStatus = (): 'sent' | 'delivered' | 'read' => {
    // If all members have read it (excluding sender)
    const readCount = message.readBy?.length || 0;
    if (readCount >= totalMembers && totalMembers > 0) {
      return 'read';
    }

    // If at least one member has received it
    const deliveredCount = message.deliveredTo?.length || 0;
    if (deliveredCount > 0 || readCount > 0) {
      return 'delivered';
    }

    return 'sent';
  };

  const status = getMessageStatus();

  // Check if message has a temp ID (not yet confirmed by server)
  const isTempMessage = message._id.startsWith('temp-');

  // If message is deleted, show "This message was deleted"
  if (message.isDeleted) {
    return (
      <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={clsx(
            'flex gap-2 max-w-[80%]',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {!isOwn && (
            <Avatar
              src={senderAvatar}
              name={senderName}
              size="sm"
              className="flex-shrink-0 mt-0.5"
            />
          )}
          <div>
            {!isOwn && (
              <span className="text-xs text-slate-500 dark:text-dark-muted ml-1 mb-0.5 block">
                {senderName}
              </span>
            )}
            <div
              className={clsx(
                'px-4 py-2 rounded-2xl',
                isOwn
                  ? 'bg-primary-400/50 rounded-br-md'
                  : 'bg-slate-100/50 dark:bg-slate-700/50 rounded-bl-md'
              )}
            >
              <p className="text-sm italic flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Ban className="w-3.5 h-3.5" />
                This message was deleted
              </p>
            </div>
            <span
              className={clsx(
                'text-xs text-slate-400 dark:text-dark-muted mt-0.5 block',
                isOwn ? 'text-right mr-1' : 'ml-1'
              )}
            >
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={clsx(
            'flex gap-2 max-w-[80%]',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar for others' messages */}
          {!isOwn && (
            <Avatar
              src={senderAvatar}
              name={senderName}
              size="sm"
              className="flex-shrink-0 mt-0.5"
            />
          )}

          <div className="group relative">
            {/* Sender name for others' messages */}
            {!isOwn && (
              <span
                className={clsx(
                  'text-xs ml-1 mb-0.5 block',
                  isMentioned
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-slate-500 dark:text-dark-muted'
                )}
              >
                {senderName}
              </span>
            )}

            {/* Message bubble */}
            <div
              className={clsx(
                'rounded-2xl overflow-hidden',
                isOwn
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : isMentioned
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-slate-900 dark:text-white rounded-bl-md border-l-4 border-amber-400 dark:border-amber-500'
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
                    mentionsAll={message.mentionsAll}
                  />
                </p>
              )}

              {/* Time and status */}
              <div
                className={clsx(
                  'flex items-center justify-end gap-1 mt-1',
                  isOwn
                    ? 'text-primary-200'
                    : isMentioned
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-dark-muted',
                  // Adjust padding if only attachment (no text)
                  hasAttachment && !hasText && 'px-2 pb-1'
                )}
              >
                <span className="text-xs">
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>

                {/* Message status ticks for own messages */}
                {isOwn && (
                  <span className="ml-1">
                    {status === 'read' ? (
                      <CheckCheck className="w-4 h-4 text-sky-300 drop-shadow-[0_0_2px_rgba(125,211,252,0.8)]" />
                    ) : status === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 opacity-90" />
                    ) : (
                      <Check className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons - positioned at top corner */}
            {!isTempMessage && (
              <div className={clsx('absolute -top-1 flex gap-1', isOwn ? '-left-1' : '-right-1')}>
                {/* Info button for own messages - shows who read/delivered */}
                {isOwn && (
                  <button
                    onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfoModal(true);
                    }}
                    className={clsx(
                      'p-1 rounded-full',
                      'bg-white dark:bg-slate-700 shadow-md',
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      'hover:bg-slate-100 dark:hover:bg-slate-600',
                      'text-slate-500 dark:text-slate-400'
                    )}
                    title="Message info"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                )}

                {/* Delete button */}
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
            )}

          </div>
        </div>
      </div>

      {/* Message info modal - only for confirmed messages */}
      {showInfoModal && !isTempMessage && (
        <MessageInfoModal
          messageId={message._id}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </>
  );
}
