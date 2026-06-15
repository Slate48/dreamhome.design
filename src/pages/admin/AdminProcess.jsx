import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function AdminProcess() {
  const { toast } = useToast();
  const [stages, setStages] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await base44.entities.ProcessStage.list('stage_number', 20);
    setStages(data);
  }

  function openEdit(stage) { setEditing(stage); setForm({ ...stage }); }

  async function handleSave() {
    setSaving(true);
    await base44.entities.ProcessStage.update(editing.id, form);
    toast({ title: 'Stage updated' });
    setEditing(null);
    await load();
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-foreground">Process Steps</h1>
        <p className="font-body text-muted-foreground text-sm mt-1">Click the pencil icon to edit any stage.</p>
      </div>

      <div className="space-y-4">
        {stages.map(stage => (
          <div key={stage.id} className={`bg-white rounded-xl p-6 border ${editing?.id === stage.id ? 'border-gold' : 'border-border'}`}>
            {editing?.id === stage.id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-gold text-white flex items-center justify-center text-sm font-body font-bold">{stage.stage_number}</span>
                  <Label className="text-xs font-body">Stage Title</Label>
                </div>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <div>
                  <Label className="text-xs font-body">Description</Label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/90 text-white">
                    <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-body font-bold shrink-0 mt-0.5">{stage.stage_number}</span>
                <div className="flex-1">
                  <h3 className="font-heading text-lg text-foreground">{stage.title}</h3>
                  <p className="font-body text-sm text-muted-foreground mt-1 leading-relaxed">{stage.description}</p>
                </div>
                <button onClick={() => openEdit(stage)} className="p-2 rounded-lg bg-gold/10 hover:bg-gold hover:text-white text-gold transition-colors shrink-0">
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}