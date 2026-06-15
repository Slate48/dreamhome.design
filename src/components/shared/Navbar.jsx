import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from './Logo';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Process', path: '/process' },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Investment', path: '/investment' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const showSolid = scrolled || !isHome || mobileOpen;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      showSolid
        ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/">
            <Logo light={!showSolid} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-[13px] tracking-wide font-body font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-gold'
                    : showSolid
                      ? 'text-foreground/70 hover:text-foreground'
                      : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-4 flex items-center gap-3">
              <Link to="/contact">
                <Button size="sm" className="bg-gold hover:bg-gold/90 text-white font-body text-xs tracking-wider px-5">
                  START YOUR PROJECT
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 ${showSolid ? 'text-foreground' : 'text-white'}`}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-border">
          <div className="px-4 py-6 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-3 text-sm font-body rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? 'text-gold bg-gold/5'
                    : 'text-foreground/70 hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border mt-4 space-y-3">
              <Link to="/contact" className="block px-4">
                <Button className="w-full bg-gold hover:bg-gold/90 text-white font-body text-xs tracking-wider">
                  START YOUR PROJECT
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}