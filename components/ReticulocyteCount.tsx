import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, CheckCircle2, XCircle, ListChecks, Play, Timer, Microscope, FlaskConical, Grid3X3, Wand2, FastForward, Undo2 } from 'lucide-react';
import { useHoverLabel, HoverLabel } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { useMicroscopeStage, Eyepiece, type Objective } from './CountingMicroscope';
import { Finger, Lancet, pulpSite, useNarrowScreen, wrapCaption, easeInOut, easeOut, lerp, clamp01, type Pt } from './fingerPrick';
import { circlePath, flake, FocusKnob } from './WBCField';
import { useWideScreen } from './EosinophilField';

// Reticulocyte count by supravital staining, the manual (relative) method of GK Pal (Ch 19, pp. 129–133), with
// CL Ghai (Expt 1-16, pp. 90–92) and AK Jain (Ch 15, pp. 55–57): a drop of brilliant cresyl blue on a slide, an equal
// drop of blood from a finger prick added to it, mixed gently with the edge of another slide, kept 15 minutes under a
// watch glass lined with moist filter paper, mixed again, a little of the mixture taken on a spreader and a thin smear
// made on a second slide and dried at once. Under low power a thin part is found where the red cells lie evenly, and
// under oil immersion, in fields of about 100–150 cells, the reticulocytes and the red cells are counted in at least
// 10 fields and 1000 cells. Reticulocyte count (%) = reticulocytes × 100 ÷ total cells counted.

type StepId = 'stain' | 'clean' | 'prick' | 'blood' | 'mix' | 'wait' | 'smear' | 'dry' | 'count' | 'calc';
const STEPS: StepId[] = ['stain', 'clean', 'prick', 'blood', 'mix', 'wait', 'smear', 'dry', 'count', 'calc'];
const STEP_NAMES: Record<StepId, string> = {
    stain: 'Stain', clean: 'Clean', prick: 'Prick', blood: 'Blood', mix: 'Mix', wait: 'Wait', smear: 'Smear', dry: 'Dry', count: 'Count', calc: 'Result',
};

// frac: share of the red cells that are reticulocytes; rbc: total red cell count, million per µL
interface Subject { id: string; name: string; frac: [number, number]; rbc: number }
const SUBJECTS: Subject[] = [
    { id: 'normal', name: 'Normal adult', frac: [0.005, 0.01], rbc: 5.0 },
    { id: 'high', name: 'Haemolytic anaemia (reticulocytosis)', frac: [0.08, 0.13], rbc: 3.0 },
    { id: 'low', name: 'Aplastic anaemia (reticulocytopenia)', frac: [0, 0.0015], rbc: 2.0 },
];

// --- Timing (ms) ---
const REACH = 800, SQUEEZE = 450;                    // dropper out of its bottle and over the slide; the drop let fall
const CLEAN_RUB = 1000, CLEAN_TIME = 2400;
const PRICK_TIME = 600, DROP_TIME = 700;
const TURN = 500, FALL = 600;                        // finger turned over; the drop of blood falls on the stain
const MOVE = 500, STIR = 1700;
const LID = 600, WAIT = 3000;                        // watch glass put on, 15 minutes on the stopwatch, lifted
const PICK = 700, TOUCH = 350, CARRY = 700, SPREAD = 1200, AWAY = 450;
const DRY = 1800;
const DUR: Record<StepId, number> = {
    stain: REACH + SQUEEZE + REACH, clean: CLEAN_TIME, prick: PRICK_TIME + DROP_TIME, blood: TURN + FALL + TURN,
    mix: MOVE + STIR + MOVE, wait: LID + WAIT + LID, smear: PICK + TOUCH + CARRY + SPREAD + AWAY, dry: DRY, count: 0, calc: 0,
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// --- Bench layouts ---
interface Layout {
    w: number; h: number;
    tip: Pt;                    // fingertip
    slideA: Pt;                 // the drop of stain and blood (under the ball of the finger)
    bottle: { x: number; base: number };
    watch: Pt;                  // watch glass, where it rests
    slideB: Pt;                 // the slide the smear is made on
    pile: Pt;                   // spare clean slides
    clock: Pt;
    caption: { x: number; y: number; maxChars: number };
}
const WIDE: Layout = {
    w: 1000, h: 650, tip: { x: 280, y: 190 }, slideA: { x: 242, y: 352 }, bottle: { x: 640, base: 262 }, watch: { x: 480, y: 356 },
    slideB: { x: 700, y: 520 }, pile: { x: 250, y: 520 }, clock: { x: 870, y: 90 }, caption: { x: 500, y: 622, maxChars: 72 },
};
const NARROW: Layout = {
    w: 700, h: 860, tip: { x: 230, y: 190 }, slideA: { x: 192, y: 350 }, bottle: { x: 610, base: 300 }, watch: { x: 450, y: 356 },
    slideB: { x: 430, y: 650 }, pile: { x: 160, y: 520 }, clock: { x: 430, y: 80 }, caption: { x: 350, y: 790, maxChars: 46 },
};
const SLIDE_W = 250, SLIDE_H = 84;                   // a 75 × 25 mm slide seen from above
const STAIN = '#1d4ed8', MIXTURE = '#4f46b8', BLOOD = '#b91c1c';

// Glass slide seen from above, centre (0, 0)
const Slide = ({ opacity = 1 }: { opacity?: number }) => (
    <g opacity={opacity}>
        <rect x={-SLIDE_W / 2} y={-SLIDE_H / 2} width={SLIDE_W} height={SLIDE_H} rx={3} fill="rgba(226, 240, 255, 0.16)" stroke="#cbd5e1" strokeWidth={1.4} />
        <line x1={-SLIDE_W / 2 + 6} y1={-SLIDE_H / 2 + 5} x2={SLIDE_W / 2 - 6} y2={-SLIDE_H / 2 + 5} stroke="#ffffff" strokeWidth={2} opacity={0.35} />
    </g>
);

// Dropper bottle of brilliant cresyl blue seen from the side, base at (0, 0); the dropper is drawn separately so that
// it can be lifted out
const BOTTLE_S = 1.25, BOTTLE_H = 104, DROPPER_LEN = 92;
const Bottle = () => {
    const top = -BOTTLE_H;
    const body = `M -26 -6 Q -26 0 -20 0 L 20 0 Q 26 0 26 -6 L 26 ${top + 26} Q 26 ${top + 14} 12 ${top + 10} L 12 ${top} L -12 ${top} L -12 ${top + 10} Q -26 ${top + 14} -26 ${top + 26} Z`;
    return (
        <g transform={`scale(${BOTTLE_S})`}>
            <defs><clipPath id="bcb-bottle"><path d={body} /></clipPath></defs>
            <path d={body} fill="rgba(241, 245, 249, 0.35)" />
            <rect x={-26} y={top + 30} width={52} height={BOTTLE_H - 30} fill={STAIN} opacity={0.9} clipPath="url(#bcb-bottle)" />
            <path d={body} fill="none" stroke="#94a3b8" strokeWidth={1.6} />
            <rect x={-26} y={top + 40} width={52} height={50} fill="#ffffff" opacity={0.96} />
            <text x={0} y={top + 56} textAnchor="middle" fontSize={8.4} fontWeight="bold" fill="#1e3a8a">Brilliant</text>
            <text x={0} y={top + 67} textAnchor="middle" fontSize={8.4} fontWeight="bold" fill="#1e3a8a">cresyl blue</text>
            <text x={0} y={top + 80} textAnchor="middle" fontSize={8.4} fontWeight="bold" fill="#1e3a8a">1%</text>
        </g>
    );
};
// The bottle's dropper, tip at (0, 0): glass tube, screw cap and rubber teat
// (in the bottle the tube is drawn behind the glass and label, and the cap in front)
const Dropper = ({ squeeze, full, part = 'all' }: { squeeze: number; full: boolean; part?: 'all' | 'tube' | 'cap' }) => (
    <g transform={`scale(${BOTTLE_S})`} pointerEvents="none">
        {part !== 'cap' && <>
            <path d={`M -2.2 0 L 2.2 0 L 4 ${-DROPPER_LEN + 6} L -4 ${-DROPPER_LEN + 6} Z`} fill="rgba(226, 232, 240, 0.75)" stroke="#94a3b8" strokeWidth={0.8} />
            {full && <path d="M -1.4 -2 L 1.4 -2 L 2.4 -30 L -2.4 -30 Z" fill={STAIN} />}
        </>}
        {part !== 'tube' && <>
        <rect x={-15} y={-DROPPER_LEN - 18} width={30} height={24} rx={3} fill="#1e293b" stroke="rgba(15,23,42,0.5)" strokeWidth={1} />
        {[-10, -5, 0, 5, 10].map(x => <line key={x} x1={x} y1={-DROPPER_LEN - 15} x2={x} y2={-DROPPER_LEN + 3} stroke="rgba(148,163,184,0.35)" strokeWidth={1.2} />)}
        <path d={`M -9 ${-DROPPER_LEN - 18} L -9 ${-DROPPER_LEN - 30} Q ${-10 - 3 * squeeze} ${-DROPPER_LEN - 52 + 4 * squeeze} 0 ${-DROPPER_LEN - 54 + 6 * squeeze} Q ${10 + 3 * squeeze} ${-DROPPER_LEN - 52 + 4 * squeeze} 9 ${-DROPPER_LEN - 30} L 9 ${-DROPPER_LEN - 18} Z`}
            fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.2} />
        </>}
    </g>
);

// ---------------------------------------------------------------------------------------------------------------
// The smear under the microscope
// ---------------------------------------------------------------------------------------------------------------
// The slide of the eyepiece (900 units across) is a patch of the smear about 4 mm wide, on the scale of the oil-
// immersion field: a red cell (7.5 µm) is 0.86 units in radius and the 100x field (about 180 µm) is 41 units across.
// The film is thick on the left (towards the head of the smear), where the cells crowd and overlap, and thins out to
// the right (towards the tail). In between the cells lie evenly side by side, 100–150 to a field: that is where the
// count is made (Pal p. 130).
//
// Cells are not stored: the smear is made of square tiles, each generated from a seed when it comes into view, so the
// stage can be moved anywhere. In a tile the cells sit on a jittered lattice (so that in the good part they lie side
// by side, at most just touching), each site filled with a probability that follows the thickness of the film.

const R_RBC = 0.86;
const LATTICE = 9, PITCH = 2.27, TILE = LATTICE * PITCH;
const FILL = 0.6;                                    // share of the lattice sites filled where the thickness is 1
const RING = 18.5;                            // radius of the counting ring in the 100x field
const FIELD_MIN_CELLS = 95, FIELD_MAX_CELLS = 155;   // a field of "about 100–150 cells"
const FIELDS_NEEDED = 10, CELLS_NEEDED = 1000;
const GOOD_LEFT = 365, GOOD_RIGHT = 595;             // where the film is of the right thickness, in slide units

// Thickness of the film along the smear: 1 gives about 125 cells inside the counting ring
const THICKNESS: [number, number][] = [[200, 2.3], [330, 1.15], [620, 0.85], [760, 0.3], [900, 0.12]];
const thickness = (x: number) => {
    if (x <= THICKNESS[0][0]) return THICKNESS[0][1];
    for (let i = 1; i < THICKNESS.length; i++) {
        const [x1, m1] = THICKNESS[i], [x0, m0] = THICKNESS[i - 1];
        if (x <= x1) return m0 + ((m1 - m0) * (x - x0)) / (x1 - x0);
    }
    return THICKNESS[THICKNESS.length - 1][1];
};

type Mark = 'platelet' | 'precipitate' | 'artefact';
interface SmearCell { id: number; x: number; y: number; r: number; kind: 'rbc' | 'retic' | 'wbc'; mark?: Mark; strands?: string; dots?: string }
interface Loose { x: number; y: number; r: number; kind: 'platelet' | 'precipitate' }
interface Tile {
    key: string; cells: SmearCell[]; loose: Loose[];
    // Drawing, built once: all the red cells of the tile as single paths
    discs: string; pallor: string; piled: string; platelets: string; granules: string; precipitate: string; artefacts: string;
}

function mulberry32(a: number) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const n2 = (v: number) => v.toFixed(2);

// The reticulum of a reticulocyte, as GK Pal describes it (p. 129): a heavy wreath, clumps of small dots, or a faint
// thread joining two small nodes. The younger the cell, the more of it there is (Jain p. 55).
function reticulum(rand: () => number, x: number, y: number, r: number) {
    const at = (rad: number, a: number): [number, number] => [x + Math.cos(a) * rad, y + Math.sin(a) * rad];
    const u = rand();
    let strands = '', dots = '';
    const dot = (p: [number, number], s = 1) => { dots += circlePath(p[0], p[1], r * (0.085 + rand() * 0.05) * s); };
    if (u < 0.35) {
        const n = 6 + Math.floor(rand() * 3), a0 = rand() * 6.283, rad = r * (0.36 + rand() * 0.12);
        let p = at(rad, a0);
        strands += `M${n2(p[0])},${n2(p[1])}`;
        for (let i = 1; i <= n; i++) {
            const a = a0 + (i / n) * 6.283 + (rand() - 0.5) * 0.4;
            const c = at(rad * (0.4 + rand() * 1.0), a - 3.14 / n);
            p = at(rad * (0.8 + rand() * 0.4), a);
            strands += `Q${n2(c[0])},${n2(c[1])} ${n2(p[0])},${n2(p[1])}`;
        }
        for (let i = 0; i < 2; i++) {
            const a = rand() * 6.283, p1 = at(rad, a), p2 = at(rad * 0.9, a + 2.6 + rand()), c = at(r * 0.12, rand() * 6.283);
            strands += `M${n2(p1[0])},${n2(p1[1])}Q${n2(c[0])},${n2(c[1])} ${n2(p2[0])},${n2(p2[1])}`;
        }
        for (let i = 0; i < 9; i++) dot(at(r * 0.62 * Math.sqrt(rand()), rand() * 6.283));
    } else if (u < 0.78) {
        const c0 = at(r * 0.22 * rand(), rand() * 6.283), n = 7 + Math.floor(rand() * 5);
        for (let i = 0; i < n; i++) { const a = rand() * 6.283, d = r * 0.42 * Math.sqrt(rand()); dot([c0[0] + Math.cos(a) * d, c0[1] + Math.sin(a) * d]); }
        for (let i = 0; i < 2; i++) {
            const a = rand() * 6.283, l = r * (0.25 + rand() * 0.25), bend = at(r * 0.15, rand() * 6.283);
            strands += `M${n2(c0[0] - Math.cos(a) * l)},${n2(c0[1] - Math.sin(a) * l)}Q${n2(bend[0])},${n2(bend[1])} ${n2(c0[0] + Math.cos(a) * l)},${n2(c0[1] + Math.sin(a) * l)}`;
        }
    } else {
        const a = rand() * 6.283, p1 = at(r * 0.32, a), p2 = at(r * 0.32, a + 3.14 + (rand() - 0.5) * 0.8), c = at(r * 0.2, a + 1.57);
        strands += `M${n2(p1[0])},${n2(p1[1])}Q${n2(c[0])},${n2(c[1])} ${n2(p2[0])},${n2(p2[1])}`;
        dot(p1, 1.25); dot(p2, 1.25);
    }
    return { strands, dots };
}

function makeTile(seed: number, tx: number, ty: number, frac: number): Tile {
    const rand = mulberry32((seed ^ Math.imul(tx + 7919, 73856093) ^ Math.imul(ty + 104729, 19349663)) >>> 0);
    const cells: SmearCell[] = [], loose: Loose[] = [];
    const idBase = ((tx + 200) * 400 + (ty + 200)) * 256;
    let discs = '', pallor = '', piled = '', platelets = '', granules = '', precipitate = '', artefacts = '';
    const x0 = tx * TILE, y0 = ty * TILE;
    // Now and then a white cell, which takes the place of a red cell and its neighbours
    const wbcSite = rand() < 0.05 ? [1 + Math.floor(rand() * (LATTICE - 2)), 1 + Math.floor(rand() * (LATTICE - 2))] : null;
    for (let j = 0; j < LATTICE; j++) for (let i = 0; i < LATTICE; i++) {
        // Alternate rows are shifted half a step, like bricks, so that the cells do not stand in columns
        const sx = x0 + (i + 0.5 + (j % 2 ? 0.25 : -0.25)) * PITCH, sy = y0 + (j + 0.5) * PITCH;
        const m = thickness(sx);
        const jitter = 0.45 + Math.max(0, m - 1.1) * 0.9;        // in the thick part the cells run into one another
        const x = sx + (rand() * 2 - 1) * jitter, y = sy + (rand() * 2 - 1) * jitter;
        const filled = rand() < Math.min(0.92, m * FILL), isRetic = rand() < frac, extra = rand(), markRoll = rand(), size = rand();
        if (wbcSite && Math.abs(i - wbcSite[0]) <= 1 && Math.abs(j - wbcSite[1]) <= 1) {
            if (i === wbcSite[0] && j === wbcSite[1]) {
                // The supravital stain colours its nucleus blue: one round nucleus (lymphocyte) or three lobes (neutrophil)
                const r = 1.25 + size * 0.25;
                let nucleus = '';
                if (rand() < 0.4) nucleus = circlePath(sx + (rand() - 0.5) * 0.3, sy + (rand() - 0.5) * 0.3, r * 0.72);
                else { const a0 = rand() * 6.283; for (let k = 0; k < 3; k++) nucleus += circlePath(sx + Math.cos(a0 + k * 1.5) * r * 0.42, sy + Math.sin(a0 + k * 1.5) * r * 0.42, r * 0.33); }
                cells.push({ id: idBase + cells.length, x: sx, y: sy, r, kind: 'wbc', strands: nucleus });
            }
            continue;
        }
        if (!filled) continue;
        if (isRetic) {
            const r = R_RBC * (1.08 + size * 0.1);                // a little larger than a red cell
            cells.push({ id: idBase + cells.length, x, y, r, kind: 'retic', ...reticulum(rand, x, y, r) });
            continue;
        }
        const r = R_RBC * (0.94 + size * 0.12);
        const cell: SmearCell = { id: idBase + cells.length, x, y, r, kind: 'rbc' };
        discs += circlePath(x, y, r); pallor += circlePath(x, y, r * 0.42);
        // Things on a red cell that are not reticulum (Pal p. 131)
        const a = rand() * 6.283, d = r * (0.2 + rand() * 0.35), mx = x + Math.cos(a) * d, my = y + Math.sin(a) * d;
        if (markRoll < 0.011) { cell.mark = 'platelet'; platelets += flake(mx, my, 0.3, 7, 0.3); granules += circlePath(mx, my, 0.1); }
        else if (markRoll < 0.019) {
            cell.mark = 'precipitate';
            for (let k = 0; k < 4; k++) precipitate += circlePath(mx + (rand() - 0.5) * 0.36, my + (rand() - 0.5) * 0.36, 0.06 + rand() * 0.07);
        } else if (markRoll < 0.031) { cell.mark = 'artefact'; artefacts += circlePath(mx, my, 0.17 + rand() * 0.08); }
        cells.push(cell);
        // Where the film is thick, more cells lie on top of these
        if (extra < m * FILL - 0.85) {
            const ex = x + (rand() - 0.5) * PITCH, ey = y + (rand() - 0.5) * PITCH;
            piled += circlePath(ex, ey, R_RBC);
            cells.push({ id: idBase + cells.length, x: ex, y: ey, r: R_RBC, kind: 'rbc' });
        }
    }
    // Platelets and specks of precipitated stain lying between the cells
    const mid = thickness(x0 + TILE / 2);
    for (let k = 0; k < Math.round(2.2 * Math.min(1.6, mid) + rand()); k++) {
        const x = x0 + rand() * TILE, y = y0 + rand() * TILE, r = 0.24 + rand() * 0.12;
        loose.push({ x, y, r, kind: 'platelet' });
        platelets += flake(x, y, r, 7, 0.35); granules += circlePath(x + (rand() - 0.5) * 0.1, y + (rand() - 0.5) * 0.1, r * 0.35);
    }
    if (rand() < 0.4) {
        const x = x0 + rand() * TILE, y = y0 + rand() * TILE;
        loose.push({ x, y, r: 0.3, kind: 'precipitate' });
        for (let k = 0; k < 5; k++) precipitate += circlePath(x + (rand() - 0.5) * 0.5, y + (rand() - 0.5) * 0.5, 0.06 + rand() * 0.09);
    }
    return { key: `${tx},${ty}`, cells, loose, discs, pallor, piled, platelets, granules, precipitate, artefacts };
}

// Colours of a film stained supravitally with brilliant cresyl blue and not counterstained: red cells a pale
// greenish blue, reticulocytes a little paler with a deep blue-violet reticulum (Pal p. 131; Jain p. 56)
const SMEAR_BG = '#e9efec';
const RBC_FILL = '#9cc9cc', RBC_EDGE = '#74aab0', RBC_PALLOR = '#c4e0e0';
const RETIC_FILL = '#b3cbd9', RETIC_EDGE = '#7f9db4', RETICULUM = '#2a2380';

// One tile of the film. full: the oil-immersion view, with the reticulum and everything that lies on the cells
const SmearTile = React.memo(({ tile, full }: { tile: Tile; full: boolean }) => (
    <g pointerEvents="none">
        <path d={tile.discs} fill={RBC_FILL} fillOpacity={0.92} stroke={RBC_EDGE} strokeWidth={0.09} />
        {tile.piled && <path d={tile.piled} fill={RBC_FILL} fillOpacity={0.7} stroke={RBC_EDGE} strokeWidth={0.09} />}
        {full && <path d={tile.pallor} fill={RBC_PALLOR} fillOpacity={0.85} />}
        {tile.cells.map(c => c.kind === 'retic' ? (
            <g key={c.id}>
                <circle cx={c.x} cy={c.y} r={c.r} fill={RETIC_FILL} fillOpacity={0.95} stroke={RETIC_EDGE} strokeWidth={0.09} />
                {full ? <>
                    <path d={c.strands} fill="none" stroke={RETICULUM} strokeWidth={0.1} strokeLinecap="round" />
                    <path d={c.dots} fill={RETICULUM} />
                </> : <circle cx={c.x} cy={c.y} r={c.r * 0.35} fill={RETICULUM} fillOpacity={0.45} />}
            </g>
        ) : c.kind === 'wbc' ? (
            <g key={c.id}>
                <circle cx={c.x} cy={c.y} r={c.r} fill="#c9d6e8" fillOpacity={0.9} stroke="#8fa3c0" strokeWidth={0.09} />
                <path d={c.strands} fill="#5560b5" fillOpacity={0.9} stroke="#3b3f8f" strokeWidth={0.07} />
            </g>
        ) : null)}
        {full && <>
            <path d={tile.artefacts} fill="#f7ffff" stroke="#4f8690" strokeWidth={0.07} />
            <path d={tile.platelets} fill="#8b7cc4" fillOpacity={0.85} />
            <path d={tile.granules} fill="#4c3f94" />
            <path d={tile.precipitate} fill="#1c1a66" />
        </>}
    </g>
));

// What a tap on something other than a reticulocyte is told, on the slide and in the panel
const NOT_RETIC: Record<string, [string, string]> = {
    rbc: ['Mature red cell: no reticulum', 'A mature red cell stains an even pale blue. A reticulocyte is a little larger and paler and has a network of deep blue-violet threads and dots in it.'],
    platelet: ['Platelet lying on a red cell', 'A platelet stains too, and when it lies on a red cell it can pass for reticulum. It is one compact body with a clear rim, not a network of threads and dots.'],
    precipitate: ['Stain precipitate on a red cell', 'Specks of precipitated stain can be mistaken for reticulum. They are jet dark, sharp-edged and lie on the cell, and are found between the cells too. The stain should be filtered before use.'],
    artefact: ['Drying artefact, not reticulum', 'A highly refractile spot in a red cell, from moisture and slow drying of the smear. It is bright, not blue: the smear should be dried at once.'],
    loosePlatelet: ['Platelets, not counted', 'Platelets between the cells take up the stain. They are far smaller than a red cell and are not counted.'],
    loosePrecipitate: ['Stain precipitate', 'Precipitated stain lying between the cells: filter the stain before use.'],
    wbc: ['White cell: not counted', 'A white cell: larger than the red cells, with a blue-stained nucleus. Its granules must not be mistaken for reticulum. It is left out of the count.'],
};

interface FieldRecord { x: number; y: number; retics: number; total: number }

const B = ({ children }: { children: React.ReactNode }) => <span className="text-white font-bold">{children}</span>;
const OIL_HINT = 'Oil immersion: bring the cells into sharp focus with the fine focus.';

export const ReticulocyteCount: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const newSample = (s: Subject) => ({ seed: Math.floor(Math.random() * 2 ** 31), frac: s.frac[0] + Math.random() * (s.frac[1] - s.frac[0]) });
    const [subject, setSubject] = useState<Subject>(SUBJECTS[0]);
    const [sample, setSample] = useState(() => newSample(SUBJECTS[0]));
    const [acts, setActs] = useState<Partial<Record<StepId, number>>>({});
    const [view, setView] = useState<'bench' | 'scope'>('bench');
    const [now, setNow] = useState(() => performance.now());
    const [message, setMessage] = useState<string | null>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    // The count: reticulocytes marked (with where they are, for their rings), the fields recorded so far
    const [marked, setMarked] = useState<Map<number, SmearCell>>(new Map());
    const [fields, setFields] = useState<FieldRecord[]>([]);
    const [finished, setFinished] = useState(false);
    const [missed, setMissed] = useState<SmearCell[]>([]);
    const [tries, setTries] = useState(0);
    const [focus, setFocus] = useState(0);
    const [tapLabel, setTapLabel] = useState<{ x: number; y: number; text: string; color: string; k: number; t: number; wrong?: number } | null>(null);
    const [formula, setFormula] = useState<{ pick: number | null; checked: boolean | null }>({ pick: null, checked: null });
    const oilFocused = useRef(false);
    const stage = useMicroscopeStage();
    const { label: hoverLabel, hover } = useHoverLabel();
    const narrow = useNarrowScreen();
    const wide = useWideScreen();
    const L = narrow ? NARROW : WIDE;
    const questionSet = questionSetFor('reticulocyte-count');

    // --- Steps ---
    const at = (id: StepId) => acts[id] ?? null;
    const done = (id: StepId) => at(id) !== null && performance.now() - at(id)! >= DUR[id];
    const busy = (id: StepId) => at(id) !== null && now - at(id)! < DUR[id];
    const stepIdx = STEPS.findIndex(id => (id === 'count' ? !finished : id === 'calc' ? true : at(id) === null));
    const step = stepIdx + 1;
    const stepId = STEPS[stepIdx];
    const prevId = stepIdx > 0 ? STEPS[stepIdx - 1] : null;
    const prevBusy = prevId !== null && prevId !== 'count' && !done(prevId);
    const counting = stepId === 'count' && at('count') !== null;

    const animating = useMemo(() => STEPS.some(id => at(id) !== null && now - at(id)! < DUR[id] + 80),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [acts, now]);
    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    const openScope = () => { setView('scope'); stage.setZoom(10); stage.setPosition({ x: 0, y: 0 }); };
    const act = (id: StepId) => {
        if (id !== stepId || prevBusy) return;
        const t = performance.now();
        setNow(t); setMessage(null);
        setActs(a => (a[id] === undefined ? { ...a, [id]: t } : a));
        if (id === 'count') openScope();
    };
    const clearCount = () => { setMarked(new Map()); setFields([]); setFinished(false); setMissed([]); setTries(0); setFormula({ pick: null, checked: null }); };
    const skipToCount = () => {
        const t = performance.now();
        const a: Partial<Record<StepId, number>> = {};
        for (const id of STEPS) { if (id === 'count' || id === 'calc') break; a[id] = t - 100000; }
        setActs({ ...a, count: t }); setNow(t); setMessage(null);
        openScope();
    };
    // Going back: step i and every step after it are undone. Back from the result reopens the count with its last
    // field taken off; going back to the bench clears the count, as a new smear is made.
    const undoFrom = (i: number) => {
        const id = STEPS[i];
        if (id === 'calc') return;
        setMessage(null); setNow(performance.now()); setFormula({ pick: null, checked: null });
        if (id === 'count') { setFinished(false); setFields(f => f.slice(0, -1)); return; }
        setActs(a => { const n = { ...a }; for (const s of STEPS.slice(i)) delete n[s]; return n; });
        clearCount(); setView('bench');
    };
    const back = () => { if (stepIdx > 0) undoFrom(stepIdx - 1); };
    const reset = (subj: Subject = subject) => {
        setSample(newSample(subj)); tiles.current = new Map(); oilFocused.current = false;
        setActs({}); setView('bench'); clearCount(); setFocus(0); setTapLabel(null); setMessage(null); setNow(performance.now());
    };
    const changeSubject = (id: string) => { const s = SUBJECTS.find(x => x.id === id)!; setSubject(s); reset(s); };

    // --- The smear ---
    const tiles = useRef(new Map<string, Tile>());
    const tileAt = (tx: number, ty: number) => {
        const key = `${tx},${ty}`;
        let t = tiles.current.get(key);
        if (!t) { t = makeTile(sample.seed, tx, ty, sample.frac); tiles.current.set(key, t); }
        return t;
    };
    const tilesIn = (cx: number, cy: number, half: number) => {
        const out: Tile[] = [];
        const h = half + 1.5;      // a cell can lie a little outside its own tile
        for (let ty = Math.floor((cy - h) / TILE); ty <= Math.floor((cy + h) / TILE); ty++)
            for (let tx = Math.floor((cx - h) / TILE); tx <= Math.floor((cx + h) / TILE); tx++) out.push(tileAt(tx, ty));
        return out;
    };
    // The red cells and reticulocytes inside the counting ring of a field centred at (cx, cy)
    const cellsInRing = (cx: number, cy: number) =>
        tilesIn(cx, cy, RING).flatMap(t => t.cells).filter(c => c.kind !== 'wbc' && Math.hypot(c.x - cx, c.y - cy) < RING);

    // The point of the slide at the centre of the eyepiece, in slide units
    const centre = { x: (stage.position.x + 400) * 1.125, y: (stage.position.y + 400) * 1.125 };
    const oil = stage.zoom === 100;

    // Under oil the fine focus has to be found again (Pal p. 130: "Focus sharply")
    useEffect(() => {
        if (stage.zoom !== 100 || oilFocused.current || at('count') === null) return;
        oilFocused.current = true;
        setFocus(Math.random() < 0.5 ? -24 : 24);
        setMessage(OIL_HINT);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage.zoom]);
    // A new field: the hints about the last one go
    useEffect(() => { setMissed([]); setTries(0); }, [stage.position.x, stage.position.y]);
    // Arrow keys move the stage, as in the other microscope practicals
    const panRef = useRef(stage.pan);
    panRef.current = stage.pan;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            const d = ({ ArrowUp: [0, -50], ArrowDown: [0, 50], ArrowLeft: [-50, 0], ArrowRight: [50, 0] } as Record<string, number[]>)[e.key];
            if (!d) return;
            e.preventDefault();
            panRef.current(d[0], d[1]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const say = (x: number, y: number, text: string, color: string, wrong?: number) => {
        const t = performance.now();
        const k = 1 / (stage.scale * (800 / 900));
        setTapLabel({ x, y, text, color, k, t, wrong });
        window.setTimeout(() => setTapLabel(l => (l && l.t === t ? null : l)), 2200);
    };
    const tapAt = (gx: number, gy: number) => {
        if (!counting) return;
        if (!oil) {
            say(gx, gy, 'Switch to 100x (oil)', '#fbbf24');
            setMessage('The reticulum can only be made out under the oil-immersion objective. Find a thin, even part of the film here, then switch to 100x.');
            return;
        }
        const k = 1 / (stage.scale * (800 / 900)), reach = Math.max(0.5, 10 * k);
        const near = tilesIn(gx, gy, 2.5);
        let thing: Loose | null = null, thingD = Infinity;
        for (const t of near) for (const l of t.loose) { const d = Math.hypot(l.x - gx, l.y - gy); if (d < Math.max(l.r, reach) && d < thingD) { thing = l; thingD = d; } }
        let cell: SmearCell | null = null, cellD = Infinity;
        for (const t of near) for (const c of t.cells) { const d = Math.hypot(c.x - gx, c.y - gy); if (d < Math.max(c.r, reach) && d < cellD) { cell = c; cellD = d; } }
        const no = (key: string, x: number, y: number, r: number) => { say(x, y, NOT_RETIC[key][0], '#fca5a5', r); setMessage(NOT_RETIC[key][1]); };
        if (thing && (!cell || thingD < thing.r)) return no(thing.kind === 'platelet' ? 'loosePlatelet' : 'loosePrecipitate', thing.x, thing.y, Math.max(thing.r + 0.5, 6 * k));
        if (!cell) { setMessage(null); return; }
        const c = cell;
        if (c.kind !== 'retic') return no(c.kind === 'wbc' ? 'wbc' : c.mark ?? 'rbc', c.x, c.y, c.r + 0.35);
        if (Math.hypot(c.x - centre.x, c.y - centre.y) >= RING) {
            say(c.x, c.y, 'Reticulocyte, outside the ring', '#fbbf24', c.r + 0.35);
            setMessage('A reticulocyte, but outside the counting ring. Bring it inside the ring, or leave it for another field.');
            return;
        }
        if (fields.some(f => Math.hypot(c.x - f.x, c.y - f.y) < RING)) { say(c.x, c.y, 'Already counted in an earlier field', '#cbd5e1'); return; }
        const had = marked.has(c.id);
        setMarked(m => { const n = new Map(m); if (had) n.delete(c.id); else n.set(c.id, c); return n; });
        setMissed(ms => ms.filter(x => x.id !== c.id));
        say(c.x, c.y, had ? 'Mark removed' : 'Reticulocyte: marked', had ? '#cbd5e1' : '#34d399');
        setMessage(null);
    };

    // --- Recording a field ---
    const totalRetics = fields.reduce((a, f) => a + f.retics, 0), totalCells = fields.reduce((a, f) => a + f.total, 0);
    const enough = (fs: FieldRecord[]) => fs.length >= FIELDS_NEEDED && fs.reduce((a, f) => a + f.total, 0) >= CELLS_NEEDED;
    const overlapping = (x: number, y: number, fs: FieldRecord[]) => fs.findIndex(f => Math.hypot(f.x - x, f.y - y) < 2 * RING - 1);
    const recordField = () => {
        if (!oil) { setMessage('Switch to the 100x oil-immersion objective to count.'); return; }
        if (Math.abs(focus) > 5) { setMessage('Bring the cells into sharp focus first: the reticulum cannot be seen in a blurred field.'); return; }
        const inRing = cellsInRing(centre.x, centre.y);
        const clash = overlapping(centre.x, centre.y, fields);
        if (clash >= 0) { setMessage(`This field overlaps field ${clash + 1}, which is already counted. Move on to a fresh field.`); return; }
        if (inRing.length > FIELD_MAX_CELLS) { setMessage(`Too crowded: about ${Math.round(inRing.length / 10) * 10} cells in the ring, lying on one another. Move towards the thinner part of the film (to the right).`); return; }
        if (inRing.length < FIELD_MIN_CELLS) { setMessage(`Too few cells here (about ${Math.round(inRing.length / 10) * 10} in the ring): the film is too thin. Move back towards the thicker part (to the left).`); return; }
        const retics = inRing.filter(c => c.kind === 'retic'), left = retics.filter(c => !marked.has(c.id));
        if (left.length) {
            setTries(t => t + 1);
            if (tries >= 1) { setMissed(left); setMessage(`${left.length} reticulocyte${left.length > 1 ? 's' : ''} in this field ${left.length > 1 ? 'are' : 'is'} not marked: ringed in amber.`); }
            else setMessage('Not yet: there are reticulocytes inside the ring that you have not marked. Look for the cells with blue threads and dots.');
            return;
        }
        const next = [...fields, { x: centre.x, y: centre.y, retics: retics.length, total: inRing.length }];
        setFields(next); setMissed([]); setTries(0);
        if (enough(next)) { setFinished(true); setMessage(null); }
        else setMessage(`Field ${next.length} recorded: ${retics.length} reticulocyte${retics.length === 1 ? '' : 's'} among ${inRing.length} cells. Move to a fresh field.`);
    };
    const markHere = () => {
        const retics = cellsInRing(centre.x, centre.y).filter(c => c.kind === 'retic');
        setMarked(m => { const n = new Map(m); for (const c of retics) n.set(c.id, c); return n; });
        setMissed([]); setMessage(null);
    };
    // The stage moved one field on, along the film and back again a row lower (the battlement track)
    const STEP_PX = ((2 * RING + 1) * 800) / 900;
    const toPx = (u: number) => (u * 800) / 900 - 400;
    const nextField = () => {
        stage.setPosition(p => {
            let x = p.x + STEP_PX, y = p.y;
            if (x > toPx(GOOD_RIGHT) || x < toPx(GOOD_LEFT)) { x = toPx(GOOD_LEFT + 5); y = p.y + STEP_PX; if (y > 380) y = -380; }
            return { x, y };
        });
        setMessage(null);
    };
    // The remaining fields counted without the student: fresh fields of the right thickness, their reticulocytes marked
    const countRest = () => {
        const fs = [...fields], add = new Map(marked);
        outer: for (let y = 60; y <= 840; y += 2 * RING + 1) for (let x = GOOD_LEFT + 10; x <= GOOD_RIGHT; x += 2 * RING + 1) {
            if (enough(fs)) break outer;
            if (overlapping(x, y, fs) >= 0) continue;
            const inRing = cellsInRing(x, y);
            if (inRing.length > FIELD_MAX_CELLS || inRing.length < FIELD_MIN_CELLS) continue;
            const retics = inRing.filter(c => c.kind === 'retic');
            for (const c of retics) add.set(c.id, c);
            fs.push({ x, y, retics: retics.length, total: inRing.length });
        }
        setFields(fs); setMarked(add); setMissed([]); setFinished(true); setMessage(null);
        const last = fs[fs.length - 1];
        if (last) { stage.setZoom(100); stage.setPosition({ x: toPx(last.x), y: toPx(last.y) }); oilFocused.current = true; setFocus(0); }
    };
    const jumpTo = (i: number) => {
        const t = performance.now();
        setActs(a => {
            const n = { ...a };
            for (const s of STEPS.slice(0, i)) { if (s === 'count' || s === 'calc') continue; if (n[s] === undefined || t - n[s]! < DUR[s]) n[s] = t - 100000; }
            if (STEPS[i] === 'calc') n.count = n.count ?? t;
            return n;
        });
        setMessage(null); setNow(t);
        if (STEPS[i] === 'calc') { setView('scope'); countRest(); }
    };

    // --- Result ---
    const percent = totalCells ? (totalRetics * 100) / totalCells : 0;
    const absolute = Math.round((percent / 100) * subject.rbc * 1e6 / 1000) * 1000;
    const FORMULAS = ['Reticulocytes × 100 ÷ total cells counted', 'Reticulocytes × 100 ÷ number of fields', 'Total cells counted ÷ reticulocytes'];

    // --- Captions ---
    const e = (id: StepId) => (at(id) === null ? -1 : now - at(id)!);
    const PROMPTS: Record<StepId, string> = {
        stain: 'Put a drop of brilliant cresyl blue on a clean slide',
        clean: 'Clean the fingertip with spirit and let it dry',
        prick: 'Prick the fingertip with a sterile lancet',
        blood: 'Add an equal drop of blood to the drop of stain',
        mix: 'Mix gently with the edge of another slide',
        wait: 'Cover with a watch glass lined with moist filter paper for 15 min',
        smear: 'Mix again, take a little on a spreader and make a thin smear',
        dry: 'Let the smear dry in air at once',
        count: 'Find a thin, even part under low power; count under oil immersion',
        calc: '',
    };
    const progress = (id: StepId): string | undefined => {
        switch (id) {
            case 'stain': return 'A drop of the supravital stain goes on the slide…';
            case 'clean': return 'Letting the spirit dry completely…';
            case 'blood': return 'A drop of blood falls on the stain: equal volumes of each…';
            case 'mix': return 'Mixing gently but thoroughly…';
            case 'wait': return 'The dye enters the living cells and stains the RNA of reticulocytes…';
            case 'smear': {
                const t = e('smear');
                return t < PICK + TOUCH ? 'The edge of the spreader takes up a little of the mixture…'
                    : t < PICK + TOUCH + CARRY ? 'Carried to a second slide…' : 'Pushed smoothly along the slide: a thin, even smear…';
            }
            case 'dry': return 'Drying quickly: slow drying leaves refractile artefacts in the cells…';
            default: return undefined;
        }
    };
    const caption = stepId === 'calc' ? `${totalRetics} reticulocytes among ${totalCells} cells in ${fields.length} fields`
        : (prevId && busy(prevId) && progress(prevId)) || `Step ${step}: ${PROMPTS[stepId]}`;

    // --- Bench drawing state ---
    const tip = L.tip, A = L.slideA, Bs = L.slideB;
    const site = pulpSite(tip.x, tip.y);
    const axis = tip.y - 2;                               // the finger is turned over about its own length
    // Stain: the dropper is lifted out of the bottle, carried over the slide, a drop let fall, and put back
    const stainE = e('stain');
    const home = { x: L.bottle.x, y: L.bottle.base - 12 }, over = { x: A.x, y: A.y - 30 };
    const reach = (k: number) => (k < 0.35 ? { x: home.x, y: home.y - 170 * easeInOut(k / 0.35) } : { x: lerp(home.x, over.x, easeInOut((k - 0.35) / 0.65)), y: lerp(home.y - 170, over.y, easeInOut((k - 0.35) / 0.65)) });
    const dropper = stainE < 0 || stainE >= DUR.stain ? home
        : stainE < REACH ? reach(stainE / REACH) : stainE < REACH + SQUEEZE ? over : reach(1 - (stainE - REACH - SQUEEZE) / REACH);
    const atHome = stainE < 0 || stainE >= DUR.stain;
    const squeezeK = stainE < REACH ? 0 : clamp01((stainE - REACH) / SQUEEZE);
    const stainK = stainE < 0 ? 0 : easeOut((stainE - REACH - SQUEEZE * 0.5) / (SQUEEZE * 0.5));
    // Cleaning and the prick
    const cleanE = e('clean');
    const wet = cleanE < 0 ? 0 : cleanE < CLEAN_RUB ? 1 : 1 - clamp01((cleanE - CLEAN_RUB) / (CLEAN_TIME - CLEAN_RUB));
    const swab = cleanE >= 0 && cleanE < CLEAN_RUB ? { x: site.x + Math.sin(cleanE / 60) * 28, y: site.y - 16 } : null;
    const prickE = e('prick');
    const lancet = prickE >= 0 && prickE < PRICK_TIME ? { x: site.x, y: lerp(site.y - 80, site.y + 3, Math.sin((Math.PI * prickE) / PRICK_TIME)) } : null;
    // Blood: the finger is turned over above the slide and the drop falls on the stain
    const bloodE = e('blood');
    const turned = bloodE < 0 ? 0 : bloodE < TURN ? easeInOut(bloodE / TURN) : bloodE < TURN + FALL ? 1 : 1 - easeInOut((bloodE - TURN - FALL) / TURN);
    const fallK = bloodE < TURN ? 0 : clamp01((bloodE - TURN) / FALL);
    const dropOnFinger = prickE < PRICK_TIME ? 0 : bloodE < 0 ? easeOut((prickE - PRICK_TIME) / DROP_TIME) : fallK < 0.35 ? 1 : 0;
    const under = 2 * axis - site.y;                      // where the ball of the finger is once it is turned over
    const falling = fallK >= 0.35 && fallK < 1 ? { x: site.x, y: lerp(under + 14, A.y - 6, ((fallK - 0.35) / 0.65) ** 2) } : null;
    const bloodK = bloodE < 0 ? 0 : fallK >= 1 ? 1 : 0;
    // Mixing with the corner of another slide
    const mixE = e('mix');
    const stirK = mixE < MOVE ? 0 : clamp01((mixE - MOVE) / STIR);
    const mixK = easeInOut(stirK);
    const mixerIn = mixE < 0 || mixE >= DUR.mix ? 0 : mixE < MOVE ? easeInOut(mixE / MOVE) : mixE < MOVE + STIR ? 1 : 1 - easeInOut((mixE - MOVE - STIR) / MOVE);
    const mixer = { x: lerp(L.pile.x - 60, A.x, mixerIn) + (stirK > 0 && stirK < 1 ? 7 * Math.cos(stirK * 44) : 0), y: lerp(L.pile.y - 30, A.y, mixerIn) + (stirK > 0 && stirK < 1 ? 5 * Math.sin(stirK * 44) : 0) };
    // The 15 minutes under the watch glass
    const waitE = e('wait');
    const lid = waitE < 0 ? 0 : waitE < LID ? easeInOut(waitE / LID) : waitE < LID + WAIT ? 1 : waitE < DUR.wait ? 1 - easeInOut((waitE - LID - WAIT) / LID) : 0;
    const waiting = waitE >= LID && waitE < LID + WAIT;
    const waitedS = waitE < LID ? 0 : clamp01((waitE - LID) / WAIT) * 15 * 60;
    const watch = { x: lerp(L.watch.x, A.x, lid), y: lerp(L.watch.y, A.y, lid) };
    // The smear: the spreader's edge takes up some of the mixture, is carried to the second slide and pushed along it
    const smearE = e('smear');
    const head = Bs.x - 88, tail = Bs.x + 92;
    const edge = smearE < 0 || smearE >= DUR.smear ? null
        : smearE < PICK ? { x: lerp(L.pile.x + 40, A.x + 4, easeInOut(smearE / PICK)), y: lerp(L.pile.y, A.y, easeInOut(smearE / PICK)) }
            : smearE < PICK + TOUCH ? { x: A.x + 4, y: A.y }
                : smearE < PICK + TOUCH + CARRY ? { x: lerp(A.x + 4, head, easeInOut((smearE - PICK - TOUCH) / CARRY)), y: lerp(A.y, Bs.y, easeInOut((smearE - PICK - TOUCH) / CARRY)) }
                    : { x: lerp(head, tail + 14, easeInOut(clamp01((smearE - PICK - TOUCH - CARRY) / SPREAD))), y: Bs.y };
    const edgeFade = smearE >= DUR.smear - AWAY ? 1 - clamp01((smearE - (DUR.smear - AWAY)) / AWAY) : 1;
    const loaded = smearE >= PICK + TOUCH * 0.5;
    const takenK = smearE < 0 ? 0 : clamp01((smearE - PICK) / TOUCH);
    const spreadK = smearE < PICK + TOUCH + CARRY ? 0 : easeInOut(clamp01((smearE - PICK - TOUCH - CARRY) / SPREAD));
    const dryK = e('dry') < 0 ? 0 : clamp01(e('dry') / DRY);
    // The film on the second slide: its front straight behind the spreader, running out into a tongue at the tail
    const smearPath = (() => {
        const xs = lerp(head, tail, spreadK), tl = 50 * spreadK, xb = xs - tl, y = Bs.y;
        return `M ${head} ${y - 29} L ${xb} ${y - 29} C ${xb + tl * 0.6} ${y - 29} ${xs} ${y - 13} ${xs} ${y} C ${xs} ${y + 13} ${xb + tl * 0.6} ${y + 29} ${xb} ${y + 29} L ${head} ${y + 29} Z`;
    })();
    const dropRx = (20 + 7 * bloodK) * stainK * (1 - 0.25 * takenK), dropRy = (13 + 4 * bloodK) * stainK * (1 - 0.25 * takenK);

    const stepTitle: Record<StepId, string> = {
        stain: 'Drop of stain', clean: 'Clean with spirit', prick: 'Prick the finger', blood: 'Add a drop of blood', mix: 'Mix gently',
        wait: 'Cover, wait 15 min', smear: 'Make a thin smear', dry: 'Dry in air', count: 'Look under the microscope', calc: 'Calculate',
    };
    const stepColor: Partial<Record<StepId, string>> = {
        stain: 'bg-blue-600 hover:bg-blue-500 border-blue-500', clean: 'bg-sky-600 hover:bg-sky-500 border-sky-500', prick: 'bg-rose-600 hover:bg-rose-500 border-rose-500',
        blood: 'bg-red-600 hover:bg-red-500 border-red-500', mix: 'bg-violet-600 hover:bg-violet-500 border-violet-500', wait: 'bg-teal-600 hover:bg-teal-500 border-teal-500',
        smear: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500', dry: 'bg-slate-600 hover:bg-slate-500 border-slate-500', count: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500',
    };

    // --- The slide under the microscope ---
    const halfView = (476 / 2 / ({ 4: 0.7, 10: 1.3, 40: 5, 100: 13 } as Record<Objective, number>)[stage.zoom]) * 1.125 + 2;
    const cellsShown = stage.zoom >= 40;
    const visible = cellsShown && view === 'scope' ? tilesIn(centre.x, centre.y, halfView) : [];
    const k = 1 / (stage.scale * (800 / 900));              // one screen pixel in slide units
    const renderSlide = () => (
        <div className="relative w-full h-full" style={{ backgroundColor: SMEAR_BG }}>
            <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible">
                {cellsShown ? visible.map(t => <SmearTile key={t.key} tile={t} full={oil} />) : (
                    // Low power: the cells are too small to draw one by one; the film shows as a grain that is dense where it
                    // is thick and fades out where it is thin
                    <g pointerEvents="none">
                        <defs>
                            {GRAINS.map((g, n) => (
                                <pattern key={n} id={`retic-grain-${n}`} width={g.size} height={g.size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${g.turn})`}>
                                    <path d={g.d} fill={RBC_FILL} stroke={RBC_EDGE} strokeWidth={0.12} />
                                </pattern>
                            ))}
                            <linearGradient id="retic-thick" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={900} y2={0}>
                                {THICKNESS.map(([x, m]) => <stop key={x} offset={x / 900} stopColor="#6fa9b1" stopOpacity={clamp01((m - 1) / 1.3) * 0.75} />)}
                            </linearGradient>
                            <linearGradient id="retic-thin" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={900} y2={0}>
                                {THICKNESS.map(([x, m]) => <stop key={x} offset={x / 900} stopColor={SMEAR_BG} stopOpacity={clamp01((1 - m) / 0.9) * 0.92} />)}
                            </linearGradient>
                        </defs>
                        {GRAINS.map((_, n) => <rect key={n} x={-700} y={-700} width={2300} height={2300} fill={`url(#retic-grain-${n})`} />)}
                        <rect x={-700} y={-700} width={2300} height={2300} fill="url(#retic-thick)" />
                        <rect x={-700} y={-700} width={2300} height={2300} fill="url(#retic-thin)" />
                    </g>
                )}
            </svg>
        </div>
    );
    // Marks of the count, always sharp: the counting ring of the oil-immersion field, the fields already recorded, a
    // ring on each reticulocyte marked, a dashed ring on each one missed, and the note of the last tap
    const renderMarks = () => (
        <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible" pointerEvents="none">
            {fields.map((f, i) => (
                <g key={i}>
                    <circle cx={f.x} cy={f.y} r={RING} fill="rgba(16,185,129,0.05)" stroke="#059669" strokeWidth={Math.max(0.12, 1.5 * k)} strokeDasharray={`${6 * k} ${4 * k}`} />
                    <text x={f.x} y={f.y - RING - 4 * k} textAnchor="middle" fontSize={Math.max(2.2, 12 * k)} fontWeight="bold" fill="#047857">{i + 1}</text>
                </g>
            ))}
            {oil && counting && <circle cx={centre.x} cy={centre.y} r={RING} fill="none" stroke="#1e293b" strokeWidth={1.2 * k} strokeOpacity={0.55} />}
            {[...marked.values()].map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r + 0.3} fill="none" stroke="#10b981" strokeWidth={0.14} />)}
            {missed.map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r + 0.4} fill="none" stroke="#f59e0b" strokeWidth={0.14} strokeDasharray="0.35 0.25" />)}
            {tapLabel && (() => {
                const s = tapLabel.k, fs = 13 * s, w = tapLabel.text.length * 7.1 * s + 14 * s, h = 22 * s;
                const lx = tapLabel.x, ly = tapLabel.y - 14 * s;
                return (
                    <g>
                        {tapLabel.wrong && <circle key={tapLabel.t} className="wrong-tap-ring" cx={tapLabel.x} cy={tapLabel.y} r={tapLabel.wrong}
                            fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth={Math.max(0.08, 2 * s)} />}
                        <rect x={lx - w / 2} y={ly - h} width={w} height={h} rx={5 * s} fill="#0f172a" opacity={0.9} />
                        <text x={lx} y={ly - h / 2 + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="bold" fill={tapLabel.color}>{tapLabel.text}</text>
                    </g>
                );
            })()}
        </svg>
    );
    const knob = <FocusKnob value={focus} onChange={v => { setFocus(v); if (Math.abs(v) <= 5) setMessage(m => (m === OIL_HINT ? null : m)); }} />;
    // The two buttons used at every field. On a phone or tablet they sit under the eyepiece with the note of what
    // happened, so that the count can be made without scrolling; on a desktop they are in the side panel.
    const fieldButtons = (
        <div className="grid grid-cols-2 gap-2 text-sm">
            <button onClick={recordField} className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded-lg py-1.5 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Record field {fields.length + 1}
            </button>
            <button onClick={nextField} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg py-1.5 font-bold flex items-center justify-center gap-1.5">
                Next field <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
    const markButton = missed.length > 0 && (
        <button onClick={markHere} className="w-full bg-slate-900 hover:bg-slate-700 border border-amber-500/50 text-amber-200 rounded-lg py-1.5 font-bold text-sm">Mark them for me</button>
    );
    const underEyepiece = !wide && view === 'scope';

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">Reticulocyte Count</h1>
                        <p className="text-slate-400 text-xs">Supravital staining • Brilliant cresyl blue</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                <div className="lg:flex-1 bg-slate-900/40 flex flex-col p-3 lg:p-4 min-h-0 gap-2">
                    {at('count') !== null && (
                        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700 self-center">
                            {(['bench', 'scope'] as const).map(v => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 ${view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    {v === 'bench' ? <><FlaskConical className="w-4 h-4" /> Bench</> : <><Microscope className="w-4 h-4" /> Microscope</>}
                                </button>
                            ))}
                        </div>
                    )}
                    {view === 'scope' ? (
                        <div className="relative flex flex-col lg:flex-1 min-h-0">
                            <Eyepiece stage={stage} className="rounded-xl min-h-[360px] md:min-h-[560px]" background={SMEAR_BG} focus={focus} onTap={tapAt}
                                renderSlide={renderSlide} layers={[{ defocus: 0, render: renderMarks }]} />
                            {!wide && (
                                <div className="mt-2 w-full max-w-lg mx-auto space-y-2">
                                    {knob}
                                    {counting && fieldButtons}
                                    {counting && markButton}
                                    {message && <p className="text-sm text-amber-400">{message}</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative lg:flex-1 lg:min-h-[300px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                            <HoverLabel label={hoverLabel} />
                            <ZoomableSvg w={L.w} h={L.h} className="w-full h-auto lg:h-full max-h-[75vh]">
                                <defs>
                                    <linearGradient id="retic-film" gradientUnits="userSpaceOnUse" x1={head} y1={0} x2={tail} y2={0}>
                                        <stop offset="0%" stopColor="#5b54c4" stopOpacity={0.62} /><stop offset="60%" stopColor="#7b7fd6" stopOpacity={0.36} /><stop offset="100%" stopColor="#9aa6e6" stopOpacity={0.12} />
                                    </linearGradient>
                                </defs>

                                {/* The slide with the drop of stain and blood, under the fingertip */}
                                <g transform={`translate(${A.x} ${A.y})`} {...hover('Clean slide: the drop of stain and the drop of blood are mixed on it')}>
                                    <Slide />
                                    {stainK > 0 && (
                                        <g>
                                            <ellipse cx={0} cy={0} rx={dropRx} ry={dropRy} fill={bloodK > 0 && mixK >= 1 ? MIXTURE : STAIN} opacity={0.9} />
                                            {bloodK > 0 && mixK < 1 && <ellipse cx={8} cy={-1} rx={13 - 6 * mixK} ry={9 - 4 * mixK} fill={BLOOD} opacity={0.95 * (1 - mixK)} />}
                                            {bloodK > 0 && mixK > 0 && mixK < 1 && <ellipse cx={0} cy={0} rx={dropRx} ry={dropRy} fill={MIXTURE} opacity={0.9 * mixK} />}
                                            <ellipse cx={-dropRx * 0.3} cy={-dropRy * 0.35} rx={dropRx * 0.3} ry={dropRy * 0.2} fill="#ffffff" opacity={0.22} />
                                        </g>
                                    )}
                                    <text x={0} y={SLIDE_H / 2 + 20} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">{bloodK > 0 ? 'Blood + stain' : stainK > 0 ? 'Drop of stain' : 'Clean slide'}</text>
                                </g>

                                {/* Spare clean slides: one is used to mix, one as the spreader */}
                                <g {...hover('Clean slides: the edge of one mixes the drop; one with a smooth edge is the spreader')}>
                                    <g transform={`translate(${L.pile.x + 8} ${L.pile.y + 8})`}><Slide opacity={0.7} /></g>
                                    <g transform={`translate(${L.pile.x} ${L.pile.y})`}><Slide /></g>
                                    <text x={L.pile.x} y={L.pile.y + SLIDE_H / 2 + 28} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">Clean slides</text>
                                </g>

                                {/* The second slide, on which the smear is made */}
                                <g {...hover(spreadK > 0 ? 'Thin smear of the stained blood: thick at the head, running out to a feathered tail' : 'Second clean slide, for the smear')}>
                                    <g transform={`translate(${Bs.x} ${Bs.y})`}><Slide /></g>
                                    {spreadK > 0 && <>
                                        <path d={smearPath} fill="url(#retic-film)" />
                                        <path d={smearPath} fill="#ffffff" opacity={0.16 * (1 - dryK)} />
                                    </>}
                                    <text x={Bs.x} y={Bs.y + SLIDE_H / 2 + 20} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">
                                        {dryK >= 1 ? 'Dried smear' : dryK > 0 ? 'Drying in air…' : spreadK >= 1 ? 'Thin smear' : 'Slide for the smear'}
                                    </text>
                                </g>

                                {/* Bottle of stain, its dropper lifted out to put a drop on the slide */}
                                {atHome && <g transform={`translate(${dropper.x} ${dropper.y})`}><Dropper squeeze={0} full part="tube" /></g>}
                                <g transform={`translate(${L.bottle.x} ${L.bottle.base})`} {...hover('Brilliant cresyl blue, 1%: a supravital stain, with citrate and saline')}><Bottle /></g>
                                <g transform={`translate(${dropper.x} ${dropper.y})`}><Dropper squeeze={squeezeK > 0 && squeezeK < 1 ? Math.sin(Math.PI * squeezeK) : 0} full={stainE < REACH + SQUEEZE * 0.5 || stainE >= DUR.stain} part={atHome ? 'cap' : 'all'} /></g>
                                {squeezeK > 0 && squeezeK < 0.5 && <circle cx={over.x} cy={lerp(over.y + 4, A.y - 4, squeezeK * 2)} r={5} fill={STAIN} />}

                                {/* The finger: palm up for the prick, turned over above the slide to let the drop fall */}
                                {turned < 0.5 ? (
                                    <Finger x={tip.x} y={tip.y} wet={wet} swab={swab} hoverProps={hover('Fingertip, cleaned with spirit and pricked')} />
                                ) : (
                                    <g transform={`translate(0 ${2 * axis}) scale(1 -1)`} pointerEvents="none"><Finger x={tip.x} y={tip.y} wet={0} swab={null} hoverProps={{}} /></g>
                                )}
                                {dropOnFinger > 0.02 && turned < 1 && <ellipse cx={site.x} cy={site.y - 2 - 11 * dropOnFinger} rx={4 + 9 * dropOnFinger} ry={4 + 9 * dropOnFinger} fill={BLOOD} opacity={1 - turned} />}
                                {dropOnFinger > 0.02 && turned > 0 && <ellipse cx={site.x} cy={under + 13} rx={11} ry={13} fill={BLOOD} opacity={turned} />}
                                {falling && <ellipse cx={falling.x} cy={falling.y} rx={9} ry={11} fill={BLOOD} />}
                                {lancet && <Lancet x={lancet.x} y={lancet.y} />}

                                {/* A corner of a second slide stirs the drop */}
                                {mixerIn > 0 && (
                                    <g transform={`translate(${mixer.x} ${mixer.y}) rotate(58)`} opacity={Math.min(1, mixerIn * 2)} pointerEvents="none">
                                        <rect x={0} y={0} width={SLIDE_W} height={SLIDE_H} rx={2} fill="rgba(226, 240, 255, 0.2)" stroke="#e2e8f0" strokeWidth={1.4} />
                                    </g>
                                )}

                                {/* Watch glass lined with moist filter paper, put over the drop for the 15 minutes */}
                                <g transform={`translate(${watch.x} ${watch.y})`} {...hover('Watch glass lined with moist filter paper: keeps the drop from drying while it stains')}>
                                    <circle cx={0} cy={3} r={62} fill="#0f172a" opacity={0.25 * lid} />
                                    <circle cx={0} cy={0} r={62} fill="rgba(226, 240, 255, 0.13)" stroke="#cbd5e1" strokeWidth={1.8} />
                                    <circle cx={0} cy={0} r={48} fill="#dbe7f1" opacity={0.3} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 4" />
                                    <ellipse cx={-22} cy={-26} rx={22} ry={9} fill="#ffffff" opacity={0.16} transform="rotate(-30 -22 -26)" />
                                    {lid < 0.05 && <text x={0} y={84} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">
                                        <tspan x={0}>Watch glass, lined with</tspan><tspan x={0} dy={16}>moist filter paper</tspan>
                                    </text>}
                                </g>

                                {/* The spreader, leaning back over the film it leaves behind; its edge carries the mixture */}
                                {edge && (
                                    <g transform={`translate(${edge.x} ${edge.y})`} opacity={edgeFade} pointerEvents="none">
                                        <rect x={-112} y={-36} width={112} height={72} rx={2} fill="rgba(226, 240, 255, 0.22)" stroke="#e2e8f0" strokeWidth={1.2} />
                                        <line x1={0} y1={-36} x2={0} y2={36} stroke="#f8fafc" strokeWidth={3} />
                                        {loaded && spreadK < 1 && <line x1={-1} y1={-26} x2={-1} y2={26} stroke={MIXTURE} strokeWidth={4} opacity={0.9 * (1 - spreadK)} strokeLinecap="round" />}
                                    </g>
                                )}

                                {/* Timers */}
                                {(waiting || (waitE >= 0 && waitE < DUR.wait)) && (
                                    <g {...hover('Stopwatch: 15 minutes for the stain to enter the living cells (not less than 10)')}>
                                        <rect x={L.clock.x - 90} y={L.clock.y - 46} width={180} height={92} rx={22} fill="#1e293b" stroke="#475569" strokeWidth={3} />
                                        <rect x={L.clock.x - 72} y={L.clock.y - 30} width={144} height={52} rx={8} fill="#a3b18a" />
                                        <text x={L.clock.x} y={L.clock.y + 12} textAnchor="middle" fontSize={40} fontWeight="bold" fill="#1f2937" fontFamily="monospace">{mmss(waitedS)}</text>
                                        <text x={L.clock.x} y={L.clock.y + 38} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">STAINING</text>
                                    </g>
                                )}

                                <text x={L.caption.x} y={L.caption.y} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">
                                    {wrapCaption(caption, L.caption.maxChars).map((line, i) => <tspan key={i} x={L.caption.x} dy={i === 0 ? 0 : 28}>{line}</tspan>)}
                                </text>
                            </ZoomableSvg>
                        </div>
                    )}
                </div>

                {/* Right panel */}
                <div className="w-full flex-1 lg:flex-none lg:w-[400px] bg-slate-900 border-l border-slate-800 p-4 lg:p-5 space-y-3 lg:overflow-y-auto">
                    <ol className="grid grid-cols-5 gap-x-1.5 gap-y-1 text-[11px] font-bold" aria-label={`Step ${step} of ${STEPS.length}`}>
                        {STEPS.map((id, i) => {
                            const n = i + 1;
                            const state = n < step ? 'done' : n === step ? 'current' : 'later';
                            const press = () => {
                                if (state === 'done') undoFrom(i);
                                else if (state === 'current' && id !== 'calc' && !prevBusy) act(id);
                                else if (state === 'later') jumpTo(i);
                            };
                            return (
                                <li key={id}>
                                    <button onClick={press} disabled={state === 'current' && (prevBusy || id === 'calc' || counting)}
                                        title={state === 'done' ? `Go back to step ${n} (${STEP_NAMES[id]})` : state === 'later' ? `Skip ahead to step ${n} (${STEP_NAMES[id]})` : undefined}
                                        className={`w-full flex items-center gap-1 px-1 py-1 rounded-md text-left transition-colors ${
                                            state === 'done' ? 'text-emerald-400 hover:bg-slate-800 cursor-pointer'
                                                : state === 'current' ? 'text-white bg-slate-800 ring-1 ring-indigo-400 hover:bg-slate-700 enabled:cursor-pointer'
                                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 cursor-pointer'}`}>
                                        {state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 text-center shrink-0">{n}</span>}
                                        <span className="truncate">{STEP_NAMES[id]}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="flex items-stretch gap-2">
                        <select value={subject.id} onChange={(ev) => changeSubject(ev.target.value)} aria-label="Subject"
                            className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block px-2 py-2 outline-none focus:border-indigo-500">
                            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {stepId !== 'calc' && !counting ? (
                            <button onClick={() => act(stepId)} disabled={prevBusy}
                                className={`flex-[1.25] min-w-0 ${stepColor[stepId]} border text-white font-bold py-2.5 px-2 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg transition-colors disabled:opacity-60`}>
                                {prevBusy && waiting ? <><Timer className="w-4 h-4 shrink-0" /> <span className="truncate">Waiting… {mmss(waitedS)}</span></>
                                    : prevBusy ? <span className="truncate">Working…</span>
                                        : <><Play className="w-4 h-4 fill-current shrink-0" /> <span className="truncate">Next: {stepTitle[stepId]}</span></>}
                            </button>
                        ) : (
                            <p className="flex-[1.25] flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800 rounded-xl px-2 text-center">
                                {counting ? <><Microscope className="w-4 h-4 shrink-0" /> Count below</> : <><CheckCircle2 className="w-4 h-4 shrink-0" /> Calculate below</>}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={back} disabled={stepIdx === 0}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-40">
                            <Undo2 className="w-4 h-4" /> Back a step
                        </button>
                        {at('count') === null && (
                            <button onClick={skipToCount}
                                className="flex-[1.3] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                                <FastForward className="w-4 h-4" /> Skip to counting
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 -mt-1">Tip: tap any step above to go back or skip ahead to it.</p>
                    {message && !underEyepiece && <p className="text-sm text-amber-400">{message}</p>}

                    {wide && view === 'scope' && knob}

                    {/* Counting: the rules, the table of fields and the buttons */}
                    {at('count') !== null && !finished && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <details className="group" open={fields.length === 0}>
                                <summary className="font-bold text-white flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                                    <Grid3X3 className="w-4 h-4 text-sky-400" /> How to count
                                    <span className="ml-auto text-[11px] font-normal text-slate-500 group-open:hidden">show</span>
                                </summary>
                                <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 mt-2">
                                    <li>At <B>10x</B> find the part of the film where the cells lie evenly, side by side; then turn to <B>100x</B> (oil immersion) and <B>focus sharply</B>. A good field has about 100–150 cells.</li>
                                    <li><B>Reticulocytes</B> are a little larger and paler, with a network of deep blue-violet threads and dots. Tap each one inside the ring. Mature red cells are an even pale blue.</li>
                                    <li>Platelets, stain precipitate and drying artefacts are <B>not</B> reticulum.</li>
                                    <li>Record the field (its red cells are counted for you) and move to a fresh one: at least <B>10 fields</B> and <B>1000 cells</B>.</li>
                                </ul>
                            </details>
                            <FieldTable fields={fields} />
                            {!underEyepiece && fieldButtons}
                            {!underEyepiece && markButton}
                            <button onClick={countRest} className="w-full bg-slate-900 hover:bg-slate-700 border border-indigo-500/40 text-indigo-200 rounded-lg py-1.5 font-bold flex items-center justify-center gap-1.5">
                                <Wand2 className="w-4 h-4" /> {fields.length > 0 ? 'Count the remaining fields for me' : `Count all ${FIELDS_NEEDED} fields for me`}
                            </button>
                        </div>
                    )}

                    {/* Calculation and result */}
                    {finished && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <FieldTable fields={fields} />
                            <label className="block text-[11px] font-bold text-slate-400 uppercase">Reticulocyte count (%) =</label>
                            <div className="grid gap-1.5">
                                {FORMULAS.map((f, i) => (
                                    <button key={f} onClick={() => setFormula({ pick: i, checked: null })}
                                        className={`py-1.5 px-2 rounded-lg border font-bold text-left ${formula.pick === i ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{f}</button>
                                ))}
                            </div>
                            <button onClick={() => setFormula(f => ({ ...f, checked: f.pick === 0 }))} disabled={formula.pick === null}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-sm disabled:opacity-50">Check</button>
                            {formula.checked === false && (
                                <p className="text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    The count is a percentage of the cells looked at: the reticulocytes seen, times 100, divided by all the cells counted (reticulocytes and red cells together).</p>
                            )}
                            {formula.checked === true && (
                                <>
                                    <p className="text-slate-300 font-mono">{totalRetics} × 100 ÷ {totalCells}</p>
                                    <p className={`font-bold flex items-center gap-2 ${subject.id === 'normal' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <CheckCircle2 className="w-4 h-4" /> Reticulocyte count = {percent.toFixed(1)}%
                                    </p>
                                    <p className="text-slate-300">Normal in adults: 0.5–1% (Pal); 0.2–2% (Ghai, Jain). Newborns: 2–6% (Pal).</p>
                                    <p className="text-slate-300">
                                        Absolute count = {percent.toFixed(1)}% of {subject.rbc.toFixed(1)} million red cells per µL = <B>{absolute.toLocaleString('en-IN')} per µL</B> (normal 20,000–50,000, Pal).
                                    </p>
                                    {subject.id === 'high' && <p className="text-slate-300">Reticulocytosis: the marrow is working hard to replace the red cells that are being destroyed. It is also seen after acute haemorrhage, during the treatment of deficiency anaemias (the reticulocyte response), at high altitude and in newborns.</p>}
                                    {subject.id === 'low' && <p className="text-slate-300">Reticulocytopenia: the marrow is not producing red cells. It is seen in aplastic anaemia, myxoedema and hypopituitarism; there is no physiological cause of a low count. In anaemia a larger share of blood is mixed with the stain, to get enough cells in each field.</p>}
                                </>
                            )}
                        </div>
                    )}

                    <div className={`grid gap-2 ${questionSet ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button onClick={() => reset()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" /> New test
                        </button>
                        {questionSet && (
                            <button onClick={() => setQuizOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-2.5 rounded-xl text-sm transition-all border border-indigo-500/40 flex items-center justify-center gap-2">
                                <ListChecks className="w-4 h-4" /> Test yourself
                            </button>
                        )}
                    </div>
                </div>
            </main>
            {quizOpen && questionSet && <Quiz set={questionSet} onClose={() => setQuizOpen(false)} />}
        </div>
    );
};

// The low-power grain: two sheets of scattered red cells, of different sizes and turned different ways, laid one over
// the other so that the repeat of neither shows. Together they hold as many cells as the film where its thickness is 1.
const GRAINS = [{ size: 37, turn: 17 }, { size: 53, turn: -31 }].map(({ size, turn }, n) => {
    const rand = mulberry32(20261112 + n), pts: [number, number][] = [];
    const want = Math.round((FILL / (PITCH * PITCH) / 2) * size * size);
    for (let tries = 0; pts.length < want && tries < want * 40; tries++) {
        const x = rand() * size, y = rand() * size;
        const wrap = (d: number) => Math.min(Math.abs(d), size - Math.abs(d));
        if (pts.every(([px, py]) => Math.hypot(wrap(px - x), wrap(py - y)) > 1.9)) pts.push([x, y]);
    }
    // Cells near an edge of the sheet are drawn again on the far side, so that none is cut in half at the seam
    let d = '';
    for (const [x, y] of pts) for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
        const cx = x + dx, cy = y + dy;
        if (cx > -1 && cx < size + 1 && cy > -1 && cy < size + 1) d += circlePath(cx, cy, 0.84);
    }
    return { size, turn, d };
});

// The observation table of the practical (Pal, Table 19.1): reticulocytes, red cells and the total in each field
const FieldTable = ({ fields }: { fields: FieldRecord[] }) => {
    const retics = fields.reduce((a, f) => a + f.retics, 0), total = fields.reduce((a, f) => a + f.total, 0);
    return (
        <table className="w-full text-xs text-slate-300 border-collapse">
            <thead>
                <tr className="text-slate-400 text-[11px]">
                    <th className="text-left font-semibold py-0.5">Field</th><th className="text-right font-semibold">Reticulocytes</th>
                    <th className="text-right font-semibold">Red cells</th><th className="text-right font-semibold">Total</th>
                </tr>
            </thead>
            <tbody>
                {fields.map((f, i) => (
                    <tr key={i} className="border-t border-slate-700/60 font-mono">
                        <td className="py-0.5">{i + 1}</td><td className="text-right">{f.retics}</td><td className="text-right">{f.total - f.retics}</td><td className="text-right">{f.total}</td>
                    </tr>
                ))}
                {fields.length === 0 && <tr className="border-t border-slate-700/60"><td colSpan={4} className="py-1 text-slate-500">No field recorded yet</td></tr>}
                <tr className="border-t border-slate-500 font-mono font-bold text-white">
                    <td className="py-0.5">{fields.length} of {FIELDS_NEEDED}</td><td className="text-right">{retics}</td><td className="text-right">{total - retics}</td><td className="text-right">{total}</td>
                </tr>
            </tbody>
        </table>
    );
};
