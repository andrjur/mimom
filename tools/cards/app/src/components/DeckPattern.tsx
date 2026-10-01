import React from 'react';
import { DeckTheme } from '../deckThemes';

interface DeckPatternProps {
  theme: DeckTheme;
  opacity?: number;
}

export function DeckPattern({ theme, opacity = 0.5 }: DeckPatternProps) {
  const { patternType, accent } = theme;
  const safeId = theme.name.replace(/[^a-zA-Z0-9]/g, '_');
  const patternId = `pattern_${safeId}_${patternType}`;

  const renderSvgPattern = () => {
    switch (patternType) {
      case 'grid':
        return (
          <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.22" />
            <circle cx="28" cy="0" r="1.5" fill={accent} fillOpacity="0.3" />
          </pattern>
        );
      case 'diagonal':
        return (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M-6,6 l12,-12 M0,24 l24,-24 M18,30 l12,-12" stroke={accent} strokeWidth="1.4" strokeOpacity="0.2" />
          </pattern>
        );
      case 'dots':
        return (
          <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" fill={accent} fillOpacity="0.25" />
            <circle cx="15" cy="15" r="1.4" fill={accent} fillOpacity="0.18" />
          </pattern>
        );
      case 'circuit':
        return (
          <pattern id={patternId} width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M0 18 h16 v-10 h12 v20 h8" fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.22" />
            <circle cx="16" cy="8" r="2.2" fill={accent} fillOpacity="0.35" />
            <circle cx="28" cy="28" r="2.2" fill={accent} fillOpacity="0.35" />
          </pattern>
        );
      case 'waves':
        return (
          <pattern id={patternId} width="32" height="16" patternUnits="userSpaceOnUse">
            <path d="M 0 8 Q 8 0 16 8 T 32 8" fill="none" stroke={accent} strokeWidth="1.3" strokeOpacity="0.25" />
          </pattern>
        );
      case 'cross':
        return (
          <pattern id={patternId} width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 13 8 L 13 18 M 8 13 L 18 13" stroke={accent} strokeWidth="1.4" strokeOpacity="0.22" />
          </pattern>
        );
      case 'rings':
        return (
          <pattern id={patternId} width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="17" cy="17" r="8" fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.22" />
            <circle cx="17" cy="17" r="14" fill="none" stroke={accent} strokeWidth="0.9" strokeDasharray="2,3" strokeOpacity="0.16" />
          </pattern>
        );
      case 'sparkles':
        return (
          <pattern id={patternId} width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 15 7 Q 15 15 23 15 Q 15 15 15 23 Q 15 15 7 15 Q 15 15 15 7 Z" fill={accent} fillOpacity="0.22" />
          </pattern>
        );
      default:
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.5" fill={accent} fillOpacity="0.2" />
          </pattern>
        );
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden" style={{ opacity }}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {renderSvgPattern()}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      {/* Subtle corner watermark illustration */}
      <div 
        className="absolute -bottom-5 -right-5 text-8xl font-serif select-none pointer-events-none transition-transform" 
        style={{ opacity: 0.12, color: accent }}
      >
        {theme.icon}
      </div>
    </div>
  );
}
