// Gameplay HUD — BTD6-inspired Side-Rail Layout:
// - Right Sidebar: Vertical Tower Purchase Shop with clean names (no [1] prefixes) and full descriptions
// - Left Sidebar: Dynamic Highlighted / Selected Tower Inspector (description, stats, targeting, upgrade, ultimate, sell)
//                 OR Locked Overclock Node Purchase Card (120G)
// - Top Perimeter: Compact resource counters & wave/speed/audio controls
// - Bottom Center: Compact Lv.4 Ultimate Hotbar (only rendered when >=1 Apex tower exists)

import React, { useState } from 'react';
import {
  ArrowUpCircle,
  ChevronLeft,
  Cpu,
  FastForward,
  Lock,
  Music,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Store,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  DIFFICULTY_PRESETS,
  getWaveDefinition,
  MAX_TOWER_LEVEL,
  TargetingMode,
  TOWER_ORDER,
  TOWER_PRESETS,
  TowerType,
} from '../game/constants';
import { getDifficultyTowerCost, getScaledRangeMeters } from '../game/combatMath';
import { HudSnapshot } from '../engine/CyberDefenseEngine';
import { TowerSilhouetteIcon } from './GameIcons';

interface GameplayHudProps {
  hud: HudSnapshot;
  muted: boolean;
  musicMuted: boolean;
  shopCollapsed: boolean;
  graphicsLabOpen: boolean;
  onToggleShop: () => void;
  onToggleGraphicsLab: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleAutoWave: () => void;
  onPause: () => void;
  onSetSpeed: (scale: 1 | 2 | 3) => void;
  onStartWave: () => void;
  onSelectBuildType: (type: TowerType | null) => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onSetTargeting: (mode: TargetingMode) => void;
  onTriggerUltimate: (towerId: number) => void;
  onUnlockOverclockPad: (padId: number) => void;
  onCloseLockedPad: () => void;
  onDeselectTower: () => void;
}

const TARGETING_LABELS: { mode: TargetingMode; label: string }[] = [
  { mode: 'FIRST', label: 'First' },
  { mode: 'STRONG', label: 'Strong' },
  { mode: 'LAST', label: 'Last' },
  { mode: 'CLOSE', label: 'Close' },
];

export const GameplayHud: React.FC<GameplayHudProps> = ({
  hud,
  muted,
  musicMuted,
  shopCollapsed,
  graphicsLabOpen,
  onToggleShop,
  onToggleGraphicsLab,
  onToggleMute,
  onToggleMusic,
  onToggleAutoWave,
  onPause,
  onSetSpeed,
  onStartWave,
  onSelectBuildType,
  onUpgradeTower,
  onSellTower,
  onSetTargeting,
  onTriggerUltimate,
  onUnlockOverclockPad,
  onCloseLockedPad,
  onDeselectTower,
}) => {
  const [hoveredShopId, setHoveredShopId] = useState<TowerType | null>(null);

  const hpPct = Math.max(0, Math.min(100, (hud.coreHp / hud.maxCoreHp) * 100));
  const nextWaveMeta = getWaveDefinition(hud.wave + 1);
  const sel = hud.selectedTower;
  const lockedPad = hud.selectedLockedPad;
  const isNextFinalStage = nextWaveMeta?.isFinalStage ?? false;

  // Shop preview shows either the active selected build tower or the currently hovered shop item
  const focusedShopType = hud.activeBuildType ?? hoveredShopId;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* =====================================================================
          TOP PERIMETER BAR
         ===================================================================== */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-3">
        {/* Top-Left: Compact Core HP, Gold, Wave & Stage Strip */}
        <div className="pointer-events-auto cyber-panel rounded-xl px-4 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Shield
              className={`w-4 h-4 shrink-0 ${hpPct <= 35 ? 'text-rose-400' : 'text-sky-400'}`}
              aria-hidden="true"
            />
            <div>
              <div className="text-[10px] text-slate-400 leading-none">Energy Core</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  data-testid="hud-core-hp"
                  className={`font-mono-tabular text-base font-bold leading-none ${
                    hpPct <= 35 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {hud.coreHp}/{hud.maxCoreHp}
                </span>
                <div className="w-14 h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      hpPct <= 35 ? 'bg-rose-500' : 'bg-sky-400'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div>
            <div className="text-[10px] text-slate-400 leading-none">Gold</div>
            <div
              data-testid="hud-gold"
              className="font-mono-tabular text-base font-bold text-amber-300 leading-none mt-1"
            >
              {hud.gold}G
            </div>
          </div>

          <div className="h-7 w-px bg-white/10" aria-hidden="true" />

          <div>
            <div className="flex items-center gap-2 text-[10px] leading-none font-medium">
              <span className={hud.wave === hud.totalWaves ? 'text-rose-300' : 'text-slate-400'}>
                {hud.stageLabel}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span
                data-testid="hud-difficulty"
                className={
                  hud.difficulty === 'easy'
                    ? 'text-emerald-300'
                    : hud.difficulty === 'hard'
                    ? 'text-rose-300'
                    : 'text-sky-300'
                }
              >
                {DIFFICULTY_PRESETS[hud.difficulty].label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span data-testid="hud-wave" className="font-mono-tabular text-base font-bold text-white leading-none">
                Wave {hud.wave}/{hud.totalWaves}
              </span>
              {hud.waveActive && (
                <span className="font-mono-tabular text-xs text-rose-300 leading-none">
                  {hud.enemiesRemaining} aktif
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right: Wave CTA, Auto-Wave, Speed, Lab Grafika, Music, SFX, Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {!hud.waveActive && hud.wave < hud.totalWaves && (
            <button
              type="button"
              tabIndex={-1}
              data-testid="start-wave-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartWave();
              }}
              className={`rounded-xl flex items-center gap-2 px-4 py-2.5 font-display font-bold text-xs md:text-sm tracking-wide cursor-pointer whitespace-nowrap transition-transform active:scale-[0.98] ${
                isNextFinalStage
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isNextFinalStage ? 'Final Stage (W15)' : `Mulai Wave ${hud.wave + 1}`}</span>
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            aria-label="Auto-Start Wave"
            title="Auto-Start Wave Berikutnya"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoWave();
            }}
            className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
              hud.autoStartWave
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'cyber-panel text-slate-300 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          <div className="cyber-panel rounded-lg p-1 flex items-center gap-0.5" role="group" aria-label="Kecepatan Game">
            {([1, 2, 3] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                tabIndex={-1}
                aria-label={`Kecepatan ${spd}x`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSetSpeed(spd);
                }}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-mono-tabular font-semibold cursor-pointer transition-colors ${
                  hud.timeScale === spd
                    ? spd === 1
                      ? 'bg-sky-400 text-slate-950'
                      : spd === 2
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-rose-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {spd === 3 && <FastForward className="w-3 h-3" />}
                <span>{spd}x</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Lab Grafika Komputer"
            title="Lab Grafika Komputer (G)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleGraphicsLab();
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              graphicsLabOpen ? 'bg-sky-400 text-slate-950' : 'cyber-panel text-sky-300 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar'}
            title="Musik Latar (N)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMusic();
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              musicMuted ? 'cyber-panel text-slate-500 hover:text-slate-300' : 'cyber-panel text-sky-300 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Aktifkan efek suara' : 'Bisukan efek suara'}
            title="Efek Suara (M)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 cyber-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-white cursor-pointer transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Jeda permainan"
            title="Jeda (P)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 cyber-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-white cursor-pointer transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          CENTER-TOP BOSS BAR & NON-BLOCKING TACTICAL BANNER
         ===================================================================== */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-md px-4">
        {hud.bossStatus && (
          <div
            className={`rounded-xl px-4 py-2.5 w-full ${
              hud.bossStatus.isFinalBoss ? 'cyber-panel-crimson' : 'cyber-panel'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={hud.bossStatus.isFinalBoss ? 'text-rose-300' : 'text-amber-300'}>
                {hud.bossStatus.isFinalBoss ? 'Final Boss' : 'Mid-Boss'} · {hud.bossStatus.name}
              </span>
              <span className="font-mono-tabular text-white">
                {hud.bossStatus.hp.toLocaleString()} / {hud.bossStatus.maxHp.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-2 bg-slate-950 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.bossStatus.isFinalBoss ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.max(0, (hud.bossStatus.hp / hud.bossStatus.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hud.bannerMessage && (
          <div className="cyber-panel rounded-lg px-3.5 py-1.5 text-xs text-slate-100 text-center">
            {hud.bannerMessage}
          </div>
        )}
      </div>

      {/* =====================================================================
          LEFT SIDEBAR — HIGHLIGHTED / SELECTED TOWER INSPECTOR OR LOCKED OVERCLOCK NODE
         ===================================================================== */}
      {(sel || lockedPad) && (
        <aside
          data-testid="left-inspector-panel"
          aria-label="Inspektor Menara"
          className="pointer-events-auto absolute top-20 left-3.5 w-[280px] cyber-panel rounded-2xl p-4 flex flex-col gap-3.5"
        >
          {sel ? (
            <>
              {/* Header with sculpted unit emblem, clean name, and close button */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center shrink-0">
                    <TowerSilhouetteIcon type={sel.type} className="w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-base text-white leading-tight truncate">
                      {sel.displayName}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {sel.tierName} · Lv.{sel.level}/{MAX_TOWER_LEVEL}
                    </div>
                  </div>
                </div>
                {sel.isPinned && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Tutup inspektor menara"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onDeselectTower();
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Clean 4-segment level progress bar + Overclock indicator */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-colors ${
                        step <= sel.level
                          ? sel.level === MAX_TOWER_LEVEL
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{sel.locationLabel}</span>
                  {sel.overclocked && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                      <Zap className="w-3 h-3" />
                      Overclock Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Tower Description */}
              <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                {sel.description}
              </p>

              {/* Key Stats Grid */}
              {sel.type === 'farm' ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Hasil Siklus</div>
                    <div className="font-mono-tabular font-semibold text-emerald-300 mt-0.5">
                      +{sel.farmPacketGold}G / {sel.fireRateSec}s
                    </div>
                  </div>
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Dividen Wave</div>
                    <div className="font-mono-tabular font-semibold text-emerald-300 mt-0.5">
                      +{sel.farmWaveDividend}G
                    </div>
                  </div>
                  <div className="col-span-2 cyber-surface-soft rounded-lg px-2.5 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Total Gold Ditambang</span>
                    <span className="font-mono-tabular font-semibold text-amber-300">{sel.goldEarned}G</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Damage</div>
                    <div className="font-mono-tabular font-semibold text-white mt-0.5">{sel.damage.toFixed(1)}</div>
                  </div>
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Jangkauan</div>
                    <div className="font-mono-tabular font-semibold text-white mt-0.5">{sel.rangeMeters}m</div>
                  </div>
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Interval Tembak</div>
                    <div className="font-mono-tabular font-semibold text-white mt-0.5">{sel.fireRateSec}s</div>
                  </div>
                  <div className="cyber-surface-soft rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">
                      {sel.chainCount > 0 ? 'Rantai / Kill' : 'Malware Dibasmi'}
                    </div>
                    <div className="font-mono-tabular font-semibold text-white mt-0.5">
                      {sel.chainCount > 0 ? `${sel.chainCount}x · ${sel.kills}` : sel.kills}
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Actions (pinned mode) vs Hover Hint */}
              {sel.isPinned ? (
                <div className="space-y-2.5 border-t border-white/10 pt-3">
                  {/* BTD6 4-Mode Targeting */}
                  {sel.type !== 'farm' && (
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1.5">Prioritas Target</div>
                      <div className="grid grid-cols-4 gap-1 bg-slate-950/70 p-1 rounded-lg border border-white/10">
                        {TARGETING_LABELS.map(({ mode, label }) => (
                          <button
                            key={mode}
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onSetTargeting(mode);
                            }}
                            className={`py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                              sel.targetingMode === mode
                                ? 'bg-sky-400 text-slate-950 font-semibold'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upgrade or Lv.4 Ultimate Action */}
                  {sel.ultimate ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={!sel.ultimate.ready}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onTriggerUltimate(sel.id);
                      }}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                        sel.ultimate.ready
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {sel.ultimate.ready
                          ? `Ultimate: ${sel.ultimate.abilityName}`
                          : `Cooldown ${sel.ultimate.cooldownRemaining.toFixed(1)}s`}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={hud.gold < sel.upgradeCost}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onUpgradeTower();
                      }}
                      className={`w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                        hud.gold >= sel.upgradeCost
                          ? sel.level === MAX_TOWER_LEVEL - 1
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-900 text-rose-300/80 border border-rose-500/25 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <ArrowUpCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {sel.level === MAX_TOWER_LEVEL - 1
                            ? `Apex + Ultimate`
                            : `Upgrade: ${sel.nextTierName}`}
                        </span>
                      </span>
                      <span className="font-mono-tabular font-bold shrink-0">{sel.upgradeCost}G</span>
                    </button>
                  )}

                  {/* Sell Button */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSellTower();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-200 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Jual Menara (+{sel.sellRefund}G)</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 border-t border-white/10 pt-2.5">
                  Klik menara ini untuk mengatur target, upgrade, atau menjual.
                </div>
              )}
            </>
          ) : lockedPad ? (
            /* LOCKED OVERCLOCK NODE PURCHASE CARD */
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-white leading-tight">
                      {lockedPad.name}
                    </h2>
                    <div className="text-xs text-amber-300/90 mt-0.5">Node Overclock Terkunci</div>
                  </div>
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Tutup panel overclock"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCloseLockedPad();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                Buka kunci pad ini untuk mengalirkan daya Overclock ke menara yang ditempatkan di atasnya:
                memberikan bonus <strong className="text-white">+12% Jangkauan</strong> dan{' '}
                <strong className="text-white">+12% Kecepatan Tembak</strong> (atau +12% hasil Data Farm).
              </p>

              <button
                type="button"
                tabIndex={-1}
                data-testid="unlock-overclock-btn"
                disabled={!lockedPad.canAfford}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onUnlockOverclockPad(lockedPad.padId);
                }}
                className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-bold transition-colors ${
                  lockedPad.canAfford
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                    : 'bg-slate-900 text-rose-300/80 border border-rose-500/25 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Unlock className="w-4 h-4" />
                  <span>Aktifkan Overclock</span>
                </span>
                <span className="font-mono-tabular">{lockedPad.unlockCost}G</span>
              </button>
            </>
          ) : null}
        </aside>
      )}

      {/* =====================================================================
          RIGHT SIDEBAR — CLOSABLE TOWER PURCHASE SHOP WITH FULL DESCRIPTIONS
         ===================================================================== */}
      {shopCollapsed ? (
        <div className="absolute top-20 right-3.5 pointer-events-none">
          <button
            type="button"
            tabIndex={-1}
            data-testid="open-shop-btn"
            aria-label="Buka toko menara"
            title="Buka Toko Menara (H)"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleShop();
            }}
            className="pointer-events-auto cyber-panel hover:border-sky-400/50 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-slate-100 hover:text-white cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-sky-400" />
            <Store className="w-4 h-4 text-sky-300" />
            <span className="font-display font-bold text-xs tracking-wide">Toko Menara</span>
          </button>
        </div>
      ) : (
        <div className="absolute top-16 bottom-3.5 right-3.5 flex items-center pointer-events-none">
          <aside
            data-testid="right-tower-shop"
            aria-label="Pembelian Menara"
            className="pointer-events-auto w-[280px] max-h-full cyber-panel rounded-2xl p-3 flex flex-col overflow-hidden"
          >
            {/* Shop Header with clear Close (X) Button */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-sm text-white leading-none">Toko Menara</h2>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {hud.activeBuildType
                    ? `Menempatkan ${TOWER_PRESETS[hud.activeBuildType].displayName}`
                    : !hud.waveActive && nextWaveMeta
                    ? nextWaveMeta.title
                    : 'Pilih menara lalu klik area dek'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {hud.activeBuildType && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectBuildType(null);
                    }}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="close-shop-btn"
                  aria-label="Tutup toko menara"
                  title="Tutup Toko Menara (H)"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleShop();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vertical Scrollable 6-Tower Shop List (with inline description per tower!) */}
            <div className="mt-2 flex-1 overflow-y-auto shop-scroll space-y-1.5 pr-0.5">
              {TOWER_ORDER.map((id) => {
                const preset = TOWER_PRESETS[id];
                const towerCost = getDifficultyTowerCost(preset.baseCost, hud.difficulty);
                const active = hud.activeBuildType === id;
                const focused = focusedShopType === id;
                const affordable = hud.gold >= towerCost;
                const rangeM = getScaledRangeMeters(preset.baseRangeGdd, 1, false).toFixed(1);

                return (
                  <button
                    key={id}
                    type="button"
                    tabIndex={-1}
                    data-testid={`build-tower-${id}`}
                    onMouseEnter={() => setHoveredShopId(id)}
                    onMouseLeave={() => setHoveredShopId((curr) => (curr === id ? null : curr))}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectBuildType(active ? null : id);
                    }}
                    className={`w-full text-left rounded-xl p-2 border transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-sky-500/15 border-sky-400/70'
                        : 'bg-slate-900/65 border-white/[0.07] hover:bg-slate-800/75 hover:border-white/20'
                    } ${!affordable ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-950/75 border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                        <TowerSilhouetteIcon type={id} className="w-8 h-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-[12.5px] text-white truncate">
                            {preset.displayName}
                          </span>
                          <span
                            className={`font-mono-tabular text-xs font-bold shrink-0 ${
                              affordable ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            {towerCost}G
                          </span>
                        </div>
                        <div className="text-[10px] text-sky-300/85 mt-0.5">{preset.role}</div>
                        <p className="text-[10.5px] text-slate-300/90 leading-[1.32] mt-0.5">
                          {preset.description}
                        </p>

                        {/* Compact tactical stats on focus/active */}
                        {focused && (
                          <div className="mt-1.5 pt-1 border-t border-white/10 text-[10px] font-mono-tabular text-slate-400 flex items-center justify-between">
                            {id === 'farm' ? (
                              <>
                                <span>+{preset.incomePerCycle}G / {preset.incomeCycleSec}s</span>
                                <span>Dividen +{preset.waveDividend}G</span>
                              </>
                            ) : (
                              <>
                                <span>DMG {preset.baseDamage}</span>
                                <span>RNG {rangeM}m</span>
                                <span>{preset.fireRateSec}s</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quiet footer tip about purchasable Overclock Pads */}
            <div className="mt-2 pt-2 border-t border-white/10 text-[10.5px] text-slate-400 flex items-center justify-between shrink-0">
              <span>Node Overclock Aktif</span>
              <span className="font-mono-tabular text-amber-300/90">
                {hud.unlockedOverclockCount}/9 · {hud.overclockUnlockCost}G
              </span>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          BOTTOM CENTER — LV.4 APEX ULTIMATE HOTBAR (ONLY WHEN >= 1 LV.4 TOWER EXISTS)
         ===================================================================== */}
      {hud.abilities.length > 0 && (
        <div className="pointer-events-auto absolute bottom-3.5 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {hud.abilities.map((ab) => {
            const cdPct = ab.cooldownTotal > 0 ? Math.min(100, (ab.cooldownRemaining / ab.cooldownTotal) * 100) : 0;
            return (
              <button
                key={ab.towerId}
                type="button"
                tabIndex={-1}
                disabled={!ab.ready}
                title={`${ab.abilityName} (${ab.hotkey}) — ${ab.description}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerUltimate(ab.towerId);
                }}
                className={`relative overflow-hidden rounded-xl px-3.5 py-2 border text-left flex items-center gap-2 transition-transform ${
                  ab.ready
                    ? 'cyber-panel border-amber-400/70 text-white hover:bg-amber-950/60 cursor-pointer active:scale-[0.97]'
                    : 'cyber-panel border-white/10 text-slate-400 cursor-not-allowed'
                }`}
              >
                {!ab.ready && (
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-800/70 pointer-events-none"
                    style={{ width: `${cdPct}%` }}
                  />
                )}
                <Sparkles
                  className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                    ab.ready ? 'text-amber-300' : 'text-slate-500'
                  }`}
                />
                <div className="relative z-10 leading-tight">
                  <div className="text-xs font-display font-bold flex items-center gap-1.5">
                    <span>{ab.abilityName}</span>
                    <span className="font-mono-tabular text-[10px] text-amber-300/90">({ab.hotkey})</span>
                  </div>
                  <div className="text-[10px] font-mono-tabular mt-0.5">
                    {ab.activeRemaining > 0 ? (
                      <span className="text-sky-300">Aktif {ab.activeRemaining.toFixed(1)}s</span>
                    ) : ab.ready ? (
                      <span className="text-emerald-300">Siap Dipicu</span>
                    ) : (
                      <span className="text-slate-400">CD {ab.cooldownRemaining.toFixed(1)}s</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
