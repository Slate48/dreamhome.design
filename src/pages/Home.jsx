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
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/ae20c57b9_DR0A9183-topaz-denoise-sharpen-lighting-color-upscale-2x.jpg', label: 'Modern Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/517b44a0d_1P9A0041.jpg', label: 'Elegant Bathroom Vanity' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/65be1340d_78.jpg', label: 'Custom Home Bar' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/17a3c89d4_1P9A0053copy.jpg', label: 'Walk-in Closet' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/e914f00ad_DR0A9154-topaz-sharpen-denoise-lighting-lighting.jpg', label: 'Designer Pantry' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/783cb5f09_52.jpg', label: 'Custom Home Office' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/0870165b6__29A8276.jpg', label: 'Custom Wine Bar' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/511dc41fa_1P9A0048.jpg', label: 'Custom Walk-in Closet' },
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