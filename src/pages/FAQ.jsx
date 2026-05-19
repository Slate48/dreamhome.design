import React from 'react';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    q: 'How long will my project take?',
    a: 'Most projects complete in 12–18 weeks from design sign-off to installation. This includes 6–8 weeks of manufacturing, 1–2 weeks for shipping, and 1–4 weeks for installation. Complex projects may take longer. Your project coordinator will provide a detailed timeline at the start.'
  },
  {
    q: 'Can I make changes after the initial design?',
    a: 'Yes! We welcome revisions during the design phase — it\'s part of the process. However, once drawings are signed off and production begins, any changes require a formal change order which may affect timeline and cost. Your designer will walk you through this process.'
  },
  {
    q: 'What types of wood and finishes do you offer?',
    a: 'We work with a wide range of premium materials including maple, walnut, oak, rift-cut white oak, and select exotic veneers. Finish options include paint (any color, including custom color matching), stain, glaze, and combination finishes. We\'ll bring samples to your consultation so you can see and feel the options.'
  },
  {
    q: 'Can you match an existing cabinet style or finish?',
    a: 'Yes, we can match existing cabinet styles and finishes, subject to material availability. Bring us a sample or photo and we\'ll do our best to create a seamless match for your new pieces.'
  },
  {
    q: 'What if I need more than just cabinets?',
    a: 'We offer full interior design services in addition to custom cabinetry. Our design team can help with space planning, material selection, color consultation, and overall design direction for an additional fee. Many clients find that a holistic approach delivers the best results.'
  },
  {
    q: 'Do you handle electrical, plumbing, or structural work?',
    a: 'We do not perform electrical, plumbing, or structural work directly. However, we partner with trusted specialists in each area and can coordinate these services as part of your project. These contractors are engaged separately but work closely with our team.'
  },
  {
    q: 'What are your payment methods?',
    a: 'We accept checks payable to Dream Home Design LLC, ACH/bank transfers, and Zelle. We also accept credit cards with a 3% processing fee. Your office manager, Bojana Sabic, will guide you through payment options during onboarding.'
  },
  {
    q: 'Who is my point of contact throughout the project?',
    a: 'During the design phase, your assigned designer is your primary contact. From the engineering phase through project completion, your Project Coordinator takes the lead. You\'ll always know who to reach and they\'ll be responsive to your questions.'
  },
];

export default function FAQ() {
  return (
    <div>
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about working with us"
        imageUrl="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/438f663cc_generated_53716705.png"
      />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <SectionReveal>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border rounded-lg px-6 data-[state=open]:bg-cream/50"
                >
                  <AccordionTrigger className="font-heading text-lg text-left hover:no-underline hover:text-gold py-5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}