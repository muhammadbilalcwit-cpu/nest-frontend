import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/** Handles reactive navigation based on auth store's redirectTo state. */
export function useAuthRedirect() {
  const router = useRouter();
  const redirectTo = useAuthStore((s) => s.redirectTo);
  const clearRedirect = useAuthStore((s) => s.clearRedirect);

  useEffect(() => {
    if (redirectTo) {
      router.push(redirectTo);
      clearRedirect();
    }
  }, [redirectTo, router, clearRedirect]);
}
