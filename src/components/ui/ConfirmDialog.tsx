'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Alert } from './Alert';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  error = null,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDestructive
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-amber-100 dark:bg-amber-900/30'
        }`}>
          <AlertTriangle className={`w-6 h-6 ${
            isDestructive
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`} />
        </div>
        <p className="text-slate-600 dark:text-dark-muted mb-4">{message}</p>
        {error && (
          <Alert variant="error" message={error} className="mb-4" />
        )}
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="px-6"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="px-6"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
