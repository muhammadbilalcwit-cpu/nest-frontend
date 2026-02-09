'use client';

import { useState, useRef } from 'react';
import { Paperclip, Image as ImageIcon, FileText, Video, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import { toast } from 'sonner';
import { chatApi } from '@/services/api';
import type { MessageAttachment } from '@/types';

interface AttachmentButtonProps {
  onAttachmentReady: (attachment: MessageAttachment) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  document:
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip,application/x-rar-compressed',
};

const SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
};

function getFileType(mimeType: string): 'image' | 'video' | 'document' | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('sheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation') ||
    mimeType.includes('text/') ||
    mimeType.includes('zip') ||
    mimeType.includes('rar')
  ) {
    return 'document';
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentButton({
  onAttachmentReady,
  disabled,
}: AttachmentButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedTypeRef = useRef<'image' | 'video' | 'document'>('image');

  const handleTypeSelect = (type: 'image' | 'video' | 'document') => {
    selectedTypeRef.current = type;
    setShowMenu(false);

    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPTED_TYPES[type];
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Validate file type
    const fileType = getFileType(file.type);
    if (!fileType) {
      toast.error('Unsupported file type');
      return;
    }

    // Validate file size
    const sizeLimit = SIZE_LIMITS[fileType];
    if (file.size > sizeLimit) {
      toast.error(
        `File too large. Maximum size for ${fileType}s is ${formatFileSize(sizeLimit)}`
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for UX (actual upload doesn't report progress with axios)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await chatApi.uploadAttachment(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.status_code === 200 && response.data.data) {
        const data = response.data.data;
        const attachment: MessageAttachment = {
          type: data.type,
          url: data.url,
          filename: data.filename,
          originalFilename: data.originalFilename,
          size: data.size,
          mimeType: data.mimeType,
        };

        onAttachmentReady(attachment);
      } else {
        toast.error('Failed to upload attachment');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />

      {/* Attachment button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isUploading}
        className={clsx(
          'p-2 rounded-full transition-colors',
          'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Attach file"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>

      {/* Dropdown menu */}
      {showMenu && !isUploading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div
            className={clsx(
              'absolute bottom-full left-0 mb-2 z-50',
              'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
              'border border-slate-200 dark:border-slate-700',
              'py-1 min-w-[160px]'
            )}
          >
            <button
              onClick={() => handleTypeSelect('image')}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5',
                'text-sm text-slate-700 dark:text-slate-200',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'transition-colors'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span>Photo</span>
            </button>

            <button
              onClick={() => handleTypeSelect('video')}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5',
                'text-sm text-slate-700 dark:text-slate-200',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'transition-colors'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Video className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span>Video</span>
            </button>

            <button
              onClick={() => handleTypeSelect('document')}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5',
                'text-sm text-slate-700 dark:text-slate-200',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'transition-colors'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Document</span>
            </button>
          </div>
        </>
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap">
          Uploading... {uploadProgress}%
        </div>
      )}
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: MessageAttachment;
  onRemove: () => void;
}

export function AttachmentPreview({
  attachment,
  onRemove,
}: AttachmentPreviewProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const fullUrl = attachment.url.startsWith('http')
    ? attachment.url
    : `${API_URL}${attachment.url}`;

  return (
    <div className="relative inline-flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg max-w-[250px]">
      {/* Preview based on type */}
      {attachment.type === 'image' && (
        <Image
          src={fullUrl}
          alt={attachment.originalFilename}
          width={48}
          height={48}
          className="w-12 h-12 object-cover rounded"
          unoptimized
        />
      )}

      {attachment.type === 'video' && (
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
          <Video className="w-6 h-6 text-slate-500" />
        </div>
      )}

      {attachment.type === 'document' && (
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
          <FileText className="w-6 h-6 text-slate-500" />
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-slate-900 dark:text-white">
          {attachment.originalFilename}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        title="Remove attachment"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
