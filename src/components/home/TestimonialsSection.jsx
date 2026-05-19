import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

const testimonials = [
  {
    name: 'The Martinez Family',
    quote: 'Dream Home Design transformed our kitchen into something we never imagined possible. The attention to detail, the quality of craftsmanship — it\'s beyond anything we\'ve seen. Rebecca\'s design vision brought our dream to life.',
    rating: 5,
    project: 'Kitchen Remodel, Scottsdale'
  },
  {
    name: 'David & Lauren Chen',
    quote: 'From the first consultation to the final walkthrough, the entire Dream Home team was exceptional. Bryan kept us informed every step of the way, and the final result exceeded our expectations. Our bathroom is now the highlight of our home.',
    rating: 5,
    project: 'Master Bath & Closet, Paradise Valley'
  },
  {
    name: 'The Andersons',
    quote: 'We\'ve worked with other cabinet companies before, but Dream Home Design is in a completely different league. The custom pantry and home bar they built for us are works of art. We couldn\'t be happier.',
    rating: 5,
    project: 'Pantry & Home Bar, Chandler'
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[current];

  return (
    <section className="py-24 px-4 bg-charcoal">
      <div className="max-w-4xl mx-auto">
        <SectionReveal>
          <div className="text-center">
            <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">Testimonials</p>
            <h2 className="font-heading text-3xl md:text-4xl text-white mb-12">What Our Clients Say</h2>

            <div className="relative min-h-[200px]">
              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="font-heading text-xl md:text-2xl text-white/90 italic leading-relaxed mb-6">
                "{t.quote}"
              </blockquote>
              <p className="font-body text-gold text-sm tracking-wide">{t.name}</p>
              <p className="font-body text-white/40 text-xs mt-1">{t.project}</p>
            </div>

            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => setCurrent(prev => (prev - 1 + testimonials.length) % testimonials.length)}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-gold' : 'bg-white/20'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrent(prev => (prev + 1) % testimonials.length)}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-colors"
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