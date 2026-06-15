import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Footer() {
  const settings = useSiteSettings();

  const phone = settings?.phone_display || '877-343-CABS';
  const phoneHref = settings?.phone || '8773432227';
  const emailSales = settings?.email_sales || 'sales@dreamhome.design';
  const location = [settings?.address, settings?.city_state].filter(Boolean).join(', ') || 'Arizona';
  const tagline = settings?.tagline || 'Premium custom cabinetry & interior design. Crafting the spaces where your life unfolds.';
  const instagramUrl = settings?.instagram_url || '#';
  const facebookUrl = settings?.facebook_url || '#';
  const instagramHandle = settings?.instagram_handle || '@dreamhome.design';

  return (
    <footer>
      {/* CTA Banner */}
      <section className="bg-charcoal py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-white mb-4">
            Ready to Design Your <span className="text-gold italic">Dream?</span>
          </h2>
          <p className="text-white/60 font-body text-lg mb-8">Let's create something extraordinary together.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-gold hover:bg-gold/90 text-white font-body tracking-wider px-8 py-6 text-sm">
                START YOUR PROJECT <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <a href={`tel:${phoneHref}`} className="text-white/70 hover:text-white font-body text-sm tracking-wide transition-colors">
              {phone}
            </a>
          </div>
        </div>
      </section>

      {/* Footer content */}
      <div className="bg-charcoal border-t border-white/10 py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Logo light />
            <p className="mt-4 text-white/50 font-body text-sm leading-relaxed">{tagline}</p>
          </div>

          <div>
            <h4 className="text-white/90 font-body text-xs tracking-[0.2em] uppercase mb-4">Explore</h4>
            <div className="space-y-2">
              {[
                { label: 'About Us', path: '/about' },
                { label: 'Our Process', path: '/process' },
                { label: 'Portfolio', path: '/portfolio' },
                { label: 'Investment', path: '/investment' },
                { label: 'FAQ', path: '/faq' },
              ].map(link => (
                <Link key={link.path} to={link.path} className="block text-white/40 hover:text-gold text-sm font-body transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white/90 font-body text-xs tracking-[0.2em] uppercase mb-4">Contact</h4>
            <div className="space-y-3">
              <a href={`mailto:${emailSales}`} className="flex items-center gap-2 text-white/40 hover:text-gold text-sm font-body transition-colors">
                <Mail className="w-4 h-4" /> {emailSales}
              </a>
              <a href={`tel:${phoneHref}`} className="flex items-center gap-2 text-white/40 hover:text-gold text-sm font-body transition-colors">
                <Phone className="w-4 h-4" /> {phone}
              </a>
              <div className="flex items-center gap-2 text-white/40 text-sm font-body">
                <MapPin className="w-4 h-4" /> {location}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white/90 font-body text-xs tracking-[0.2em] uppercase mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
            <p className="mt-4 text-white/30 text-sm font-body">{instagramHandle}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs font-body">© {new Date().getFullYear()} Dream Home Design LLC. All rights reserved.</p>
          <p className="text-white/20 text-xs font-body">{settings?.website_url?.replace('https://', '') || 'www.dreamhome.design'}</p>
        </div>
      </div>
    </footer>
  );
}