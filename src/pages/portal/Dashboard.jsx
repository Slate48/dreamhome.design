import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Clock, Target, AlertCircle, Activity, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SectionReveal from '../../components/shared/SectionReveal';
import { format } from 'date-fns';

const stageNames = [
  'Consultation', 'Design', 'Proposal', 'Engineering',
  'Manufacturing', 'Shipping', 'Installation', 'Sign-Off'
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ is_read: false }),
    enabled: !!user?.email,
  });

  const project = projects[0]; // Primary project
  const currentStage = project?.current_stage || 1;

  return (
    <div className="max-w-5xl mx-auto">
      <SectionReveal>
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-foreground">
            Welcome back, <span className="text-gold">{user?.full_name || 'there'}</span>
          </h1>
          {project && (
            <p className="font-body text-muted-foreground mt-1">{project.name} — {project.address}</p>
          )}
        </div>
      </SectionReveal>

      {project ? (
        <>
          {/* Progress bar */}
          <SectionReveal delay={0.1}>
            <Card className="p-6 mb-8 bg-white">
              <p className="font-body text-xs tracking-wider uppercase text-muted-foreground mb-4">Project Progress</p>
              <div className="flex items-center gap-1 mb-3">
                {stageNames.map((name, i) => (
                  <div key={name} className="flex-1">
                    <div className={`h-2 rounded-full ${
                      i + 1 < currentStage ? 'bg-gold' :
                      i + 1 === currentStage ? 'bg-gold/60' :
                      'bg-warm-gray'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                {stageNames.map((name, i) => (
                  <div key={name} className="flex-1 text-center">
                    <p className={`font-body text-[10px] ${
                      i + 1 <= currentStage ? 'text-gold' : 'text-muted-foreground/50'
                    }`}>
                      {name}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </SectionReveal>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <SectionReveal delay={0.15}>
              <Card className="p-5 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">Current Stage</p>
                    <p className="font-heading text-lg text-foreground">{stageNames[currentStage - 1]}</p>
                  </div>
                </div>
              </Card>
            </SectionReveal>
            <SectionReveal delay={0.2}>
              <Card className="p-5 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">Est. Completion</p>
                    <p className="font-heading text-lg text-foreground">
                      {project.estimated_completion ? format(new Date(project.estimated_completion), 'MMM d, yyyy') : 'TBD'}
                    </p>
                  </div>
                </div>
              </Card>
            </SectionReveal>
            <SectionReveal delay={0.25}>
              <Card className="p-5 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">Unread Messages</p>
                    <p className="font-heading text-lg text-foreground">{messages.length}</p>
                  </div>
                </div>
              </Card>
            </SectionReveal>
          </div>

          {/* Quick links */}
          <SectionReveal delay={0.3}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/portal/project">
                <Card className="p-5 bg-white hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-gold" />
                      <span className="font-body text-sm text-foreground">View Project Details</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
                  </div>
                </Card>
              </Link>
              <Link to="/portal/messages">
                <Card className="p-5 bg-white hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-gold" />
                      <span className="font-body text-sm text-foreground">
                        {messages.length > 0 ? `${messages.length} message(s) need attention` : 'All caught up'}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
                  </div>
                </Card>
              </Link>
            </div>
          </SectionReveal>

          {/* Stage notes */}
          {project.stage_notes?.length > 0 && (
            <SectionReveal delay={0.35}>
              <Card className="p-6 bg-white mt-8">
                <h3 className="font-heading text-lg text-foreground mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {project.stage_notes.slice(-5).reverse().map((note, i) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />
                      <div>
                        <p className="font-body text-sm text-foreground">{note.note}</p>
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          Stage {note.stage} • {note.date ? format(new Date(note.date), 'MMM d, yyyy') : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </SectionReveal>
          )}
        </>
      ) : (
        <SectionReveal delay={0.1}>
          <Card className="p-12 bg-white text-center">
            <Circle className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-foreground mb-2">No Active Project</h2>
            <p className="font-body text-muted-foreground text-sm mb-6">
              Your project will appear here once it's been created by the Dream Home team.
            </p>
            <Link to="/contact">
              <span className="text-gold font-body text-sm hover:underline">Start Your Project →</span>
            </Link>
          </Card>
        </SectionReveal>
      )}
    </div>
  );
}