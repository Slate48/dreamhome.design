import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

// Replace null values with real photo URLs when available
const photos = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  src: null,
  alt: `Feature photo ${i + 1}`,
}));

const Page = React.forwardRef(({ photo }, ref) => (
  <div ref={ref} className="bg-warm-gray overflow-hidden">
    {photo.src ? (
      <img
        src={photo.src}
        alt={photo.alt}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-body text-sm text-muted-foreground tracking-wider">{photo.alt}</span>
      </div>
    )}
  </div>
));

Page.displayName = 'Page';

export default function MagazineFeature() {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = photos.length;

  const prevPage = () => bookRef.current?.pageFlip().flipPrev();
  const nextPage = () => bookRef.current?.pageFlip().flipNext();

  return (
    <section className="py-24 px-4 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-14">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">As Featured In</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">In The Press</h2>
          </div>
        </SectionReveal>

        <SectionReveal>
          <div className="flex flex-col items-center gap-8">
            <div className="w-full flex justify-center">
              <HTMLFlipBook
                ref={bookRef}
                width={380}
                height={500}
                size="fixed"
                minWidth={220}
                maxWidth={500}
                minHeight={300}
                maxHeight={650}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={(e) => setCurrentPage(e.data)}
                className="shadow-2xl"
                style={{}}
                startPage={0}
                drawShadow={true}
                flippingTime={700}
                usePortrait={true}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.4}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {photos.map((photo) => (
                  <Page key={photo.id} photo={photo} />
                ))}
              </HTMLFlipBook>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={prevPage}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-body text-sm text-muted-foreground tracking-wider">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}