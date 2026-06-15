import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const FIELDS = [
  { section: 'Contact', fields: [
    { key: 'phone_display', label: 'Phone (display)', placeholder: '877-343-CABS' },
    { key: 'phone', label: 'Phone (digits for tel: link)', placeholder: '8773432227' },
    { key: 'email_sales', label: 'Sales Email', placeholder: 'sales@dreamhome.design' },
    { key: 'email_billing', label: 'Billing Email', placeholder: 'amanda@dreamhome.design' },
    { key: 'billing_contact_name', label: 'Billing Contact Name', placeholder: 'Amanda' },
  ]},
  { section: 'Location', fields: [
    { key: 'address', label: 'Street Address', placeholder: '123 Main St' },
    { key: 'city_state', label: 'City, State', placeholder: 'Scottsdale, AZ' },
    { key: 'google_maps_embed_url', label: 'Google Maps Embed URL', placeholder: 'https://maps.google.com/maps?...' },
  ]},
  { section: 'Online', fields: [
    { key: 'website_url', label: 'Website URL', placeholder: 'https://www.dreamhome.design' },
    { key: 'consultation_booking_url', label: 'Consultation Booking URL (Calendly etc.)', placeholder: 'https://calendly.com/...' },
  ]},
  { section: 'Social Media', fields: [
    { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://www.instagram.com/...' },
    { key: 'instagram_handle', label: 'Instagram Handle', placeholder: '@dreamhome.design' },
    { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://www.facebook.com/...' },
  ]},
  { section: 'Brand', fields: [
    { key: 'logo_url', label: 'Logo Image URL (leave blank to use default)', placeholder: 'https://...' },
    { key: 'tagline', label: 'Footer Tagline', placeholder: 'Premium custom cabinetry & interior design.' },
  ]},
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await base44.entities.SiteSettings.filter({ key: 'main' });
    if (data.length) { setRecord(data[0]); setForm(data[0]); }
  }

  async function handleSave() {
    setSaving(true);
    if (record) {
      await base44.entities.SiteSettings.update(record.id, form);
    } else {
      await base44.entities.SiteSettings.create({ ...form, key: 'main' });
    }
    toast({ title: 'Settings saved', description: 'Changes will appear across the site.' });
    await load();
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-foreground">Site Settings</h1>
        <p className="font-body text-muted-foreground text-sm mt-1">Update contact info, social links, and branding across the entire site.</p>
      </div>

      <div className="space-y-6">
        {FIELDS.map(section => (
          <div key={section.section} className="bg-white rounded-xl p-6 border border-border">
            <h2 className="font-heading text-lg text-foreground mb-5 pb-3 border-b border-gold/20">{section.section}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {section.fields.map(field => (
                <div key={field.key}>
                  <Label className="text-xs font-body text-muted-foreground">{field.label}</Label>
                  <Input
                    value={form[field.key] || ''}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/90 text-white px-8 py-6">
          <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}