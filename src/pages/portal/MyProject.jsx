import React from 'react';
import { Card } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export default function MyProject() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-foreground">My Project</h1>
      <Card className="p-12 bg-white text-center">
        <FolderOpen className="w-12 h-12 text-gold/30 mx-auto mb-4" />
        <p className="font-heading text-lg text-foreground">Coming Soon</p>
        <p className="font-body text-muted-foreground text-sm mt-2">
          Your project details will appear here once your project is set up.
        </p>
      </Card>
    </div>
  );
}
