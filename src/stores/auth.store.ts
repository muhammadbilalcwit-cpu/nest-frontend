import { create } from 'zustand';
import type { User, RoleSlug } from '@/types';
import { authApi, chatApi, setChatToken, clearChatToken } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket-manager';
import { connectChatSocket, disconnectChatSocket } from '@/services/chat-socket';


// Prevents multiple simultaneous logout calls
let isLoggingOut = false;

const FLASH_ERROR_KEY = 'auth_flash_error';

// Flash error storage utility for displaying messages across navigation
export const flashErrorStorage = {
  set: (errorCode: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FLASH_ERROR_KEY, errorCode);
    }
  },
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FLASH_ERROR_KEY);
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(FLASH_ERROR_KEY);
    }
  },
};

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  primaryRole: RoleSlug | null;
  redirectTo: string | null;
  hasCompliancePolicy: boolean;

  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: (errorCode?: string) => Promise<void>;
  hasRole: (role: RoleSlug | RoleSlug[]) => boolean;
  clearRedirect: () => void;
  setRedirect: (path: string, flashError?: string) => void;
}

// Extracts all role slugs from a user object
function getUserRoles(user: User | null): string[] {
  if (!user) return [];
  const roles: string[] = [];

  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string') roles.push(r.toLowerCase());
      else if (r?.slug) roles.push(r.slug.toLowerCase());
    });
  }

  if (user.role) {
    if (typeof user.role === 'string') roles.push(user.role.toLowerCase());
    else if (user.role?.slug) roles.push(user.role.slug.toLowerCase());
  }

  return roles;
}

// Determines the user's primary (highest priority) role
function getPrimaryRole(user: User | null): RoleSlug | null {
  if (!user) return null;
  const priority: RoleSlug[] = ['super_admin', 'company_admin', 'manager', 'user', 'customer'];
  const userRoles = getUserRoles(user);
  for (const role of priority) {
    if (userRoles.includes(role)) return role;
  }
  return null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  primaryRole: null,
  redirectTo: null,
  hasCompliancePolicy: false,

  fetchUser: async () => {
    try {
      const response = await authApi.getProfile();
      const userData = response.data.data;
      set({
        user: userData,
        isAuthenticated: true,
        primaryRole: getPrimaryRole(userData),
        isLoading: false,
      });
      connectSocket();
      connectChatSocket().catch(() => {
        // Chat microservice (FastAPI) may be unavailable — socket will auto-reconnect
      });

      // Check compliance policy in background (non-blocking)
      chatApi.getComplianceScopedUsers()
        .then(() => set({ hasCompliancePolicy: true }))
        .catch(() => set({ hasCompliancePolicy: false }));
    } catch {
      set({ user: null, isAuthenticated: false, primaryRole: null, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(email, password);

      // Store JWT in frontend-managed cookie for FastAPI chat requests
      const token =
        res.data?.data?.accessToken || res.headers?.['x-access-token'];
      if (token) setChatToken(token);

      await get().fetchUser();
      // Customers go directly to messages (their only accessible page)
      const role = get().primaryRole;
      set({ redirectTo: role === 'customer' ? '/dashboard/messages' : '/dashboard' });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async (errorCode?: string) => {
    if (isLoggingOut) return;
    isLoggingOut = true;

    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      disconnectSocket();
      disconnectChatSocket();
      clearChatToken();
      isLoggingOut = false;

      if (errorCode) {
        flashErrorStorage.set(errorCode);
      }

      set({
        user: null,
        isAuthenticated: false,
        primaryRole: null,
        hasCompliancePolicy: false,
        redirectTo: '/login',
      });
    }
  },

  hasRole: (role: RoleSlug | RoleSlug[]): boolean => {
    const userRoles = getUserRoles(get().user);
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some((r) => userRoles.includes(r.toLowerCase()));
  },

  clearRedirect: () => set({ redirectTo: null }),

  setRedirect: (path: string, flashError?: string) => {
    if (flashError) {
      flashErrorStorage.set(flashError);
    }
    set({ redirectTo: path });
  },
}));
