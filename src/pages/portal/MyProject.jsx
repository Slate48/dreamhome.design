import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, MapPin, CheckCircle2, Clock, Circle } from 'lucide-react';
import { format } from 'date-fns';

const stageDetails = [
  { num: 1, title: 'Sales Contact & Initial Consultation' },
  { num: 2, title: 'Design Development' },
  { num: 3, title: 'Pricing Proposal & Agreement' },
  { num: 4, title: 'Engineering & Production Planning' },
  { num: 5, title: 'Manufacturing' },
  { num: 6, title: 'Shipping & Delivery' },
  { num: 7, title: 'Installation' },
  { num: 8, title: 'Project Sign-Off & Final Invoice' },
];

export default function MyProject() {
  const { user } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const project = projects[0];
  if (!project) return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-12 bg-white text-center">
        <p className="font-heading text-xl text-foreground">No project found</p>
        <p className="font-body text-muted-foreground text-sm mt-2">Your project details will appear here once your project is set up.</p>
      </Card>
    </div>
  );

  const currentStage = project.current_stage || 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">My Project</h1>

      {/* Project info card */}
      <Card className="p-6 bg-white">
        <h2 className="font-heading text-xl text-foreground mb-4">{project.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gold" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Address</p>
              <p className="font-body text-sm text-foreground">{project.address || 'TBD'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gold" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Designer</p>
              <p className="font-body text-sm text-foreground">{project.assigned_designer || 'TBD'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gold" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Coordinator</p>
              <p className="font-body text-sm text-foreground">{project.project_coordinator || 'TBD'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gold" />
            <div>
              <p className="font-body text-xs text-muted-foreground">Est. Completion</p>
              <p className="font-body text-sm text-foreground">
                {project.estimated_completion ? format(new Date(project.estimated_completion), 'MMM d, yyyy') : 'TBD'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stage progress */}
      <Card className="p-6 bg-white">
        <h3 className="font-heading text-lg text-foreground mb-6">Project Stages</h3>
        <div className="space-y-4">
          {stageDetails.map(stage => {
            const isComplete = stage.num < currentStage;
            const isCurrent = stage.num === currentStage;
            const stageNote = project.stage_notes?.find(n => n.stage === stage.num);

            return (
              <div key={stage.num} className={`flex items-start gap-4 p-4 rounded-lg ${
                isCurrent ? 'bg-gold/5 border border-gold/20' : isComplete ? 'bg-cream' : ''
              }`}>
                <div className="mt-0.5">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-gold" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5 text-gold" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-body text-sm font-medium text-foreground">{stage.title}</p>
                    <Badge variant="secondary" className={`text-[10px] ${
                      isComplete ? 'bg-gold/10 text-gold' :
                      isCurrent ? 'bg-gold text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}
                    </Badge>
                  </div>
                  {stageNote && (
                    <p className="font-body text-xs text-muted-foreground mt-1">{stageNote.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}