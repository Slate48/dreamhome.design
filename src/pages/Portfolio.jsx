import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowRight, LayoutGrid, BookOpen } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';
import PortfolioFlipbook from '../components/portfolio/PortfolioFlipbook';

const CATEGORIES = ['All', 'Kitchens', 'Bathrooms', 'Closets', 'Home Bars', 'Pantries', 'Custom Millwork'];

// Fallback static items used while loading or if DB is empty
const STATIC_ITEMS = [
  { id: 's1', title: 'Navy Classic Home Bar', category: 'Home Bars', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/2084fc71d_78.jpg', description: 'Bold navy blue built-in bar with walnut shelving, mirrored back panel, glass storage, and curved marble counter.' },
  { id: 's2', title: 'Taupe Bar Niche', category: 'Home Bars', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/337d89607_Screenshot2026-04-22094726.jpg', description: 'Integrated taupe bar niche with stone backsplash, LED shelving, and custom cabinetry in a luxury great room.' },
  { id: 's3', title: 'Marble & Gold Bar Detail', category: 'Home Bars', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/083327fc2_Screenshot2026-04-22094740.jpg', description: 'Dramatic Calacatta gold marble bar counter and backsplash with brass faucet and antiqued mirror shelving.' },
  { id: 's4', title: 'Onyx Powder Room', category: 'Bathrooms', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/28117953a_410A1466.jpg', description: 'Dramatic backlit onyx floating vanity with brass fixtures, pendant lighting, and warm copper wall panel.' },
  { id: 's5', title: 'Pale Blue Farmhouse Vanity', category: 'Bathrooms', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5a7d78702_DR0A9199.jpg', description: 'Coastal-style pale blue vanity with farmhouse sink, Carrara marble top, crystal hardware, and brass sconces.' },
  { id: 's6', title: 'Cream LED Walk-In Closet', category: 'Closets', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9b4f49807_46-web-or-mls-NEchoCanyonCir-L0202-060.jpg', description: 'Symmetrical cream walk-in closet with LED cove lighting, integrated brass hardware, and clerestory window.' },
  { id: 's7', title: 'Oak Dressing Room', category: 'Bathrooms', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/154d9d047_48-web-or-mls-NEchoCanyonCir-L0202-0621.jpg', description: 'Light oak his-and-hers dressing room connecting to a walk-in closet with stone countertops and brass accents.' },
  { id: 's8', title: 'Wraparound Oak Vanity', category: 'Bathrooms', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/759020228_56-web-or-mls-NEchoCanyonCir-L0202-045.jpg', description: 'Custom wraparound oak vanity with marble countertop, grasscloth walls, glass-front upper cabinets, and open shelving.' },
  { id: 's9', title: 'Custom Master Suite Headboard', category: 'Custom Millwork', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f8a563657_40-web-or-mls-NEchoCanyonCir-L0202-053.jpg', description: 'Custom oak headboard wall panel with integrated lighting, floating nightstands, and adjacent display shelving.' },
  { id: 's10', title: 'White & Walnut Open Kitchen', category: 'Kitchens', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/4b8c8d727_21-web-or-mls-D46A5632copy.jpg', description: 'Dramatic open-plan kitchen with white upper cabinetry, walnut island base, Calacatta marble waterfall, and globe pendants.' },
  { id: 's11', title: 'Dark Oak Statement Kitchen', category: 'Kitchens', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f4394c377_36.jpg', description: 'Sophisticated dark oak kitchen with leathered granite island, iron lantern pendants, and custom millwork.' },
  { id: 's12', title: 'Warm Oak Walk-In Closet', category: 'Closets', image_url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9440f8e86_1P9A00531.jpg', description: 'Floor-to-ceiling warm oak cabinetry with integrated LED toe-kick lighting, brass hardware, and a private seating alcove.' },
];

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState('flipbook');

  useEffect(() => {
    base44.entities.PortfolioItem.list('sort_order', 200)
      .then(data => {
        setItems(data.length > 0 ? data : STATIC_ITEMS);
        setLoaded(true);
      })
      .catch(() => {
        setItems(STATIC_ITEMS);
        setLoaded(true);
      });
  }, []);

  const displayItems = loaded ? items : STATIC_ITEMS;
  const filtered = (activeCategory === 'All'
    ? displayItems
    : displayItems.filter(item => item.category === activeCategory)
  ).filter(item => item.image_url);

  return (
    <div>
      <PageHeader
        title="Our Portfolio"
        subtitle="A curated collection of our finest work"
        imageUrl="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/bc785c3b5_62-web-or-mls-NEchoCanyonCir-L0202-017.jpg"
      />

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">

          {/* View toggle */}
          <SectionReveal>
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full border border-gold/30 p-1 gap-1 bg-warm-gray/40">
                <button
                  onClick={() => setViewMode('flipbook')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-body text-sm transition-all ${
                    viewMode === 'flipbook' ? 'bg-gold text-white shadow' : 'text-muted-foreground hover:text-gold'
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> Lookbook
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-body text-sm transition-all ${
                    viewMode === 'grid' ? 'bg-gold text-white shadow' : 'text-muted-foreground hover:text-gold'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" /> Gallery
                </button>
              </div>
            </div>
          </SectionReveal>

          {/* Lookbook view */}
          {viewMode === 'flipbook' && (
            <SectionReveal>
              <PortfolioFlipbook allItems={displayItems} />
            </SectionReveal>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && (
          <>
          {/* Filter tabs */}
          <SectionReveal>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full font-body text-sm transition-all ${
                    activeCategory === cat
                      ? 'bg-gold text-white'
                      : 'bg-warm-gray text-muted-foreground hover:bg-gold/10 hover:text-gold'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </SectionReveal>

          {/* Masonry grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <SectionReveal key={item.id} delay={i * 0.03}>
                <div
                  className="break-inside-avoid overflow-hidden rounded-lg group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <p className="font-body text-gold text-xs tracking-wider uppercase">{item.category}</p>
                        <h3 className="font-heading text-xl text-white mt-1">{item.title}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>

          {/* CTA */}
          </>
          )}
          <SectionReveal>
            <div className="text-center mt-16 p-12 bg-cream rounded-xl">
              <h3 className="font-heading text-2xl md:text-3xl text-foreground mb-3">Love what you see?</h3>
              <p className="font-body text-muted-foreground mb-6">Let's build yours.</p>
              <Link to="/contact">
                <Button className="bg-gold hover:bg-gold/90 text-white font-body tracking-wider px-8 py-6 text-sm">
                  START YOUR PROJECT <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Lightbox */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-charcoal">
          {selectedItem && (
            <div>
              <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full max-h-[70vh] object-cover" />
              <div className="p-6">
                <p className="font-body text-gold text-xs tracking-wider uppercase">{selectedItem.category}</p>
                <h3 className="font-heading text-2xl text-white mt-2 mb-2">{selectedItem.title}</h3>
                <p className="font-body text-white/60 text-sm">{selectedItem.description || selectedItem.desc}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}