'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
};

export function Button({
  variant = 'primary',
  icon,
  isLoading,
  loadingText,
  children,
  className,
  disabled,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      {...buttonProps}
      disabled={disabled || isLoading}
      className={clsx(variantClasses[variant], 'flex items-center justify-center gap-2', className)}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText || 'Processing...'}
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
