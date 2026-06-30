import React, { useRef, useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';
import * as pdfjsLib from 'pdfjs-dist';

// Point worker to the correct path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// To update the handbook, replace this URL with the new PDF file URL
const HANDBOOK_PDF_URL = 'https://media.base44.com/files/public/6a0c98b9972c40dc9ebe5d05/8f7616d18_OnboardingPacket.pdf';

const FlipPage = React.forwardRef(({ imageUrl, pageNum }, ref) => (
  <div ref={ref} className="bg-white overflow-hidden">
    {imageUrl ? (
      <img src={imageUrl} alt={`Page ${pageNum}`} className="w-full h-full object-contain" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-warm-gray">
        <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
      </div>
    )}
  </div>
));
FlipPage.displayName = 'FlipPage';

export default function MagazineFeature() {
  const bookRef = useRef(null);
  const containerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImages, setPageImages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [bookDims, setBookDims] = useState({ width: 850, height: 616, key: 0 });

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const available = el.offsetWidth;
      // Reserve space for navbar, header, controls, gaps, and section padding
      const availableHeight = Math.max(240, window.innerHeight - 520);
      // Cap height by viewport first, then derive width
      let pageH = Math.min(Math.round((Math.min(available / 2 - 8, 850)) * (616 / 850)), availableHeight);
      let pageW = Math.round(pageH * (850 / 616));
      // Don't exceed available width
      if (pageW > available / 2 - 8) {
        pageW = Math.max(160, Math.floor(available / 2) - 8);
        pageH = Math.round(pageW * (616 / 850));
      }
      setBookDims(prev => ({ width: pageW, height: pageH, key: prev.key + 1 }));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(() => {
    async function loadPDF() {
      const pdf = await pdfjsLib.getDocument({ url: HANDBOOK_PDF_URL, withCredentials: false }).promise;
      setTotalPages(pdf.numPages);
      const images = new Array(pdf.numPages).fill(null);
      setPageImages([...images]);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // PDF content is drawn 90° CCW; apply 90° CW to render upright
        const viewport = page.getViewport({ scale: 2.5, rotation: 90 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        images[i - 1] = dataUrl;
        setPageImages([...images]);
      }
    }
    loadPDF();
  }, []);

  const prevPage = () => bookRef.current?.pageFlip().flipPrev();
  const nextPage = () => bookRef.current?.pageFlip().flipNext();

  return (
    <section className="py-24 px-4 bg-white overflow-hidden">
      <div className="max-w-[1920px] mx-auto">
        <SectionReveal>
          <div className="text-center mb-14">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Dream Home Design</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">Client Onboarding Handbook</h2>
          </div>
        </SectionReveal>

        <SectionReveal>
          <div ref={containerRef} className="flex flex-col items-center gap-8 w-full pb-6">
            {totalPages > 0 && (
              <div className="w-full flex justify-center overflow-visible mb-10">
                <HTMLFlipBook
                  key={bookDims.key}
                  ref={bookRef}
                  width={bookDims.width}
                  height={bookDims.height}
                  size="fixed"
                  showCover={true}
                  mobileScrollSupport={true}
                  onFlip={(e) => setCurrentPage(e.data)}
                  className="shadow-2xl"
                  startPage={0}
                  drawShadow={true}
                  flippingTime={700}
                  usePortrait={false}
                  maxShadowOpacity={0.5}
                  showPageCorners={true}
                  disableFlipByClick={false}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <FlipPage key={i} pageNum={i + 1} imageUrl={pageImages[i]} />
                  ))}
                </HTMLFlipBook>
              </div>
            )}

            {totalPages === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              </div>
            )}

            {/* Controls */}
            {totalPages > 0 && (
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
            )}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}