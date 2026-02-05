'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import type { MessageMention } from '@/types';

interface MentionTextProps {
  content: string;
  currentUserId?: number;
  isOwn?: boolean;
  /** Optional mentions array - if provided, uses positions from it */
  mentions?: MessageMention[];
  /** Whether message contains @all mention */
  mentionsAll?: boolean;
}

/**
 * Renders message content with highlighted mentions
 * Supports two formats:
 * 1. New format: uses mentions array positions (clean @Name in content)
 * 2. Legacy format: parses @[Name](userId) from content
 */
export function MentionText({
  content,
  currentUserId,
  isOwn = false,
  mentions,
  mentionsAll = false,
}: MentionTextProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // If mentions array is provided, use positions from it
    if (mentions && mentions.length > 0) {
      return renderWithMentionsArray(content, mentions, currentUserId, isOwn);
    }

    // Check for @all in content
    if (mentionsAll || /(?:^|\s)@all(?:\s|$)/.test(content)) {
      return renderWithAllMention(content, currentUserId, isOwn);
    }

    // Try legacy format: @[Name](userId)
    const legacyRegex = /@\[([^\]]+)\]\((\d+|all)\)/;
    if (legacyRegex.test(content)) {
      return renderLegacyFormat(content, currentUserId, isOwn);
    }

    // No mentions found - return plain content
    return content;
  }, [content, currentUserId, isOwn, mentions, mentionsAll]);

  return <>{renderedContent}</>;
}

/**
 * Render content using mentions array positions
 */
function renderWithMentionsArray(
  content: string,
  mentions: MessageMention[],
  currentUserId?: number,
  isOwn = false
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.position - b.position);

  let lastIndex = 0;

  for (const mention of sortedMentions) {
    // Add text before this mention
    if (mention.position > lastIndex) {
      parts.push(content.slice(lastIndex, mention.position));
    }

    const isSelf = mention.userId === currentUserId;

    // Add the mention as a styled span
    parts.push(
      <span
        key={mention.position}
        className={clsx(
          'font-medium rounded px-0.5',
          isOwn
            ? isSelf
              ? 'bg-white/20 text-white'
              : 'text-primary-200'
            : isSelf
              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
              : 'text-primary-600 dark:text-primary-400'
        )}
      >
        @{mention.displayName}
      </span>
    );

    lastIndex = mention.position + mention.length;
  }

  // Add remaining text after the last mention
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

/**
 * Render content with @all mention
 */
function renderWithAllMention(
  content: string,
  currentUserId?: number,
  isOwn = false
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const allRegex = /(?:^|\s)(@all)(?=\s|$)/g;
  let lastIndex = 0;
  let match;

  while ((match = allRegex.exec(content)) !== null) {
    const mentionStart = match.index + (match[0].startsWith(' ') ? 1 : 0);

    // Add text before the mention
    if (mentionStart > lastIndex) {
      parts.push(content.slice(lastIndex, mentionStart));
    }

    // Add @all as a styled span
    parts.push(
      <span
        key={match.index}
        className={clsx(
          'font-medium rounded px-0.5',
          isOwn
            ? 'bg-white/20 text-white'
            : 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
        )}
      >
        @all
      </span>
    );

    lastIndex = mentionStart + 4; // '@all'.length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

/**
 * Render legacy format: @[Name](userId)
 */
function renderLegacyFormat(
  content: string,
  currentUserId?: number,
  isOwn = false
): React.ReactNode[] {
  const mentionRegex = /@\[([^\]]+)\]\((\d+|all)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const displayName = match[1];
    const userId = match[2];
    const isSelf = userId !== 'all' && parseInt(userId, 10) === currentUserId;
    const isAll = userId === 'all';

    // Add the mention as a styled span
    parts.push(
      <span
        key={match.index}
        className={clsx(
          'font-medium rounded px-0.5',
          isOwn
            ? isSelf || isAll
              ? 'bg-white/20 text-white'
              : 'text-primary-200'
            : isSelf || isAll
              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
              : 'text-primary-600 dark:text-primary-400'
        )}
      >
        @{displayName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last mention
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
