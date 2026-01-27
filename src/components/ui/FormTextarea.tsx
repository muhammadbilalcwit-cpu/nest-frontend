'use client';

import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function FormTextarea({
  label,
  className,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea {...textareaProps} className={clsx('input min-h-[100px]', className)} />
    </div>
  );
}
