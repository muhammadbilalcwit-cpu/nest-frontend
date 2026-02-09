'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Play, X } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import type { MessageAttachment as MessageAttachmentType } from '@/types';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { useUIStore } from '@/stores/ui.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface MessageAttachmentProps {
  attachment: MessageAttachmentType;
  isOwn: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'XLS';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.includes('text')) return 'TXT';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'ZIP';
  return 'FILE';
}

export function MessageAttachment({ attachment, isOwn }: MessageAttachmentProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openOverlay = useUIStore((s) => s.openOverlay);
  const closeOverlay = useUIStore((s) => s.closeOverlay);

  // For portal to work, we need to ensure we're on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle lightbox open/close with overlay tracking
  const handleOpenLightbox = useCallback(() => {
    setShowLightbox(true);
    openOverlay();
  }, [openOverlay]);

  const handleCloseLightbox = useCallback(() => {
    setShowLightbox(false);
    closeOverlay();
  }, [closeOverlay]);

  const fullUrl = attachment.url.startsWith('http')
    ? attachment.url
    : `${API_URL}${attachment.url}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = attachment.originalFilename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Image attachment
  if (attachment.type === 'image') {
    return (
      <>
        <div
          className="relative cursor-pointer rounded-lg overflow-hidden"
          onClick={handleOpenLightbox}
        >
          <Image
            src={fullUrl}
            alt={attachment.originalFilename}
            width={220}
            height={180}
            className="object-cover rounded-lg"
            style={{ maxWidth: '220px', maxHeight: '180px', width: 'auto', height: 'auto' }}
            unoptimized
          />
        </div>

        {/* Lightbox - rendered via portal to escape chat container */}
        {showLightbox && mounted && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLightbox();
            }}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseLightbox();
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <button
              className="absolute top-4 left-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-6 h-6" />
            </button>
            <Image
              src={fullUrl}
              alt={attachment.originalFilename}
              width={1200}
              height={900}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
              unoptimized
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Video attachment
  if (attachment.type === 'video') {
    return (
      <div className="relative rounded-lg overflow-hidden" style={{ maxWidth: '250px' }}>
        {!isVideoPlaying ? (
          <div
            className="relative cursor-pointer"
            onClick={() => setIsVideoPlaying(true)}
          >
            {attachment.thumbnailUrl ? (
              <Image
                src={
                  attachment.thumbnailUrl.startsWith('http')
                    ? attachment.thumbnailUrl
                    : `${API_URL}${attachment.thumbnailUrl}`
                }
                alt={attachment.originalFilename}
                width={250}
                height={180}
                className="object-cover rounded-lg w-full"
                style={{ maxWidth: '250px', maxHeight: '180px' }}
                unoptimized
              />
            ) : (
              <div className="w-[250px] h-[140px] bg-slate-800 rounded-lg flex items-center justify-center">
                <Play className="w-12 h-12 text-white/70" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-slate-800 ml-1" />
              </div>
            </div>
            {attachment.duration && (
              <span className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
                {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
              </span>
            )}
          </div>
        ) : (
          <video
            src={fullUrl}
            controls
            autoPlay
            className="rounded-lg"
            style={{ maxWidth: '250px', maxHeight: '250px' }}
          />
        )}
      </div>
    );
  }

  // Voice note attachment
  if (attachment.type === 'voice') {
    return (
      <VoiceNotePlayer
        url={fullUrl}
        duration={attachment.duration}
        waveform={attachment.waveform}
        isOwn={isOwn}
      />
    );
  }

  // Document attachment
  if (attachment.type === 'document') {
    const docType = getDocumentIcon(attachment.mimeType);

    return (
      <div
        className={clsx(
          'flex items-center gap-3 p-3 rounded-lg cursor-pointer min-w-[180px] max-w-[250px]',
          isOwn
            ? 'bg-primary-500/30 hover:bg-primary-500/40'
            : 'bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
        )}
        onClick={handleDownload}
      >
        <div
          className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            isOwn ? 'bg-primary-500/50' : 'bg-slate-300 dark:bg-slate-600'
          )}
        >
          <FileText className={clsx('w-5 h-5', isOwn ? 'text-white' : 'text-slate-600 dark:text-slate-300')} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm font-medium truncate',
              isOwn ? 'text-white' : 'text-slate-900 dark:text-white'
            )}
          >
            {attachment.originalFilename}
          </p>
          <p
            className={clsx(
              'text-xs',
              isOwn ? 'text-primary-200' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {docType} • {formatFileSize(attachment.size)}
          </p>
        </div>
        <Download
          className={clsx(
            'w-5 h-5 flex-shrink-0',
            isOwn ? 'text-primary-200' : 'text-slate-400'
          )}
        />
      </div>
    );
  }

  return null;
}
