import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Mail, Phone, Download } from 'lucide-react';

const faqs = [
  { q: 'How long will my project take?', a: 'Most projects complete in 12–18 weeks from design sign-off to installation.' },
  { q: 'Can I make changes after the initial design?', a: 'Yes, during the design phase. After drawing sign-off, changes require a change order which may affect timeline and cost.' },
  { q: 'What types of wood and finishes do you offer?', a: 'Maple, walnut, oak, rift-cut white oak, exotic veneers. Finishes: paint, stain, glaze, custom color matching.' },
  { q: 'Can you match an existing cabinet style or finish?', a: 'Yes, subject to material availability.' },
  { q: 'What if I need more than just cabinets?', a: 'Full interior design services available for an additional fee.' },
  { q: 'Do you handle electrical, plumbing, or structural work?', a: 'No — we partner with trusted specialists who are contracted separately.' },
  { q: 'What are your payment methods?', a: 'Check, ACH/bank transfer, Zelle, or credit card (3% fee).' },
  { q: 'Who is my point of contact?', a: 'Designer during design phase; Project Coordinator from engineering through completion.' },
];

const contacts = [
  { name: 'Design Questions', email: 'Your assigned designer' },
  { name: 'Project Coordination', email: 'Your project coordinator' },
  { name: 'Billing', email: 'bojana@dreamhome.design' },
  { name: 'General', email: 'sales@dreamhome.design' },
];

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">Help & Resources</h1>

      {/* FAQ */}
      <Card className="bg-white p-6">
        <h2 className="font-heading text-xl text-foreground mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border rounded-lg px-4 data-[state=open]:bg-cream/50"
            >
              <AccordionTrigger className="font-body text-sm text-left hover:no-underline hover:text-gold py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="font-body text-sm text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      {/* Resources */}
      <Card className="bg-white p-6">
        <h2 className="font-heading text-xl text-foreground mb-4">Resources</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-cream rounded-lg">
            <FileText className="w-5 h-5 text-gold" />
            <div className="flex-1">
              <p className="font-body text-sm text-foreground">Cabinet Care Guide</p>
              <p className="font-body text-xs text-muted-foreground">Downloadable PDF with care instructions</p>
            </div>
            <Button size="sm" variant="ghost" className="text-gold">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card className="bg-white p-6">
        <h2 className="font-heading text-xl text-foreground mb-4">Contact Your Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contacts.map(c => (
            <div key={c.name} className="p-4 bg-cream rounded-lg">
              <p className="font-body text-xs text-muted-foreground mb-1">{c.name}</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold" />
                <p className="font-body text-sm text-foreground">{c.email}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-cream rounded-lg flex items-center gap-3">
          <Phone className="w-5 h-5 text-gold" />
          <div>
            <p className="font-body text-xs text-muted-foreground">Phone</p>
            <a href="tel:877-343-2227" className="font-body text-sm text-foreground hover:text-gold">877-343-CABS</a>
          </div>
        </div>
      </Card>
    </div>
  );
}