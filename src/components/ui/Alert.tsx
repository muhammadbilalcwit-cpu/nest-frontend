'use client';

import { AlertCircle, Check, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; text: string }> = {
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-600 dark:text-red-400',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-600 dark:text-green-400',
  },
};

const variantIcons: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: Check,
};

export function Alert({ variant = 'error', message, className }: AlertProps) {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      className={clsx(
        'p-4 border rounded-lg flex items-center gap-3',
        styles.container,
        className
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0', styles.icon)} />
      <p className={clsx('text-sm', styles.text)}>{message}</p>
    </div>
  );
}
