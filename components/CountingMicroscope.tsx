import React, { useState, useRef, useLayoutEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move } from 'lucide-react';

// The microscope used for the haemocytometer practicals (WBC, RBC and platelet counts): a round eyepiece onto the
// 3 mm ruled area of the Neubauer chamber, objective buttons (4x, 10x, 40x, 100x), a stage moved by dragging or with
// the arrow buttons, and a mini-map of the stage position. The ruled area is drawn in a 900 × 900 viewBox and shown in
// an 800 px slide that is scaled for each objective.

export type Objective = 4 | 10 | 40 | 100;
const MAX_PAN = 400;
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
    pan: (dx: number, dy: number) => void;
}

// position is the point of the slide (in px from its centre) seen at the centre of the eyepiece
export function useMicroscopeStage(initialPosition?: { x: number; y: number }, initialZoom: Objective = 10): MicroscopeStageState {
    const [zoom, setZoom] = useState<Objective>(initialZoom);
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const [fit, setFit] = useState(1);
    const scale = scaleFor(zoom) * fit;
    const pan = (dx: number, dy: number) => {
        const speedFactor = 1.5 / scale;
        setPosition(prev => ({
            x: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.x + (dx * speedFactor))),
            y: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.y + (dy * speedFactor))),
        }));
    };
    return { zoom, setZoom, position, setPosition, scale, setFit, pan };
}

// Point on the slide, in the 900-unit ruling coordinates, for the slide position that puts it at the eyepiece centre
export const positionFor = (gx: number, gy: number) => ({ x: (gx * SLIDE_PX) / 900 - SLIDE_PX / 2, y: (gy * SLIDE_PX) / 900 - SLIDE_PX / 2 });

// Left part of the screen: objectives, the eyepiece and the stage mini-map. Dragging moves the stage; a tap (a press
// that hardly moves) is passed to onTap with the point under it in ruling coordinates.
export const Eyepiece: React.FC<{
    stage: MicroscopeStageState;
    renderSlide: (zoom: Objective) => React.ReactNode;
    onTap?: (gx: number, gy: number) => void;
    className?: string;
}> = ({ stage, renderSlide, onTap, className = '' }) => {
    const { zoom, setZoom, position, setPosition, scale, setFit } = stage;
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
            x: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.x - dx / scale)),
            y: Math.max(-MAX_PAN, Math.min(MAX_PAN, prev.y - dy / scale)),
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
            <div ref={eyeRef} className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full overflow-hidden border-[12px] border-slate-800 shadow-[0_0_100px_rgba(0,0,0,1)] bg-[#eef2ff] pointer-events-none">
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

            {/* Mini-map */}
            <div className="absolute bottom-4 right-4 bg-slate-900/80 p-2 rounded border border-slate-700 z-30 pointer-events-none">
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

export const render4x4Grid = (x: number, y: number, size: number, extendLines: { top?: boolean, bottom?: boolean, left?: boolean, right?: boolean } = {}) => {
  const lines = [];
  const subSize = size / 4;

  // Vertical lines - 3 internal lines (all should extend if needed)
  for (let i = 1; i < 4; i++) {
    const xPos = x + i * subSize;
    let yStart = y;
    let yEnd = y + size;

    // Extend ALL 3 vertical lines into middle squares if needed
    if (extendLines.left) {
      yStart = y - size; // Extend to left middle square
    }
    if (extendLines.right) {
      yEnd = y + size * 2; // Extend to right middle square
    }

    lines.push(
      <line key={`v-${x}-${y}-${i}`}
        x1={xPos} y1={yStart}
        x2={xPos} y2={yEnd}
        stroke="#64748b" strokeWidth={LINE_THICKNESS} />
    );
  }

  // Horizontal lines - 3 internal lines (all should extend if needed)
  for (let i = 1; i < 4; i++) {
    const yPos = y + i * subSize;
    let xStart = x;
    let xEnd = x + size;

    // Extend ALL 3 horizontal lines into middle squares if needed
    if (extendLines.top) {
      xStart = x - size; // Extend to top middle square
    }
    if (extendLines.bottom) {
      xEnd = x + size * 2; // Extend to bottom middle square
    }

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

  // Draw the 5x5 large squares with their 4x4 subdivisions
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const largeX = centerX + col * largeSquareSize;
      const largeY = centerY + row * largeSquareSize;

      // Draw border of large square - same thickness as all lines
      elements.push(
        <rect key={`large-${row}-${col}`}
          x={largeX} y={largeY}
          width={largeSquareSize} height={largeSquareSize}
          fill="none" stroke="#334155" strokeWidth={LINE_THICKNESS} />
      );

      // Draw 4x4 grid inside each large square - same thickness
      for (let subRow = 1; subRow < 4; subRow++) {
        elements.push(
          <line key={`h-sub-${row}-${col}-${subRow}`}
            x1={largeX} y1={largeY + subRow * tinySquareSize}
            x2={largeX + largeSquareSize} y2={largeY + subRow * tinySquareSize}
            stroke="#64748b" strokeWidth={LINE_THICKNESS} />
        );
      }
      for (let subCol = 1; subCol < 4; subCol++) {
        elements.push(
          <line key={`v-sub-${row}-${col}-${subCol}`}
            x1={largeX + subCol * tinySquareSize} y1={largeY}
            x2={largeX + subCol * tinySquareSize} y2={largeY + largeSquareSize}
            stroke="#64748b" strokeWidth={LINE_THICKNESS} />
        );
      }
    }
  }

  // Draw triple lines - 5 vertical and 5 horizontal lines that extend FULLY through center AND into middle squares
  // These are the lines that divide the 5x5 grid (6 lines total, but we draw 5 internal ones as triple lines)

  // 5 vertical triple lines - extend fully through center (from top to bottom of center square) AND into middle squares
  for (let i = 1; i <= 5; i++) {
    const xPos = centerX + i * largeSquareSize;
    // Full line through center square AND extending into top-middle and bottom-middle
    elements.push(renderTripleLine(xPos, centerY - squareSize, xPos, centerY + centerSize + squareSize, `v-triple-${i}`, true));
  }

  // 5 horizontal triple lines - extend fully through center (from left to right of center square) AND into middle squares
  for (let i = 1; i <= 5; i++) {
    const yPos = centerY + i * largeSquareSize;
    // Full line through center square AND extending into left-middle and right-middle
    elements.push(renderTripleLine(centerX - squareSize, yPos, centerX + centerSize + squareSize, yPos, `h-triple-${i}`, false));
  }

  // Top border triple line - horizontal line at top edge of center square, extends fully through center and into left-middle and right-middle
  const topBorderY = centerY;
  elements.push(renderTripleLine(centerX - squareSize, topBorderY, centerX + centerSize + squareSize, topBorderY, `h-triple-top-border`, false));

  // Left border triple line - vertical line at left edge of center square, extends fully through center and into top-middle and bottom-middle
  const leftBorderX = centerX;
  elements.push(renderTripleLine(leftBorderX, centerY - squareSize, leftBorderX, centerY + centerSize + squareSize, `v-triple-left-border`, true));

  return <g>{elements}</g>;
};

// The whole 3 mm ruled area as in the RBC count: outer border, the lines dividing it into nine 1 mm squares, the
// central square of 25 medium squares in triple lines, and the four corner squares of 16
export const NeubauerRuling = () => {
  const GRID_SIZE = 900;
  const squareSize = GRID_SIZE / 3;
  return (
    <g>
      <rect x="0" y="0" width="900" height="900" fill="none" stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      <line x1={squareSize} y1="0" x2={squareSize} y2="900" stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      <line x1={squareSize * 2} y1="0" x2={squareSize * 2} y2="900" stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      <line x1="0" y1={squareSize} x2="900" y2={squareSize} stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      <line x1="0" y1={squareSize * 2} x2="900" y2={squareSize * 2} stroke="#1e293b" strokeWidth={LINE_THICKNESS} />
      {renderCenterDenseGrid(squareSize, squareSize, squareSize, squareSize)}
      {render4x4Grid(0, 0, squareSize, { right: true, bottom: true })}
      {render4x4Grid(squareSize * 2, 0, squareSize, { left: true, bottom: true })}
      {render4x4Grid(0, squareSize * 2, squareSize, { right: true, top: true })}
      {render4x4Grid(squareSize * 2, squareSize * 2, squareSize, { left: true, top: true })}
    </g>
  );
};
