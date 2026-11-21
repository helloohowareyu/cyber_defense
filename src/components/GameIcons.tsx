// Bespoke multi-layered isometric/architectural unit portraits for each Cyber Defense tower.
// Crafted with metallic shading, solid chassis geometry, and calibrated focal accents
// matching the actual 3D tower rigs on the arena.

import React from 'react';
import { TowerType } from '../game/constants';

export function CyberDefenseEmblem({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cd-hull" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#091529" />
        </linearGradient>
        <linearGradient id="cd-core" x1="16" y1="14" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path
        d="M24 4L41 13.5V34.5L24 44L7 34.5V13.5L24 4Z"
        fill="url(#cd-hull)"
        stroke="#38bdf8"
        strokeOpacity="0.65"
        strokeWidth="1.5"
      />
      <path d="M24 4L41 13.5L24 23L7 13.5L24 4Z" fill="#38bdf8" fillOpacity="0.12" />
      <path d="M24 23V44L41 34.5V13.5L24 23Z" fill="#020617" fillOpacity="0.32" />
      <path d="M24 12.5L33.5 18V30L24 35.5L14.5 30V18L24 12.5Z" fill="#0b1d36" stroke="#38bdf8" strokeOpacity="0.45" />
      <path d="M24 16.5L30 24L24 31.5L18 24L24 16.5Z" fill="url(#cd-core)" />
      <circle cx="24" cy="24" r="2.6" fill="#071324" />
    </svg>
  );
}

export function TowerSilhouetteIcon({
  type,
  className = 'w-10 h-10',
}: {
  type: TowerType;
  className?: string;
}) {
  if (type === 'laser') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="ls-base" x1="8" y1="24" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="ls-prism" x1="20" y1="6" x2="20" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="45%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        {/* Sculpted octagonal turret plinth */}
        <path d="M7 31L13 25H27L33 31L29 35H11L7 31Z" fill="url(#ls-base)" stroke="#64748b" strokeWidth="1" />
        <path d="M11 31H29L27 28H13L11 31Z" fill="#1e293b" />
        {/* Stabilizer fins */}
        <path d="M12 25L9 19L15 21V26H12Z" fill="#1e3a5f" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="0.9" />
        <path d="M28 25L31 19L25 21V26H28Z" fill="#1e3a5f" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="0.9" />
        {/* Faceted optical crystal emitter */}
        <polygon points="20,6 27,16 20,26 13,16" fill="url(#ls-prism)" />
        <polygon points="20,6 27,16 20,19" fill="#ecfeff" fillOpacity="0.45" />
        <polygon points="20,19 27,16 20,26" fill="#0c4a6e" fillOpacity="0.55" />
        {/* Emitter focus lens */}
        <circle cx="20" cy="16" r="2.6" fill="#ffffff" />
      </svg>
    );
  }

  if (type === 'cannon') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="cn-body" x1="8" y1="16" x2="32" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cn-barrel" x1="16" y1="6" x2="25" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="55%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
        </defs>
        {/* Heavy armored foundation */}
        <rect x="7" y="27" width="26" height="7" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
        <rect x="10" y="24" width="20" height="5" rx="1.2" fill="#334155" />
        {/* Armored turret housing */}
        <path d="M11 24L13 15H27L29 24H11Z" fill="url(#cn-body)" stroke="#94a3b8" strokeOpacity="0.5" strokeWidth="1" />
        {/* Heavy plasma mortar barrel */}
        <rect x="15.5" y="6" width="9" height="14" rx="1.8" fill="url(#cn-barrel)" />
        <rect x="13.5" y="6" width="13" height="3.2" rx="1.2" fill="#fed7aa" />
        {/* Thermal vent glow */}
        <rect x="14" y="18.5" width="12" height="2.4" rx="1" fill="#fb923c" />
        <circle cx="13" cy="30.5" r="1.4" fill="#fb923c" />
        <circle cx="27" cy="30.5" r="1.4" fill="#fb923c" />
      </svg>
    );
  }

  if (type === 'freeze') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="fr-ice" x1="12" y1="5" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="50%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        {/* Cryo manifold pedestal */}
        <path d="M8 32L12 27H28L32 32L28 35H12L8 32Z" fill="#0f2338" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="1" />
        {/* Cooling ring collar */}
        <ellipse cx="20" cy="25.5" rx="10.5" ry="3.2" fill="#0c4a6e" stroke="#7dd3fc" strokeWidth="1.1" />
        {/* Three faceted cryo-shards */}
        <polygon points="11,23 14.5,12 18,22" fill="#38bdf8" fillOpacity="0.72" />
        <polygon points="29,23 25.5,12 22,22" fill="#0284c7" fillOpacity="0.82" />
        <polygon points="20,5 25.5,16 20,26 14.5,16" fill="url(#fr-ice)" />
        <polygon points="20,5 25.5,16 20,17.5" fill="#ffffff" fillOpacity="0.55" />
      </svg>
    );
  }

  if (type === 'armor_pen') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="rg-rail" x1="14" y1="5" x2="26" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ddd6fe" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>
        </defs>
        {/* Precision tripod mount */}
        <path d="M8 33L13 26H27L32 33H8Z" fill="#1d1138" stroke="#64748b" strokeWidth="1" />
        <rect x="14" y="21" width="12" height="7" rx="1.5" fill="#334155" />
        {/* Twin electromagnetic accelerator rails */}
        <rect x="14.5" y="5" width="3.6" height="19" rx="1" fill="url(#rg-rail)" />
        <rect x="21.9" y="5" width="3.6" height="19" rx="1" fill="url(#rg-rail)" />
        {/* Accelerator magnetic bridges */}
        <rect x="13" y="9" width="14" height="2.2" rx="0.8" fill="#ede9fe" />
        <rect x="13" y="15" width="14" height="2.2" rx="0.8" fill="#a78bfa" />
        {/* Charged core slug */}
        <rect x="19" y="7" width="2" height="14" rx="1" fill="#f5f3ff" />
      </svg>
    );
  }

  if (type === 'tesla') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id="ts-orb" cx="0.4" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#fdf2f8" />
            <stop offset="55%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#831843" />
          </radialGradient>
        </defs>
        {/* High-voltage insulator base */}
        <path d="M9 33L13 27H27L31 33H9Z" fill="#2a0f1f" stroke="#f472b6" strokeOpacity="0.65" strokeWidth="1" />
        {/* Copper/steel transformer column */}
        <rect x="17.5" y="13" width="5" height="15" rx="1.5" fill="#475569" />
        {/* Stacked induction torus coils */}
        <ellipse cx="20" cy="23.5" rx="8.5" ry="2.2" fill="#500724" stroke="#f9a8d4" strokeWidth="1.2" />
        <ellipse cx="20" cy="18.5" rx="6.8" ry="1.9" fill="#831843" stroke="#fbcfe8" strokeWidth="1.2" />
        {/* Top discharge sphere */}
        <circle cx="20" cy="10.5" r="5" fill="url(#ts-orb)" />
        {/* Crisp discharge arcs */}
        <path d="M12.5 11.5L8 9L10.5 14" stroke="#fbcfe8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27.5 11.5L32 9L29.5 14" stroke="#fbcfe8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Quantum Data Farm
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fm-rack" x1="9" y1="18" x2="31" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f3d33" />
          <stop offset="100%" stopColor="#06201c" />
        </linearGradient>
        <linearGradient id="fm-gold" x1="20" y1="5" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Server vault base */}
      <rect x="7" y="26" width="26" height="8" rx="2" fill="url(#fm-rack)" stroke="#34d399" strokeOpacity="0.55" strokeWidth="1" />
      <rect x="11" y="18" width="18" height="9" rx="1.5" fill="#064e3b" stroke="#6ee7b7" strokeOpacity="0.45" strokeWidth="1" />
      {/* Server rack status bars */}
      <rect x="11" y="29" width="8" height="2" rx="1" fill="#34d399" />
      <rect x="21" y="29" width="8" height="2" rx="1" fill="#fbbf24" />
      <rect x="14" y="21.5" width="12" height="2" rx="1" fill="#6ee7b7" />
      {/* Floating Quantum Gold Ledger Prism */}
      <polygon points="20,5 26.5,11.5 20,17.5 13.5,11.5" fill="url(#fm-gold)" />
      <polygon points="20,5 26.5,11.5 20,12.5" fill="#fef9c3" fillOpacity="0.55" />
    </svg>
  );
}
