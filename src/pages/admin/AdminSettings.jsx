import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/adminEntities';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import LogoUploadField from '@/components/admin/LogoUploadField';

// Grouped into two cards of plain text fields plus a Brand card, so the whole page
// fits one screen in a two-column grid instead of a five-card vertical stack.
// Field order is row-wise within each card's 2-up grid.
const CONTACT_FIELDS = [
  { key: 'phone_display', label: 'Phone (display)', placeholder: '(877) 343-2227' },
  { key: 'phone', label: 'Phone (digits for tel: link)', placeholder: '8773432227' },
  { key: 'email_sales', label: 'Sales Email', placeholder: 'sales@dreamhome.design' },
  { key: 'email_billing', label: 'Billing Email', placeholder: 'amanda@dreamhome.design' },
  { key: 'billing_contact_name', label: 'Billing Contact Name', placeholder: 'Amanda' },
  { key: 'address', label: 'Street Address', placeholder: '123 Main St' },
  { key: 'city_state', label: 'City, State', placeholder: 'Scottsdale, AZ' },
  { key: 'google_maps_embed_url', label: 'Google Maps Embed URL', placeholder: 'https://maps.google.com/maps?...' },
];

const WEB_FIELDS = [
  { key: 'website_url', label: 'Website URL', placeholder: 'https://www.dreamhome.design' },
  { key: 'consultation_booking_url', label: 'Booking URL (Calendly etc.)', placeholder: 'https://calendly.com/...' },
  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://www.instagram.com/...' },
  { key: 'instagram_handle', label: 'Instagram Handle', placeholder: '@dreamhome.design' },
  { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://www.facebook.com/...' },
];

// Every key this page owns — drives both the dirty check and the save payload, so
// read-only columns (id, created_date) are never echoed back to the API.
const EDITABLE_KEYS = [
  ...CONTACT_FIELDS.map(f => f.key),
  ...WEB_FIELDS.map(f => f.key),
  'logo_url',
  'logo_url_on_dark',
  'tagline',
];

function SettingsCard({ title, children }) {
  return (
    <section className="bg-white rounded-xl p-6 border border-border">
      <h2 className="font-heading text-lg text-foreground mb-5 pb-3 border-b border-gold/20">{title}</h2>
      {children}
    </section>
  );
}

function TextFieldGrid({ fields, form, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
      {fields.map(field => (
        <div key={field.key}>
          <Label className="text-xs font-body text-muted-foreground">{field.label}</Label>
          <Input
            value={form[field.key] || ''}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await adminApi.filter('SiteSettings', { key: 'main' });
      if (data.length) { setRecord(data[0]); setForm(data[0]); }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not load settings',
        description: 'Reload the page to try again.',
      });
    }
  }

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const dirty = EDITABLE_KEYS.some(k => (form[k] ?? '') !== (record?.[k] ?? ''));

  async function handleSave() {
    setSaving(true);
    const payload = Object.fromEntries(EDITABLE_KEYS.map(k => [k, form[k] ?? '']));
    try {
      if (record) {
        await adminApi.update('SiteSettings', record.id, payload);
      } else {
        await adminApi.create('SiteSettings', { ...payload, key: 'main' });
      }
      toast({ title: 'Settings saved', description: 'Changes will appear across the site.' });
      await load();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Your changes were not saved. Please try again.',
      });
    } finally {
      // Always clears, so a failed request can no longer leave the button stuck.
      setSaving(false);
    }
  }

  // A logo set for only one tone means the other surfaces silently keep the
  // built-in wordmark — say so rather than letting it look broken.
  const onlyLightLogo = form.logo_url && !form.logo_url_on_dark;
  const onlyDarkLogo = form.logo_url_on_dark && !form.logo_url;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Site Settings</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">
            Update contact info, social links, and branding across the entire site.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="bg-gold hover:bg-gold/90 text-white shrink-0"
        >
          <Check size={16} className="mr-2" /> {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {/* Two text-field cards side by side, then Brand as a full-width band. Brand
          spans because its three controls lay out horizontally, which keeps the
          page inside one screen instead of stacking into a tall right column. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <SettingsCard title="Contact & Location">
          <TextFieldGrid fields={CONTACT_FIELDS} form={form} onChange={set} />
        </SettingsCard>

        <SettingsCard title="Web & Social">
          <TextFieldGrid fields={WEB_FIELDS} form={form} onChange={set} />
        </SettingsCard>
      </div>

      <div className="mt-6">
        <SettingsCard title="Brand">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
            <LogoUploadField
              label="Logo — light backgrounds"
              hint="Solid navbar, sign-in and invite pages."
              tone="light"
              value={form.logo_url}
              onChange={v => set('logo_url', v)}
            />
            <LogoUploadField
              label="Logo — dark backgrounds"
              hint="Footer, portal sidebar, hero navbar."
              tone="dark"
              value={form.logo_url_on_dark}
              onChange={v => set('logo_url_on_dark', v)}
            />
            <div>
              <Label className="text-xs font-body text-muted-foreground">Footer Tagline</Label>
              <Input
                value={form.tagline || ''}
                onChange={e => set('tagline', e.target.value)}
                placeholder="Premium custom cabinetry & interior design."
                className="mt-1"
              />
            </div>
          </div>

          {(onlyLightLogo || onlyDarkLogo) && (
            <p className="flex items-start gap-2 mt-5 font-body text-xs text-muted-foreground bg-gold/5 border border-gold/20 rounded-lg p-3">
              <AlertTriangle size={14} className="text-gold shrink-0 mt-0.5" />
              <span>
                {onlyLightLogo
                  ? 'The footer, portal sidebar, and homepage hero navbar will keep the built-in wordmark until you add a dark-background logo.'
                  : 'The solid navbar, sign-in and invite pages will keep the built-in wordmark until you add a light-background logo.'}
              </span>
            </p>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}
