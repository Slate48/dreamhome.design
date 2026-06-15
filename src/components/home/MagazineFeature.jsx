import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

// To update the handbook, replace this URL with the new PDF file URL
const HANDBOOK_PDF_URL = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9f79840c4_DHDONBOARDINGWELCOMEGUIDE_202601072.pdf';
const TOTAL_PAGES = 12;

const Page = React.forwardRef(({ pageNum }, ref) => (
  <div ref={ref} className="bg-white overflow-hidden">
    <iframe
      src={`${HANDBOOK_PDF_URL}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
      title={`Handbook page ${pageNum}`}
      className="w-full h-full border-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  </div>
));

Page.displayName = 'Page';

export default function MagazineFeature() {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  const prevPage = () => bookRef.current?.pageFlip().flipPrev();
  const nextPage = () => bookRef.current?.pageFlip().flipNext();

  return (
    <section className="py-24 px-4 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-14">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Dream Home Design</p>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground">Client Onboarding Handbook</h2>
          </div>
        </SectionReveal>

        <SectionReveal>
          <div className="flex flex-col items-center gap-8">
            <div className="w-full flex justify-center">
              <HTMLFlipBook
                ref={bookRef}
                width={594}
                height={781}
                size="fixed"
                minWidth={300}
                maxWidth={700}
                minHeight={400}
                maxHeight={900}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={(e) => setCurrentPage(e.data)}
                className="shadow-2xl"
                style={{}}
                startPage={0}
                drawShadow={true}
                flippingTime={700}
                usePortrait={false}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.5}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {Array.from({ length: TOTAL_PAGES }, (_, i) => (
                  <Page key={i + 1} pageNum={i + 1} />
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
                {currentPage + 1} / {TOTAL_PAGES}
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