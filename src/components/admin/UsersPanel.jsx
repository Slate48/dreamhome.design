import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  listUsers, inviteUser, updateUser, deleteUser, reinviteUser, listTiers,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Copy, UserPlus, Trash2, Pencil } from 'lucide-react';
import { tierDescription } from '@/components/admin/tierDescriptions';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  disabled: 'bg-gray-200 text-gray-600',
};

export default function UsersPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // Tiers this user may assign: their own level or below (super sees all non-super tiers).
  const assignableTiers = tiers.filter(
    (t) => !t.is_system && (user?.rank === 0 || t.rank >= user?.rank),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([listUsers(), listTiers()]);
      setUsers(u);
      setTiers(t);
    } catch (e) {
      toast({ title: 'Could not load admins', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Invite link copied', description: 'Share it with the new admin.' });
    } catch {
      toast({ title: 'Copy this link', description: url });
    }
  };

  const onReinvite = async (id) => {
    try {
      const { invite_url } = await reinviteUser(id);
      await copyLink(invite_url);
    } catch (e) {
      toast({ title: 'Could not create link', description: e.message, variant: 'destructive' });
    }
  };

  const onToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const onSaveEdit = async (id, body) => {
    try {
      await updateUser(id, body);
      setEditTarget(null);
      load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const onConfirmDelete = async () => {
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-body text-sm text-muted-foreground">
          Your team. You can invite and edit people at or below your own level; only
          people below your level can be deactivated or removed.
        </p>
        <Button onClick={() => setInviteOpen(true)} className="bg-gold hover:bg-gold/90 text-white" disabled={!assignableTiers.length}>
          <UserPlus size={16} className="mr-2" /> Invite admin
        </Button>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
        <p className="font-body text-xs font-medium text-foreground">What the levels mean</p>
        {tiers.filter((t) => !t.is_system).map((t) => (
          <p key={t.id} className="font-body text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t.name}:</span> {tierDescription(t.id)}
          </p>
        ))}
      </div>

      {loading ? (
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No team members yet.</TableCell></TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.tier_name}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[u.status]}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  {u.status === 'pending' && u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => onReinvite(u.id)}>
                      <Copy size={14} className="mr-1" /> Invite link
                    </Button>
                  )}
                  {u.status !== 'pending' && u.is_active && u.can_delete && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(u)}>
                      Deactivate
                    </Button>
                  )}
                  {u.status !== 'pending' && !u.is_active && u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(u)}>
                      Activate
                    </Button>
                  )}
                  {u.can_edit && (
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(u)}>
                      <Pencil size={14} className="mr-1" /> Edit
                    </Button>
                  )}
                  {u.can_delete && (
                    <Button variant="ghost" size="sm" className="text-red-500" aria-label="Delete admin" onClick={() => setDeleteTarget(u)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tiers={assignableTiers}
        onInvited={load}
        copyLink={copyLink}
      />

      <EditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        tiers={assignableTiers}
        onSave={onSaveEdit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.full_name} ({deleteTarget?.email}) will lose access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Renders tier <SelectItem>s with the tier name and its plain-language description.
// Shared by the Invite and Edit dropdowns.
function TierOptions({ tiers }) {
  return tiers.map((t) => (
    <SelectItem key={t.id} value={t.id}>
      <div className="flex flex-col">
        <span>{t.name}</span>
        {tierDescription(t.id) && (
          <span className="text-xs text-muted-foreground">{tierDescription(t.id)}</span>
        )}
      </div>
    </SelectItem>
  ));
}

function InviteDialog({ open, onClose, tiers, onInvited, copyLink }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [tierId, setTierId] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setEmail(''); setFullName(''); setTierId(''); setLink(''); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { invite_url } = await inviteUser({ email, full_name: fullName, tier_id: tierId });
      setLink(invite_url);
      onInvited();
    } catch (e) {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite an admin</DialogTitle></DialogHeader>
        {link ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              Invite created. Copy this link and send it to the new admin — it expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button onClick={() => copyLink(link)}><Copy size={16} /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-name" className="text-xs">Full name</Label>
              <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="inv-email" className="text-xs">Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={tierId} onValueChange={setTierId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a tier" /></SelectTrigger>
                <SelectContent>
                  <TierOptions tiers={tiers} />
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button onClick={() => { reset(); onClose(); }}>Done</Button>
          ) : (
            <Button
              className="bg-gold hover:bg-gold/90 text-white"
              disabled={submitting || !email || !fullName || !tierId}
              onClick={submit}
            >
              {submitting ? 'Creating…' : 'Create invite'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ target, onClose, tiers, onSave }) {
  const [fullName, setFullName] = useState('');
  const [tierId, setTierId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setFullName(target.full_name || '');
      setTierId(target.tier_id || '');
      setEmail(target.email || '');
      setPassword('');
    }
  }, [target]);

  const pwTooShort = password.length > 0 && password.length < 8;

  const submit = async () => {
    setSaving(true);
    try {
      const body = { full_name: fullName, tier_id: tierId, email: email.trim() };
      if (password) body.password = password;
      await onSave(target.id, body);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {target?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name" className="text-xs">Full name</Label>
            <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-email" className="text-xs">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a tier" /></SelectTrigger>
              <SelectContent><TierOptions tiers={tiers} /></SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-password" className="text-xs">Set a new password</Label>
            <Input id="edit-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">Leave blank to keep the current password. Minimum 8 characters.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            disabled={saving || !fullName || !tierId || !email.trim() || pwTooShort}
            onClick={submit}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
