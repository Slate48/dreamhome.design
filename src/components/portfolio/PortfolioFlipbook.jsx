import React, { useRef, useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BOOK_CATEGORIES = ['Kitchens', 'Bathrooms', 'Closets', 'Home Bars', 'Pantries', 'Custom Millwork'];

const FlipPhotoPage = React.forwardRef(({ imageUrl, title }, ref) => (
  <div ref={ref} className="overflow-hidden bg-charcoal">
    <div className="w-full h-full relative">
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal/80 to-transparent p-4">
            <h3 className="font-heading text-white text-sm leading-tight">{title}</h3>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-warm-gray animate-pulse" />
      )}
    </div>
  </div>
));
FlipPhotoPage.displayName = 'FlipPhotoPage';

export default function PortfolioFlipbook({ allItems }) {
  const bookRef = useRef(null);
  const containerRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState(BOOK_CATEGORIES[0]);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookDims, setBookDims] = useState({ width: 520, height: 680, key: 0 });

  const items = allItems.filter(item => item.category === activeCategory && item.image_url);

  // Responsive sizing via ResizeObserver (debounced to avoid rapid remounts)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer = null;
    const compute = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const available = el.offsetWidth;
        // Each page: fill half the container, capped at 800px per page
        const pageW = Math.max(160, Math.min(Math.floor(available / 2) - 8, 800));
        const pageH = Math.round(pageW * (680 / 520)); // maintain ~3:4 ratio
        setBookDims(prev => {
          // Only remount if dimensions actually changed
          if (prev.width === pageW && prev.height === pageH) return prev;
          return { width: pageW, height: pageH, key: prev.key + 1 };
        });
      }, 150);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => { ro.disconnect(); if (timer) clearTimeout(timer); };
  }, []);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(0);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      try { bookRef.current?.pageFlip().turnToPage(0); } catch {}
    }, 80);
    return () => clearTimeout(t);
  }, [activeCategory]);

  const prevPage = () => bookRef.current?.pageFlip().flipPrev();
  const nextPage = () => bookRef.current?.pageFlip().flipNext();

  return (
    <div className="w-full flex flex-col items-center gap-8">
      {/* Category navigation */}
      <div className="flex flex-wrap justify-center gap-2">
        {BOOK_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
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

      {/* Flipbook */}
      <div ref={containerRef} className="w-full flex flex-col items-center gap-6">
        {items.length > 0 ? (
          <>
            <div className="w-full flex justify-center overflow-hidden">
              <HTMLFlipBook
                key={`${activeCategory}-${bookDims.key}`}
                ref={bookRef}
                width={bookDims.width}
                height={bookDims.height}
                size="fixed"
                showCover={false}
                mobileScrollSupport={true}
                onFlip={(e) => setCurrentPage(e.data)}
                className="shadow-2xl"
                drawShadow={true}
                flippingTime={700}
                usePortrait={false}
                maxShadowOpacity={0.5}
                showPageCorners={true}
                disableFlipByClick={false}
                startPage={0}
              >
                {items.map((item) => (
                  <FlipPhotoPage key={item.id} imageUrl={item.image_url} title={item.title} />
                ))}
              </HTMLFlipBook>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={prevPage}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-body text-sm text-muted-foreground tracking-wider">
                {currentPage + 1} / {items.length}
              </span>
              <button
                onClick={nextPage}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="font-body text-muted-foreground">No images in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}