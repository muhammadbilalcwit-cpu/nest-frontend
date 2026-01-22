'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { activityLogsApi } from '@/services/api';
import { Activity, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityLog, PaginationMeta } from '@/types';

export default function ActivityLogsPage() {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    method: '',
    search: '',
  });

  const canViewLogs = hasRole(['super_admin', 'company_admin']);

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await activityLogsApi.getAll({
        page,
        limit: 8,
        method: filter.method || undefined,
        search: filter.search || undefined,
      });
      setLogs(response.data.data.data);
      setMeta(response.data.data.meta);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter.method, filter.search]);

  useEffect(() => {
    if (canViewLogs) {
      fetchLogs(1);
    }
  }, [canViewLogs, fetchLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      fetchLogs(newPage);
    }
  };

  const handleFilterChange = (key: 'method' | 'search', value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchLogs(1);
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'badge-primary',
      POST: 'badge-success',
      PUT: 'badge-warning',
      PATCH: 'badge-warning',
      DELETE: 'badge-danger',
    };
    return colors[method] || 'bg-slate-100 text-slate-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      render: (_log: ActivityLog, index: number) => (meta.page - 1) * meta.limit + index + 1,
    },
    {
      key: 'createdAt',
      header: 'Time',
      sortable: true,
      render: (log: ActivityLog) => (
        <span className="text-sm">{formatTimestamp(log.createdAt)}</span>
      ),
    },
    { key: 'username', header: 'User', sortable: true },
    {
      key: 'method',
      header: 'Method',
      render: (log: ActivityLog) => (
        <span className={`badge ${getMethodBadge(log.method)}`}>{log.method}</span>
      ),
    },
    { key: 'api', header: 'Endpoint' },
    { key: 'reason', header: 'Reason' },
    { key: 'ipAddress', header: 'IP Address' },
  ];

  if (!canViewLogs) {
    return (
      <DashboardLayout title="Activity Logs">
        <div className="card p-8 text-center">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Access Restricted
          </h3>
          <p className="text-slate-500 dark:text-dark-muted">
            Only Super Admins and Company Admins can view activity logs.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Activity Logs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Logs</h2>
          <p className="text-slate-500 dark:text-dark-muted mt-1">
            Monitor user activity in your organization
          </p>
        </div>

        <button
          onClick={() => fetchLogs(meta.page)}
          className="btn-secondary flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-dark-text">Filters:</span>
          </div>

          <div className="flex-1">
            <input
              type="text"
              value={filter.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              placeholder="Search by user, endpoint, or reason..."
              className="input"
            />
          </div>

          <select
            value={filter.method}
            onChange={(e) => {
              handleFilterChange('method', e.target.value);
              setTimeout(() => fetchLogs(1), 0);
            }}
            className="input w-auto"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <button
            onClick={handleApplyFilters}
            className="btn-primary"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-dark-muted">
            Showing <span className="font-medium">{logs.length}</span> of{' '}
            <span className="font-medium">{meta.total}</span> logs
          </div>
          <div className="text-sm text-slate-600 dark:text-dark-muted">
            Page <span className="font-medium">{meta.page}</span> of{' '}
            <span className="font-medium">{meta.totalPages}</span>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={logs}
        keyExtractor={(log) => log.id}
        isLoading={isLoading}
        emptyMessage="No activity logs found"
      />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={meta.page <= 1}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              let pageNum: number;
              if (meta.totalPages <= 5) {
                pageNum = i + 1;
              } else if (meta.page <= 3) {
                pageNum = i + 1;
              } else if (meta.page >= meta.totalPages - 2) {
                pageNum = meta.totalPages - 4 + i;
              } else {
                pageNum = meta.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    meta.page === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-dark-text hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
