'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, RoleSlug } from '@/types';
import { authApi } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

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

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authApi.login(email, password);
      await fetchUser();
      router.push('/dashboard');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      disconnectSocket();
      router.push('/login');
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
        if (typeof r === 'string') {
          userRoles.push(r.toLowerCase());
        } else if (r?.slug) {
          userRoles.push(r.slug.toLowerCase());
        }
      });
    }

    // Also check legacy role property
    if (user.role) {
      if (typeof user.role === 'string') {
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
    const priority: RoleSlug[] = ['super_admin', 'company_admin', 'manager', 'user'];

    const userRoles: string[] = [];

    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((r) => {
        if (typeof r === 'string') {
          userRoles.push(r.toLowerCase());
        } else if (r?.slug) {
          userRoles.push(r.slug.toLowerCase());
        }
      });
    }

    if (user.role) {
      if (typeof user.role === 'string') {
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
