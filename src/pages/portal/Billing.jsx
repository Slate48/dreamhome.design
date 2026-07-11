import React from 'react';
import { Card } from '@/components/ui/card';
import { Receipt, Mail } from 'lucide-react';

export default function Billing() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">Billing</h1>

      <Card className="p-12 bg-white text-center">
        <Receipt className="w-12 h-12 text-gold/30 mx-auto mb-4" />
        <p className="font-heading text-lg text-foreground">Coming Soon</p>
        <p className="font-body text-muted-foreground text-sm mt-2">Invoices and payment history will appear here once your project begins.</p>
      </Card>

      {/* Payment info */}
      <Card className="p-6 bg-charcoal">
        <h3 className="font-heading text-lg text-white mb-4">Payment Methods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {['Check payable to Dream Home Design LLC', 'ACH / Bank Transfer', 'Zelle', 'Credit Card (3% fee)'].map(m => (
            <div key={m} className="flex items-center gap-2 text-white/60 font-body text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-gold" /> {m}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <Mail className="w-4 h-4 text-gold" />
          <span className="text-white/60 font-body text-sm">Billing contact: </span>
          <a href="mailto:bojana@dreamhome.design" className="text-gold font-body text-sm hover:underline">
            Bojana Sabic — bojana@dreamhome.design
          </a>
        </div>
      </Card>
    </div>
  );
}
