import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, PenTool, Hammer, CheckCircle2, ArrowRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

const steps = [
  { icon: MessageSquare, label: 'Consult', desc: 'Share your vision' },
  { icon: PenTool, label: 'Design', desc: 'We create the plan' },
  { icon: Hammer, label: 'Craft', desc: 'Built with precision' },
  { icon: CheckCircle2, label: 'Install', desc: 'Brought to life' },
];

export default function ProcessTeaser() {
  return (
    <section className="py-24 px-4 bg-cream">
      <div className="max-w-5xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-16">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Our Process</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">From Vision to Reality</h2>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.2}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {steps.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 border border-gold/20">
                    <step.icon className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-1">{step.label}</h3>
                  <p className="font-body text-sm text-muted-foreground">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block w-16 h-px bg-gold/30" />
                )}
              </React.Fragment>
            ))}
          </div>
        </SectionReveal>

        <SectionReveal delay={0.4}>
          <div className="text-center mt-12">
            <Link to="/process" className="inline-flex items-center gap-2 text-gold font-body text-sm tracking-wide hover:gap-3 transition-all">
              See Full Process <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}