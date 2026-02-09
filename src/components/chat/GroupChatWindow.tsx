'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';
import { GroupMessageBubble } from './GroupMessageBubble';
import { AttachmentButton, AttachmentPreview } from './AttachmentButton';
import { VoiceRecorder } from './VoiceRecorder';
import { MentionInput, type MentionInputRef } from './MentionInput';
import type { GroupMessage, MessageAttachment, MessageMention } from '@/types';

interface MessageGroup {
  date: string;
  messages: GroupMessage[];
}

function groupMessagesByDate(messages: GroupMessage[]): MessageGroup[] {
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

export function GroupChatWindow() {
  const [inputValue, setInputValue] = useState('');
  const [mentions, setMentions] = useState<MessageMention[]>([]);
  const [mentionsAll, setMentionsAll] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPendingVoiceNote, setHasPendingVoiceNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionInputRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  const messages = useGroupChatStore((s) => s.messages);
  const activeGroup = useGroupChatStore((s) => s.activeGroup);
  const sendMessage = useGroupChatStore((s) => s.sendMessage);
  const setTyping = useGroupChatStore((s) => s.setTyping);
  const typingUsers = useGroupChatStore((s) => s.typingUsers);
  const isLoading = useGroupChatStore((s) => s.isLoading);

  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const user = useAuthStore((s) => s.user);

  // Create a map of users for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<number, { firstname: string | null; lastname: string | null; profilePicture: string | null }>();
    chatableUsers.forEach((u) => {
      map.set(u.id, {
        firstname: u.firstname,
        lastname: u.lastname,
        profilePicture: u.profilePicture,
      });
    });
    // Add current user
    if (user) {
      map.set(user.id, {
        firstname: user.firstname || null,
        lastname: user.lastname || null,
        profilePicture: null,
      });
    }
    return map;
  }, [chatableUsers, user]);

  // Get typing users for current group
  const groupTypingUsers = activeGroup
    ? typingUsers.get(activeGroup._id) || new Set()
    : new Set();

  // Mentionable users for group chat (all participants except current user)
  const mentionableUsers = useMemo(() => {
    if (!activeGroup?.participants || !user) return [];
    return activeGroup.participants
      .filter((participantId) => participantId !== user.id)
      .map((participantId) => {
        const userData = userMap.get(participantId);
        return {
          id: participantId,
          firstname: userData?.firstname || null,
          lastname: userData?.lastname || null,
          profilePicture: userData?.profilePicture || null,
        };
      });
  }, [activeGroup?.participants, user, userMap]);

  // Scroll to bottom when group changes (initial load)
  useEffect(() => {
    if (activeGroup) {
      // Reset the previous length when switching groups
      prevMessagesLengthRef.current = 0;
      // Scroll to bottom after messages render with smooth animation
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeGroup]);

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
  }, [activeGroup]);

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
    const mentionsAllToSend = mentionsAll;
    setInputValue('');
    setMentions([]);
    setMentionsAll(false);
    const attachmentToSend = pendingAttachment;
    setPendingAttachment(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);

    const success = await sendMessage(
      contentToSend,
      attachmentToSend || undefined,
      mentionsToSend.length > 0 ? mentionsToSend : undefined,
      mentionsAllToSend || undefined
    );

    if (!success) {
      setInputValue(contentToSend);
      setMentions(mentionsToSend);
      setMentionsAll(mentionsAllToSend);
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

  // Get sender display name
  const getSenderName = (senderId: number): string => {
    const sender = userMap.get(senderId);
    if (!sender) return 'Unknown';
    return `${sender.firstname || ''} ${sender.lastname || ''}`.trim() || 'Unknown';
  };

  // Get display name for system message (shows "you" if current user is the target)
  const getSystemMessageText = (message: GroupMessage): string => {
    const { systemMessageType, targetUserId, actorUserId, content } = message;

    // If no system message type, return original content
    if (!systemMessageType || !targetUserId) {
      return content;
    }

    const isTargetCurrentUser = targetUserId === user?.id;
    const isActorCurrentUser = actorUserId === user?.id;

    const targetName = isTargetCurrentUser
      ? 'you'
      : getSenderName(targetUserId);

    const actorName = actorUserId
      ? (isActorCurrentUser ? 'You' : getSenderName(actorUserId))
      : '';

    switch (systemMessageType) {
      case 'member_added':
        return `${actorName} added ${targetName}`;
      case 'member_removed':
        return `${actorName} removed ${targetName}`;
      case 'member_left':
        return isTargetCurrentUser ? 'You left' : `${targetName} left`;
      case 'admin_changed':
        return isTargetCurrentUser ? 'You are now the admin' : `${targetName} is now the admin`;
      case 'group_created':
        return isActorCurrentUser ? 'You created this group' : `${actorName} created this group`;
      default:
        return content;
    }
  };

  // Get user's join timestamp for the active group
  const userJoinedAt = useMemo(() => {
    if (!activeGroup?.memberJoinedAt || !user?.id) return null;
    const joinTimestamp = activeGroup.memberJoinedAt[user.id.toString()];
    return joinTimestamp ? new Date(joinTimestamp) : null;
  }, [activeGroup?.memberJoinedAt, user?.id]);

  // Filter messages to only show those after the user joined (WhatsApp behavior)
  const filteredMessages = useMemo(() => {
    if (!userJoinedAt) return messages;
    return messages.filter((msg) => new Date(msg.createdAt) >= userJoinedAt);
  }, [messages, userJoinedAt]);

  // Group messages by date
  const groupedMessages = useMemo(() => groupMessagesByDate(filteredMessages), [filteredMessages]);

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
            <div className="space-y-3">
              {group.messages.map((message) => {
                // System message - render WhatsApp-style centered notification
                if (message.isSystemMessage) {
                  return (
                    <div
                      key={message._id}
                      className="flex justify-center my-2"
                    >
                      <span className="px-3 py-1.5 text-xs text-slate-500 dark:text-dark-muted bg-slate-100 dark:bg-slate-800/50 rounded-lg shadow-sm">
                        {getSystemMessageText(message)}
                      </span>
                    </div>
                  );
                }

                // Regular message
                const isOwn = message.senderId === user?.id;
                const sender = userMap.get(message.senderId);
                const senderName = getSenderName(message.senderId);
                // Total members excluding sender for status calculation
                const totalMembers = (activeGroup?.participants?.length || 1) - 1;

                return (
                  <GroupMessageBubble
                    key={message._id}
                    message={message}
                    isOwn={isOwn}
                    senderName={senderName}
                    senderAvatar={sender?.profilePicture}
                    totalMembers={totalMembers}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {groupTypingUsers.size > 0 && (
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
          <span className="text-slate-500 dark:text-dark-muted">
            {groupTypingUsers.size === 1
              ? `${getSenderName(Array.from(groupTypingUsers as Set<number>)[0])} is typing...`
              : `${groupTypingUsers.size} people are typing...`}
          </span>
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
                onChange={(value, newMentions, newMentionsAll) => {
                  setInputValue(value);
                  setMentions(newMentions);
                  setMentionsAll(newMentionsAll);
                }}
                mentionableUsers={mentionableUsers}
                showAllOption={true}
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
