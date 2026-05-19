import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

export default function PortfolioGrid({ images }) {
  // Staggered grid layout
  const gridItems = images.slice(0, 8);

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-16">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Our Work</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">Portfolio</h2>
          </div>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {gridItems.map((img, i) => (
            <SectionReveal key={i} delay={i * 0.05}>
              <div className={`relative overflow-hidden rounded-lg group cursor-pointer ${
                i === 0 || i === 5 ? 'md:col-span-2 md:row-span-2' : ''
              }`}>
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <p className="font-body text-white text-sm">{img.label}</p>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>

        <SectionReveal delay={0.3}>
          <div className="text-center mt-12">
            <Link to="/portfolio">
              <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-white font-body tracking-wider px-8 py-6 text-sm">
                VIEW ALL WORK <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}