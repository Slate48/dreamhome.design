import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Building, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';

const tiers = [
  {
    icon: FileText,
    title: 'Preliminary Estimate',
    desc: 'Based on your initial consultation and project scope, we provide a preliminary estimate to help you understand the investment range for your project.',
    note: 'No commitment required',
  },
  {
    icon: Building,
    title: 'Retainer + Drawing Fee',
    desc: '5–10% of the preliminary estimate, collected to secure your place in our design queue. This fee is non-refundable but is applied toward your final purchase if the project proceeds.',
    note: 'Applied to final purchase',
  },
  {
    icon: CreditCard,
    title: 'Production Deposit',
    desc: '50% of the total estimate, collected at contract sign-off. This initiates the engineering and manufacturing process for your project.',
    note: 'Collected at contract sign-off',
  },
];

const methods = [
  'Check payable to Dream Home Design LLC',
  'ACH / Bank Transfer',
  'Zelle',
  'Credit Card (3% processing fee applies)',
];

export default function Investment() {
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
            {tiers.map((tier, i) => (
              <SectionReveal key={tier.title} delay={i * 0.1}>
                <div className="bg-cream rounded-xl p-8 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-5">
                    <tier.icon className="w-6 h-6 text-gold" />
                  </div>
                  <div className="text-gold font-body text-xs tracking-wider uppercase mb-2">Step {i + 1}</div>
                  <h3 className="font-heading text-xl text-foreground mb-3">{tier.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed flex-1">{tier.desc}</p>
                  <div className="mt-4 pt-4 border-t border-gold/10">
                    <p className="font-body text-xs text-gold">{tier.note}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>

          {/* Payment methods */}
          <SectionReveal>
            <div className="bg-charcoal rounded-xl p-8 md:p-12">
              <h3 className="font-heading text-2xl text-white mb-6">Payment Methods</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {methods.map(method => (
                  <div key={method} className="flex items-center gap-3 text-white/70 font-body text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    {method}
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white/5 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <p className="font-body text-white/50 text-sm">
                  Scope exclusions: Structural, electrical, and plumbing work is handled by outside specialists and contracted separately. We coordinate with these partners as part of your project management.
                </p>
              </div>
            </div>
          </SectionReveal>

          {/* Contact */}
          <SectionReveal>
            <div className="text-center mt-16">
              <p className="font-body text-muted-foreground text-sm mb-2">For billing questions, contact:</p>
              <p className="font-heading text-xl text-foreground">Amanda</p>
              <a href="mailto:amanda@dreamhome.design" className="font-body text-gold text-sm hover:underline">
                amanda@dreamhome.design
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