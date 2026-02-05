'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { isRouteAllowed } from '@/config/route-permissions';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatSidebar, ChatToggleButton } from '@/components/chat';
import clsx from 'clsx';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasRole = useAuthStore((s) => s.hasRole);
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect to access-denied page if route is not allowed
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isRouteAllowed(pathname, hasRole)) {
      router.replace('/access-denied');
    }
  }, [pathname, hasRole, isLoading, isAuthenticated, router]);

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Show nothing while redirecting (not authenticated or not allowed)
  if (!isAuthenticated || !isRouteAllowed(pathname, hasRole)) {
    return null;
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

      {/* Chat components - only visible to managers and users */}
      <ChatToggleButton />
      <ChatSidebar />
    </div>
  );
}
