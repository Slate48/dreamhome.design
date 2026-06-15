import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function AdminInvestment() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    const [tierData, settingsData] = await Promise.all([
      base44.entities.InvestmentTier.list('step_number', 10),
      base44.entities.SiteSettings.filter({ key: 'main' })
    ]);
    setTiers(tierData);
    if (settingsData.length) {
      setSettings(settingsData[0]);
      setSettingsForm(settingsData[0]);
    }
  }

  function openEdit(tier) { setEditing(tier); setForm({ ...tier, payment_methods: tier.payment_methods || [] }); }

  async function handleSave() {
    setSaving(true);
    await base44.entities.InvestmentTier.update(editing.id, form);
    toast({ title: 'Step updated' });
    setEditing(null);
    await load();
    setSaving(false);
  }

  async function saveSettings() {
    setSaving(true);
    await base44.entities.SiteSettings.update(settings.id, {
      billing_contact_name: settingsForm.billing_contact_name,
      email_billing: settingsForm.email_billing
    });
    toast({ title: 'Billing contact updated' });
    setEditingSettings(false);
    await load();
    setSaving(false);
  }

  function addPaymentMethod() {
    setForm(f => ({ ...f, payment_methods: [...(f.payment_methods || []), ''] }));
  }
  function updatePaymentMethod(idx, val) {
    setForm(f => {
      const methods = [...(f.payment_methods || [])];
      methods[idx] = val;
      return { ...f, payment_methods: methods };
    });
  }
  function removePaymentMethod(idx) {
    setForm(f => {
      const methods = [...(f.payment_methods || [])];
      methods.splice(idx, 1);
      return { ...f, payment_methods: methods };
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-foreground">Investment</h1>
        <p className="font-body text-muted-foreground text-sm mt-1">Edit payment tiers and billing contact information.</p>
      </div>

      {/* Payment Tiers */}
      <div className="space-y-4 mb-8">
        {tiers.map(tier => (
          <div key={tier.id} className={`bg-white rounded-xl p-6 border ${editing?.id === tier.id ? 'border-gold' : 'border-border'}`}>
            {editing?.id === tier.id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gold font-body text-xs tracking-wider uppercase">Step {tier.step_number}</span>
                </div>
                <div>
                  <Label className="text-xs font-body">Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-body">Description</Label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <Label className="text-xs font-body">Note (shown in gold)</Label>
                  <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="mt-1" />
                </div>
                {tier.step_number === 3 && (
                  <>
                    <div>
                      <Label className="text-xs font-body">Payment Methods</Label>
                      <div className="mt-1 space-y-2">
                        {(form.payment_methods || []).map((m, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input value={m} onChange={e => updatePaymentMethod(idx, e.target.value)} />
                            <button onClick={() => removePaymentMethod(idx)} className="p-2 text-red-400 hover:text-red-600">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addPaymentMethod}><Plus size={14} className="mr-1" /> Add Method</Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-body">Scope Exclusions Note</Label>
                      <textarea
                        value={form.scope_exclusions_note}
                        onChange={e => setForm(f => ({ ...f, scope_exclusions_note: e.target.value }))}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/90 text-white">
                    <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <span className="text-gold font-body text-xs tracking-wider uppercase">Step {tier.step_number}</span>
                  <h3 className="font-heading text-lg text-foreground mt-1">{tier.title}</h3>
                  <p className="font-body text-sm text-muted-foreground mt-1">{tier.description}</p>
                  {tier.note && <p className="font-body text-xs text-gold mt-2">{tier.note}</p>}
                </div>
                <button onClick={() => openEdit(tier)} className="p-2 rounded-lg bg-gold/10 hover:bg-gold hover:text-white text-gold transition-colors shrink-0">
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Billing Contact */}
      <div className="bg-white rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-foreground">Billing Contact</h2>
          {!editingSettings && (
            <button onClick={() => setEditingSettings(true)} className="p-2 rounded-lg bg-gold/10 hover:bg-gold hover:text-white text-gold transition-colors">
              <Pencil size={15} />
            </button>
          )}
        </div>
        {editingSettings ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-body">Contact Name</Label>
              <Input value={settingsForm.billing_contact_name || ''} onChange={e => setSettingsForm(f => ({ ...f, billing_contact_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-body">Billing Email</Label>
              <Input value={settingsForm.email_billing || ''} onChange={e => setSettingsForm(f => ({ ...f, email_billing: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-3">
              <Button onClick={saveSettings} disabled={saving} className="bg-gold hover:bg-gold/90 text-white">
                <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setEditingSettings(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-body text-foreground">{settings?.billing_contact_name || '—'}</p>
            <p className="font-body text-sm text-gold">{settings?.email_billing || '—'}</p>
          </div>
        )}
      </div>
    </div>
  );
}