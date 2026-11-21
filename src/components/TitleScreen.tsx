// Title Screen Stage Overlay — sits over calm negative space while the 3D Arena orbits live behind it.

import React, { useState } from 'react';
import { BookOpen, Music, Play, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { ENEMY_PRESETS, TOTAL_WAVES, TOWER_ORDER, TOWER_PRESETS } from '../game/constants';
import { SaveData } from '../game/saveManager';
import { CyberDefenseEmblem, TowerSilhouetteIcon } from './GameIcons';

interface TitleScreenProps {
  saveData: SaveData;
  onStart: () => void;
  onUpdateAudio: (volume: number, muted: boolean, musicMuted: boolean) => void;
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
        className="fixed inset-y-0 left-0 w-full md:w-[560px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,9,20,0.88) 0%, rgba(4,9,20,0.62) 65%, rgba(4,9,20,0) 100%)',
        }}
      />

      {/* Top academic metadata line (Course Code + Course Name + FILKOM UB only) */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="text-xs tracking-wider text-sky-300/90 font-mono-tabular hud-text-shadow">
          <span>CIF65116 · Komputer Grafis</span>
          <span className="mx-2 text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-200">Fakultas Ilmu Komputer · Universitas Brawijaya</span>
        </div>

        {saveData.highScore > 0 && (
          <div className="text-xs text-slate-300 font-mono-tabular hud-text-shadow shrink-0">
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
            <p className="text-sm text-sky-300/90 mt-1.5 leading-snug">
              Bangun ekonomi Data Farm, tempatkan 6 menara siber secara bebas, aktifkan Ultimate Lv.4,
              dan tumbangkan Final Boss OMEGA-0 Rootkit di Wave {TOTAL_WAVES}.
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
          <span>Nur (Desain Arena & Jalur 3D)</span>
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
        1-6 Pilih Menara · Klik Bebas di Arena (Pad + = Overclock) · Q/E/R/T/Y/F Ultimate Lv.4 · WASD / Klik-Kanan Kamera · G Lab Grafika
      </div>

      {/* How to Play Modal */}
      {modal === 'howto' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-slate-950/75 p-4">
          <div className="cyber-panel rounded-lg max-w-3xl w-full max-h-[86vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="font-display text-xl font-bold text-white">Panduan Strategi & Target CPMK</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 rounded-md p-3.5">
                  <h3 className="text-cyan-300 font-semibold mb-1">Penempatan Bebas & Overclock Node</h3>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Pilih menara (<span className="font-mono-tabular text-white">1–6</span>) lalu klik area
                    kosong mana saja di dek arena! Letakkan di atas <strong className="text-amber-300">9 Pad + bercahaya</strong> untuk
                    bonus <strong className="text-white">+15% Jangkauan & +12% Kecepatan Tembak</strong>.
                  </p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-md p-3.5">
                  <h3 className="text-amber-300 font-semibold mb-1">Farming, 4-Tier Upgrade & Ultimate</h3>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Bangun <strong className="text-emerald-300">Quantum Data Farm</strong> di awal untuk panen Gold rutin
                    tiap siklus & dividen wave. Upgrade menara hingga <strong className="text-amber-300">Lv.4 APEX</strong> untuk
                    membuka <strong className="text-white">Active Ultimate</strong> (<span className="font-mono-tabular">Q/E/R/T/Y/F</span>)!
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-cyan-300 font-semibold mb-2">6 Menara Pertahanan Siber & Ultimate Lv.4</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOWER_ORDER.map((id) => {
                    const t = TOWER_PRESETS[id];
                    return (
                      <div key={id} className="bg-slate-900/80 border border-slate-800 rounded-md p-3 flex gap-3">
                        <TowerSilhouetteIcon type={id} className="w-8 h-8 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">[{t.keyHint}] {t.displayName}</span>
                            <span className="font-mono-tabular text-amber-300 text-xs">{t.baseCost}G</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
                          <div className="text-[11px] font-mono-tabular text-amber-300/90 mt-1">
                            ULT [{t.ultimate.hotkey}]: {t.ultimate.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-cyan-300 font-semibold mb-2">
                  6 Entitas Malware & Ancaman Siber (15 Wave · 3 Stage + Final Stage)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.values(ENEMY_PRESETS).map((e) => (
                    <div
                      key={e.id}
                      className={`rounded-md p-2.5 border ${
                        e.isFinalBoss
                          ? 'bg-rose-950/60 border-rose-500/60'
                          : e.isBoss
                          ? 'bg-amber-950/40 border-amber-500/50'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-white">{e.displayName}</div>
                      <div className="text-slate-400 mt-0.5">{e.role}</div>
                      <div className="font-mono-tabular text-slate-300 mt-1">
                        HP {e.baseHp} · ARM {e.armor} · +{e.rewardGold}G
                      </div>
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
                    Volume Master (SFX & Musik)
                  </label>
                  <span className="font-mono-tabular text-xs text-cyan-300">
                    {saveData.muted ? 'SFX Bisukan' : `${Math.round(saveData.volume * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={saveData.muted ? 'Aktifkan SFX' : 'Bisukan SFX'}
                    onClick={() => onUpdateAudio(saveData.volume, !saveData.muted, saveData.musicMuted)}
                    className="p-2 rounded bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-400 cursor-pointer"
                  >
                    {saveData.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    id="audio-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={saveData.volume}
                    onChange={(e) => onUpdateAudio(parseFloat(e.target.value), false, saveData.musicMuted)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-md px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Music className={`w-4 h-4 ${saveData.musicMuted ? 'text-slate-500' : 'text-cyan-400'}`} />
                  <div>
                    <div className="text-sm font-medium text-slate-200">Musik Synthwave Adaptif</div>
                    <div className="text-[11px] text-slate-400">Berubah intensitas saat wave & Boss</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateAudio(saveData.volume, saveData.muted, !saveData.musicMuted)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    saveData.musicMuted
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-cyan-400 text-slate-950'
                  }`}
                >
                  {saveData.musicMuted ? 'Mati' : 'Aktif'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400 mb-3">Statistik Tersimpan</div>
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
                      {saveData.highestWave} / {TOTAL_WAVES}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                    <div className="text-xs text-slate-400">Malware Dibasmi</div>
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
