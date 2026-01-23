/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Replaces Supabase auth with AIGRC-native authentication.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Organization } from '@/types';
import { getAigrcClient } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('aigrc_auth_token');
      if (token) {
        try {
          const client = getAigrcClient();
          client.setAuthToken(token);

          const [userResponse, orgResponse] = await Promise.all([
            client.users.getCurrentUser(),
            client.organizations.getCurrent(),
          ]);

          if (userResponse.success && userResponse.data) {
            setState({
              user: userResponse.data,
              organization: orgResponse.success ? orgResponse.data ?? null : null,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
          } else {
            // Token invalid, clear it
            localStorage.removeItem('aigrc_auth_token');
            setState({
              user: null,
              organization: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            });
          }
        } catch {
          localStorage.removeItem('aigrc_auth_token');
          setState({
            user: null,
            organization: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // This would call your auth endpoint
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const { token, user, organization } = await response.json();

      localStorage.setItem('aigrc_auth_token', token);
      getAigrcClient().setAuthToken(token);

      setState({
        user,
        organization,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('aigrc_auth_token');
    setState({
      user: null,
      organization: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const client = getAigrcClient();
    const response = await client.users.getCurrentUser();
    if (response.success && response.data) {
      setState(prev => ({ ...prev, user: response.data ?? null }));
    }
  }, []);

  const switchOrganization = useCallback(async (organizationId: string) => {
    const client = getAigrcClient();
    client.setOrganization(organizationId);

    const response = await client.organizations.getCurrent();
    if (response.success && response.data) {
      setState(prev => ({ ...prev, organization: response.data ?? null }));
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      return state.user.permissions.includes(permission);
    },
    [state.user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!state.user) return false;
      return state.user.role === role;
    },
    [state.user]
  );

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
    switchOrganization,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Permission Gate Component
// ============================================================================

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// Role Gate Component
// ============================================================================

interface RoleGateProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
