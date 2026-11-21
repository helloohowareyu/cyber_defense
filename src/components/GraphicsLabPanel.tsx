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
      className={`fixed top-16 z-30 pointer-events-auto cyber-panel rounded-2xl w-[290px] p-4 text-xs transition-all ${
        shopOpen ? 'right-[330px]' : 'right-12'
      }`}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display font-bold text-sm text-white">Lab Grafika (CIF65116)</h2>
        </div>
        <button
          type="button"
          aria-label="Tutup Lab Grafika"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3.5">
        {/* Bahan Kajian 5: Projection Matrix */}
        <div>
          <div className="text-slate-400 mb-1.5">Proyeksi Kamera (Bahan Kajian 5)</div>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => onSetProjection('perspective')}
              className={`py-1.5 rounded font-medium cursor-pointer transition-colors ${
                graphics.projection === 'perspective'
                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Perspective
            </button>
            <button
              type="button"
              onClick={() => onSetProjection('orthographic')}
              className={`py-1.5 rounded font-medium cursor-pointer transition-colors ${
                graphics.projection === 'orthographic'
                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Orthographic
            </button>
          </div>
        </div>

        {/* Camera Presets */}
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>Sudut Pandang Kamera</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSetCameraPreset(p.id)}
                className={`py-1.5 rounded border text-center cursor-pointer transition-colors ${
                  graphics.cameraPreset === p.id
                    ? 'bg-sky-900/90 border-cyan-400 text-white font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Feature Toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Wireframe Primitives (VBO)</span>
            <input
              type="checkbox"
              checked={graphics.wireframe}
              onChange={(e) => onSetWireframe(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Shadow Mapping (PCFSoft)</span>
            <input
              type="checkbox"
              checked={graphics.shadowsEnabled}
              onChange={(e) => onSetShadows(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Alpha Blending Range Rings</span>
            <input
              type="checkbox"
              checked={graphics.showAllRangeRings}
              onChange={(e) => onSetShowAllRings(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Live WebGL Pipeline Metrics */}
        <div className="pt-2.5 border-t border-slate-800 space-y-1 text-[11px] font-mono-tabular text-slate-400">
          <div className="flex justify-between">
            <span>Segitiga Dirender</span>
            <span className="text-cyan-300">{graphics.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Draw Calls</span>
            <span className="text-white">{graphics.drawCalls}</span>
          </div>
          <div className="flex justify-between">
            <span>Custom GLSL Shaders</span>
            <span className="text-emerald-400">4 Aktif</span>
          </div>
          <div className="text-[10px] text-slate-500 pt-1 leading-relaxed">
            Blinn-Phong Fresnel · Scrolling UV Additive Laser · Barycentric Alpha Ring · Road Flow Shader
          </div>
        </div>
      </div>
    </aside>
  );
};
