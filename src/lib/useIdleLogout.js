import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Silent idle auto-logout for NON-persistent sessions ("Remember me" unchecked).
// After IDLE_TIMEOUT_MS of no user activity, sign the user out and send them to
// /login. Persistent ("remember me") sessions are treated as a trusted device and
// are never idle-logged-out. See docs/superpowers/specs/2026-07-16-portal-entry-*.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

export function useIdleLogout() {
  const { isAuthenticated, persistent, logout } = useAuth();
  // Keep the latest logout in a ref so the effect doesn't re-subscribe when it changes.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    // Only arm the timer for authenticated, non-persistent (non-remembered) sessions.
    if (!isAuthenticated || persistent) return undefined;

    let timerId;
    // Throttle timer resets so a burst of mousemove/scroll events is cheap.
    let lastReset = 0;

    const signOut = () => { logoutRef.current('/login'); };

    const reset = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return; // at most one reset per second
      lastReset = now;
      clearTimeout(timerId);
      timerId = setTimeout(signOut, IDLE_TIMEOUT_MS);
    };

    // A tab that was hidden past the timeout should sign out on return.
    const onVisibility = () => { if (!document.hidden) reset(); };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    timerId = setTimeout(signOut, IDLE_TIMEOUT_MS); // arm immediately

    return () => {
      clearTimeout(timerId);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, reset);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, persistent]);
}
