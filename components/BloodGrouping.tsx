import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Droplet, RefreshCw, CheckCircle2, XCircle, Timer, ListChecks, Microscope, FlaskConical, Pipette, TestTube, Play } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// Blood grouping by the slide method, as in AK Jain (Ch 10), GK Pal (Ch 15) and CL Ghai (Expt 1-18):
// a red cell suspension is made in 0.9% saline, then a drop of it is added to anti-A, anti-B and anti-D sera and
// to a saline control on one slide, mixed with separate sticks, left about 10 minutes with gentle rocking, and read
// by eye and under low power. Undiluted blood is never put on the antisera (it can give false positives).

// --- Types & Constants ---

type Abo = 'A' | 'B' | 'AB' | 'O';
interface BloodGroup { abo: Abo; rh: boolean }

type Serum = 'A' | 'B' | 'D';
type DropId = Serum | 'C';

// Commercial antisera: anti-A tinted blue, anti-B yellow, anti-D colourless to straw; the fourth bottle is the saline
// used for the control
interface Reagent { id: DropId; name: string; cap: string; liquid: string; puddle: string; badge: string; lines: string[] }
const REAGENTS: Reagent[] = [
    { id: 'A', name: 'Anti-A', cap: '#1d6fd8', liquid: 'rgba(37, 99, 235, 0.62)', puddle: 'rgba(37, 99, 235, 0.38)', badge: '#3b9be8', lines: ['MONOCLONAL', 'ANTIBODIES'] },
    { id: 'B', name: 'Anti-B', cap: '#facc15', liquid: 'rgba(234, 179, 8, 0.6)', puddle: 'rgba(234, 179, 8, 0.42)', badge: '#facc15', lines: ['MONOCLONAL', 'ANTIBODIES'] },
    { id: 'D', name: 'Anti-D', cap: '#64748b', liquid: 'rgba(250, 240, 190, 0.4)', puddle: 'rgba(250, 240, 190, 0.32)', badge: '#cbd5e1', lines: ['(Anti-Rh)', 'MONOCLONAL'] },
    { id: 'C', name: 'Saline', cap: '#e2e8f0', liquid: 'rgba(224, 242, 254, 0.35)', puddle: 'rgba(148, 163, 184, 0.28)', badge: '#ffffff', lines: ['0.9% NaCl', 'for control'] },
];
const CIRCLE_LABEL: Record<DropId, string> = { A: 'Anti-A', B: 'Anti-B', D: 'Anti-D', C: 'Control' };

const ALL_GROUPS: BloodGroup[] = (['A', 'B', 'AB', 'O'] as Abo[]).flatMap(abo => [{ abo, rh: true }, { abo, rh: false }]);
const groupName = (g: BloodGroup) => `${g.abo} ${g.rh ? 'positive' : 'negative'}`;
const groupShort = (g: BloodGroup) => `${g.abo}${g.rh ? '+' : '−'}`;
const sameGroup = (a: BloodGroup, b: BloodGroup) => a.abo === b.abo && a.rh === b.rh;

// Antigen D is the Rh antigen; A and B are on the red cells of groups A, B and AB. The saline control never clumps.
const hasAntigen = (g: BloodGroup, s: DropId) => (s === 'C' ? false : s === 'D' ? g.rh : g.abo.includes(s));

// Red cells can be given when the donor carries no antigen the recipient lacks
const canDonate = (donor: BloodGroup, recipient: BloodGroup) =>
    (['A', 'B', 'D'] as Serum[]).every(s => !hasAntigen(donor, s) || hasAntigen(recipient, s));

// Unknown patients follow Pal's figures for India: O 45%, A 28%, B 22%, AB 5%; about 96% Rh positive (95–98%)
function randomGroup(): BloodGroup {
    const r = Math.random();
    const abo: Abo = r < 0.45 ? 'O' : r < 0.73 ? 'A' : r < 0.95 ? 'B' : 'AB';
    return { abo, rh: Math.random() < 0.96 };
}

// --- Timing ---
const REACH = 650;          // ms to bring a dropper over its circle
const DROP_FALL = 170;      // ms for the drop to fall the short gap to the slide
const SQUEEZE = 330;        // ms squeezing the teat
const RETURN = 600;         // ms to put the dropper back
const DROP_TOTAL = REACH + SQUEEZE + RETURN;
const SUSP_TIME = 2900;     // ms: blood drop into the tube, stopper on, tube inverted twice to mix, stopper off
const MIX_TIME = 1100;      // ms of stirring with the applicator stick
const READ_TIME = 600;      // s: read after about 10 minutes
const SIM_SPEED = 75;       // simulated seconds per real second while waiting
const TAU: Record<DropId, number> = { A: 90, B: 90, D: 170, C: 1 };

const agglutination = (s: DropId, t: number) => (1 - Math.exp(-t / TAU[s])) / (1 - Math.exp(-READ_TIME / TAU[s]));
const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// Elapsed time written out, e.g. "3 min 46 s", so it cannot be misread as a clock time
const clock = (s: number) => `${Math.floor(s / 60)} min ${Math.floor(s % 60)} s`;

// Seeded random numbers so each circle keeps the same cells between renders
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Cell { ux: number; uy: number; cx: number; cy: number }

// Cells spread evenly over a disc (u), and the same cells drawn into clumps of different sizes (c)
function makeCells(seed: number, count: number, radius: number, clumps: number, clumpRadius: number): Cell[] {
    const rand = mulberry32(seed);
    const disc = (r: number) => {
        const a = rand() * Math.PI * 2, d = r * Math.sqrt(rand());
        return [Math.cos(a) * d, Math.sin(a) * d];
    };
    const centres = Array.from({ length: clumps }, () => ({ at: disc(radius * 0.72), r: clumpRadius * (0.45 + rand()) }));
    return Array.from({ length: count }, (_, i) => {
        const [ux, uy] = disc(radius);
        const c = centres[Math.floor(rand() * clumps)];
        const [jx, jy] = disc(c.r);
        return { ux, uy, cx: c.at[0] + jx, cy: c.at[1] + jy };
    });
}

interface CircleState { reagentT0: number | null; cellsT0: number | null; mixT0: number | null }
const EMPTY: CircleState = { reagentT0: null, cellsT0: null, mixT0: null };

// --- SVG layout ---
// Two layouts of the bench, both with the four circles in one row. Wide screens: each circle under its bottle, the
// tube to the left. Phones: circles packed closer and the tube and bottles in one row above them, so the drawing is
// narrower and shows larger; each dropper travels from its bottle to its circle.
interface Layout {
    w: number; h: number;
    cx: number[]; cy: number[];               // circle centres: anti-A, anti-B, anti-D, control
    bottleX: number[];
    tube: { x: number; top: number; bottom: number };
    tile: { x: number; y: number; w: number; h: number };
    caption: { x: number; y: number; maxChars: number };
}
const WIDE: Layout = {
    w: 1120, h: 730,
    cx: [320, 540, 760, 980], cy: [495, 495, 495, 495],
    bottleX: [320, 540, 760, 980],
    tube: { x: 92, top: 96, bottom: 300 },
    tile: { x: 185, y: 358, w: 910, h: 292 },
    caption: { x: 620, y: 702, maxChars: 90 },
};
const NARROW: Layout = {
    w: 740, h: 760,
    cx: [112, 284, 456, 628], cy: [495, 495, 495, 495],
    bottleX: [200, 345, 490, 635],
    tube: { x: 50, top: 96, bottom: 300 },
    tile: { x: 10, y: 358, w: 720, h: 292 },
    caption: { x: 370, y: 702, maxChars: 54 },
};
const WAX_R = 80;
const PUDDLE_R = 58;
const CELLS_OFFSET = { x: 30, y: -14 };   // the cell suspension is dropped beside the reagent, not on it
const BOTTLE_BASE = 250;                  // bottom of the bottles on the bench
const DROP_GAP = 24;                      // dropper tips stop this far above the slide, never touching the drops
const ML = 35;              // px per mL in the 5 mL test tube; the saline fills it to the 2 mL mark

// How far along its trip to the slide a dropper is (0 at rest, 1 over the circle), and the squeeze of its teat
function reachAt(t0: number | null, now: number) {
    if (t0 === null) return { k: 0, squeeze: 0 };
    const e = now - t0;
    if (e < REACH) return { k: easeInOut(e / REACH), squeeze: 0 };
    if (e < REACH + SQUEEZE) return { k: 1, squeeze: Math.sin((Math.PI * (e - REACH)) / SQUEEZE) };
    if (e < DROP_TOTAL) return { k: 1 - easeInOut((e - REACH - SQUEEZE) / RETURN), squeeze: 0 };
    return { k: 0, squeeze: 0 };
}

// The cap of an antiserum bottle carries its own glass dropper: a white rubber teat on top of a coloured screw cap,
// with the glass tube below. Drawn with the dropper tip at (0, 0). In the bottle the tube is drawn behind the glass
// and label (part "tube") and the cap in front (part "cap"); lifted out, the whole dropper is drawn.
const DROPPER_LEN = 92;
const DropperCap = ({ r, squeeze, part = 'all' }: { r: Reagent; squeeze: number; part?: 'all' | 'tube' | 'cap' }) => (
    <g>
        {part !== 'cap' && <>
            <path d={`M -2.2 0 L 2.2 0 L 4 ${-DROPPER_LEN + 6} L -4 ${-DROPPER_LEN + 6} Z`} fill="rgba(226, 232, 240, 0.75)" stroke="#94a3b8" strokeWidth={0.8} />
            <path d={`M -1.4 -2 L 1.4 -2 L 2.4 -26 L -2.4 -26 Z`} fill={r.liquid} />
        </>}
        {part !== 'tube' && <>
        {/* Screw cap with ridges */}
        <rect x={-15} y={-DROPPER_LEN - 18} width={30} height={24} rx={3} fill={r.cap} stroke="rgba(15,23,42,0.35)" strokeWidth={1} />
        {[-10, -5, 0, 5, 10].map(x => <line key={x} x1={x} y1={-DROPPER_LEN - 15} x2={x} y2={-DROPPER_LEN + 3} stroke="rgba(15,23,42,0.18)" strokeWidth={1.2} />)}
        {/* White rubber teat */}
        <path d={`M -9 ${-DROPPER_LEN - 18} L -9 ${-DROPPER_LEN - 30} Q ${-10 - 3 * squeeze} ${-DROPPER_LEN - 52 + 4 * squeeze} 0 ${-DROPPER_LEN - 54 + 6 * squeeze} Q ${10 + 3 * squeeze} ${-DROPPER_LEN - 52 + 4 * squeeze} 9 ${-DROPPER_LEN - 30} L 9 ${-DROPPER_LEN - 18} Z`}
            fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.2} />
        <ellipse cx={-3.5} cy={-DROPPER_LEN - 42 + 3 * squeeze} rx={2} ry={6} fill="#ffffff" opacity={0.9} />
        </>}
    </g>
);

// Glass reagent bottle standing on the bench, base at (x, BOTTLE_BASE); the label copies the usual monoclonal antisera
const BOTTLE_H = 104;
const BOTTLE_SCALE = 1.5;    // bottles and their dropper caps are drawn at this size
const ReagentBottle = ({ r, x, onClick, hoverProps }: { r: Reagent; x: number; onClick?: () => void; hoverProps: object }) => {
    const top = BOTTLE_BASE - BOTTLE_H;
    const body = `M ${x - 26} ${BOTTLE_BASE - 6} Q ${x - 26} ${BOTTLE_BASE} ${x - 20} ${BOTTLE_BASE} L ${x + 20} ${BOTTLE_BASE} Q ${x + 26} ${BOTTLE_BASE} ${x + 26} ${BOTTLE_BASE - 6}
        L ${x + 26} ${top + 26} Q ${x + 26} ${top + 14} ${x + 12} ${top + 10} L ${x + 12} ${top} L ${x - 12} ${top} L ${x - 12} ${top + 10} Q ${x - 26} ${top + 14} ${x - 26} ${top + 26} Z`;
    const clipId = `bottle-${r.id}`;
    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }} {...hoverProps}
            transform={`translate(${x} ${BOTTLE_BASE}) scale(${BOTTLE_SCALE}) translate(${-x} ${-BOTTLE_BASE})`}>
            <defs><clipPath id={clipId}><path d={body} /></clipPath></defs>
            <rect x={x - 32} y={top - 70} width={64} height={BOTTLE_H + 74} fill="transparent" />
            <path d={body} fill="rgba(241, 245, 249, 0.35)" />
            <rect x={x - 26} y={top + 24} width={52} height={BOTTLE_H - 24} fill={r.liquid} clipPath={`url(#${clipId})`} />
            <path d={body} fill="none" stroke="#94a3b8" strokeWidth={1.6} />
            <line x1={x - 20} y1={top + 26} x2={x - 20} y2={BOTTLE_BASE - 10} stroke="#ffffff" strokeWidth={3} opacity={0.55} />
            {/* Label: white, with a coloured badge carrying the name */}
            <rect x={x - 26} y={top + 33} width={52} height={67} fill="#ffffff" opacity={0.96} />
            <circle cx={x} cy={top + 51} r={16} fill={r.badge} stroke={r.id === 'C' ? '#cbd5e1' : 'none'} />
            <text x={x} y={top + 55.5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#0f172a">{r.name}</text>
            {/* Long lines are fitted to the label width so they never spill over its edges */}
            <text x={x} y={top + 79} textAnchor="middle" fontSize={7.4} fontWeight="bold" fill="#1e3a8a"
                {...(r.lines[0].length > 9 ? { textLength: 47, lengthAdjust: 'spacingAndGlyphs' } : {})}>{r.lines[0]}</text>
            <text x={x} y={top + 87.5} textAnchor="middle" fontSize={7.4} fontWeight="bold" fill="#1e3a8a"
                {...(r.lines[1].length > 9 ? { textLength: 47, lengthAdjust: 'spacingAndGlyphs' } : {})}>{r.lines[1]}</text>
            {r.id !== 'C' && <text x={x} y={top + 96.5} textAnchor="middle" fontSize={6.6} fontWeight="bold" fill="#dc2626" textLength={47} lengthAdjust="spacingAndGlyphs">DO NOT FREEZE</text>}
        </g>
    );
};

// Pasteur pipette with a rubber bulb, tip at (x, y), used for the red cell suspension. It is longer than the test
// tube, so when it rests in the tube its tip is in the suspension and the bulb stands above the rim.
const PIPETTE_LEN = 205;
const CellsDropper = ({ x, y, squeeze, filled }: { x: number; y: number; squeeze: number; filled: boolean }) => (
    <g pointerEvents="none">
        <path d={`M ${x - 1.5} ${y} L ${x + 1.5} ${y} L ${x + 3.5} ${y - 34} L ${x + 3.5} ${y - PIPETTE_LEN} L ${x - 3.5} ${y - PIPETTE_LEN} L ${x - 3.5} ${y - 34} Z`} fill="rgba(226, 232, 240, 0.85)" stroke="#94a3b8" strokeWidth={0.8} />
        {filled && <path d={`M ${x - 1} ${y - 2} L ${x + 1} ${y - 2} L ${x + 2.6} ${y - 34} L ${x + 2.6} ${y - 62} L ${x - 2.6} ${y - 62} L ${x - 2.6} ${y - 34} Z`} fill="rgba(185, 28, 28, 0.6)" />}
        <rect x={x - 6} y={y - PIPETTE_LEN - 4} width={12} height={8} rx={2} fill="#c2410c" />
        <ellipse cx={x} cy={y - PIPETTE_LEN - 18} rx={9 + 2 * squeeze} ry={16 - 3 * squeeze} fill="#ea580c" />
    </g>
);

// One wax-pencil circle on the slide with its reagent, red cells and (if any) clumps
const SlideCircle = ({ cx, cy, r, state, cells, now, simTime, positive, onClick, hoverProps }: {
    cx: number; cy: number; r: Reagent; state: CircleState; cells: Cell[]; now: number; simTime: number;
    positive: boolean; onClick: () => void; hoverProps: object;
}) => {
    const landed = (t0: number | null) => (t0 !== null ? easeOut((now - t0 - REACH - DROP_FALL) / 200) : 0);
    const reagentIn = landed(state.reagentT0);
    const cellsIn = landed(state.cellsT0);
    const mixT = state.mixT0 !== null ? (now - state.mixT0) / MIX_TIME : 0;
    const mix = easeOut(mixT);
    const p = positive && mix >= 1 ? agglutination(r.id, simTime) : 0;
    const bx = cx + CELLS_OFFSET.x, by = cy + CELLS_OFFSET.y;
    const dropScale = 14 / PUDDLE_R;

    const falling = (t0: number | null, tx: number, ty: number, color: string) => {
        if (t0 === null || now - t0 < REACH || now - t0 >= REACH + DROP_FALL) return null;
        const f = (now - t0 - REACH) / DROP_FALL;
        return <ellipse cx={tx} cy={lerp(ty - DROP_GAP, ty, f * f)} rx={5} ry={6} fill={color} />;
    };

    // A separate stick stirs each circle in a widening spiral
    const stirring = state.mixT0 !== null && mixT < 1;
    const angle = (now - (state.mixT0 ?? 0)) / 90;
    const stirR = 12 + 34 * mix;
    const sx = cx + Math.cos(angle) * stirR, sy = cy + Math.sin(angle) * stirR * 0.8;

    return (
        <g onClick={onClick} style={{ cursor: 'pointer' }} {...hoverProps}>
            <circle cx={cx} cy={cy} r={WAX_R + 10} fill="transparent" />
            <circle cx={cx} cy={cy} r={WAX_R} fill="none" stroke="#64748b" strokeWidth={3} opacity={0.7} />
            <text x={cx} y={cy - WAX_R - 12} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#475569" fontFamily="cursive">{r.id}</text>

            {reagentIn > 0 && <circle cx={cx} cy={cy} r={PUDDLE_R * lerp(0.55, 1, mix) * reagentIn} fill={r.puddle} />}

            {/* Cell suspension: a separate drop until mixed, then an evenly pink film; where cells clump, the fluid
                clears to a faint brick-red tinge around dark-red masses */}
            {cellsIn > 0 && (
                <circle cx={lerp(bx, cx, mix)} cy={lerp(by, cy, mix)} r={lerp(14, PUDDLE_R, mix) * cellsIn}
                    fill={p > 0 ? '#b45309' : '#dc2626'} opacity={lerp(0.75, 0.34, mix) * (1 - 0.7 * p)} />
            )}
            {cellsIn > 0 && cells.map((c, i) => {
                const x0 = lerp(bx + c.ux * dropScale, cx + c.ux, mix);
                const y0 = lerp(by + c.uy * dropScale, cy + c.uy, mix);
                return (
                    <circle key={i} cx={lerp(x0, cx + c.cx, p)} cy={lerp(y0, cy + c.cy, p)} r={lerp(1.5, 3, p)}
                        fill="#7f1d1d" opacity={(0.3 + 0.62 * p) * cellsIn} />
                );
            })}

            {falling(state.reagentT0, cx, cy, r.id === 'D' || r.id === 'C' ? '#cbd5e1' : r.cap)}
            {falling(state.cellsT0, bx, by, '#dc2626')}
            {stirring && <line x1={sx} y1={sy} x2={sx + 90} y2={sy - 150} stroke="#a16207" strokeWidth={6} strokeLinecap="round" />}

            <text x={cx} y={cy + WAX_R + 32} textAnchor="middle" fontSize={19} fontWeight="bold" fill={r.id === 'A' ? '#1d4ed8' : r.id === 'B' ? '#a16207' : '#475569'}>{CIRCLE_LABEL[r.id]}</text>
        </g>
    );
};

// Low-power view of one circle: cells evenly spread, or massed in clumps in which their outlines are lost
const LowPowerView = ({ cells, p, tint }: { cells: Cell[]; p: number; tint: string }) => (
    <svg viewBox="-110 -110 220 220" className="w-full max-w-[240px] mx-auto">
        <defs><clipPath id="lp-field"><circle r={100} /></clipPath></defs>
        <circle r={104} fill="#0f172a" />
        <g clipPath="url(#lp-field)">
            <circle r={100} fill="#fef3c7" />
            <circle r={100} fill={tint} />
            {cells.map((c, i) => (
                <g key={i} transform={`translate(${lerp(c.ux, c.cx, p)} ${lerp(c.uy, c.cy, p)})`}>
                    <circle r={lerp(6.5, 8, p)} fill={p > 0.5 ? '#7f1d1d' : '#dc2626'} stroke="#991b1b" strokeWidth={lerp(0.8, 0, p)} />
                    <circle r={2.6} fill="#fca5a5" opacity={0.8 * (1 - p)} />
                </g>
            ))}
        </g>
        <circle r={100} fill="none" stroke="#334155" strokeWidth={6} />
    </svg>
);


// Phones (up to 640 px wide) get the taller bench layout
function useNarrowScreen() {
    const query = '(max-width: 640px)';
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const m = window.matchMedia(query);
        const onChange = () => setNarrow(m.matches);
        m.addEventListener('change', onChange);
        return () => m.removeEventListener('change', onChange);
    }, []);
    return narrow;
}

// The caption under the slide, wrapped into lines that fit the layout
function wrapCaption(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
        else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
}

// --- Main Component ---
export const BloodGrouping: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [sampleId, setSampleId] = useState<string>('unknown');
    const [unknown, setUnknown] = useState<BloodGroup>(randomGroup);
    const [suspT0, setSuspT0] = useState<number | null>(null);
    const [circles, setCircles] = useState<CircleState[]>(() => REAGENTS.map(() => EMPTY));
    const [waitStart, setWaitStart] = useState<number | null>(null);
    const [now, setNow] = useState(() => performance.now());
    const [message, setMessage] = useState<string | null>(null);
    const [viewIndex, setViewIndex] = useState(0);
    const [answer, setAnswer] = useState<BloodGroup | null>(null);
    const [checked, setChecked] = useState<null | boolean>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const timers = useRef<number[]>([]);
    const [queued, setQueued] = useState<keyof CircleState | null>(null); // a step already running in every circle
    const { label: hoverLabel, hover } = useHoverLabel();
    const narrow = useNarrowScreen();
    const L = narrow ? NARROW : WIDE;
    const TUBE = L.tube;
    const questionSet = questionSetFor('blood-grouping');

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const isUnknown = sampleId === 'unknown';
    const group = isUnknown ? unknown : ALL_GROUPS.find(g => groupShort(g) === sampleId)!;

    const slideCells = useMemo(() => REAGENTS.map((_, i) => makeCells(11 + i * 7, 120, PUDDLE_R - 4, 9, 9)), []);
    const lpCells = useMemo(() => REAGENTS.map((_, i) => makeCells(101 + i * 13, 70, 92, 5, 24)), []);

    const simTime = waitStart === null ? 0 : Math.min(READ_TIME, ((now - waitStart) / 1000) * SIM_SPEED);
    const waiting = waitStart !== null && simTime < READ_TIME;
    const waited = waitStart !== null && simTime >= READ_TIME;
    const suspReady = suspT0 !== null && now - suspT0 >= SUSP_TIME;

    // Animation clock: runs while the suspension is made, drops fall, sticks stir or the slide waits
    const animating = useMemo(() => {
        const busy = (t0: number | null, d: number) => t0 !== null && now - t0 < d;
        return waiting || busy(suspT0, SUSP_TIME + 50)
            || circles.some(c => busy(c.reagentT0, DROP_TOTAL + 250) || busy(c.cellsT0, DROP_TOTAL + 250) || busy(c.mixT0, MIX_TIME + 50));
    }, [circles, now, waiting, suspT0]);

    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    const allHave = (key: keyof CircleState) => circles.every(c => c[key] !== null);
    const mixedDone = circles.every(c => c.mixT0 !== null && now - c.mixT0 >= MIX_TIME);
    const step = suspT0 === null ? 1 : !allHave('reagentT0') ? 2 : !allHave('cellsT0') ? 3 : !allHave('mixT0') ? 4 : !waited ? 5 : 6;

    const update = (i: number, patch: Partial<CircleState>) => {
        setCircles(prev => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
        setNow(performance.now());
    };

    const prepareSuspension = () => {
        if (suspT0 !== null) return;
        setMessage(null);
        const t = performance.now();
        setSuspT0(t);
        setNow(t);
    };

    // Tapping a circle does the next thing it needs
    const actOn = (i: number) => {
        const c = circles[i];
        const t = performance.now();
        setMessage(null);
        if (suspT0 === null) setMessage('First make the red cell suspension: a drop of blood in 2 mL of 0.9% saline.');
        else if (c.reagentT0 === null) update(i, { reagentT0: t });
        else if (c.cellsT0 === null) {
            if (!allHave('reagentT0')) setMessage('Put the antisera and the saline in all four circles first.');
            else if (!suspReady) setMessage('Wait for the suspension to be mixed.');
            else update(i, { cellsT0: t });
        } else if (c.mixT0 === null) {
            if (!allHave('cellsT0')) setMessage('Add a drop of the cell suspension beside the reagent in every circle first.');
            else update(i, { mixT0: t });
        } else setViewIndex(i);
    };

    // Do one step in every circle, a little apart so the drops are seen falling. There is only one dropper for the
    // cells, so it finishes each trip before the next.
    const doAll = (key: keyof CircleState) => {
        setMessage(null);
        if (key === 'cellsT0' && !suspReady) { setMessage('Wait for the suspension to be mixed.'); return; }
        if (queued === key) return;
        setQueued(key);
        circles.forEach((c, i) => {
            if (c[key] !== null) return;
            timers.current.push(window.setTimeout(() => update(i, { [key]: performance.now() }), i * (key === 'mixT0' ? 250 : key === 'cellsT0' ? DROP_TOTAL + 80 : 500)));
        });
    };

    const handleWait = () => {
        if (!mixedDone) { setMessage('Mix each circle with its own applicator stick first.'); return; }
        setMessage(null);
        const t = performance.now();
        setWaitStart(t);
        setNow(t);
    };

    const resetSlide = (newUnknown: boolean) => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setQueued(null);
        setSuspT0(null);
        setCircles(REAGENTS.map(() => EMPTY));
        setWaitStart(null);
        setMessage(null);
        setAnswer(null);
        setChecked(null);
        setViewIndex(0);
        if (newUnknown) setUnknown(randomGroup());
    };

    const handleSampleChange = (id: string) => {
        setSampleId(id);
        resetSlide(id === 'unknown');
    };

    const handleCheck = () => {
        if (answer) setChecked(sameGroup(answer, group));
    };

    // Gentle rocking while the reaction develops
    const slideAngle = waiting ? Math.sin((now - waitStart!) / 260) * 2 : 0;
    const viewP = mixedDone && hasAntigen(group, REAGENTS[viewIndex].id) ? agglutination(REAGENTS[viewIndex].id, simTime) : 0;

    // Test tube: a drop of blood falls into the 2 mL of saline, a stopper is put on, the tube is turned over twice to
    // mix, and the stopper is taken off again
    const suspE = suspT0 === null ? -1 : now - suspT0;
    const bloodIn = suspE < 0 ? 0 : easeOut((suspE - 500) / 600);
    const tubeTilt = suspE > 900 && suspE < 2500 ? Math.sin(((suspE - 900) / 1600) * Math.PI * 2) * 160 : 0;
    const stopperOn = suspE < 550 || suspE > SUSP_TIME ? 0 : suspE < 850 ? easeInOut((suspE - 550) / 300) : suspE < 2550 ? 1 : 1 - easeInOut((suspE - 2550) / 300);
    const tubeInverted = Math.abs(tubeTilt) > 90;
    const fluidH = 2 * ML;
    const tubeFluid = `rgba(${Math.round(lerp(224, 200, bloodIn))}, ${Math.round(lerp(242, 50, bloodIn))}, ${Math.round(lerp(254, 50, bloodIn))}, ${lerp(0.35, 0.6, bloodIn)})`;

    // The cell dropper travels from the tube to just above each circle and back
    const cellTrips = circles.map(c => reachAt(c.cellsT0, now));
    const activeTrip = cellTrips.findIndex(t => t.k > 0);

    const caption = [
        'Step 1: Make a red cell suspension in 0.9% saline',
        'Step 2: One drop each of anti-A, anti-B, anti-D and saline (control)',
        'Step 3: Add a drop of cell suspension beside each drop',
        'Step 4: Mix each circle with a separate applicator stick',
        waiting ? `Waiting, rocking gently… ${clock(simTime)} of 10 min` : 'Step 5: Wait about 10 minutes, rocking the slide gently',
        'Step 6: Look for clumping; confirm under low power against the control',
    ][step - 1];

    // One button per step. Only the current step can be pressed, and not while it is still running; the caption
    // under the slide describes the step in full.
    const STEP_BUTTONS = [
        { name: 'Suspension', title: 'Make the red cell suspension', icon: <TestTube className="w-3.5 h-3.5" />, color: 'bg-rose-600 hover:bg-rose-500 border-rose-500', run: prepareSuspension, busy: false },
        { name: 'Reagents', title: 'Add anti-A, anti-B, anti-D and saline', icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'bg-blue-600 hover:bg-blue-500 border-blue-500', run: () => doAll('reagentT0'), busy: queued === 'reagentT0' },
        { name: 'Cells', title: 'Add a drop of cell suspension to each circle', icon: <Pipette className="w-3.5 h-3.5" />, color: 'bg-red-600 hover:bg-red-500 border-red-500', run: () => doAll('cellsT0'), busy: queued === 'cellsT0' || !suspReady },
        { name: 'Mix', title: 'Mix each circle with a separate stick', icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'bg-amber-600 hover:bg-amber-500 border-amber-500', run: () => doAll('mixT0'), busy: queued === 'mixT0' },
        { name: 'Wait 10 min', title: 'Wait about 10 minutes, rocking gently', icon: <Timer className="w-3.5 h-3.5" />, color: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500', run: handleWait, busy: waiting || !mixedDone },
        { name: 'Read', title: 'Read the slide and choose the blood group', icon: <Microscope className="w-3.5 h-3.5" />, color: 'bg-emerald-700 border-emerald-500', run: () => {}, busy: true },
    ];

    const donorsFor = ALL_GROUPS.filter(d => canDonate(d, group)).map(groupShort);
    const recipientsOf = ALL_GROUPS.filter(r => canDonate(group, r)).map(groupShort);
    const plasmaAntibodies = (['A', 'B'] as const).filter(s => !group.abo.includes(s)).map(s => `anti-${s}`);

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-blue-500 bg-clip-text text-transparent">Blood Grouping</h1>
                        <p className="text-slate-400 text-xs">ABO and Rh typing • Slide agglutination method</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left: bench with the suspension, the reagents and the slide */}
                <div className="lg:flex-1 bg-slate-900/40 flex flex-col p-3 lg:p-4 min-h-0">
                    <div className="relative lg:flex-1 lg:min-h-[300px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                        <HoverLabel label={hoverLabel} />
                        <ZoomableSvg w={L.w} h={L.h} className="w-full h-auto lg:h-full max-h-[75vh]">
                            <g transform={`rotate(${slideAngle} ${L.tile.x + L.tile.w / 2} ${L.tile.y + L.tile.h / 2})`}>
                                {/* White tile under one clean glass slide */}
                                <rect x={L.tile.x} y={L.tile.y} width={L.tile.w} height={L.tile.h} rx={14} fill="#f1f5f9" />
                                <HoverZone x={L.tile.x} y={L.tile.y} w={L.tile.w} h={L.tile.h} {...hover('White tile')} />
                                <rect x={L.tile.x + 20} y={L.tile.y + 22} width={L.tile.w - 40} height={L.tile.h - 48} rx={6} fill="rgba(186, 230, 253, 0.25)" stroke="#94a3b8" strokeWidth={2} {...hover('Clean, grease-free glass slide')} />
                                <line x1={L.tile.x + 35} y1={L.tile.y + 34} x2={L.tile.x + L.tile.w - 35} y2={L.tile.y + 34} stroke="#ffffff" strokeWidth={3} opacity={0.8} />
                                {REAGENTS.map((r, i) => (
                                    <SlideCircle key={r.id} cx={L.cx[i]} cy={L.cy[i]} r={r} state={circles[i]} cells={slideCells[i]} now={now} simTime={simTime}
                                        positive={hasAntigen(group, r.id)} onClick={() => actOn(i)}
                                        hoverProps={hover(r.id === 'C'
                                            ? `Control: saline${circles[i].cellsT0 !== null ? ' + red cells' : ''}`
                                            : `Circle ${r.id}: ${r.name}${circles[i].cellsT0 !== null ? ' + red cells' : ''}`)} />
                                ))}
                            </g>

                            {/* Test tube with 2 mL of saline, in a rack */}
                            <g {...hover(suspT0 === null ? 'Test tube: 2 mL of 0.9% saline' : 'Red cell suspension in 0.9% saline')}
                                onClick={prepareSuspension} style={{ cursor: suspT0 === null ? 'pointer' : 'default' }}>
                                <rect x={TUBE.x - 40} y={TUBE.top - 20} width={80} height={TUBE.bottom - TUBE.top + 70} fill="transparent" />
                                {/* Wooden test-tube rack behind the tube: two uprights, a top bar the tube passes through, and a base */}
                                <g pointerEvents="none">
                                    <rect x={TUBE.x - 36} y={TUBE.bottom - 4.5 * ML} width={7} height={4.5 * ML + 28} fill="#92400e" />
                                    <rect x={TUBE.x + 29} y={TUBE.bottom - 4.5 * ML} width={7} height={4.5 * ML + 28} fill="#92400e" />
                                    <rect x={TUBE.x - 40} y={TUBE.bottom - 4.5 * ML - 6} width={80} height={12} rx={2} fill="#b45309" />
                                    <ellipse cx={TUBE.x} cy={TUBE.bottom - 4.5 * ML} rx={15} ry={3.5} fill="#451a03" />
                                    <rect x={TUBE.x - 44} y={TUBE.bottom + 24} width={88} height={12} rx={2} fill="#b45309" />
                                </g>
                                {/* The tube is lifted out of the rack while it is stoppered and turned over */}
                                <g transform={`translate(0 ${-70 * stopperOn}) rotate(${tubeTilt} ${TUBE.x} ${(TUBE.top + TUBE.bottom) / 2})`}>
                                    <path d={`M ${TUBE.x - 13} ${TUBE.top} L ${TUBE.x - 13} ${TUBE.bottom} Q ${TUBE.x - 13} ${TUBE.bottom + 14} ${TUBE.x} ${TUBE.bottom + 14} Q ${TUBE.x + 13} ${TUBE.bottom + 14} ${TUBE.x + 13} ${TUBE.bottom} L ${TUBE.x + 13} ${TUBE.top} Z`}
                                        fill="rgba(241, 245, 249, 0.25)" stroke="#94a3b8" strokeWidth={1.6} />
                                    {/* 2 mL of liquid; while the tube is upside down it runs to the stoppered end */}
                                    {tubeInverted
                                        ? <rect x={TUBE.x - 12} y={TUBE.top} width={24} height={fluidH + 13} fill={tubeFluid} />
                                        : <path d={`M ${TUBE.x - 12} ${TUBE.bottom - fluidH} L ${TUBE.x - 12} ${TUBE.bottom} Q ${TUBE.x - 12} ${TUBE.bottom + 13} ${TUBE.x} ${TUBE.bottom + 13} Q ${TUBE.x + 12} ${TUBE.bottom + 13} ${TUBE.x + 12} ${TUBE.bottom} L ${TUBE.x + 12} ${TUBE.bottom - fluidH} Z`}
                                            fill={tubeFluid} />}
                                    {/* Graduations, 1 to 5 mL */}
                                    {[1, 2, 3, 4, 5].map(ml => (
                                        <g key={ml}>
                                            <line x1={TUBE.x + 4} y1={TUBE.bottom - ml * ML} x2={TUBE.x + 13} y2={TUBE.bottom - ml * ML} stroke="#cbd5e1" strokeWidth={ml === 2 ? 2 : 1.2} />
                                            <text x={TUBE.x + 17} y={TUBE.bottom - ml * ML + 4} fontSize={ml === 2 ? 12 : 10} fontWeight={ml === 2 ? 'bold' : 'normal'} fill={ml === 2 ? '#e2e8f0' : '#94a3b8'}>{ml === 2 ? '2 mL' : ml}</text>
                                        </g>
                                    ))}
                                    <line x1={TUBE.x - 8} y1={TUBE.top + 8} x2={TUBE.x - 8} y2={TUBE.bottom - 4} stroke="#ffffff" strokeWidth={2.5} opacity={0.5} />
                                    {/* Rubber stopper, on only while the tube is turned over */}
                                    {stopperOn > 0 && (
                                        <path d={`M ${TUBE.x - 16} ${TUBE.top - 14 - 40 * (1 - stopperOn)} L ${TUBE.x + 16} ${TUBE.top - 14 - 40 * (1 - stopperOn)} L ${TUBE.x + 12} ${TUBE.top + 10 - 40 * (1 - stopperOn)} L ${TUBE.x - 12} ${TUBE.top + 10 - 40 * (1 - stopperOn)} Z`}
                                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth={1.2} opacity={Math.min(1, stopperOn * 2)} />
                                    )}
                                </g>
                                {/* The drop of blood from the finger-prick falling into the tube */}
                                {suspE >= 0 && suspE < 500 && <ellipse cx={TUBE.x} cy={lerp(TUBE.top - 30, TUBE.bottom - 72, (suspE / 500) ** 2)} rx={5} ry={6} fill="#b91c1c" />}
                                <text x={TUBE.x} y={TUBE.bottom + 62} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#94a3b8">{suspReady ? 'RBC suspension' : '2 mL 0.9% saline'}</text>
                            </g>

                            {/* Reagent bottles; each cap carries its own dropper, which is lifted out, squeezed over its circle and put back */}
                            {REAGENTS.map((r, i) => {
                                const { k, squeeze } = reachAt(circles[i].reagentT0, now);
                                const homeTipY = BOTTLE_BASE - 16 * BOTTLE_SCALE;
                                const tipX = lerp(L.bottleX[i], L.cx[i], k);
                                const tipY = lerp(homeTipY, L.cy[i] - DROP_GAP, k) - 70 * Math.sin(Math.PI * k);
                                const dropper = `translate(${tipX} ${tipY}) scale(${BOTTLE_SCALE})`;
                                return (
                                    <g key={r.id}>
                                        {k === 0 && <g transform={dropper} pointerEvents="none"><DropperCap r={r} squeeze={0} part="tube" /></g>}
                                        <ReagentBottle r={r} x={L.bottleX[i]}
                                            onClick={circles[i].reagentT0 === null ? () => actOn(i) : undefined}
                                            hoverProps={hover(r.id === 'C' ? 'Normal saline (0.9%) dropper bottle, for the control' : `${r.name} serum${r.id === 'D' ? ' (anti-Rh)' : ''}, monoclonal; glass dropper bottle`)} />
                                        <g transform={dropper} pointerEvents="none"><DropperCap r={r} squeeze={squeeze} part={k === 0 ? 'cap' : 'all'} /></g>
                                    </g>
                                );
                            })}

                            {/* Pasteur pipette for the cells: rests in the tube, travels to each circle in turn */}
                            {(() => {
                                if (activeTrip < 0) {
                                    return suspReady && step < 4 ? <CellsDropper x={TUBE.x + 4} y={TUBE.bottom - 10} squeeze={0} filled={false} /> : null;
                                }
                                const { k, squeeze } = cellTrips[activeTrip];
                                const tx = L.cx[activeTrip] + CELLS_OFFSET.x, ty = L.cy[activeTrip] + CELLS_OFFSET.y - DROP_GAP;
                                return <CellsDropper x={lerp(TUBE.x + 4, tx, k)} y={lerp(TUBE.bottom - 10, ty, k) - 120 * Math.sin(Math.PI * k)} squeeze={squeeze} filled={squeeze < 0.5} />;
                            })()}

                            <text x={L.caption.x} y={L.caption.y} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">
                                {wrapCaption(caption, L.caption.maxChars).map((line, i) => <tspan key={i} x={L.caption.x} dy={i === 0 ? 0 : 28}>{line}</tspan>)}
                            </text>
                        </ZoomableSvg>
                    </div>
                </div>

                {/* Right panel: sample, one button for the current step, then the low-power view and the result once they are useful */}
                <div className="w-full flex-1 lg:flex-none lg:w-[400px] bg-slate-900 border-l border-slate-800 p-4 lg:p-5 space-y-3 lg:overflow-y-auto">
                    <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-red-400 shrink-0" />
                        <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)} aria-label="Blood sample"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block px-2.5 py-2 outline-none focus:border-indigo-500">
                            <option value="unknown">Unknown patient</option>
                            {ALL_GROUPS.map(g => <option key={groupShort(g)} value={groupShort(g)}>Known sample: {groupName(g)}</option>)}
                        </select>
                    </div>

                    {/* Steps: only the current one looks like a button (coloured, glowing, with a play mark); done and
                        later steps are flat labels, and the line below says what to tap */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {STEP_BUTTONS.map((b, i) => {
                            const n = i + 1;
                            const state = n < step ? 'done' : n === step ? 'current' : 'later';
                            const pressable = state === 'current' && !b.busy;
                            return (
                                <button key={b.name} onClick={b.run} disabled={!pressable} title={b.title}
                                    className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                        state === 'done' ? 'text-emerald-400/90'
                                            : state === 'current' ? `${b.color} border text-white shadow-lg ${pressable && n !== 6 ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-slate-900 animate-pulse' : 'opacity-80'}`
                                                : 'text-slate-600'}`}>
                                    {state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : pressable && n !== 6 ? <Play className="w-3 h-3 fill-current" /> : b.icon}
                                    <span>{n}. {b.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-300 -mt-1 text-center">
                        {step === 6 ? 'Look at each circle, then choose the blood group below.'
                            : STEP_BUTTONS[step - 1].busy ? 'Working… please wait.'
                                : <>Next: tap <span className="font-bold text-white inline-flex items-center gap-0.5"><Play className="w-3 h-3 fill-current" /> {step}. {STEP_BUTTONS[step - 1].name}</span> (or the circle on the slide)</>}
                    </p>
                    {message && <p className="text-sm text-amber-400">{message}</p>}

                    {/* Microscope view and answer stay in place from the start, so the panel never jumps: side by side on
                        phones, stacked on wide screens. The view is a dark field until the cells are mixed. */}
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <Microscope className="w-4 h-4 text-slate-400 shrink-0 hidden lg:block" />
                                <div className="flex flex-1 bg-slate-900 rounded-lg p-0.5">
                                    {REAGENTS.map((r, i) => (
                                        <button key={r.id} onClick={() => setViewIndex(i)} title={`Low-power view: ${CIRCLE_LABEL[r.id]}`}
                                            className={`flex-1 py-1 rounded-md text-xs font-bold transition-colors ${viewIndex === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                            <span className="lg:hidden">{r.id}</span><span className="hidden lg:inline">{CIRCLE_LABEL[r.id]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <LowPowerView cells={mixedDone ? lpCells[viewIndex] : []} p={viewP} tint={mixedDone ? REAGENTS[viewIndex].puddle : 'rgba(15, 23, 42, 0.8)'} />
                                {!mixedDone && (
                                    <p className="absolute inset-0 flex items-center justify-center text-center text-[11px] leading-tight text-slate-400 px-8 pointer-events-none">
                                        Low-power view after mixing
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-2 flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Blood group</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 flex-1 content-start">
                                {ALL_GROUPS.map(g => (
                                    <button key={groupShort(g)} onClick={() => { setAnswer(g); setChecked(null); }} disabled={!waited}
                                        className={`py-1.5 rounded-lg text-sm font-bold border transition-colors disabled:opacity-40 ${answer && sameGroup(answer, g) ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                                        {groupShort(g)}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleCheck} disabled={!answer || !waited}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-1.5 rounded-lg text-sm">
                                {waited ? 'Check' : 'Read after 10 min'}
                            </button>
                        </div>
                    </div>

                    {checked === false && (
                        <p className="text-sm text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            Not quite. Clumping with an antiserum means the red cells carry that antigen: anti-A for A, anti-B for B, anti-D for Rh. The control should show no clumping.
                        </p>
                    )}
                    {checked === true && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-2.5 text-sm space-y-2">
                            <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Blood group {groupName(group)}</p>
                            <table className="w-full text-xs">
                                <tbody>
                                    {REAGENTS.map(r => (
                                        <tr key={r.id} className="border-t border-slate-700">
                                            <td className="py-1 text-slate-400">{CIRCLE_LABEL[r.id]}</td>
                                            <td className={`py-1 font-bold ${hasAntigen(group, r.id) ? 'text-red-400' : 'text-slate-300'}`}>{hasAntigen(group, r.id) ? 'Agglutination' : 'No agglutination'}</td>
                                            <td className="py-1 text-slate-400 text-right">{r.id === 'C' ? 'cells evenly spread' : `${r.id === 'D' ? 'Rh (D)' : r.id} antigen ${hasAntigen(group, r.id) ? 'present' : 'absent'}`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-slate-300">Plasma antibodies: <span className="font-semibold text-white">{plasmaAntibodies.length ? plasmaAntibodies.join(' and ') : 'neither anti-A nor anti-B'}</span>{!group.rh && <span className="text-slate-400"> (no natural anti-D; it forms only after exposure to Rh-positive cells)</span>}</p>
                            <p className="text-slate-300">Can receive red cells from: <span className="font-mono font-semibold text-white">{donorsFor.join(', ')}</span></p>
                            <p className="text-slate-300">Can give red cells to: <span className="font-mono font-semibold text-white">{recipientsOf.join(', ')}</span></p>
                            <p className="text-slate-400 text-xs">Before any transfusion the blood is also cross-matched.</p>
                        </div>
                    )}

                    <div className={`grid gap-2 ${questionSet ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button onClick={() => resetSlide(isUnknown)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" /> New slide
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
