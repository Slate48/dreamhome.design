import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Assumes a parent RoleGuard already established the user is staff. Gates a single
// admin section by capability; staff without it are sent to the dashboard.
export default function CapabilityGuard({ capability, children }) {
  const { isLoadingAuth, can } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }
  if (!can(capability)) return <Navigate to="/admin" replace />;
  return children;
}
