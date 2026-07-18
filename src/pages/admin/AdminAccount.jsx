import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { changeEmail, changePassword } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function AdminAccount() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const submitEmail = async () => {
    setEmailSaving(true);
    try {
      await changeEmail(emailPassword, newEmail.trim());
      await checkUserAuth();
      setNewEmail(''); setEmailPassword('');
      toast({ title: 'Email updated', description: 'Your sign-in email has been changed.' });
    } catch (e) {
      toast({ title: 'Could not update email', description: e.message, variant: 'destructive' });
    } finally {
      setEmailSaving(false);
    }
  };

  const pwMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const submitPassword = async () => {
    setPwSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
    } catch (e) {
      toast({ title: 'Could not update password', description: e.message, variant: 'destructive' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-3xl text-foreground mb-1">Account</h1>
      <p className="font-body text-muted-foreground mb-6">Manage your own sign-in email and password.</p>

      <section className="mb-8 rounded-lg border border-border p-6">
        <h2 className="font-heading text-lg text-foreground mb-1">Email</h2>
        <p className="font-body text-sm text-muted-foreground mb-4">Current: {user?.email}</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="acct-new-email" className="text-xs">New email</Label>
            <Input id="acct-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="acct-email-pw" className="text-xs">Current password</Label>
            <Input id="acct-email-pw" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="mt-1" />
          </div>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={emailSaving || !newEmail.trim() || !emailPassword}
            onClick={submitEmail}
          >
            {emailSaving ? 'Saving…' : 'Update email'}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border p-6">
        <h2 className="font-heading text-lg text-foreground mb-4">Password</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="acct-cur-pw" className="text-xs">Current password</Label>
            <Input id="acct-cur-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="acct-new-pw" className="text-xs">New password</Label>
            <Input id="acct-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <div>
            <Label htmlFor="acct-confirm-pw" className="text-xs">Confirm new password</Label>
            <Input id="acct-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
            {pwMismatch && <p className="mt-1 text-xs text-red-500">Passwords don't match.</p>}
          </div>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={pwSaving || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
            onClick={submitPassword}
          >
            {pwSaving ? 'Saving…' : 'Update password'}
          </Button>
        </div>
      </section>
    </div>
  );
}
