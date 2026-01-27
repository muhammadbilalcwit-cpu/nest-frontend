'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        variant="secondary"
        onClick={() => handlePageChange(page - 1)}
        disabled={page <= 1}
        icon={<ChevronLeft className="w-4 h-4" />}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </Button>

      <div className="flex items-center gap-2">
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              page === pageNum
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-dark-text hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {pageNum}
          </button>
        ))}
      </div>

      <Button
        variant="secondary"
        onClick={() => handlePageChange(page + 1)}
        disabled={page >= totalPages}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
