import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPanel from '@/components/admin/UsersPanel';
import TiersPanel from '@/components/admin/TiersPanel';

export default function AdminUsers() {
  const { user } = useAuth();
  const isSuper = user?.rank === 0;

  return (
    <div>
      <h1 className="font-heading text-3xl text-foreground mb-1">Admins</h1>
      <p className="font-body text-muted-foreground mb-6">Manage admin accounts and their access.</p>
      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          {isSuper && <TabsTrigger value="tiers">Tiers</TabsTrigger>}
        </TabsList>
        <TabsContent value="people" className="mt-6"><UsersPanel /></TabsContent>
        {isSuper && <TabsContent value="tiers" className="mt-6"><TiersPanel /></TabsContent>}
      </Tabs>
    </div>
  );
}
