import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, CreditCard, DollarSign, Mail } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  Paid: 'bg-green-100 text-green-700',
  Outstanding: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
};

export default function Billing() {
  const { user } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const projectId = projects[0]?.id;

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">Billing</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Total Paid</p>
              <p className="font-heading text-2xl text-foreground">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground">Balance Remaining</p>
              <p className="font-heading text-2xl text-foreground">${totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices */}
      <Card className="bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-body text-sm font-medium text-foreground">Invoice History</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="font-body text-muted-foreground text-sm">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream">
                <tr>
                  <th className="px-6 py-3 text-left font-body text-xs text-muted-foreground tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left font-body text-xs text-muted-foreground tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left font-body text-xs text-muted-foreground tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right font-body text-xs text-muted-foreground tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right font-body text-xs text-muted-foreground tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right font-body text-xs text-muted-foreground tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-cream/50">
                    <td className="px-6 py-4 font-body text-sm text-foreground">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-body text-sm text-muted-foreground">{inv.type}</td>
                    <td className="px-6 py-4 font-body text-sm text-muted-foreground">
                      {inv.created_date ? format(new Date(inv.created_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-foreground text-right">
                      ${inv.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge className={`text-[10px] ${statusColors[inv.status] || ''}`}>{inv.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status !== 'Paid' && (
                        <Button size="sm" className="bg-gold hover:bg-gold/90 text-white font-body text-[10px] tracking-wider">
                          Pay Now
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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