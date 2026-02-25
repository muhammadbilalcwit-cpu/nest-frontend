'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Send, ChevronDown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';
import { MessageBubble } from './MessageBubble';
import { AttachmentButton, AttachmentPreview } from './AttachmentButton';
import { VoiceRecorder } from './VoiceRecorder';
import { MentionInput, type MentionInputRef } from './MentionInput';
import type { ChatMessage, MessageAttachment, MessageMention } from '@/types';

interface MessageGroup {
  date: string;
  messages: ChatMessage[];
}

function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');

    if (!currentGroup || currentGroup.date !== messageDate) {
      currentGroup = { date: messageDate, messages: [] };
      groups.push(currentGroup);
    }

    currentGroup.messages.push(message);
  });

  return groups;
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export function ChatWindow() {
  const [inputValue, setInputValue] = useState('');
  const [mentions, setMentions] = useState<MessageMention[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPendingVoiceNote, setHasPendingVoiceNote] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionInputRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const isAtBottomRef = useRef(true);
  const userSentMessageRef = useRef(false);

  const messages = useChatStore((s) => s.messages);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const isLoading = useChatStore((s) => s.isLoading);

  const user = useAuthStore((s) => s.user);

  const otherUser = activeConversation?.otherUser;
  const isOtherUserTyping = otherUser ? typingUsers.has(otherUser.id) : false;

  // Mentionable users for 1:1 chat (only the other user)
  const mentionableUsers = useMemo(() => {
    if (!otherUser) return [];
    return [{
      id: otherUser.id,
      firstname: otherUser.firstname,
      lastname: otherUser.lastname,
      profilePicture: otherUser.profilePicture,
    }];
  }, [otherUser]);

  // Scroll helper — always instant (WhatsApp style)
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  // Check if user is near the bottom of the scroll container
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // px from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Track scroll position to know if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        setNewMessageCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfAtBottom]);

  // Track conversation switch
  const prevConversationIdRef = useRef<string | null>(null);
  const isNewConversationRef = useRef(false);
  useEffect(() => {
    if (activeConversation && activeConversation._id !== prevConversationIdRef.current) {
      prevConversationIdRef.current = activeConversation._id;
      prevMessagesLengthRef.current = 0;
      isNewConversationRef.current = true;
      isAtBottomRef.current = true;
      setNewMessageCount(0);
    }
  }, [activeConversation]);

  // Hide container before paint when opening a new conversation (prevents flash of unscrolled content)
  useLayoutEffect(() => {
    if (isNewConversationRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) container.style.visibility = 'hidden';
    }
  }, [messages.length]);

  // Scroll to bottom after browser fully resolves layout, then reveal
  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessagesLengthRef.current) {
      if (isNewConversationRef.current) {
        isNewConversationRef.current = false;
        // rAF fires after paint, setTimeout(0) ensures task queue is flushed
        // and flex + absolute layout is fully resolved
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom();
            isAtBottomRef.current = true;
            const container = messagesContainerRef.current;
            if (container) container.style.visibility = '';
          }, 0);
        });
      } else if (userSentMessageRef.current) {
        userSentMessageRef.current = false;
        scrollToBottom();
      } else if (isAtBottomRef.current) {
        scrollToBottom();
      } else {
        const newCount = messages.length - prevMessagesLengthRef.current;
        setNewMessageCount((prev) => prev + newCount);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isOtherUserTyping && isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [isOtherUserTyping, scrollToBottom]);

  // Auto-scroll when images/media finish loading — re-registers when
  // isLoading changes so the listener is set up after container appears
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleLoad = () => {
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    };

    container.addEventListener('load', handleLoad, true);
    return () => container.removeEventListener('load', handleLoad, true);
  }, [scrollToBottom, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversation]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    setTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [setTyping]);

  // Send message (with optional attachment)
  const handleSend = async () => {
    const content = inputValue.trim();

    // Must have content or attachment
    if (!content && !pendingAttachment) return;
    if (isSending) return;

    setIsSending(true);
    userSentMessageRef.current = true;
    const contentToSend = inputValue;
    const mentionsToSend = mentions;
    setInputValue('');
    setMentions([]);
    const attachmentToSend = pendingAttachment;
    setPendingAttachment(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);

    const success = await sendMessage(
      contentToSend,
      attachmentToSend || undefined,
      mentionsToSend.length > 0 ? mentionsToSend : undefined
    );

    if (!success) {
      setInputValue(contentToSend);
      setMentions(mentionsToSend);
      if (attachmentToSend) {
        setPendingAttachment(attachmentToSend);
      }
      toast.error('Failed to send message');
    }

    setIsSending(false);
    inputRef.current?.focus();
  };

  // Handle voice note ready (send immediately)
  const handleVoiceNoteReady = async (attachment: MessageAttachment) => {
    setIsSending(true);
    userSentMessageRef.current = true;

    const success = await sendMessage('', attachment);

    if (!success) {
      toast.error('Failed to send voice note');
    }

    setIsSending(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle "jump to bottom" button
  const handleJumpToBottom = () => {
    scrollToBottom();
    setNewMessageCount(0);
  };

  // Check if we can send (has content or attachment)
  const canSend = inputValue.trim() || pendingAttachment;

  // Group messages by date
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages area */}
      <div className="relative flex-1">
        <div ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 space-y-4 chat-bg-pattern">
          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-[11px] font-medium text-slate-500 dark:text-dark-muted bg-white/80 dark:bg-slate-800/80 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                  {formatDateLabel(group.date)}
                </span>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    isOwn={
                      activeConversation?.isSupportChat && message.senderIsCustomer != null
                        ? !message.senderIsCustomer
                        : message.senderId === user?.id
                    }
                  />
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Jump to bottom button (WhatsApp style) */}
        {newMessageCount > 0 && (
          <button
            onClick={handleJumpToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors z-10"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs font-medium">
              {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
            </span>
          </button>
        )}
      </div>

      {/* Typing indicator — fixed above input */}
      {isOtherUserTyping && (
        <div className="chat-bg-pattern px-4 py-1.5">
          <div className="inline-flex items-center gap-1.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-dark-muted">typing...</span>
          </div>
        </div>
      )}

      {/* Resolved conversation — read-only bar */}
      {activeConversation?.supportStatus === 'resolved' ? (
        <div className="px-4 py-3 bg-white dark:bg-dark-card shadow-[0_-1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_-1px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-dark-muted">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Conversation resolved</span>
            {activeConversation.supportMetadata?.resolvedAt && (
              <span className="text-xs text-slate-400">
                · {new Date(activeConversation.supportMetadata.resolvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Attachment preview */}
          {pendingAttachment && (
            <div className="px-4 py-2 bg-white dark:bg-dark-card border-b border-slate-100 dark:border-dark-border">
              <AttachmentPreview
                attachment={pendingAttachment}
                onRemove={() => setPendingAttachment(null)}
              />
            </div>
          )}

          {/* Input area */}
          <div className="p-3 bg-white dark:bg-dark-card shadow-[0_-1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_-1px_4px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2">
              {/* Hide attachment button and input when recording or has pending voice note */}
              {!isRecording && !hasPendingVoiceNote && (
                <>
                  {/* Attachment button */}
                  <AttachmentButton
                    onAttachmentReady={setPendingAttachment}
                    disabled={isSending || !!pendingAttachment}
                  />

                  {/* Text input with mentions */}
                  <MentionInput
                    ref={inputRef}
                    value={inputValue}
                    onChange={(value, newMentions, _mentionsAll) => {
                      setInputValue(value);
                      setMentions(newMentions);
                    }}
                    mentionableUsers={mentionableUsers}
                    onKeyDown={handleKeyPress}
                    onTyping={handleTyping}
                    placeholder="Type a message..."
                    disabled={isSending}
                  />
                </>
              )}

              {/* Voice recorder - always rendered to preserve state */}
              {(isRecording || hasPendingVoiceNote || !canSend) && (
                <div className={isRecording || hasPendingVoiceNote ? 'flex-1 min-w-0' : ''}>
                  <VoiceRecorder
                    onVoiceNoteReady={handleVoiceNoteReady}
                    onRecordingStateChange={setIsRecording}
                    onHasPendingVoiceNote={setHasPendingVoiceNote}
                    disabled={isSending}
                  />
                </div>
              )}

              {/* Send button - only when there's content and not recording */}
              {!isRecording && !hasPendingVoiceNote && canSend && (
                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  icon={<Send className="w-5 h-5" />}
                  className="!p-2.5 !rounded-full"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
