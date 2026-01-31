'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, PageHeader, Badge, getMethodVariant, Button, Pagination, FormField, FormSelect } from '@/components/ui';
import { useActivityLogs } from '@/hooks/queries';
import { Filter, RefreshCw, X } from 'lucide-react';
import type { ActivityLog } from '@/types';

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Debounce search input (300ms delay)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Build params object only with defined values for proper cache key comparison
  const queryParams = {
    page,
    limit: 8,
    ...(methodFilter && { method: methodFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isLoading, refetch } = useActivityLogs(queryParams);

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 8, totalPages: 0 };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, methodFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setMethodFilter('');
    setPage(1);
  }, []);

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
          <Button variant="secondary" onClick={() => refetch()} icon={<RefreshCw className="w-4 h-4" />}>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user, endpoint, or reason..."
            />
          </div>

          <FormSelect
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
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

          {(searchInput || methodFilter) && (
            <Button variant="secondary" onClick={handleClearFilters} icon={<X className="w-4 h-4" />}>
              Clear
            </Button>
          )}
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
