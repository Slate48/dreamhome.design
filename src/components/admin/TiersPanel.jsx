import React, { useEffect, useState, useCallback } from 'react';
import { listTiers, createTier, updateTier, reorderTiers, deleteTier } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ChevronUp, ChevronDown, Trash2, Plus, Lock } from 'lucide-react';

const CAPABILITIES = [
  'portfolio', 'team', 'faqs', 'process', 'investment', 'testimonials', 'inquiries', 'settings', 'users',
];

export default function TiersPanel() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTiers(await listTiers()); }
    catch (e) { toast({ title: 'Could not load tiers', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const editable = tiers.filter((t) => !t.is_system);

  const onCreate = async () => {
    if (!newName.trim()) return;
    try { await createTier({ name: newName.trim(), capabilities: [] }); setNewName(''); load(); }
    catch (e) { toast({ title: 'Create failed', description: e.message, variant: 'destructive' }); }
  };

  const onToggleCap = async (tier, cap) => {
    const has = tier.capabilities.includes(cap);
    const next = has ? tier.capabilities.filter((c) => c !== cap) : [...tier.capabilities, cap];
    try { await updateTier(tier.id, { capabilities: next }); load(); }
    catch (e) { toast({ title: 'Update failed', description: e.message, variant: 'destructive' }); }
  };

  const onRename = async (tier, name) => {
    if (!name.trim() || name === tier.name) return;
    try { await updateTier(tier.id, { name: name.trim() }); load(); }
    catch (e) { toast({ title: 'Rename failed', description: e.message, variant: 'destructive' }); }
  };

  const onMove = async (index, dir) => {
    const arr = [...editable];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    try { await reorderTiers(arr.map((t) => t.id)); load(); }
    catch (e) { toast({ title: 'Reorder failed', description: e.message, variant: 'destructive' }); }
  };

  const onConfirmDelete = async () => {
    try { await deleteTier(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <p className="font-body text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <p className="font-body text-sm text-muted-foreground mb-4">
        Higher in the list = more power. The super admin tier is locked.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Order</TableHead>
            <TableHead>Tier</TableHead>
            {CAPABILITIES.map((c) => <TableHead key={c} className="text-center text-xs">{c}</TableHead>)}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((t) => {
            const idx = editable.findIndex((e) => e.id === t.id);
            return (
              <TableRow key={t.id}>
                <TableCell>
                  {t.is_system ? <Lock size={14} className="text-muted-foreground" /> : (
                    <div className="flex flex-col">
                      <button onClick={() => onMove(idx, -1)} disabled={idx === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
                      <button onClick={() => onMove(idx, 1)} disabled={idx === editable.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {t.is_system ? (
                    <span className="font-medium">{t.name}</span>
                  ) : (
                    <Input
                      defaultValue={t.name}
                      className="h-8 w-36"
                      onBlur={(e) => onRename(t, e.target.value)}
                    />
                  )}
                </TableCell>
                {CAPABILITIES.map((c) => (
                  <TableCell key={c} className="text-center">
                    <Checkbox
                      checked={t.is_system || t.capabilities.includes(c)}
                      disabled={t.is_system}
                      onCheckedChange={() => onToggleCap(t, c)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  {!t.is_system && (
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteTarget(t)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-end gap-2 mt-4">
        <div>
          <Label htmlFor="new-tier" className="text-xs">New tier name</Label>
          <Input id="new-tier" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-48" />
        </div>
        <Button onClick={onCreate} disabled={!newName.trim()}><Plus size={16} className="mr-1" /> Add tier</Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You can only delete a tier with no admins assigned to it.
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
