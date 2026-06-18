import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Role hierarchy:
 *  client      → /portal only
 *  manager     → /admin (no user management, no site settings)
 *  admin       → /admin (full content management)
 *  super_admin → /admin + user management
 *
 * Usage:
 *   <RoleGuard allowedRoles={['admin', 'super_admin', 'manager']} redirectTo="/portal" />
 */
export default function RoleGuard({ allowedRoles, redirectTo = '/', children }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect clients to portal, others to home
    const fallback = user.role === 'client' ? '/portal' : '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
}