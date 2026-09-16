import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('yuwa_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const isLoggingOut = useRef(false);

  const role = user?.role || (user?.isAdmin ? 'ADMIN' : 'STUDENT');

  // Handle session expiry from 401: clear local state only, NEVER call backend logout repeatedly
  const handleSessionExpiry = useCallback(() => {
    localStorage.removeItem('yuwa_auth_token');
    localStorage.removeItem('yuwa_auth_user');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // User-initiated explicit logout
  const logout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      await authApi.logout();
    } catch {
      // Ignore failure during logout
    } finally {
      handleSessionExpiry();
      isLoggingOut.current = false;
    }
  }, [handleSessionExpiry]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check if stored user is Admin/Evaluator — skip student API in that case
      const storedUserRaw = localStorage.getItem('yuwa_auth_user');
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
      const storedRole = storedUser?.role;

      if (storedRole === 'ADMIN' || storedRole === 'EVALUATOR') {
        // Validate the token is still good via coreApi getMe
        try {
          const me = await authApi.getMe();
          const merged = { ...storedUser, ...me, role: storedRole };
          setUser(merged);
          localStorage.setItem('yuwa_auth_user', JSON.stringify(merged));
        } catch {
          // Token expired: clear session
          handleSessionExpiry();
        }
        return;
      }

      // Student: fetch from student API
      const profile = await userApi.getProfile();
      setUser(profile);
      localStorage.setItem('yuwa_auth_user', JSON.stringify(profile));
    } catch (err) {
      // Fallback to authApi.getMe
      try {
        const me = await authApi.getMe();
        setUser(me);
        localStorage.setItem('yuwa_auth_user', JSON.stringify(me));
      } catch {
        // Token is expired or invalid: clear locally without calling backend logout
        handleSessionExpiry();
      }
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpiry]);

  useEffect(() => {
    const storedToken = localStorage.getItem('yuwa_auth_token');
    if (storedToken) {
      const storedUser = localStorage.getItem('yuwa_auth_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore parsing error
        }
      }
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    const onUnauthorized = () => {
      // Clear session locally on 401 without re-invoking backend logout
      handleSessionExpiry();
    };

    window.addEventListener('yuwa:auth:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('yuwa:auth:unauthorized', onUnauthorized);
    };
  }, [fetchCurrentUser, handleSessionExpiry]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const accessToken = data.accessToken || data.token;
    if (accessToken) {
      localStorage.setItem('yuwa_auth_token', accessToken);
      setToken(accessToken);

      // If user object returned with login, store it immediately
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('yuwa_auth_user', JSON.stringify(data.user));
      }

      // For Admin/Evaluator (core API users), role is already probed and embedded.
      // Skip getProfile() which only works for the student API (port 5005).
      const knownRole = data.user?.role;
      if (knownRole === 'ADMIN' || knownRole === 'EVALUATOR') {
        return data.user;
      }

      // For Student accounts: fetch full profile from student API to populate all fields
      try {
        const fullProfile = await userApi.getProfile();
        setUser(fullProfile);
        localStorage.setItem('yuwa_auth_user', JSON.stringify(fullProfile));
        return fullProfile;
      } catch {
        return data.user;
      }
    }
    return data;
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
