import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Building, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import MagazineFeature from '../components/home/MagazineFeature';

const ICONS = [FileText, Building, CreditCard];

export default function Investment() {
  const [tiers, setTiers] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.InvestmentTier.list('step_number', 10),
      base44.entities.SiteSettings.filter({ key: 'main' })
    ]).then(([t, s]) => {
      setTiers(t);
      if (s.length) setSettings(s[0]);
    });
  }, []);

  const lastTier = tiers[tiers.length - 1];
  const paymentMethods = lastTier?.payment_methods || ['Check payable to Dream Home Design LLC', 'ACH / Bank Transfer', 'Zelle', 'Credit Card (3% processing fee applies)'];
  const scopeNote = lastTier?.scope_exclusions_note || 'Scope exclusions: Structural, electrical, and plumbing work is handled by outside specialists and contracted separately.';

  return (
    <div>
      <PageHeader
        title="Your Investment"
        subtitle="Transparent pricing for exceptional craftsmanship"
        imageUrl="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/c49bb3d3d_generated_56d29da3.png"
      />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Payment Structure</p>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground">Three Simple Steps</h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {tiers.map((tier, i) => {
              const Icon = ICONS[i] || FileText;
              return (
                <SectionReveal key={tier.id} delay={i * 0.1}>
                  <div className="bg-cream rounded-xl p-8 h-full flex flex-col">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-gold" />
                    </div>
                    <div className="text-gold font-body text-xs tracking-wider uppercase mb-2">Step {tier.step_number}</div>
                    <h3 className="font-heading text-xl text-foreground mb-3">{tier.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed flex-1">{tier.description}</p>
                    {tier.note && (
                      <div className="mt-4 pt-4 border-t border-gold/10">
                        <p className="font-body text-xs text-gold">{tier.note}</p>
                      </div>
                    )}
                  </div>
                </SectionReveal>
              );
            })}
          </div>

          <SectionReveal>
            <div className="bg-charcoal rounded-xl p-8 md:p-12">
              <h3 className="font-heading text-2xl text-white mb-6">Payment Methods</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {paymentMethods.map(method => (
                  <div key={method} className="flex items-center gap-3 text-white/70 font-body text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    {method}
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white/5 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <p className="font-body text-white/50 text-sm">{scopeNote}</p>
              </div>
            </div>
          </SectionReveal>

          <MagazineFeature />

          <SectionReveal>
            <div className="text-center mt-16">
              <p className="font-body text-muted-foreground text-sm mb-2">For billing questions, contact:</p>
              <p className="font-heading text-xl text-foreground">{settings?.billing_contact_name || 'Amanda'}</p>
              <a href={`mailto:${settings?.email_billing || 'amanda@dreamhome.design'}`} className="font-body text-gold text-sm hover:underline">
                {settings?.email_billing || 'amanda@dreamhome.design'}
              </a>
              <div className="mt-8">
                <Link to="/contact">
                  <Button className="bg-gold hover:bg-gold/90 text-white font-body tracking-wider px-8 py-6 text-sm">
                    GET YOUR ESTIMATE <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}