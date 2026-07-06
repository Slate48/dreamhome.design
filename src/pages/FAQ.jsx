import React, { useEffect, useState } from 'react';
import { publicContent } from '@/api/publicContent';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    publicContent.FAQItem.filter({ is_active: true }, 'sort_order', 100).then(setFaqs);
  }, []);

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
                  key={faq.id}
                  value={`faq-${i}`}
                  className="border border-border rounded-lg px-6 data-[state=open]:bg-cream/50"
                >
                  <AccordionTrigger className="font-heading text-lg text-left hover:no-underline hover:text-gold py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-muted-foreground leading-relaxed pb-5">
                    {faq.answer}
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