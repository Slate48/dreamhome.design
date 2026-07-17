import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Cookie-session auth against wl-dreamhome-api (Worker Route, same-origin).
// Replaces the base44 SDK + app-params/public-settings model: there is no more
// "app not registered" / "auth required" typed error — a visitor is simply
// authenticated or not, and `/api/auth/me` is the single source of truth.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Whether this session is a persistent ("remember me") one. Drives idle-logout:
  // non-persistent sessions are signed out after inactivity. The cookie is HttpOnly,
  // so the server tells us via /api/auth/me rather than us reading the cookie.
  const [persistent, setPersistent] = useState(false);

  // Re-checks the current session against the Worker and syncs state.
  // Exposed so Login.jsx can re-sync immediately after a successful login
  // without a full page reload.
  const checkUserAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsAuthenticated(true);
        setPersistent(data.persistent === true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setPersistent(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setPersistent(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  // redirectTo defaults to '/' (manual Sign Out); idle-logout passes '/login'.
  const logout = useCallback(async (redirectTo = '/') => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    setPersistent(false);
    navigate(redirectTo);
  }, [navigate]);

  const navigateToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  // UI-only capability check (the Worker enforces every request). rank 0 = super admin.
  const can = useCallback((capability) => {
    if (!user) return false;
    if (user.rank === 0) return true;
    return Array.isArray(user.capabilities) && user.capabilities.includes(capability);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      persistent,
      logout,
      navigateToLogin,
      checkUserAuth,
      can,
    }}>
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
