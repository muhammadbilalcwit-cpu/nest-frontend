'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, User, Loader2, Volume2, VolumeX, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { supportQueueApi } from '@/services/api';
import { useChatStore } from '@/stores/chat.store';
import type { SupportQueueConversation } from '@/types';

interface SupportQueueListProps {
  searchQuery: string;
}

type QueueFilter = 'waiting' | 'active' | 'resolved';

export function SupportQueueList({ searchQuery }: SupportQueueListProps) {
  const [filter, setFilter] = useState<QueueFilter>('waiting');
  const [items, setItems] = useState<SupportQueueConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState({ waiting: 0, active: 0, resolved: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ waiting: 0, active: 0, resolved: 0 });
  const [accepting, setAccepting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousWaitingCountRef = useRef(0);
  const hasAutoSwitched = useRef(false);

  const selectConversation = useChatStore((s) => s.selectConversation);
  const setSupportWaitingCount = useChatStore((s) => s.setSupportWaitingCount);

  const fetchQueue = useCallback(async (filterOverride?: QueueFilter) => {
    const activeFilter = filterOverride ?? filter;
    setLoading(true);
    try {
      const response = await supportQueueApi.getQueue(activeFilter);
      const data = response.data.data;
      setItems(data.items);
      setStatusCounts(data.statusCounts);
      if (data.unreadCounts) setUnreadCounts(data.unreadCounts);

      // Always sync waiting count to store for the Support tab badge
      setSupportWaitingCount(data.statusCounts.waiting);

      // Auto-switch to the filter with unreads on first load
      if (!hasAutoSwitched.current && data.unreadCounts) {
        hasAutoSwitched.current = true;
        if (data.unreadCounts.active > 0) {
          setFilter('active');
          // Re-fetch with active filter to get the right items
          const activeRes = await supportQueueApi.getQueue('active');
          const activeData = activeRes.data.data;
          setItems(activeData.items);
          setStatusCounts(activeData.statusCounts);
          if (activeData.unreadCounts) setUnreadCounts(activeData.unreadCounts);
        } else if (data.unreadCounts.waiting > 0 && activeFilter !== 'waiting') {
          setFilter('waiting');
          const waitingRes = await supportQueueApi.getQueue('waiting');
          const waitingData = waitingRes.data.data;
          setItems(waitingData.items);
          setStatusCounts(waitingData.statusCounts);
          if (waitingData.unreadCounts) setUnreadCounts(waitingData.unreadCounts);
        }
      }

      // Browser notification for new waiting items
      if (data.statusCounts.waiting > previousWaitingCountRef.current && previousWaitingCountRef.current > 0) {
        playNotificationSound();
        showBrowserNotification(data.statusCounts.waiting - previousWaitingCountRef.current);
      }
      previousWaitingCountRef.current = data.statusCounts.waiting;
    } catch (error) {
      console.error('Failed to fetch support queue:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, setSupportWaitingCount]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Listen for socket events to refresh queue
  useEffect(() => {
    const handleQueueUpdate = () => fetchQueue();

    // Listen for custom events dispatched from socket handlers
    window.addEventListener('support:queue:new', handleQueueUpdate);
    window.addEventListener('support:queue:updated', handleQueueUpdate);

    // Customer online/offline — update isOnline in list items
    const handleCustomerOnline = (e: Event) => {
      const customerId = (e as CustomEvent).detail?.customerId;
      if (customerId) {
        setItems((prev) => prev.map((i) =>
          i.customerInfo?.customerId === customerId
            ? { ...i, customerInfo: { ...i.customerInfo, isOnline: true } }
            : i
        ));
      }
    };
    const handleCustomerOffline = (e: Event) => {
      const customerId = (e as CustomEvent).detail?.customerId;
      if (customerId) {
        setItems((prev) => prev.map((i) =>
          i.customerInfo?.customerId === customerId
            ? { ...i, customerInfo: { ...i.customerInfo, isOnline: false } }
            : i
        ));
      }
    };
    window.addEventListener('customer:online', handleCustomerOnline);
    window.addEventListener('customer:offline', handleCustomerOffline);

    return () => {
      window.removeEventListener('support:queue:new', handleQueueUpdate);
      window.removeEventListener('support:queue:updated', handleQueueUpdate);
      window.removeEventListener('customer:online', handleCustomerOnline);
      window.removeEventListener('customer:offline', handleCustomerOffline);
    };
  }, [fetchQueue]);

  const handleAccept = async (item: SupportQueueConversation) => {
    setAccepting(item._id);
    try {
      const response = await supportQueueApi.acceptConversation(item._id);
      const updatedConv = response.data.data;
      // Select the conversation in the chat panel with customer info as otherUser
      selectConversation({
        _id: updatedConv._id,
        participants: updatedConv.participants,
        isGroup: updatedConv.isGroup,
        otherUser: item.customerInfo
          ? {
              id: item.customerInfo.customerId,
              email: item.customerInfo.email,
              firstname: item.customerInfo.name,
              lastname: '',
              profilePicture: null,
              isOnline: item.customerInfo.isOnline,
            }
          : undefined,
        lastMessage: updatedConv.lastMessage || null,
        lastMessageSenderId: updatedConv.lastMessageSenderId || null,
        lastMessageAt: updatedConv.lastMessageAt || null,
        unreadCount: 0,
        deletedFor: [],
        isSupportChat: true,
        supportStatus: 'active',
        supportMetadata: item.supportMetadata,
        customerInfo: item.customerInfo || undefined,
      });
      // Switch to active tab and refresh
      setFilter('active');
      fetchQueue('active');
    } catch (error) {
      console.error('Failed to accept conversation:', error);
    } finally {
      setAccepting(null);
    }
  };

  const handleResolve = async (conversationId: string) => {
    setResolving(conversationId);
    try {
      await supportQueueApi.resolveConversation(conversationId);
      // Clear active conversation if it was the resolved one
      const active = useChatStore.getState().activeConversation;
      if (active?._id === conversationId) {
        useChatStore.setState({ activeConversation: null, messages: [] });
      }
      setFilter('resolved');
      fetchQueue();
    } catch (error) {
      console.error('Failed to resolve conversation:', error);
    } finally {
      setResolving(null);
    }
  };

  const handleSelectActive = (item: SupportQueueConversation) => {
    const itemUnread = item.unreadCount || 0;

    selectConversation({
      _id: item._id,
      participants: item.participants,
      isGroup: item.isGroup,
      otherUser: item.customerInfo
        ? {
            id: item.customerInfo.customerId,
            email: item.customerInfo.email,
            firstname: item.customerInfo.name,
            lastname: '',
            profilePicture: null,
            isOnline: item.customerInfo.isOnline,
          }
        : undefined,
      lastMessage: item.lastMessage || null,
      lastMessageSenderId: item.lastMessageSenderId || null,
      lastMessageAt: item.lastMessageAt || null,
      unreadCount: itemUnread,
      deletedFor: [],
      isSupportChat: true,
      supportStatus: item.supportStatus,
      supportMetadata: item.supportMetadata,
      customerInfo: item.customerInfo || undefined,
    });

    // Clear unread count locally for this item and decrement filter unread count
    if (itemUnread > 0) {
      setItems((prev) => prev.map((i) => i._id === item._id ? { ...i, unreadCount: 0 } : i));
      setUnreadCounts((prev) => ({
        ...prev,
        [filter]: Math.max(0, prev[filter] - itemUnread),
      }));
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const showBrowserNotification = (count: number) => {
    if (Notification.permission === 'granted') {
      new Notification('New Support Request', {
        body: `${count} new customer${count > 1 ? 's' : ''} waiting for support`,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const ci = item.customerInfo;
    if (!ci) return false;
    const q = searchQuery.toLowerCase();
    return (
      ci.email.toLowerCase().includes(q) ||
      (ci.name?.toLowerCase() || '').includes(q)
    );
  });

  const formatWaitTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs + sound toggle */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-dark-border bg-white dark:bg-dark-card">
        {(['waiting', 'active', 'resolved'] as QueueFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-2.5 py-1 text-xs font-medium rounded-full transition-colors capitalize',
              filter === f
                ? f === 'waiting'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : f === 'active'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {f}
            {statusCounts[f] > 0 && (
              <span className={clsx(
                'ml-1 font-bold',
                filter !== f && 'text-[10px]',
              )}>
                {statusCounts[f]}
              </span>
            )}
            {unreadCounts[f] > 0 && filter !== f && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {unreadCounts[f] > 99 ? '99+' : unreadCounts[f]}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-dark-muted">
            <p className="text-sm">No {filter} conversations</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={clsx(
                  'px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all border-l-2',
                  filter === 'waiting' && 'border-l-amber-400',
                  filter === 'active' && 'border-l-green-400',
                  filter === 'resolved' && 'border-l-slate-300 dark:border-l-slate-600',
                  (filter === 'active' || filter === 'resolved') && 'cursor-pointer'
                )}
                onClick={() => {
                  if (filter === 'active' || filter === 'resolved') handleSelectActive(item);
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                    filter === 'waiting' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : filter === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}>
                    {item.customerInfo?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 dark:text-dark-text truncate">
                        {item.customerInfo
                          ? item.customerInfo.name || item.customerInfo.email
                          : 'Unknown Customer'}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-400">
                          {filter === 'waiting'
                            ? formatWaitTime(item.supportMetadata?.waitingSince)
                            : filter === 'active'
                            ? formatWaitTime(item.supportMetadata?.acceptedAt)
                            : formatWaitTime(item.supportMetadata?.resolvedAt)}
                        </span>
                        {(item.unreadCount || 0) > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold bg-red-500 text-white rounded-full">
                            {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.customerInfo?.email && (
                      <p className="text-xs text-slate-500 dark:text-dark-muted truncate">{item.customerInfo.email}</p>
                    )}

                    {item.lastMessage && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.lastMessage}</p>
                    )}

                    {/* Actions */}
                    {filter === 'waiting' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(item);
                        }}
                        disabled={accepting === item._id}
                        className="mt-1.5 px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 rounded-full transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm"
                      >
                        {accepting === item._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Accept
                      </button>
                    )}

                    {filter === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(item._id);
                        }}
                        disabled={resolving === item._id}
                        className="mt-1.5 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {resolving === item._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
