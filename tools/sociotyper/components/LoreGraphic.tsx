import React from 'react';

interface LoreGraphicProps {
  type: 'diagram' | 'crystal' | 'card' | 'sigil' | 'compass' | 'scales' | 'wings' | 'crown';
  className?: string;
}

export const LoreGraphic: React.FC<LoreGraphicProps> = ({ type, className = "w-32 h-32 text-brand-gold" }) => {
  switch (type) {
    case 'compass':
      return (
        <svg viewBox="0 0 100 100" className={`${className} animate-spin-slow filter drop-shadow-[0_0_15px_rgba(197,147,60,0.4)]`}>
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-40" />
          <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" fill="none" />
          <circle cx="50" cy="50" r="6" fill="currentColor" />
          {/* Compass needle */}
          <path d="M50,15 L56,44 L50,50 L44,44 Z" fill="currentColor" />
          <path d="M50,85 L56,56 L50,50 L44,56 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* Degree marks */}
          <line x1="50" y1="5" x2="50" y2="12" stroke="currentColor" strokeWidth="2.5" />
          <line x1="50" y1="95" x2="50" y2="88" stroke="currentColor" strokeWidth="2" />
          <line x1="5" y1="50" x2="12" y2="50" stroke="currentColor" strokeWidth="2" />
          <line x1="95" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'crystal':
      return (
        <svg viewBox="0 0 100 100" className={`${className} animate-pulse filter drop-shadow-[0_0_20px_rgba(141,79,48,0.5)]`}>
          {/* Outer diamond halo */}
          <polygon points="50,5 90,50 50,95 10,50" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" className="opacity-55" />
          {/* Inner multi-faceted crystal */}
          <polygon points="50,12 80,50 50,88 20,50" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="50" y1="12" x2="50" y2="88" stroke="currentColor" strokeWidth="1.5" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="1.5" />
          {/* Facets */}
          <polygon points="50,12 35,35 50,50 65,35" stroke="currentColor" strokeWidth="1" fill="currentColor" className="opacity-10" />
          <polygon points="50,88 35,65 50,50 65,65" stroke="currentColor" strokeWidth="1" fill="currentColor" className="opacity-10" />
        </svg>
      );
    case 'card':
      return (
        <svg viewBox="0 0 100 120" className={`${className} filter drop-shadow-[0_0_15px_rgba(197,147,60,0.35)]`}>
          {/* Elegant Tarot Card Frame */}
          <rect x="15" y="10" width="70" height="100" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <rect x="21" y="16" width="58" height="88" rx="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 1" fill="none" className="opacity-80" />
          {/* Abstract Star/Sun symbol inside */}
          <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="8" fill="currentColor" className="animate-ping opacity-35" />
          <circle cx="50" cy="50" r="5" fill="currentColor" />
          {/* Sunbeams */}
          <line x1="50" y1="28" x2="50" y2="33" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="72" x2="50" y2="67" stroke="currentColor" strokeWidth="1.5" />
          <line x1="28" y1="50" x2="33" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <line x1="72" y1="50" x2="67" y2="50" stroke="currentColor" strokeWidth="1.5" />
          {/* Diagonal rays */}
          <line x1="35" y1="35" x2="40" y2="40" stroke="currentColor" strokeWidth="1" />
          <line x1="65" y1="65" x2="60" y2="60" stroke="currentColor" strokeWidth="1" />
          <line x1="65" y1="35" x2="60" y2="40" stroke="currentColor" strokeWidth="1" />
          <line x1="35" y1="65" x2="40" y2="60" stroke="currentColor" strokeWidth="1" />
          {/* Card bottom markings */}
          <path d="M35,90 H65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="98" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'sigil':
      return (
        <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-[0_0_15px_rgba(141,79,48,0.4)]`}>
          {/* Alchemical/Geometric sigil */}
          <polygon points="50,15 85,75 15,75" stroke="currentColor" strokeWidth="2" fill="none" />
          <polygon points="50,85 85,25 15,25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 2" fill="none" className="opacity-70" />
          <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="3" fill="currentColor" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-60" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-60" />
        </svg>
      );
    case 'scales':
      return (
        <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-[0_0_12px_rgba(197,147,60,0.3)]`}>
          {/* Scales of justice */}
          <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" strokeWidth="3" />
          <line x1="35" y1="85" x2="65" y2="85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Crossbar */}
          <line x1="15" y1="30" x2="85" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="origin-center animate-pulse" />
          <circle cx="50" cy="30" r="4.5" fill="currentColor" />
          {/* Left scale */}
          <line x1="20" y1="30" x2="10" y2="55" stroke="currentColor" strokeWidth="1" />
          <line x1="20" y1="30" x2="30" y2="55" stroke="currentColor" strokeWidth="1" />
          <path d="M8,55 Q20,68 32,55 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" className="opacity-20" />
          {/* Right scale */}
          <line x1="80" y1="30" x2="70" y2="55" stroke="currentColor" strokeWidth="1" />
          <line x1="80" y1="30" x2="90" y2="55" stroke="currentColor" strokeWidth="1" />
          <path d="M68,55 Q80,68 92,55 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" className="opacity-20" />
        </svg>
      );
    case 'wings':
      return (
        <svg viewBox="0 0 120 100" className={`${className} filter drop-shadow-[0_0_15px_rgba(197,147,60,0.35)]`}>
          {/* Angelic/Intuitive wings */}
          <path d="M10,50 C25,25 50,20 55,45 C50,55 35,55 10,50 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" className="opacity-15" />
          <path d="M110,50 C95,25 70,20 65,45 C70,55 85,55 110,50 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" className="opacity-15" />
          {/* Wing Feathers lines */}
          <path d="M15,48 C30,32 48,32 52,44" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M22,50 C35,38 48,38 50,47" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M105,48 C90,32 72,32 68,44" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M98,50 C85,38 72,38 70,47" stroke="currentColor" strokeWidth="1.2" fill="none" />
          {/* Center glowing star */}
          <circle cx="60" cy="45" r="5" fill="currentColor" className="animate-ping" />
          <polygon points="60,33 63,42 72,45 63,48 60,57 57,48 48,45 57,42" fill="currentColor" />
        </svg>
      );
    case 'crown':
      return (
        <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-[0_0_15px_rgba(141,79,48,0.4)]`}>
          {/* Imperial Crown of Will */}
          <path d="M10,75 L15,35 L38,55 L50,22 L62,55 L85,35 L90,75 Z" stroke="currentColor" strokeWidth="2.2" fill="currentColor" className="opacity-15" />
          <path d="M10,75 H90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="18" y="79" width="64" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* Jewels */}
          <circle cx="15" cy="31" r="3.5" fill="currentColor" />
          <circle cx="50" cy="18" r="4.5" fill="currentColor" className="animate-pulse" />
          <circle cx="85" cy="31" r="3.5" fill="currentColor" />
          <circle cx="38" cy="51" r="2.5" fill="currentColor" />
          <circle cx="62" cy="51" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'diagram':
    default:
      return (
        <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-[0_0_15px_rgba(197,147,60,0.35)]`}>
          {/* Model A functional grid / Venn diagram */}
          <rect x="10" y="10" width="80" height="80" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Overlapping information rings */}
          <circle cx="38" cy="50" r="22" stroke="currentColor" strokeWidth="1.5" fill="none" className="opacity-50" />
          <circle cx="62" cy="50" r="22" stroke="currentColor" strokeWidth="1.5" fill="none" className="opacity-50" />
          <circle cx="50" cy="50" r="8" fill="currentColor" className="opacity-10 animate-ping" />
          <circle cx="50" cy="50" r="4" fill="currentColor" />
        </svg>
      );
  }
};
