import React, { useState } from 'react';
import SectionReveal from '../shared/SectionReveal';

// Placeholder slots — replace src values with real photo URLs when available
const photos = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  src: null,
  alt: `Feature photo ${i + 1}`,
}));

export default function MagazineFeature() {
  const [lightbox, setLightbox] = useState(null);

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-14">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">As Featured In</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">In The Press</h2>
          </div>
        </SectionReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {photos.map((photo, i) => (
            <SectionReveal key={photo.id} delay={i * 0.04}>
              <div
                className="aspect-square bg-warm-gray rounded-lg overflow-hidden cursor-pointer group relative"
                onClick={() => photo.src && setLightbox(photo)}
              >
                {photo.src ? (
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-body text-xs text-muted-foreground tracking-wider">Photo {photo.id}</span>
                  </div>
                )}
              </div>
            </SectionReveal>
          ))}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 bg-charcoal/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="max-w-4xl max-h-[90vh] w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  );
}