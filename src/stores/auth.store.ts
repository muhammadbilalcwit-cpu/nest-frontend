/**
 * @fileoverview Authentication Store using Zustand
 *
 * This store manages all authentication-related client state including:
 * - User session data
 * - Authentication status
 * - Role-based access control
 * - Reactive navigation (redirects)
 *
 * @example
 * // Reading state in a component
 * const user = useAuthStore((s) => s.user);
 * const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 *
 * @example
 * // Using actions
 * const login = useAuthStore((s) => s.login);
 * await login('user@example.com', 'password');
 */

import { create } from 'zustand';
import type { User, RoleSlug } from '@/types';
import { authApi } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

/** Prevents multiple simultaneous logout calls */
let isLoggingOut = false;

/** SessionStorage key for flash error messages */
const FLASH_ERROR_KEY = 'auth_flash_error';

/**
 * Flash error storage utility for displaying messages across navigation.
 * Uses sessionStorage to persist error codes that survive page transitions.
 *
 * @example
 * // Set an error before redirect
 * flashErrorStorage.set('session_expired');
 *
 * // Read and clear on login page
 * const errorCode = flashErrorStorage.get();
 * if (errorCode) {
 *   showMessage(errorCode);
 *   flashErrorStorage.clear();
 * }
 */
export const flashErrorStorage = {
  /** Stores an error code in sessionStorage */
  set: (errorCode: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FLASH_ERROR_KEY, errorCode);
    }
  },
  /** Retrieves the stored error code (or null if none) */
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FLASH_ERROR_KEY);
  },
  /** Clears the stored error code */
  clear: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(FLASH_ERROR_KEY);
    }
  },
};

/**
 * Authentication store state and actions interface
 */
interface AuthStore {
  // ─── State ─────────────────────────────────────────────
  /** Current authenticated user or null if not logged in */
  user: User | null;
  /** True while fetching user profile or during login */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** User's highest priority role (for UI decisions) */
  primaryRole: RoleSlug | null;
  /** Target path for reactive navigation (used by useAuthRedirect hook) */
  redirectTo: string | null;

  // ─── Actions ───────────────────────────────────────────
  /** Fetches current user profile from API */
  fetchUser: () => Promise<void>;
  /** Authenticates user with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Logs out user and optionally sets a flash error message */
  logout: (errorCode?: string) => Promise<void>;
  /** Checks if user has specified role(s) */
  hasRole: (role: RoleSlug | RoleSlug[]) => boolean;
  /** Clears the redirect path (called after navigation) */
  clearRedirect: () => void;
  /** Sets redirect path with optional flash error */
  setRedirect: (path: string, flashError?: string) => void;
}

/**
 * Extracts all role slugs from a user object.
 * Handles both array of roles and single role property.
 *
 * @param user - The user object to extract roles from
 * @returns Array of lowercase role slugs
 */
function getUserRoles(user: User | null): string[] {
  if (!user) return [];
  const roles: string[] = [];

  // Handle roles array (user can have multiple roles)
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string') roles.push(r.toLowerCase());
      else if (r?.slug) roles.push(r.slug.toLowerCase());
    });
  }

  // Handle single role property
  if (user.role) {
    if (typeof user.role === 'string') roles.push(user.role.toLowerCase());
    else if (user.role?.slug) roles.push(user.role.slug.toLowerCase());
  }

  return roles;
}

/**
 * Determines the user's primary (highest priority) role.
 * Priority order: super_admin > company_admin > manager > user
 *
 * @param user - The user object
 * @returns The highest priority role slug or null
 */
function getPrimaryRole(user: User | null): RoleSlug | null {
  if (!user) return null;
  const priority: RoleSlug[] = ['super_admin', 'company_admin', 'manager', 'user'];
  const userRoles = getUserRoles(user);
  for (const role of priority) {
    if (userRoles.includes(role)) return role;
  }
  return null;
}

/**
 * Zustand store for authentication state management.
 *
 * @example
 * // In a component
 * function ProfileButton() {
 *   const user = useAuthStore((s) => s.user);
 *   const logout = useAuthStore((s) => s.logout);
 *
 *   return (
 *     <button onClick={() => logout()}>
 *       Logout {user?.email}
 *     </button>
 *   );
 * }
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // ─── Initial State ─────────────────────────────────────
  user: null,
  isLoading: true,
  isAuthenticated: false,
  primaryRole: null,
  redirectTo: null,

  // ─── Actions ───────────────────────────────────────────

  /**
   * Fetches the current user's profile from the API.
   * Called on app initialization and after login.
   * Establishes WebSocket connection on success.
   */
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
    } catch {
      set({ user: null, isAuthenticated: false, primaryRole: null, isLoading: false });
    }
  },

  /**
   * Authenticates user with email and password.
   * On success, fetches user profile and triggers redirect to dashboard.
   *
   * @param email - User's email address
   * @param password - User's password
   * @throws Will throw if authentication fails
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await authApi.login(email, password);
      await get().fetchUser();
      set({ redirectTo: '/dashboard' });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Logs out the current user.
   * Disconnects WebSocket, clears state, and redirects to login.
   *
   * @param errorCode - Optional error code to display on login page
   *                    (e.g., 'session_expired', 'session_revoked')
   */
  logout: async (errorCode?: string) => {
    if (isLoggingOut) return;
    isLoggingOut = true;

    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors - we're leaving anyway
    } finally {
      disconnectSocket();
      isLoggingOut = false;

      // Store flash error for display on login page
      if (errorCode) {
        flashErrorStorage.set(errorCode);
      }

      set({
        user: null,
        isAuthenticated: false,
        primaryRole: null,
        redirectTo: '/login',
      });
    }
  },

  /**
   * Checks if the current user has the specified role(s).
   *
   * @param role - Single role or array of roles to check
   * @returns True if user has at least one of the specified roles
   *
   * @example
   * const hasRole = useAuthStore((s) => s.hasRole);
   * if (hasRole('super_admin')) { ... }
   * if (hasRole(['manager', 'company_admin'])) { ... }
   */
  hasRole: (role: RoleSlug | RoleSlug[]): boolean => {
    const userRoles = getUserRoles(get().user);
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some((r) => userRoles.includes(r.toLowerCase()));
  },

  /**
   * Clears the redirect path after navigation is complete.
   * Called by the useAuthRedirect hook.
   */
  clearRedirect: () => set({ redirectTo: null }),

  /**
   * Sets a redirect path with optional flash error message.
   *
   * @param path - The path to redirect to
   * @param flashError - Optional error code to display after redirect
   */
  setRedirect: (path: string, flashError?: string) => {
    if (flashError) {
      flashErrorStorage.set(flashError);
    }
    set({ redirectTo: path });
  },
}));
