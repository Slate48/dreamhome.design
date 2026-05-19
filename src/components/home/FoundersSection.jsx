import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

export default function FoundersSection({ foundersImage }) {
  return (
    <section className="py-24 px-4 bg-cream">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <SectionReveal>
            <div className="relative">
              <img
                src={foundersImage}
                alt="Rebecca & Bryan Siewin"
                className="w-full rounded-lg shadow-xl"
              />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gold/20 rounded-lg -z-10" />
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div>
              <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Meet the Founders</p>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-6">
                Rebecca & Bryan Siewin
              </h2>
              <p className="font-body text-muted-foreground leading-relaxed mb-4">
                Rebecca & Bryan Siewin founded Dream Home Design with one belief: that every home deserves spaces as extraordinary as the people who live in them.
              </p>
              <p className="font-body text-muted-foreground leading-relaxed mb-8">
                With decades of combined experience in custom cabinetry, interior design, and project management, they built a company that treats every project like it's their own home — with care, precision, and an unwavering commitment to quality.
              </p>
              <Link to="/about" className="inline-flex items-center gap-2 text-gold font-body text-sm tracking-wide hover:gap-3 transition-all">
                Meet the Full Team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}