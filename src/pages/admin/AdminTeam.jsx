import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/adminEntities';
import { uploadFile } from '@/lib/uploadFile';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const DEPARTMENTS = ['Founders', 'Management', 'Design', 'Sales', 'Engineering', 'Countertop', 'Estimating', 'Project Management'];
const BLANK = { name: '', title: '', show_title: true, department: 'Design', photo_url: '', bio: '', is_founder: false, sort_order: 0 };

export default function AdminTeam() {
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await adminApi.list('TeamMember', 'sort_order', 100);
    setMembers(data);
  }

  function openAdd() { setEditing(null); setForm(BLANK); setShowForm(true); }
  function openEdit(m) { setEditing(m); setForm({ ...m }); setShowForm(true); }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile(file);
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      await adminApi.update('TeamMember', editing.id, form);
      toast({ title: 'Team member updated' });
    } else {
      await adminApi.create('TeamMember', { ...form, sort_order: members.length });
      toast({ title: 'Team member added' });
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(m) {
    if (!confirm(`Remove ${m.name}?`)) return;
    await adminApi.delete('TeamMember', m.id);
    toast({ title: 'Removed' });
    await load();
  }

  const grouped = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = members.filter(m => m.department === dept);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Team & Founders</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">Manage all team members and their headshots.</p>
        </div>
        <Button onClick={openAdd} className="bg-gold hover:bg-gold/90 text-white">
          <Plus size={16} className="mr-2" /> Add Member
        </Button>
      </div>

      {DEPARTMENTS.map(dept => {
        const dept_members = grouped[dept] || [];
        if (!dept_members.length) return null;
        return (
          <div key={dept} className="mb-8">
            <h2 className="font-heading text-lg text-foreground border-b border-gold/20 pb-2 mb-4">{dept}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {dept_members.map(m => (
                <div key={m.id} className="bg-white rounded-xl p-4 border border-border text-center group relative">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-warm-gray overflow-hidden flex items-center justify-center text-xl font-heading text-gold/70">
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover object-top" />
                      : m.name.split(' ').map(n => n[0]).join('')
                    }
                  </div>
                  <p className="font-body text-sm font-medium text-foreground">{m.name}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{m.title}</p>
                  <div className="flex justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded bg-gold/10 hover:bg-gold hover:text-white text-gold transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded bg-red-50 hover:bg-red-500 hover:text-white text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl">{editing ? 'Edit Member' : 'Add Team Member'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-body">Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-body">Title / Role</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-body">Department</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-body">Headshot</Label>
                <div className="mt-1 space-y-2">
                  {form.photo_url && (
                    <img src={form.photo_url} alt="" className="w-20 h-20 rounded-full object-cover object-top mx-auto" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-body file:bg-gold/10 file:text-gold hover:file:bg-gold/20" />
                  {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                  <p className="text-xs text-muted-foreground">Or paste URL:</p>
                  <Input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div>
                <Label className="text-xs font-body">Bio (optional)</Label>
                <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="show_title" checked={form.show_title !== false} onChange={e => setForm(f => ({ ...f, show_title: e.target.checked }))} />
                <Label htmlFor="show_title" className="text-xs font-body cursor-pointer">Show title on About page</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="founder" checked={form.is_founder} onChange={e => setForm(f => ({ ...f, is_founder: e.target.checked }))} />
                <Label htmlFor="founder" className="text-xs font-body cursor-pointer">Is a Founder (shows in founders section)</Label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gold hover:bg-gold/90 text-white">
                <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}