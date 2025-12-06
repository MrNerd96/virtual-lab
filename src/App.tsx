import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Stage } from '@react-three/drei';
import { Muscle3D } from './components/Muscle3D';
import { Oscilloscope } from './components/Oscilloscope';
import { Controls } from './components/Controls';
import { LabAssistant } from './components/LabAssistant';
import { DataPoint } from './types';
import {
  ArrowLeft,
  Activity,
  Droplet,
  Brain,
  Zap,
  Scale,
  ChevronRight,
  FlaskConical,
  Microscope,
  Grid3X3,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ZoomIn,
  ListChecks,
  Timer,
  RefreshCw,
  Dna
} from 'lucide-react';

// --- Simulation Constants ---
const THRESHOLD_VOLTAGE = 2.5;
const MAX_VOLTAGE = 8.0;
const LATENT_PERIOD_BASE = 20; // ms
const CONTRACTION_TIME_BASE = 80; // ms
const RELAXATION_TIME_BASE = 150; // ms
const EXPERIMENT_DURATION = 500; // ms

// --- Shared Types ---
type ViewState = 'home' | 'amphibian' | 'hematology' | 'twitch' | 'load' | 'fatigue' | 'wbc-count' | 'rbc-count' | 'dlc-count';

// --- Shared Components ---

const MenuCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
  disabled?: boolean;
}> = ({ title, description, icon, onClick, colorClass, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group overflow-hidden p-6 rounded-2xl border transition-all duration-300 text-left w-full
      ${disabled
        ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
        : `bg-slate-800 border-slate-700 hover:border-slate-500 hover:shadow-2xl hover:shadow-${colorClass}-500/20 hover:-translate-y-1`
      }
    `}
  >
    <div className={`
      absolute top-0 right-0 p-32 opacity-5 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150
      bg-${colorClass}-500
    `} />

    <div className="relative z-10 flex flex-col h-full">
      <div className={`p-3 w-fit rounded-xl mb-4 bg-slate-900/80 text-${colorClass}-400 ring-1 ring-slate-700`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>

      {!disabled && (
        <div className={`mt-auto pt-6 flex items-center text-sm font-semibold text-${colorClass}-400 opacity-0 group-hover:opacity-100 transition-opacity`}>
          Enter Lab <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      )}
    </div>
  </button>
);

// --- REUSABLE MICROSCOPE STAGE ---

interface MicroscopeStageProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  renderSlide: (zoom: number) => React.ReactNode;
  controls?: React.ReactNode;
  infoPanel: React.ReactNode;
}

const MicroscopeStage: React.FC<MicroscopeStageProps> = ({
  title, subtitle, onBack, renderSlide, controls, infoPanel
}) => {
  const [zoom, setZoom] = useState<10 | 40 | 100>(10);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<'intro' | 'microscope'>('intro');

  // Pan limits vary by zoom slightly for feel, but keeping simple here
  const MAX_PAN = 400;

  const handlePan = (dx: number, dy: number) => {
    // Move slower when zoomed in
    const speedFactor = zoom === 100 ? 0.2 : zoom === 40 ? 0.5 : 1;
    setPosition(prev => ({
      x: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.x + (dx * speedFactor))),
      y: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.y + (dy * speedFactor)))
    }));
  };

  if (step === 'intro') {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="flex items-center gap-4 px-6 py-4 bg-slate-900 border-b border-slate-800">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{title}</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
            <Microscope className="w-16 h-16 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 max-w-md mb-8">{subtitle}</p>
          <button
            onClick={() => setStep('microscope')}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-2"
          >
            <Microscope className="w-5 h-5" />
            Place Slide & Observe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-slate-400 text-xs">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Left: Microscope View */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {/* Zoom Indicators */}
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            {[10, 40, 100].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z as 10 | 40 | 100)}
                className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
                    ${zoom === z
                    ? 'bg-indigo-600 border-indigo-400 text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}
                  `}
              >
                {z}x
              </button>
            ))}
          </div>

          {/* Eyepiece */}
          <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full overflow-hidden border-[12px] border-slate-800 shadow-[0_0_100px_rgba(0,0,0,1)] bg-[#eef2ff]">
            <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.3)_80%,rgba(0,0,0,0.9)_100%)]"></div>
            {/* Crosshair Removed as requested */}

            {/* SLIDE CONTENT CONTAINER */}
            <div
              className="absolute w-[900px] h-[900px] origin-center transition-transform duration-300 ease-out will-change-transform"
              style={{
                transform: `translate(calc(-50% + ${-position.x}px), calc(-50% + ${-position.y}px)) scale(${zoom === 10 ? 0.7 : zoom === 40 ? 1.5 : 3})`,
                left: '50%',
                top: '50%'
              }}
            >
              {renderSlide(zoom)}
            </div>
          </div>

          {/* Mini-map */}
          <div className="absolute bottom-4 right-4 bg-slate-900/80 p-2 rounded border border-slate-700 z-30">
            <div className="w-20 h-20 bg-slate-800 relative border border-slate-600 overflow-hidden">
              <div
                className="absolute w-4 h-4 border-2 border-red-500 bg-transparent shadow-[0_0_5px_red]"
                style={{
                  left: `${((position.x + MAX_PAN) / (MAX_PAN * 2)) * 100}%`,
                  top: `${((position.y + MAX_PAN) / (MAX_PAN * 2)) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              ></div>
            </div>
            <div className="text-[10px] text-center mt-1 text-slate-400">Stage Position</div>
          </div>
        </div>

        {/* Right: Controls Panel */}
        <div className="bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 w-full lg:w-96 shrink-0 z-20 shadow-xl overflow-y-auto">
          {infoPanel}

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mb-1">STAGE CONTROLS</span>
            <button
              className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
              onClick={() => handlePan(0, -50)}
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              <button
                className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
                onClick={() => handlePan(-50, 0)}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="w-14 h-14 flex items-center justify-center bg-slate-900 rounded-full border border-slate-800">
                <Move className="w-6 h-6 text-slate-600" />
              </div>
              <button
                className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
                onClick={() => handlePan(50, 0)}
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
            <button
              className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
              onClick={() => handlePan(0, 50)}
            >
              <ArrowDown className="w-6 h-6" />
            </button>
          </div>

          {controls}
        </div>
      </main>
    </div>
  );
};

// --- HEMATOLOGY EXPERIMENTS ---

// 1. WBC Experiment
const WBCExperiment: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [cells] = useState(() => {
    // Generate WBCs in corners (Neubauer: 4 corners are for WBC)
    // Coords: 0-900 grid.
    // Corners are: 0-300 (TL), 600-900 (TR), 0-300 (BL), 600-900 (BR)
    const newCells: { id: number, x: number, y: number }[] = [];
    const GRID_SIZE = 900;
    const cornerSize = 300;
    const corners = [
      { x: 0, y: 0 }, { x: 600, y: 0 },
      { x: 0, y: 600 }, { x: 600, y: 600 }
    ];
    let id = 0;
    corners.forEach(c => {
      for (let i = 0; i < 150; i++) {
        newCells.push({
          id: id++,
          x: c.x + Math.random() * (cornerSize - 20) + 10,
          y: c.y + Math.random() * (cornerSize - 20) + 10
        });
      }
    });
    return newCells;
  });

  // Helper to render explicit 4x4 grid lines for a 300x300 box
  const render4x4Grid = (offsetX: number, offsetY: number) => {
    // 300px box / 4 = 75px spacing
    const lines = [];
    // Vertical lines
    for (let i = 1; i < 4; i++) {
      lines.push(<line key={`v-${offsetX}-${offsetY}-${i}`} x1={offsetX + i * 75} y1={offsetY} x2={offsetX + i * 75} y2={offsetY + 300} stroke="#64748b" strokeWidth="1" />);
    }
    // Horizontal lines
    for (let i = 1; i < 4; i++) {
      lines.push(<line key={`h-${offsetX}-${offsetY}-${i}`} x1={offsetX} y1={offsetY + i * 75} x2={offsetX + 300} y2={offsetY + i * 75} stroke="#64748b" strokeWidth="1" />);
    }
    return (
      <g>
        <rect x={offsetX} y={offsetY} width="300" height="300" fill="none" />
        {lines}
      </g>
    );
  };

  return (
    <MicroscopeStage
      title="WBC Count (TLC)"
      subtitle="Total Leukocyte Count • Neubauer Chamber"
      onBack={onBack}
      infoPanel={
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-red-400" /> Counting Rules
          </h3>
          <p className="text-sm text-slate-400 mb-2">
            Count cells in the <span className="text-white font-bold">4 Corner Squares</span> (W).
          </p>
          <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
            <li>Each corner is a 4x4 Grid.</li>
            <li>Count cells in the 16 large squares.</li>
            <li>Include cells on Top & Left lines.</li>
          </ul>
        </div>
      }
      renderSlide={(zoom) => (
        <div className="relative w-full h-full bg-[#f8fafc]">
          {/* Neubauer Grid - 900x900 coordinate system */}
          <svg width="100%" height="100%" viewBox="0 0 900 900" className="opacity-90">
            {/* Main Dividers (Triple lines simulated by thick stroke) */}
            <line x1="300" y1="0" x2="300" y2="900" stroke="#334155" strokeWidth="4" />
            <line x1="600" y1="0" x2="600" y2="900" stroke="#334155" strokeWidth="4" />
            <line x1="0" y1="300" x2="900" y2="300" stroke="#334155" strokeWidth="4" />
            <line x1="0" y1="600" x2="900" y2="600" stroke="#334155" strokeWidth="4" />

            {/* The 4 WBC Corner Areas - Explicit 4x4 Grid (No sub-pixels) */}
            {/* Top Left */}
            {render4x4Grid(0, 0)}
            <text x="150" y="150" fill="#94a3b8" fontSize="80" textAnchor="middle" opacity="0.3" pointerEvents="none">W</text>

            {/* Top Right */}
            {render4x4Grid(600, 0)}
            <text x="750" y="150" fill="#94a3b8" fontSize="80" textAnchor="middle" opacity="0.3" pointerEvents="none">W</text>

            {/* Bottom Left */}
            {render4x4Grid(0, 600)}
            <text x="150" y="750" fill="#94a3b8" fontSize="80" textAnchor="middle" opacity="0.3" pointerEvents="none">W</text>

            {/* Bottom Right */}
            {render4x4Grid(600, 600)}
            <text x="750" y="750" fill="#94a3b8" fontSize="80" textAnchor="middle" opacity="0.3" pointerEvents="none">W</text>

            {/* Center Square (RBC) - Just a blank placeholder with 'RBC' text, NO GRID to confuse user */}
            <rect x="300" y="300" width="300" height="300" fill="#f1f5f9" />
            <text x="450" y="450" fill="#94a3b8" fontSize="60" textAnchor="middle" opacity="0.3">RBC AREA</text>
          </svg>

          {/* Cells */}
          {cells.map(c => (
            <div
              key={c.id}
              className="absolute rounded-full bg-indigo-700 shadow-sm border border-indigo-900"
              style={{
                left: c.x, top: c.y,
                width: zoom === 10 ? 4 : 8,
                height: zoom === 10 ? 4 : 8,
              }}
            />
          ))}
        </div>
      )}
    />
  );
};

// 2. RBC Experiment
const RBCExperiment: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [cells] = useState(() => {
    // Generate RBCs in Center Square (Neubauer: Center is for RBC)
    const newCells: { id: number, x: number, y: number }[] = [];
    const GRID_SIZE = 800;
    const centerStart = GRID_SIZE / 3;
    const centerSize = GRID_SIZE / 3;

    let id = 0;
    // RBCs are very dense. Generate 100+ in the center grid.
    for (let i = 0; i < 120; i++) {
      newCells.push({
        id: id++,
        x: centerStart + Math.random() * (centerSize - 10) + 5,
        y: centerStart + Math.random() * (centerSize - 10) + 5
      });
    }
    return newCells;
  });

  return (
    <MicroscopeStage
      title="RBC Count"
      subtitle="Total Erythrocyte Count • Center Square"
      onBack={onBack}
      infoPanel={
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Droplet className="w-4 h-4 text-pink-400" /> Counting Rules
          </h3>
          <p className="text-sm text-slate-400 mb-2">
            Count cells in the <span className="text-white font-bold">Center Square</span> (R).
            Specifically the 4 corners and 1 central square within the main center grid.
          </p>
        </div>
      }
      renderSlide={(zoom) => (
        <div className="relative w-full h-full">
          <svg width="100%" height="100%" viewBox="0 0 800 800" className="opacity-70">
            {/* Simplified Grid for Context */}
            <line x1="266" y1="0" x2="266" y2="800" stroke="#334155" strokeWidth="4" />
            <line x1="533" y1="0" x2="533" y2="800" stroke="#334155" strokeWidth="4" />
            <line x1="0" y1="266" x2="800" y2="266" stroke="#334155" strokeWidth="4" />
            <line x1="0" y1="533" x2="800" y2="533" stroke="#334155" strokeWidth="4" />

            {/* Detailed Central Grid for RBC */}
            <defs>
              {/* Very fine grid for RBC area - Unique ID */}
              <pattern id="rbc_tiny_grid" width="13.3" height="13.3" patternUnits="userSpaceOnUse">
                <path d="M 13.3 0 L 0 0 0 13.3" fill="none" stroke="#64748b" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect x="266" y="266" width="266" height="266" fill="url(#rbc_tiny_grid)" stroke="#334155" strokeWidth="2" />

            <text x="400" y="400" fill="#94a3b8" fontSize="80" textAnchor="middle" opacity="0.2">RBC AREA</text>
          </svg>
          {/* RBCs - Small red dots */}
          {cells.map(c => (
            <div
              key={c.id}
              className="absolute rounded-full bg-red-500/80 shadow-sm"
              style={{
                left: c.x, top: c.y,
                width: zoom === 100 ? 6 : 4,
                height: zoom === 100 ? 6 : 4,
                boxShadow: '0 0 2px rgba(239, 68, 68, 0.4)'
              }}
            />
          ))}
        </div>
      )}
    />
  );
};

// 3. DLC Experiment
const DLCExperiment: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // DLC Logic: Blood smear background. Random cells placed around.
  // User pans to find them and clicks counters.
  type CellType = 'Neutrophil' | 'Lymphocyte' | 'Monocyte' | 'Eosinophil' | 'Basophil';

  const [counts, setCounts] = useState<Record<CellType, number>>({
    Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0
  });

  const increment = (type: CellType) => setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
  const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);

  // Generate random cells on a "smear"
  const [cells] = useState(() => {
    const types: CellType[] = ['Neutrophil', 'Neutrophil', 'Neutrophil', 'Lymphocyte', 'Lymphocyte', 'Monocyte', 'Eosinophil', 'Basophil'];
    const newCells = [];
    for (let i = 0; i < 40; i++) {
      newCells.push({
        id: i,
        x: Math.random() * 700 + 50,
        y: Math.random() * 700 + 50,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    return newCells;
  });

  const renderCell = (type: CellType, zoom: number) => {
    const size = zoom === 100 ? 40 : zoom === 40 ? 20 : 8;
    // Simple CSS art for cells
    switch (type) {
      case 'Neutrophil': // Multi-lobed nucleus
        return <div className="rounded-full bg-pink-200 flex items-center justify-center overflow-hidden border border-pink-300" style={{ width: size, height: size }}>
          <div className="w-1/2 h-1/2 bg-purple-800 rounded-full transform translate-x-1"></div>
          <div className="w-1/2 h-1/2 bg-purple-800 rounded-full transform -translate-x-1"></div>
          <div className="w-1/3 h-1/3 bg-purple-800 rounded-full absolute"></div>
        </div>;
      case 'Lymphocyte': // Large round nucleus
        return <div className="rounded-full bg-pink-200 flex items-center justify-center border border-pink-300" style={{ width: size, height: size }}>
          <div className="w-4/5 h-4/5 bg-purple-900 rounded-full"></div>
        </div>;
      case 'Monocyte': // Kidney bean nucleus
        return <div className="rounded-full bg-pink-200 flex items-center justify-center border border-pink-300" style={{ width: size * 1.2, height: size * 1.2 }}>
          <div className="w-3/5 h-3/5 bg-purple-800 rounded-full" style={{ borderRadius: '40% 60% 60% 40% / 40% 50% 50% 40%' }}></div>
        </div>;
      case 'Eosinophil': // Red granules
        return <div className="rounded-full bg-red-100 flex items-center justify-center border border-pink-300 relative overflow-hidden" style={{ width: size, height: size }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle,red_1px,transparent_1px)] bg-[size:4px_4px]"></div>
          <div className="w-1/2 h-1/2 bg-purple-800 rounded-full opacity-50"></div>
        </div>;
      case 'Basophil': // Blue granules
        return <div className="rounded-full bg-blue-100 flex items-center justify-center border border-pink-300 relative overflow-hidden" style={{ width: size, height: size }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle,blue_1px,transparent_1px)] bg-[size:4px_4px]"></div>
          <div className="w-1/2 h-1/2 bg-purple-800 rounded-full opacity-50"></div>
        </div>;
    }
  };

  return (
    <MicroscopeStage
      title="DLC Count"
      subtitle="Differential Leucocyte Count • Blood Smear"
      onBack={onBack}
      infoPanel={
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white">Cell Counter</h3>
            <span className="text-xl font-mono text-green-400">{total} / 100</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(counts) as CellType[]).map(type => (
              <button
                key={type}
                onClick={() => increment(type)}
                className="flex justify-between items-center p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs border border-slate-600"
              >
                <span className="text-slate-200">{type}</span>
                <span className="bg-slate-900 px-2 py-0.5 rounded text-indigo-400 font-mono">{counts[type]}</span>
              </button>
            ))}
          </div>
        </div>
      }
      renderSlide={(zoom) => (
        <div className="relative w-full h-full bg-[#ffeef2]">
          {/* Smear Texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,#ec4899_1px,transparent_1px)] bg-[size:20px_20px]"></div>

          {/* Cells */}
          {cells.map(c => (
            <div key={c.id} className="absolute" style={{ left: c.x, top: c.y }}>
              {renderCell(c.type, zoom)}
            </div>
          ))}
          {/* Some random RBCs for background noise */}
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={`rbc-${i}`}
              className="absolute rounded-full bg-red-300/40"
              style={{
                left: Math.random() * 800,
                top: Math.random() * 800,
                width: zoom === 100 ? 6 : 3,
                height: zoom === 100 ? 6 : 3
              }}
            />
          ))}
        </div>
      )}
    />
  );
};


// --- AMPHIBIAN EXPERIMENTS ---

// 4. Twitch Experiment (Existing & Refined)
// Moved logic to a hook or separate component for cleaner App.tsx but sticking to file structure
// I'll make a generic 'MuscleLab' component to handle Twitch, Load, Fatigue variations.

interface MuscleLabProps {
  mode: 'twitch' | 'load' | 'fatigue';
  title: string;
  subtitle: string;
  onBack: () => void;
}

const MuscleLab: React.FC<MuscleLabProps> = ({ mode, title, subtitle, onBack }) => {
  const [voltage, setVoltage] = useState(3.5);
  const [load, setLoad] = useState(0); // For Load Experiment (grams)
  const [fatigueLevel, setFatigueLevel] = useState(0); // For Fatigue (0 to 1)
  const [stimulusCount, setStimulusCount] = useState(0);

  const [data, setData] = useState<DataPoint[]>([]);
  const [isStimulating, setIsStimulating] = useState(false);
  const [contractionLevel, setContractionLevel] = useState(0);
  const [lastPeakForce, setLastPeakForce] = useState(0);

  // Auto-stimulate for fatigue
  const [autoStimulate, setAutoStimulate] = useState(false);

  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Physics Logic
  const calculateParameters = (v: number, l: number, f: number) => {
    // Base contraction (Hill's-ish)
    let maxForce = v < THRESHOLD_VOLTAGE ? 0 : (v >= MAX_VOLTAGE ? 10 : 10 * ((v - THRESHOLD_VOLTAGE) / (MAX_VOLTAGE - THRESHOLD_VOLTAGE)));

    // Effect of Load: Force (Height) decreases as Load increases
    // Work = Force * Distance. Here we simulate Height.
    // If Load > MaxForce, height is 0 (Isometric).
    // Simplified: Height decreases linearly with load.
    if (mode === 'load') {
      maxForce = Math.max(0, maxForce - (l * 0.1));
    }

    // Effect of Fatigue: Force decreases, Relaxation time increases
    if (mode === 'fatigue') {
      maxForce = maxForce * (1 - (f * 0.8)); // Can drop to 20%
    }

    return {
      force: maxForce,
      latent: LATENT_PERIOD_BASE + (l * 0.5), // Load increases latent period slightly
      contraction: CONTRACTION_TIME_BASE,
      relaxation: RELAXATION_TIME_BASE + (f * 100) // Fatigue increases relaxation time
    };
  };

  const runSimulation = (timestamp: number, params: { force: number, latent: number, contraction: number, relaxation: number }) => {
    const elapsed = timestamp - startTimeRef.current;
    const totalDuration = params.latent + params.contraction + params.relaxation;

    if (elapsed > totalDuration + 50) {
      setIsStimulating(false);
      setContractionLevel(0);

      // Fatigue Loop Logic
      if (mode === 'fatigue' && autoStimulate && fatigueLevel < 1) {
        // Trigger next immediately
        handleStimulate();
      }
      return;
    }

    let currentForce = 0;

    if (elapsed < params.latent) {
      currentForce = 0;
    } else if (elapsed < params.latent + params.contraction) {
      const progress = (elapsed - params.latent) / params.contraction;
      currentForce = params.force * Math.sin(progress * (Math.PI / 2));
    } else if (elapsed < params.latent + params.contraction + params.relaxation) {
      const progress = (elapsed - (params.latent + params.contraction)) / params.relaxation;
      currentForce = params.force * (1 - Math.sin(progress * (Math.PI / 2)));
    }

    // Add noise
    const displayForce = Math.max(0, currentForce + (Math.random() - 0.5) * 0.1);

    setData(prev => {
      // Optimizing data points: only add if time changed enough
      const lastTime = prev.length > 0 ? prev[prev.length - 1].time : -1;
      if (elapsed - lastTime >= 5) {
        return [...prev, { time: Math.floor(elapsed), force: displayForce, voltage }];
      }
      return prev;
    });

    setContractionLevel(currentForce / 10);
    animationRef.current = requestAnimationFrame((t) => runSimulation(t, params));
  };

  const handleStimulate = () => {
    // If already stimulating, ignore unless in fatigue mode (summation/tetanus potential, but keeping simple for now)
    if (isStimulating && mode !== 'fatigue') return;

    // Fatigue logic: increase fatigue level
    let currentFatigue = fatigueLevel;
    if (mode === 'fatigue') {
      setStimulusCount(c => c + 1);
      // Treppe first (negative fatigue?), then fatigue
      // Simplifying: Fatigue starts adding up after 5 stimuli
      if (stimulusCount > 5) {
        currentFatigue = Math.min(1, fatigueLevel + 0.05);
        setFatigueLevel(currentFatigue);
      }
    }

    const params = calculateParameters(voltage, load, currentFatigue);
    setLastPeakForce(params.force);

    // Clear data only if simple twitch
    if (mode === 'twitch' || mode === 'load') {
      setData([]);
    } else if (mode === 'fatigue') {
      // Keep data, shift x-axis maybe? Or just clear if it gets too full?
      // For simple visualization, let's clear if > 1000 pts
      if (data.length > 500) setData([]);
    }

    setIsStimulating(true);
    startTimeRef.current = performance.now();
    cancelAnimationFrame(animationRef.current); // Cancel previous
    animationRef.current = requestAnimationFrame((t) => runSimulation(t, params));
  };

  const handleReset = () => {
    setData([]);
    setContractionLevel(0);
    setIsStimulating(false);
    setFatigueLevel(0);
    setStimulusCount(0);
    setAutoStimulate(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 z-10 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">{title}</h1>
            <p className="text-slate-400 text-xs">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
        <section className="flex-none lg:flex-1 flex flex-col min-w-0 border-r border-slate-800">
          <div className="relative h-[250px] lg:h-auto lg:flex-1 bg-gradient-to-b from-slate-800 to-slate-900 shrink-0">
            <Canvas shadows camera={{ position: [4, 2, 5], fov: 45 }}>
              <Environment preset="city" />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} castShadow />
              <Stage intensity={0.5} environment="city" adjustCamera={false}>
                <Muscle3D contraction={contractionLevel} />
              </Stage>
              <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
              <gridHelper args={[10, 10, 0x444444, 0x222222]} position={[0, -2.5, 0]} />
            </Canvas>
          </div>

          {/* Enhanced Controls */}
          <div className="p-4 lg:p-6 bg-slate-900 border-t border-slate-800 shrink-0">
            <Controls
              voltage={voltage}
              setVoltage={setVoltage}
              onStimulate={handleStimulate}
              onReset={handleReset}
              isStimulating={isStimulating && mode !== 'fatigue'} // Allow clicking in fatigue mode to stack?
            />

            {/* Extra Controls based on Mode */}
            {mode === 'load' && (
              <div className="mt-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" /> Afterload Weight
                  </label>
                  <span className="text-cyan-400 font-mono">{load}g</span>
                </div>
                <input
                  type="range" min="0" max="50" step="5" value={load}
                  onChange={(e) => setLoad(Number(e.target.value))}
                  className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0g</span>
                  <span>50g</span>
                </div>
              </div>
            )}

            {mode === 'fatigue' && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => {
                    if (autoStimulate) {
                      setAutoStimulate(false);
                    } else {
                      setAutoStimulate(true);
                      handleStimulate();
                    }
                  }}
                  className={`flex-1 py-3 rounded-lg font-bold border transition-colors flex items-center justify-center gap-2
                            ${autoStimulate
                      ? 'bg-red-900/30 border-red-800 text-red-400 animate-pulse'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}
                        `}
                >
                  {autoStimulate ? <Timer className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {autoStimulate ? 'Stop Auto-Stim' : 'Start Fatigue Run'}
                </button>
                <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-center min-w-[100px]">
                  <span className="text-xs text-slate-500 uppercase">Stimuli</span>
                  <span className="text-xl font-mono text-white">{stimulusCount}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="w-full lg:w-[450px] flex flex-col bg-slate-950 border-l border-slate-800 shrink-0">
          <div className="h-[250px] lg:h-[350px] p-4 border-b border-slate-800 flex flex-col shrink-0">
            <div className="flex justify-between items-end mb-2 shrink-0">
              <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Oscilloscope</h2>
              {mode === 'load' && lastPeakForce > 0 && (
                <span className="text-xs text-cyan-400">Work: {(lastPeakForce * 1.5).toFixed(1)} g-mm</span>
              )}
            </div>
            <div className="flex-1 min-h-0 w-full">
              <Oscilloscope data={data} currentVoltage={voltage} />
            </div>
          </div>
          <div className="h-[350px] lg:h-auto lg:flex-1 p-4 bg-slate-900 flex flex-col min-h-0">
            <LabAssistant voltage={voltage} lastPeakForce={lastPeakForce} />
          </div>
        </section>
      </main>
    </div>
  );
};


// --- MAIN APP NAVIGATION ---

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');

  switch (currentView) {
    case 'home':
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans">
          <div className="max-w-5xl w-full space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4">
                <FlaskConical className="w-10 h-10 text-blue-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                BioSim <span className="text-blue-500">Laboratory</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Virtual Physiology & Hematology Suite.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MenuCard
                title="Hematology"
                description="WBC, RBC, and Differential Counts using Virtual Microscopy."
                icon={<Droplet className="w-8 h-8" />}
                colorClass="red"
                onClick={() => setCurrentView('hematology')}
              />
              <MenuCard
                title="Amphibian"
                description="Skeletal muscle properties: Twitch, Load, Fatigue."
                icon={<Activity className="w-8 h-8" />}
                colorClass="green"
                onClick={() => setCurrentView('amphibian')}
              />
              <MenuCard
                title="Mammalian"
                description="Advanced cardiovascular dynamics."
                icon={<Brain className="w-8 h-8" />}
                colorClass="indigo"
                onClick={() => { }}
                disabled={true}
              />
            </div>
            <div className="text-center text-slate-600 text-sm mt-12">© 2024 BioSim Interactive</div>
          </div>
        </div>
      );

    // Sub-Menus
    case 'amphibian':
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans relative">
          <button onClick={() => setCurrentView('home')} className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> <span>Back</span>
          </button>
          <div className="max-w-4xl w-full space-y-8">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Amphibian Physiology</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard
                title="Simple Muscle Twitch"
                description="Threshold, Latent Period, and Contraction Kinetics."
                icon={<Zap className="w-8 h-8" />}
                colorClass="yellow"
                onClick={() => setCurrentView('twitch')}
              />
              <MenuCard
                title="Effect of Load"
                description="Afterload's effect on Work Done and Velocity."
                icon={<Scale className="w-8 h-8" />}
                colorClass="cyan"
                onClick={() => setCurrentView('load')}
              />
              <MenuCard
                title="Genesis of Fatigue"
                description="Repeated stimulation, Treppe, and Muscle Fatigue."
                icon={<Timer className="w-8 h-8" />}
                colorClass="orange"
                onClick={() => setCurrentView('fatigue')}
              />
            </div>
          </div>
        </div>
      );

    case 'hematology':
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans relative">
          <button onClick={() => setCurrentView('home')} className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> <span>Back</span>
          </button>
          <div className="max-w-4xl w-full space-y-8">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Hematology Lab</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard
                title="WBC Count (TLC)"
                description="Total Leukocyte Count with Neubauer Chamber."
                icon={<Grid3X3 className="w-8 h-8" />}
                colorClass="red"
                onClick={() => setCurrentView('wbc-count')}
              />
              <MenuCard
                title="RBC Count"
                description="Total Erythrocyte Count (Center Square)."
                icon={<Dna className="w-8 h-8" />}
                colorClass="pink"
                onClick={() => setCurrentView('rbc-count')}
              />
              <MenuCard
                title="DLC Count"
                description="Differential Leucocyte Count on Blood Smear."
                icon={<ListChecks className="w-8 h-8" />}
                colorClass="purple"
                onClick={() => setCurrentView('dlc-count')}
              />
            </div>
          </div>
        </div>
      );

    // Experiments
    case 'twitch': return <MuscleLab mode="twitch" title="Simple Muscle Twitch" subtitle="Amphibian / Gastrocnemius" onBack={() => setCurrentView('amphibian')} />;
    case 'load': return <MuscleLab mode="load" title="Effect of Load" subtitle="Amphibian / Gastrocnemius" onBack={() => setCurrentView('amphibian')} />;
    case 'fatigue': return <MuscleLab mode="fatigue" title="Genesis of Fatigue" subtitle="Amphibian / Gastrocnemius" onBack={() => setCurrentView('amphibian')} />;
    case 'wbc-count': return <WBCExperiment onBack={() => setCurrentView('hematology')} />;
    case 'rbc-count': return <RBCExperiment onBack={() => setCurrentView('hematology')} />;
    case 'dlc-count': return <DLCExperiment onBack={() => setCurrentView('hematology')} />;

    default: return null;
  }
};

export default App;