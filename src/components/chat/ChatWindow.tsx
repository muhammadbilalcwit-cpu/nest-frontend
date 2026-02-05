'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionInputRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);

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

  // Scroll to bottom when conversation changes (initial load)
  useEffect(() => {
    if (activeConversation) {
      // Reset the previous length when switching conversations
      prevMessagesLengthRef.current = 0;
      // Scroll to bottom after messages render with smooth animation
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeConversation?._id]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 text-xs text-slate-500 dark:text-dark-muted bg-slate-100 dark:bg-slate-800 rounded-full">
                {formatDateLabel(group.date)}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {group.messages.map((message) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwn={message.senderId === user?.id}
                />
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {isOtherUserTyping && (
        <div className="px-4 py-1.5 text-xs mb-1 border-slate-100 dark:border-dark-border flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            <span
              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
          <span className="text-slate-500 dark:text-dark-muted">typing...</span>
        </div>
      )}

      {/* Attachment preview */}
      {pendingAttachment && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-dark-border">
          <AttachmentPreview
            attachment={pendingAttachment}
            onRemove={() => setPendingAttachment(null)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 dark:border-dark-border">
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
              className="!p-2 !rounded-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
