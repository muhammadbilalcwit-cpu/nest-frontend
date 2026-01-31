'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketInvalidation } from '@/hooks/use-socket-invalidation';
import { useAuthEvents } from '@/hooks/use-auth-events';
import { useNotificationSync } from '@/hooks/use-notification-sync';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';

function AppInit() {
  const initTheme = useThemeStore((s) => s.initTheme);
  const mounted = useThemeStore((s) => s.mounted);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Fetch user profile on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Socket -> TanStack Query cache invalidation
  useSocketInvalidation();

  // Auth event listeners (force-logout, forbidden, etc.)
  useAuthEvents();

  // Notification socket subscriptions
  useNotificationSync();

  // Handle auth redirects using Next.js router
  useAuthRedirect();

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton={true}
        theme={theme}
        duration={5000}
        expand
        visibleToasts={9}
        toastOptions={{
          duration: 5000,
          classNames: {
            closeButton: 'toast-close-btn',
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
