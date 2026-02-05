'use client';

import { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { GroupItem } from './GroupItem';
import { CreateGroupModal } from './CreateGroupModal';

interface GroupListProps {
  searchQuery: string;
}

export function GroupList({ searchQuery }: GroupListProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groups = useGroupChatStore((s) => s.groups);
  const selectGroup = useGroupChatStore((s) => s.selectGroup);
  const leaveGroup = useGroupChatStore((s) => s.leaveGroup);

  const user = useAuthStore((s) => s.user);

  // Filter groups based on search query
  const filteredGroups = groups.filter((group) =>
    group.groupName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLeaveGroup = async (groupId: string) => {
    setIsLeaving(true);
    try {
      return await leaveGroup(groupId);
    } finally {
      setIsLeaving(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-400 dark:text-dark-muted" />
        </div>
        <p className="text-slate-500 dark:text-dark-muted mb-4">No groups yet</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-slate-500 dark:text-dark-muted">
          No groups match &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Create group button */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-dark-border">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Group
        </button>
      </div>

      {/* Groups list */}
      <div className="divide-y divide-slate-100 dark:divide-dark-border">
        {filteredGroups.map((group) => (
          <GroupItem
            key={group._id}
            group={group}
            currentUserId={user?.id || 0}
            onClick={() => selectGroup(group)}
            onLeave={() => handleLeaveGroup(group._id)}
            isLeaving={isLeaving}
          />
        ))}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
