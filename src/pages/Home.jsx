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
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/45f90e874_16-web-or-mls-NEchoCanyonCir-L0202-023.jpg', label: 'Light Oak Modern Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/9440f8e86_1P9A00531.jpg', label: 'Warm Oak Walk-In Closet' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/37dfe2217_13-web-or-mls-NEchoCanyonCir-L0202-006.jpg', label: 'Glass Wine Cellar' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/09c0d3634_16-web-or-mls-D46A5590copy.jpg', label: 'Dual Vanity Master Bath' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5a990b194_19-web-or-mls-D46A5616copy.jpg', label: 'Marble Waterfall Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/533bb5400_17-web-or-mls-D46A5600copy.jpg', label: 'Luxury Walk-In Closet' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/5c9db5db3_14-web-or-mls-NEchoCanyonCir-L0202-070.jpg', label: 'Wine Cellar Detail' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/91ce221a4_19-web-or-mls-NEchoCanyonCir-L0202-025.jpg', label: 'Kitchen Faucet Detail' },
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