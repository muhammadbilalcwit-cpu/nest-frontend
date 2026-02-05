'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout';
import { PageHeader, FormField, Button, Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import {
  useUpdateProfile,
  useUploadAvatar,
  useRemoveAvatar,
} from '@/hooks/mutations';
import { getErrorMessage } from '@/lib/error-utils';
import { User as UserIcon, Lock, Palette, Camera, Trash2 } from 'lucide-react';
import clsx from 'clsx';

type SettingsTab = 'profile' | 'password' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  // File input ref for avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    realtime: true,
    sound: false,
  });

  // Avatar upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG and WebP files are allowed');
      return;
    }

    uploadAvatar.mutate(file, {
      onSuccess: () => {
        toast.success('Profile picture updated successfully');
        // Refresh user data in auth store
        fetchUser();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, 'Failed to upload profile picture'));
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Avatar remove handler
  const handleAvatarRemove = () => {
    removeAvatar.mutate(undefined, {
      onSuccess: () => {
        toast.success('Profile picture removed successfully');
        // Refresh user data in auth store
        fetchUser();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, 'Failed to remove profile picture'));
      },
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    updateProfile.mutate(
      {
        password: passwordData.newPassword,
        currentPassword: passwordData.currentPassword,
      },
      {
        onSuccess: () => {
          toast.success('Password changed successfully');
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Failed to change password'));
        },
      }
    );
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout title="Settings">
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-slate-600 dark:text-dark-muted hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Profile Information
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-dark-muted mb-6">
                    Your personal information and profile picture.
                  </p>
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="relative">
                    <Avatar
                      src={user?.profilePicture}
                      name={user?.firstname || user?.email || 'User'}
                      size="xl"
                    />
                    {(uploadAvatar.isPending || removeAvatar.isPending) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                      Profile Picture
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-dark-muted mb-3">
                      JPG, PNG or WebP. Max size 2MB.
                    </p>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-sm px-3 py-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadAvatar.isPending || removeAvatar.isPending}
                        icon={<Camera className="w-4 h-4" />}
                      >
                        {user?.profilePicture ? 'Change' : 'Upload'}
                      </Button>
                      {user?.profilePicture && (
                        <Button
                          type="button"
                          variant="danger"
                          className="text-sm px-3 py-1.5"
                          onClick={handleAvatarRemove}
                          disabled={uploadAvatar.isPending || removeAvatar.isPending}
                          icon={<Trash2 className="w-4 h-4" />}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <FormField
                  label="Email Address"
                  type="email"
                  value={user?.email || ''}
                  className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                  disabled
                />

                <FormField
                  label="First Name"
                  type="text"
                  value={user?.firstname || '-'}
                  className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                  disabled
                />

                <FormField
                  label="Last Name"
                  type="text"
                  value={user?.lastname || '-'}
                  className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                  disabled
                />
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Change Password
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-dark-muted mb-6">
                    Ensure your account is using a strong password.
                  </p>
                </div>

                <FormField
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                />

                <FormField
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                />

                <FormField
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />

                <Button
                  type="submit"
                  isLoading={updateProfile.isPending}
                  loadingText="Changing..."
                  icon={<Lock className="w-4 h-4" />}
                >
                  Change Password
                </Button>
              </form>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-dark-muted mb-6">
                    Manage how you receive notifications.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Real-time Notifications
                      </div>
                      <div className="text-sm text-slate-500 dark:text-dark-muted">
                        Receive instant notifications for important updates
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.realtime}
                      onChange={(e) => setNotifications({ ...notifications, realtime: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Sound Alerts
                      </div>
                      <div className="text-sm text-slate-500 dark:text-dark-muted">
                        Play a sound when receiving notifications
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.sound}
                      onChange={(e) => setNotifications({ ...notifications, sound: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Appearance
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-dark-muted mb-6">
                    Customize how the application looks.
                  </p>
                </div>

                <div>
                  <label className="label mb-3">Theme</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={clsx(
                        'p-4 rounded-lg border-2 transition-colors',
                        theme === 'light'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-dark-border hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-amber-400" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">Light</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-dark-muted text-left">
                        A light theme with bright colors
                      </p>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={clsx(
                        'p-4 rounded-lg border-2 transition-colors',
                        theme === 'dark'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-dark-border hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-slate-400" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">Dark</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-dark-muted text-left">
                        A dark theme that&apos;s easy on the eyes
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
