import React from 'react';
import { Link } from 'react-router-dom';
import { Image, Users, HelpCircle, GitBranch, DollarSign, Settings, ArrowRight, Star, Inbox } from 'lucide-react';

const cards = [
  { label: 'Portfolio', desc: 'Add, reorder, recategorize project photos', path: '/admin/portfolio', icon: Image },
  { label: 'Team & Founders', desc: 'Update team members, titles, headshots', path: '/admin/team', icon: Users },
  { label: 'FAQs', desc: 'Edit questions and answers', path: '/admin/faqs', icon: HelpCircle },
  { label: 'Process Steps', desc: 'Update the 8-stage process descriptions', path: '/admin/process', icon: GitBranch },
  { label: 'Investment', desc: 'Edit payment tiers and billing info', path: '/admin/investment', icon: DollarSign },
  { label: 'Site Settings', desc: 'Phone, email, address, social links, logo', path: '/admin/settings', icon: Settings },
  { label: 'Testimonials', desc: 'Add, edit, and feature client reviews', path: '/admin/testimonials', icon: Star },
  { label: 'Inquiries', desc: 'Review contact form submissions', path: '/admin/inquiries', icon: Inbox },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-heading text-3xl text-foreground mb-2">Admin Dashboard</h1>
      <p className="font-body text-muted-foreground mb-8">Manage your website content from here.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => (
          <Link
            key={card.path}
            to={card.path}
            className="bg-white rounded-xl p-6 border border-border hover:border-gold hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
              <card.icon size={20} className="text-gold" />
            </div>
            <h3 className="font-heading text-lg text-foreground mb-1">{card.label}</h3>
            <p className="font-body text-sm text-muted-foreground">{card.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-gold text-sm font-body">
              Manage <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}