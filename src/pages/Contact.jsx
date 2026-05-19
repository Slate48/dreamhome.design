import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Phone, Globe, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', project_type: '', how_heard: '', message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.ContactInquiry.create(form);
    toast({ title: 'Inquiry Sent', description: 'We\'ll be in touch within 24 hours.' });
    setForm({ name: '', email: '', phone: '', project_type: '', how_heard: '', message: '' });
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        title="Let's Talk"
        subtitle="Start your journey to extraordinary spaces"
        imageUrl="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7ebfa3d58_generated_8388bd8f.png"
      />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form */}
          <SectionReveal>
            <div>
              <h2 className="font-heading text-3xl text-foreground mb-2">Start Your Project</h2>
              <p className="font-body text-muted-foreground text-sm mb-8">
                Tell us about your vision and we'll be in touch within 24 hours.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="font-body text-xs tracking-wide">Name *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="mt-1.5 bg-cream border-border"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs tracking-wide">Email *</Label>
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="mt-1.5 bg-cream border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="font-body text-xs tracking-wide">Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="mt-1.5 bg-cream border-border"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-xs tracking-wide">Project Type</Label>
                    <Select
                      value={form.project_type}
                      onValueChange={val => setForm({ ...form, project_type: val })}
                    >
                      <SelectTrigger className="mt-1.5 bg-cream border-border">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Kitchen', 'Bathroom', 'Closets', 'Home Bar', 'Pantry', 'Full Home', 'Other'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="font-body text-xs tracking-wide">How did you hear about us?</Label>
                  <Input
                    value={form.how_heard}
                    onChange={e => setForm({ ...form, how_heard: e.target.value })}
                    className="mt-1.5 bg-cream border-border"
                  />
                </div>
                <div>
                  <Label className="font-body text-xs tracking-wide">Message *</Label>
                  <Textarea
                    required
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="mt-1.5 bg-cream border-border"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-gold/90 text-white font-body tracking-wider py-6 text-sm"
                >
                  {loading ? 'SENDING...' : 'SEND INQUIRY'}
                </Button>
              </form>
            </div>
          </SectionReveal>

          {/* Info */}
          <SectionReveal delay={0.2}>
            <div className="space-y-8">
              <div className="bg-cream rounded-xl p-8">
                <h3 className="font-heading text-xl text-foreground mb-6">Get in Touch</h3>
                <div className="space-y-4">
                  <a href="mailto:sales@dreamhome.design" className="flex items-center gap-3 text-foreground hover:text-gold font-body text-sm transition-colors">
                    <Mail className="w-5 h-5 text-gold" /> sales@dreamhome.design
                  </a>
                  <a href="tel:877-343-2227" className="flex items-center gap-3 text-foreground hover:text-gold font-body text-sm transition-colors">
                    <Phone className="w-5 h-5 text-gold" /> 877-343-CABS
                  </a>
                  <a href="https://www.dreamhome.design" className="flex items-center gap-3 text-foreground hover:text-gold font-body text-sm transition-colors">
                    <Globe className="w-5 h-5 text-gold" /> www.dreamhome.design
                  </a>
                  <div className="flex items-center gap-3 text-foreground font-body text-sm">
                    <MapPin className="w-5 h-5 text-gold" /> Arizona
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="bg-warm-gray rounded-xl h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="font-body text-muted-foreground text-sm">Google Map Embed</p>
                  <p className="font-body text-muted-foreground text-xs">Arizona</p>
                </div>
              </div>

              {/* Calendly slot */}
              <div className="bg-cream rounded-xl p-8 text-center">
                <Calendar className="w-8 h-8 text-gold mx-auto mb-3" />
                <h3 className="font-heading text-lg text-foreground mb-2">Prefer to Schedule Directly?</h3>
                <p className="font-body text-muted-foreground text-sm mb-4">Book a consultation at a time that works for you.</p>
                <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-white font-body tracking-wider text-xs">
                  SCHEDULE A CONSULTATION
                </Button>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}