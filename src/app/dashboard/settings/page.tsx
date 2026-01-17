'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/services/api';
import {
  User as UserIcon,
  Lock,
  Palette,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

type SettingsTab = 'profile' | 'password' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

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

  useEffect(() => {
    // Read theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setCurrentTheme('dark');
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await usersApi.updateProfile({
        password: passwordData.newPassword,
        currentPassword: passwordData.currentPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('success', 'Password changed successfully');
    } catch (error: unknown) {
      console.error('Failed to change password:', error);
      // Extract error message from API response
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to change password';
      showMessage('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    // { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> }, // Hidden until implemented
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout title="Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-dark-muted mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={clsx(
            'mb-6 p-4 rounded-lg flex items-center gap-3',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          )}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <p
            className={clsx(
              'text-sm',
              message.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {message.text}
          </p>
        </div>
      )}

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
                    Your personal information. Contact an administrator to update your profile details.
                  </p>
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={user?.firstname || '-'}
                    className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={user?.lastname || '-'}
                    className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                    disabled
                  />
                </div>
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

                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isSubmitting ? 'Changing...' : 'Change Password'}
                </button>
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
                      onClick={() => handleThemeChange('light')}
                      className={clsx(
                        'p-4 rounded-lg border-2 transition-colors',
                        currentTheme === 'light'
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
                      onClick={() => handleThemeChange('dark')}
                      className={clsx(
                        'p-4 rounded-lg border-2 transition-colors',
                        currentTheme === 'dark'
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

                {/* <div>
                  <label className="label mb-3">Language</label>
                  <select className="input w-auto">
                    <option value="en">English</option>
                    <option value="es" disabled>Spanish (Coming Soon)</option>
                    <option value="fr" disabled>French (Coming Soon)</option>
                  </select>
                </div> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
