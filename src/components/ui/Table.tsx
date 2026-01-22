'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortBy,
  sortOrder,
  onSort,
  isLoading,
  emptyMessage = 'No data found',
}: TableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-slate-700" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-t border-slate-100 dark:border-dark-border">
              <div className="h-full flex items-center px-6 gap-4">
                {columns.map((_, j) => (
                  <div key={j} className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'table-header',
                    column.sortable && 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700',
                    column.className
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortBy === column.key && (
                      sortOrder === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <p className="text-slate-500 dark:text-dark-muted">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={clsx('table-cell', column.className)}>
                      {column.render
                        ? column.render(item, index)
                        : ((item as Record<string, unknown>)[column.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
