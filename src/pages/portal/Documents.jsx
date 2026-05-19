import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Upload, Folder } from 'lucide-react';
import { format } from 'date-fns';

const categories = ['Contracts', 'Design Drawings', 'Shop Drawings', 'Change Orders', 'Care Instructions', 'Final Invoice', 'Client Upload'];

export default function Documents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const projectId = projects[0]?.id;

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => base44.entities.Document.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      project_id: projectId,
      name: file.name,
      category: 'Client Upload',
      file_url,
      file_type: file.name.split('.').pop(),
      uploaded_by: user?.email,
    });
    queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    setUploading(false);
  };

  const grouped = categories.reduce((acc, cat) => {
    const docs = documents.filter(d => d.category === cat);
    if (docs.length > 0) acc[cat] = docs;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">Documents</h1>
        <label>
          <input type="file" className="hidden" onChange={handleUpload} />
          <Button asChild disabled={uploading || !projectId} className="bg-gold hover:bg-gold/90 text-white font-body text-xs tracking-wider cursor-pointer">
            <span><Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload File'}</span>
          </Button>
        </label>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="p-12 bg-white text-center">
          <FileText className="w-12 h-12 text-gold/30 mx-auto mb-4" />
          <p className="font-heading text-lg text-foreground">No Documents Yet</p>
          <p className="font-body text-muted-foreground text-sm mt-2">Documents will appear here as your project progresses.</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <Card key={cat} className="bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <Folder className="w-4 h-4 text-gold" />
              <h3 className="font-body text-sm font-medium text-foreground">{cat}</h3>
              <Badge variant="secondary" className="ml-auto text-[10px]">{docs.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {docs.map(doc => (
                <div key={doc.id} className="px-6 py-3 flex items-center gap-4 hover:bg-cream/50 transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground truncate">{doc.name}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {doc.file_type?.toUpperCase()} • {format(new Date(doc.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-gold hover:text-gold/80">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}