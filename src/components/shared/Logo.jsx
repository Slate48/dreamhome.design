import React from 'react';

export default function Logo({ className = '', light = false }) {
  const textColor = light ? 'text-white' : 'text-charcoal';
  const accentColor = 'text-gold';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Chevron/roof icon */}
      <svg width="36" height="32" viewBox="0 0 36 32" fill="none" className="shrink-0">
        <path d="M18 2L34 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={accentColor.replace('text-', 'stroke-')}
          style={{ stroke: 'hsl(38, 45%, 60%)' }}
        />
        <path d="M18 2L2 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ stroke: 'hsl(38, 45%, 60%)' }}
        />
        <path d="M18 10L30 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ stroke: 'hsl(38, 45%, 60%)' }}
        />
        <path d="M18 10L6 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ stroke: 'hsl(38, 45%, 60%)' }}
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`text-xs tracking-[0.35em] font-body font-semibold ${textColor}`}>
          DREAM HOME
        </span>
        <span className={`text-[10px] tracking-[0.45em] font-body font-light ${light ? 'text-white/70' : 'text-muted-foreground'}`}>
          DESIGN
        </span>
      </div>
    </div>
  );
}