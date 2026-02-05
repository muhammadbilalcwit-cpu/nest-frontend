'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { MentionableUser } from './useMentions';

interface MentionDropdownProps {
  users: MentionableUser[];
  selectedIndex: number;
  onSelect: (user: MentionableUser) => void;
  onSelectAll?: () => void;
  showAllOption?: boolean;
  isAllSelected?: boolean;
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  onSelectAll,
  showAllOption = false,
  isAllSelected = false,
}: MentionDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isAllSelected]);

  const getDisplayName = (user: MentionableUser): string => {
    const name = `${user.firstname || ''} ${user.lastname || ''}`.trim();
    return name || 'Unknown';
  };

  // Calculate if @all is selected (it's at index -1 conceptually, before users)
  const allOptionIndex = showAllOption ? -1 : null;
  const adjustedSelectedIndex = showAllOption ? selectedIndex - 1 : selectedIndex;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto z-50"
    >
      {/* @all option for groups */}
      {showAllOption && onSelectAll && (
        <button
          type="button"
          data-selected={isAllSelected}
          onClick={onSelectAll}
          className={clsx(
            'w-full px-3 py-2 flex items-center gap-3 text-left transition-colors',
            isAllSelected
              ? 'bg-primary-100 dark:bg-primary-900/30'
              : 'hover:bg-slate-50 dark:hover:bg-slate-700'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white text-sm">
              @all
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notify everyone
            </p>
          </div>
        </button>
      )}

      {/* User list */}
      {users.length === 0 && !showAllOption && (
        <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No users found
        </div>
      )}

      {users.map((user, index) => {
        const isSelected = showAllOption
          ? index === selectedIndex - 1 && !isAllSelected
          : index === selectedIndex;

        return (
          <button
            key={user.id}
            type="button"
            data-selected={isSelected}
            onClick={() => onSelect(user)}
            className={clsx(
              'w-full px-3 py-2 flex items-center gap-3 text-left transition-colors',
              isSelected
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            <Avatar
              src={user.profilePicture}
              name={getDisplayName(user)}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                {getDisplayName(user)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
