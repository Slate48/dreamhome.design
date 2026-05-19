import React from 'react';
import { Instagram } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

export default function InstagramStrip({ images }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-8">
            <a href="#" className="inline-flex items-center gap-2 text-foreground font-body text-sm hover:text-gold transition-colors">
              <Instagram className="w-5 h-5" />
              <span className="tracking-wide">@dreamhome.design</span>
            </a>
          </div>
        </SectionReveal>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {images.slice(0, 6).map((img, i) => (
            <SectionReveal key={i} delay={i * 0.05}>
              <div className="relative overflow-hidden aspect-square rounded group cursor-pointer">
                <img
                  src={img}
                  alt="Instagram post"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}