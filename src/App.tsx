// Cyber Defense 3D — Root Game Shell
// Mounts the Three.js WebGLRenderer once in an isolated sibling <div ref={canvasMountRef} />
// so HUD React state updates NEVER tear down WebGL or reset the 3D arena.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CyberDefenseEngine,
  FloatingTextEvent,
  HudSnapshot,
} from './engine/CyberDefenseEngine';
import { STARTING_CORE_HP, STARTING_GOLD, TOTAL_WAVES } from './game/constants';
import { audioSynth } from './game/audioSynth';
import { loadSaveData, persistSaveData, recordMatchResult, SaveData } from './game/saveManager';
import { TitleScreen } from './components/TitleScreen';
import { GameplayHud } from './components/GameplayHud';
import { GraphicsLabPanel } from './components/GraphicsLabPanel';
import { StatusModals } from './components/StatusModals';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  gold: STARTING_GOLD,
  coreHp: STARTING_CORE_HP,
  maxCoreHp: STARTING_CORE_HP,
  wave: 0,
  totalWaves: TOTAL_WAVES,
  stageLabel: 'Stage 1 · Perimeter Scan',
  waveActive: false,
  autoStartWave: false,
  enemiesRemaining: 0,
  enemiesDefeated: 0,
  score: 0,
  timeScale: 1,
  activeBuildType: 'laser',
  selectedTowerId: null,
  selectedTower: null,
  abilities: [],
  bossStatus: null,
  bannerMessage: null,
  graphics: {
    projection: 'perspective',
    wireframe: false,
    shadowsEnabled: true,
    showAllRangeRings: false,
    cameraPreset: 'tactical',
    triangles: 0,
    drawCalls: 0,
    isSoftwareGl: false,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CyberDefenseEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [saveData, setSaveData] = useState<SaveData>(() => {
    const loaded = loadSaveData();
    audioSynth.configure(loaded.volume, loaded.muted, loaded.musicMuted);
    return loaded;
  });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [graphicsLabOpen, setGraphicsLabOpen] = useState(false);
  const [floatTexts, setFloatTexts] = useState<FloatingTextEvent[]>([]);

  const saveRef = useRef(saveData);
  saveRef.current = saveData;

  const hudRef = useRef(hud);
  hudRef.current = hud;

  const handleHudUpdate = useCallback((snapshot: HudSnapshot) => {
    setHud(snapshot);
    const bodyState =
      snapshot.phase === 'victory' || snapshot.phase === 'gameover'
        ? 'gameover'
        : snapshot.phase;
    document.body.dataset.state = bodyState;
  }, []);

  const handleFloatText = useCallback((evt: FloatingTextEvent) => {
    setFloatTexts((prev) => [...prev.slice(-16), evt]);
    window.setTimeout(() => {
      setFloatTexts((prev) => prev.filter((item) => item.id !== evt.id));
    }, 820);
  }, []);

  const handleMatchEnd = useCallback(
    (result: { won: boolean; score: number; waveReached: number; defeated: number }) => {
      const updated = recordMatchResult(saveRef.current, {
        score: result.score,
        waveReached: result.waveReached,
        defeatedThisMatch: result.defeated,
        won: result.won,
      });
      setSaveData(updated);
    },
    []
  );

  // Mount Three.js engine ONCE
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CyberDefenseEngine(mount, {
      onHudUpdate: handleHudUpdate,
      onFloatText: handleFloatText,
      onMatchEnd: handleMatchEnd,
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      document.body.dataset.state = 'playing';
      engine.startNewGame();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleHudUpdate, handleFloatText, handleMatchEnd]);

  const handleUpdateAudio = useCallback((volume: number, muted: boolean, musicMuted: boolean) => {
    audioSynth.configure(volume, muted, musicMuted);
    const next: SaveData = { ...saveRef.current, volume, muted, musicMuted };
    persistSaveData(next);
    setSaveData(next);
  }, []);

  const handleStartGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioSynth.playUiClick();
    engineRef.current?.startNewGame();
  }, []);

  // Global keyboard shortcuts (Title Enter/Space, Pause P/Esc, Graphics Lab G, Hide Dock H, SFX M, Music N)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const snap = hudRef.current;
      const phase = snap.phase;

      if (phase === 'title' && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        handleStartGame();
        return;
      }

      if (key === 'p') {
        if (phase === 'playing') {
          e.preventDefault();
          engineRef.current?.setPaused(true);
        } else if (phase === 'paused') {
          e.preventDefault();
          engineRef.current?.setPaused(false);
        }
        return;
      }

      if (key === 'escape') {
        if (phase === 'playing') {
          e.preventDefault();
          // First cancel active build ghost or selected tower; second Escape pauses the game
          if (snap.activeBuildType !== null) {
            engineRef.current?.setActiveBuildType(null);
          } else if (snap.selectedTowerId !== null) {
            engineRef.current?.selectTower(null);
          } else {
            engineRef.current?.setPaused(true);
          }
        } else if (phase === 'paused') {
          e.preventDefault();
          engineRef.current?.setPaused(false);
        }
        return;
      }

      if (phase === 'playing') {
        if (key === 'g') {
          setGraphicsLabOpen((v) => !v);
        } else if (key === 'h') {
          setDockCollapsed((v) => !v);
        } else if (key === 'm') {
          handleUpdateAudio(saveRef.current.volume, !saveRef.current.muted, saveRef.current.musicMuted);
        } else if (key === 'n') {
          handleUpdateAudio(saveRef.current.volume, saveRef.current.muted, !saveRef.current.musicMuted);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStartGame, handleUpdateAudio]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#040914]">
      {/* Isolated WebGL Canvas Container (never re-mounted by HUD updates) */}
      <div
        ref={canvasMountRef}
        data-testid="cyber-defense-canvas"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* World-to-screen floating combat damage, gold farm packets & ultimate callouts */}
      {hud.phase === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
          {floatTexts.map((ft) => (
            <div
              key={ft.id}
              className="absolute font-mono-tabular text-xs font-bold hud-text-shadow transition-transform duration-500 -translate-x-1/2 -translate-y-full whitespace-nowrap"
              style={{
                left: `${ft.x}px`,
                top: `${ft.y}px`,
                color: ft.color,
              }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      )}

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <TitleScreen
          saveData={saveData}
          onStart={handleStartGame}
          onUpdateAudio={handleUpdateAudio}
        />
      )}

      {/* Gameplay HUD */}
      {hud.phase === 'playing' && (
        <GameplayHud
          hud={hud}
          muted={saveData.muted}
          musicMuted={saveData.musicMuted}
          dockCollapsed={dockCollapsed}
          graphicsLabOpen={graphicsLabOpen}
          onToggleDock={() => setDockCollapsed((v) => !v)}
          onToggleGraphicsLab={() => setGraphicsLabOpen((v) => !v)}
          onToggleMute={() => handleUpdateAudio(saveData.volume, !saveData.muted, saveData.musicMuted)}
          onToggleMusic={() => handleUpdateAudio(saveData.volume, saveData.muted, !saveData.musicMuted)}
          onToggleAutoWave={() => engineRef.current?.setAutoStartWave(!hud.autoStartWave)}
          onPause={() => engineRef.current?.setPaused(true)}
          onSetSpeed={(scale) => engineRef.current?.setTimeScale(scale)}
          onStartWave={() => engineRef.current?.startNextWave()}
          onSelectBuildType={(t) => engineRef.current?.setActiveBuildType(t)}
          onUpgradeTower={() => engineRef.current?.upgradeSelectedTower()}
          onSellTower={() => engineRef.current?.sellSelectedTower()}
          onSetTargeting={(m) => engineRef.current?.setSelectedTowerTargeting(m)}
          onTriggerUltimate={(id) => engineRef.current?.triggerTowerUltimate(id)}
          onDeselectTower={() => engineRef.current?.selectTower(null)}
        />
      )}

      {/* Interactive CPMK Computer Graphics Pipeline Lab */}
      {hud.phase === 'playing' && graphicsLabOpen && (
        <GraphicsLabPanel
          graphics={hud.graphics}
          onClose={() => setGraphicsLabOpen(false)}
          onSetProjection={(p) => engineRef.current?.setProjection(p)}
          onSetWireframe={(w) => engineRef.current?.setWireframe(w)}
          onSetShadows={(s) => engineRef.current?.setShadowsEnabled(s)}
          onSetShowAllRings={(r) => engineRef.current?.setShowAllRangeRings(r)}
          onSetCameraPreset={(c) => engineRef.current?.setCameraPreset(c)}
        />
      )}

      {/* Pause, Victory, Game Over Modals */}
      <StatusModals
        hud={hud}
        saveData={saveData}
        onResume={() => engineRef.current?.setPaused(false)}
        onRestart={handleStartGame}
        onMainMenu={() => {
          setGraphicsLabOpen(false);
          engineRef.current?.returnToTitle();
        }}
      />
    </main>
  );
}
