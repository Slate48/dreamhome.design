import React from 'react';

export default function PageHeader({ title, subtitle, imageUrl }) {
  return (
    <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-charcoal/70" />
      <div className="relative z-10 text-center px-4">
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body text-white/70 text-lg max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}