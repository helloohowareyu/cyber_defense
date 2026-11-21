// Modal status (jeda, menang, kalah) — satu pelat per kondisi, angka di readout 7-segmen.

import React from 'react';
import { Home, Play, RotateCcw } from 'lucide-react';
import { HudSnapshot } from '../engine/CyberDefenseEngine';
import { DIFFICULTY_PRESETS } from '../game/constants';
import { SaveData } from '../game/saveManager';
import { Led, Screw, Seg } from './Hardware';

interface StatusModalsProps {
  hud: HudSnapshot;
  saveData: SaveData;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

function PlateScrews() {
  return (
    <>
      <Screw className="absolute top-2 left-2" angle={25} />
      <Screw className="absolute top-2 right-2" angle={-30} />
      <Screw className="absolute bottom-2 left-2" angle={60} />
      <Screw className="absolute bottom-2 right-2" angle={10} />
    </>
  );
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
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#05070b]/70 p-4">
        <div className="plate relative rounded-[4px] max-w-sm w-full px-7 py-6">
          <PlateScrews />
          <div className="flex items-center gap-2 silk">
            <Led tone="amber" blink />
            <span>Simulasi berhenti sementara</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-silk mt-2">Permainan dijeda</h2>

          <div className="recess rounded-[3px] mt-4 px-3 py-2.5 grid grid-cols-3 gap-2">
            <div>
              <div className="silk">Wave</div>
              <span className="inline-flex items-baseline gap-1 mt-1">
                <Seg value={String(hud.wave).padStart(2, '0')} digits={2} className="text-[17px]" />
                <span className="text-[11px] text-silk-dim font-semibold">/{hud.totalWaves}</span>
              </span>
            </div>
            <div>
              <div className="silk">Gold</div>
              <Seg value={hud.gold} digits={5} className="text-[17px] mt-1" />
            </div>
            <div>
              <div className="silk">Core</div>
              <Seg value={hud.coreHp} digits={3} tone="ok" className="text-[17px] mt-1" />
            </div>
          </div>
          <p className="text-[12px] text-silk-dim mt-2">
            {hud.stageLabel}, mode {DIFFICULTY_PRESETS[hud.difficulty].label}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="key key-go flex items-center justify-center gap-2 py-3 font-extrabold text-[15px]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Lanjutkan</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="key flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold"
              >
                <RotateCcw className="w-4 h-4 text-led" />
                <span>Ulangi dari awal</span>
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="key flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold"
              >
                <Home className="w-4 h-4" />
                <span>Menu utama</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hud.phase === 'victory' || hud.phase === 'gameover') {
    const isVictory = hud.phase === 'victory';
    const bestScore = Math.max(saveData.highScore, hud.score);
    const isNewRecord = hud.score > 0 && hud.score >= saveData.highScore;

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#05070b]/75 p-4">
        <div className={`${isVictory ? 'plate' : 'cyber-panel-crimson'} relative rounded-[4px] max-w-md w-full px-7 py-6`}>
          <PlateScrews />
          <div className="flex items-center gap-2 silk">
            <Led tone={isVictory ? 'ok' : 'fault'} blink={!isVictory} />
            <span>{isVictory ? 'Semua wave selesai, core aman' : 'Energy core berhenti merespons'}</span>
          </div>
          <h2 className="wordmark text-[40px] mt-2.5">{isVictory ? 'VICTORY' : 'SYSTEM BREACH'}</h2>
          <p className="text-[13px] text-silk-dim mt-2 leading-relaxed">
            {isVictory
              ? `OMEGA-0 Rootkit tumbang dan ${hud.totalWaves} wave berhasil ditahan.`
              : `Malware menembus core di wave ${hud.wave}. Coba susun ulang menara di dekat tikungan jalur.`}
          </p>

          <div className="recess rounded-[3px] mt-4 px-3.5 py-3 grid grid-cols-3 gap-2">
            <div>
              <div className="silk">Wave</div>
              <span className="inline-flex items-baseline gap-1 mt-1">
                <Seg value={String(hud.wave).padStart(2, '0')} digits={2} className="text-[18px]" />
                <span className="text-[11px] text-silk-dim font-semibold">/{hud.totalWaves}</span>
              </span>
            </div>
            <div>
              <div className="silk">Dibasmi</div>
              <Seg value={hud.enemiesDefeated} digits={4} className="text-[18px] mt-1" />
            </div>
            <div>
              <div className="silk">Skor</div>
              <Seg value={hud.score} digits={6} tone={isVictory ? 'ok' : 'amber'} className="text-[18px] mt-1" />
            </div>
          </div>
          <p className="text-[12px] text-silk-dim mt-2">
            {isNewRecord ? 'Rekor baru di perangkat ini.' : `Rekor terbaik ${bestScore.toLocaleString('id-ID')}.`} Mode{' '}
            {DIFFICULTY_PRESETS[hud.difficulty].label}, sisa core {hud.coreHp} dari {hud.maxCoreHp}.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="key key-go flex items-center justify-center gap-2 py-3 font-extrabold text-[15px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isVictory ? 'Main lagi' : 'Coba lagi'}</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="key flex items-center justify-center gap-2 py-3 text-[14px] font-semibold"
            >
              <Home className="w-4 h-4" />
              <span>Menu utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
