'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import clsx from 'clsx';
import { useMentions, type MentionableUser } from './useMentions';
import { MentionDropdown } from './MentionDropdown';
import type { MessageMention } from '@/types';

export interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: MessageMention[], mentionsAll: boolean) => void;
  mentionableUsers: MentionableUser[];
  showAllOption?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTyping?: () => void;
  className?: string;
}

export interface MentionInputRef {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  function MentionInput(
    {
      value,
      onChange,
      mentionableUsers,
      showAllOption = false,
      placeholder = 'Type a message...',
      disabled = false,
      onKeyDown,
      onTyping,
      className,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownQuery, setDropdownQuery] = useState('');
    const [triggerPosition, setTriggerPosition] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    // Track current mentions internally
    const [currentMentions, setCurrentMentions] = useState<MessageMention[]>([]);

    const {
      detectMentionTrigger,
      filterUsers,
      insertMention,
      insertAllMention,
      recalculateMentions,
      hasMentionAll,
    } = useMentions(mentionableUsers);

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Reset mentions when value is cleared (e.g., after sending message)
    useEffect(() => {
      if (value === '') {
        setCurrentMentions([]);
      }
    }, [value]);

    // Filter users based on current query
    const filteredUsers = filterUsers(dropdownQuery);

    // Total items count (including @all if shown)
    const totalItems = showAllOption ? filteredUsers.length + 1 : filteredUsers.length;

    // Check if @all is selected
    const isAllSelected = showAllOption && selectedIndex === 0;

    // Check if content has @all
    const hasAllMention = hasMentionAll(value);

    /**
     * Render the styled overlay content with highlighted mentions
     */
    const styledContent = useMemo(() => {
      if (!value) return null;

      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      // Sort mentions by position
      const sortedMentions = [...currentMentions].sort((a, b) => a.position - b.position);

      // Process user mentions
      for (const mention of sortedMentions) {
        // Add text before this mention
        if (mention.position > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {value.slice(lastIndex, mention.position)}
            </span>
          );
        }

        // Add the styled mention
        parts.push(
          <span
            key={`mention-${mention.position}`}
            className="text-primary-600 dark:text-primary-400 font-medium"
          >
            {value.slice(mention.position, mention.position + mention.length)}
          </span>
        );

        lastIndex = mention.position + mention.length;
      }

      // Handle @all mentions
      if (hasAllMention) {
        const remainingText = value.slice(lastIndex);
        const allRegex = /@all(?=\s|$)/g;
        let match;
        let localLastIndex = 0;

        while ((match = allRegex.exec(remainingText)) !== null) {
          // Add text before @all
          if (match.index > localLastIndex) {
            parts.push(
              <span key={`text-all-${lastIndex + localLastIndex}`}>
                {remainingText.slice(localLastIndex, match.index)}
              </span>
            );
          }

          // Add styled @all
          parts.push(
            <span
              key={`all-${lastIndex + match.index}`}
              className="text-primary-600 dark:text-primary-400 font-medium"
            >
              @all
            </span>
          );

          localLastIndex = match.index + 4;
        }

        // Add remaining text after last @all
        if (localLastIndex < remainingText.length) {
          parts.push(
            <span key={`text-end-${lastIndex + localLastIndex}`}>
              {remainingText.slice(localLastIndex)}
            </span>
          );
        }
      } else {
        // Add remaining text after last mention
        if (lastIndex < value.length) {
          parts.push(
            <span key={`text-end-${lastIndex}`}>
              {value.slice(lastIndex)}
            </span>
          );
        }
      }

      return parts.length > 0 ? parts : value;
    }, [value, currentMentions, hasAllMention]);

    /**
     * Handle input change
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const cursorPosition = e.target.selectionStart || 0;

        // Detect if we should show mention dropdown
        const trigger = detectMentionTrigger(newValue, cursorPosition);

        if (trigger.active) {
          setShowDropdown(true);
          setDropdownQuery(trigger.query);
          setTriggerPosition(trigger.startPosition);
          setSelectedIndex(0);
        } else {
          setShowDropdown(false);
          setDropdownQuery('');
          setTriggerPosition(-1);
        }

        // Recalculate which mentions are still valid after the edit
        const validMentions = recalculateMentions(newValue, currentMentions);
        setCurrentMentions(validMentions);

        const mentionsAll = hasMentionAll(newValue);

        onChange(newValue, validMentions, mentionsAll);
        onTyping?.();
      },
      [detectMentionTrigger, recalculateMentions, currentMentions, hasMentionAll, onChange, onTyping]
    );

    /**
     * Handle user selection from dropdown
     */
    const handleSelectUser = useCallback(
      (user: MentionableUser) => {
        if (!inputRef.current) return;

        const cursorPosition = inputRef.current.selectionStart || value.length;
        const result = insertMention(value, cursorPosition, triggerPosition, user);

        // Add the new mention to current mentions list
        const newMentions = [...currentMentions, result.mention];
        setCurrentMentions(newMentions);

        const mentionsAll = hasMentionAll(result.newValue);
        onChange(result.newValue, newMentions, mentionsAll);

        // Close dropdown
        setShowDropdown(false);
        setDropdownQuery('');
        setTriggerPosition(-1);

        // Set cursor position after mention
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(
              result.newCursorPosition,
              result.newCursorPosition
            );
          }
        }, 0);
      },
      [value, triggerPosition, insertMention, currentMentions, hasMentionAll, onChange]
    );

    /**
     * Handle @all selection
     */
    const handleSelectAll = useCallback(() => {
      if (!inputRef.current) return;

      const cursorPosition = inputRef.current.selectionStart || value.length;
      const result = insertAllMention(value, cursorPosition, triggerPosition);

      // @all doesn't add to mentions array - it sets mentionsAll flag
      onChange(result.newValue, currentMentions, true);

      // Close dropdown
      setShowDropdown(false);
      setDropdownQuery('');
      setTriggerPosition(-1);

      // Set cursor position after mention
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            result.newCursorPosition,
            result.newCursorPosition
          );
        }
      }, 0);
    }, [value, triggerPosition, insertAllMention, currentMentions, onChange]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showDropdown && totalItems > 0) {
          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              setSelectedIndex((prev) => (prev + 1) % totalItems);
              break;
            case 'ArrowUp':
              e.preventDefault();
              setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
              break;
            case 'Enter':
              e.preventDefault();
              if (isAllSelected) {
                handleSelectAll();
              } else {
                const userIndex = showAllOption ? selectedIndex - 1 : selectedIndex;
                if (filteredUsers[userIndex]) {
                  handleSelectUser(filteredUsers[userIndex]);
                }
              }
              return; // Don't call onKeyDown when selecting from dropdown
            case 'Escape':
              e.preventDefault();
              setShowDropdown(false);
              return;
            case 'Tab':
              // Close dropdown on tab
              setShowDropdown(false);
              break;
          }
        }

        // Call parent's onKeyDown for other keys (like Enter to send when no dropdown)
        onKeyDown?.(e);
      },
      [
        showDropdown,
        totalItems,
        selectedIndex,
        isAllSelected,
        showAllOption,
        filteredUsers,
        handleSelectUser,
        handleSelectAll,
        onKeyDown,
      ]
    );

    /**
     * Close dropdown when clicking outside
     */
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative flex-1">
        {/* Dropdown */}
        {showDropdown && (filteredUsers.length > 0 || showAllOption) && (
          <MentionDropdown
            users={filteredUsers}
            selectedIndex={selectedIndex}
            onSelect={handleSelectUser}
            onSelectAll={showAllOption ? handleSelectAll : undefined}
            showAllOption={showAllOption}
            isAllSelected={isAllSelected}
          />
        )}

        {/* Input container with overlay */}
        <div className="relative">
          {/* Styled overlay - shows colored mentions */}
          <div
            className={clsx(
              'absolute inset-0 px-4 py-2 pointer-events-none',
              'whitespace-pre overflow-hidden text-transparent',
              'flex items-center'
            )}
            aria-hidden="true"
          >
            <span className="text-slate-900 dark:text-white">
              {styledContent}
            </span>
          </div>

          {/* Actual input - transparent text, visible caret */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={clsx(
              'w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-full',
              'focus:ring-2 focus:ring-primary-500 placeholder:text-slate-400',
              'dark:placeholder:text-dark-muted disabled:opacity-50',
              // Make text transparent so overlay shows through, caret stays visible
              'text-transparent [caret-color:#0f172a] dark:[caret-color:#f8fafc]',
              className
            )}
          />
        </div>
      </div>
    );
  }
);

// Re-export types
export type { MentionableUser } from './useMentions';
