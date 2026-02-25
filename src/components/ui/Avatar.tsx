'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  fallbackIcon?: ReactNode;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; indicator: string; icon: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-sm', indicator: 'w-2 h-2', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', text: 'text-base', indicator: 'w-2.5 h-2.5', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', text: 'text-lg', indicator: 'w-3 h-3', icon: 'w-6 h-6' },
  xl: { container: 'w-24 h-24', text: 'text-3xl', indicator: 'w-4 h-4', icon: 'w-12 h-12' },
};

export function Avatar({ src, name, size = 'md', isOnline, fallbackIcon, className }: AvatarProps) {
  const classes = sizeClasses[size];
  const initial = name?.charAt(0).toUpperCase() || '';

  // Determine the image URL - handle both full URLs and relative paths
  const imageUrl = src
    ? src.startsWith('http')
      ? src
      : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${src}`
    : null;

  const renderFallback = () => {
    if (fallbackIcon) {
      return fallbackIcon;
    }
    if (initial) {
      return (
        <span className={clsx(classes.text, 'text-primary-600 dark:text-primary-400 font-medium')}>
          {initial}
        </span>
      );
    }
    return <User className={clsx(classes.icon, 'text-primary-600 dark:text-primary-400')} />;
  };

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name || 'Avatar'}
          width={96}
          height={96}
          className={clsx(classes.container, 'rounded-full object-cover')}
          unoptimized
        />
      ) : (
        <div
          className={clsx(
            classes.container,
            'rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center'
          )}
        >
          {renderFallback()}
        </div>
      )}

      {isOnline !== undefined && !!isOnline && (
        <span
          className={clsx(
            classes.indicator,
            'absolute bottom-0 right-0 bg-green-500 border-2 border-white dark:border-dark-card rounded-full'
          )}
        />
      )}
    </div>
  );
}
