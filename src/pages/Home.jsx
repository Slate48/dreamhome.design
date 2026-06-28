import React from 'react';
import HeroSection from '../components/home/HeroSection';
import ServicesStrip from '../components/home/ServicesStrip';
import ProcessTeaser from '../components/home/ProcessTeaser';
import PortfolioGrid from '../components/home/PortfolioGrid';
import FoundersSection from '../components/home/FoundersSection';
import MagazineFeature from '../components/home/MagazineFeature';
import TestimonialsSection from '../components/home/TestimonialsSection';
import InstagramStrip from '../components/home/InstagramStrip';

const rebeccaImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b9de115e3_Screenshot2026-05-20at10320PM.png';
const bryanImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/6704075b6_Screenshot2026-05-20at10140PM.png';

const portfolioImages = [
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/4b8c8d727_21-web-or-mls-D46A5632copy.jpg', label: 'White & Walnut Open Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9440f8e86_1P9A00531.jpg', label: 'Warm Oak Walk-In Closet' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/fa50ca46f_26-web-or-mls-D46A5666copy.jpg', label: 'Slate Home Bar' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/09c0d3634_16-web-or-mls-D46A5590copy.jpg', label: 'Dual Vanity Master Bath' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f4394c377_36.jpg', label: 'Dark Oak Statement Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/f8a563657_40-web-or-mls-NEchoCanyonCir-L0202-053.jpg', label: 'Custom Master Suite' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/756413347_22-web-or-mls-NEchoCanyonCir-L0202-066.jpg', label: 'Taupe Pantry with LED Shelving' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/3946660a4_29-web-or-mls-NEchoCanyonCir-L0202-030.jpg', label: 'Light Oak Wet Bar' },
];

const instaImages = [
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/df7ac0ee1_DR0A9180-topaz-sharpen-color-lighting-denoise1.jpg',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5ccb783b4_DR0A9199.jpg',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/517b44a0d_1P9A0041.jpg',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7e86d5c8d_63.jpg',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/511dc41fa_1P9A0048.jpg',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/65be1340d_78.jpg',
];

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ServicesStrip />
      <ProcessTeaser />
      <PortfolioGrid images={portfolioImages} />
      <MagazineFeature />
      <FoundersSection rebeccaImage={rebeccaImage} bryanImage={bryanImage} />
      <TestimonialsSection />
      <InstagramStrip images={instaImages} />
    </div>
  );
}