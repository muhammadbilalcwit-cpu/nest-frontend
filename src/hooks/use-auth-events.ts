import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { FORCE_LOGOUT_EVENT } from '@/services/api';
import {
  subscribeToForceDisconnect,
  subscribeToSessionExpired,
} from '@/services/socket';

/** Listens for auth events (401, session revoked/expired) and handles logout. */
export function useAuthEvents() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Axios interceptor event for 401 (token refresh failed)
  useEffect(() => {
    if (!user) return;

    const handleForceLogout = () => {
      logout('session_invalid');
    };

    window.addEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);

    return () => {
      window.removeEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);
    };
  }, [user, logout]);

  // WebSocket: session revoked by admin
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToForceDisconnect(() => {
      logout('session_revoked');
    });

    return unsubscribe;
  }, [user, logout]);

  // WebSocket: session expired
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToSessionExpired(() => {
      logout('session_expired');
    });

    return unsubscribe;
  }, [user, logout]);
}
