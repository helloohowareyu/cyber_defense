// Title Screen Stage Overlay — sits over calm negative space while Nur's 3D Arena orbits live behind it.

import React, { useState } from 'react';
import { BookOpen, Play, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { ENEMY_PRESETS, TOWER_ORDER, TOWER_PRESETS } from '../game/constants';
import { SaveData } from '../game/saveManager';
import { CyberDefenseEmblem, TowerSilhouetteIcon } from './GameIcons';

interface TitleScreenProps {
  saveData: SaveData;
  onStart: () => void;
  onUpdateAudio: (volume: number, muted: boolean) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveData,
  onStart,
  onUpdateAudio,
}) => {
  const [modal, setModal] = useState<'none' | 'howto' | 'settings'>('none');

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Subtle left-side contrast scrim so typography is crisp over live 3D arena */}
      <div
        className="fixed inset-y-0 left-0 w-full md:w-[540px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,9,20,0.88) 0%, rgba(4,9,20,0.62) 65%, rgba(4,9,20,0) 100%)',
        }}
      />

      {/* Top metadata line (clean unboxed text, zero pills) */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-xs tracking-wider text-sky-300/80 font-mono-tabular">
          <span>CIF65116 Komputer Grafis</span>
          <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
          <span>Peta 3D Nur</span>
          <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
          <span>WebGL2 Offline</span>
        </div>

        {saveData.highScore > 0 && (
          <div className="text-xs text-slate-300 font-mono-tabular hud-text-shadow">
            <span>Rekor Skor {saveData.highScore.toLocaleString()}</span>
            <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
            <span>Menang {saveData.wins}x</span>
          </div>
        )}
      </div>

      {/* Main Left-Third Title Lockup & Actions */}
      <div className="relative z-10 max-w-md my-auto pointer-events-auto">
        <div className="flex items-center gap-3.5 mb-4">
          <CyberDefenseEmblem className="w-12 h-12 shrink-0" />
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white leading-none hud-text-shadow">
              CYBER DEFENSE
            </h1>
            <p className="text-sm text-sky-300/90 mt-1.5">
              Pertahankan Energy Core dari 5 gelombang serangan robot & Boss Demon King.
            </p>
          </div>
        </div>

        {/* 3 Primary Menu Actions */}
        <div className="mt-7 flex flex-col gap-3 max-w-xs">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="cyber-cut flex items-center justify-center gap-2.5 px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base tracking-wide transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Mulai Permainan</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setModal('howto')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 cyber-panel hover:border-cyan-400/60 text-slate-100 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Cara Bermain</span>
            </button>

            <button
              type="button"
              onClick={() => setModal('settings')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 cyber-panel hover:border-cyan-400/60 text-slate-100 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span>Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Team Attribution (quiet unboxed text) */}
        <div className="mt-8 text-xs text-slate-400 leading-relaxed">
          <div className="text-slate-300 font-medium mb-0.5">Tim Pengembang Proyek</div>
          <span>Nur (Peta 3D & Jalur)</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>Ucup (Tower, Combat & Shader)</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>Abiyu (Core Logic)</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>Zulfan (Ekonomi & UI)</span>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="relative z-10 text-xs text-slate-400 font-mono-tabular hud-text-shadow">
        Enter / Space Mulai · Klik Slot Bangun Menara · 1-4 Pilih Menara · WASD / Klik-Kanan Kamera · G Lab Grafika
      </div>

      {/* How to Play Modal */}
      {modal === 'howto' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-slate-950/75 p-4">
          <div className="cyber-panel rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="font-display text-xl font-bold text-white">Panduan Bermain & Target CPMK</h2>
              <button
                type="button"
                aria-label="Tutup panduan"
                onClick={() => setModal('none')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-sm text-slate-300">
              <div>
                <h3 className="text-cyan-300 font-semibold mb-1.5">Alur Pertahanan</h3>
                <p className="leading-relaxed">
                  Pilih jenis menara di panel bawah (tombol <span className="font-mono-tabular text-white">1–4</span>),
                  lalu klik salah satu dari <strong className="text-white">9 slot bercahaya</strong> di sepanjang
                  jalur kurva 3D milik Nur. Klik menara yang sudah dibangun untuk melakukan
                  <strong className="text-white"> Upgrade (hingga Lv.3)</strong>, mengganti mode targeting
                  (<span className="text-white">Front Most / Lowest HP / Closest</span>), atau menjualnya (refund 70%).
                </p>
              </div>

              <div>
                <h3 className="text-cyan-300 font-semibold mb-2">4 Jenis Menara Pertahanan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOWER_ORDER.map((id) => {
                    const t = TOWER_PRESETS[id];
                    return (
                      <div key={id} className="bg-slate-900/80 border border-slate-800 rounded-md p-3 flex gap-3">
                        <TowerSilhouetteIcon type={id} className="w-8 h-8 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">{t.displayName}</span>
                            <span className="font-mono-tabular text-amber-300 text-xs">{t.baseCost}G</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
                          <div className="text-xs font-mono-tabular text-slate-500 mt-1">
                            DMG {t.baseDamage} · RNG {t.baseRangeGdd} · {t.fireRateSec}s
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-cyan-300 font-semibold mb-2">4 Tipe Musuh (HP Naik ×1.25 per Wave)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.values(ENEMY_PRESETS).map((e) => (
                    <div key={e.id} className="bg-slate-900/80 border border-slate-800 rounded-md p-2.5">
                      <div className="font-semibold text-white">{e.displayName}</div>
                      <div className="text-slate-400 mt-0.5">{e.role}</div>
                      <div className="font-mono-tabular text-slate-300 mt-1.5">
                        HP {e.baseHp} · ARM {e.armor}
                      </div>
                      <div className="font-mono-tabular text-amber-300">+{e.rewardGold}G</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                <strong className="text-cyan-300">Mode Presentasi Kuliah (Tekan G saat bermain):</strong> Membuka Lab
                Grafika Komputer real-time untuk mendemonstrasikan Proyeksi Perspective/Orthographic, Wireframe VBO,
                Shadow Mapping, Custom Blinn-Phong Shader, Scrolling UV Laser, dan Alpha/Additive Blending.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Local Save Records Modal */}
      {modal === 'settings' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-slate-950/75 p-4">
          <div className="cyber-panel rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="font-display text-xl font-bold text-white">Pengaturan & Rekor Lokal</h2>
              <button
                type="button"
                aria-label="Tutup pengaturan"
                onClick={() => setModal('none')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="audio-vol" className="text-sm font-medium text-slate-200">
                    Volume Efek Suara
                  </label>
                  <span className="font-mono-tabular text-xs text-cyan-300">
                    {saveData.muted ? 'Bisukan' : `${Math.round(saveData.volume * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={saveData.muted ? 'Aktifkan suara' : 'Bisukan suara'}
                    onClick={() => onUpdateAudio(saveData.volume, !saveData.muted)}
                    className="p-2 rounded bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-400 cursor-pointer"
                  >
                    {saveData.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    id="audio-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={saveData.volume}
                    onChange={(e) => onUpdateAudio(parseFloat(e.target.value), false)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400 mb-3">Statistik Tersimpan (Offline)</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-xs text-slate-400">High Score</div>
                    <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
                      {saveData.highScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-xs text-slate-400">Wave Tertinggi</div>
                    <div className="font-mono-tabular text-lg font-bold text-cyan-300 mt-0.5">
                      {saveData.highestWave} / 5
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-xs text-slate-400">Musuh Dikalahkan</div>
                    <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
                      {saveData.totalEnemiesDefeated}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-xs text-slate-400">Kemenangan</div>
                    <div className="font-mono-tabular text-lg font-bold text-emerald-400 mt-0.5">
                      {saveData.wins}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
