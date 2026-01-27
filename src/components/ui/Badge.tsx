'use client';

import clsx from 'clsx';

type BadgeVariant = 'danger' | 'warning' | 'primary' | 'success' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  danger: 'badge-danger',
  warning: 'badge-warning',
  primary: 'badge-primary',
  success: 'badge-success',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span className={clsx('badge', variantClasses[variant], className)}>
      {label}
    </span>
  );
}

// Helper to map role slugs to badge variants
export function getRoleVariant(slug: string): BadgeVariant {
  switch (slug?.toLowerCase()) {
    case 'super_admin':
      return 'danger';
    case 'company_admin':
      return 'warning';
    case 'manager':
      return 'primary';
    case 'user':
      return 'success';
    default:
      return 'default';
  }
}

// Helper to map HTTP methods to badge variants
export function getMethodVariant(method: string): BadgeVariant {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'primary';
    case 'POST':
      return 'success';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'default';
  }
}

// Helper to map active/inactive status to badge variant
export function getStatusVariant(isActive: boolean): BadgeVariant {
  return isActive ? 'success' : 'danger';
}
