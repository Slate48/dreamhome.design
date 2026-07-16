import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/shared/Logo';

// Prefilled for returning trusted-device users. Only written when "Remember me" is
// checked (a shared-machine login clears it), and never stores the password.
const LAST_EMAIL_KEY = 'dreamhome_last_email';

export default function Login() {
  const navigate = useNavigate();
  const { checkUserAuth, isAuthenticated, user } = useAuth();
  const rememberedEmail = (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_EMAIL_KEY)) || '';
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  // Default to checked when we already remembered this email (they opted in before).
  const [remember, setRemember] = useState(Boolean(rememberedEmail));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auth is already resolved by the time this route renders (AuthenticatedApp gates on
  // isLoadingAuth), so an authenticated visitor is forwarded straight to their dashboard
  // instead of ever seeing the sign-in form.
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'client' ? '/portal' : '/admin'} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    let data = null;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
        setSubmitting(false);
        return;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Remember the email only for trusted-device ("remember me") logins.
    try {
      if (remember) localStorage.setItem(LAST_EMAIL_KEY, email);
      else localStorage.removeItem(LAST_EMAIL_KEY);
    } catch { /* localStorage unavailable — non-fatal */ }

    // Re-sync AuthContext's user/isAuthenticated from the new session cookie,
    // then route by role (mirrors RoleGuard's client -> /portal, staff -> /admin).
    await checkUserAuth();
    navigate(data.user?.role === 'client' ? '/portal' : '/admin', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
          <h1 className="font-heading text-2xl text-foreground text-center mb-1">Sign In</h1>
          <p className="font-body text-muted-foreground text-sm text-center mb-6">
            Client portal &amp; admin access
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-body">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-body">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="remember" className="text-sm font-body font-normal cursor-pointer">
                Remember me on this device
              </Label>
            </div>
            {error && (
              <p className="font-body text-sm text-red-500" role="alert">{error}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full bg-gold hover:bg-gold/90 text-white">
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
