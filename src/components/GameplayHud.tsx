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
import { Led, Seg, SegmentBar } from './Hardware';

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
        {/* Kiri atas: panel readout Core, Gold, dan Wave */}
        <div className="pointer-events-auto plate rounded-[4px] p-1.5 flex items-stretch gap-1.5">
          <div className="recess rounded-[3px] px-3 py-1.5 min-w-[132px]">
            <div className="flex items-center justify-between gap-3">
              <span className="silk">Energy core</span>
              <Led tone={hpPct <= 35 ? 'fault' : 'ok'} blink={hpPct <= 35} />
            </div>
            <div data-testid="hud-core-hp" className="mt-1 flex items-baseline gap-1">
              <Seg value={hud.coreHp} digits={3} tone={hpPct <= 35 ? 'fault' : 'ok'} className="text-[20px]" />
              <span className="text-[11px] text-silk-dim font-semibold">/{hud.maxCoreHp}</span>
            </div>
            <SegmentBar
              pct={hpPct}
              cells={14}
              color={hpPct <= 35 ? '#ff4b3e' : '#5be37d'}
              glow={hpPct <= 35 ? 'rgba(255,75,62,0.7)' : 'rgba(91,227,125,0.55)'}
              className="h-[5px] mt-1.5"
            />
          </div>

          <div className="recess rounded-[3px] px-3 py-1.5">
            <span className="silk">Gold</span>
            <div data-testid="hud-gold" className="mt-1">
              <Seg value={hud.gold} digits={5} className="text-[20px]" />
            </div>
          </div>

          <div className="recess rounded-[3px] px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="silk">Wave</span>
              <span className="silk inline-flex items-center gap-1" data-testid="hud-difficulty">
                <Led
                  tone={hud.difficulty === 'easy' ? 'ok' : hud.difficulty === 'hard' ? 'fault' : 'amber'}
                />
                {DIFFICULTY_PRESETS[hud.difficulty].label}
              </span>
            </div>
            <div data-testid="hud-wave" className="mt-1 flex items-baseline gap-1">
              <Seg value={String(hud.wave).padStart(2, '0')} digits={2} className="text-[20px]" />
              <span className="text-[11px] text-silk-dim font-semibold">dari {hud.totalWaves}</span>
            </div>
          </div>

          <div className="hidden xl:flex flex-col justify-center px-2.5 max-w-[190px]">
            <span className={`text-[12px] font-semibold leading-tight ${hud.wave === hud.totalWaves ? 'text-fault' : 'text-silk'}`}>
              {hud.stageLabel}
            </span>
            <span className="silk mt-1">
              {hud.waveActive ? `${hud.enemiesRemaining} malware masih di jalur` : 'Jalur bersih'}
            </span>
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
              className={`key h-10 flex items-center gap-2 px-4 font-extrabold text-[13px] whitespace-nowrap ${
                isNextFinalStage ? 'key-danger' : 'key-go'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isNextFinalStage ? `Mulai final stage` : `Mulai wave ${hud.wave + 1}`}</span>
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
            className={`key h-10 px-2.5 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
              hud.autoStartWave ? 'key-on' : ''
            }`}
          >
            <Led tone={hud.autoStartWave ? 'ok' : 'off'} />
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          <div className="plate rounded-[4px] p-1 flex items-center gap-1 h-10" role="group" aria-label="Kecepatan Game">
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
                className={`key h-full flex items-center gap-0.5 px-2 text-xs font-bold ${
                  hud.timeScale === spd ? 'key-on' : ''
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
            className={`key w-10 h-10 flex items-center justify-center ${graphicsLabOpen ? 'key-on' : ''}`}
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
            className={`key w-10 h-10 flex items-center justify-center ${musicMuted ? 'text-silk-dim' : ''}`}
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
            className="key w-10 h-10 flex items-center justify-center"
          >
            {muted ? <VolumeX className="w-4 h-4 text-fault" /> : <Volume2 className="w-4 h-4" />}
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
            className="key w-10 h-10 flex items-center justify-center"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          CENTER-TOP BOSS BAR & NON-BLOCKING TACTICAL BANNER
         ===================================================================== */}
      <div className="absolute top-[86px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-md px-4">
        {hud.bossStatus && (
          <div
            className={`rounded-[4px] px-3 py-2 w-full ${
              hud.bossStatus.isFinalBoss ? 'cyber-panel-crimson' : 'plate'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12.5px] font-bold">
                <Led tone="fault" blink />
                <span className="silk">{hud.bossStatus.isFinalBoss ? 'Final boss' : 'Mid-boss'}</span>
                <span>{hud.bossStatus.name}</span>
              </span>
              <Seg value={hud.bossStatus.hp} digits={5} tone="fault" className="text-[14px]" />
            </div>
            <div className="recess rounded-[2px] mt-1.5 p-[3px]">
              <SegmentBar
                pct={(hud.bossStatus.hp / hud.bossStatus.maxHp) * 100}
                cells={30}
                color={hud.bossStatus.isFinalBoss ? '#ff4b3e' : '#ffb23f'}
                glow={hud.bossStatus.isFinalBoss ? 'rgba(255,75,62,0.7)' : 'rgba(255,178,63,0.6)'}
                className="h-[7px]"
              />
            </div>
          </div>
        )}

        {hud.bannerMessage && (
          <div className="plate rounded-[3px] px-3.5 py-1.5 text-[12.5px] font-medium text-silk text-center flex items-center gap-2">
            <Led tone="amber" />
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
          className="pointer-events-auto absolute top-[112px] left-3.5 w-[284px] plate rounded-[4px] p-4 flex flex-col gap-3.5"
        >
          {sel ? (
            <>
              {/* Header with sculpted unit emblem, clean name, and close button */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 recess rounded-[3px] flex items-center justify-center shrink-0">
                    <TowerSilhouetteIcon type={sel.type} className="w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-base text-silk leading-tight truncate">
                      {sel.displayName}
                    </h2>
                    <div className="text-xs text-silk-dim mt-0.5 truncate">
                      {sel.tierName}, level {sel.level} dari {MAX_TOWER_LEVEL}
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
                    className="p-1.5 rounded-[3px] text-silk-dim hover:text-silk hover:bg-white/10 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Clean 4-segment level progress bar + Overclock indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <Led
                      key={step}
                      tone={step <= sel.level ? (sel.level === MAX_TOWER_LEVEL ? 'amber' : 'ok') : 'off'}
                    />
                  ))}
                  <span className="silk ml-1">{sel.level === MAX_TOWER_LEVEL ? 'Apex, ultimate aktif' : 'Tingkat upgrade'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-silk-dim">
                  <span>{sel.locationLabel}</span>
                  {sel.overclocked && (
                    <span className="inline-flex items-center gap-1 text-led font-medium">
                      <Zap className="w-3 h-3" />
                      Overclock Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Tower Description */}
              <p className="text-xs text-silk leading-relaxed border-t border-black/40 pt-3">
                {sel.description}
              </p>

              {/* Key Stats Grid */}
              {sel.type === 'farm' ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">Hasil Siklus</div>
                    <div className="font-mono-tabular font-semibold text-ok mt-0.5">
                      +{sel.farmPacketGold}G / {sel.fireRateSec}s
                    </div>
                  </div>
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">Dividen Wave</div>
                    <div className="font-mono-tabular font-semibold text-ok mt-0.5">
                      +{sel.farmWaveDividend}G
                    </div>
                  </div>
                  <div className="col-span-2 cyber-surface-soft rounded-[3px] px-2.5 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-silk-dim">Total Gold Ditambang</span>
                    <span className="font-mono-tabular font-semibold text-led">{sel.goldEarned}G</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">Damage</div>
                    <div className="font-mono-tabular font-semibold text-silk mt-0.5">{sel.damage.toFixed(1)}</div>
                  </div>
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">Jangkauan</div>
                    <div className="font-mono-tabular font-semibold text-silk mt-0.5">{sel.rangeMeters}m</div>
                  </div>
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">Interval Tembak</div>
                    <div className="font-mono-tabular font-semibold text-silk mt-0.5">{sel.fireRateSec}s</div>
                  </div>
                  <div className="cyber-surface-soft rounded-[3px] px-2.5 py-2">
                    <div className="text-[10px] text-silk-dim">
                      {sel.chainCount > 0 ? 'Rantai / Kill' : 'Malware Dibasmi'}
                    </div>
                    <div className="font-mono-tabular font-semibold text-silk mt-0.5">
                      {sel.chainCount > 0 ? `${sel.chainCount}x · ${sel.kills}` : sel.kills}
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Actions (pinned mode) vs Hover Hint */}
              {sel.isPinned ? (
                <div className="space-y-2.5 border-t border-black/40 pt-3">
                  {/* BTD6 4-Mode Targeting */}
                  {sel.type !== 'farm' && (
                    <div>
                      <div className="text-[11px] text-silk-dim mb-1.5">Prioritas Target</div>
                      <div className="grid grid-cols-4 gap-1">
                        {TARGETING_LABELS.map(({ mode, label }) => (
                          <button
                            key={mode}
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onSetTargeting(mode);
                            }}
                            className={`key py-1.5 text-[11.5px] font-semibold ${sel.targetingMode === mode ? 'key-on' : ''}`}
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
                      className={`key w-full flex items-center justify-center gap-2 py-2.5 px-3 text-[12.5px] font-bold ${
                        sel.ultimate.ready ? 'key-lit' : ''
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
                      className={`key w-full flex items-center justify-between gap-2 py-2.5 px-3.5 text-[12.5px] font-bold ${
                        hud.gold >= sel.upgradeCost ? (sel.level === MAX_TOWER_LEVEL - 1 ? 'key-lit' : 'key-go') : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <ArrowUpCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {sel.level === MAX_TOWER_LEVEL - 1
                            ? `Upgrade ke Apex`
                            : `Upgrade ke ${sel.nextTierName}`}
                        </span>
                      </span>
                      <span className={`font-mono-tabular font-extrabold shrink-0 ${hud.gold >= sel.upgradeCost ? '' : 'text-fault'}`}>{sel.upgradeCost}G</span>
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
                    className="key key-quiet-danger w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Jual menara, kembali {sel.sellRefund}G</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-silk-dim border-t border-black/40 pt-2.5">
                  Klik menara ini untuk mengatur target, upgrade, atau menjual.
                </div>
              )}
            </>
          ) : lockedPad ? (
            /* LOCKED OVERCLOCK NODE PURCHASE CARD */
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 recess rounded-[3px] flex items-center justify-center text-led shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-silk leading-tight">
                      {lockedPad.name}
                    </h2>
                    <div className="text-xs text-led/90 mt-0.5">Node Overclock Terkunci</div>
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
                  className="p-1.5 rounded-[3px] text-silk-dim hover:text-silk hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-silk leading-relaxed border-t border-black/40 pt-3">
                Buka kunci pad ini untuk mengalirkan daya Overclock ke menara yang ditempatkan di atasnya:
                memberikan bonus <strong className="text-silk">+12% Jangkauan</strong> dan{' '}
                <strong className="text-silk">+12% Kecepatan Tembak</strong> (atau +12% hasil Data Farm).
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
                className={`key w-full flex items-center justify-between py-2.5 px-3.5 text-[12.5px] font-bold ${
                  lockedPad.canAfford ? 'key-lit' : ''
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Unlock className="w-4 h-4" />
                  <span>Aktifkan Overclock</span>
                </span>
                <span className={`font-mono-tabular font-extrabold ${lockedPad.canAfford ? '' : 'text-fault'}`}>{lockedPad.unlockCost}G</span>
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
            className="pointer-events-auto key px-3.5 py-2.5 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4 text-led" />
            <Store className="w-4 h-4 text-led" />
            <span className="font-bold text-[12.5px]">Toko menara</span>
          </button>
        </div>
      ) : (
        <div className="absolute top-[72px] bottom-3.5 right-3.5 flex items-center pointer-events-none">
          <aside
            data-testid="right-tower-shop"
            aria-label="Pembelian Menara"
            className="pointer-events-auto w-[284px] max-h-full plate rounded-[4px] p-3 flex flex-col overflow-hidden"
          >
            {/* Shop Header with clear Close (X) Button */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-black/40 shrink-0">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-[15px] text-silk leading-none">Toko menara</h2>
                <p className="text-[11px] text-silk-dim mt-1 truncate">
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
                    className="key text-[11px] font-semibold px-2 py-1"
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
                  className="p-1 rounded-[3px] text-silk-dim hover:text-silk hover:bg-white/10 cursor-pointer transition-colors"
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
                    className={`group w-full text-left rounded-[3px] p-2 border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#2e2a22] border-led/60 shadow-[inset_0_0_14px_rgba(255,178,63,0.12)]'
                        : 'recess hover:bg-[#181b1f]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative w-10 h-10 shrink-0 mt-0.5 flex items-center justify-center">
                        <TowerSilhouetteIcon type={id} className={`w-9 h-9 ${affordable ? '' : 'opacity-45 grayscale'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Led tone={active ? 'amber' : affordable ? 'ok' : 'dim-fault'} />
                            <span className={`font-bold text-[13px] truncate ${affordable ? 'text-silk' : 'text-silk-dim'}`}>
                              {preset.displayName}
                            </span>
                          </span>
                          <Seg
                            value={towerCost}
                            digits={3}
                            tone={affordable ? 'amber' : 'fault'}
                            className="text-[12px] shrink-0"
                          />
                        </div>
                        <div className="text-[11px] text-led/85 font-semibold mt-0.5">{preset.role}</div>
                        <p className="text-[11px] text-silk-dim leading-[1.35] mt-0.5">
                          {preset.description}
                        </p>

                        {/* Compact tactical stats on focus/active */}
                        {focused && (
                          <div className="mt-1.5 pt-1 border-t border-white/5 text-[10.5px] font-mono-tabular text-silk flex items-center justify-between">
                            {id === 'farm' ? (
                              <>
                                <span>+{preset.incomePerCycle}G / {preset.incomeCycleSec}s</span>
                                <span>Dividen +{preset.waveDividend}G</span>
                              </>
                            ) : (
                              <>
                                <span><span className="text-silk-dim">Damage</span> {preset.baseDamage}</span>
                                <span><span className="text-silk-dim">Jarak</span> {rangeM}m</span>
                                <span><span className="text-silk-dim">Jeda</span> {preset.fireRateSec}s</span>
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
            <div className="mt-2 pt-2 border-t border-black/40 text-[10.5px] text-silk-dim flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1" aria-label={`${hud.unlockedOverclockCount} dari 9 pad overclock aktif`}>
                {Array.from({ length: 9 }, (_, i) => (
                  <Led key={i} tone={i < hud.unlockedOverclockCount ? 'amber' : 'off'} />
                ))}
              </span>
              <span>Overclock {hud.overclockUnlockCost}G per pad</span>
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
                className={`key relative overflow-hidden px-3.5 py-2 text-left flex items-center gap-2 ${ab.ready ? 'key-on' : ''}`}
              >
                {!ab.ready && (
                  <div
                    className="absolute inset-y-0 left-0 bg-black/35 pointer-events-none"
                    style={{ width: `${cdPct}%` }}
                  />
                )}
                <Sparkles
                  className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                    ab.ready ? 'text-led' : 'text-silk-dim/70'
                  }`}
                />
                <div className="relative z-10 leading-tight">
                  <div className="text-xs font-display font-bold flex items-center gap-1.5">
                    <span>{ab.abilityName}</span>
                    <span className="font-mono-tabular text-[10px] text-led/90">({ab.hotkey})</span>
                  </div>
                  <div className="text-[10px] font-mono-tabular mt-0.5">
                    {ab.activeRemaining > 0 ? (
                      <span className="text-led">Aktif {ab.activeRemaining.toFixed(1)}s</span>
                    ) : ab.ready ? (
                      <span className="text-ok">Siap dipakai</span>
                    ) : (
                      <span className="text-silk-dim">CD {ab.cooldownRemaining.toFixed(1)}s</span>
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
