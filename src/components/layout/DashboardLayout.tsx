'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { isRouteAllowed } from '@/config/route-permissions';
import { Button } from '@/components/ui';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Render access denied inline instead of redirecting (avoids progress cursor)
  if (!isRouteAllowed(pathname, hasRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg px-4">
        <div className="max-w-md w-full text-center card p-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Access Restricted
          </h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-dark-muted">
            You don&apos;t have permission to access this resource.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div
        className={clsx(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <Header title={title} />

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
