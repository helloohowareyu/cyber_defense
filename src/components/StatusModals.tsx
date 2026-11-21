// Outcome & Pause Status Modals (Pause, Victory, Game Over) — Single focused card per state.

import React from 'react';
import { Home, Play, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { HudSnapshot } from '../engine/CyberDefenseEngine';
import { DIFFICULTY_PRESETS } from '../game/constants';
import { SaveData } from '../game/saveManager';

interface StatusModalsProps {
  hud: HudSnapshot;
  saveData: SaveData;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  hud,
  saveData,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  if (hud.phase === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="cyber-panel rounded-lg max-w-sm w-full p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Permainan Dijeda</h2>
          <p className="text-xs text-slate-400 mt-1">
            Mode {DIFFICULTY_PRESETS[hud.difficulty].label} · {hud.stageLabel} · Wave {hud.wave}/{hud.totalWaves} · Gold {hud.gold}G
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="cyber-cut flex items-center justify-center gap-2 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Lanjutkan</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm font-medium cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Ulangi Match</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm font-medium cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Menu Utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hud.phase === 'victory' || hud.phase === 'gameover') {
    const isVictory = hud.phase === 'victory';
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
        <div
          className={`${
            isVictory ? 'cyber-panel' : 'cyber-panel-crimson'
          } rounded-lg max-w-md w-full p-6 text-center`}
        >
          <div className="flex justify-center mb-3">
            {isVictory ? (
              <Trophy className="w-11 h-11 text-amber-300" />
            ) : (
              <ShieldAlert className="w-11 h-11 text-rose-400" />
            )}
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {isVictory ? 'VICTORY' : 'SYSTEM BREACH'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {isVictory
              ? `Final Boss OMEGA-0 Rootkit dan seluruh ${hud.totalWaves} wave serangan siber berhasil ditumpas. Energy Core terlindungi!`
              : 'Energy Core ditembus gelombang malware sebelum Final Stage selesai.'}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2.5 text-left">
            <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
              <div className="text-[11px] text-slate-400">Wave</div>
              <div className="font-mono-tabular text-lg font-bold text-cyan-300 mt-0.5">
                {hud.wave}/{hud.totalWaves}
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
              <div className="text-[11px] text-slate-400">Dibasmi</div>
              <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
                {hud.enemiesDefeated}
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
              <div className="text-[11px] text-slate-400">Skor</div>
              <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                {hud.score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-2.5 text-xs font-mono-tabular text-slate-400">
            Mode: {DIFFICULTY_PRESETS[hud.difficulty].label} · High Score: {Math.max(saveData.highScore, hud.score).toLocaleString()} · Core HP: {hud.coreHp}/
            {hud.maxCoreHp}
          </div>

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 cyber-cut flex items-center justify-center gap-2 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isVictory ? 'Main Lagi' : 'Coba Lagi'}</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-sm font-medium cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Menu Utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
