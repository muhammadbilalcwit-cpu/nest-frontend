'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export function FormField({
  label,
  icon,
  rightElement,
  className,
  ...inputProps
}: FormFieldProps) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {icon || rightElement ? (
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            {...inputProps}
            className={clsx('input', icon && 'pl-10', rightElement && 'pr-10', className)}
          />
          {rightElement && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </span>
          )}
        </div>
      ) : (
        <input {...inputProps} className={clsx('input', className)} />
      )}
    </div>
  );
}
