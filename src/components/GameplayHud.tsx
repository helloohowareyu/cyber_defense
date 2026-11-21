// Gameplay HUD — Clean perimeter layout keeping >= 85% of Nur's 3D Arena unobstructed.
// Zero backdrop-filter over WebGL, zero pulsing dots, tabular-nums counters, collapsible bottom dock.

import React from 'react';
import {
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  FastForward,
  Pause,
  Play,
  Shield,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MAX_TOWER_LEVEL, TargetingMode, TOWER_ORDER, TOWER_PRESETS, TowerType, WAVE_INFO } from '../game/constants';
import { HudSnapshot } from '../engine/CyberDefenseEngine';
import { TowerSilhouetteIcon } from './GameIcons';

interface GameplayHudProps {
  hud: HudSnapshot;
  muted: boolean;
  dockCollapsed: boolean;
  graphicsLabOpen: boolean;
  onToggleDock: () => void;
  onToggleGraphicsLab: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSetSpeed: (scale: 1 | 2) => void;
  onStartWave: () => void;
  onSelectBuildType: (type: TowerType) => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onSetTargeting: (mode: TargetingMode) => void;
  onDeselectTower: () => void;
}

const TARGETING_LABELS: { mode: TargetingMode; label: string }[] = [
  { mode: 'FRONT_MOST', label: 'Front Most' },
  { mode: 'LOWEST_HP', label: 'Lowest HP' },
  { mode: 'CLOSEST', label: 'Closest' },
];

export const GameplayHud: React.FC<GameplayHudProps> = ({
  hud,
  muted,
  dockCollapsed,
  graphicsLabOpen,
  onToggleDock,
  onToggleGraphicsLab,
  onToggleMute,
  onPause,
  onSetSpeed,
  onStartWave,
  onSelectBuildType,
  onUpgradeTower,
  onSellTower,
  onSetTargeting,
  onDeselectTower,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.coreHp / hud.maxCoreHp) * 100));
  const nextWaveMeta = WAVE_INFO[hud.wave + 1];
  const sel = hud.selectedTower;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
      {/* TOP PERIMETER BAR */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Core HP, Gold, Wave Readouts */}
        <div className="pointer-events-auto cyber-panel rounded-lg px-4 py-2.5 flex items-center gap-5">
          {/* Core HP */}
          <div className="flex items-center gap-2.5">
            <Shield
              className={`w-5 h-5 shrink-0 ${hpPct <= 35 ? 'text-rose-400' : 'text-cyan-400'}`}
              aria-hidden="true"
            />
            <div>
              <div className="text-[11px] text-slate-400 leading-none">Energy Core</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  data-testid="hud-core-hp"
                  className={`font-mono-tabular text-lg font-bold leading-none ${
                    hpPct <= 35 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {hud.coreHp}/{hud.maxCoreHp}
                </span>
                <div className="w-16 h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      hpPct <= 35 ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800" aria-hidden="true" />

          {/* Gold */}
          <div>
            <div className="text-[11px] text-slate-400 leading-none">Gold</div>
            <div
              data-testid="hud-gold"
              className="font-mono-tabular text-lg font-bold text-amber-300 leading-none mt-1"
            >
              {hud.gold}G
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800" aria-hidden="true" />

          {/* Wave */}
          <div>
            <div className="text-[11px] text-slate-400 leading-none">Wave</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span data-testid="hud-wave" className="font-mono-tabular text-lg font-bold text-white leading-none">
                {hud.wave}/{hud.totalWaves}
              </span>
              {hud.waveActive && (
                <span className="font-mono-tabular text-xs text-rose-300 leading-none">
                  {hud.enemiesRemaining} musuh
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right: Wave CTA, Speed Toggle, Utility Icons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {!hud.waveActive && hud.wave < hud.totalWaves && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onStartWave();
              }}
              className="cyber-cut flex items-center gap-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm tracking-wide cursor-pointer whitespace-nowrap transition-transform active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Wave {hud.wave + 1}</span>
            </button>
          )}

          {/* Speed Segmented Control */}
          <div className="cyber-panel rounded-md p-1 flex items-center gap-1" role="group" aria-label="Kecepatan Game">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Kecepatan 1x"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetSpeed(1);
              }}
              className={`px-2.5 py-1.5 rounded text-xs font-mono-tabular font-semibold cursor-pointer transition-colors ${
                hud.timeScale === 1
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              1x
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Kecepatan 2x"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetSpeed(2);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono-tabular font-semibold cursor-pointer transition-colors ${
                hud.timeScale === 2
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>2x</span>
            </button>
          </div>

          {/* Graphics Lab Toggle (CPMK Demo) */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Lab Grafika Komputer"
            title="Lab Grafika Komputer [G]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleGraphicsLab();
            }}
            className={`w-10 h-10 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
              graphicsLabOpen
                ? 'bg-cyan-400 text-slate-950'
                : 'cyber-panel text-cyan-300 hover:border-cyan-400/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Aktifkan suara' : 'Bisukan suara'}
            title="Audio [M]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 cyber-panel hover:border-cyan-400/60 rounded-md flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Jeda permainan"
            title="Jeda [P / Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-10 h-10 cyber-panel hover:border-cyan-400/60 rounded-md flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER-TOP BOSS BAR OR STATUS BANNER (Non-blocking) */}
      <div className="flex flex-col items-center gap-2 mt-2">
        {hud.bossStatus && (
          <div className="cyber-panel-crimson rounded-md px-4 py-2 w-full max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-300 tracking-wide">BOSS · {hud.bossStatus.name}</span>
              <span className="font-mono-tabular text-white">
                {hud.bossStatus.hp} / {hud.bossStatus.maxHp}
              </span>
            </div>
            <div className="mt-1.5 h-2 bg-slate-950 rounded-sm overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, (hud.bossStatus.hp / hud.bossStatus.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hud.bannerMessage && (
          <div className="cyber-panel rounded px-3.5 py-1.5 text-xs text-sky-100 font-medium">
            {hud.bannerMessage}
          </div>
        )}
      </div>

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK */}
      <div className="flex flex-col items-center mt-auto">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleDock();
          }}
          className="pointer-events-auto mb-1.5 px-3 py-1 cyber-panel rounded-t-md text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tampilkan Panel [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {!hud.waveActive && nextWaveMeta
                  ? `Berikutnya: ${nextWaveMeta.title} (${nextWaveMeta.subtitle})`
                  : 'Sembunyikan Panel [H]'}
              </span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto cyber-panel rounded-lg p-2.5 w-full max-w-[900px]">
            {sel ? (
              /* SELECTED TOWER MANAGEMENT BAR (Upgrade / Sell / Targeting Mode) */
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                    <TowerSilhouetteIcon type={sel.type} className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-white text-base">{sel.displayName}</span>
                      <span className="font-mono-tabular text-xs font-semibold text-cyan-300">
                        Lv.{sel.level}/{MAX_TOWER_LEVEL}
                      </span>
                      <span className="text-xs text-slate-500">· {sel.slotName}</span>
                    </div>
                    <div className="text-xs font-mono-tabular text-slate-300 mt-0.5">
                      <span>DMG {sel.damage.toFixed(1)}</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>RNG {sel.rangeGdd}px ({sel.rangeMeters}m)</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>Rate {sel.fireRateSec}s</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>Kill {sel.kills}</span>
                    </div>
                  </div>
                </div>

                {/* Targeting Mode Segmented Selector */}
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-md p-1">
                  {TARGETING_LABELS.map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSetTargeting(mode);
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        sel.targetingMode === mode
                          ? 'bg-cyan-400 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Upgrade, Sell & Close Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={sel.level >= MAX_TOWER_LEVEL || hud.gold < sel.upgradeCost}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onUpgradeTower();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      sel.level >= MAX_TOWER_LEVEL
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : hud.gold >= sel.upgradeCost
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-rose-300/80 border border-rose-500/30 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>
                      {sel.level >= MAX_TOWER_LEVEL ? 'Level Maks' : `Upgrade (${sel.upgradeCost}G)`}
                    </span>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSellTower();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Jual (+{sel.sellRefund}G)</span>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Tutup panel menara"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onDeselectTower();
                    }}
                    className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* 4-TOWER BUILD SELECTION DOCK */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TOWER_ORDER.map((id) => {
                  const preset = TOWER_PRESETS[id];
                  const active = hud.activeBuildType === id;
                  const affordable = hud.gold >= preset.baseCost;
                  return (
                    <button
                      key={id}
                      type="button"
                      tabIndex={-1}
                      data-testid={`build-tower-${id}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectBuildType(id);
                      }}
                      className={`text-left rounded-md px-3 py-2 border transition-colors cursor-pointer flex items-center gap-2.5 ${
                        active
                          ? 'bg-sky-950/95 border-cyan-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 text-slate-200'
                      } ${!affordable ? 'opacity-65' : ''}`}
                    >
                      <TowerSilhouetteIcon type={id} className="w-8 h-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display font-bold text-xs md:text-sm truncate">
                            [{preset.keyHint}] {preset.shortName}
                          </span>
                          <span
                            className={`font-mono-tabular text-xs font-bold shrink-0 ${
                              affordable ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            {preset.baseCost}G
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{preset.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
