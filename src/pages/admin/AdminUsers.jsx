import React from 'react';
import UsersPanel from '@/components/admin/UsersPanel';

export default function AdminUsers() {
  return (
    <div>
      <h1 className="font-heading text-3xl text-foreground mb-1">Admins</h1>
      <p className="font-body text-muted-foreground mb-6">Manage admin accounts and their access.</p>
      <UsersPanel />
    </div>
  );
}
