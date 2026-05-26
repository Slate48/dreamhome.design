import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* YouTube video background */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          className="absolute w-[300%] h-[300%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          src="https://www.youtube.com/embed/sCPU1OBL8VQ?autoplay=1&mute=1&loop=1&playlist=sCPU1OBL8VQ&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Hero Video"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/40 to-charcoal/70" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <p className="font-body text-gold text-sm tracking-[0.3em] uppercase mb-6">
            Custom Cabinetry & Interior Design
          </p>
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
            Your Space. Your Story.
            <br />
            <span className="italic text-gold/90">Designed to Last.</span>
          </h1>
          <p className="font-body text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            At Dream Home Design, we don't just build cabinets. We craft the spaces where your life unfolds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/contact">
            <Button className="bg-gold hover:bg-gold/90 text-white font-body tracking-wider px-10 py-7 text-sm">
              START YOUR PROJECT <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/portfolio">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 font-body tracking-wider px-8 py-7 text-sm bg-transparent">
              <Play className="mr-2 w-4 h-4" /> VIEW OUR WORK
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
          <div className="w-1.5 h-2.5 bg-gold rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}