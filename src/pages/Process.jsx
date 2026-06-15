import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Clock } from 'lucide-react';

const processHero = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/175087e57_45-web-or-mls-NEchoCanyonCir-L0202-058.jpg';

export default function Process() {
  const [stages, setStages] = useState([]);

  useEffect(() => {
    base44.entities.ProcessStage.filter({ is_active: true }, 'stage_number', 20).then(setStages);
  }, []);

  return (
    <div>
      <PageHeader
        title="From Vision to Reality"
        subtitle="A meticulous 8-stage process refined over years of excellence"
        imageUrl={processHero}
      />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gold/20 -translate-x-1/2" />
            {stages.map((stage, i) => (
              <SectionReveal key={stage.id} delay={i * 0.05}>
                <div className={`relative flex flex-col md:flex-row items-start gap-6 mb-16 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                    <div className="inline-block px-3 py-1 rounded-full bg-gold/10 text-gold font-body text-xs tracking-wide mb-3">
                      Stage {stage.stage_number}
                    </div>
                    <h3 className="font-heading text-xl md:text-2xl text-foreground mb-3">{stage.title}</h3>
                    <p className="font-body text-muted-foreground text-sm leading-relaxed">{stage.description}</p>
                  </div>
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gold border-4 border-white shadow-sm" />
                  <div className="flex-1 hidden md:block" />
                </div>
              </SectionReveal>
            ))}
          </div>

          <SectionReveal>
            <div className="mt-12 p-8 bg-cream rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-gold" />
                <p className="font-heading text-lg text-foreground">Typical Timeline</p>
              </div>
              <p className="font-body text-muted-foreground">
                Most projects complete in <strong className="text-foreground">12–18 weeks</strong> from design sign-off to installation.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}