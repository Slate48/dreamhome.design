import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';

export default function Login() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    let data = null;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
