import React from 'react';
import HeroSection from '../components/home/HeroSection';
import ServicesStrip from '../components/home/ServicesStrip';
import ProcessTeaser from '../components/home/ProcessTeaser';
import PortfolioGrid from '../components/home/PortfolioGrid';
import FoundersSection from '../components/home/FoundersSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import InstagramStrip from '../components/home/InstagramStrip';

const heroImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/525cf1a40_generated_f39324c2.png';
const foundersImage = 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/db4f3b857_generated_6799216e.png';

const portfolioImages = [
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/525cf1a40_generated_f39324c2.png', label: 'Modern Walnut Kitchen' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b397ccb5a_generated_11790ae1.png', label: 'Elegant Bathroom Vanity' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/c49bb3d3d_generated_56d29da3.png', label: 'Custom Home Bar' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/979f9e117_generated_9a7831d4.png', label: 'Walk-in Closet' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/439913dd9_generated_0a51d658.png', label: 'Designer Pantry' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7ed4204eb_generated_f4c5e2c9.png', label: 'Bedroom Built-ins' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/a68208666_generated_ea15a7b3.png', label: 'Luxury Laundry Room' },
  { url: 'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7ebfa3d58_generated_8388bd8f.png', label: 'Two-tone Kitchen' },
];

const instaImages = [
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/525cf1a40_generated_f39324c2.png',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/438f663cc_generated_53716705.png',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/b397ccb5a_generated_11790ae1.png',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/c49bb3d3d_generated_56d29da3.png',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/979f9e117_generated_9a7831d4.png',
  'https://media.base44.com/images/public/6a0c98b9972c40dc9ebe5d05/7ebfa3d58_generated_8388bd8f.png',
];

export default function Home() {
  return (
    <div>
      <HeroSection heroImage={heroImage} />
      <ServicesStrip />
      <ProcessTeaser />
      <PortfolioGrid images={portfolioImages} />
      <FoundersSection foundersImage={foundersImage} />
      <TestimonialsSection />
      <InstagramStrip images={instaImages} />
    </div>
  );
}