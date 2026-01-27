"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import type { User, RoleSlug } from "@/types";
import { authApi, FORCE_LOGOUT_EVENT, FORBIDDEN_EVENT } from "@/services/api";
import {
  connectSocket,
  disconnectSocket,
  subscribeToForceDisconnect,
  subscribeToSessionExpired,
} from "@/services/socket";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: RoleSlug | RoleSlug[]) => boolean;
  primaryRole: RoleSlug | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const isLoggingOut = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const response = await authApi.getProfile();
      const userData = response.data.data;
      setUser(userData);
      // Connect to socket after successful auth
      connectSocket();
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout with optional flash message (uses sessionStorage for flash messages)
  // Only sets flash when user is currently authenticated (prevents false messages on login page)
  const logoutWithMessage = useCallback(
    async (errorCode?: string) => {
      // Prevent multiple simultaneous logout calls
      if (isLoggingOut.current) return;
      isLoggingOut.current = true;

      // Only set flash message if user was authenticated (not already on login page)
      const wasAuthenticated = !!user;

      try {
        await authApi.logout();
      } catch {
        // Ignore logout errors - server might reject if session already invalid
      } finally {
        setUser(null);
        disconnectSocket();
        isLoggingOut.current = false;

        // Store flash message only if user was logged in (prevents flash on login page refresh)
        if (errorCode && wasAuthenticated) {
          sessionStorage.setItem("flash_error", errorCode);
        }

        router.push("/login");
      }
    },
    [router, user],
  );

  // Regular logout without message
  const logout = useCallback(async () => {
    await logoutWithMessage();
  }, [logoutWithMessage]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for force logout events from axios interceptor (only when authenticated)
  useEffect(() => {
    if (!user) return;

    const handleForceLogout = () => {
      console.log("Force logout triggered - user session invalid");
      logoutWithMessage("session_invalid");
    };

    const onForbidden = () => {
      router.replace("/access-denied");
    };

    window.addEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);
    window.addEventListener(FORBIDDEN_EVENT, onForbidden);

    return () => {
      window.removeEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);
      window.removeEventListener(FORBIDDEN_EVENT, onForbidden);
    };
  }, [user, logoutWithMessage, router]);

  // Listen for force disconnect event from WebSocket (session revoked by admin)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToForceDisconnect((payload) => {
      console.log("Session revoked by admin:", payload.reason);
      logoutWithMessage("session_revoked");
    });

    return () => {
      unsubscribe();
    };
  }, [user, logoutWithMessage]);

  // Listen for session expired event from WebSocket (session expired by cron job)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToSessionExpired((payload) => {
      console.log("Session expired:", payload.reason, payload.message);
      logoutWithMessage("session_expired");
    });

    return () => {
      unsubscribe();
    };
  }, [user, logoutWithMessage]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authApi.login(email, password);
      await fetchUser();
      router.push("/dashboard");
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const hasRole = (role: RoleSlug | RoleSlug[]): boolean => {
    if (!user) return false;

    const userRoles: string[] = [];

    // Get roles from user.roles array
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((r) => {
        if (typeof r === "string") {
          userRoles.push(r.toLowerCase());
        } else if (r?.slug) {
          userRoles.push(r.slug.toLowerCase());
        }
      });
    }

    // Also check legacy role property
    if (user.role) {
      if (typeof user.role === "string") {
        userRoles.push(user.role.toLowerCase());
      } else if (user.role?.slug) {
        userRoles.push(user.role.slug.toLowerCase());
      }
    }

    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some((r) => userRoles.includes(r.toLowerCase()));
  };

  const getPrimaryRole = (): RoleSlug | null => {
    if (!user) return null;

    // Priority order: super_admin > company_admin > manager > user
    const priority: RoleSlug[] = [
      "super_admin",
      "company_admin",
      "manager",
      "user",
    ];

    const userRoles: string[] = [];

    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((r) => {
        if (typeof r === "string") {
          userRoles.push(r.toLowerCase());
        } else if (r?.slug) {
          userRoles.push(r.slug.toLowerCase());
        }
      });
    }

    if (user.role) {
      if (typeof user.role === "string") {
        userRoles.push(user.role.toLowerCase());
      } else if (user.role?.slug) {
        userRoles.push(user.role.slug.toLowerCase());
      }
    }

    for (const role of priority) {
      if (userRoles.includes(role)) {
        return role;
      }
    }

    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        hasRole,
        primaryRole: getPrimaryRole(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
