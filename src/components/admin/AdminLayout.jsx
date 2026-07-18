import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutGrid, Users, HelpCircle, GitBranch, DollarSign,
  Settings, Image, Menu, X, LogOut, ChevronRight, Star, Inbox, ShieldCheck, UserCog
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
  { label: 'Portfolio', path: '/admin/portfolio', icon: Image, capability: 'portfolio' },
  { label: 'Team & Founders', path: '/admin/team', icon: Users, capability: 'team' },
  { label: 'FAQs', path: '/admin/faqs', icon: HelpCircle, capability: 'faqs' },
  { label: 'Process Steps', path: '/admin/process', icon: GitBranch, capability: 'process' },
  { label: 'Investment', path: '/admin/investment', icon: DollarSign, capability: 'investment' },
  { label: 'Testimonials', path: '/admin/testimonials', icon: Star, capability: 'testimonials' },
  { label: 'Inquiries', path: '/admin/inquiries', icon: Inbox, capability: 'inquiries' },
  { label: 'Admins', path: '/admin/users', icon: ShieldCheck, capability: 'users' },
  { label: 'Site Settings', path: '/admin/settings', icon: Settings, capability: 'settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, can } = useAuth();
  const visibleNav = navItems.filter((i) => !i.capability || can(i.capability));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — fixed to the viewport on every breakpoint so it never scrolls with
          the page body; its own nav scrolls if the item list outgrows the viewport. */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-charcoal flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <p className="text-white font-heading text-lg">Admin Portal</p>
            <p className="text-white/40 font-body text-xs mt-0.5">Dream Home Design</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm transition-colors ${
                  active
                    ? 'bg-gold text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
          <Link
            to="/admin/account"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body text-sm transition-colors ${
              location.pathname === '/admin/account'
                ? 'bg-gold text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCog size={16} />
            Account
            {location.pathname === '/admin/account' && <ChevronRight size={14} className="ml-auto" />}
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          {user && (
            <div className="px-4 py-2">
              <p className="text-white/70 font-body text-sm truncate">{user.full_name}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold font-body text-xs">
                {user.tier_name || 'Staff'}
              </span>
            </div>
          )}
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-white/40 hover:text-white hover:bg-white/5 font-body text-sm transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main — offset past the fixed sidebar on desktop; the page body scrolls,
          the sidebar stays put. */}
      <div className="lg:ml-64 min-h-screen flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu size={20} />
          </button>
          <p className="font-heading text-lg text-foreground">Admin Portal</p>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}