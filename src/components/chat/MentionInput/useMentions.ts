'use client';

import { useCallback, useMemo } from 'react';
import type { MessageMention } from '@/types';

export interface MentionableUser {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profilePicture?: string | null;
}

export interface MentionTriggerResult {
  active: boolean;
  query: string;
  startPosition: number;
}

export interface InsertMentionResult {
  newValue: string;
  newCursorPosition: number;
  mention: MessageMention;
}

/**
 * Hook for mention detection and manipulation logic
 */
export function useMentions(mentionableUsers: MentionableUser[]) {
  /**
   * Detect if @ was typed and extract the search query
   */
  const detectMentionTrigger = useCallback(
    (value: string, cursorPosition: number): MentionTriggerResult => {
      if (cursorPosition === 0) {
        return { active: false, query: '', startPosition: -1 };
      }

      const textBeforeCursor = value.slice(0, cursorPosition);

      // Find the last @ before cursor
      const atIndex = textBeforeCursor.lastIndexOf('@');

      if (atIndex === -1) {
        return { active: false, query: '', startPosition: -1 };
      }

      // Check if @ is at start of word (preceded by space, newline, or at beginning)
      if (atIndex > 0) {
        const charBefore = textBeforeCursor[atIndex - 1];
        if (!/[\s\n]/.test(charBefore)) {
          return { active: false, query: '', startPosition: -1 };
        }
      }

      // Check if we're clicking inside an existing @mention
      // by checking if there's no space after @ until cursor
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // If there's already content without spaces, we might be editing an existing mention
      // Don't activate if we're in the middle of an existing word that started with @
      if (textAfterAt.length > 0 && !/\s/.test(textAfterAt) && cursorPosition < value.length) {
        const charAfterCursor = value[cursorPosition];
        // If the next char is also a word character, we're inside a word - don't activate
        if (charAfterCursor && /\w/.test(charAfterCursor)) {
          return { active: false, query: '', startPosition: -1 };
        }
      }

      // Extract the query (text after @ and before cursor)
      const query = textBeforeCursor.slice(atIndex + 1);

      // Don't activate if query contains space (user finished typing)
      if (query.includes(' ')) {
        return { active: false, query: '', startPosition: -1 };
      }

      return { active: true, query, startPosition: atIndex };
    },
    []
  );

  /**
   * Filter users based on search query
   */
  const filterUsers = useCallback(
    (query: string): MentionableUser[] => {
      if (!query) {
        return mentionableUsers;
      }

      const lowerQuery = query.toLowerCase();
      return mentionableUsers.filter((user) => {
        const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim().toLowerCase();
        const firstName = (user.firstname || '').toLowerCase();
        const lastName = (user.lastname || '').toLowerCase();

        return (
          fullName.includes(lowerQuery) ||
          firstName.startsWith(lowerQuery) ||
          lastName.startsWith(lowerQuery)
        );
      });
    },
    [mentionableUsers]
  );

  /**
   * Get display name for a user
   */
  const getDisplayName = useCallback((user: MentionableUser): string => {
    const name = `${user.firstname || ''} ${user.lastname || ''}`.trim();
    return name || 'Unknown';
  }, []);

  /**
   * Insert a mention into the text at the trigger position
   * Now uses clean @Name format (WhatsApp-style)
   */
  const insertMention = useCallback(
    (
      currentValue: string,
      cursorPosition: number,
      triggerPosition: number,
      user: MentionableUser
    ): InsertMentionResult => {
      const displayName = getDisplayName(user);
      // Clean format: @Name (no brackets or ID)
      const mentionText = `@${displayName}`;

      const before = currentValue.slice(0, triggerPosition);
      const after = currentValue.slice(cursorPosition);
      const newValue = `${before}${mentionText} ${after}`;
      const newCursorPosition = triggerPosition + mentionText.length + 1;

      return {
        newValue,
        newCursorPosition,
        mention: {
          userId: user.id,
          displayName,
          position: triggerPosition,
          length: mentionText.length,
        },
      };
    },
    [getDisplayName]
  );

  /**
   * Insert @all mention for group chats
   * Now uses clean @all format (WhatsApp-style)
   */
  const insertAllMention = useCallback(
    (
      currentValue: string,
      cursorPosition: number,
      triggerPosition: number
    ): { newValue: string; newCursorPosition: number } => {
      // Clean format: @all (no brackets)
      const mentionText = '@all';

      const before = currentValue.slice(0, triggerPosition);
      const after = currentValue.slice(cursorPosition);
      const newValue = `${before}${mentionText} ${after}`;
      const newCursorPosition = triggerPosition + mentionText.length + 1;

      return { newValue, newCursorPosition };
    },
    []
  );

  /**
   * Parse mentions from formatted content string
   * Format: @[Display Name](userId) - for backwards compatibility with old messages
   */
  const parseMentions = useCallback((content: string): MessageMention[] => {
    const mentions: MessageMention[] = [];
    const regex = /@\[([^\]]+)\]\((\d+)\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      mentions.push({
        userId: parseInt(match[2], 10),
        displayName: match[1],
        position: match.index,
        length: match[0].length,
      });
    }

    return mentions;
  }, []);

  /**
   * Recalculate which mentions are still valid after content changes
   * Checks if @displayName still exists at the expected position
   */
  const recalculateMentions = useCallback(
    (newContent: string, currentMentions: MessageMention[]): MessageMention[] => {
      const validMentions: MessageMention[] = [];

      for (const mention of currentMentions) {
        const expectedText = `@${mention.displayName}`;

        // Find this mention text in the new content
        let searchStart = 0;
        let found = false;

        while (!found) {
          const idx = newContent.indexOf(expectedText, searchStart);
          if (idx === -1) break;

          // Check if it's a valid mention (preceded by space/start, followed by space/end)
          const charBefore = idx > 0 ? newContent[idx - 1] : ' ';
          const charAfter = newContent[idx + expectedText.length] || ' ';

          if (/[\s]|^/.test(charBefore) && /[\s]|$/.test(charAfter)) {
            // Found valid mention - update position
            validMentions.push({
              ...mention,
              position: idx,
              length: expectedText.length,
            });
            found = true;
          } else {
            // Keep searching
            searchStart = idx + 1;
          }
        }
      }

      return validMentions;
    },
    []
  );

  /**
   * Check if content contains @all mention
   */
  const hasMentionAll = useCallback((content: string): boolean => {
    // Check for @all followed by space or end of string
    return /(?:^|\s)@all(?:\s|$)/.test(content);
  }, []);

  /**
   * Convert formatted content to display text (for rendering in input)
   * @[John Doe](123) -> @John Doe
   * Used for backwards compatibility with old message format
   */
  const toDisplayText = useCallback((content: string): string => {
    return content.replace(/@\[([^\]]+)\]\((\d+|all)\)/g, '@$1');
  }, []);

  return {
    detectMentionTrigger,
    filterUsers,
    getDisplayName,
    insertMention,
    insertAllMention,
    parseMentions,
    recalculateMentions,
    hasMentionAll,
    toDisplayText,
  };
}
