import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/adminEntities';
import { Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

const STATUS_VARIANT = {
  New: 'default',
  Read: 'secondary',
  Archived: 'outline',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.list('ContactInquiry', '-created_date', 100);
      setInquiries(data);
    } catch (err) {
      setError(err.message || 'Failed to load contact submissions');
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-foreground">Inquiries</h1>
        <p className="font-body text-muted-foreground text-sm mt-1">
          Contact form submissions from the public website.
        </p>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted-foreground font-body">Loading...</div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-5 font-body text-sm">
          {error}
        </div>
      )}

      {!loading && !error && inquiries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground font-body">
          No contact submissions yet.
        </div>
      )}

      {!loading && !error && inquiries.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Project Type</TableHead>
                <TableHead>How Heard</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-body font-medium text-foreground whitespace-nowrap">
                    {inquiry.name}
                  </TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} /> {inquiry.email}
                    </div>
                    {inquiry.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone size={12} /> {inquiry.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground whitespace-nowrap">
                    {inquiry.project_type || '—'}
                  </TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground whitespace-nowrap">
                    {inquiry.how_heard || '—'}
                  </TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground max-w-xs">
                    <p className="line-clamp-2">{inquiry.message}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[inquiry.status] || 'outline'}>
                      {inquiry.status || 'New'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-body text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(inquiry.created_date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
