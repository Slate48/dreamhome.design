import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Lock, CheckCircle2, Clock, Info } from 'lucide-react';

const selectionCategories = [
  'Door Style', 'Wood Species', 'Finish / Paint / Stain',
  'Hardware', 'Countertop Material', 'Inserts / Accessories'
];

const statusConfig = {
  Pending: { icon: Clock, color: 'bg-amber-100 text-amber-700' },
  Confirmed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  Locked: { icon: Lock, color: 'bg-muted text-muted-foreground' },
};

export default function Selections() {
  const { user } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const projectId = projects[0]?.id;

  const { data: selections = [] } = useQuery({
    queryKey: ['selections', projectId],
    queryFn: () => base44.entities.Selection.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const hasLockedItems = selections.some(s => s.status === 'Locked');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">Selections</h1>

      {hasLockedItems && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="font-body text-sm text-amber-800">
            Some selections are locked after drawing sign-off. Contact your designer for change order requests.
          </p>
        </div>
      )}

      {selectionCategories.map(cat => {
        const items = selections.filter(s => s.category === cat);
        return (
          <Card key={cat} className="bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <Palette className="w-4 h-4 text-gold" />
              <h3 className="font-body text-sm font-medium text-foreground">{cat}</h3>
            </div>
            <div className="px-6 py-4">
              {items.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No selections yet for this category.</p>
              ) : (
                <div className="space-y-3">
                  {items.map(item => {
                    const config = statusConfig[item.status] || statusConfig.Pending;
                    const Icon = config.icon;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="font-body text-sm text-foreground">{item.item_name}</p>
                          {item.description && (
                            <p className="font-body text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <Badge className={`text-[10px] ${config.color}`}>
                          {item.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}