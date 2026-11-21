// Gameplay HUD — Clean BTD6-inspired perimeter layout keeping the 3D Cyber Arena unobstructed.
// Zero backdrop-filter over WebGL, zero pulsing dots, tabular-nums counters, 6-tower dock, Lv.4 Ultimate hotbar.

import React from 'react';
import {
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  FastForward,
  Music,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  getWaveDefinition,
  MAX_TOWER_LEVEL,
  TargetingMode,
  TOWER_ORDER,
  TOWER_PRESETS,
  TowerType,
} from '../game/constants';
import { HudSnapshot } from '../engine/CyberDefenseEngine';
import { TowerSilhouetteIcon } from './GameIcons';

interface GameplayHudProps {
  hud: HudSnapshot;
  muted: boolean;
  musicMuted: boolean;
  dockCollapsed: boolean;
  graphicsLabOpen: boolean;
  onToggleDock: () => void;
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
  dockCollapsed,
  graphicsLabOpen,
  onToggleDock,
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
  onDeselectTower,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.coreHp / hud.maxCoreHp) * 100));
  const nextWaveMeta = getWaveDefinition(hud.wave + 1);
  const sel = hud.selectedTower;
  const isNextFinalStage = nextWaveMeta?.isFinalStage ?? false;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* TOP PERIMETER BAR */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Core HP, Gold, Wave & Stage Readouts */}
        <div className="pointer-events-auto cyber-panel rounded-lg px-3.5 py-2 flex items-center gap-4">
          {/* Core HP */}
          <div className="flex items-center gap-2">
            <Shield
              className={`w-5 h-5 shrink-0 ${hpPct <= 35 ? 'text-rose-400' : 'text-cyan-400'}`}
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
                <div className="w-14 h-1.5 bg-slate-800 rounded-sm overflow-hidden">
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
            <div className="text-[10px] text-slate-400 leading-none">Gold</div>
            <div
              data-testid="hud-gold"
              className="font-mono-tabular text-base font-bold text-amber-300 leading-none mt-1"
            >
              {hud.gold}G
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800" aria-hidden="true" />

          {/* Wave & Stage */}
          <div>
            <div
              className={`text-[10px] leading-none font-medium ${
                hud.wave === hud.totalWaves ? 'text-rose-300' : 'text-sky-300/90'
              }`}
            >
              {hud.stageLabel}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span data-testid="hud-wave" className="font-mono-tabular text-base font-bold text-white leading-none">
                Wave {hud.wave}/{hud.totalWaves}
              </span>
              {hud.waveActive && (
                <span className="font-mono-tabular text-xs text-rose-300 leading-none">
                  {hud.enemiesRemaining} ancaman
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right: Start Wave, Auto-Wave, 1x/2x/3x Speed, Lab Grafika, Music, SFX, Pause */}
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
              className={`cyber-cut flex items-center gap-2 px-3.5 py-2 font-display font-bold text-xs md:text-sm tracking-wide cursor-pointer whitespace-nowrap transition-transform active:scale-[0.98] ${
                isNextFinalStage
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isNextFinalStage ? 'FINAL STAGE (W15)' : `Start Wave ${hud.wave + 1}`}</span>
            </button>
          )}

          {/* Auto-Start Wave Toggle */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Auto-Start Wave"
            title="Auto-Start Wave Berikutnya"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoWave();
            }}
            className={`h-9 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              hud.autoStartWave
                ? 'bg-emerald-500 text-slate-950'
                : 'cyber-panel text-slate-300 hover:border-cyan-400/60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          {/* 1x / 2x / 3x Speed Segmented Control */}
          <div className="cyber-panel rounded-md p-1 flex items-center gap-0.5" role="group" aria-label="Kecepatan Game">
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
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-mono-tabular font-semibold cursor-pointer transition-colors ${
                  hud.timeScale === spd
                    ? spd === 1
                      ? 'bg-cyan-400 text-slate-950'
                      : spd === 2
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-rose-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {spd === 3 && <FastForward className="w-3 h-3" />}
                <span>{spd}x</span>
              </button>
            ))}
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
            className={`w-9 h-9 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
              graphicsLabOpen
                ? 'bg-cyan-400 text-slate-950'
                : 'cyber-panel text-cyan-300 hover:border-cyan-400/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </button>

          {/* Music Toggle */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={musicMuted ? 'Aktifkan musik latar' : 'Matikan musik latar'}
            title="Musik Latar [N]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMusic();
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
              musicMuted
                ? 'cyber-panel text-slate-500 hover:text-slate-300'
                : 'cyber-panel text-cyan-300 hover:border-cyan-400/60'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* SFX Mute Toggle */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Aktifkan efek suara' : 'Bisukan efek suara'}
            title="Efek Suara [M]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 cyber-panel hover:border-cyan-400/60 rounded-md flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Jeda permainan"
            title="Jeda [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 cyber-panel hover:border-cyan-400/60 rounded-md flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER-TOP BOSS BAR OR STATUS BANNER (Non-blocking) */}
      <div className="flex flex-col items-center gap-1.5 mt-1.5">
        {hud.bossStatus && (
          <div
            className={`rounded-md px-4 py-2 w-full max-w-lg ${
              hud.bossStatus.isFinalBoss ? 'cyber-panel-crimson' : 'cyber-panel border-amber-400/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span
                className={`tracking-wide ${
                  hud.bossStatus.isFinalBoss ? 'text-rose-300' : 'text-amber-300'
                }`}
              >
                {hud.bossStatus.isFinalBoss ? 'FINAL STAGE BOSS' : 'MID-BOSS'} · {hud.bossStatus.name}
              </span>
              <span className="font-mono-tabular text-white">
                {hud.bossStatus.hp.toLocaleString()} / {hud.bossStatus.maxHp.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 bg-slate-950 rounded-sm overflow-hidden">
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
          <div className="cyber-panel rounded px-3.5 py-1.5 text-xs text-sky-100 font-medium">
            {hud.bannerMessage}
          </div>
        )}
      </div>

      {/* BOTTOM REGION: LV.4 ULTIMATE HOTBAR + COLLAPSIBLE BUILD / INSPECT DOCK */}
      <div className="flex flex-col items-center mt-auto gap-1.5">
        {/* Active Ultimate Ability Hotbar (visible whenever >=1 tower reaches Lv.4 APEX) */}
        {hud.abilities.length > 0 && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
            {hud.abilities.map((ab) => {
              const cdPct = ab.cooldownTotal > 0 ? Math.min(100, (ab.cooldownRemaining / ab.cooldownTotal) * 100) : 0;
              return (
                <button
                  key={ab.towerId}
                  type="button"
                  tabIndex={-1}
                  disabled={!ab.ready}
                  title={`${ab.abilityName} [${ab.hotkey}] — ${ab.description}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTriggerUltimate(ab.towerId);
                  }}
                  className={`relative overflow-hidden rounded-md px-3 py-1.5 border text-left flex items-center gap-2 transition-transform ${
                    ab.ready
                      ? 'bg-slate-950/95 border-amber-400 text-white hover:bg-amber-950/60 cursor-pointer active:scale-[0.97]'
                      : 'bg-slate-950/85 border-slate-700 text-slate-400 cursor-not-allowed'
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
                    <div className="text-[11px] font-display font-bold flex items-center gap-1.5">
                      <span className="font-mono-tabular text-amber-300">[{ab.hotkey}]</span>
                      <span>{ab.abilityName}</span>
                    </div>
                    <div className="text-[10px] font-mono-tabular">
                      {ab.activeRemaining > 0 ? (
                        <span className="text-cyan-300">AKTIF {ab.activeRemaining.toFixed(1)}s</span>
                      ) : ab.ready ? (
                        <span className="text-emerald-300">SIAP DIPICU</span>
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

        {/* Dock Collapse Handle + Next Wave Preview */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleDock();
          }}
          className="pointer-events-auto px-3 py-1 cyber-panel rounded-t-md text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tampilkan Panel Menara [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {!hud.waveActive && nextWaveMeta
                  ? `Berikutnya: ${nextWaveMeta.title} (${nextWaveMeta.subtitle})`
                  : hud.activeBuildType
                  ? `Mode Bangun: ${TOWER_PRESETS[hud.activeBuildType].displayName} — Klik arena bebas / Pad + Overclock (Esc batal)`
                  : 'Klik menara untuk upgrade/ultimate atau pilih menara di bawah [H]'}
              </span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto cyber-panel rounded-lg p-2.5 w-full max-w-[1060px]">
            {sel ? (
              /* SELECTED TOWER MANAGEMENT BAR (4-Tier Upgrade / Lv.4 Ultimate / 4-Mode Targeting / Sell) */
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                    <TowerSilhouetteIcon type={sel.type} className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-white text-sm md:text-base">
                        {sel.displayName}
                      </span>
                      <span
                        className={`font-mono-tabular text-xs font-bold ${
                          sel.level >= MAX_TOWER_LEVEL ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      >
                        Lv.{sel.level}/{MAX_TOWER_LEVEL} · {sel.tierName}
                      </span>
                      {sel.overclocked && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono-tabular font-semibold text-amber-300">
                          <Zap className="w-3 h-3" />
                          OVERCLOCK
                        </span>
                      )}
                    </div>

                    {sel.type === 'farm' ? (
                      <div className="text-xs font-mono-tabular text-emerald-300/95 mt-0.5">
                        <span>+{sel.farmPacketGold}G / siklus</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>Dividen +{sel.farmWaveDividend}G / wave</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="text-amber-300">Total Tambang {sel.goldEarned}G</span>
                      </div>
                    ) : (
                      <div className="text-xs font-mono-tabular text-slate-300 mt-0.5">
                        <span>DMG {sel.damage.toFixed(1)}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>RNG {sel.rangeMeters}m</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>Rate {sel.fireRateSec}s</span>
                        {sel.chainCount > 0 && (
                          <>
                            <span className="mx-1.5 text-slate-600">·</span>
                            <span className="text-purple-300">Chain {sel.chainCount}</span>
                          </>
                        )}
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>Kill {sel.kills}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BTD6 4-Mode Targeting Selector (combat towers only) */}
                {sel.type !== 'farm' && (
                  <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-md p-1">
                    {TARGETING_LABELS.map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onSetTargeting(mode);
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                          sel.targetingMode === mode
                            ? 'bg-cyan-400 text-slate-950 font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Upgrade / Ultimate / Sell / Close Actions */}
                <div className="flex items-center gap-2">
                  {sel.ultimate ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={!sel.ultimate.ready}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onTriggerUltimate(sel.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                        sel.ultimate.ready
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {sel.ultimate.ready
                          ? `ULT [${sel.ultimate.hotkey}]: ${sel.ultimate.abilityName}`
                          : `CD ${sel.ultimate.cooldownRemaining.toFixed(1)}s`}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={sel.level >= MAX_TOWER_LEVEL || hud.gold < sel.upgradeCost}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onUpgradeTower();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                        hud.gold >= sel.upgradeCost
                          ? sel.level === MAX_TOWER_LEVEL - 1
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-rose-300/80 border border-rose-500/30 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>
                        {sel.level === MAX_TOWER_LEVEL - 1
                          ? `APEX + ULT (${sel.upgradeCost}G)`
                          : `Upgrade Lv.${sel.level + 1} (${sel.upgradeCost}G)`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSellTower();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-semibold bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 whitespace-nowrap cursor-pointer transition-colors"
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
              /* 6-TOWER BUILD SELECTION DOCK */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
                        onSelectBuildType(active ? null : id);
                      }}
                      className={`text-left rounded-md px-2.5 py-2 border transition-colors cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-sky-950/95 border-cyan-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 text-slate-200'
                      } ${!affordable ? 'opacity-65' : ''}`}
                    >
                      <TowerSilhouetteIcon type={id} className="w-7 h-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display font-bold text-xs truncate">
                            [{preset.keyHint}] {preset.shortName}
                          </span>
                          <span
                            className={`font-mono-tabular text-[11px] font-bold shrink-0 ${
                              affordable ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            {preset.baseCost}G
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.role}</div>
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
