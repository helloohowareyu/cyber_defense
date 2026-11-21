// Title Screen Stage Overlay — sits over calm negative space while the 3D Arena orbits live behind it.

import React, { useState } from 'react';
import { BookOpen, Music, Play, Settings, Volume2, VolumeX, X } from 'lucide-react';
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PRESETS,
  DifficultyId,
  ENEMY_PRESETS,
  TOTAL_WAVES,
  TOWER_ORDER,
  TOWER_PRESETS,
} from '../game/constants';
import { getDifficultyTowerCost } from '../game/combatMath';
import { SaveData } from '../game/saveManager';
import { TowerSilhouetteIcon } from './GameIcons';
import { Led, Screw, Seg } from './Hardware';

// Keterangan singkat tiap tingkat kesulitan
const DIFFICULTY_BLURB: Record<DifficultyId, string> = {
  easy: 'Gold lebih banyak, musuh lebih lunak.',
  normal: 'Tantangan seimbang untuk main pertama.',
  hard: 'Gold terbatas, musuh lebih cepat dan kuat.',
};

interface TitleScreenProps {
  saveData: SaveData;
  difficulty: DifficultyId;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onStart: () => void;
  onUpdateAudio: (volume: number, muted: boolean, musicMuted: boolean) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveData,
  difficulty,
  onSelectDifficulty,
  onStart,
  onUpdateAudio,
}) => {
  const [modal, setModal] = useState<'none' | 'howto' | 'settings'>('none');
  const activeDiff = DIFFICULTY_PRESETS[difficulty];

  const diffLed = (id: DifficultyId) => (id === 'easy' ? 'ok' : id === 'normal' ? 'amber' : 'fault');

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Gelapkan tengah layar supaya judul & menu terbaca di atas arena yang berputar */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 52%, rgba(4,9,20,0.78) 0%, rgba(4,9,20,0.45) 55%, rgba(4,9,20,0.15) 100%)',
        }}
      />

      <div className="relative h-full flex flex-col items-center justify-center px-4 py-8">
        <h1 className="wordmark title-wordmark text-center text-[44px] sm:text-[76px] lg:text-[112px]">
          CYBER
          <br />
          DEFENSE
        </h1>

        <section
          aria-label="Menu utama"
          className="pointer-events-auto relative mt-8 sm:mt-10 w-full max-w-[460px]"
        >
          {/* Telinga rak kiri & kanan */}
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              aria-hidden="true"
              className={`plate hidden sm:flex absolute top-0 bottom-0 w-8 flex-col items-center justify-between py-3 ${
                side === 'left' ? '-left-8 rounded-l-md border-r-0' : '-right-8 rounded-r-md border-l-0'
              }`}
            >
              <span className="rack-slot" />
              <span className="rack-slot" />
            </div>
          ))}

          <div className="plate relative rounded-[3px] p-5 sm:p-6">
            <Screw className="absolute top-2 left-2" angle={20} />
            <Screw className="absolute top-2 right-2" angle={-40} />
            <Screw className="absolute bottom-2 left-2" angle={70} />
            <Screw className="absolute bottom-2 right-2" angle={5} />

            <div className="silk text-center" id="diff-label">Pilih tingkat kesulitan</div>
            <div role="radiogroup" aria-labelledby="diff-label" className="mt-2 grid grid-cols-3 gap-2">
              {DIFFICULTY_ORDER.map((id) => {
                const selected = difficulty === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`difficulty-${id}`}
                    onClick={() => onSelectDifficulty(id)}
                    className={`key flex flex-col items-center gap-1.5 pt-2 pb-2 text-[14px] font-semibold ${selected ? 'key-on' : ''}`}
                  >
                    <Led tone={selected ? diffLed(id) : 'off'} />
                    <span>{DIFFICULTY_PRESETS[id].label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] text-silk-dim text-center mt-2.5 min-h-[20px]" aria-live="polite">
              {DIFFICULTY_BLURB[difficulty]}
            </p>

            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="key key-go w-full mt-4 flex items-center justify-center gap-3 py-4 text-[22px] font-extrabold tracking-[0.06em]"
             
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START</span>
            </button>

            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => setModal('howto')}
                className="key flex items-center justify-center gap-2 py-2.5 text-[13.5px] font-semibold whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 text-led" />
                <span>Cara bermain</span>
              </button>
              <button
                type="button"
                onClick={() => setModal('settings')}
                className="key flex items-center justify-center gap-2 py-2.5 text-[13.5px] font-semibold whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-led" />
                <span>Pengaturan</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Panduan bermain */}
      {modal === 'howto' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-[#05070b]/80 p-4">
          <div className="plate rounded-[4px] max-w-3xl w-full max-h-[86vh] overflow-y-auto shop-scroll p-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/40">
              <h2 className="font-display text-xl font-bold text-silk">Cara bermain</h2>
              <button
                type="button"
                aria-label="Tutup panduan"
                onClick={() => setModal('none')}
                className="key p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-6 text-sm text-silk">
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    title: 'Pasang menara',
                    body: 'Pilih menara di toko sebelah kanan, lalu klik area kosong di dek. Tombol H menyembunyikan toko.',
                  },
                  {
                    title: 'Kelola gold',
                    body: `Data Farm menghasilkan gold tiap siklus dan bonus di akhir wave. Pad terkunci bisa dibeli ${activeDiff.overclockUnlockCost}G untuk +12% jarak dan kecepatan tembak.`,
                  },
                  {
                    title: 'Upgrade ke Lv.4',
                    body: 'Klik menara untuk mengatur target, upgrade, atau menjual. Di Lv.4 menara membuka ultimate dengan tombol Q, E, R, T, Y, atau F.',
                  },
                ].map((step, i) => (
                  <li key={step.title} className="recess rounded-[3px] p-3.5">
                    <div className="flex items-center gap-2">
                      <Seg value={i + 1} digits={1} className="text-[15px]" />
                      <h3 className="font-bold text-silk">{step.title}</h3>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-silk-dim mt-1.5">{step.body}</p>
                  </li>
                ))}
              </ol>

              <div>
                <h3 className="font-bold text-silk mb-2">
                  Menara <span className="font-normal text-silk-dim">(harga mode {activeDiff.label})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TOWER_ORDER.map((id) => {
                    const t = TOWER_PRESETS[id];
                    const cost = getDifficultyTowerCost(t.baseCost, difficulty);
                    return (
                      <div key={id} className="recess rounded-[3px] p-3 flex gap-3">
                        <TowerSilhouetteIcon type={id} className="w-10 h-10 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-silk">{t.displayName}</span>
                            <Seg value={cost} digits={3} className="text-[12px]" />
                          </div>
                          <div className="text-[12px] text-silk-dim mt-0.5 leading-snug">{t.description}</div>
                          <div className="text-[11.5px] text-led mt-1 flex items-center gap-1.5">
                            <span className="keycap !h-[17px] !min-w-[18px] !text-[10px]">{t.ultimate.hotkey}</span>
                            {t.ultimate.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-silk mb-2">
                  Malware <span className="font-normal text-silk-dim">({TOTAL_WAVES} wave, boss di akhir tiap stage)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.values(ENEMY_PRESETS).map((e) => (
                    <div
                      key={e.id}
                      className={`recess rounded-[3px] p-2.5 ${e.isFinalBoss ? 'border-fault/50' : e.isBoss ? 'border-led/40' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Led tone={e.isFinalBoss || e.isBoss ? 'fault' : 'off'} />
                        <span className="font-bold text-silk">{e.displayName}</span>
                      </div>
                      <div className="text-silk-dim mt-0.5">{e.role}</div>
                      <dl className="font-mono-tabular text-silk mt-1.5 grid grid-cols-3 gap-1">
                        <div><dt className="silk">HP</dt><dd>{e.baseHp}</dd></div>
                        <div><dt className="silk">Armor</dt><dd>{e.armor}</dd></div>
                        <div><dt className="silk">Hadiah</dt><dd className="text-led">{e.rewardGold}G</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>

              <p className="pt-3 border-t border-black/40 text-[12.5px] text-silk-dim leading-relaxed">
                <span className="keycap mr-1.5">G</span>
                saat bermain membuka Lab Grafika untuk presentasi: proyeksi perspektif dan ortografik, wireframe,
                shadow mapping, shader Blinn-Phong, UV laser bergulir, serta alpha dan additive blending.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pengaturan suara & rekor */}
      {modal === 'settings' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-[#05070b]/80 p-4">
          <div className="plate rounded-[4px] max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/40">
              <h2 className="font-display text-xl font-bold text-silk">Pengaturan</h2>
              <button
                type="button"
                aria-label="Tutup pengaturan"
                onClick={() => setModal('none')}
                className="key p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="audio-vol" className="text-sm font-semibold text-silk">
                    Volume suara
                  </label>
                  {saveData.muted ? (
                    <span className="text-xs font-semibold text-fault">Efek suara dibisukan</span>
                  ) : (
                    <Seg value={Math.round(saveData.volume * 100)} digits={3} className="text-[14px]" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={saveData.muted ? 'Nyalakan efek suara' : 'Bisukan efek suara'}
                    onClick={() => onUpdateAudio(saveData.volume, !saveData.muted, saveData.musicMuted)}
                    className={`key p-2 ${saveData.muted ? '' : 'key-on'}`}
                  >
                    {saveData.muted ? <VolumeX className="w-4 h-4 text-fault" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    id="audio-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={saveData.volume}
                    onChange={(e) => onUpdateAudio(parseFloat(e.target.value), false, saveData.musicMuted)}
                    className="w-full accent-[#ffb23f] cursor-pointer"
                  />
                </div>
              </div>

              <div className="recess rounded-[3px] flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Music className={`w-4 h-4 ${saveData.musicMuted ? 'text-silk-dim/70' : 'text-led'}`} />
                  <div>
                    <div className="text-sm font-semibold text-silk">Musik latar</div>
                    <div className="text-[12px] text-silk-dim">Makin intens saat wave dan boss</div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={!saveData.musicMuted}
                  onClick={() => onUpdateAudio(saveData.volume, saveData.muted, !saveData.musicMuted)}
                  className={`key flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${saveData.musicMuted ? '' : 'key-on'}`}
                >
                  <Led tone={saveData.musicMuted ? 'off' : 'ok'} />
                  {saveData.musicMuted ? 'Mati' : 'Nyala'}
                </button>
              </div>

              <div className="pt-4 border-t border-black/40">
                <div className="text-sm font-semibold text-silk mb-3">Rekor di perangkat ini</div>
                <div className="recess rounded-[3px] grid grid-cols-2 gap-x-4 gap-y-3 p-3.5">
                  <div>
                    <div className="silk">Skor tertinggi</div>
                    <Seg value={saveData.highScore} digits={6} className="text-[17px] mt-1" />
                  </div>
                  <div>
                    <div className="silk">Wave terjauh</div>
                    <span className="inline-flex items-baseline gap-1 mt-1">
                      <Seg value={saveData.highestWave} digits={2} className="text-[17px]" />
                      <span className="text-[11px] text-silk-dim font-semibold">dari {TOTAL_WAVES}</span>
                    </span>
                  </div>
                  <div>
                    <div className="silk">Malware dibasmi</div>
                    <Seg value={saveData.totalEnemiesDefeated} digits={5} className="text-[17px] mt-1" />
                  </div>
                  <div>
                    <div className="silk">Kemenangan</div>
                    <Seg value={saveData.wins} digits={3} tone="ok" className="text-[17px] mt-1" />
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
