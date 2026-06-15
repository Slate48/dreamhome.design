import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const EMPTY = { client_name: '', quote: '', rating: 5, project_type: '', featured: false };

export default function AdminTestimonials() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => base44.entities.Testimonial.list('-created_date', 100).then(setItems);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setOpen(true); };

  const save = async () => {
    if (editing) {
      await base44.entities.Testimonial.update(editing.id, form);
    } else {
      await base44.entities.Testimonial.create(form);
    }
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this testimonial?')) return;
    await base44.entities.Testimonial.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-foreground mb-1">Testimonials</h1>
          <p className="font-body text-muted-foreground text-sm">Manage client reviews shown on the home page.</p>
        </div>
        <Button onClick={openNew} className="bg-gold hover:bg-gold/90 text-white gap-2">
          <Plus size={16} /> Add Testimonial
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-border p-5 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="font-heading text-base text-foreground">{item.client_name}</p>
                {item.featured && (
                  <span className="bg-gold/10 text-gold font-body text-xs px-2 py-0.5 rounded-full">Featured</span>
                )}
                <span className="flex gap-0.5">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => (
                    <Star key={i} size={12} className="fill-gold text-gold" />
                  ))}
                </span>
              </div>
              {item.project_type && (
                <p className="font-body text-xs text-muted-foreground mb-2">{item.project_type}</p>
              )}
              <p className="font-body text-sm text-muted-foreground italic line-clamp-2">"{item.quote}"</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="icon" onClick={() => openEdit(item)}>
                <Pencil size={14} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => remove(item.id)} className="text-destructive hover:text-destructive">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground font-body">No testimonials yet. Add your first one!</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="font-body text-xs tracking-wide">Client Name *</Label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label className="font-body text-xs tracking-wide">Quote *</Label>
              <Textarea value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} rows={4} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body text-xs tracking-wide">Rating (1–5)</Label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="mt-1.5" />
              </div>
              <div>
                <Label className="font-body text-xs tracking-wide">Project Type</Label>
                <Input value={form.project_type || ''} onChange={e => setForm({ ...form, project_type: e.target.value })} placeholder="e.g. Kitchen Remodel" className="mt-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!form.featured} onCheckedChange={val => setForm({ ...form, featured: val })} />
              <Label className="font-body text-sm">Feature on home page</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} className="bg-gold hover:bg-gold/90 text-white">
                {editing ? 'Save Changes' : 'Add Testimonial'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}