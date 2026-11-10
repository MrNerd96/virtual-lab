import React, { useState, useRef, useLayoutEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move } from 'lucide-react';

// The microscope used for the haemocytometer practicals (WBC, RBC and platelet counts): a round eyepiece onto the
// 3 mm ruled area of the Neubauer chamber, objective buttons (4x, 10x, 40x, 100x), a stage moved by dragging or with
// the arrow buttons, and a mini-map of the stage position. The ruled area is drawn in a 900 × 900 viewBox and shown in
// an 800 px slide that is scaled for each objective.

export type Objective = 4 | 10 | 40 | 100;
const MAX_PAN = 400;              // stage travel in slide px from the centre: 400 reaches the edge of the slide
// On a counting chamber the stage can go this much further, so students can look around outside the ruled area
const CHAMBER_EXTRA_PAN = 220;
const PX_TO_RULING = 900 / 800;   // ruling units per slide px
const SLIDE_PX = 800;
// Zoom scales: 4x -> 0.7, 10x -> 1.3, 40x -> 5, 100x -> 13. They are for the full-size eyepiece (476 px inside its
// border); a smaller eyepiece, as on a phone, shrinks the slide by the same ratio so that each objective shows the same
// field of view on every screen.
const FULL_EYEPIECE_PX = 476;
export const scaleFor = (z: Objective) => ({ 4: 0.7, 10: 1.3, 40: 5, 100: 13 }[z]);

export interface MicroscopeStageState {
    zoom: Objective; setZoom: (z: Objective) => void;
    position: { x: number; y: number }; setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    scale: number;    // on-screen scale of the slide: the objective's scale times the eyepiece fit
    setFit: (f: number) => void;
    maxPan: number; setMaxPan: (m: number) => void;   // how far the stage may move from the centre, in slide px
    pan: (dx: number, dy: number) => void;
}

// position is the point of the slide (in px from its centre) seen at the centre of the eyepiece
export function useMicroscopeStage(initialPosition?: { x: number; y: number }, initialZoom: Objective = 10): MicroscopeStageState {
    const [zoom, setZoom] = useState<Objective>(initialZoom);
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const [fit, setFit] = useState(1);
    const [maxPan, setMaxPan] = useState(MAX_PAN);
    const scale = scaleFor(zoom) * fit;
    const pan = (dx: number, dy: number) => {
        const speedFactor = 1.5 / scale;
        setPosition(prev => ({
            x: Math.max(-maxPan, Math.min(maxPan, prev.x + (dx * speedFactor))),
            y: Math.max(-maxPan, Math.min(maxPan, prev.y + (dy * speedFactor))),
        }));
    };
    return { zoom, setZoom, position, setPosition, scale, setFit, maxPan, setMaxPan, pan };
}

// Point on the slide, in the 900-unit ruling coordinates, for the slide position that puts it at the eyepiece centre
export const positionFor = (gx: number, gy: number) => ({ x: (gx * SLIDE_PX) / 900 - SLIDE_PX / 2, y: (gy * SLIDE_PX) / 900 - SLIDE_PX / 2 });

// The mini-map also shows a margin of bare chamber floor around the ruling, as far as the stage can go
const MAP_MARGIN = CHAMBER_EXTRA_PAN * PX_TO_RULING;

// Simplified ruling for the stage mini-map: the nine 1 mm squares, the four W squares (16 each, tinted blue) and the
// centre R square (25 medium squares, tinted red)
const ChamberMapRuling = () => {
    const v = (x: number, k: string, c: string, w = 1) => <line key={k} x1={x} y1={0} x2={x} y2={900} stroke={c} strokeWidth={w} vectorEffect="non-scaling-stroke" />;
    const h = (y: number, k: string, c: string, w = 1) => <line key={k} x1={0} y1={y} x2={900} y2={y} stroke={c} strokeWidth={w} vectorEffect="non-scaling-stroke" />;
    const lines: React.ReactNode[] = [];
    for (const c of [0, 600]) for (let i = 1; i < 4; i++) {
        lines.push(<line key={`wv${c}-${i}`} x1={c + i * 75} y1={0} x2={c + i * 75} y2={900} stroke="#94a3b8" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />);
        lines.push(<line key={`wh${c}-${i}`} x1={0} y1={c + i * 75} x2={900} y2={c + i * 75} stroke="#94a3b8" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />);
    }
    for (let i = 1; i < 5; i++) { lines.push(v(300 + i * 60, `rv${i}`, '#64748b', 0.8)); lines.push(h(300 + i * 60, `rh${i}`, '#64748b', 0.8)); }
    return (
        <g>
            {[[0, 0], [600, 0], [0, 600], [600, 600]].map(([x, y]) => <rect key={`w${x}${y}`} x={x} y={y} width={300} height={300} fill="#dbeafe" />)}
            <rect x={300} y={300} width={300} height={300} fill="#fee2e2" />
            {lines}
            {[0, 300, 600, 900].map(p => [v(p, `mv${p}`, '#334155', 1.2), h(p, `mh${p}`, '#334155', 1.2)])}
        </g>
    );
};

// Left part of the screen: objectives, the eyepiece and the stage mini-map. Dragging moves the stage; a tap (a press
// that hardly moves) is passed to onTap with the point under it in ruling coordinates.
export const Eyepiece: React.FC<{
    stage: MicroscopeStageState;
    renderSlide: (zoom: Objective) => React.ReactNode;
    onTap?: (gx: number, gy: number) => void;
    className?: string;
    chamberMap?: boolean;   // draw the Neubauer ruling in the stage mini-map (off for a blood smear)
}> = ({ stage, renderSlide, onTap, className = '', chamberMap = false }) => {
    const { zoom, setZoom, position, setPosition, scale, setFit, setMaxPan } = stage;
    const maxPan = chamberMap ? MAX_PAN + CHAMBER_EXTRA_PAN : MAX_PAN;
    useLayoutEffect(() => { setMaxPan(maxPan); }, [maxPan, setMaxPan]);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const travel = useRef(0);
    const eyeRef = useRef<HTMLDivElement>(null);

    // Keep the field of view the same whatever the eyepiece's size on this screen
    useLayoutEffect(() => {
        const el = eyeRef.current;
        if (!el) return;
        const measure = () => { if (el.clientWidth) setFit(el.clientWidth / FULL_EYEPIECE_PX); };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [setFit]);

    const handlePointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragStart.current = { x: e.clientX, y: e.clientY };
        travel.current = 0;
    };
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragStart.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        travel.current += Math.abs(dx) + Math.abs(dy);
        setPosition(prev => ({
            x: Math.max(-maxPan, Math.min(maxPan, prev.x - dx / scale)),
            y: Math.max(-maxPan, Math.min(maxPan, prev.y - dy / scale)),
        }));
        dragStart.current = { x: e.clientX, y: e.clientY };
    };
    const handlePointerUp = (e: React.PointerEvent) => {
        const wasDrag = dragStart.current === null || travel.current > 6;
        dragStart.current = null;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        if (wasDrag || !onTap || !eyeRef.current) return;
        const r = eyeRef.current.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) > r.width / 2) return;
        const px = SLIDE_PX / 2 + position.x + dx / scale, py = SLIDE_PX / 2 + position.y + dy / scale;
        onTap((px * 900) / SLIDE_PX, (py * 900) / SLIDE_PX);
    };

    return (
        <div
            className={`flex-1 bg-black relative flex items-center justify-center overflow-hidden touch-none cursor-move ${className}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { dragStart.current = null; }}
        >
            {/* Zoom Indicators */}
            <div className="absolute top-4 left-4 z-30 flex gap-2 pointer-events-none">
                {([4, 10, 40, 100] as Objective[]).map((z) => (
                    <button
                        key={z}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all pointer-events-auto
                    ${zoom === z
                                ? 'bg-indigo-600 border-indigo-400 text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}
                  `}
                        onClick={() => setZoom(z)}
                    >
                        {z}x
                    </button>
                ))}
            </div>

            {/* Eyepiece */}
            <div ref={eyeRef} className="relative w-[min(calc(100vw-32px),500px)] h-[min(calc(100vw-32px),500px)] md:w-[500px] md:h-[500px] rounded-full overflow-hidden border-[clamp(7px,2.4vw,12px)] md:border-[12px] border-slate-800 shadow-[0_0_100px_rgba(0,0,0,1)] bg-[#f8fafc] pointer-events-none">
                <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.3)_80%,rgba(0,0,0,0.9)_100%)]"></div>

                {/* SLIDE CONTENT CONTAINER */}
                <div
                    key={zoom}
                    className="absolute w-[800px] h-[800px] origin-center"
                    style={{
                        transform: `translate(calc(-50% + ${-position.x * scale}px), calc(-50% + ${-position.y * scale}px)) scale(${scale})`,
                        left: '50%',
                        top: '50%',
                        willChange: 'transform'
                    }}
                >
                    {renderSlide(zoom)}
                </div>
            </div>

            {/* Mini-map: where the eyepiece is on the slide. With chamberMap it shows the ruling, and the red circle is the
                field of view, so it shrinks as the objective goes up. */}
            <div className={`absolute right-4 md:top-auto md:bottom-4 bg-slate-900/80 rounded border border-slate-700 z-30 pointer-events-none ${chamberMap ? 'top-3 p-1 md:p-2' : 'top-4 p-1.5 md:p-2'}`}>
                <div className={`relative overflow-hidden border ${chamberMap ? 'w-16 h-16 md:w-28 md:h-28 bg-[#f8fafc] border-slate-500' : 'w-11 h-11 md:w-20 md:h-20 bg-slate-800 border-slate-600'}`}>
                    {chamberMap ? (
                        <svg viewBox={`${-MAP_MARGIN} ${-MAP_MARGIN} ${900 + 2 * MAP_MARGIN} ${900 + 2 * MAP_MARGIN}`} className="absolute inset-0 w-full h-full">
                            <ChamberMapRuling />
                            <circle
                                cx={(position.x + MAX_PAN) * PX_TO_RULING}
                                cy={(position.y + MAX_PAN) * PX_TO_RULING}
                                r={Math.max(34, (FULL_EYEPIECE_PX / scaleFor(zoom)) * PX_TO_RULING / 2)}
                                fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={3} vectorEffect="non-scaling-stroke" />
                        </svg>
                    ) : (
                        <div
                            className="absolute w-2.5 h-2.5 md:w-4 md:h-4 border-2 border-red-500 bg-transparent shadow-[0_0_5px_red]"
                            style={{
                                left: `${((position.x + MAX_PAN) / (MAX_PAN * 2)) * 100}%`,
                                top: `${((position.y + MAX_PAN) / (MAX_PAN * 2)) * 100}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        ></div>
                    )}
                </div>
                <div className={`text-[10px] text-center mt-1 text-slate-400 ${chamberMap ? 'hidden md:block' : ''}`}><span className="md:hidden">Stage</span><span className="hidden md:inline">Stage Position</span></div>
            </div>
        </div>
    );
};

// Arrow buttons that move the stage
export const StageControls: React.FC<{ stage: MicroscopeStageState }> = ({ stage }) => (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner flex flex-col items-center gap-2">
        <span className="text-xs font-bold text-slate-500 mb-1">STAGE CONTROLS</span>
        <button
            className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
            onClick={() => stage.pan(0, -50)}
        >
            <ArrowUp className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
            <button
                className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
                onClick={() => stage.pan(-50, 0)}
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-14 h-14 flex items-center justify-center bg-slate-900 rounded-full border border-slate-800">
                <Move className="w-6 h-6 text-slate-600" />
            </div>
            <button
                className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
                onClick={() => stage.pan(50, 0)}
            >
                <ArrowRight className="w-6 h-6" />
            </button>
        </div>
        <button
            className="p-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-white border border-slate-700"
            onClick={() => stage.pan(0, 50)}
        >
            <ArrowDown className="w-6 h-6" />
        </button>
    </div>
);

// --- Neubauer chamber ruling ---
// Shared helper functions for Neubauer chamber grid
export const LINE_THICKNESS = 1; // All lines same thickness

// On a real chamber the ruled lines run on past the edge of the 3 mm ruled area, so every line that reaches the edge
// (0 or 900 in ruling units) is drawn on this far beyond it. The slide SVGs need overflow visible to show it.
export const RULING_OVERHANG = 700;
const ext = (v: number) => (v <= 0 ? -RULING_OVERHANG : v >= 900 ? 900 + RULING_OVERHANG : v);

// Outer border of the ruled area, run on past the edge. (The lines at 300 and 600 that divide it into nine 1 mm
// squares are the centre square's triple lines, drawn by renderCenterDenseGrid; a single line drawn on top of a triple
// line made it look heavier than the others.)
export const RulingFrame = () => (
  <g>
    {[0, 900].map(v => (
      <g key={v}>
        <line x1={v} y1={ext(0)} x2={v} y2={ext(900)} stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
        <line x1={ext(0)} y1={v} x2={ext(900)} y2={v} stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      </g>
    ))}
  </g>
);

// A corner (W) square: 4 x 4 squares. Its 3 inner lines in each direction run on across the neighbouring middle
// squares of the ruling, as on a real chamber: right/left carry the horizontal lines across the square to that side,
// bottom/top carry the vertical lines across the square below/above.
export const render4x4Grid = (x: number, y: number, size: number, extendLines: { top?: boolean, bottom?: boolean, left?: boolean, right?: boolean } = {}) => {
  const lines = [];
  const subSize = size / 4;

  for (let i = 1; i < 4; i++) {
    const xPos = x + i * subSize;
    const yStart = ext(extendLines.top ? y - size : y);
    const yEnd = ext(extendLines.bottom ? y + size * 2 : y + size);
    lines.push(
      <line key={`v-${x}-${y}-${i}`}
        x1={xPos} y1={yStart}
        x2={xPos} y2={yEnd}
        stroke="#64748b" strokeWidth={LINE_THICKNESS} />
    );
  }

  for (let i = 1; i < 4; i++) {
    const yPos = y + i * subSize;
    const xStart = ext(extendLines.left ? x - size : x);
    const xEnd = ext(extendLines.right ? x + size * 2 : x + size);
    lines.push(
      <line key={`h-${x}-${y}-${i}`}
        x1={xStart} y1={yPos}
        x2={xEnd} y2={yPos}
        stroke="#64748b" strokeWidth={LINE_THICKNESS} />
    );
  }
  return <g key={`grid-${x}-${y}`}>{lines}</g>;
};

// Helper to render triple lines (3 parallel lines) - all same thickness
export const renderTripleLine = (x1: number, y1: number, x2: number, y2: number, key: string, isVertical: boolean) => {
  const offset = 1.5; // Spacing between the 3 parallel lines
  const lines = [];

  // Draw all 3 parallel lines
  for (let i = -1; i <= 1; i++) {
    if (isVertical) {
      lines.push(
        <line key={`${key}-${i}`}
          x1={x1 + i * offset} y1={y1}
          x2={x2 + i * offset} y2={y2}
          stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      );
    } else {
      lines.push(
        <line key={`${key}-${i}`}
          x1={x1} y1={y1 + i * offset}
          x2={x2} y2={y2 + i * offset}
          stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      );
    }
  }
  return <g key={key}>{lines}</g>;
};

// Helper to render the dense center grid (5x5 large squares, each with 4x4 subdivision)
export const renderCenterDenseGrid = (centerX: number, centerY: number, centerSize: number, squareSize: number) => {
  const largeSquareSize = centerSize / 5; // 5x5 grid of large squares
  const tinySquareSize = largeSquareSize / 4; // Each large square has 4x4 tiny squares

  const elements = [];

  // (The outlines of the 25 medium squares are the triple lines drawn below; drawing them again here as single lines
  // made the triple lines darker inside the centre than where they run on outside it.)

  // The 3 single lines inside each column and row of medium squares, as on a real chamber, run the whole length of
  // the centre and on across the middle squares above and below (vertical) or to each side (horizontal)
  for (let col = 0; col < 5; col++) {
    for (let sub = 1; sub < 4; sub++) {
      const xPos = centerX + col * largeSquareSize + sub * tinySquareSize;
      elements.push(
        <line key={`v-sub-${col}-${sub}`}
          x1={xPos} y1={ext(centerY - squareSize)}
          x2={xPos} y2={ext(centerY + centerSize + squareSize)}
          stroke="#64748b" strokeWidth={LINE_THICKNESS} />
      );
    }
  }
  for (let row = 0; row < 5; row++) {
    for (let sub = 1; sub < 4; sub++) {
      const yPos = centerY + row * largeSquareSize + sub * tinySquareSize;
      elements.push(
        <line key={`h-sub-${row}-${sub}`}
          x1={ext(centerX - squareSize)} y1={yPos}
          x2={ext(centerX + centerSize + squareSize)} y2={yPos}
          stroke="#64748b" strokeWidth={LINE_THICKNESS} />
      );
    }
  }

  // Draw triple lines - 5 vertical and 5 horizontal lines that extend FULLY through center AND into middle squares
  // These are the lines that divide the 5x5 grid (6 lines total, but we draw 5 internal ones as triple lines)

  // 5 vertical triple lines - extend fully through center (from top to bottom of center square) AND into middle squares
  for (let i = 1; i <= 5; i++) {
    const xPos = centerX + i * largeSquareSize;
    // Full line through center square AND extending into top-middle and bottom-middle
    elements.push(renderTripleLine(xPos, ext(centerY - squareSize), xPos, ext(centerY + centerSize + squareSize), `v-triple-${i}`, true));
  }

  // 5 horizontal triple lines - extend fully through center (from left to right of center square) AND into middle squares
  for (let i = 1; i <= 5; i++) {
    const yPos = centerY + i * largeSquareSize;
    // Full line through center square AND extending into left-middle and right-middle
    elements.push(renderTripleLine(ext(centerX - squareSize), yPos, ext(centerX + centerSize + squareSize), yPos, `h-triple-${i}`, false));
  }

  // Top border triple line - horizontal line at top edge of center square, extends fully through center and into left-middle and right-middle
  const topBorderY = centerY;
  elements.push(renderTripleLine(ext(centerX - squareSize), topBorderY, ext(centerX + centerSize + squareSize), topBorderY, `h-triple-top-border`, false));

  // Left border triple line - vertical line at left edge of center square, extends fully through center and into top-middle and bottom-middle
  const leftBorderX = centerX;
  elements.push(renderTripleLine(leftBorderX, ext(centerY - squareSize), leftBorderX, ext(centerY + centerSize + squareSize), `v-triple-left-border`, true));

  return <g>{elements}</g>;
};

// The whole 3 mm ruled area as in the RBC count: outer border, the lines dividing it into nine 1 mm squares, the
// central square of 25 medium squares in triple lines, and the four corner squares of 16
export const NeubauerRuling = () => {
  const GRID_SIZE = 900;
  const squareSize = GRID_SIZE / 3;
  return (
    <g>
      <RulingFrame />
      {renderCenterDenseGrid(squareSize, squareSize, squareSize, squareSize)}
      {render4x4Grid(0, 0, squareSize, { right: true, bottom: true })}
      {render4x4Grid(squareSize * 2, 0, squareSize, { left: true, bottom: true })}
      {render4x4Grid(0, squareSize * 2, squareSize, { right: true, top: true })}
      {render4x4Grid(squareSize * 2, squareSize * 2, squareSize, { left: true, top: true })}
    </g>
  );
};
