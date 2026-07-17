import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvite, acceptInvite } from '@/api/admin';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [state, setState] = useState('loading'); // loading | ready | invalid
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getInvite(token)
      .then((data) => { if (alive) { setInvite(data); setState('ready'); } })
      .catch(() => { if (alive) setState('invalid'); });
    return () => { alive = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const { user } = await acceptInvite(token, password);
      await checkUserAuth();
      navigate(user?.role === 'client' ? '/portal' : '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
          {state === 'loading' && <p className="font-body text-sm text-muted-foreground text-center">Checking your invite…</p>}
          {state === 'invalid' && (
            <div className="text-center">
              <h1 className="font-heading text-2xl mb-2">Invite unavailable</h1>
              <p className="font-body text-sm text-muted-foreground">
                This invite link is invalid or has expired. Ask whoever invited you for a fresh link.
              </p>
            </div>
          )}
          {state === 'ready' && (
            <>
              <h1 className="font-heading text-2xl text-center mb-1">Set your password</h1>
              <p className="font-body text-muted-foreground text-sm text-center mb-6">
                Welcome, {invite.full_name} — you're joining as {invite.tier_name || 'an admin'}.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="pw" className="text-xs">Password</Label>
                  <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="pw2" className="text-xs">Confirm password</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" required />
                </div>
                {error && <p className="font-body text-sm text-red-500" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full bg-gold hover:bg-gold/90 text-white">
                  {submitting ? 'Setting up…' : 'Set password & sign in'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
