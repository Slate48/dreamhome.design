import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionReveal from '../shared/SectionReveal';

const testimonials = [
  {
    name: 'Jennifer & Mark T.',
    quote: 'Rebecca and Bryan completely transformed our kitchen. The custom cabinetry is absolutely stunning — every detail was thought through. Our neighbors can\'t stop asking who did it. Dream Home Design is in a class of their own.',
    rating: 5,
    project: 'Custom Kitchen, Scottsdale'
  },
  {
    name: 'The Williams Family',
    quote: 'We hired Dream Home Design for our master closet and couldn\'t be more thrilled. The design process was seamless, and the finished product looks like something out of a magazine. Bryan was communicative every step of the way.',
    rating: 5,
    project: 'Custom Closet, Paradise Valley'
  },
  {
    name: 'Sandra M.',
    quote: 'From the slab selection to the final install, the entire experience was first-class. Rebecca has an incredible eye for design and made sure everything was perfect. Our countertops are absolutely gorgeous.',
    rating: 5,
    project: 'Countertop Fabrication, Chandler'
  },
  {
    name: 'Chris & Amy L.',
    quote: 'We did a full home remodel with Dream Home Design and they delivered beyond our expectations on every single room. The quality of craftsmanship is unmatched. We would recommend them to anyone looking for the best.',
    rating: 5,
    project: 'Full Home, Gilbert'
  },
  {
    name: 'Robert K.',
    quote: 'Our home bar and pantry turned out better than we ever imagined. The attention to detail is remarkable — every drawer, every shelf, every finish is absolutely perfect. Dream Home Design is worth every penny.',
    rating: 5,
    project: 'Home Bar & Pantry, Tempe'
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