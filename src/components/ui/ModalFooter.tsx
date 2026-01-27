'use client';

import { Button } from './Button';

interface ModalFooterProps {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  isLoading?: boolean;
  loadingText?: string;
  isSubmit?: boolean;
  onSubmit?: () => void;
  disabled?: boolean;
}

export function ModalFooter({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
  loadingText = 'Saving...',
  isSubmit = true,
  onSubmit,
  disabled = false,
}: ModalFooterProps) {
  return (
    <div className="flex gap-3 pt-4">
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        className="flex-1"
        disabled={isLoading}
      >
        {cancelLabel}
      </Button>
      <Button
        type={isSubmit ? 'submit' : 'button'}
        onClick={onSubmit}
        isLoading={isLoading}
        loadingText={loadingText}
        className="flex-1"
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
