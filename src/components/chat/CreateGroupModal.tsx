'use client';

import { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useChatStore } from '@/stores/chat.store';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { Avatar, Button } from '@/components/ui';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const createGroup = useGroupChatStore((s) => s.createGroup);
  const selectGroup = useGroupChatStore((s) => s.selectGroup);

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsCreating(true);
    try {
      const group = await createGroup({
        name: groupName.trim(),
        memberIds: selectedMembers,
      });

      if (group) {
        toast.success('Group created successfully');
        selectGroup(group);
        handleClose();
      } else {
        toast.error('Failed to create group');
      }
    } catch {
      toast.error('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedMembers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Create Group
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group name input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-dark-muted"
            />
          </div>

          {/* Member selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text mb-1.5">
              Select Members ({selectedMembers.length} selected)
            </label>
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-dark-border rounded-lg">
              {chatableUsers.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-dark-muted text-center">
                  No users available in your department
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-dark-border">
                  {chatableUsers.map((user) => {
                    const isSelected = selectedMembers.includes(user.id);
                    const displayName =
                      `${user.firstname || ''} ${user.lastname || ''}`.trim() ||
                      user.email;

                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left',
                          isSelected && 'bg-primary-50 dark:bg-primary-900/20'
                        )}
                      >
                        <Avatar
                          src={user.profilePicture}
                          name={displayName}
                          size="sm"
                          isOnline={onlineUsers.has(user.id)}
                        />
                        <span className="flex-1 text-sm text-slate-700 dark:text-dark-text truncate">
                          {displayName}
                        </span>
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-primary-600 border-primary-600'
                              : 'border-slate-300 dark:border-dark-border'
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-dark-border">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}
