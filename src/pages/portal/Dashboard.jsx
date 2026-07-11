import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import SectionReveal from '../../components/shared/SectionReveal';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto">
      <SectionReveal>
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-foreground">
            Welcome back, <span className="text-gold">{user?.full_name || 'there'}</span>
          </h1>
        </div>
      </SectionReveal>

      <SectionReveal delay={0.1}>
        <Card className="p-12 bg-white text-center">
          <Circle className="w-12 h-12 text-gold/30 mx-auto mb-4" />
          <h2 className="font-heading text-xl text-foreground mb-2">Client Portal Coming Soon</h2>
          <p className="font-body text-muted-foreground text-sm mb-6">
            Project tracking, documents, selections, and messaging will appear here once your project is underway.
          </p>
          <Link to="/contact">
            <span className="text-gold font-body text-sm hover:underline">Get in Touch →</span>
          </Link>
        </Card>
      </SectionReveal>
    </div>
  );
}
