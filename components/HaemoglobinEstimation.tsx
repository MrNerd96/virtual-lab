import React, { useState, useEffect } from 'react';
import { ArrowLeft, Droplet, FlaskConical, RefreshCw, CheckCircle2, XCircle, Timer, Pipette, ListChecks } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// --- Types & Constants ---

type Phase = 'empty' | 'acid' | 'acid-ready' | 'blood' | 'waiting' | 'dilute';
type ReadingKind = 'darker' | 'match' | 'lighter';
type RGB = [number, number, number];
type Point = { x: number; y: number };

interface Sample {
    id: string;
    label: string;
    hb: number; // g/dL, a multiple of one 0.2 g/dL tube division
    note: string;
}

const SAMPLES: Sample[] = [
    { id: 'male', label: 'Healthy adult male', hb: 15.4, note: 'Normal adult male: 14 to 18 g/dL. Testosterone stimulates erythropoietin, so values are higher in men.' },
    { id: 'female', label: 'Healthy adult female', hb: 13.2, note: 'Normal adult female: 12 to 16 g/dL.' },
    { id: 'anaemia', label: 'Iron deficiency anaemia', hb: 8.6, note: 'Low Hb. Iron deficiency is the commonest anaemia in India.' },
    { id: 'pregnancy', label: 'Pregnancy', hb: 11.2, note: 'Physiological fall in Hb: plasma volume rises more than red cell mass (haemodilution).' },
    { id: 'newborn', label: 'Newborn', hb: 19.6, note: 'High at birth (16 to 22 g/dL) because the RBC count is high.' },
    { id: 'polycythaemia', label: 'Polycythaemia (high altitude)', hb: 20.2, note: 'High Hb: high altitude, chronic hypoxia or polycythaemia vera.' },
];

const randomUnknownHb = () => (35 + Math.floor(Math.random() * 56)) * 0.2; // 7.0 to 18.0 g/dL

// Sahli-Adams tube (round): graduated in g/dL from 2 to 24 (yellow, one division = 0.2 g/dL) and in
// % from 10 to 140 (red). N/10 HCl goes to the lowest mark; the acid haematin is diluted until its
// colour matches the standard, and the level reached (lower meniscus) is the haemoglobin in g/dL.
const START_LEVEL = 2;
const DROP_STEP = 0.2;    // one drop of distilled water raises the level by one division
const MAX_LEVEL = 24;
const PERCENT_100 = 14.5; // g/dL shown as 100 % on the Sahli-Adams percentage scale
const WAIT_SECONDS = 10;  // the 10 minute wait, sped up (1 s = 1 min)
const O2_PER_G = 1.34;    // mL O2 carried by 1 g of fully saturated Hb

// --- Colour model ---
// Light through the solution is attenuated per channel as 10^(-k·e). `depth` is the concentration
// relative to the standard (1 = exact match). Below the match point the extinction grows as depth³ so
// small mismatches near the standard are visible; above it logarithmically, so undiluted acid haematin
// is very dark brown rather than black.
const K_HEMATIN: RGB = [0.161, 0.365, 0.805]; // depth 1 gives the standard golden brown
const K_OXYHB: RGB = [0.06, 0.9, 0.8];        // red, before conversion to acid haematin
const ACID_COLOR: RGB = [222, 236, 245];      // clear N/10 HCl
const WATER_COLOR: RGB = [214, 236, 248];     // distilled water

const extinction = (depth: number) => (depth <= 1 ? depth ** 3 : 1 + 2.5 * Math.log(depth));
const transmit = (k: RGB, depth: number): RGB => k.map(kc => 255 * 10 ** (-kc * extinction(depth))) as RGB;
const hematin = (depth: number) => transmit(K_HEMATIN, depth);
const oxyHb = (depth: number) => transmit(K_OXYHB, depth);
const STANDARD = hematin(1);
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as RGB;
const shade = (c: RGB, k: number): RGB => c.map(v => v * k) as RGB;
const css = (c: RGB) => `rgb(${c.map(v => Math.round(Math.min(255, Math.max(0, v)))).join(', ')})`;

// --- Geometry (apparatus coordinates) ---
const W = 1000;
const H = 750;
const OFFSET_Y = 40;  // apparatus drawn 40 px down so the pipette stays in view above the tube
const BENCH_Y = 600;  // back edge of the bench top
const TUBE_X = 500;
const INNER_HALF = 24;
const TUBE_TOP = 118;
const INNER_BOTTOM = 600;
const yOf = (v: number) => 596 - 18.5 * v; // g/dL level → y
const STIRRER_X = 486;
const DROPPER_TIP_Y = 104;

// Comparator: tall grey block; the tube goes in through the top. Three narrow slots in the lower half
// show a brown standard, the tube against white, and another standard.
const BLOCK = { x: 410, y: 190, w: 180, h: 450 };
const SIDE = 14; // depth of the top and right faces seen in perspective
const SLOT_Y = 360;
const SLOT_H = 236;
const SLOT_W = 34;
const SLOTS_X = [433, 483, 533]; // left edges: standard, tube, standard
const STIRRER_LENGTH = 460;
// The Hb meter, tube and stirrer are drawn at 65% (scaled about the foot of the meter) so the Hb pipette,
// which is about as long as the tube, has room to be lifted over it. Points given in the meter's own
// coordinates are converted with toScreen.
const METER_SCALE = 0.65;
const METER_FOOT: Point = { x: TUBE_X, y: 674 };
const METER_TRANSFORM = `translate(${METER_FOOT.x * (1 - METER_SCALE)} ${METER_FOOT.y * (1 - METER_SCALE)}) scale(${METER_SCALE})`;
const toScreen = (p: Point): Point => ({ x: METER_FOOT.x + (p.x - METER_FOOT.x) * METER_SCALE, y: METER_FOOT.y + (p.y - METER_FOOT.y) * METER_SCALE });
const meterRect = (x: number, y: number, w: number, h: number) => {
    const p = toScreen({ x, y });
    return { x: p.x, y: p.y, w: w * METER_SCALE, h: h * METER_SCALE };
};

// --- Timelines ---
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

const DROP_FALL = 0.25;
const SWELL = 0.2; // a drop swells at the dropper tip before it falls

// Adding N/10 HCl
const ACID_DROPS = 8;
const ACID_IN = 0.5;
const ACID_GAP = 0.24;
const ACID_OUT = 0.4;
const acidRelease = (i: number) => ACID_IN + SWELL + i * ACID_GAP;
const ACID_DURATION = acidRelease(ACID_DROPS - 1) + DROP_FALL + ACID_OUT;
const HCL_BOTTLE_X = 758;
const HCL_DROPPER_REST: Point = { x: HCL_BOTTLE_X + 40, y: 610 };
const HCL_DROPPER_TUBE: Point = toScreen({ x: TUBE_X, y: DROPPER_TIP_Y });

// Finger prick, then 20 µL of blood blown into the acid
const BLOOD_STEPS = [
    { id: 'swab', d: 1.0, caption: 'Cleaning the fingertip with a spirit swab' },
    { id: 'prick', d: 0.8, caption: 'Pricking the fingertip boldly with a sterile lancet' },
    { id: 'firstDrop', d: 0.6, caption: 'The first drop is mixed with tissue fluid' },
    { id: 'wipeFirst', d: 0.8, caption: 'Wiping away the first drop with dry cotton' },
    { id: 'secondDrop', d: 0.7, caption: 'A fresh drop wells up: do not squeeze the finger' },
    { id: 'toFinger', d: 0.8, caption: 'Touching the pipette tip to the drop' },
    { id: 'draw', d: 1.3, caption: 'Drawing blood exactly to the 20 µL mark, no air bubbles' },
    { id: 'wipe', d: 0.8, caption: 'Wiping blood off the outside of the tip' },
    { id: 'toTube', d: 1.0, caption: 'Taking the pipette to the tube' },
    { id: 'dip', d: 0.5, caption: 'Tip to the bottom of the acid' },
    { id: 'expel', d: 0.9, caption: 'Blowing the blood into the acid' },
    { id: 'rinse', d: 2.1, caption: 'Rinsing the pipette with the acid, 3 times' },
    { id: 'out', d: 1.0, caption: 'Withdrawing the pipette' },
    { id: 'mix', d: 1.2, caption: 'Mixing with the stirrer' },
] as const;
type BloodStepId = typeof BLOOD_STEPS[number]['id'];
const BLOOD_DURATION = BLOOD_STEPS.reduce((sum, s) => sum + s.d, 0);

function bloodStep(t: number): { id: BloodStepId; p: number; caption: string } {
    let start = 0;
    for (const step of BLOOD_STEPS) {
        if (t < start + step.d) return { id: step.id, p: clamp01((t - start) / step.d), caption: step.caption };
        start += step.d;
    }
    const last = BLOOD_STEPS[BLOOD_STEPS.length - 1];
    return { id: last.id, p: 1, caption: last.caption };
}

const PIPETTE_LENGTH = 300;
const PIPETTE_MARK = 200; // height of the 20 µL mark above the tip
const PIPETTE_REST: Point = { x: 684, y: 640 }; // standing in its holder
// Subject's hand rests on the bench pointing right; the drop forms on top of the fingertip
const FINGER_TOP = 556;  // top edge of the extended index finger
const FINGER_END = 304;  // x of the fingertip
const DROP_X = FINGER_END - 18;
const FINGER_TOUCH: Point = { x: DROP_X, y: FINGER_TOP - 12 };
const WIPE_POS: Point = { x: DROP_X, y: FINGER_TOP - 40 };
const ABOVE_TUBE: Point = toScreen({ x: TUBE_X, y: 108 });
const IN_TUBE: Point = toScreen({ x: TUBE_X, y: 552 });
const SWAB_REST: Point = { x: 136, y: 680 };
const SWAB_AT: Point = { x: DROP_X + 16, y: FINGER_TOP + 4 };
const COTTON_REST: Point = { x: 184, y: 680 };
const COTTON_AT: Point = { x: DROP_X + 12, y: FINGER_TOP - 8 };
const LANCET_REST: Point = { x: 268, y: 682 };
const LANCET_ABOVE: Point = { x: DROP_X, y: FINGER_TOP - 50 };
const LANCET_AT: Point = { x: DROP_X, y: FINGER_TOP + 3 };

// Diluting with distilled water
const WATER_GAP = 0.28;
// Stirring: the tip moves from its resting place to the tube's centre, then round from side to side
const stirSwing = (time: number) => Math.min(1, time * 8) * (TUBE_X - STIRRER_X + 12 * Math.sin(time * 26));
const STIR_TIME = 0.5;
const RIPPLE_TIME = 0.3;
const waterRelease = (i: number) => SWELL + i * WATER_GAP;
const pendingDuration = (n: number) => waterRelease(n - 1) + DROP_FALL + STIR_TIME;
const WATER_DROPPER_REST: Point = { x: 908, y: 628 };
const WATER_DROP_X = TUBE_X + 14; // in the meter's coordinates
const WATER_DROPPER_TUBE: Point = toScreen({ x: WATER_DROP_X, y: DROPPER_TIP_Y });

const READING_LABELS: Record<ReadingKind, string> = {
    darker: 'Just darker',
    match: 'Matches',
    lighter: 'Just lighter',
};

// A reading is correct if the colour really was darker / matching / lighter at that level
const readingCorrect = (kind: ReadingKind, value: number, hb: number) => {
    const eps = 1e-6;
    if (kind === 'darker') return value < hb - eps && value >= hb - 1.0 - eps;
    if (kind === 'match') return Math.abs(value - hb) <= 0.2 + eps;
    return value > hb + eps && value <= hb + 1.0 + eps;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

// --- SVG parts ---

// Shading across a glass cylinder (standard rods and the tube): darker at the edges, so rods and tube
// look alike and match exactly when the colours are equal
const CylinderStops = ({ color }: { color: RGB }) => (
    <>
        <stop offset="0" stopColor={css(shade(color, 0.68))} />
        <stop offset="0.28" stopColor={css(color)} />
        <stop offset="0.55" stopColor={css(color)} />
        <stop offset="1" stopColor={css(shade(color, 0.72))} />
    </>
);

const SceneDefs = () => (
    <defs>
        <filter id="hb-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <linearGradient id="hb-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#eef2f6" /><stop offset="1" stopColor="#d9e0e8" /></linearGradient>
        <linearGradient id="hb-bench" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ddd6cc" /><stop offset="1" stopColor="#c4bcb0" /></linearGradient>
        <linearGradient id="hb-grey" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#50545b" /><stop offset="0.5" stopColor="#3e4147" /><stop offset="1" stopColor="#33363b" />
        </linearGradient>
        {/* Fine grain of the moulded plastic */}
        <filter id="hb-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.35 0 0 0 -0.1" />
            <feComposite operator="in" in2="SourceGraphic" />
        </filter>
        <radialGradient id="hb-opal" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e3e9ef" /></radialGradient>
        <linearGradient id="hb-standard" x1="0" x2="1" y1="0" y2="0"><CylinderStops color={STANDARD} /></linearGradient>
        <linearGradient id="hb-skin" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#e0a47f" /><stop offset="0.45" stopColor="#f2c6a6" /><stop offset="1" stopColor="#d99a75" /></linearGradient>
        <radialGradient id="hb-blood-drop" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ef4444" /><stop offset="0.6" stopColor="#b91c1c" /><stop offset="1" stopColor="#7f1d1d" /></radialGradient>
        <linearGradient id="hb-wood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b7834f" /><stop offset="1" stopColor="#8a5a2e" /></linearGradient>
    </defs>
);

const Shadow = ({ cx, cy, rx, ry = 7 }: { cx: number; cy: number; rx: number; ry?: number }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(15,23,42,0.22)" filter="url(#hb-blur)" />
);

// Lab wall and bench top (absolute coordinates). They extend past the viewBox (the svg is drawn with
// overflow visible) so the frame is filled whatever the screen's shape.
const LabBackground = () => (
    <g>
        <rect x={-2000} y={-2000} width={W + 4000} height={2000} fill="#eef2f6" />
        <rect x={-2000} y={0} width={W + 4000} height={BENCH_Y + OFFSET_Y} fill="url(#hb-wall)" />
        <rect x={-2000} y={BENCH_Y + OFFSET_Y} width={W + 4000} height={H - BENCH_Y - OFFSET_Y} fill="url(#hb-bench)" />
        <rect x={-2000} y={H} width={W + 4000} height={2000} fill="#c4bcb0" />
        <rect x={-2000} y={BENCH_Y + OFFSET_Y - 3} width={W + 4000} height={5} fill="#a8a29e" opacity={0.55} />
    </g>
);

// Sahli's Hb meter, part behind the tube: top face with the opening, right side, white behind the tube slot
const ComparatorBack = () => {
    const { x, y, w, h } = BLOCK;
    return (
        <g>
            <Shadow cx={500} cy={676} rx={150} ry={9} />
            <path d={`M ${x + w} ${y} L ${x + w + SIDE} ${y - SIDE} L ${x + w + SIDE} ${y + h - SIDE} L ${x + w} ${y + h} Z`} fill="#26282c" />
            <path d={`M ${x} ${y} L ${x + SIDE} ${y - SIDE} L ${x + w + SIDE} ${y - SIDE} L ${x + w} ${y} Z`} fill="#5b5f66" />
            <ellipse cx={TUBE_X + SIDE / 2} cy={y - SIDE / 2} rx={32} ry={5} fill="#0b0c0e" />
            <rect x={SLOTS_X[1]} y={SLOT_Y} width={SLOT_W} height={SLOT_H} fill="url(#hb-opal)" />
        </g>
    );
};

// Front of the Hb meter, drawn over the tube: grainy face with the tube slot cut out, the two standards,
// the label plate and the stepped base
const ComparatorFront = () => {
    const { x, y, w, h } = BLOCK;
    const face = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z M ${SLOTS_X[1]} ${SLOT_Y} V ${SLOT_Y + SLOT_H} H ${SLOTS_X[1] + SLOT_W} V ${SLOT_Y} Z`;
    return (
        <g pointerEvents="none">
            <path d={face} fill="url(#hb-grey)" fillRule="evenodd" />
            <path d={face} fill="#000" fillRule="evenodd" filter="url(#hb-grain)" />
            <line x1={x} y1={y + 0.5} x2={x + w} y2={y + 0.5} stroke="#6b7078" strokeWidth={1.5} />
            {[SLOTS_X[0], SLOTS_X[2]].map(sx => (
                <g key={sx}>
                    <rect x={sx} y={SLOT_Y} width={SLOT_W} height={SLOT_H} fill="url(#hb-standard)" />
                    <rect x={sx + 7} y={SLOT_Y + 6} width={4} height={SLOT_H - 12} rx={2} fill="#ffffff" opacity={0.28} />
                </g>
            ))}
            {SLOTS_X.map(sx => (
                <rect key={sx} x={sx - 1} y={SLOT_Y - 1} width={SLOT_W + 2} height={SLOT_H + 2} fill="none" stroke="#17191c" strokeWidth={3} />
            ))}
            {/* Label plate */}
            <rect x={x + 16} y={y + 26} width={w - 32} height={84} rx={4} fill="#0d0e10" stroke="#5b5f66" strokeWidth={1} />
            <text x={x + w / 2} y={y + 56} textAnchor="middle" fill="#f1f5f9" fontSize={26} fontWeight="bold" letterSpacing={1}>Hb METER</text>
            <text x={x + w / 2} y={y + 80} textAnchor="middle" fill="#f1f5f9" fontSize={19} fontWeight="bold">(SAHLI'S)</text>
            <text x={x + w / 2} y={y + 101} textAnchor="middle" fill="#cbd5e1" fontSize={14} letterSpacing={0.5}>ROUND TUBE TYPE</text>
            {/* Stepped base */}
            <rect x={x - 18} y={y + h - 4} width={w + 36} height={18} fill="#3a3d42" />
            <rect x={x - 18} y={y + h - 4} width={w + 36} height={2} fill="#62666d" />
            <rect x={x - 40} y={y + h + 14} width={w + 80} height={20} rx={2} fill="#303337" />
            <rect x={x - 40} y={y + h + 14} width={w + 80} height={2} fill="#5b5f66" />
        </g>
    );
};

interface Layer { baseLevel: number; baseColor: RGB; waterColor: RGB; mix: number }

// Round Sahli-Adams tube: glass, liquid with a concave meniscus, yellow g/dL and red % scales
const SahliTube = ({ level, color, layer, cloud, cloudColor, ripples }: {
    level: number; color: RGB; layer: Layer | null; cloud: number; cloudColor: RGB; ripples: number[];
}) => {
    const x0 = TUBE_X - INNER_HALF;
    const x1 = TUBE_X + INNER_HALF;
    const o = INNER_HALF + 4;
    const inner = `M ${x0} ${TUBE_TOP} L ${x0} ${INNER_BOTTOM - INNER_HALF} A ${INNER_HALF} ${INNER_HALF} 0 0 0 ${x1} ${INNER_BOTTOM - INNER_HALF} L ${x1} ${TUBE_TOP} Z`;
    const outer = `M ${TUBE_X - o} ${TUBE_TOP} L ${TUBE_X - o} ${INNER_BOTTOM - INNER_HALF} A ${o} ${o} 0 0 0 ${TUBE_X + o} ${INNER_BOTTOM - INNER_HALF} L ${TUBE_X + o} ${TUBE_TOP}`;
    const yL = yOf(level);
    const column = `M ${x0} ${yL - 4} Q ${TUBE_X} ${yL + 4} ${x1} ${yL - 4} L ${x1} ${INNER_BOTTOM + 4} L ${x0} ${INNER_BOTTOM + 4} Z`;
    const gTicks = Array.from({ length: (MAX_LEVEL - START_LEVEL) / DROP_STEP + 1 }, (_, i) => START_LEVEL + i * DROP_STEP);
    const pTicks = Array.from({ length: 14 }, (_, i) => 10 + i * 10);
    const layered = layer !== null && layer.mix < 1;

    return (
        <g>
            <defs>
                <clipPath id="hb-tube-inner"><path d={inner} /></clipPath>
                <linearGradient id="hb-liquid" x1="0" x2="1" y1="0" y2="0"><CylinderStops color={color} /></linearGradient>
                {layer && <linearGradient id="hb-liquid-base" x1="0" x2="1" y1="0" y2="0"><CylinderStops color={layer.baseColor} /></linearGradient>}
                {layer && <linearGradient id="hb-liquid-water" x1="0" x2="1" y1="0" y2="0"><CylinderStops color={layer.waterColor} /></linearGradient>}
                <radialGradient id="hb-cloud" cx="0.5" cy="0.6" r="0.5">
                    <stop offset="0" stopColor={css(cloudColor)} stopOpacity={0.95} />
                    <stop offset="1" stopColor={css(cloudColor)} stopOpacity={0} />
                </radialGradient>
            </defs>
            <path d={inner} fill="rgba(255,255,255,0.18)" />
            {level > 0.01 && (
                <g clipPath="url(#hb-tube-inner)">
                    {layered ? (
                        <>
                            {/* Freshly added water floats as a lighter layer until it is stirred in */}
                            <path d={column} fill="url(#hb-liquid-water)" />
                            <rect x={x0} y={yOf(layer!.baseLevel)} width={2 * INNER_HALF} height={INNER_BOTTOM + 4 - yOf(layer!.baseLevel)} fill="url(#hb-liquid-base)" />
                            <path d={column} fill="url(#hb-liquid)" opacity={layer!.mix} />
                        </>
                    ) : (
                        <path d={column} fill="url(#hb-liquid)" />
                    )}
                    {cloud > 0.01 && <ellipse cx={TUBE_X} cy={INNER_BOTTOM - 18} rx={30 * cloud} ry={24 * cloud} fill="url(#hb-cloud)" />}
                    {ripples.map((age, i) => (
                        <ellipse key={i} cx={TUBE_X + 12} cy={yL - 1} rx={4 + 16 * (age / RIPPLE_TIME)} ry={1.5 + 2 * (age / RIPPLE_TIME)}
                            fill="none" stroke="#ffffff" strokeOpacity={0.8 * (1 - age / RIPPLE_TIME)} strokeWidth={1.5} />
                    ))}
                </g>
            )}
            {gTicks.map((v, i) => {
                const major = i % 10 === 0; // every 2 g/dL
                const mid = i % 5 === 0;    // every 1 g/dL
                return (
                    <g key={`g-${i}`}>
                        <line x1={TUBE_X - o} x2={TUBE_X - o + (major ? 13 : mid ? 9 : 5)} y1={yOf(v)} y2={yOf(v)} stroke="#b45309" strokeWidth={major ? 2 : 1.2} />
                        {major && <text x={TUBE_X - o - 4} y={yOf(v) + 5} textAnchor="end" fill="#b45309" fontSize={13} fontWeight="bold">{Math.round(v)}</text>}
                    </g>
                );
            })}
            {pTicks.map(p => {
                const y = yOf((p * PERCENT_100) / 100);
                return (
                    <g key={`p-${p}`}>
                        <line x1={TUBE_X + o - (p % 20 === 0 ? 9 : 5)} x2={TUBE_X + o} y1={y} y2={y} stroke="#dc2626" strokeWidth={1.2} />
                        {(p - 20) % 40 === 0 && <text x={TUBE_X + o + 3} y={y + 4} fill="#dc2626" fontSize={11} fontWeight="bold">{p}</text>}
                    </g>
                );
            })}
            {/* Glass wall, reflections and rim */}
            <path d={outer} fill="none" stroke="#8a9bb0" strokeWidth={2.5} />
            <rect x={x0 + 4} y={TUBE_TOP + 8} width={4} height={INNER_BOTTOM - TUBE_TOP - 40} rx={2} fill="#ffffff" opacity={0.55} />
            <rect x={x1 - 7} y={TUBE_TOP + 8} width={2} height={INNER_BOTTOM - TUBE_TOP - 40} rx={1} fill="#ffffff" opacity={0.35} />
            <ellipse cx={TUBE_X} cy={TUBE_TOP} rx={o} ry={5} fill="rgba(255,255,255,0.3)" stroke="#8a9bb0" strokeWidth={2.5} />
        </g>
    );
};

// Clear glass stirring rod held knob end down: the rounded knob is the tip in the tube. Drawn knob-up,
// then flipped so the knob's end lands at tipY. The whole rod moves with its tip; `dx` swings the tip
// sideways, the rod pivoting at the mouth of the tube.
const Stirrer = ({ tipY, dx = 0 }: { tipY: number; dx?: number }) => {
    const top = tipY - STIRRER_LENGTH;
    const flipAt = top - 9 + tipY; // mirror about the rod's midpoint
    const tilt = (Math.atan2(dx, Math.max(40, tipY - TUBE_TOP)) * 180) / Math.PI;
    return (
        <g pointerEvents="none" transform={`rotate(${-tilt} ${STIRRER_X} ${TUBE_TOP}) translate(0 ${flipAt}) scale(1 -1)`}>
            <rect x={STIRRER_X - 3} y={top + 10} width={6} height={STIRRER_LENGTH - 10} rx={3} fill="rgba(241,245,249,0.75)" stroke="#8a9bb0" strokeWidth={1} />
            <path d={`M ${STIRRER_X - 3} ${top + 14} Q ${STIRRER_X - 9} ${top + 8} ${STIRRER_X - 8} ${top} Q ${STIRRER_X - 6} ${top - 9} ${STIRRER_X} ${top - 9} Q ${STIRRER_X + 6} ${top - 9} ${STIRRER_X + 8} ${top} Q ${STIRRER_X + 9} ${top + 8} ${STIRRER_X + 3} ${top + 14} Z`}
                fill="rgba(241,245,249,0.85)" stroke="#8a9bb0" strokeWidth={1} />
            <ellipse cx={STIRRER_X - 3} cy={top - 2} rx={2} ry={3.5} fill="#ffffff" opacity={0.9} />
            <rect x={STIRRER_X - 1.5} y={top + 16} width={1.5} height={STIRRER_LENGTH - 24} fill="#ffffff" opacity={0.8} />
        </g>
    );
};

// Glass (Pasteur) dropper with a rubber teat; tip at (x, y). `swell` grows a drop at the tip.
const Dropper = ({ x, y, liquid, swell, dropColor }: { x: number; y: number; liquid: string; swell: number; dropColor: string }) => (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <path d="M -6 -34 L -1.6 0 L 1.6 0 L 6 -34 Z" fill="rgba(255,255,255,0.55)" stroke="#8a9bb0" strokeWidth={1} />
        <rect x={-6.5} y={-78} width={13} height={45} rx={2} fill="rgba(255,255,255,0.55)" stroke="#8a9bb0" strokeWidth={1} />
        <rect x={-4} y={-60} width={8} height={26} fill={liquid} opacity={0.9} />
        <path d="M -8 -78 L -8 -92 Q -8 -108 0 -108 Q 8 -108 8 -92 L 8 -78 Z" fill="#b91c1c" />
        <rect x={-9} y={-80} width={18} height={4} rx={2} fill="#991b1b" />
        {swell > 0.01 && <circle cx={0} cy={2 + 3 * swell} r={1.5 + 3.5 * swell} fill={dropColor} stroke="#8a9bb0" strokeWidth={0.6} />}
    </g>
);

// Sahli Hb pipette with its tubing set: capillary with a single 20 µL mark, rubber tube and mouthpiece
const HbPipette = ({ x, y, fill, color }: { x: number; y: number; fill: number; color: string }) => (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <path d={`M 0 ${-PIPETTE_LENGTH} L 0 ${-PIPETTE_LENGTH - 16} Q 0 ${-PIPETTE_LENGTH - 40} 28 ${-PIPETTE_LENGTH - 40} Q 56 ${-PIPETTE_LENGTH - 40} 56 ${-PIPETTE_LENGTH - 16} L 56 ${-PIPETTE_LENGTH + 58}`}
            fill="none" stroke="#c2410c" strokeWidth={7} strokeLinecap="round" />
        <rect x={52} y={-PIPETTE_LENGTH + 56} width={8} height={26} rx={2} fill="#f8fafc" stroke="#94a3b8" />
        <path d={`M -3.5 ${-PIPETTE_LENGTH} L -3.5 -7 L -1 0 L 1 0 L 3.5 -7 L 3.5 ${-PIPETTE_LENGTH} Z`} fill="rgba(255,255,255,0.6)" stroke="#8a9bb0" strokeWidth={1} />
        {fill > 0.01 && <rect x={-2} y={-PIPETTE_MARK * fill} width={4} height={PIPETTE_MARK * fill} fill={color} />}
        <line x1={-7} x2={7} y1={-PIPETTE_MARK} y2={-PIPETTE_MARK} stroke="#0f172a" strokeWidth={2} />
        <text x={9} y={-PIPETTE_MARK + 5} fill="#1e293b" fontSize={15} fontWeight="bold">20 µL</text>
    </g>
);

const PipetteStand = () => (
    <g pointerEvents="none">
        <Shadow cx={PIPETTE_REST.x} cy={656} rx={24} ry={5} />
        <rect x={PIPETTE_REST.x - 16} y={624} width={32} height={30} rx={4} fill="url(#hb-wood)" />
        <ellipse cx={PIPETTE_REST.x} cy={626} rx={5} ry={2} fill="#3f2a14" />
    </g>
);

// Subject's hand resting on the bench, index finger pointing right; `drop` is the size of the blood drop
const Hand = ({ drop }: { drop: number }) => (
    <g pointerEvents="none">
        <Shadow cx={150} cy={654} rx={150} ry={8} />
        {/* Sleeve and wrist coming in from the left */}
        <path d="M -40 588 L 72 580 L 80 646 L -40 648 Z" fill="#3b82f6" />
        <path d="M 68 582 L 112 574 L 118 648 L 72 648 Z" fill="url(#hb-skin)" stroke="#c98d6c" strokeWidth={1.5} />
        {/* Back of the hand */}
        <path d="M 100 578 Q 104 550 140 548 L 214 550 Q 238 554 240 582 L 242 628 Q 240 650 214 650 L 112 650 Q 98 648 100 628 Z"
            fill="url(#hb-skin)" stroke="#c98d6c" strokeWidth={1.5} />
        {/* Curled middle, ring and little fingers */}
        {[[236, 600], [238, 620], [233, 639]].map(([cx, cy], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={16} ry={11} fill="url(#hb-skin)" stroke="#c98d6c" strokeWidth={1.5} />
        ))}
        {/* Thumb tucked along the side */}
        <path d="M 150 592 Q 190 584 222 592 Q 232 600 222 608 Q 190 614 150 606 Z" fill="url(#hb-skin)" stroke="#c98d6c" strokeWidth={1.5} />
        {/* Extended index finger */}
        <path d={`M 196 ${FINGER_TOP} L ${FINGER_END - 14} ${FINGER_TOP} A 14 14 0 0 1 ${FINGER_END - 14} ${FINGER_TOP + 28} L 196 ${FINGER_TOP + 28} Z`}
            fill="url(#hb-skin)" stroke="#c98d6c" strokeWidth={1.5} />
        <path d={`M 238 ${FINGER_TOP + 6} Q 234 ${FINGER_TOP + 14} 238 ${FINGER_TOP + 22}`} fill="none" stroke="#c98d6c" strokeWidth={1.2} />
        <path d={`M 268 ${FINGER_TOP + 6} Q 264 ${FINGER_TOP + 14} 268 ${FINGER_TOP + 22}`} fill="none" stroke="#c98d6c" strokeWidth={1.2} />
        {drop > 0.02 && <ellipse cx={DROP_X} cy={FINGER_TOP - 9 * drop + 2} rx={12 * drop} ry={10 * drop} fill="url(#hb-blood-drop)" />}
    </g>
);

const Cotton = ({ x, y, spirit }: { x: number; y: number; spirit: boolean }) => {
    const fill = spirit ? '#e0f2fe' : '#ffffff';
    return (
        <g pointerEvents="none">
            {[[-6, 0, 8], [5, -2, 9], [0, -7, 7], [-2, 5, 7], [7, 5, 6]].map(([dx, dy, r], i) => (
                <circle key={i} cx={x + dx} cy={y + dy} r={r} fill={fill} stroke="#cbd5e1" strokeWidth={1} />
            ))}
        </g>
    );
};

// Lancet; tip at (x, y). Lying flat in the tray, or upright when in use.
const Lancet = ({ x, y, lying }: { x: number; y: number; lying: boolean }) => (
    <g transform={`translate(${x} ${y}) rotate(${lying ? -90 : 0})`} pointerEvents="none">
        <path d="M -2.5 -14 L 2.5 -14 L 0 0 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth={0.8} />
        <rect x={-5} y={-48} width={10} height={35} rx={3} fill="#2563eb" />
    </g>
);

const Tray = () => (
    <g pointerEvents="none">
        <Shadow cx={198} cy={700} rx={110} ry={6} />
        <rect x={92} y={664} width={212} height={32} rx={10} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1.5} />
        <rect x={100} y={670} width={196} height={20} rx={7} fill="#f3f4f6" />
    </g>
);

// N/10 HCl reagent bottle with a paper label
const ReagentBottle = ({ x }: { x: number }) => (
    <g pointerEvents="none">
        <Shadow cx={x + 40} cy={656} rx={44} ry={6} />
        <path d={`M ${x} 560 Q ${x} 540 ${x + 16} 536 L ${x + 26} 532 L ${x + 26} 512 L ${x + 54} 512 L ${x + 54} 532 L ${x + 64} 536 Q ${x + 80} 540 ${x + 80} 560 L ${x + 80} 644 Q ${x + 80} 652 ${x + 72} 652 L ${x + 8} 652 Q ${x} 652 ${x} 644 Z`}
            fill="rgba(255,255,255,0.45)" stroke="#8a9bb0" strokeWidth={2} />
        <path d={`M ${x + 3} 572 L ${x + 77} 572 L ${x + 77} 644 Q ${x + 77} 649 ${x + 72} 649 L ${x + 8} 649 Q ${x + 3} 649 ${x + 3} 644 Z`} fill="rgba(186,230,253,0.5)" />
        <rect x={x + 8} y={588} width={64} height={40} rx={3} fill="#fefce8" stroke="#d6d3d1" />
        <text x={x + 40} y={605} textAnchor="middle" fill="#111827" fontSize={15} fontWeight="bold">N/10</text>
        <text x={x + 40} y={622} textAnchor="middle" fill="#111827" fontSize={15} fontWeight="bold">HCl</text>
        <rect x={x + 6} y={546} width={5} height={92} rx={2.5} fill="#ffffff" opacity={0.45} />
    </g>
);

// Beaker of distilled water
const Beaker = ({ x }: { x: number }) => (
    <g pointerEvents="none">
        <Shadow cx={x + 46} cy={656} rx={50} ry={6} />
        <rect x={x + 3} y={592} width={86} height={57} rx={3} fill="rgba(186,230,253,0.55)" />
        <path d={`M ${x - 6} 550 Q ${x - 1} 553 ${x} 560 L ${x} 646 Q ${x} 652 ${x + 6} 652 L ${x + 86} 652 Q ${x + 92} 652 ${x + 92} 646 L ${x + 92} 552`}
            fill="rgba(255,255,255,0.35)" stroke="#8a9bb0" strokeWidth={2} />
        {[572, 592, 612, 632].map(y => <line key={y} x1={x + 76} x2={x + 88} y1={y} y2={y} stroke="#8a9bb0" strokeWidth={1.2} />)}
        <rect x={x + 10} y={608} width={60} height={34} rx={3} fill="#ffffff" stroke="#d6d3d1" />
        <text x={x + 40} y={622} textAnchor="middle" fill="#111827" fontSize={12} fontWeight="bold">Distilled</text>
        <text x={x + 40} y={636} textAnchor="middle" fill="#111827" fontSize={12} fontWeight="bold">water</text>
    </g>
);

// Lab wall clock; during the wait the elapsed part of the 10 minutes is shaded
const WallClock = ({ minutes, waiting }: { minutes: number; waiting: boolean }) => {
    const cx = 120;
    const cy = 58;
    const r = 52;
    const point = (deg: number, len: number) => ({ x: cx + len * Math.sin((deg * Math.PI) / 180), y: cy - len * Math.cos((deg * Math.PI) / 180) });
    const sweep = minutes * 6;
    const end = point(sweep, r - 6);
    const minuteHand = point(sweep, r - 10);
    const hourHand = point(300 + minutes * 0.5, r - 24);
    return (
        <g pointerEvents="none">
            <circle cx={cx} cy={cy} r={r + 6} fill="#334155" />
            <circle cx={cx} cy={cy} r={r} fill="#ffffff" />
            {waiting && sweep > 0.5 && (
                <path d={`M ${cx} ${cy} L ${cx} ${cy - (r - 6)} A ${r - 6} ${r - 6} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill="#f59e0b" opacity={0.35} />
            )}
            {Array.from({ length: 12 }, (_, i) => {
                const a = point(i * 30, r - 4);
                const b = point(i * 30, r - (i % 3 === 0 ? 12 : 8));
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#334155" strokeWidth={i % 3 === 0 ? 3 : 1.5} />;
            })}
            <line x1={cx} y1={cy} x2={hourHand.x} y2={hourHand.y} stroke="#0f172a" strokeWidth={5} strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={minuteHand.x} y2={minuteHand.y} stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={4} fill="#dc2626" />
            {waiting && <text x={cx} y={cy + r + 30} textAnchor="middle" fill="#334155" fontSize={18} fontWeight="bold">{Math.floor(minutes)} of 10 min</text>}
        </g>
    );
};

// Magnified view of the meniscus against the g/dL scale
const Magnifier = ({ level, liquid }: { level: number; liquid: RGB }) => {
    const cx = 878;
    const cy = 250;
    const r = 108;
    const half = 60;
    const pxPerG = 60;
    const lead = toScreen({ x: BLOCK.x + BLOCK.w + SIDE + 4, y: yOf(level) });
    const first = Math.round((level - 2.2) / DROP_STEP);
    const last = Math.round((level + 2.2) / DROP_STEP);
    const ticks: number[] = [];
    for (let i = Math.max(first, START_LEVEL / DROP_STEP); i <= Math.min(last, MAX_LEVEL / DROP_STEP); i++) ticks.push(i);
    return (
        <g pointerEvents="none">
            <line x1={lead.x} y1={lead.y} x2={cx - r} y2={cy} stroke="#475569" strokeWidth={2} strokeDasharray="6 5" />
            <defs><clipPath id="hb-magnifier"><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
            <g clipPath="url(#hb-magnifier)">
                <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#f8fafc" />
                <path d={`M ${cx - half} ${cy - 22} Q ${cx} ${cy + 22} ${cx + half} ${cy - 22} L ${cx + half} ${cy + r} L ${cx - half} ${cy + r} Z`} fill={css(liquid)} />
                <line x1={cx - half} x2={cx - half} y1={cy - r} y2={cy + r} stroke="#94a3b8" strokeWidth={4} />
                <line x1={cx + half} x2={cx + half} y1={cy - r} y2={cy + r} stroke="#94a3b8" strokeWidth={4} />
                {ticks.map(i => {
                    const v = i * DROP_STEP;
                    const y = cy - (v - level) * pxPerG;
                    const whole = i % 5 === 0;
                    return (
                        <g key={i}>
                            <line x1={cx - half} x2={cx - half + (whole ? 30 : 16)} y1={y} y2={y} stroke="#b45309" strokeWidth={whole ? 3 : 2} />
                            {whole && <text x={cx - half - 10} y={y + 9} textAnchor="end" fill="#b45309" fontSize={26} fontWeight="bold">{Math.round(v)}</text>}
                        </g>
                    );
                })}
                <line x1={cx - half - 4} x2={cx + half + 40} y1={cy} y2={cy} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 5" />
            </g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={6} />
            <line x1={cx + r * 0.72} y1={cy + r * 0.72} x2={cx + r * 0.72 + 46} y2={cy + r * 0.72 + 46} stroke="#334155" strokeWidth={14} strokeLinecap="round" />
            <text x={cx} y={cy + r + 34} textAnchor="middle" fill="#334155" fontSize={22}>Lower meniscus</text>
            <text x={cx} y={cy + r + 70} textAnchor="middle" fill="#b45309" fontSize={32} fontWeight="bold" fontFamily="monospace">{level.toFixed(1)} g/dL</text>
        </g>
    );
};

// --- Main Component ---
export const HaemoglobinEstimation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [sampleId, setSampleId] = useState('male');
    const [unknownHb, setUnknownHb] = useState(randomUnknownHb);
    const [phase, setPhase] = useState<Phase>('empty');
    const [phaseStart, setPhaseStart] = useState(0);
    const [now, setNow] = useState(() => performance.now());
    const [drops, setDrops] = useState(0);
    const [pending, setPending] = useState<{ start: number; n: number } | null>(null);
    const [readings, setReadings] = useState<Record<ReadingKind, number | null>>({ darker: null, match: null, lighter: null });
    const [blend, setBlend] = useState<{ from: number; start: number; end: number } | null>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const { label: hoverLabel, hover } = useHoverLabel();
    const questionSet = questionSetFor('hb-estimation');

    const isUnknown = sampleId === 'unknown';
    const sample: Sample = isUnknown
        ? { id: 'unknown', label: 'Unknown sample', hb: unknownHb, note: '' }
        : SAMPLES.find(s => s.id === sampleId)!;
    const hb = sample.hb;
    const t = (now - phaseStart) / 1000;
    const bloodAdded = phase === 'blood' || phase === 'waiting' || phase === 'dilute';
    // After a change of sample the picture moves on smoothly: during the wait it blends into the new sample's
    // course by the end of the wait; otherwise over 1.5 s.
    const shownHb = blend ? lerp(blend.from, hb, clamp01((now - blend.start) / (blend.end - blend.start))) : hb;

    // Animation clock
    const animating = phase === 'acid' || phase === 'blood' || phase === 'waiting' || pending !== null || (blend !== null && now < blend.end);
    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    const startPhase = (next: Phase) => {
        const start = performance.now();
        setPhase(next);
        setPhaseStart(start);
        setNow(start);
    };

    // Phase transitions
    useEffect(() => {
        if (phase === 'acid' && t >= ACID_DURATION) setPhase('acid-ready');
        else if (phase === 'blood' && t >= BLOOD_DURATION) startPhase('waiting');
        else if (phase === 'waiting' && t >= WAIT_SECONDS) setPhase('dilute');
    }, [phase, t]);

    // Water drops land, then the solution is stirred; commit them once the stirring is done
    useEffect(() => {
        if (pending && (now - pending.start) / 1000 >= pendingDuration(pending.n)) {
            setDrops(d => d + pending.n);
            setPending(null);
        }
    }, [pending, now]);

    const committedLevel = START_LEVEL + drops * DROP_STEP;
    const remainingDrops = Math.round((MAX_LEVEL - committedLevel) / DROP_STEP);

    const addDrops = (n: number) => {
        if (phase !== 'dilute' || pending) return;
        const count = Math.min(n, remainingDrops);
        if (count <= 0) return;
        const start = performance.now();
        setPending({ start, n: count });
        setNow(start);
    };

    const record = (kind: ReadingKind) => {
        if (phase !== 'dilute' || pending) return;
        setReadings(prev => ({ ...prev, [kind]: round1(committedLevel) }));
    };

    // The sample can be changed at any time; while diluting, it starts the dilution afresh with its acid haematin already formed
    const handleSampleChange = (id: string) => {
        const start = performance.now();
        const end = phase === 'waiting' ? Math.max(phaseStart + WAIT_SECONDS * 1000, start + 1500) : start + 1500;
        setBlend({ from: shownHb, start, end });
        setNow(start);
        setSampleId(id);
        if (id === 'unknown') setUnknownHb(randomUnknownHb());
        if (phase === 'dilute') {
            setDrops(0);
            setPending(null);
            setReadings({ darker: null, match: null, lighter: null });
        }
    };

    const handleReset = () => {
        setPhase('empty');
        setPhaseStart(0);
        setDrops(0);
        setPending(null);
        setBlend(null);
        setReadings({ darker: null, match: null, lighter: null });
        if (isUnknown) setUnknownHb(randomUnknownHb());
    };

    const allRecorded = readings.darker !== null && readings.match !== null && readings.lighter !== null;
    const average = allRecorded ? round1((readings.darker! + readings.match! + readings.lighter!) / 3) : null;

    // --- Scene for the current moment ---
    const BLOOD = '#b91c1c';
    const startDepth = shownHb / START_LEVEL;
    let level = 0;
    let liquid: RGB = ACID_COLOR;
    let layer: Layer | null = null;
    let cloud = 0;
    const ripples: number[] = [];
    const fallingDrops: { x: number; y: number; color: string }[] = [];
    let pipette = { ...PIPETTE_REST, fill: 0, color: BLOOD };
    let hclDropper = { pos: HCL_DROPPER_REST, swell: 0 };
    let waterDropper = { pos: WATER_DROPPER_REST, swell: 0 };
    let swabPos: Point | null = null;    // null = resting in the tray
    let cottonPos: Point | null = null;
    let lancetPos: Point | null = null;
    let fingerDrop = 0;
    let stirTip: number | null = null;
    let stirDx = 0; // sideways swing of the stirrer tip while stirring
    let pipetteInTube = false; // drawn behind the front of the Hb meter
    let clockMinutes = 0;
    let caption = '';
    const showHand = !(phase === 'waiting' || phase === 'dilute');

    if (phase === 'empty') {
        caption = 'Step 1: Fill the tube with N/10 HCl to the lowest mark (2 g/dL)';
    } else if (phase === 'acid') {
        caption = 'Adding N/10 HCl up to the 2 g/dL mark';
        const lastFall = acidRelease(ACID_DROPS - 1) + DROP_FALL;
        const pos = t < lastFall
            ? lerpPt(HCL_DROPPER_REST, HCL_DROPPER_TUBE, ease(t / ACID_IN))
            : lerpPt(HCL_DROPPER_TUBE, HCL_DROPPER_REST, ease((t - lastFall) / ACID_OUT));
        let swell = 0;
        let landed = 0;
        for (let i = 0; i < ACID_DROPS; i++) {
            const r = acidRelease(i);
            if (t >= r + DROP_FALL) landed++;
            else if (t >= r) {
                const target = yOf((START_LEVEL * (i + 1)) / ACID_DROPS);
                fallingDrops.push({ x: TUBE_X, y: lerp(DROPPER_TIP_Y + 6, target, ((t - r) / DROP_FALL) ** 2), color: '#e0f2fe' });
            } else if (t >= r - SWELL) swell = (t - (r - SWELL)) / SWELL;
        }
        hclDropper = { pos, swell };
        level = (START_LEVEL * landed) / ACID_DROPS;
    } else if (phase === 'acid-ready') {
        caption = 'Choose the blood sample, then add 20 µL of blood';
        level = START_LEVEL;
    } else if (phase === 'blood') {
        const { id, p, caption: stepCaption } = bloodStep(t);
        caption = stepCaption;
        level = START_LEVEL;
        pipetteInTube = id === 'dip' || id === 'expel' || id === 'rinse' || (id === 'out' && p < 0.5);
        // Out to a point, a short action there, and back again
        const there = (rest: Point, at: Point, goEnd: number, backStart: number) =>
            p < goEnd ? lerpPt(rest, at, ease(p / goEnd)) : p < backStart ? at : lerpPt(at, rest, ease((p - backStart) / (1 - backStart)));

        if (id === 'swab') {
            const at = there(SWAB_REST, SWAB_AT, 0.3, 0.7);
            swabPos = p >= 0.3 && p < 0.7 ? { x: at.x, y: at.y + 8 * Math.sin(((p - 0.3) / 0.4) * 4 * Math.PI) } : at;
        } else if (id === 'prick') {
            lancetPos = p < 0.35 ? lerpPt(LANCET_REST, LANCET_ABOVE, ease(p / 0.35))
                : p < 0.5 ? lerpPt(LANCET_ABOVE, LANCET_AT, ease((p - 0.35) / 0.15))
                    : p < 0.65 ? lerpPt(LANCET_AT, LANCET_ABOVE, ease((p - 0.5) / 0.15))
                        : lerpPt(LANCET_ABOVE, LANCET_REST, ease((p - 0.65) / 0.35));
        } else if (id === 'firstDrop') {
            fingerDrop = 0.85 * ease(p);
        } else if (id === 'wipeFirst') {
            const at = there(COTTON_REST, COTTON_AT, 0.35, 0.65);
            cottonPos = p >= 0.35 && p < 0.65 ? { x: at.x - 10 + 20 * ((p - 0.35) / 0.3), y: at.y } : at;
            fingerDrop = 0.85 * (1 - ease((p - 0.35) / 0.3));
        } else if (id === 'secondDrop') {
            fingerDrop = ease(p);
        } else if (id === 'toFinger') {
            const pos = lerpPt(PIPETTE_REST, FINGER_TOUCH, ease(p));
            pipette = { x: pos.x, y: pos.y - 60 * Math.sin(Math.PI * p), fill: 0, color: BLOOD };
            fingerDrop = 1;
        } else if (id === 'draw') {
            pipette = { ...FINGER_TOUCH, fill: ease(p), color: BLOOD };
            fingerDrop = 1 - 0.55 * ease(p);
        } else if (id === 'wipe') {
            pipette = { ...lerpPt(FINGER_TOUCH, WIPE_POS, ease(Math.min(1, p * 2))), fill: 1, color: BLOOD };
            cottonPos = p < 0.3 ? lerpPt(COTTON_REST, { x: WIPE_POS.x - 36, y: WIPE_POS.y }, ease(p / 0.3))
                : p < 0.75 ? { x: WIPE_POS.x - 36 + 72 * ((p - 0.3) / 0.45), y: WIPE_POS.y }
                    : lerpPt({ x: WIPE_POS.x + 36, y: WIPE_POS.y }, COTTON_REST, ease((p - 0.75) / 0.25));
            fingerDrop = 0.45;
        } else if (id === 'toTube') {
            const pos = lerpPt(WIPE_POS, ABOVE_TUBE, ease(p));
            pipette = { x: pos.x, y: pos.y - 80 * Math.sin(Math.PI * p), fill: 1, color: BLOOD };
            fingerDrop = 0.45;
        } else if (id === 'dip') {
            pipette = { ...lerpPt(ABOVE_TUBE, IN_TUBE, ease(p)), fill: 1, color: BLOOD };
            fingerDrop = 0.45;
        } else if (id === 'expel') {
            pipette = { ...IN_TUBE, fill: 1 - ease(p), color: BLOOD };
            cloud = ease(p);
            fingerDrop = 0.45;
        } else if (id === 'rinse') {
            pipette = { ...IN_TUBE, fill: 0.55 * Math.abs(Math.sin(3 * Math.PI * p)), color: '#e8a3a3' };
            cloud = 1;
            fingerDrop = 0.45;
        } else if (id === 'out') {
            const pos = p < 0.5 ? lerpPt(IN_TUBE, ABOVE_TUBE, ease(p * 2)) : lerpPt(ABOVE_TUBE, PIPETTE_REST, ease(p * 2 - 1));
            pipette = { ...pos, fill: 0, color: BLOOD };
            cloud = 1;
            fingerDrop = 0.45;
        } else {
            // mix: blood and acid stirred into a uniform dark red solution
            liquid = mixRGB(ACID_COLOR, oxyHb(startDepth), ease(p));
            cloud = 1 - ease(p);
            stirTip = Math.min(INNER_BOTTOM - 10, yOf(START_LEVEL) + 18 + 10 * Math.sin(p * 20));
            stirDx = stirSwing(p * BLOOD_STEPS[BLOOD_STEPS.length - 1].d);
            fingerDrop = 0.45;
        }
    } else if (phase === 'waiting') {
        caption = 'Leave for 10 minutes: haemoglobin turns into brown acid haematin';
        level = START_LEVEL;
        liquid = mixRGB(oxyHb(startDepth), hematin(startDepth), ease(t / WAIT_SECONDS));
        stirTip = yOf(level) - 18;
        clockMinutes = 10 * clamp01(t / WAIT_SECONDS);
    } else {
        clockMinutes = 10;
        level = committedLevel;
        liquid = hematin(shownHb / committedLevel);
        waterDropper = { pos: WATER_DROPPER_TUBE, swell: 0 };
        stirTip = yOf(level) - 18; // lifted above the solution, never out of the tube, while comparing
        if (pending) {
            const tp = (now - pending.start) / 1000;
            let landed = 0;
            for (let i = 0; i < pending.n; i++) {
                const r = waterRelease(i);
                if (tp >= r + DROP_FALL) {
                    landed++;
                    const age = tp - (r + DROP_FALL);
                    if (age < RIPPLE_TIME) ripples.push(age);
                } else if (tp >= r) {
                    fallingDrops.push({ x: WATER_DROP_X, y: lerp(DROPPER_TIP_Y + 6, yOf(committedLevel + landed * DROP_STEP), ((tp - r) / DROP_FALL) ** 2), color: '#bae6fd' });
                } else if (tp >= r - SWELL) {
                    waterDropper = { pos: WATER_DROPPER_TUBE, swell: (tp - (r - SWELL)) / SWELL };
                }
            }
            level = committedLevel + landed * DROP_STEP;
            const lastLand = waterRelease(pending.n - 1) + DROP_FALL;
            if (landed > 0) {
                const baseColor = hematin(shownHb / committedLevel);
                layer = { baseLevel: committedLevel, baseColor, waterColor: mixRGB(WATER_COLOR, baseColor, 0.12), mix: ease(clamp01((tp - lastLand) / STIR_TIME)) };
            }
            liquid = hematin(shownHb / level);
            if (tp >= lastLand) {
                stirTip = Math.min(INNER_BOTTOM - 10, yOf(level) + 30 + 16 * Math.sin((tp - lastLand) * 18));
                stirDx = stirSwing(tp - lastLand);
            }
        }
        caption = allRecorded
            ? 'Readings recorded: see the result'
            : 'Add distilled water drop by drop, stir, and match the colour with the standards';
    }

    // Colour seen through the window (bottom of the tube) while a water layer is still unmixed
    const seenColor = layer && layer.mix < 1 ? mixRGB(layer.baseColor, liquid, layer.mix) : liquid;
    const hclAtRest = hclDropper.pos === HCL_DROPPER_REST;
    const waterAtRest = waterDropper.pos === WATER_DROPPER_REST;
    const pipetteAtRest = pipette.x === PIPETTE_REST.x && pipette.y === PIPETTE_REST.y;

    const step = !bloodAdded || phase === 'blood' ? 1 : phase === 'waiting' ? 2 : allRecorded ? 4 : 3;
    const overDiluted = phase === 'dilute' && !allRecorded && committedLevel > hb + 1.2;
    const accuracy = average !== null ? Math.abs(average - hb) : null;

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Haemoglobin Estimation</h1>
                        <p className="text-slate-400 text-xs">Sahli's Acid Haematin Method</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left: lab bench */}
                <div className="flex-1 bg-slate-900/40 flex flex-col p-4 min-h-0">
                    {/* Caption as page text (not inside the drawing) so it stays readable on phones */}
                    <p className="text-sm lg:text-base font-semibold text-indigo-300 text-center mb-3 min-h-[2.5rem] lg:min-h-0 flex items-center justify-center">{caption}</p>
                    <div className="relative flex-1 min-h-[280px] rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center bg-[#dfe5ec]">
                        <HoverLabel label={hoverLabel} />
                        <ZoomableSvg w={W} h={H} className="w-full h-full max-h-[78vh]" overflowVisible>
                            <SceneDefs />
                            <LabBackground />
                            <g transform={`translate(0 ${OFFSET_Y})`}>
                                <WallClock minutes={clockMinutes} waiting={phase === 'waiting'} />
                                <g transform={METER_TRANSFORM}>
                                    <ComparatorBack />
                                    <SahliTube level={level} color={liquid} layer={layer} cloud={cloud} cloudColor={oxyHb(startDepth)} ripples={ripples} />
                                    {stirTip !== null && <Stirrer tipY={stirTip} dx={stirDx} />}
                                    {fallingDrops.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={5} fill={d.color} stroke="#8a9bb0" strokeWidth={0.6} />)}
                                </g>
                                {pipetteInTube && <HbPipette x={pipette.x} y={pipette.y} fill={pipette.fill} color={pipette.color} />}
                                <g transform={METER_TRANSFORM}><ComparatorFront /></g>

                                {/* Reagents: droppers resting inside are drawn behind the glass */}
                                {hclAtRest && <Dropper x={hclDropper.pos.x} y={hclDropper.pos.y} liquid="#e0f2fe" swell={0} dropColor="#e0f2fe" />}
                                <ReagentBottle x={HCL_BOTTLE_X} />
                                {waterAtRest && <Dropper x={waterDropper.pos.x} y={waterDropper.pos.y} liquid="#bae6fd" swell={0} dropColor="#bae6fd" />}
                                <Beaker x={862} />

                                {/* Finger-prick tray and the subject's hand */}
                                <Tray />
                                {!swabPos && <Cotton x={SWAB_REST.x} y={SWAB_REST.y} spirit />}
                                {!cottonPos && <Cotton x={COTTON_REST.x} y={COTTON_REST.y} spirit={false} />}
                                {!lancetPos && <Lancet x={LANCET_REST.x} y={LANCET_REST.y} lying />}
                                {showHand && <Hand drop={fingerDrop} />}

                                {/* Hb pipette: in its stand, or in use */}
                                {pipetteAtRest && <HbPipette x={pipette.x} y={pipette.y} fill={pipette.fill} color={pipette.color} />}
                                <PipetteStand />
                                {!pipetteAtRest && !pipetteInTube && <HbPipette x={pipette.x} y={pipette.y} fill={pipette.fill} color={pipette.color} />}

                                {swabPos && <Cotton x={swabPos.x} y={swabPos.y} spirit />}
                                {cottonPos && <Cotton x={cottonPos.x} y={cottonPos.y} spirit={false} />}
                                {lancetPos && <Lancet x={lancetPos.x} y={lancetPos.y} lying={false} />}
                                {!hclAtRest && <Dropper x={hclDropper.pos.x} y={hclDropper.pos.y} liquid="#e0f2fe" swell={hclDropper.swell} dropColor="#e0f2fe" />}
                                {!waterAtRest && <Dropper x={waterDropper.pos.x} y={waterDropper.pos.y} liquid="#bae6fd" swell={waterDropper.swell} dropColor="#bae6fd" />}

                                {/* Part names on hover */}
                                <HoverZone x={62} y={0} w={116} h={116} {...hover('Wall clock')} />
                                <HoverZone {...meterRect(BLOCK.x - 40, BLOCK.y - SIDE, BLOCK.w + 80, BLOCK.h + SIDE + 48)} {...hover("Sahli's Hb meter (comparator)")} />
                                <HoverZone {...meterRect(SLOTS_X[0], SLOT_Y, SLOT_W, SLOT_H)} {...hover('Brown glass standard')} />
                                <HoverZone {...meterRect(SLOTS_X[2], SLOT_Y, SLOT_W, SLOT_H)} {...hover('Brown glass standard')} />
                                <HoverZone {...meterRect(SLOTS_X[1], SLOT_Y, SLOT_W, SLOT_H)} {...hover('Sahli tube, seen against white glass')} />
                                <HoverZone {...meterRect(TUBE_X - 32, TUBE_TOP - 12, 64, BLOCK.y - SIDE - TUBE_TOP + 12)}
                                    {...hover(stirTip !== null ? 'Sahli tube (graduated) with glass stirrer' : 'Sahli tube, graduated in g/dL and %')} />
                                <HoverZone x={pipette.x - 8} y={pipette.y - PIPETTE_LENGTH - 44} w={72} h={PIPETTE_LENGTH + 44} {...hover('Sahli Hb pipette (20 µL), rubber tube and mouthpiece')} />
                                <HoverZone x={PIPETTE_REST.x - 16} y={624} w={32} h={32} {...hover('Pipette stand')} />
                                <HoverZone x={HCL_BOTTLE_X} y={506} w={80} h={148} {...hover('N/10 HCl, with dropper')} />
                                {!hclAtRest && <HoverZone x={hclDropper.pos.x - 10} y={hclDropper.pos.y - 110} w={20} h={110} {...hover('Dropper: N/10 HCl')} />}
                                <HoverZone x={856} y={548} w={98} h={106} {...hover('Distilled water, with dropper')} />
                                {!waterAtRest && <HoverZone x={waterDropper.pos.x - 10} y={waterDropper.pos.y - 110} w={20} h={110} {...hover('Dropper: distilled water')} />}
                                {showHand && <HoverZone x={-40} y={545} w={360} h={108} {...hover("Subject's hand: blood from the fingertip")} />}
                                <HoverZone x={92} y={662} w={212} h={36} {...hover('Tray')} />
                                {!swabPos && <HoverZone x={SWAB_REST.x - 16} y={SWAB_REST.y - 16} w={32} h={30} {...hover('Cotton swab with spirit')} />}
                                {!cottonPos && <HoverZone x={COTTON_REST.x - 16} y={COTTON_REST.y - 16} w={32} h={30} {...hover('Dry cotton')} />}
                                {!lancetPos && <HoverZone x={LANCET_REST.x - 50} y={LANCET_REST.y - 8} w={54} h={16} {...hover('Sterile lancet')} />}
                                {phase === 'dilute' && <HoverZone x={770} y={142} w={216} h={216} {...hover('Magnified view of the lower meniscus')} />}

                                {phase === 'dilute' && <Magnifier level={level} liquid={seenColor} />}
                            </g>
                        </ZoomableSvg>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-4 lg:p-6 space-y-4 lg:overflow-y-auto">
                    {/* Steps */}
                    <div className="flex gap-2 text-xs font-bold uppercase">
                        {['Prepare', 'Wait', 'Dilute & match', 'Result'].map((s, i) => (
                            <div key={s} className={`flex-1 text-center py-1.5 rounded-md border ${step === i + 1 ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : step > i + 1 ? 'border-emerald-700 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                                {i + 1}. {s}
                            </div>
                        ))}
                    </div>

                    {/* Sample */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                            <Droplet className="w-4 h-4 text-red-400" /> Blood sample
                        </label>
                        <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block p-2.5 outline-none focus:border-indigo-500 disabled:opacity-60">
                            {SAMPLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            <option value="unknown">Unknown sample</option>
                        </select>
                    </div>

                    {/* Preparation actions */}
                    {(phase === 'empty' || phase === 'acid') && (
                        <button onClick={() => startPhase('acid')} disabled={phase === 'acid'}
                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            <FlaskConical className="w-5 h-5" /> {phase === 'acid' ? 'Adding N/10 HCl…' : 'Add N/10 HCl'}
                        </button>
                    )}
                    {phase === 'acid-ready' && (
                        <button onClick={() => startPhase('blood')}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            <Pipette className="w-5 h-5" /> Add 20 µL blood
                        </button>
                    )}
                    {phase === 'blood' && (
                        <div className="flex gap-3">
                            <button disabled
                                className="flex-1 bg-red-600 opacity-60 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                                <Pipette className="w-5 h-5" /> Adding blood…
                            </button>
                            <button onClick={() => startPhase('waiting')}
                                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                Skip
                            </button>
                        </div>
                    )}
                    {phase === 'waiting' && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <Timer className="w-4 h-4 text-amber-400" />
                                Acid haematin forming: <span className="font-mono text-amber-300">{Math.min(10, Math.floor(t))} of 10 min</span>
                            </div>
                            <button onClick={() => setPhase('dilute')}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg text-sm border border-slate-600">
                                Skip
                            </button>
                        </div>
                    )}

                    {/* Dilution and colour matching */}
                    {phase === 'dilute' && (
                        <>
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
                                <span className="text-sm text-slate-300">Reading (lower meniscus)</span>
                                <span className="text-xl font-mono font-bold text-amber-300">{level.toFixed(1)} g/dL</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => addDrops(1)} disabled={!!pending || remainingDrops <= 0}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <Droplet className="w-4 h-4" /> Add 1 drop
                                </button>
                                <button onClick={() => addDrops(5)} disabled={!!pending || remainingDrops <= 0}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-sm">
                                    <Droplet className="w-4 h-4" /> Add 5 drops
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 -mt-2">
                                Distilled water added: {drops} drops. Compare the middle bar with the brown standards on each side.
                            </p>
                            {overDiluted && (
                                <p className="text-xs text-amber-400">
                                    The colour is now well past the standard. Water cannot be taken out again: record your readings or start again.
                                </p>
                            )}

                            {/* Three readings */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase">Record a reading when the colour is</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['darker', 'match', 'lighter'] as ReadingKind[]).map(kind => {
                                        const value = readings[kind];
                                        const ok = allRecorded && value !== null ? readingCorrect(kind, value, hb) : null;
                                        return (
                                            <button key={kind} onClick={() => record(kind)} disabled={!!pending}
                                                className={`rounded-lg border py-2 px-1 text-center transition-colors disabled:opacity-60 ${value !== null ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900 border-slate-700 hover:bg-slate-700'}`}>
                                                <div className="text-xs font-bold text-slate-300">{READING_LABELS[kind]}</div>
                                                <div className="text-lg font-mono font-bold text-white flex items-center justify-center gap-1">
                                                    {value !== null ? value.toFixed(1) : '--'}
                                                    {ok === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                                    {ok === false && <XCircle className="w-4 h-4 text-red-400" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-500">Tap again to record a new value. The result is the average of the three readings.</p>
                            </div>
                        </>
                    )}

                    {/* Result */}
                    {average !== null && accuracy !== null && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-1.5 text-sm">
                            <p className="text-white font-bold text-base">Haemoglobin = {average.toFixed(1)} g/dL</p>
                            <p className="text-slate-300">
                                O₂ carrying capacity = {average.toFixed(1)} × {O2_PER_G} = <span className="font-mono text-white">{round1(average * O2_PER_G).toFixed(1)} mL O₂/dL</span>
                            </p>
                            {accuracy <= 0.4 + 1e-6 ? (
                                <p className="text-emerald-400 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> Accurate: the sample's Hb is {hb.toFixed(1)} g/dL (within 0.4 g/dL).</p>
                            ) : (
                                <p className="text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /> Off by {round1(accuracy).toFixed(1)} g/dL: the sample's Hb is {hb.toFixed(1)} g/dL. Check which readings are marked wrong.</p>
                            )}
                            {isUnknown
                                ? <p className="text-slate-400 text-xs">This was a random unknown sample. Reset for a new one.</p>
                                : <p className="text-slate-400 text-xs"><span className="text-slate-200 font-semibold">{sample.label}:</span> {sample.note}</p>}
                        </div>
                    )}

                    <button onClick={handleReset}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                    {questionSet && (
                        <button onClick={() => setQuizOpen(true)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl transition-all border border-indigo-500/40 flex items-center justify-center gap-2">
                            <ListChecks className="w-4 h-4" /> Test yourself (MCQs)
                        </button>
                    )}
                </div>
            </main>
            {quizOpen && questionSet && <Quiz set={questionSet} onClose={() => setQuizOpen(false)} />}
        </div>
    );
};
