// Custom inline <svg> game icons matching 3D tower silhouettes and HUD emblems

import React from 'react';
import { TowerType } from '../game/constants';

export function CyberDefenseEmblem({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <polygon
        points="24,3 43,13 43,35 24,45 5,35 5,13"
        fill="#08162e"
        stroke="#00f0ff"
        strokeWidth="2.2"
      />
      <polygon
        points="24,10 36,17 36,31 24,38 12,31 12,17"
        fill="#0e274d"
        stroke="#38bdf8"
        strokeWidth="1.4"
      />
      <rect x="19" y="19" width="10" height="10" transform="rotate(45 24 24)" fill="#00f0ff" />
      <circle cx="24" cy="24" r="3.2" fill="#040914" />
    </svg>
  );
}

export function TowerSilhouetteIcon({
  type,
  className = 'w-7 h-7',
}: {
  type: TowerType;
  className?: string;
}) {
  if (type === 'laser') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <path d="M7 23h14l-2-5H9l-2 5z" fill="#0f2342" stroke="#22d3ee" strokeWidth="1.4" />
        <polygon points="14,5 20,12 14,17 8,12" fill="#22d3ee" fillOpacity="0.3" stroke="#22d3ee" strokeWidth="1.6" />
        <line x1="14" y1="3" x2="14" y2="11" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'cannon') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <rect x="6" y="18" width="16" height="5" rx="1" fill="#1e293b" stroke="#fb923c" strokeWidth="1.4" />
        <rect x="9" y="11" width="10" height="7" rx="1" fill="#2c1d12" stroke="#fb923c" strokeWidth="1.4" />
        <rect x="12" y="4" width="4" height="8" rx="1" fill="#fb923c" />
        <line x1="10" y1="5" x2="18" y2="5" stroke="#ffedd5" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'freeze') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <polygon points="14,3 21,13 14,22 7,13" fill="#0c2c44" stroke="#7dd3fc" strokeWidth="1.6" />
        <polygon points="14,7 17.5,13 14,18.5 10.5,13" fill="#bae6fd" fillOpacity="0.65" />
        <path d="M6 23h16" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path d="M7 23h14l-1.5-5h-11L7 23z" fill="#26101c" stroke="#f43f5e" strokeWidth="1.4" />
      <rect x="10.5" y="4" width="2.5" height="14" fill="#f43f5e" />
      <rect x="15" y="4" width="2.5" height="14" fill="#f43f5e" />
      <line x1="9" y1="9" x2="19" y2="9" stroke="#fecdd3" strokeWidth="1.5" />
      <line x1="9" y1="13" x2="19" y2="13" stroke="#fecdd3" strokeWidth="1.5" />
    </svg>
  );
}
