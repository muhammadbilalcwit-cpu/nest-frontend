'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, PageHeader, Badge, getMethodVariant, Button, Pagination, FormField, FormSelect } from '@/components/ui';
import { activityLogsApi } from '@/services/api';
import { Filter, RefreshCw } from 'lucide-react';
import type { ActivityLog, PaginationMeta } from '@/types';

export default function ActivityLogsPage() {
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
    fetchLogs(1);
  }, [fetchLogs]);

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

  // getMethodBadge replaced by Badge component with getMethodVariant helper

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
        <Badge label={log.method} variant={getMethodVariant(log.method)} />
      ),
    },
    { key: 'api', header: 'Endpoint' },
    { key: 'reason', header: 'Reason' },
    { key: 'ipAddress', header: 'IP Address' },
  ];

  return (
    <DashboardLayout title="Activity Logs">
      <PageHeader
        title="Activity Logs"
        subtitle="Monitor user activity in your organization"
        actions={
          <Button variant="secondary" onClick={() => fetchLogs(meta.page)} icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-dark-text">Filters:</span>
          </div>

          <div className="flex-1">
            <FormField
              type="text"
              value={filter.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              placeholder="Search by user, endpoint, or reason..."
            />
          </div>

          <FormSelect
            value={filter.method}
            onChange={(e) => handleFilterChange('method', e.target.value)}
            className="w-auto"
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
            placeholder="All Methods"
          />

          <Button onClick={handleApplyFilters}>
            Apply
          </Button>
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
      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={handlePageChange}
      />
    </DashboardLayout>
  );
}
