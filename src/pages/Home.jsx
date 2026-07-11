import React from 'react';
import HeroSection from '../components/home/HeroSection';
import ServicesStrip from '../components/home/ServicesStrip';
import ProcessTeaser from '../components/home/ProcessTeaser';
import PortfolioGrid from '../components/home/PortfolioGrid';
import FoundersSection from '../components/home/FoundersSection';
import MagazineFeature from '../components/home/MagazineFeature';
import TestimonialsSection from '../components/home/TestimonialsSection';
import InstagramStrip from '../components/home/InstagramStrip';

const rebeccaImage = 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/team/rebecca.png';
const bryanImage = 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/team/bryan.png';

const portfolioImages = [
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/white-walnut-kitchen.jpg', label: 'White & Walnut Open Kitchen' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/warm-oak-closet.jpg', label: 'Warm Oak Walk-In Closet' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/slate-home-bar.jpg', label: 'Slate Home Bar' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/dual-vanity-bath.jpg', label: 'Dual Vanity Master Bath' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/dark-oak-kitchen.jpg', label: 'Dark Oak Statement Kitchen' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/custom-master-suite.jpg', label: 'Custom Master Suite' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/taupe-pantry.jpg', label: 'Taupe Pantry with LED Shelving' },
  { url: 'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/gallery/light-oak-wet-bar.jpg', label: 'Light Oak Wet Bar' },
];

const instaImages = [
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/01.jpg',
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/02.jpg',
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/03.jpg',
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/04.jpg',
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/05.jpg',
  'https://pub-c9ac284ec9d9413b8aa88acb3167e31d.r2.dev/instagram/06.jpg',
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