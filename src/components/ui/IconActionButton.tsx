'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type IconActionColor = 'primary' | 'danger' | 'amber' | 'orange' | 'green';

interface IconActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  color?: IconActionColor;
}

const colorClasses: Record<IconActionColor, string> = {
  primary: 'text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20',
  danger: 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
  amber: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  orange: 'text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20',
  green: 'text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
};

export function IconActionButton({
  icon,
  color = 'primary',
  className,
  ...buttonProps
}: IconActionButtonProps) {
  return (
    <button
      {...buttonProps}
      className={clsx('p-2 rounded-lg transition-colors', colorClasses[color], className)}
    >
      {icon}
    </button>
  );
}
