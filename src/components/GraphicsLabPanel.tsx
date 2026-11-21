// Interactive CPMK-1 & CPMK-2 Computer Graphics Pipeline Inspector (RPS CIF65116)
// Collapsed by default; toggled via [G] or top-right icon button during classroom demo.

import React from 'react';
import { Camera, Layers, X } from 'lucide-react';
import { CameraPreset } from '../game/constants';
import { GraphicsLabState } from '../engine/CyberDefenseEngine';

interface GraphicsLabPanelProps {
  graphics: GraphicsLabState;
  shopOpen: boolean;
  onClose: () => void;
  onSetProjection: (proj: 'perspective' | 'orthographic') => void;
  onSetWireframe: (enabled: boolean) => void;
  onSetShadows: (enabled: boolean) => void;
  onSetShowAllRings: (enabled: boolean) => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
}

const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'tactical', label: 'Taktis' },
  { id: 'action', label: 'Rendah' },
  { id: 'topdown', label: 'Atas' },
  { id: 'core', label: 'Core' },
];

export const GraphicsLabPanel: React.FC<GraphicsLabPanelProps> = ({
  graphics,
  shopOpen,
  onClose,
  onSetProjection,
  onSetWireframe,
  onSetShadows,
  onSetShowAllRings,
  onSetCameraPreset,
}) => {
  return (
    <aside
      aria-label="Lab Grafika Komputer CIF65116"
      className={`ui-scale fixed top-16 z-30 pointer-events-auto cyber-panel rounded-[4px] w-[290px] text-silk p-4 text-xs transition-all ${
        shopOpen ? 'right-[330px]' : 'right-12'
      }`}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-black/40">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-led" />
          <h2 className="font-display font-bold text-sm text-silk">Lab Grafika (CIF65116)</h2>
        </div>
        <button
          type="button"
          aria-label="Tutup Lab Grafika"
          onClick={onClose}
          className="p-1 rounded text-silk-dim hover:text-silk hover:bg-white/5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3.5">
        {/* Bahan Kajian 5: Projection Matrix */}
        <div>
          <div className="text-silk-dim mb-1.5">Proyeksi Kamera (Bahan Kajian 5)</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onSetProjection('perspective')}
              className={`key py-1.5 font-semibold ${graphics.projection === 'perspective' ? 'key-on' : ''}`}
            >
              Perspective
            </button>
            <button
              type="button"
              onClick={() => onSetProjection('orthographic')}
              className={`key py-1.5 font-semibold ${graphics.projection === 'orthographic' ? 'key-on' : ''}`}
            >
              Orthographic
            </button>
          </div>
        </div>

        {/* Camera Presets */}
        <div>
          <div className="flex items-center gap-1.5 text-silk-dim mb-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>Sudut Pandang Kamera</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSetCameraPreset(p.id)}
                className={`key py-1.5 text-center font-semibold ${graphics.cameraPreset === p.id ? 'key-on' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Feature Toggles */}
        <div className="space-y-2 pt-2 border-t border-black/40">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-silk">Wireframe Primitives (VBO)</span>
            <input
              type="checkbox"
              checked={graphics.wireframe}
              onChange={(e) => onSetWireframe(e.target.checked)}
              className="accent-[#ffb23f] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-silk">Shadow Mapping (PCFSoft)</span>
            <input
              type="checkbox"
              checked={graphics.shadowsEnabled}
              onChange={(e) => onSetShadows(e.target.checked)}
              className="accent-[#ffb23f] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-silk">Alpha Blending Range Rings</span>
            <input
              type="checkbox"
              checked={graphics.showAllRangeRings}
              onChange={(e) => onSetShowAllRings(e.target.checked)}
              className="accent-[#ffb23f] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Live WebGL Pipeline Metrics */}
        <div className="pt-2.5 border-t border-black/40 space-y-1 text-[11px] font-mono-tabular text-silk-dim">
          <div className="flex justify-between">
            <span>Segitiga Dirender</span>
            <span className="text-led">{graphics.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Draw Calls</span>
            <span className="text-silk">{graphics.drawCalls}</span>
          </div>
          <div className="flex justify-between">
            <span>Custom GLSL Shaders</span>
            <span className="text-ok">4 Aktif</span>
          </div>
          <div className="text-[10px] text-silk-dim/70 pt-1 leading-relaxed">
            Blinn-Phong Fresnel · Scrolling UV Additive Laser · Barycentric Alpha Ring · Road Flow Shader
          </div>
        </div>
      </div>
    </aside>
  );
};
