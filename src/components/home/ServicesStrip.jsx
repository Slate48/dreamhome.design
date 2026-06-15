import React from 'react';
import { Layers, Grid2x2, Square, Gem, Palette } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

const services = [
  { icon: Layers, label: 'Custom Cabinetry', desc: 'Handcrafted to your exact specifications' },
  { icon: Grid2x2, label: 'Tailored Closets', desc: 'Custom storage solutions for every space' },
  { icon: Square, label: 'Countertop Fabrication', desc: 'Premium stone & surface selection' },
  { icon: Gem, label: 'Premium Slab Selection', desc: 'Curated natural stone & luxury materials' },
  { icon: Palette, label: 'Interior Design', desc: 'Full-service design consultation' },
];

export default function ServicesStrip() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-16">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">What We Do</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">Our Services</h2>
          </div>
        </SectionReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {services.map((service, i) => (
            <SectionReveal key={service.label} delay={i * 0.1}>
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <service.icon className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-heading text-lg text-foreground mb-2">{service.label}</h3>
                <p className="font-body text-sm text-muted-foreground">{service.desc}</p>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}