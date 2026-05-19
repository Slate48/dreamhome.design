import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, FolderOpen, FileText, Palette,
  MessageSquare, Receipt, HelpCircle, Menu, X, LogOut, ChevronRight
} from 'lucide-react';
import Logo from '../shared/Logo';
import { base44 } from '@/api/base44Client';

const portalLinks = [
  { path: '/portal', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/portal/project', icon: FolderOpen, label: 'My Project' },
  { path: '/portal/documents', icon: FileText, label: 'Documents' },
  { path: '/portal/selections', icon: Palette, label: 'Selections' },
  { path: '/portal/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/portal/billing', icon: Receipt, label: 'Billing' },
  { path: '/portal/help', icon: HelpCircle, label: 'Help' },
];

export default function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (link) => {
    if (link.exact) return location.pathname === link.path;
    return location.pathname.startsWith(link.path);
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-charcoal transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <Link to="/">
              <Logo light className="scale-90 origin-left" />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40">
              <X size={20} />
            </button>
          </div>

          <div className="px-3 py-4 text-xs text-white/30 font-body tracking-wider uppercase px-6">
            Client Portal
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {portalLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm transition-all ${
                  isActive(link)
                    ? 'bg-gold/15 text-gold'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
                {isActive(link) && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-heading text-sm">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-body truncate">{user?.full_name || 'Client'}</p>
                <p className="text-white/30 text-xs font-body truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => base44.auth.logout('/')}
              className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-white/60 font-body text-xs transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-charcoal/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu size={22} />
          </button>
          <div className="hidden lg:block" />
          <Link to="/" className="text-muted-foreground font-body text-xs hover:text-gold transition-colors">
            ← Back to Website
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}