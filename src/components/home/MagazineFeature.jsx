import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

// To update the handbook, replace this URL with the new PDF file URL
const HANDBOOK_PDF_URL = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9f79840c4_DHDONBOARDINGWELCOMEGUIDE_202601072.pdf';
const TOTAL_PAGES = 12;

export default function MagazineFeature() {
  const [currentPage, setCurrentPage] = useState(1);

  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1));

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
            <div className="w-full flex justify-center shadow-2xl rounded-lg overflow-hidden">
              <iframe
                src={`${HANDBOOK_PDF_URL}#page=${currentPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                title="Client Onboarding Handbook"
                className="w-full border-0"
                style={{ height: '812px', maxWidth: '1188px' }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-body text-sm text-muted-foreground tracking-wider">
                {currentPage} / {TOTAL_PAGES}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === TOTAL_PAGES}
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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