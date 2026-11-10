import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, ListChecks, Play, Timer, Microscope, FlaskConical, Grid3X3, Wand2, FastForward, Undo2 } from 'lucide-react';
import { useHoverLabel, HoverLabel } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { useMicroscopeStage, Eyepiece, NeubauerRuling, positionFor } from './CountingMicroscope';
import { Finger, Lancet, pulpSite, useNarrowScreen, wrapCaption, easeInOut, easeOut, lerp, clamp01, type Pt } from './fingerPrick';

// Cell counts made with the haemocytometer from a finger prick: blood drawn into a diluting pipette, diluted with a
// fluid made for the cells to be counted, mixed, the first drops discarded, the Neubauer chamber charged and the cells
// counted under high power. Platelet count by the Rees–Ecker method follows GK Pal (Ch 18), AK Jain (Ch 14) and
// CL Ghai (pp. 114–115): blood to 0.5 in the RBC pipette and Rees–Ecker fluid to 101 (1 in 200), shaken for a minute,
// the charged chamber kept 15 minutes under a petri dish lined with moist filter paper, and the platelets counted in
// all 25 medium squares of the central square (1 mm², 0.1 µL), so the count per µL is N × 2000.

type StepId = 'clean' | 'prick' | 'blood' | 'fluid' | 'mix' | 'discard' | 'charge' | 'settle' | 'count' | 'calc';

interface Subject { id: string; name: string; n: [number, number] }   // n: range of the true count in the counted area

interface CountConfig {
    title: string; subtitle: string; quizId: string;
    pipette: 'rbc' | 'wbc';
    fluid: { name: string; color: string; mixed: string };
    steps: StepId[];
    subjects: Subject[];
    racking?: boolean;          // fine focus and iris controls: the cells to count shine only on racking
}

const PLATELET: CountConfig = {
    title: 'Platelet Count',
    subtitle: 'Rees–Ecker method • Neubauer chamber',
    quizId: 'platelet-count',
    pipette: 'rbc',
    // Brilliant cresyl blue colours the Rees–Ecker fluid; diluted blood in it looks a faint lilac
    fluid: { name: 'Rees–Ecker fluid', color: '#60a5fa', mixed: '#a5a8f0' },
    steps: ['clean', 'prick', 'blood', 'fluid', 'mix', 'discard', 'charge', 'settle', 'count', 'calc'],
    // Platelets in the 25 squares (× 2000 per µL): normal 1.8–3.6 lakh, dengue 30,000–70,000, after splenectomy 5–6.4 lakh
    subjects: [
        { id: 'normal', name: 'Normal subject', n: [90, 180] },
        { id: 'low', name: 'Dengue fever (thrombocytopenia)', n: [15, 35] },
        { id: 'high', name: 'After splenectomy (thrombocytosis)', n: [250, 320] },
    ],
    // Platelets are refractile: they are found by racking the fine adjustment up and down with the iris diaphragm
    // partly closed, when they shine silvery and dust does not (Jain p. 53, Ghai p. 115, Pal p. 126)
    racking: true,
};

const STEP_NAMES: Record<StepId, string> = {
    clean: 'Clean', prick: 'Prick', blood: 'Blood', fluid: 'Fluid', mix: 'Mix', discard: 'Discard', charge: 'Charge', settle: 'Settle', count: 'Count', calc: 'Result',
};

// --- Timing (ms) ---
const CLEAN_RUB = 1000, CLEAN_TIME = 2400;
const PRICK_TIME = 600, DROP_TIME = 700;
const MOVE = 700;               // pipette carried to where it is used, and back
const DRAW = 1200, FLUID = 1600, SHAKE = 2200, DISCARD = 1600;
// Charging, slowly enough to follow: with the pipette held at 45° just above the platform at the coverslip edge, a
// drop forms at its tip; the pipette is lowered until the drop (never the pipette) touches the platform and the edge
// of the coverslip; capillary action draws the fluid under the coverslip; the filled chamber is held in view
const CH_FORM = 1600, CH_TOUCH = 1000, CH_FILL = 2600, CH_HOLD = 900;
const CHARGE = CH_FORM + CH_TOUCH + CH_FILL + CH_HOLD;
const LID = 600, WAIT = 3000;   // petri dish put on, 15 minutes run on the stopwatch, dish lifted
const SETTLE_MIN = 15;
const DUR: Record<StepId, number> = {
    clean: CLEAN_TIME, prick: PRICK_TIME + DROP_TIME,
    blood: MOVE + DRAW + MOVE, fluid: MOVE + FLUID + MOVE, mix: MOVE + SHAKE + MOVE, discard: MOVE + DISCARD + MOVE, charge: MOVE + CHARGE + MOVE,
    settle: LID + WAIT + LID, count: 0, calc: 0,
};
const DROPS = 4;                // drops discarded from the stem

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// --- Bench layouts ---
interface Layout {
    w: number; h: number;
    tip: Pt;                    // fingertip
    rest: Pt; pip: number;      // pipette tip when it lies on the bench, and the pipette's size
    glass: Pt & { s: number };  // watch glass of diluting fluid
    paper: Pt & { s: number };  // filter paper the first drops are discarded on
    chamber: Pt & { s: number };
    watch: Pt;
    inset: Pt & { r: number };  // side view of the chamber while it is charged
    caption: { x: number; y: number; maxChars: number };
}
const WIDE: Layout = {
    w: 1000, h: 650,
    tip: { x: 280, y: 200 }, rest: { x: 180, y: 345 }, pip: 1.2,
    glass: { x: 165, y: 500, s: 1.3 }, paper: { x: 430, y: 515, s: 1.5 },
    chamber: { x: 775, y: 470, s: 1.25 }, watch: { x: 870, y: 90 },
    inset: { x: 845, y: 155, r: 145 },
    caption: { x: 500, y: 622, maxChars: 72 },
};
const NARROW: Layout = {
    w: 700, h: 860,
    tip: { x: 230, y: 200 }, rest: { x: 40, y: 350 }, pip: 0.95,
    glass: { x: 120, y: 565, s: 1.15 }, paper: { x: 320, y: 590, s: 1.3 },
    chamber: { x: 520, y: 610, s: 0.85 }, watch: { x: 540, y: 160 },
    inset: { x: 550, y: 185, r: 140 },
    caption: { x: 350, y: 790, maxChars: 46 },
};

const INSET_FADE = 500;         // ms for the side view to fade after charging

// --- Diluting pipette, tip at (0, 0) and lying along +x ---
// Stem to the 1 mark, bulb with its bead, the top mark (101 or 11), then the rubber tube and mouthpiece (GK Pal Fig 6.1).
const STEM = 300;
const PIP = {
    rbc: { rx: 60, ry: 22, bead: '#b91c1c', top: '101', mouth: '#e11d27' },
    wbc: { rx: 46, ry: 16, bead: '#f8fafc', top: '11', mouth: '#f4f4f5' },
};
const PIP_MID = 280;            // the pipette is turned about this point when it is shaken

interface Seg { x0: number; x1: number; color: string }
const Pipette = ({ kind, segs, bulb, bulbColor, streak, bead, neck, fluidColor }: {
    kind: 'rbc' | 'wbc'; segs: Seg[]; bulb: number; bulbColor: string; streak: number; bead: number; neck: boolean; fluidColor: string;
}) => {
    const g = PIP[kind];
    const b0 = STEM, b1 = STEM + 2 * g.rx, cx = STEM + g.rx;
    const clipId = `bulb-${kind}`;
    return (
        <g>
            <defs>
                <clipPath id={clipId}><rect x={b0} y={-g.ry} width={2 * g.rx * bulb} height={2 * g.ry} /></clipPath>
            </defs>
            {/* Mouthpiece and rubber tube */}
            <rect x={b1 + 35} y={-6} width={85} height={12} rx={5} fill="#7f1d1d" opacity={0.55} />
            <rect x={b1 + 118} y={-7} width={24} height={14} rx={4} fill={g.mouth} stroke="#7f1d1d" strokeWidth={1} />
            {/* Glass: tapered tip, stem, bulb and neck */}
            <path d={`M 0 -2.5 L 18 -7 L ${b0 + 6} -7 L ${b0 + 6} 7 L 18 7 L 0 2.5 Z`} fill="rgba(226, 240, 255, 0.35)" stroke="#cbd5e1" strokeWidth={1.2} />
            <rect x={b1 - 6} y={-6} width={50} height={12} rx={2} fill="rgba(226, 240, 255, 0.35)" stroke="#cbd5e1" strokeWidth={1.2} />
            <ellipse cx={cx} cy={0} rx={g.rx} ry={g.ry} fill="rgba(226, 240, 255, 0.3)" stroke="#cbd5e1" strokeWidth={1.4} />
            {/* Liquid in the bore of the stem */}
            {segs.map((s, i) => <rect key={i} x={s.x0} y={-2.2} width={Math.max(0, s.x1 - s.x0)} height={4.4} fill={s.color} />)}
            {neck && <rect x={b1 - 2} y={-2.2} width={14} height={4.4} fill={bulbColor} />}
            {/* Liquid in the bulb, with a streak of blood until it is mixed */}
            {bulb > 0 && (
                <g clipPath={`url(#${clipId})`}>
                    <ellipse cx={cx} cy={0} rx={g.rx - 2} ry={g.ry - 2} fill={bulbColor} opacity={0.85} />
                    {streak > 0 && <path d={`M ${b0 + 4} 0 C ${cx - 20} -12 ${cx} 10 ${cx + 25} -4 C ${cx + 35} -9 ${b1 - 15} 4 ${b1 - 6} 0`} fill="none" stroke="#b91c1c" strokeWidth={5} opacity={0.8 * streak} strokeLinecap="round" />}
                </g>
            )}
            {/* Bead */}
            <circle cx={cx + bead * (g.rx - 12)} cy={g.ry * 0.35} r={6} fill={g.bead} stroke="#475569" strokeWidth={1} />
            {/* Graduations: tenths on the stem, 0.5 and 1 numbered, the top mark above the bulb */}
            {Array.from({ length: 10 }, (_, i) => (i + 1) * 30).map(x => (
                <line key={x} x1={x} y1={-7} x2={x} y2={x % 150 === 0 ? -15 : -11} stroke="#1e3a8a" strokeWidth={1.2} />
            ))}
            <text x={150} y={-20} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#bfdbfe">0.5</text>
            <text x={STEM} y={-20} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#bfdbfe">1</text>
            <line x1={b1 + 10} y1={-6} x2={b1 + 10} y2={-14} stroke="#1e3a8a" strokeWidth={1.4} />
            <text x={b1 + 10} y={-19} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#bfdbfe">{g.top}</text>
        </g>
    );
};

// --- Improved Neubauer (Bright-Line) chamber seen from above, centre (0, 0), drawn to scale in mm as in
// NeubauerChamber.tsx (GK Pal Fig 6.10): a thick 75 × 33 mm slide; across its middle an H of ground-glass moats (one
// each side of the central platform) and the transverse trench that splits the platform into two silvered floor
// pieces, each with a ruled 3 × 3 mm grid; blue print on the lateral platforms; a 22 mm coverslip resting on the
// lateral platforms. `fill` is how far the upper floor piece is charged, from the edge of the coverslip. ---
const CH_MM = 4.4;              // px per mm
const COVER = 11 * CH_MM;       // half the coverslip
const Chamber = ({ fill, color }: { fill: number; color: string }) => (
    <g transform={`scale(${CH_MM})`}>
        <defs>
            <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#cbd5e1" /><stop offset="45%" stopColor="#94a3b8" /><stop offset="55%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#8b97a6" />
            </linearGradient>
        </defs>
        {/* The slide, 4 mm thick: its front edge shows below the top face */}
        <rect x={-37.5} y={-16.5} width={75} height={35} rx={0.8} fill="#9fb4c4" opacity={0.45} />
        <rect x={-37.5} y={-16.5} width={75} height={33} rx={0.8} fill="#e6eef5" opacity={0.3} stroke="#cbd5e1" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
        {/* Moats either side of the central platform and the trench across it, with frosted floors */}
        {[-1, 1].map(s => <rect key={s} x={s < 0 ? -9 : 6} y={-16.5} width={3} height={33} fill="#ece6ea" opacity={0.5} />)}
        <rect x={-6} y={-1} width={12} height={2} fill="#ece6ea" opacity={0.5} />
        {/* Silvered floor pieces, each with its ruled grid */}
        {[-1, 1].map(s => (
            <g key={s}>
                <rect x={-6} y={s < 0 ? -16.5 : 1} width={12} height={15.5} fill="url(#silver)" opacity={0.85} />
                <g transform={`translate(-1.5 ${s * 7.6 - 1.5})`}>
                    <rect x={0} y={0} width={3} height={3} fill="#f1f5f9" stroke="#334155" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    <path d="M 1 0 V 3 M 2 0 V 3 M 0 1 H 3 M 0 2 H 3" stroke="#334155" strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
                    <path d="M 1.2 1 V 2 M 1.4 1 V 2 M 1.6 1 V 2 M 1.8 1 V 2 M 1 1.2 H 2 M 1 1.4 H 2 M 1 1.6 H 2 M 1 1.8 H 2" stroke="#475569" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                </g>
            </g>
        ))}
        {fill > 0 && <rect x={-6} y={-11} width={12} height={10 * fill} fill={color} opacity={0.6} />}
        {/* Blue print on the lateral platforms */}
        <text x={-23} y={-3} textAnchor="middle" fontSize={2.3} fontWeight="bold" fill="#3b4fc4">
            <tspan x={-23}>Depth</tspan><tspan x={-23} dy={2.8}>0.100 mm</tspan><tspan x={-23} dy={4.2}>0.0025 mm²</tspan>
        </text>
        <text x={23} y={-3} textAnchor="middle" fontSize={2.3} fontWeight="bold" fill="#3b4fc4">
            <tspan x={23}>NEUBAUER</tspan><tspan x={23} dy={2.8}>IMPROVED</tspan><tspan x={23} dy={2.8}>BRIGHT-LINE</tspan>
        </text>
        {/* Coverslip across the central platform; its bright edges are what show */}
        <rect x={-11} y={-11} width={22} height={22} fill="#ffffff" opacity={0.1} stroke="#e2e8f0" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
    </g>
);

// --- Side view of the chamber along its length while it is charged, centre (0, 0), with the depth much exaggerated:
// the counting platform with the coverslip 0.1 mm above it (it rests on the lateral platforms, which are out of this
// cut and left out so as not to confuse), and the transverse trench in the middle. The pipette is held at 45° just above the platform at the edge of the coverslip
// (GK Pal p. 43): a drop forms at its tip; it is lowered until the drop, not the pipette, meets the platform and the
// coverslip edge; the pipette is lifted away, leaving the drop, and capillary action draws the fluid into the gap,
// where it stops at the trench. ---
const SideView = ({ fill, form, touch, color, tip }: { fill: number; form: number; touch: number; color: string; tip: boolean }) => {
    // Until it touches, the drop hangs from the tip; once it has touched, the pipette is lifted away and the drop is
    // left on the platform at the coverslip edge, where it is used up as the gap fills
    const attached = fill <= 0;
    const drop = 9 * form;                                // drop at the tip
    const pool = attached ? drop * clamp01((touch - 0.6) / 0.4) : 9 * (1 - 0.85 * fill);
    const lift = attached ? 1 - touch : easeOut(clamp01(fill / 0.25));
    return (
        <g>
            {[-1, 1].map(s => <rect key={s} x={s < 0 ? -120 : 8} y={12} width={112} height={66} fill="#94a3b8" opacity={0.55} />)}
            {[-1, 1].map(s => <line key={s} x1={s < 0 ? -120 : 8} y1={12} x2={s < 0 ? -8 : 120} y2={12} stroke="#e2e8f0" strokeWidth={2.5} />)}
            <rect x={-8} y={12} width={16} height={30} fill="#0f172a" />
            <rect x={-8} y={42} width={16} height={36} fill="#94a3b8" opacity={0.55} />
            {fill > 0 && <rect x={-86} y={0} width={78 * fill} height={12} fill={color} opacity={0.85} />}
            {/* Arrow along the gap while the fluid is drawn in */}
            {fill > 0.22 && fill < 1 && (
                <path d={`M ${-86 + 78 * fill - 22} 6 H ${-86 + 78 * fill - 6} M ${-86 + 78 * fill - 11} 2 L ${-86 + 78 * fill - 6} 6 L ${-86 + 78 * fill - 11} 10`} fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
            )}
            {/* The drop where it has met the platform. Once the pipette is lifted it stays on its own, joined to the fluid
                in the gap by a meniscus at the coverslip edge, and shrinks towards that edge as it is drawn in. */}
            {attached && pool > 0.3 && <path d={`M ${-92 - 1.5 * pool} 12 A ${1.5 * pool} ${0.7 * pool} 0 0 1 ${-92 + 1.5 * pool} 12 Z`} fill={color} opacity={0.95} />}
            {!attached && pool > 0.3 && (() => {
                const w = 2.2 * pool, h = Math.min(12, 1.3 * pool + 3);
                return <path d={`M ${-86 - w} 12 Q ${-86 - w} ${12 - h} -86 ${12 - h} L -84 ${12 - h} L -84 12 Z`} fill={color} opacity={0.95} />;
            })()}
            <rect x={-86} y={-8} width={172} height={8} fill="#e2e8f0" opacity={0.35} stroke="#f8fafc" strokeWidth={1.2} />
            {tip && (
                <g transform={`translate(${-6 * lift} ${-14 * lift})`}>
                    {/* Pipette at 45°, its tip kept clear of the platform; the drop at the tip does the touching */}
                    <line x1={-155} y1={-64} x2={-95} y2={-4} stroke="rgba(226, 240, 255, 0.35)" strokeWidth={8} strokeLinecap="round" />
                    <line x1={-155} y1={-64} x2={-95} y2={-4} stroke="#cbd5e1" strokeWidth={1} opacity={0.7} />
                    <line x1={-153} y1={-62} x2={-97} y2={-6} stroke={color} strokeWidth={2.4} opacity={attached ? 0.9 : 0.4} />
                    {attached && drop > 0.3 && <circle cx={-94} cy={-4 + 0.75 * drop} r={drop} fill={color} opacity={0.95} />}
                </g>
            )}
            <text x={-30} y={-16} fontSize={14} fontWeight="bold" fill="#e2e8f0" textAnchor="middle">Coverslip</text>
            <line x1={24} y1={0} x2={24} y2={12} stroke="#fcd34d" strokeWidth={1.5} />
            <text x={30} y={-14} fontSize={14} fontWeight="bold" fill="#fcd34d" textAnchor="middle">0.1 mm</text>
            <text x={-50} y={36} fontSize={12} fontWeight="bold" fill="#0f172a" textAnchor="middle">Platform</text>
            <text x={0} y={56} fontSize={12} fontWeight="bold" fill="#e2e8f0" textAnchor="middle">Trench</text>
        </g>
    );
};

// --- Counting area: the central square of the chamber, 5 × 5 medium squares, positions in medium-square units ---
// In the ruling drawn by NeubauerRuling (900 units for 3 mm) the central square runs from 300 to 600, so a medium
// square is 60 units. A cell within BAND of a line lies on it (the triple lines are about 4 units wide). Each square
// takes the cells on its top and left lines and leaves those on its bottom and right lines to the next square
// (Pal, Ghai, Jain); cells on the bottom and right lines of the whole area are not counted.
const N_SQ = 5;
const SQ_UNITS = 60, ORIGIN = 300;
const BAND = 0.035;
const axisSquare = (u: number) => { const k = Math.round(u); return Math.abs(u - k) < BAND ? k : Math.floor(u); };
const squareOf = (u: number, v: number) => {
    const i = axisSquare(u), j = axisSquare(v);
    return i >= 0 && j >= 0 && i < N_SQ && j < N_SQ ? j * N_SQ + i : null;
};
const gx = (u: number) => ORIGIN + u * SQ_UNITS;
const MARGIN = 0.4;             // cells are drawn this far round the central square too

interface Particle { id: number; u: number; v: number; kind: 'plt' | 'dust'; rot: number; size: number; sq: number | null }
interface Sample { particles: Particle[]; rbcs: { u: number; v: number }[]; n: number }

function makeSample(subject: Subject): Sample {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const n = Math.round(rnd(subject.n[0], subject.n[1] + 0.99) - 0.5);
    const particles: Particle[] = [];
    const inside = (k: number) => k + BAND + Math.random() * (1 - 2 * BAND);
    const plt = (u: number, v: number) => particles.push({ id: particles.length, u, v, kind: 'plt', rot: rnd(0, 180), size: rnd(0.85, 1.2), sq: null });
    for (let c = 0; c < n; c++) {
        const i = Math.floor(Math.random() * N_SQ), j = Math.floor(Math.random() * N_SQ);
        let u = inside(i), v = inside(j);
        // About one in eight lies on the square's top or left line
        const r = Math.random();
        if (r < 0.06) v = j + rnd(-0.012, 0.012);
        else if (r < 0.12) u = i + rnd(-0.012, 0.012);
        plt(u, v);
    }
    // A few on the bottom and right lines of the whole area, which are not counted
    for (let c = 0; c < 4; c++) {
        const along = rnd(0.1, N_SQ - 0.1), edge = N_SQ + rnd(-0.012, 0.012);
        if (c % 2) plt(edge, along); else plt(along, edge);
    }
    // The same suspension outside the central square, at the same density
    const outside = Math.round((n / 25) * ((N_SQ + 2 * MARGIN) ** 2 - 25));
    for (let c = 0; c < outside; c++) {
        let u = 0, v = 0;
        do { u = rnd(-MARGIN, N_SQ + MARGIN); v = rnd(-MARGIN, N_SQ + MARGIN); } while (u > -BAND && u < N_SQ + BAND && v > -BAND && v < N_SQ + BAND);
        plt(u, v);
    }
    // Dust and debris, the main source of error (Pal)
    for (let c = 0; c < 9; c++) particles.push({ id: particles.length, u: rnd(0.05, N_SQ - 0.05), v: rnd(0.05, N_SQ - 0.05), kind: 'dust', rot: rnd(0, 360), size: rnd(0.8, 1.4), sq: null });
    for (const p of particles) p.sq = p.kind === 'plt' ? squareOf(p.u, p.v) : null;
    // Red cells are not lysed by Rees–Ecker fluid: about 100 in each medium square at 1 in 200
    const rbcs = Array.from({ length: Math.round(100 * (N_SQ + 2 * MARGIN) ** 2) }, () => ({ u: rnd(-MARGIN, N_SQ + MARGIN), v: rnd(-MARGIN, N_SQ + MARGIN) }));
    return { particles, rbcs, n };
}

// The suspension in the chamber: red cells, platelets and dust drawn to scale over the ruling (platelets a little
// larger than life so they can be tapped). Counted platelets are ringed in green; missed ones, once shown, in amber.
const RedCells = React.memo(({ rbcs }: { rbcs: Sample['rbcs'] }) => (
    <g>
        {rbcs.map((r, k) => (
            <g key={k}>
                <circle cx={gx(r.u)} cy={gx(r.v)} r={1.12} fill="#fde8e8" stroke="#f2b8b8" strokeWidth={0.25} opacity={0.85} />
                <circle cx={gx(r.u)} cy={gx(r.v)} r={0.45} fill="#fff5f5" opacity={0.9} />
            </g>
        ))}
    </g>
));

// --- Main component ---
const HemocytometerCount: React.FC<{ cfg: CountConfig; onBack: () => void }> = ({ cfg, onBack }) => {
    const [subject, setSubject] = useState<Subject>(cfg.subjects[0]);
    const [sample, setSample] = useState<Sample>(() => makeSample(cfg.subjects[0]));
    const [acts, setActs] = useState<Partial<Record<StepId, number>>>({});
    const [view, setView] = useState<'bench' | 'scope'>('bench');
    const [counted, setCounted] = useState<Set<number>>(new Set());
    const [finished, setFinished] = useState(false);
    const [checks, setChecks] = useState(0);               // tries at "I have finished counting" that missed some
    const stage = useMicroscopeStage();
    const [focus, setFocus] = useState(0);                 // fine adjustment, -1 (racked down) to 1 (racked up); 0 sharp
    const [autoRack, setAutoRack] = useState(false);
    const [irisClosed, setIrisClosed] = useState(false);
    const [tapLabel, setTapLabel] = useState<{ x: number; y: number; text: string; color: string; t: number } | null>(null);
    const [calc, setCalc] = useState<{ dil: number | null; vol: number | null; checked: boolean | null }>({ dil: null, vol: null, checked: null });
    const [now, setNow] = useState(() => performance.now());
    const [message, setMessage] = useState<string | null>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const { label: hoverLabel, hover } = useHoverLabel();
    const narrow = useNarrowScreen();
    const L = narrow ? NARROW : WIDE;
    const questionSet = questionSetFor(cfg.quizId);
    const fl = cfg.fluid;

    const at = (id: StepId) => acts[id] ?? null;
    const done = (id: StepId) => at(id) !== null && performance.now() - at(id)! >= DUR[id];
    const busy = (id: StepId) => at(id) !== null && now - at(id)! < DUR[id];

    const countDone = finished;
    const stepIdx = cfg.steps.findIndex(id => (id === 'count' ? !countDone : id === 'calc' ? true : at(id) === null));
    const step = stepIdx + 1;
    const lastStep = cfg.steps.length;
    const stepId = cfg.steps[stepIdx];
    const prevId = stepIdx > 0 ? cfg.steps[stepIdx - 1] : null;
    const prevBusy = prevId !== null && prevId !== 'count' && !done(prevId);

    const animating = useMemo(() => cfg.steps.some(id => busy(id) || (at(id) !== null && now - at(id)! < DUR[id] + INSET_FADE + 50)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [acts, now]);
    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    useEffect(() => {
        if (!autoRack) return;
        const t0 = performance.now();
        const id = window.setInterval(() => setFocus(0.6 * Math.sin(((performance.now() - t0) / 2400) * Math.PI * 2)), 50);
        return () => window.clearInterval(id);
    }, [autoRack]);

    const act = (id: StepId) => {
        if (id !== stepId || prevBusy) return;
        if (id === 'prick' && !done('clean')) { setMessage('Let the spirit dry completely before pricking.'); return; }
        const t = performance.now();
        setNow(t); setMessage(null);
        setActs(a => (a[id] === undefined ? { ...a, [id]: t } : a));
        if (id === 'count') { setView('scope'); stage.setZoom(10); stage.setPosition({ x: 0, y: 0 }); }
    };

    // Skip the bench work: every step before the count is done at once and the chamber goes under the microscope
    const skipToCount = () => {
        const t = performance.now();
        const a: Partial<Record<StepId, number>> = {};
        for (const id of cfg.steps) { if (id === 'count' || id === 'calc') break; a[id] = t - 100000; }
        setActs({ ...a, count: t }); setNow(t); setMessage(null);
        setView('scope'); stage.setZoom(10); stage.setPosition({ x: 0, y: 0 });
    };

    // Going back: step i and every step after it are undone. Back from the result returns to the count with the taps
    // kept; going back to the bench clears the count, as the chamber is charged afresh.
    const undoFrom = (i: number) => {
        const id = cfg.steps[i];
        if (id === 'calc') return;
        setMessage(null); setFinished(false); setCalc({ dil: null, vol: null, checked: null }); setNow(performance.now());
        if (id === 'count') return;
        setActs(a => { const n = { ...a }; for (const s of cfg.steps.slice(i)) delete n[s]; return n; });
        setCounted(new Set()); setChecks(0); setView('bench');
    };
    const back = () => { if (stepIdx > 0) undoFrom(stepIdx - 1); };

    const reset = (subj: Subject = subject) => {
        setSample(makeSample(subj));
        setActs({}); setView('bench'); setCounted(new Set()); setFinished(false); setChecks(0); setFocus(0); setAutoRack(false); setIrisClosed(false); setTapLabel(null);
        setCalc({ dil: null, vol: null, checked: null }); setMessage(null); setNow(performance.now());
    };
    const changeSubject = (id: string) => { const s = cfg.subjects.find(x => x.id === id)!; setSubject(s); reset(s); };

    // --- Counting ---
    const valid = useMemo(() => sample.particles.filter(p => p.kind === 'plt' && p.sq !== null), [sample]);
    const tally = Array.from({ length: N_SQ * N_SQ }, () => 0);
    const total = Array.from({ length: N_SQ * N_SQ }, () => 0);
    for (const p of valid) { total[p.sq!]++; if (counted.has(p.id)) tally[p.sq!]++; }
    const countedN = tally.reduce((a, b) => a + b, 0);

    // A tap on the eyepiece, at a point of the ruling: the nearest platelet or speck of dust within reach is counted
    // (or uncounted, or explained)
    // A tap names what was touched with a short label on the slide (and explains in the panel when it is not counted)
    const showLabel = (x: number, y: number, text: string, color: string) => {
        const t = performance.now();
        setTapLabel({ x, y, text, color, t });
        window.setTimeout(() => setTapLabel(l => (l && l.t === t ? null : l)), 1800);
    };
    const tapAt = (x: number, y: number) => {
        if (countDone || stepId !== 'count') return;
        const reach = Math.max(1.6, 14 / (stage.scale * (800 / 900)));
        let best: Particle | null = null, bestD = reach;
        for (const p of sample.particles) {
            const d = Math.hypot(gx(p.u) - x, gx(p.v) - y);
            if (d < bestD) { best = p; bestD = d; }
        }
        let rbc: { u: number; v: number } | null = null, rbcD = 1.4;
        if (!best) for (const r of sample.rbcs) {
            const d = Math.hypot(gx(r.u) - x, gx(r.v) - y);
            if (d < rbcD) { rbc = r; rbcD = d; }
        }
        if (!best && !rbc) { setMessage(null); return; }
        if (stage.zoom < 40) {
            showLabel(x, y, 'Switch to 40x', '#fbbf24');
            setMessage('Platelets are too small to count at this power. Switch to the 40x (high power) objective.');
            return;
        }
        if (!best) {
            showLabel(gx(rbc!.u), gx(rbc!.v), 'Red cell', '#fda4af');
            setMessage('That is a red cell. Rees–Ecker fluid does not lyse red cells; count only the tiny platelets between them.');
            return;
        }
        const p = best, px = gx(p.u), py = gx(p.v);
        if (p.kind === 'dust') {
            showLabel(px, py, 'Dust', '#d6d3d1');
            setMessage('That is dust, not a platelet: dark and angular, and it does not shine when you rack the fine focus. Platelets are refractile: they shine silvery as the focus passes through them.');
            return;
        }
        if (counted.has(p.id)) {
            setCounted(c => { const n = new Set(c); n.delete(p.id); return n; });
            showLabel(px, py, 'Platelet: count undone', '#cbd5e1'); setMessage(null);
            return;
        }
        if (p.sq !== null) {
            setCounted(c => new Set(c).add(p.id));
            showLabel(px, py, 'Platelet: counted', '#6ee7b7'); setMessage(null);
            return;
        }
        const onEdge = (Math.abs(p.u - N_SQ) < BAND && p.v > -BAND && p.v < N_SQ + BAND) || (Math.abs(p.v - N_SQ) < BAND && p.u > -BAND && p.u < N_SQ + BAND);
        showLabel(px, py, 'Platelet: not counted here', '#fbbf24');
        setMessage(onEdge
            ? 'This one lies on the bottom or right line of the central square: leave it. Count cells on the top and left lines only.'
            : 'That platelet is outside the central square (the 25 squares in triple lines). Count only inside it.');
    };

    const checkCount = () => {
        const left = valid.filter(p => !counted.has(p.id));
        if (!left.length) { setFinished(true); setMessage(null); return; }
        setChecks(c => c + 1);
        const squares = total.filter((t, sq) => tally[sq] < t).length;
        setMessage(checks >= 1
            ? `${left.length} platelet${left.length > 1 ? 's are' : ' is'} still not counted: they are circled in amber.`
            : `Not yet: ${squares} square${squares > 1 ? 's have' : ' has'} platelets you have not counted (outlined in amber in the grid). Remember the cells on the top and left lines.`);
    };
    // Jumping ahead: every step before step i is done at once (any still running is finished), and step i becomes the
    // next one. Jumping to the result counts all 25 squares too.
    const jumpTo = (i: number) => {
        const t = performance.now();
        setActs(a => {
            const n = { ...a };
            for (const s of cfg.steps.slice(0, i)) {
                if (s === 'count' || s === 'calc') continue;
                if (n[s] === undefined || t - n[s]! < DUR[s]) n[s] = t - 100000;
            }
            if (cfg.steps[i] === 'calc') n.count = n.count ?? t;
            return n;
        });
        setMessage(null); setNow(t);
        if (cfg.steps[i] === 'calc') { setCounted(new Set(valid.map(p => p.id))); setFinished(true); setView('scope'); }
    };
    const countRest = () => { setCounted(new Set([...counted, ...valid.map(p => p.id)])); setMessage(null); };
    const goToSquare = (sq: number) => {
        stage.setZoom(40);
        stage.setPosition(positionFor(gx((sq % N_SQ) + 0.5), gx(Math.floor(sq / N_SQ) + 0.5)));
        setView('scope'); setMessage(null);
    };

    const N = valid.length;
    const result = N * 2000;

    // --- Captions ---
    const e = (id: StepId) => (at(id) === null ? -1 : now - at(id)!);
    const caption = (() => {
        switch (stepId) {
            case 'clean': return 'Step 1: Clean the fingertip with spirit and let it dry';
            case 'prick': return busy('clean') ? 'Letting the spirit dry completely…' : 'Step 2: Prick the fingertip with a sterile lancet; do not squeeze the finger';
            case 'blood': return 'Step 3: Suck blood exactly up to the 0.5 mark of the RBC pipette';
            case 'fluid': return busy('blood') ? 'Sucking blood up to the 0.5 mark…' : `Step 4: Wipe the tip, then quickly draw ${fl.name} up to the 101 mark (1 in 200)`;
            case 'mix': return busy('fluid') ? `Drawing ${fl.name} up to 101…` : 'Step 5: Shake the pipette for at least 1 minute to mix';
            case 'discard': return busy('mix') ? 'Shaking: the bead in the bulb mixes the blood with the fluid…' : 'Step 6: Discard the first 3–5 drops: the stem holds only diluting fluid';
            case 'charge': return busy('discard') ? 'Discarding the first drops…' : 'Step 7: Charge the chamber: pipette at 45° at the edge of the coverslip; let the drop touch the platform';
            case 'settle': {
                if (!busy('charge')) return 'Step 8: Cover with a petri dish lined with moist filter paper; wait 15 min';
                const t = e('charge') - MOVE;
                return t < CH_FORM ? 'Pipette at 45°, just above the platform at the coverslip edge: a drop forms at the tip…'
                    : t < CH_FORM + CH_TOUCH ? 'The drop, not the pipette, touches the platform and the edge of the coverslip…'
                        : t < CH_FORM + CH_TOUCH + CH_FILL ? 'The pipette is lifted away; capillary action draws the drop under the coverslip…'
                            : 'The counting area is filled up to the trench, without overflowing';
            }
            case 'count': return busy('settle') ? 'Waiting 15 minutes for the platelets to settle in one plane…' : 'Step 9: Count the platelets in all 25 squares of the central square under high power';
            default: return `Platelets counted in 25 squares: ${N}`;
        }
    })();

    // --- Bench drawing state ---
    const tip = L.tip;
    const site = pulpSite(tip.x, tip.y);       // the ball of the finger, where it is pricked
    const cleanE = e('clean');
    const wet = cleanE < 0 ? 0 : cleanE < CLEAN_RUB ? 1 : 1 - clamp01((cleanE - CLEAN_RUB) / (CLEAN_TIME - CLEAN_RUB));
    const swab = cleanE >= 0 && cleanE < CLEAN_RUB ? { x: site.x + Math.sin(cleanE / 60) * 28, y: site.y - 16 } : null;
    const prickE = e('prick');
    const lancet = prickE >= 0 && prickE < PRICK_TIME ? (() => {
        const k = Math.sin((Math.PI * prickE) / PRICK_TIME);
        return { x: site.x, y: lerp(site.y - 80, site.y + 3, k) };
    })() : null;
    // The drop of blood: wells up on the ball of the finger after the prick, shrinks as blood is drawn up
    const bloodE = e('blood');
    const drawK = bloodE < MOVE ? 0 : easeOut((bloodE - MOVE) / DRAW);
    const drop = prickE < PRICK_TIME ? 0 : easeOut((prickE - PRICK_TIME) / DROP_TIME) * (1 - 0.5 * drawK);
    const dropPos = { x: site.x, y: site.y + 2 - (4 + 11 * drop) };

    // Pipette pose: centre point and angle. Each action carries it from the bench to where it is used and back.
    const mid = PIP_MID * L.pip;
    const restPose = { x: L.rest.x + mid, y: L.rest.y, a: 0 };
    const poseAtTip = (p: Pt, a: number) => ({ x: p.x + mid * Math.cos((a * Math.PI) / 180), y: p.y + mid * Math.sin((a * Math.PI) / 180), a });
    const ch = L.chamber;
    const target: Partial<Record<StepId, { x: number; y: number; a: number }>> = {
        blood: poseAtTip({ x: dropPos.x + 3 + 12 * drop, y: dropPos.y }, -10),
        fluid: poseAtTip({ x: L.glass.x, y: L.glass.y - 2 }, -30),
        mix: { x: restPose.x, y: restPose.y - 60, a: 0 },
        discard: poseAtTip({ x: L.paper.x, y: L.paper.y - 20 * L.paper.s - 12 }, -62),
        charge: poseAtTip({ x: ch.x, y: ch.y - (COVER + 9) * ch.s }, -45),
    };
    const EFFECT: Partial<Record<StepId, number>> = { blood: DRAW, fluid: FLUID, mix: SHAKE, discard: DISCARD, charge: CHARGE };
    let pose = restPose;
    let activeId: StepId | null = null, effK = 0;
    for (const id of ['blood', 'fluid', 'mix', 'discard', 'charge'] as StepId[]) {
        const t = e(id);
        if (t < 0 || t >= DUR[id]) continue;
        const eff = EFFECT[id]!, tg = target[id]!;
        const k = t < MOVE ? easeInOut(t / MOVE) : t < MOVE + eff ? 1 : 1 - easeInOut((t - MOVE - eff) / MOVE);
        pose = { x: lerp(restPose.x, tg.x, k), y: lerp(restPose.y, tg.y, k), a: lerp(0, tg.a, k) };
        activeId = id; effK = clamp01((t - MOVE) / eff);
    }
    // Shaking: rocked end over end about its middle
    const shaking = activeId === 'mix' && effK > 0 && effK < 1;
    if (shaking) pose = { ...pose, a: 28 * Math.sin(effK * Math.PI * 2 * 6) };

    // Liquid in the pipette
    const fluidE = e('fluid');
    const fK = fluidE < MOVE ? 0 : clamp01((fluidE - MOVE) / FLUID);
    const mixK = e('mix') < MOVE ? 0 : clamp01((e('mix') - MOVE) / SHAKE);
    const discardK = e('discard') < MOVE ? 0 : clamp01((e('discard') - MOVE) / DISCARD);
    const blood = '#b91c1c';
    const stemColor = discardK >= 1 ? fl.mixed : fl.color;
    const segs: Seg[] = [];
    let bulbK = 0;
    if (fluidE < 0) {
        if (bloodE >= 0) segs.push({ x0: 0, x1: 150 * drawK, color: blood });
    } else if (fK < 0.35) {
        const front = 150 + 150 * (fK / 0.35);
        segs.push({ x0: 0, x1: front - 150, color: fl.color }, { x0: front - 150, x1: front, color: blood });
    } else {
        segs.push({ x0: 0, x1: STEM + 6, color: stemColor });
        bulbK = (fK - 0.35) / 0.65;
    }
    const chargeE = at('charge') === null ? -1 : e('charge') - MOVE;
    const formK = chargeE < 0 ? 0 : easeOut(chargeE / CH_FORM);                       // drop forming at the tip
    const touchK = chargeE < 0 ? 0 : easeInOut((chargeE - CH_FORM) / CH_TOUCH);       // lowered until the drop touches
    const chargeK = chargeE < 0 ? 0 : clamp01((chargeE - CH_FORM - CH_TOUCH) / CH_FILL); // gap filled
    // After charging the stem is partly empty
    if (chargeK > 0 && segs.length) segs[0] = { ...segs[0], x0: 60 * chargeK };
    const bulbColor = mixK > 0 ? fl.mixed : fl.color;
    const streak = fluidE < 0 ? 0 : 1 - mixK;
    const bead = shaking ? Math.sin(effK * Math.PI * 2 * 6) : 0;

    // Drops falling from the tip when discarding
    const tipNow = { x: pose.x - mid * Math.cos((pose.a * Math.PI) / 180), y: pose.y - mid * Math.sin((pose.a * Math.PI) / 180) };
    const fallingDrops = activeId === 'discard' && discardK > 0 && discardK < 1
        ? Array.from({ length: DROPS }, (_, i) => { const k = discardK * DROPS - i; return k > 0 && k < 1 ? { x: tipNow.x, y: lerp(tipNow.y + 4, L.paper.y, easeOut(k)), i } : null; }).filter(Boolean) as { x: number; y: number; i: number }[]
        : [];
    const spotsOnPaper = Math.min(DROPS, Math.floor(discardK * DROPS + (discardK >= 1 ? 0 : 0)));

    // Side view while charging, faded out once it is done
    const insetOn = at('charge') === null ? 0 : Math.min(clamp01(e('charge') / 300), 1 - clamp01((e('charge') - DUR.charge) / INSET_FADE));

    // Petri dish over the charged chamber: lowered, 15 minutes on the stopwatch, lifted
    const settleE = e('settle');
    const lid = settleE < 0 ? 0 : settleE < LID ? easeOut(settleE / LID) : settleE < LID + WAIT ? 1 : settleE < DUR.settle ? 1 - easeOut((settleE - LID - WAIT) / LID) : 0;
    const waitedS = settleE < LID ? 0 : clamp01((settleE - LID) / WAIT) * SETTLE_MIN * 60;
    const waiting = settleE >= LID && settleE < LID + WAIT;
    const mixedS = mixK * 60;

    const showMissed = checks >= 2 && !countDone;
    // How the slide looks at this focus. Platelets just above best focus shine silvery (refractile); below it they
    // look dull grey with a dark rim; red cells only go softer; dust stays dark. With the iris open the bright field
    // washes the shine out; partly closed, the field dims and the shine stands out.
    const racks = !!cfg.racking;
    const glint = racks ? Math.max(0, 1 - ((focus - 0.35) / 0.3) ** 2) * (irisClosed ? 1 : 0.3) : 0;
    const dull = racks ? clamp01(-focus * 2) : 0;
    const rbcSoft = racks ? 1 - 0.4 * Math.min(1, Math.abs(focus) * 1.5) : 1;
    const plateletLayer = useMemo(() => sample.particles.map(p => {
        const x = gx(p.u), y = gx(p.v);
        return p.kind === 'plt' ? (
            <g key={p.id} transform={`translate(${x} ${y}) rotate(${p.rot}) scale(${p.size})`}>
                {!racks && <ellipse cx={0} cy={0} rx={0.95} ry={0.82} fill="#ffffff" opacity={0.8} />}
                <ellipse cx={0} cy={0} rx={0.58} ry={0.45} fill={racks ? '#dbe4f8' : '#c7d7fe'} stroke={racks ? '#9fb2dc' : '#3b82f6'} strokeWidth={0.13} />
                {!racks && <circle cx={-0.15} cy={-0.1} r={0.16} fill="#ffffff" />}
            </g>
        ) : (
            <path key={p.id} transform={`translate(${x} ${y}) rotate(${p.rot}) scale(${0.2 * p.size})`} d="M -5 -3 L 1 -6 L 6 -1 L 3 5 L -3 4 L -6 1 Z" fill="#44403c" opacity={0.85} />
        );
    }), [sample, racks]);
    const glintLayer = useMemo(() => racks ? sample.particles.filter(p => p.kind === 'plt').map(p => (
        <g key={p.id}>
            <circle cx={gx(p.u)} cy={gx(p.v)} r={1.25 * p.size} fill="#e2e8f0" opacity={0.55} />
            <circle cx={gx(p.u)} cy={gx(p.v)} r={0.6 * p.size} fill="#ffffff" />
        </g>
    )) : null, [sample, racks]);
    const dullLayer = useMemo(() => racks ? sample.particles.filter(p => p.kind === 'plt').map(p => (
        <circle key={p.id} cx={gx(p.u)} cy={gx(p.v)} r={0.6 * p.size} fill="#94a3b8" stroke="#334155" strokeWidth={0.2} />
    )) : null, [sample, racks]);
    const renderSlide = () => (
        <div className="relative w-full h-full bg-[#f8fafc]">
            <svg width="100%" height="100%" viewBox="0 0 900 900" className="opacity-90" overflow="visible">
                <NeubauerRuling />
                <g opacity={rbcSoft}><RedCells rbcs={sample.rbcs} /></g>
                {plateletLayer}
                {racks && <g opacity={dull}>{dullLayer}</g>}
                {racks && irisClosed && <rect x={0} y={0} width={900} height={900} fill="#0f172a" opacity={0.22} />}
                {racks && <g opacity={glint}>{glintLayer}</g>}
                {sample.particles.map(p => {
                    const isCounted = counted.has(p.id);
                    const missed = showMissed && p.sq !== null && p.kind === 'plt' && !isCounted;
                    if (!isCounted && !missed) return null;
                    const x = gx(p.u), y = gx(p.v);
                    return (
                        <g key={p.id}>
                            {isCounted && <circle cx={x} cy={y} r={1.5} fill="none" stroke="#10b981" strokeWidth={0.32} />}
                            {missed && <circle cx={x} cy={y} r={1.9} fill="none" stroke="#f59e0b" strokeWidth={0.32} strokeDasharray="0.6 0.4" />}
                        </g>
                    );
                })}
                {tapLabel && (() => {
                    const k = 1 / (stage.scale * (800 / 900));    // one screen pixel in slide units
                    const fs = 13 * k, w = tapLabel.text.length * 7.2 * k + 12 * k, h = 20 * k;
                    const lx = tapLabel.x, ly = tapLabel.y - 12 * k;
                    return (
                        <g pointerEvents="none">
                            <rect x={lx - w / 2} y={ly - h} width={w} height={h} rx={5 * k} fill="#0f172a" opacity={0.85} />
                            <text x={lx} y={ly - h / 2 + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="bold" fill={tapLabel.color}>{tapLabel.text}</text>
                        </g>
                    );
                })()}
            </svg>
        </div>
    );

    const stepTitle: Record<StepId, string> = {
        clean: 'Clean with spirit', prick: 'Prick the finger', blood: 'Blood to 0.5', fluid: `${fl.name.split(' ')[0]} fluid to ${PIP[cfg.pipette].top}`,
        mix: 'Shake to mix', discard: 'Discard first drops', charge: 'Charge the chamber', settle: 'Cover, wait 15 min', count: 'Look under high power', calc: 'Calculate',
    };
    const stepColor: Partial<Record<StepId, string>> = {
        clean: 'bg-sky-600 hover:bg-sky-500 border-sky-500', prick: 'bg-rose-600 hover:bg-rose-500 border-rose-500', blood: 'bg-red-600 hover:bg-red-500 border-red-500',
        fluid: 'bg-blue-600 hover:bg-blue-500 border-blue-500', mix: 'bg-violet-600 hover:bg-violet-500 border-violet-500', discard: 'bg-slate-600 hover:bg-slate-500 border-slate-500',
        charge: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500', settle: 'bg-teal-600 hover:bg-teal-500 border-teal-500', count: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500',
    };
    const counting = stepId === 'count' && at('count') !== null;

    // --- Calculation ---
    const DIL = [20, 200], VOL = [0.004, 0.1, 0.4];
    const calcRight = calc.dil === 200 && calc.vol === 0.1;
    const lakh = (x: number) => (x / 100000).toFixed(2);

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">{cfg.title}</h1>
                        <p className="text-slate-400 text-xs">{cfg.subtitle}</p>
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
                    {view === 'bench' ? (
                        <div className="relative lg:flex-1 lg:min-h-[300px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                            <HoverLabel label={hoverLabel} />
                            <ZoomableSvg w={L.w} h={L.h} className="w-full h-auto lg:h-full max-h-[75vh]">
                                <Finger x={tip.x} y={tip.y} wet={wet} swab={swab} hoverProps={hover('Fingertip, cleaned with spirit')} />
                                {drop > 0.02 && <ellipse cx={dropPos.x} cy={dropPos.y} rx={4 + 12 * drop} ry={4 + 11 * drop} fill="#b91c1c" />}
                                {lancet && <Lancet x={lancet.x} y={lancet.y} />}

                                {/* Watch glass of diluting fluid */}
                                <g transform={`translate(${L.glass.x} ${L.glass.y}) scale(${L.glass.s})`} {...hover(`Watch glass of ${fl.name}`)}>
                                    <ellipse cx={0} cy={6} rx={78} ry={24} fill="rgba(226, 240, 255, 0.15)" stroke="#94a3b8" strokeWidth={1.5} />
                                    <ellipse cx={0} cy={4} rx={58} ry={14} fill={fl.color} opacity={0.6} />
                                    <text x={0} y={52} textAnchor="middle" fontSize={14} fill="#93c5fd" fontWeight="bold">{fl.name}</text>
                                </g>

                                {/* Filter paper for the discarded drops */}
                                <g transform={`translate(${L.paper.x} ${L.paper.y}) scale(${L.paper.s})`} {...hover('Filter paper: the first drops are discarded here')}>
                                    <rect x={-45} y={-20} width={90} height={50} rx={3} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.2} />
                                    {Array.from({ length: spotsOnPaper }, (_, i) => (
                                        <circle key={i} cx={-24 + i * 16} cy={4 + (i % 2) * 6} r={6} fill={i < 2 ? fl.color : fl.mixed} opacity={0.75} />
                                    ))}
                                    <text x={0} y={46} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight="bold">Filter paper</text>
                                </g>

                                {/* Neubauer chamber, under a petri dish while the platelets settle */}
                                <g transform={`translate(${ch.x} ${ch.y}) scale(${ch.s})`} {...hover('Improved Neubauer chamber: two ruled floor pieces 0.1 mm deep, under the coverslip')}>
                                    {settleE >= 0 && settleE < DUR.settle && <ellipse cx={0} cy={4} rx={205} ry={112} fill="#64748b" opacity={0.45 * Math.min(1, lid * 3)} />}
                                    <Chamber fill={chargeK} color={fl.mixed} />
                                    {lid > 0 && (
                                        <g transform={`translate(0 ${-160 * (1 - lid)})`} opacity={Math.min(1, lid * 2)}>
                                            <ellipse cx={0} cy={0} rx={215} ry={120} fill="rgba(226, 240, 255, 0.1)" stroke="#e2e8f0" strokeWidth={2} />
                                            <ellipse cx={-70} cy={-64} rx={60} ry={16} fill="#ffffff" opacity={0.12} />
                                        </g>
                                    )}
                                    <text x={0} y={settleE >= 0 && settleE < DUR.settle ? 142 : 98} textAnchor="middle" fontSize={14} fill="#94a3b8" fontWeight="bold">
                                        {settleE >= 0 && settleE < DUR.settle ? 'Petri dish lined with moist filter paper' : 'Neubauer chamber'}
                                    </text>
                                </g>

                                {/* The pipette */}
                                <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.a}) scale(${L.pip}) translate(${-PIP_MID} 0)`} {...hover(cfg.pipette === 'rbc' ? 'RBC pipette: marks 0.5, 1 and 101; red bead in the bulb' : 'WBC pipette: marks 0.5, 1 and 11; white bead in the bulb')}>
                                    <Pipette kind={cfg.pipette} segs={segs} bulb={bulbK} bulbColor={bulbColor} streak={streak} bead={bead} neck={fK >= 1} fluidColor={fl.color} />
                                </g>
                                {fallingDrops.map(d => <circle key={d.i} cx={d.x} cy={d.y} r={5} fill={d.i < 2 ? fl.color : fl.mixed} />)}
                                {activeId === 'charge' && formK > 0 && chargeK < 1 && <circle cx={tipNow.x + 2} cy={tipNow.y + 3} r={6 * formK * (1 - 0.7 * chargeK)} fill={fl.mixed} />}

                                {/* Timers: the minute of shaking, the 15-minute wait */}
                                {shaking && (
                                    <text x={L.w / 2} y={44} textAnchor="middle" fontSize={24} fontWeight="bold" fill="#c4b5fd">Shaking… {mmss(mixedS)}</text>
                                )}
                                {(waiting || (settleE >= 0 && settleE < DUR.settle)) && (
                                    <g {...hover('Stopwatch: 15 minutes for the platelets to settle')}>
                                        <rect x={L.watch.x - 90} y={L.watch.y - 46} width={180} height={92} rx={22} fill="#1e293b" stroke="#475569" strokeWidth={3} />
                                        <rect x={L.watch.x - 72} y={L.watch.y - 30} width={144} height={52} rx={8} fill="#a3b18a" />
                                        <text x={L.watch.x} y={L.watch.y + 12} textAnchor="middle" fontSize={40} fontWeight="bold" fill="#1f2937" fontFamily="monospace">{mmss(waitedS)}</text>
                                        <text x={L.watch.x} y={L.watch.y + 38} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight="bold">SETTLING</text>
                                    </g>
                                )}

                                {/* Magnified side view of the chamber being charged */}
                                {insetOn > 0 && (
                                    <g transform={`translate(${L.inset.x} ${L.inset.y})`} opacity={insetOn} {...hover('Side view: the fluid fills the 0.1 mm gap under the coverslip and stops at the trench')}>
                                        <defs><clipPath id="side-view"><circle cx={0} cy={0} r={L.inset.r} /></clipPath></defs>
                                        <circle cx={0} cy={0} r={L.inset.r} fill="#0f172a" />
                                        <g clipPath="url(#side-view)">
                                            <g transform={`scale(${L.inset.r / 92}) translate(40 -4)`}>
                                                <SideView fill={chargeK} form={formK} touch={touchK} color={fl.mixed} tip={activeId === 'charge'} />
                                            </g>
                                        </g>
                                        <circle cx={0} cy={0} r={L.inset.r} fill="none" stroke="#475569" strokeWidth={4} />
                                        <text x={0} y={L.inset.r + 24} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#94a3b8">
                                            {chargeK >= 1 ? 'Filled to the trench, not overflowing' : chargeK > 0 ? 'Capillary action draws it in' : touchK > 0 ? 'The drop touches the platform' : 'A drop forms at the tip'}
                                        </text>
                                    </g>
                                )}

                                <text x={L.caption.x} y={L.caption.y} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">
                                    {wrapCaption(caption, L.caption.maxChars).map((line, i) => <tspan key={i} x={L.caption.x} dy={i === 0 ? 0 : 28}>{line}</tspan>)}
                                </text>
                            </ZoomableSvg>
                        </div>
                    ) : (
                        <div className="relative flex flex-col lg:flex-1 min-h-0">
                            <Eyepiece stage={stage} renderSlide={renderSlide} onTap={tapAt} className="rounded-xl min-h-[360px] md:min-h-[560px]" />
                            {racks && !countDone && (
                                <div className="mt-2 md:mt-0 md:absolute md:bottom-3 md:left-3 z-30 bg-slate-900/90 border border-slate-700 rounded-lg p-2 space-y-1.5 text-[11px] font-bold text-slate-300 w-full md:w-44">
                                    <label className="block">
                                        <span className="flex justify-between"><span>Fine focus</span><span className="text-slate-500">{focus > 0.05 ? 'racked up' : focus < -0.05 ? 'racked down' : 'sharp'}</span></span>
                                        <input type="range" min={-1} max={1} step={0.02} value={focus} aria-label="Fine adjustment"
                                            onChange={e => { setAutoRack(false); setFocus(Number(e.target.value)); }} className="w-full accent-indigo-500" />
                                    </label>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button onClick={() => setAutoRack(a => !a)}
                                            className={`py-1 rounded-md border ${autoRack ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}>
                                            {autoRack ? 'Racking…' : 'Rack up/down'}
                                        </button>
                                        <button onClick={() => setIrisClosed(c => !c)}
                                            className={`py-1 rounded-md border ${irisClosed ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}>
                                            Iris: {irisClosed ? 'part closed' : 'open'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right panel */}
                <div className="w-full flex-1 lg:flex-none lg:w-[400px] bg-slate-900 border-l border-slate-800 p-4 lg:p-5 space-y-3 lg:overflow-y-auto">
                    <ol className="grid grid-cols-5 gap-x-1.5 gap-y-1 text-[11px] font-bold" aria-label={`Step ${step} of ${lastStep}`}>
                        {cfg.steps.map((id, i) => {
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
                            {cfg.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                    {message && <p className="text-sm text-amber-400">{message}</p>}

                    {/* Counting: tally of the 25 squares, stage controls and the rules */}
                    {at('count') !== null && !countDone && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-sky-400" /> Counting rules</h3>
                            <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                                <li>Use the <span className="text-white font-bold">40x</span> objective; count in all <span className="text-white font-bold">25 squares</span> of the central square.</li>
                                <li>Platelets: tiny round or oval bodies between the red cells. {racks ? <>Close the iris a little and <span className="text-white font-bold">rack the fine focus</span> up and down: platelets shine silvery, dust does not.</> : null} Tap one to count it, tap again to undo.</li>
                                <li>Include cells on the top and left lines; leave those on the bottom and right lines.</li>
                            </ul>
                            <div className="flex items-center gap-3 pt-1">
                                <div className="grid grid-cols-5 gap-0.5 shrink-0" aria-label="Platelets counted in each of the 25 squares">
                                    {tally.map((t, sq) => (
                                        <button key={sq} onClick={() => goToSquare(sq)} title="Move the stage to this square"
                                            className={`w-8 h-8 text-xs font-bold rounded-sm border ${checks > 0 && t < total[sq] ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-600'} ${t > 0 ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-900 text-slate-500'}`}>
                                            {t || ''}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <p className="text-slate-400 text-xs">Counted so far</p>
                                    <p className="text-3xl font-bold font-mono text-white">{countedN}</p>
                                    <p className="text-slate-500 text-[11px]">Tap a square in the grid to move the stage there.</p>
                                </div>
                            </div>
                            <button onClick={checkCount} className="w-full bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded-lg py-1.5 font-bold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> I have counted all 25 squares
                            </button>
                            <button onClick={countRest} className="w-full bg-slate-900 hover:bg-slate-700 border border-indigo-500/40 text-indigo-200 rounded-lg py-1.5 font-bold flex items-center justify-center gap-1.5">
                                <Wand2 className="w-4 h-4" /> {countedN > 0 ? 'Count the rest for me' : 'Count all 25 squares for me'}
                            </button>
                        </div>
                    )}

                    {/* Calculation and result */}
                    {countDone && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <p className="text-slate-200">Platelets in the 25 squares: <span className="font-bold text-white text-base">N = {N}</span></p>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase">Dilution</label>
                            <div className="grid grid-cols-2 gap-2">
                                {DIL.map(d => (
                                    <button key={d} onClick={() => setCalc(c => ({ ...c, dil: d, checked: null }))}
                                        className={`py-1.5 rounded-lg border font-bold ${calc.dil === d ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>1 in {d}</button>
                                ))}
                            </div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase">Volume of diluted blood counted</label>
                            <div className="grid grid-cols-3 gap-2">
                                {VOL.map(v => (
                                    <button key={v} onClick={() => setCalc(c => ({ ...c, vol: v, checked: null }))}
                                        className={`py-1.5 rounded-lg border font-bold ${calc.vol === v ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{v} µL</button>
                                ))}
                            </div>
                            <button onClick={() => setCalc(c => ({ ...c, checked: c.dil === 200 && c.vol === 0.1 }))} disabled={calc.dil === null || calc.vol === null}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-sm disabled:opacity-50">Check</button>
                            {calc.checked === false && (
                                <p className="text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    {calc.dil !== 200 ? 'Blood to 0.5 and fluid to 101 in the RBC pipette: the bulb holds 100 parts with 0.5 of blood, a dilution of 1 in 200.' : 'The 25 squares cover 1 mm² and the chamber is 0.1 mm deep: 1 × 1 × 0.1 = 0.1 mm³, that is 0.1 µL.'}</p>
                            )}
                            {calc.checked === true && calcRight && (
                                <>
                                    <p className="text-slate-300 font-mono">{N} × 200 ÷ 0.1 = {N} × 2000</p>
                                    <p className={`font-bold flex items-center gap-2 ${subject.id === 'normal' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <CheckCircle2 className="w-4 h-4" /> {result.toLocaleString('en-IN')} per µL ({lakh(result)} lakh/µL)
                                    </p>
                                    <p className="text-slate-300">Normal: 1.5–4 lakh/µL (Pal, Jain); 2.5–5 lakh/µL (Ghai).</p>
                                    {subject.id === 'low' && <p className="text-slate-300">Thrombocytopenia. Causes include viral infections such as dengue, bone marrow depression, hypersplenism and drugs. Below about 50,000/µL bleeding into the skin (purpura) appears, and the bleeding time is prolonged.</p>}
                                    {subject.id === 'high' && <p className="text-slate-300">Thrombocytosis. The spleen normally holds a share of the platelets and destroys old ones, so the count rises after it is removed. It also rises after trauma or surgery and with stress (adrenaline).</p>}
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

export const PlateletCount: React.FC<{ onBack: () => void }> = ({ onBack }) => <HemocytometerCount cfg={PLATELET} onBack={onBack} />;
