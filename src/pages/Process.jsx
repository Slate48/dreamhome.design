import React from 'react';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Clock } from 'lucide-react';

const processHero = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/3b0ab420b_generated_3a49d52d.png';

const stages = [
  {
    num: 1,
    title: 'Sales Contact & Initial Consultation',
    desc: 'We begin with a conversation about your goals, lifestyle, and vision. Visit our showroom to see and touch our materials firsthand. You\'ll receive a preliminary estimate, and a 5–10% retainer secures your place in our design queue.',
  },
  {
    num: 2,
    title: 'Design Development',
    desc: 'Your dedicated designer leads an in-depth design consultation. We create detailed drawings, 3D renderings, and material boards. Together we refine every detail — door styles, finishes, paint samples, hardware — until it\'s exactly right.',
  },
  {
    num: 3,
    title: 'Pricing Proposal & Agreement',
    desc: 'We present a comprehensive quote with full transparency on every line item. Once you\'re satisfied, we formalize the agreement and collect the production deposit to move forward.',
  },
  {
    num: 4,
    title: 'Engineering & Production Planning',
    desc: 'Our engineering team translates your design into precise shop drawings, CNC programming, and a complete bill of materials. Production is scheduled and work orders are generated.',
  },
  {
    num: 5,
    title: 'Manufacturing (6–8 weeks)',
    desc: 'Your cabinetry comes to life in our Arizona production facility. Material preparation, finishing, CNC panel cutting, edgebanding, assembly, hardware installation — each piece undergoes final inspection and is carefully packaged.',
  },
  {
    num: 6,
    title: 'Shipping & Delivery (1–2 weeks)',
    desc: 'Our logistics team coordinates loading, transportation, and delivery to your job site. Every piece is accounted for and handled with care.',
  },
  {
    num: 7,
    title: 'Installation (1–4 weeks)',
    desc: 'Our experienced installation team unloads, stages, and preps the site. Cabinets are installed systematically — boxes first, then doors, drawers, and trim. On-site touch-ups, caulking, and final cleaning ensure a flawless result.',
  },
  {
    num: 8,
    title: 'Project Sign-Off & Final Invoice',
    desc: 'We conduct a thorough walkthrough with you and/or your builder. Any punch list items are addressed, care instructions are provided, and the final invoice is processed. Your dream space is complete.',
  },
];

export default function Process() {
  return (
    <div>
      <PageHeader
        title="From Vision to Reality"
        subtitle="A meticulous 8-stage process refined over years of excellence"
        imageUrl={processHero}
      />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Timeline */}
          <div className="relative">
            {/* Center line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gold/20 -translate-x-1/2" />

            {stages.map((stage, i) => (
              <SectionReveal key={stage.num} delay={i * 0.05}>
                <div className={`relative flex flex-col md:flex-row items-start gap-6 mb-16 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}>
                  {/* Content */}
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                    <div className={`inline-block px-3 py-1 rounded-full bg-gold/10 text-gold font-body text-xs tracking-wide mb-3`}>
                      Stage {stage.num}
                    </div>
                    <h3 className="font-heading text-xl md:text-2xl text-foreground mb-3">{stage.title}</h3>
                    <p className="font-body text-muted-foreground text-sm leading-relaxed">{stage.desc}</p>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gold border-4 border-white shadow-sm" />

                  {/* Spacer */}
                  <div className="flex-1 hidden md:block" />
                </div>
              </SectionReveal>
            ))}
          </div>

          {/* Timeline note */}
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