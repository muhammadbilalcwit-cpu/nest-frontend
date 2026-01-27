'use client';

import Link from 'next/link';

interface QuickActionCardProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function QuickActionCard({ href, icon, label }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-slate-700 dark:text-dark-text">{label}</span>
      </div>
    </Link>
  );
}
