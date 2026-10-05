import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Play, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '../components/shared/PageHeader';
import SectionReveal from '../components/shared/SectionReveal';

const CHANNEL_URL = 'https://www.youtube.com/@DreamHomeDesignArizona';
const CABINET_GUY_CATEGORY = 'Cabinetry & Closets';

const VIDEOS = [
  { id: 'xVeZYNr3Eyk', title: 'High-detail cabinetry designed to integrate seamlessly into the space.', category: 'Cabinetry & Closets' },
  { id: 'gZt1DijbBbg', title: 'Bespoke Beauty, Built To Last', category: 'Cabinetry & Closets' },
  { id: 'HTeQhqBYpHM', title: 'The Journey to Perfection: Crafting Spaces with Precision & Passion', category: 'Cabinetry & Closets' },
  { id: 'PpkrNTO5NVA', title: 'Where Craft Meets Glamour: A Kitchen That Defines Luxury Living', category: 'Cabinetry & Closets' },
  { id: '4QGl9VlUBns', title: 'The Art of Luxury Living: A Tour Through Design Perfection', category: 'Spaces & Tours' },
  { id: 'xMoobeN81nU', title: 'From 18K to 82K Sq Ft: Dream Home Design’s Big Leap Forward', category: 'Studio & Team' },
  { id: 'xkd0WGg0WZ8', title: 'This New Factory Will Change the Game', category: 'Studio & Team' },
  { id: 'QR-4G7S7Y1s', title: 'This Outdoor Design Decision Could Make or Break the Build', category: 'Spaces & Tours' },
  { id: 'vU6YuPkGjO0', title: 'This Outdoor Design Decision Could Make or Break the Build', category: 'Spaces & Tours' },
  { id: 'INPBmStzXbM', title: 'We’re Moving into an 81,000 Sq. Ft Dream Warehouse!', category: 'Studio & Team' },
  { id: 'OdoSyGSrUb8', title: 'Finishes, Function, and the Future: Building Our Dream Showroom', category: 'Studio & Team' },
  { id: 'S_wMOcEYlJI', title: 'Design Gaps, Cabinet Clashes, and Builder Banter: The Real Talk at 56th Street', category: 'Behind the Build' },
  { id: 'XRYBDtbmCZI', title: 'We’re Not Even at Cabinets Yet: Real Decisions Behind the Build at Brett Hills', category: 'Behind the Build' },
  { id: '04aNU6PiNOA', title: 'This Is How You Build with Purpose', category: 'Behind the Build' },
  { id: 'FuVEYBs3cFk', title: 'Inside a Luxury Renovation: From Bare Bones to Custom Cabinetry', category: 'Cabinetry & Closets' },
  { id: '2emHwIcAiSs', title: 'Why We Don’t Talk About Quality Anymore | Inside Dream Home Design AZ’s Game-Changing Process', category: 'Materials & Process' },
  { id: 'fQTLyy3pGkc', title: 'Inside a Real Construction Chaos Day: No Power, No Internet, and 4 Jobs in Progress', category: 'Behind the Build' },
  { id: '-q6nsq4oDO8', title: 'The Truth About High-End Closets: Faster, Better, and Built to Last', category: 'Cabinetry & Closets' },
  { id: 'wSf4zsQ-D7I', title: 'Why Most Builders Are Losing Millions Without Realizing It', category: 'Builder Insights' },
  { id: '-aUlXj7NLxg', title: 'Behind the Scenes of a $30 Million Mansion Build', category: 'Spaces & Tours' },
  { id: 'KVDzFHBhKy8', title: 'Designing With Cleaf Top Tips For Selling Luxury Materials', category: 'Materials & Process' },
  { id: 'hfyAC0PKUU8', title: 'A Day in the Life of a Luxury Contractor – Behind the Scenes at Dream Home Design 🔨', category: 'Studio & Team' },
  { id: 'Ffc-D2C7jOA', title: 'Turning a $5M Gutted Mansion into a Master Piece💎', category: 'Spaces & Tours' },
];

const SHORTS = [
  { id: 'ufMsrHT41oM', title: 'Behind the scenes stone countertops crafted for your Arizona dream home', category: 'Stone & Surfaces', kind: 'Short' },
  { id: 'WEwxAu9KJ7E', title: 'Had to wipe the camera first', category: 'Studio & Team', kind: 'Short' },
  { id: 'VVN6LSJ6Myw', title: 'We said we were artists and honestly...', category: 'Studio & Team', kind: 'Short' },
  { id: 'DdGRI8auB68', title: 'ASMR', category: 'Craft & Process', kind: 'Short' },
  { id: 'fjVHgo-XeYE', title: 'One consistent vision. Zero shortcuts', category: 'Craft & Process', kind: 'Short' },
  { id: 'Pmrgv46VHIk', title: '5%… 20%… 56%… 100%', category: 'Behind the Build', kind: 'Short' },
  { id: 'uG_FHy_Tqns', title: 'Every custom detail in this build', category: 'Behind the Build', kind: 'Short' },
  { id: 'G6FhEDEn9VE', title: 'Diamond mesh pantry doors', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'BkTEDVmx6_4', title: 'A Calacatta Oro reception desk', category: 'Stone & Surfaces', kind: 'Short' },
  { id: 'en25iZqRBXU', title: 'From This.. To This Luxurious Build', category: 'Spaces & Tours', kind: 'Short' },
  { id: 'vp0LAWufEwg', title: 'Every room. Every cabinet. Every corner. When DHD shows up to an estate this size the whole house ge…', category: 'Spaces & Tours', kind: 'Short' },
  { id: '86GQ6vFuOPA', title: 'Mountain Views', category: 'Spaces & Tours', kind: 'Short' },
  { id: 'iwPAYewrOJQ', title: "This isn't a home, but DHD built it like one.", category: 'Spaces & Tours', kind: 'Short' },
  { id: 'b2lyLTOn7AY', title: 'Every single room in this house hits the bar', category: 'Spaces & Tours', kind: 'Short' },
  { id: '4v-8Df4-u3E', title: 'Who builds your cabinets?', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'eyW39R57QzI', title: 'A full crew', category: 'Studio & Team', kind: 'Short' },
  { id: '2wAUqekr68s', title: 'Luxurious Best Feeling', category: 'Spaces & Tours', kind: 'Short' },
  { id: 'JIOhT14a4ac', title: "Ordinary Kitchens Exists... Then There's This", category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'x6P_xM_lwd8', title: 'Luxury Cabinets', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: '4CW-d-oOJpw', title: 'POV', category: 'Behind the Build', kind: 'Short' },
  { id: 'J8EGVkAq6j8', title: 'Our Most Used Cabinet Front Styles', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'caInyZDfGSk', title: 'Not As Easy As It Looks', category: 'Craft & Process', kind: 'Short' },
  { id: 'AzUAdFG7QOE', title: 'Samples Don’t Do Justice', category: 'Materials & Process', kind: 'Short' },
  { id: 'BOuARcmi37U', title: 'From Pins To Real Life', category: 'Design & Process', kind: 'Short' },
  { id: 'WMGADVE9FeE', title: 'Most people only see the finished cabinets.', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'Tu3dBYEQC-o', title: 'How Luxury Gets Installed', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'bfX5Cvg8g3M', title: 'Luxurious And Seamless Cabinetry', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'HpEvWNJQUHc', title: "Luxury Homes Don't Make You Feel Tired", category: 'Spaces & Tours', kind: 'Short' },
  { id: '1alqN_O9PTs', title: 'Welcome To Your Dream Kitchen', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'a-lc2rsUNiU', title: 'Luxury With Built Precision', category: 'Craft & Process', kind: 'Short' },
  { id: 'P9pFWcq10Hg', title: 'The Difference Is in the Craft', category: 'Craft & Process', kind: 'Short' },
  { id: '5lCvlMa2HQs', title: 'Quartz Luxurious Countertop', category: 'Stone & Surfaces', kind: 'Short' },
  { id: 'G7tiE0ccSlI', title: 'Intended Custom Luxury', category: 'Design & Process', kind: 'Short' },
  { id: 'JIfVKu378MI', title: 'Luxury isn’t just what you see. It’s what you touch every day.', category: 'Materials & Process', kind: 'Short' },
  { id: 'twZXNQepRwo', title: 'Behind Luxurious Build', category: 'Behind the Build', kind: 'Short' },
  { id: '41AZgUVoI18', title: 'Custom Luxurious Cabinetry', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'jpKVRNx4wQ4', title: 'Luxury Home Design', category: 'Spaces & Tours', kind: 'Short' },
  { id: 'mvoFUcJVk3Q', title: 'Luxurious Materials', category: 'Materials & Process', kind: 'Short' },
  { id: 'tjqGWiAy4c0', title: 'Craftmanship and Beauty Together', category: 'Craft & Process', kind: 'Short' },
  { id: '2hxw4eEbMko', title: 'The Foundation of Custom Luxury', category: 'Behind the Build', kind: 'Short' },
  { id: 'C8aZjA2qP6o', title: 'Clean Lines, Zero Compromise', category: 'Design & Process', kind: 'Short' },
  { id: '6-4pBE5ummY', title: 'From 0 to 100%', category: 'Behind the Build', kind: 'Short' },
  { id: 'ujXJJBeZepI', title: 'Luxurious Cabinets', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'wHAdjdE11Vg', title: 'Sculpted stone. Seamless cabinetry. Effortless luxury.', category: 'Stone & Surfaces', kind: 'Short' },
  { id: '05eglj8boDU', title: 'Luxurious Design', category: 'Design & Process', kind: 'Short' },
  { id: 'l3vvbpw8Y3I', title: 'Dream Home Cabinetry', category: 'Cabinetry & Closets', kind: 'Short' },
  { id: 'z72f_HM1JmU', title: 'DHD', category: 'Studio & Team', kind: 'Short' },
  { id: '0SuTly6B708', title: 'Dream Home', category: 'Studio & Team', kind: 'Short' },
];

const CABINET_GUY_VIDEO_COUNT = VIDEOS.filter(video => video.category === CABINET_GUY_CATEGORY).length;
const CABINET_GUY_SHORT_COUNT = SHORTS.filter(video => video.category === CABINET_GUY_CATEGORY).length;

const PROCESS = [
  { number: '01', title: 'Consult', text: 'Share what you want your space to do and how you want it to feel.' },
  { number: '02', title: 'Design', text: 'Shape the layout, materials, and details around your home.' },
  { number: '03', title: 'Craft', text: 'Build each piece with care and attention to fit and finish.' },
  { number: '04', title: 'Install', text: 'Bring the plan into the home and make the space complete.' },
];

function VideoCard({ video, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
      aria-label={`Play ${video.title}`}
    >
      <div className={video.kind === 'Short' ? 'relative aspect-[4/5] overflow-hidden rounded-lg bg-charcoal/10' : 'relative aspect-video overflow-hidden rounded-lg bg-charcoal/10'}>
        <img
          src={video.kind === 'Short' ? `https://i.ytimg.com/vi/${video.id}/frame0.jpg` : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-charcoal/10 transition-colors group-hover:bg-charcoal/35">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-charcoal shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-1 h-5 w-5 fill-current" />
          </span>
        </div>
      </div>
      <div className="pt-4">
        <p className="mb-2 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{video.kind === 'Short' ? 'Short · ' : ''}{video.category}</p>
        <h3 className="font-heading text-lg leading-snug text-foreground transition-colors group-hover:text-gold">{video.title}</h3>
      </div>
    </button>
  );
}

export default function VideoLibrary() {
  const [contentType, setContentType] = useState('Videos');
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All categories');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const sourceVideos = contentType === 'Shorts' ? SHORTS : VIDEOS;
  const collectionVideos = useMemo(
    () => activeCollection === 'cabinet-guy'
      ? sourceVideos.filter(video => video.category === CABINET_GUY_CATEGORY)
      : sourceVideos,
    [activeCollection, sourceVideos]
  );
  const categories = useMemo(() => ['All categories', ...new Set(collectionVideos.map(video => video.category))], [collectionVideos]);
  const visibleVideos = activeCategory === 'All categories'
    ? collectionVideos
    : collectionVideos.filter(video => video.category === activeCategory);

  return (
    <div>
      <PageHeader
        title="The Work, In Motion"
        subtitle="Step inside the spaces, materials, and people behind Dream Home Design."
        imageUrl="https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/hero/portfolio.jpg"
      />

      <section id="video-library" className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionReveal>
            <div className="mb-12 flex flex-col gap-6 border-b border-gold/20 pb-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 font-body text-xs uppercase tracking-[0.25em] text-gold">Dream Home Design on YouTube</p>
                <h2 className="font-heading text-3xl text-foreground md:text-4xl">A closer look at the craft</h2>
                <p className="mt-4 max-w-2xl font-body leading-relaxed text-muted-foreground">
                  Browse {VIDEOS.length} published videos and {SHORTS.length} Shorts by project type, materials, and the work behind each space. Visit the live channel for new uploads.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Custom cabinetry', 'Tailored closets', 'Countertops & stone', 'Interior design'].map(service => (
                    <span key={service} className="rounded-full bg-cream px-3 py-1.5 font-body text-xs text-muted-foreground">{service}</span>
                  ))}
                </div>
              </div>
              <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button className="bg-gold font-body text-white hover:bg-gold/90">
                  <Youtube className="mr-2 h-4 w-4" /> Visit YouTube channel <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="mb-7">
              <p className="mb-3 font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Collections</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose video collection">
                {[
                  { id: 'all', label: 'All Dream Home Design', count: VIDEOS.length + SHORTS.length },
                  { id: 'cabinet-guy', label: 'The Cabinet Guy', count: CABINET_GUY_VIDEO_COUNT + CABINET_GUY_SHORT_COUNT },
                ].map(collection => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => { setActiveCollection(collection.id); setActiveCategory('All categories'); }}
                    aria-pressed={activeCollection === collection.id}
                    className={`rounded-full px-4 py-2 font-body text-sm transition-colors ${activeCollection === collection.id ? 'bg-charcoal text-white' : 'bg-cream text-muted-foreground hover:bg-gold/10 hover:text-foreground'}`}
                  >
                    {collection.label} <span className="ml-1 opacity-70">({collection.count})</span>
                  </button>
                ))}
              </div>
              {activeCollection === 'cabinet-guy' && (
                <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-muted-foreground">
                  Working collection: these published cabinetry and closet videos are grouped here while a dedicated Cabinet Guy channel or series is not listed on the public channel.
                </p>
              )}
            </div>
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose video format">
              {['Videos', 'Shorts'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setContentType(type); setActiveCategory('All categories'); }}
                  aria-pressed={contentType === type}
                  className={`rounded-full px-4 py-2 font-body text-sm transition-colors ${contentType === type ? 'bg-charcoal text-white' : 'bg-cream text-muted-foreground hover:bg-gold/10 hover:text-foreground'}`}
                >
                  {type} <span className="ml-1 opacity-70">({type === 'Videos'
                    ? (activeCollection === 'cabinet-guy' ? CABINET_GUY_VIDEO_COUNT : VIDEOS.length)
                    : (activeCollection === 'cabinet-guy' ? CABINET_GUY_SHORT_COUNT : SHORTS.length)})</span>
                </button>
              ))}
            </div>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label={contentType === 'Shorts' ? 'Filter Shorts by category' : 'Filter videos by category'}>
                {categories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    aria-pressed={activeCategory === category}
                    className={`rounded-full px-4 py-2 font-body text-sm transition-colors ${
                      activeCategory === category
                        ? 'bg-charcoal text-white'
                        : 'bg-cream text-muted-foreground hover:bg-gold/10 hover:text-foreground'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <p className="font-body text-sm text-muted-foreground">{visibleVideos.length} {contentType.toLowerCase()}</p>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {visibleVideos.map((video, index) => (
              <SectionReveal key={video.id} delay={Math.min(index % 3, 2) * 0.04}>
                <VideoCard video={video} onSelect={setSelectedVideo} />
              </SectionReveal>
            ))}
          </div>

          <SectionReveal>
            <div className="mt-14 text-center">
              <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-body text-sm font-medium text-gold transition-colors hover:text-charcoal">
                Browse the full channel on YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="bg-cream px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <SectionReveal>
            <div>
              <p className="mb-3 font-body text-xs uppercase tracking-[0.25em] text-gold">A working collection · {CABINET_GUY_VIDEO_COUNT + CABINET_GUY_SHORT_COUNT} videos</p>
              <h2 className="font-heading text-3xl text-foreground md:text-4xl">The Cabinet Guy</h2>
              <p className="mt-4 font-body leading-relaxed text-muted-foreground">
                A dedicated Cabinet Guy channel or series is not listed on the public channel yet. This collection brings together Dream Home Design’s published cabinetry and closet videos now, with room for dedicated episodes when they go live.
              </p>
              <button
                type="button"
                onClick={() => {
                  setContentType('Videos');
                  setActiveCollection('cabinet-guy');
                  setActiveCategory('All categories');
                  document.getElementById('video-library')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 inline-flex items-center gap-2 font-body text-sm font-medium text-gold hover:text-charcoal"
                aria-controls="video-library"
              >
                Browse the Cabinet Guy collection <ArrowRight className="h-4 w-4" />
              </button>
              <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-charcoal">
                Visit the Dream Home Design channel <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.08}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {PROCESS.map(step => (
                <div key={step.number} className="border-t border-gold/25 pt-4">
                  <p className="font-body text-xs tracking-[0.18em] text-gold">{step.number}</p>
                  <h3 className="mt-2 font-heading text-xl text-foreground">{step.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-gold/20 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-2xl text-foreground">Have a space in mind?</p>
            <p className="mt-2 font-body text-muted-foreground">Explore the portfolio or start a conversation about your project.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/portfolio">
              <Button variant="outline" className="font-body">Explore the portfolio</Button>
            </Link>
            <Link to="/contact">
              <Button className="bg-gold font-body text-white hover:bg-gold/90">Start your project <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      <Dialog open={!!selectedVideo} onOpenChange={open => { if (!open) setSelectedVideo(null); }}>
        <DialogContent className="max-w-5xl overflow-hidden border-none bg-charcoal p-0 text-white">
          {selectedVideo && (
            <div>
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="p-5 sm:p-6">
                <p className="mb-2 font-body text-xs uppercase tracking-[0.18em] text-gold">{selectedVideo.category}</p>
                <h2 className="font-heading text-xl sm:text-2xl">{selectedVideo.title}</h2>
                <a href={`https://www.youtube.com/watch?v=${selectedVideo.id}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-body text-sm text-white/70 transition-colors hover:text-white">
                  Open on YouTube <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}