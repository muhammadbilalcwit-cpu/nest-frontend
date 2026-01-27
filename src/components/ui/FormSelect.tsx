'use client';

import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface FormSelectOption {
  value: string | number;
  label: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: FormSelectOption[];
  placeholder?: string;
}

export function FormSelect({
  label,
  options,
  placeholder,
  className,
  ...selectProps
}: FormSelectProps) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select {...selectProps} className={clsx('input', className)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
