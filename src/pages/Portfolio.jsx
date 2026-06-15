import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ArrowRight } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';

const categories = ['All', 'Kitchens', 'Bathrooms', 'Closets', 'Home Bars', 'Pantries', 'Custom Millwork'];

const portfolioItems = [
  { title: 'Modern Walnut Kitchen', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/525cf1a40_generated_f39324c2.png', desc: 'A stunning walnut kitchen with waterfall island and brushed gold accents.' },
  { title: 'Elegant Master Bath', category: 'Bathrooms', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b397ccb5a_generated_11790ae1.png', desc: 'White oak vanity with marble countertop and gold fixtures.' },
  { title: 'Gentleman\'s Home Bar', category: 'Home Bars', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/c49bb3d3d_generated_56d29da3.png', desc: 'Dark charcoal cabinetry with floating shelves and wine storage.' },
  { title: 'Custom Walk-in Closet', category: 'Closets', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/979f9e117_generated_9a7831d4.png', desc: 'Floor-to-ceiling built-ins with island and integrated lighting.' },
  { title: 'Designer Pantry', category: 'Pantries', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/439913dd9_generated_0a51d658.png', desc: 'Custom pantry with pull-out drawers and glass-front cabinets.' },
  { title: 'Custom Master Suite Headboard', category: 'Custom Millwork', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f8a563657_40-web-or-mls-NEchoCanyonCir-L0202-053.jpg', desc: 'Custom oak headboard wall panel with integrated lighting, floating nightstands, and adjacent display shelving.' },
  { title: 'Open Plan Dining & Kitchen', category: 'Custom Millwork', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/bf58fe90d_30-web-or-mls-NEchoCanyonCir-L0202-018.jpg', desc: 'Indoor-outdoor desert living with custom millwork, warm oak kitchen cabinetry, and designer lighting.' },
  { title: 'Panel-Ready Kitchen Suite', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/affeb8388_20-web-or-mls-NEchoCanyonCir-L0202-026.jpg', desc: 'Seamlessly integrated panel-ready refrigerator, open oak shelving, and stone countertops.' },
  { title: 'White & Walnut Open Kitchen', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/4b8c8d727_21-web-or-mls-D46A5632copy.jpg', desc: 'Dramatic open-plan kitchen with white upper cabinetry, walnut island base, Calacatta marble waterfall, and globe pendants.' },
  { title: 'Dark Oak Statement Kitchen', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f4394c377_36.jpg', desc: 'Sophisticated dark oak kitchen with leathered granite island, iron lantern pendants, and custom millwork.' },
  { title: 'Warm Oak Walk-In Closet', category: 'Closets', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9440f8e86_1P9A00531.jpg', desc: 'Floor-to-ceiling warm oak cabinetry with integrated LED toe-kick lighting, brass hardware, and a private seating alcove.' },
  { title: 'Luxury Walk-In Closet', category: 'Closets', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/533bb5400_17-web-or-mls-D46A5600copy.jpg', desc: 'Expansive walk-in closet with glass-front display cabinets, custom drawers, and ambient natural lighting.' },
  { title: 'Dual Vanity Master Bath', category: 'Bathrooms', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/09c0d3634_16-web-or-mls-D46A5590copy.jpg', desc: 'His-and-hers master vanities with Calacatta marble, white oak cabinetry, backlit mirrors, and geometric tile feature wall.' },
  { title: 'Marble Shower & Dark Vanity', category: 'Bathrooms', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/90c7dabd9_28-web-or-mls-D46A5682copy.jpg', desc: 'Bold marble slab shower with brass fixtures, dark oak vanity, integrated linen shelving, and granite countertop.' },
  { title: 'Marble Vanity & Hex Shower', category: 'Bathrooms', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7096adeea_32-web-or-mls-D46A5717copy.jpg', desc: 'Warm oak vanity with Carrara marble top, hexagon mosaic tile shower surround, and frameless glass enclosure.' },
  { title: 'Glass Wine Cellar', category: 'Home Bars', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/37dfe2217_13-web-or-mls-NEchoCanyonCir-L0202-006.jpg', desc: 'Custom glass-enclosed wine cellar with vertical bottle storage, oak millwork, and an intimate lounge setting.' },
  { title: 'Wine Cellar Detail', category: 'Home Bars', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5c9db5db3_14-web-or-mls-NEchoCanyonCir-L0202-070.jpg', desc: 'Floor-to-ceiling wine storage with custom oak cabinetry, mesh-front display cabinet, and frameless glass enclosure.' },
  { title: 'Slate Home Bar', category: 'Home Bars', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/fa50ca46f_26-web-or-mls-D46A5666copy.jpg', desc: 'Full-service dark slate home bar with granite counters, glass-front cabinetry, and desert views.' },
  { title: 'Light Oak Wet Bar', category: 'Home Bars', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/3946660a4_29-web-or-mls-NEchoCanyonCir-L0202-030.jpg', desc: 'Custom wet bar with integrated wine fridge, ice maker, brass faucet, and illuminated floating shelves.' },
  { title: 'Light Oak Modern Kitchen', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/45f90e874_16-web-or-mls-NEchoCanyonCir-L0202-023.jpg', desc: 'Expansive light oak kitchen with fluted cabinet details, stone island with bar seating, and globe pendant lighting.' },
  { title: 'Kitchen Island & Appliances', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/d4590d1e6_18-web-or-mls-D46A5603copy.jpg', desc: 'Chef\'s kitchen featuring a stone-topped island, professional appliances, and warm oak cabinetry with brass pulls.' },
  { title: 'Marble Waterfall Kitchen', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5a990b194_19-web-or-mls-D46A5616copy.jpg', desc: 'Dramatic white and dark wood kitchen with Calacatta marble waterfall island and custom millwork pantry.' },
  { title: 'Kitchen Faucet Detail', category: 'Kitchens', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/91ce221a4_19-web-or-mls-NEchoCanyonCir-L0202-025.jpg', desc: 'Artisan detail shot: rose gold faucet, stone backsplash, and fluted oak upper cabinets with under-cabinet lighting.' },
  { title: 'Taupe Pantry with LED Shelving', category: 'Pantries', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/756413347_22-web-or-mls-NEchoCanyonCir-L0202-066.jpg', desc: 'Custom pantry with taupe upper cabinets, LED-lit open shelving, and warm oak lower cabinetry.' },
  { title: 'Open Concept Great Room', category: 'Custom Millwork', image: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/95c140412_18-web-or-mls-D46A5603copy.jpg', desc: 'Open-plan living space with custom illuminated display shelving, wood beam ceiling accents, and seamless indoor-outdoor flow.' },
  { title: '', category: 'Pantries', image: null, desc: '' },
  { title: '', category: 'Closets', image: null, desc: '' },
];

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered = (activeCategory === 'All'
    ? portfolioItems
    : portfolioItems.filter(item => item.category === activeCategory)
  ).filter(item => item.image);

  return (
    <div>
      <PageHeader
        title="Our Portfolio"
        subtitle="A curated collection of our finest work"
        imageUrl="https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/525cf1a40_generated_f39324c2.png"
      />

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Filter tabs */}
          <SectionReveal>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map(cat => (
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
              <SectionReveal key={item.title} delay={i * 0.05}>
                <div
                  className="break-inside-avoid overflow-hidden rounded-lg group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative">
                    <img
                      src={item.image}
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
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="w-full max-h-[70vh] object-cover"
              />
              <div className="p-6">
                <p className="font-body text-gold text-xs tracking-wider uppercase">{selectedItem.category}</p>
                <h3 className="font-heading text-2xl text-white mt-2 mb-2">{selectedItem.title}</h3>
                <p className="font-body text-white/60 text-sm">{selectedItem.desc}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}