'use client';

import clsx from 'clsx';
import { Avatar, Badge } from '@/components/ui';
import type { ChatUser } from '@/types';

interface UserItemProps {
  user: ChatUser;
  isOnline: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function UserItem({ user, isOnline, isLoading, onClick }: UserItemProps) {
  const displayName =
    `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={clsx(
        'w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Avatar */}
      <Avatar
        src={user.profilePicture}
        name={displayName}
        size="md"
        isOnline={isOnline}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {displayName}
        </p>
        <p className="text-sm text-slate-500 dark:text-dark-muted truncate">
          {user.email}
        </p>
      </div>

      {/* Online status */}
      <Badge
        label={isOnline ? 'Online' : 'Offline'}
        variant={isOnline ? 'success' : 'default'}
      />
    </button>
  );
}
