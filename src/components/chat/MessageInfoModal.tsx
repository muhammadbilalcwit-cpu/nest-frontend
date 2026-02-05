'use client';

import { useEffect, useState } from 'react';
import { X, CheckCheck, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { chatApi } from '@/services/api';
import { Avatar } from '@/components/ui';

interface MessageInfoModalProps {
  messageId: string;
  onClose: () => void;
}

interface UserInfo {
  userId: number;
  timestamp?: string;
  user: {
    firstname: string | null;
    lastname: string | null;
    profilePicture: string | null;
  } | null;
}

interface MessageInfoData {
  deliveredTo: UserInfo[];
  readBy: UserInfo[];
  pending: UserInfo[];
}

export function MessageInfoModal({ messageId, onClose }: MessageInfoModalProps) {
  const [info, setInfo] = useState<MessageInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setIsLoading(true);
        const response = await chatApi.getMessageInfo(messageId);
        setInfo(response.data.data);
      } catch (err: unknown) {
        console.error('Failed to fetch message info:', err);
        // Check for specific error types
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          setError('Only the sender can view message info');
        } else if (axiosError.response?.status === 404) {
          setError('Message not found');
        } else {
          setError(axiosError.response?.data?.message || 'Failed to load message info');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [messageId]);

  const getUserName = (user: UserInfo['user']) => {
    if (!user) return 'Unknown';
    return `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unknown';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-sm mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Message Info
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : info ? (
            <div className="divide-y divide-slate-100 dark:divide-dark-border">
              {/* Read by section */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCheck className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-dark-text">
                    Read by ({info.readBy.length})
                  </span>
                </div>
                {info.readBy.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-dark-muted pl-6">
                    No one has read yet
                  </p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {info.readBy.map((item) => (
                      <div
                        key={item.userId}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          src={item.user?.profilePicture}
                          name={getUserName(item.user)}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-dark-text truncate">
                            {getUserName(item.user)}
                          </p>
                          {item.timestamp && (
                            <p className="text-xs text-slate-500 dark:text-dark-muted">
                              {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivered to section */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCheck className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-dark-text">
                    Delivered to ({info.deliveredTo.length})
                  </span>
                </div>
                {info.deliveredTo.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-dark-muted pl-6">
                    No pending deliveries
                  </p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {info.deliveredTo.map((item) => (
                      <div
                        key={item.userId}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          src={item.user?.profilePicture}
                          name={getUserName(item.user)}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-dark-text truncate">
                            {getUserName(item.user)}
                          </p>
                          {item.timestamp && (
                            <p className="text-xs text-slate-500 dark:text-dark-muted">
                              {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending section */}
              {info.pending.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-dark-text">
                      Pending ({info.pending.length})
                    </span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {info.pending.map((item) => (
                      <div
                        key={item.userId}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          src={item.user?.profilePicture}
                          name={getUserName(item.user)}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-dark-text truncate">
                            {getUserName(item.user)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-dark-muted">
                            Not delivered yet
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
