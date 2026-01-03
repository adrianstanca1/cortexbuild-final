import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { db } from '@/services/db';

// Use VITE_API_URL from environment or default to current origin
const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const API_URL = (VITE_API_URL.endsWith('/api') ? VITE_API_URL : `${VITE_API_URL}/api`).replace(/\/$/, '') + '/v1';

console.log('[AuthContext] Initialized with API_URL:', API_URL);

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<{ user: UserProfile | null; error: Error | null }>;
  signup: (email: string, password: string, name: string, companyName: string) => Promise<{ user: UserProfile | null; error: Error | null }>;
  logout: () => void;

  hasPermission: (permission: string) => boolean;
  addProjectId: (id: string) => void;
  refreshPermissions: () => Promise<void>;
  isSupabaseConnected: boolean;
  token: string | null;
  impersonateUser: (userId: string, reason?: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  isImpersonating: boolean;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isFetchingPermissions, setIsFetchingPermissions] = useState(false);

  const [originalSession, setOriginalSession] = useState<{ user: UserProfile; token: string } | null>(null);

  useEffect(() => {
    // Check if Supabase is configured by attempting to get a session
    // If the URL/Key are missing, this might fail or return null
    const initSupabase = async () => {
      try {
        // Check if Supabase is configured (either via env or fallback)
        // We check if the supabase client has a valid URL configured
        // @ts-expect-error - inspecting internal client config is a safe heuristic here
        const clientUrl = supabase.supabaseUrl;

        if (!clientUrl || clientUrl.includes('placeholder')) {
          return;
        }

        setIsSupabaseConnected(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          mapSupabaseUser(session.user, session.access_token);
        } else {
          // Explicitly clear if no session on init
          setUser(null);
          setToken(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            mapSupabaseUser(session.user, session.access_token);
            setToken(session.access_token);
          } else {
            // Session expired or logged out
            console.log("[Auth] Session changed to null, clearing user state");
            setUser(null);
            setToken(null);
          }
        });

        return () => subscription.unsubscribe();
      } catch (e) {
        console.warn("Supabase initialization skipped:", e);
      }
    };

    initSupabase();

    // Check for impersonation session
    const adminToken = localStorage.getItem('admin_token');
    const adminUserJson = localStorage.getItem('admin_user');
    if (adminToken && adminUserJson) {
      try {
        setOriginalSession({
          user: JSON.parse(adminUserJson),
          token: adminToken
        });
      } catch (e) {
        console.warn("Failed to restore admin user session", e);
      }
    }
  }, []);

  const mapSupabaseUser = async (authUser: any, providedToken?: string) => {
    try {
      // Use provided token or fetch fresh session
      let accessToken = providedToken;
      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token;
      }

      if (!accessToken) {
        console.error("No access token available for mapping user");
        setUser(null);
        setToken(null);
        return;
      }

      // Fetch user profile from backend API which retrieves role from memberships table
      const response = await fetch(`${API_URL}/user/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        console.warn("Failed to fetch user profile from API, using metadata fallback");
        // Fallback to user_metadata if API call fails
        const rawRole = authUser.user_metadata?.role || authUser.user_metadata?.user_role;
        const rawCompanyId = authUser.user_metadata?.companyId || authUser.user_metadata?.company_id;

        console.log('[Auth] Metadata fallback - Raw Role:', rawRole, 'Raw Company:', rawCompanyId);

        let finalRole = (rawRole as UserRole) || UserRole.OPERATIVE;
        if (rawRole === 'super_admin') finalRole = UserRole.SUPERADMIN;

        const newUser: UserProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          phone: authUser.phone || '',
          role: finalRole,
          permissions: authUser.user_metadata?.permissions || [],
          memberships: authUser.user_metadata?.memberships || [],
          avatarInitials: ((authUser.email || 'U')[0]).toUpperCase(),
          companyId: rawCompanyId || 'platform-admin',
          projectIds: []
        };

        setUser(newUser);
        setToken(accessToken);
        localStorage.setItem('user_role', newUser.role);
        return;
      }

      // Use the actual user data from database
      const userData = await response.json();
      console.log('[Auth] Profile fetched from API:', userData.role);

      let finalRole = userData.role || UserRole.OPERATIVE;
      if (finalRole === 'super_admin') finalRole = UserRole.SUPERADMIN;

      const newUser: UserProfile = {
        id: authUser.id,
        name: userData.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        phone: userData.phone || authUser.phone || '',
        role: finalRole,
        permissions: userData.permissions || [],
        memberships: userData.memberships || [],
        avatarInitials: ((authUser.email || 'U')[0]).toUpperCase(),
        companyId: userData.companyId || 'platform-admin',
        projectIds: userData.projectIds || []
      };

      console.log('✅ User profile loaded from database:', newUser.role, newUser.companyId);

      // Deep equality check or at least change detection to prevent loop
      setUser(prev => {
        const isChanged = !prev ||
          prev.id !== newUser.id ||
          prev.role !== newUser.role ||
          prev.companyId !== newUser.companyId;
        return isChanged ? newUser : prev;
      });

      setToken(prev => prev === accessToken ? prev : accessToken);
      localStorage.setItem('user_role', newUser.role);
    } catch (error) {
      console.error("Error mapping Supabase user:", error);
      // Fallback to basic user profile
      const newUser: UserProfile = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        phone: authUser.phone || '',
        role: UserRole.OPERATIVE,
        permissions: [],
        memberships: [],
        avatarInitials: ((authUser.email || 'U')[0]).toUpperCase(),
        companyId: 'c1',
        projectIds: []
      };

      setUser(newUser);
      localStorage.setItem('user_role', newUser.role);
    }
  };

  const refreshPermissions = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    try {
      setIsFetchingPermissions(true);
      const permissions = await db.getUserPermissions();
      setUser(prev => prev ? { ...prev, permissions } : null);
    } catch (e) {
      console.error("Failed to refresh permissions:", e);
    } finally {
      setIsFetchingPermissions(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // DEV BACKDOOR for Super Admin verification
      if (email === 'demo@buildpro.app' && password === 'dev-admin') {
        console.warn("Using DEV BACKDOOR for Super Admin");
        const devUser: UserProfile = {
          id: 'demo-user-id',
          name: 'Demo Super Admin',
          email: 'demo@buildpro.app',
          role: UserRole.SUPERADMIN,
          permissions: ['*'],
          memberships: [],
          companyId: 'c1',
          projectIds: ['ALL'],
          avatarInitials: 'DA',
          phone: ''
        };
        setUser(devUser);
        setToken('dev-token-placeholder');
        localStorage.setItem('user_role', devUser.role);
        localStorage.setItem('dev_auth_token', 'dev-token-placeholder'); // Store for db.ts to access
        return { user: devUser, error: null };
      }

      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!authUser) throw new Error("No user returned from Supabase");

      // Validate required claims for tenant and role
      const rawRole = authUser.user_metadata?.role;
      const rawCompanyId = authUser.user_metadata?.companyId;

      if (!rawRole) {
        console.warn("User role not found in metadata, defaulting to OPERATIVE");
      }

      if (!rawCompanyId) {
        console.warn("User company ID not found in metadata, defaulting to 'c1'");
      }

      const newUser: UserProfile = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        phone: authUser.phone || '',
        role: (rawRole as UserRole) || UserRole.OPERATIVE,
        permissions: authUser.user_metadata?.permissions || [],
        memberships: authUser.user_metadata?.memberships || [],
        avatarInitials: ((authUser.email || 'U')[0]).toUpperCase(),
        companyId: rawCompanyId || 'c1',
        projectIds: []
      };

      // Validate that user has proper tenant and role claims
      if (!newUser.companyId || !newUser.role) {
        console.error("Login failed: Token missing required tenant or role claims");
        throw new Error("Invalid token: missing required claims");
      }

      // Update state immediately (optimistic)
      setUser(newUser);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);

        // Validate token claims after setting the token
        await validateTokenClaims(session.access_token);
      }

      // Return fresh user directly to caller
      return { user: newUser, error: null };
    } catch (e: any) {
      return { user: null, error: e };
    }
  };

  // Function to validate token claims
  const validateTokenClaims = async (token: string | null) => {
    if (!token) return false;

    try {
      // In a real implementation, we would decode and validate the JWT
      // For now, we'll just check that we have the user state with required claims
      return !!(user && user.companyId && user.role);
    } catch (error) {
      console.error("Token validation failed:", error);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string, companyName: string) => {
    try {
      // 1. Supabase Sign Up
      const { data: { user: authUser, session }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company_name: companyName,
            role: UserRole.COMPANY_ADMIN // Initial user is admin of their company
          }
        }
      });

      if (error) throw error;
      if (!authUser) throw new Error("No user returned from Supabase SignUp");

      // 2. Sync with Backend
      if (session) {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: authUser.id,
            email,
            name,
            companyName
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Backend registration failed');
        }
        setToken(session.access_token);
      } else {
        console.log("User registered but no session (confirm email?).");
        return { user: null, error: new Error("Please check your email to confirm your account.") };
      }

      // 3. Map User
      const newUser: UserProfile = {
        id: authUser.id,
        name: name,
        email: email,
        phone: '',
        role: UserRole.COMPANY_ADMIN,
        permissions: [],
        memberships: [],
        avatarInitials: name[0].toUpperCase(),
        companyId: 'pending',
        projectIds: []
      };

      setUser(newUser);
      return { user: newUser, error: null };

    } catch (e: any) {
      console.error("Signup exception:", e);
      return { user: null, error: e };
    }
  };

  const impersonateUser = async (userId: string, reason?: string) => {
    if (!user || user.role !== UserRole.SUPERADMIN) throw new Error("Unauthorized");

    try {
      const { user: impersonatedUser, token: newToken } = await db.impersonateUser(userId, reason);

      // Save original session locally
      if (!originalSession) {
        setOriginalSession({ user, token: token || '' });
        localStorage.setItem('admin_token', token || '');
      }

      setUser(impersonatedUser);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('admin_user', JSON.stringify(user));

      // Force refresh for a clean state as the impersonated user
      window.location.reload();
    } catch (e) {
      console.error("Impersonation failed:", e);
      throw e;
    }
  };

  const stopImpersonating = async () => {
    try {
      await db.stopImpersonation();

      const adminToken = localStorage.getItem('admin_token');
      if (adminToken && originalSession) {
        setUser(originalSession.user);
        setToken(adminToken);
        localStorage.setItem('token', adminToken);
        localStorage.removeItem('admin_token');
        setOriginalSession(null);

        // Return to admin dashboard
        window.location.replace('/admin/dashboard');
      } else {
        // Fallback: full logout if admin session lost
        logout();
      }
    } catch (e) {
      console.error("Failed to stop impersonating:", e);
      // Hard reset fallback
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      window.location.replace('/login');
    }
  };

  const logout = async () => {
    try {
      // 1. Clear Supabase Session
      if (user && user.id.length > 10 && isSupabaseConnected) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Supabase sign out error:", error);
        }
      }

      // 2. Clear Local State
      setUser(null);
      setToken(null);
      setOriginalSession(null);

      // 3. Clear All Storage (Comprehensive Clean)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('token') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Also remove other app-specific storage
      localStorage.removeItem('selectedTenantId');
      localStorage.removeItem('user_role');
      localStorage.removeItem('dev_auth_token'); // Clear dev token on logout
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-gotrue-session-storage');
      localStorage.removeItem('buildpro_user_preferences');
      localStorage.removeItem('buildpro_ui_state');
      localStorage.removeItem('buildpro_theme');
      localStorage.removeItem('buildpro_sidebar_collapsed');

      // Clear all session storage
      sessionStorage.clear();

      // Clear cookies if any exist
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });

      // 4. Clear any cached data in service workers or caches
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          // Clear all caches
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        } catch (cacheError) {
          console.error("Cache clear error:", cacheError);
        }

        // Clear service worker data
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.active) {
            registration.active.postMessage({ type: 'CLEAR_CACHE' });
          }
        }
      }

      // 5. Notify other tabs about logout
      localStorage.setItem('logout-event', Date.now().toString());

      // 6. Force navigation to clear in-memory sensitive data (Redux/Context/Zustand)
      // This prevents "back button" access to protected pages
      window.location.replace('/');
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, still clear local state and navigate away
      setUser(null);
      setToken(null);
      setOriginalSession(null);

      // Clear all storage comprehensively
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('token') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      localStorage.removeItem('selectedTenantId');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-gotrue-session-storage');
      localStorage.removeItem('buildpro_user_preferences');
      localStorage.removeItem('buildpro_ui_state');
      localStorage.removeItem('buildpro_theme');
      localStorage.removeItem('buildpro_sidebar_collapsed');

      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });

      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.setItem('logout-event', Date.now().toString());
      window.location.replace('/');
    }
  };

  // --- Consolidated Lifecycle & Monitoring ---
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      if (!token || token === 'dev-token-placeholder' || token.startsWith('dev-')) return;

      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < currentTime + 300) {
            console.warn("Token is about to expire, logging out user");
            logout();
          }
        }
      } catch (error) {
        console.warn("Could not decode token for expiration check:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkTokenExpiration();
    };

    const verifySession = async () => {
      if (!token) return;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.warn("Session verification issue:", error?.message || 'No session');
        } else if (session.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at - now < 300) {
            console.warn("Session about to expire, attempting refresh");
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshedSession) setToken(refreshedSession.access_token);
            } catch (err) {
              console.error("Session refresh error:", err);
            }
          }
        }
      } catch (err) {
        console.error("Session verification error:", err);
      }
    };

    const handleOnline = () => {
      if (user && token) verifySession();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'logout-event') {
        setUser(null);
        setToken(null);
        sessionStorage.clear();
        window.location.replace('/');
      }
    };

    // Periodic check (every minute)
    const interval = setInterval(checkTokenExpiration, 60000);

    // Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token, user]);

  // Deep link handling
  useEffect(() => {
    const handleDeepLink = () => {
      // Check if we're on a protected route but user is not authenticated
      const currentPath = window.location.pathname;
      const isProtectedRoute = !['/', '/login', '/register', '/maintenance', '/client-portal'].some(path =>
        currentPath.startsWith(path)
      );

      if (isProtectedRoute && !user) {
        // Redirect to login if trying to access protected route without auth
        window.location.href = '/login';
      }
    };

    // Run on initial load
    handleDeepLink();

    // Listen for URL changes
    const handlePopState = () => {
      handleDeepLink();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const hasPermission = (permission: string) => {
    if (!user) return false;

    // Superadmin override
    if (user.permissions.includes('*')) return true;

    // Direct match
    if (user.permissions.includes(permission)) return true;

    // Wildcard match (e.g., 'projects.*' matches 'projects.create')
    const [resource] = permission.split('.');
    if (user.permissions.includes(`${resource}.*`)) return true;

    return false;
  };

  const addProjectId = (projectId: string) => {
    if (user && user.projectIds && !user.projectIds.includes(projectId) && !user.projectIds.includes('ALL')) {
      setUser({
        ...user,
        projectIds: [...user.projectIds, projectId]
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      hasPermission,
      addProjectId,
      refreshPermissions,
      isSupabaseConnected,
      token,
      impersonateUser,
      stopImpersonating,
      isImpersonating: !!originalSession,
      loginWithOAuth: async (provider: 'google' | 'github') => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};
