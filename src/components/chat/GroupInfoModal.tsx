'use client';

import { useState, useRef } from 'react';
import { X, Users, Crown, UserMinus, Trash2, Pencil, Check, LogOut, UserPlus, AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useGroupChatStore } from '@/stores/group-chat.store';
import { useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar, Button } from '@/components/ui';
import { chatApi } from '@/services/api';
import type { GroupConversation } from '@/types';

interface GroupInfoModalProps {
  group: GroupConversation;
  onClose: () => void;
}

export function GroupInfoModal({ group, onClose }: GroupInfoModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(group.groupName);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAdminTransfer, setShowAdminTransfer] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<number | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<number[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const updateGroup = useGroupChatStore((s) => s.updateGroup);
  const fetchGroups = useGroupChatStore((s) => s.fetchGroups);
  const removeMember = useGroupChatStore((s) => s.removeMember);
  const deleteGroup = useGroupChatStore((s) => s.deleteGroup);
  const leaveGroup = useGroupChatStore((s) => s.leaveGroup);
  const addMembers = useGroupChatStore((s) => s.addMembers);

  const chatableUsers = useChatStore((s) => s.chatableUsers);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const isAdmin = group.groupAdmin === user?.id;

  // Get member details from chatableUsers
  const getMemberInfo = (memberId: number) => {
    if (memberId === user?.id) {
      return {
        id: user.id,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        profilePicture: null,
        isOnline: true,
      };
    }
    const member = chatableUsers.find((u) => u.id === memberId);
    if (member) {
      return {
        id: member.id,
        firstname: member.firstname || '',
        lastname: member.lastname || '',
        profilePicture: member.profilePicture,
        isOnline: onlineUsers.has(member.id),
      };
    }
    // Fallback to group members (handles cross-role visibility)
    const groupMember = group.members?.find((m) => m.id === memberId);
    return {
      id: memberId,
      firstname: groupMember?.firstname || 'Unknown',
      lastname: groupMember?.lastname || '',
      profilePicture: groupMember?.profilePicture || null,
      isOnline: onlineUsers.has(memberId),
    };
  };

  const getMemberName = (member: ReturnType<typeof getMemberInfo>) => {
    return `${member.firstname} ${member.lastname}`.trim() || 'Unknown';
  };

  const handleAvatarClick = () => {
    if (isAdmin && avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await chatApi.uploadGroupAvatar(group._id, formData);
      const avatarUrl = response.data.data.avatarUrl;

      // Update local state
      await updateGroup(group._id, { avatar: avatarUrl });
      await fetchGroups();

      toast.success('Group picture updated');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload group picture');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === group.groupName) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    const success = await updateGroup(group._id, { name: editedName.trim() });
    setIsUpdating(false);

    if (success) {
      toast.success('Group name updated');
      setIsEditing(false);
    } else {
      toast.error('Failed to update group name');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setRemovingMemberId(memberId);
    const success = await removeMember(group._id, memberId);
    setRemovingMemberId(null);

    if (success) {
      toast.success('Member removed');
    } else {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const success = await deleteGroup(group._id);
    setIsDeleting(false);

    if (success) {
      toast.success('Group deleted');
      onClose();
    } else {
      toast.error('Failed to delete group');
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle leave group - for admin, show transfer selection first
  const handleLeaveClick = () => {
    if (isAdmin && (group.participants?.length || 0) > 1) {
      // Admin needs to select new admin before leaving
      setShowAdminTransfer(true);
    } else {
      // Non-admin or last member can leave directly
      handleConfirmLeave();
    }
  };

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    const success = await leaveGroup(group._id, selectedNewAdmin || undefined);
    setIsLeaving(false);

    if (success) {
      toast.success('Left group successfully');
      onClose();
    } else {
      toast.error('Failed to leave group');
    }
  };

  const handleCancelAdminTransfer = () => {
    setShowAdminTransfer(false);
    setSelectedNewAdmin(null);
  };

  // Get other members for admin transfer selection
  const otherMembers = group.participants?.filter((id) => id !== user?.id) || [];

  // Get users that can be added to the group (not already members)
  const availableUsersToAdd = chatableUsers.filter(
    (u) => !group.participants?.includes(u.id)
  );

  const handleToggleNewMember = (userId: number) => {
    setSelectedNewMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;

    setIsAddingMembers(true);
    const success = await addMembers(group._id, selectedNewMembers);
    setIsAddingMembers(false);

    if (success) {
      toast.success(`${selectedNewMembers.length} member(s) added`);
      setShowAddMembers(false);
      setSelectedNewMembers([]);
    } else {
      toast.error('Failed to add members');
    }
  };

  const handleCancelAddMembers = () => {
    setShowAddMembers(false);
    setSelectedNewMembers([]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Group Info
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Add Members button for admin (only if there are users to add) */}
            {isAdmin && availableUsersToAdd.length > 0 && !showAdminTransfer && !showAddMembers && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="p-1.5 rounded-full text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                title="Add members"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Group Info */}
        <div className="p-4 border-b border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-4">
            {/* Group Avatar with upload option for admin */}
            <div className="relative">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={handleAvatarClick}
                disabled={!isAdmin || isUploadingAvatar}
                className={clsx(
                  'relative rounded-full overflow-hidden',
                  isAdmin && 'cursor-pointer hover:opacity-90 transition-opacity',
                  !isAdmin && 'cursor-default'
                )}
              >
                {group.groupAvatar ? (
                  <Avatar src={group.groupAvatar} name={group.groupName} size="lg" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                )}
                {/* Camera overlay for admin */}
                {isAdmin && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                    {isUploadingAvatar ? (
                      <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Group Name */}
            <div className="flex-1">
              {isEditing && isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-200 dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isUpdating}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedName(group.groupName);
                    }}
                    className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {group.groupName}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-dark-muted">
                {group.participants?.length || 0} members
              </p>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text mb-3">
              Members
            </h4>
            <div className="space-y-2">
              {group.participants?.map((memberId) => {
                const member = getMemberInfo(memberId);
                const memberName = getMemberName(member);
                const isGroupAdmin = memberId === group.groupAdmin;
                const isCurrentUser = memberId === user?.id;

                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Avatar
                      src={member.profilePicture}
                      name={memberName}
                      size="sm"
                      isOnline={member.isOnline}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-dark-text truncate">
                          {memberName}
                          {isCurrentUser && ' (You)'}
                        </span>
                        {isGroupAdmin && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                            <Crown className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-dark-muted">
                        {member.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Remove button for admin (can't remove self or other admins) */}
                    {isAdmin && !isCurrentUser && !isGroupAdmin && (
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        disabled={removingMemberId === memberId}
                        className={clsx(
                          'p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
                          removingMemberId === memberId && 'opacity-50'
                        )}
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add Members Selection (when admin wants to add members) */}
        {showAddMembers && (
          <div className="p-4 border-t border-slate-200 dark:border-dark-border">
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text mb-3">
              Select members to add
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {availableUsersToAdd.map((chatUser) => {
                const isSelected = selectedNewMembers.includes(chatUser.id);
                const memberName = `${chatUser.firstname || ''} ${chatUser.lastname || ''}`.trim() || 'Unknown';

                return (
                  <button
                    key={chatUser.id}
                    onClick={() => handleToggleNewMember(chatUser.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                    )}
                  >
                    <Avatar
                      src={chatUser.profilePicture}
                      name={memberName}
                      size="sm"
                      isOnline={onlineUsers.has(chatUser.id)}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-dark-text">
                      {memberName}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600 ml-auto" />
                    )}
                  </button>
                );
              })}
              {availableUsersToAdd.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-dark-muted text-center py-2">
                  No more users available to add
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelAddMembers}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddMembers}
                disabled={selectedNewMembers.length === 0 || isAddingMembers}
                icon={<UserPlus className="w-4 h-4" />}
                className="flex-1"
              >
                {isAddingMembers ? 'Adding...' : `Add ${selectedNewMembers.length || ''} Member${selectedNewMembers.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {/* Admin Transfer Selection (when admin wants to leave) */}
        {showAdminTransfer && (
          <div className="p-4 border-t border-slate-200 dark:border-dark-border">
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text mb-3">
              Select new admin before leaving
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {otherMembers.map((memberId) => {
                const member = getMemberInfo(memberId);
                const memberName = getMemberName(member);
                const isSelected = selectedNewAdmin === memberId;

                return (
                  <button
                    key={memberId}
                    onClick={() => setSelectedNewAdmin(memberId)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                    )}
                  >
                    <Avatar
                      src={member.profilePicture}
                      name={memberName}
                      size="sm"
                      isOnline={member.isOnline}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-dark-text">
                      {memberName}
                    </span>
                    {isSelected && (
                      <Crown className="w-4 h-4 text-primary-600 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancelAdminTransfer}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmLeave}
                disabled={!selectedNewAdmin || isLeaving}
                icon={<LogOut className="w-4 h-4" />}
                className="flex-1"
              >
                {isLeaving ? 'Leaving...' : 'Leave Group'}
              </Button>
            </div>
          </div>
        )}

        {/* Actions - show when not in admin transfer or add members mode */}
        {!showAdminTransfer && !showAddMembers && (
          <div className="p-4 border-t border-slate-200 dark:border-dark-border space-y-2">
            {/* Leave Group button for all users */}
            <Button
              variant="secondary"
              onClick={handleLeaveClick}
              disabled={isLeaving}
              icon={<LogOut className="w-4 h-4" />}
              className="w-full"
            >
              {isLeaving ? 'Leaving...' : 'Leave Group'}
            </Button>

            {/* Delete Group button for admin only */}
            {isAdmin && (
              <Button
                variant="danger"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
                className="w-full"
              >
                {isDeleting ? 'Deleting...' : 'Delete Group'}
              </Button>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-xl">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-center text-slate-900 dark:text-white mb-2">
                Delete Group
              </h3>

              {/* Message */}
              <p className="text-sm text-center text-slate-600 dark:text-dark-muted mb-6">
                Are you sure you want to delete <span className="font-medium text-slate-900 dark:text-white">&quot;{group.groupName}&quot;</span>?
                This will permanently remove all messages and cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  icon={isDeleting ? undefined : <Trash2 className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
