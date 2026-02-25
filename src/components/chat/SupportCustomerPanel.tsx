'use client';

import { useState, useEffect } from 'react';
import { Mail, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { supportQueueApi } from '@/services/api';
import { useChatStore } from '@/stores/chat.store';
import type { SupportCustomerInfo, CustomerHistoryConversation } from '@/types';

interface SupportCustomerPanelProps {
  customerInfo: SupportCustomerInfo;
  conversationId: string;
}

export function SupportCustomerPanel({ customerInfo, conversationId }: SupportCustomerPanelProps) {
  const [history, setHistory] = useState<CustomerHistoryConversation[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeConversationId = useChatStore((s) => s.activeConversation?._id);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await supportQueueApi.getCustomerHistory(customerInfo.customerId);
        if (cancelled) return;
        const data = response.data.data;
        setHistory(data.items);
        setTotalConversations(data.total);
      } catch (error) {
        console.error('Failed to fetch customer history:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [customerInfo.customerId]);

  const handleSelectConversation = (conv: CustomerHistoryConversation) => {
    if (conv._id === activeConversationId) return;
    useChatStore.getState().selectConversation({
      _id: conv._id,
      participants: [],
      lastMessage: null,
      lastMessageSenderId: null,
      lastMessageAt: null,
      isSupportChat: true,
      supportStatus: conv.supportStatus as 'waiting' | 'active' | 'resolved',
      customerInfo,
      supportMetadata: conv.supportMetadata,
      otherUser: {
        id: customerInfo.customerId,
        email: customerInfo.email,
        firstname: customerInfo.name,
        lastname: '',
        profilePicture: null,
        isOnline: customerInfo.isOnline,
      },
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  return (
    <div className="p-3 space-y-4">
      {/* Customer info header */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
        <h3 className="text-[10px] font-semibold text-slate-400 dark:text-dark-muted uppercase tracking-wider mb-2.5">
          Customer Info
        </h3>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-semibold text-sm flex-shrink-0 ring-2 ring-primary-100 dark:ring-primary-800/50">
            {customerInfo.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {customerInfo.name || 'Unknown'}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  customerInfo.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-500'
                )}
              />
              <span className="text-xs text-slate-500 dark:text-dark-muted">
                {customerInfo.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-dark-muted truncate">
              {customerInfo.email}
            </span>
          </div>
          {customerInfo.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 dark:text-dark-muted">
                {customerInfo.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conversation history */}
      <div>
        <h3 className="text-[10px] font-semibold text-slate-400 dark:text-dark-muted uppercase tracking-wider mb-2">
          History ({totalConversations})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No conversations</p>
        ) : (
          <div className="space-y-1.5">
            {history.map((conv) => {
              const isActive = conv._id === activeConversationId;
              const isCurrent = conv._id === conversationId;
              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={clsx(
                    'w-full text-left p-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer'
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={clsx(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          conv.supportStatus === 'resolved'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            : conv.supportStatus === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        )}
                      >
                        {conv.supportStatus}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                          current
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(conv.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-dark-muted">
                    <MessageSquare className="w-3 h-3" />
                    <span>{conv.messageCount} messages</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
