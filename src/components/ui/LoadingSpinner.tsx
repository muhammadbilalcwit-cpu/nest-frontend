'use client';

import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="card p-8 text-center">
      <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
