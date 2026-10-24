import React, { useState, useEffect } from 'react';
import { ArrowLeft, Droplet, RefreshCw, CheckCircle2, XCircle, Timer, Pipette, Syringe as SyringeIcon, ListChecks } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// --- Types & Constants ---

type Method = 'westergren' | 'wintrobe';
type Phase = 'start' | 'mix' | 'mixed' | 'fill' | 'filled' | 'waiting' | 'done';
type Verdict = 'low' | 'normal' | 'raised';
type Point = { x: number; y: number };

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

interface Sample {
    id: string;
    label: string;
    sex: 'male' | 'female';
    esr: Record<Method, number>; // mm at the end of the 1st hour
    note: string;
}

const SAMPLES: Sample[] = [
    { id: 'male', label: 'Healthy adult male', sex: 'male', esr: { westergren: 4, wintrobe: 6 }, note: 'Normal value for an adult man.' },
    { id: 'female', label: 'Healthy adult female', sex: 'female', esr: { westergren: 9, wintrobe: 14 }, note: 'Higher than in men because of the lower red cell count.' },
    { id: 'pregnancy', label: 'Pregnancy (3rd trimester)', sex: 'female', esr: { westergren: 32, wintrobe: 28 }, note: 'Fibrinogen rises in pregnancy and increases rouleaux formation.' },
    { id: 'anaemia', label: 'Anaemia', sex: 'female', esr: { westergren: 28, wintrobe: 26 }, note: 'Fewer red cells: the cell to plasma ratio changes and the blood is less viscous, so cells settle faster.' },
    { id: 'tb', label: 'Pulmonary tuberculosis', sex: 'male', esr: { westergren: 65, wintrobe: 38 }, note: 'Chronic infection raises globulins and fibrinogen. Repeated ESR helps follow the response to treatment.' },
    { id: 'ra', label: 'Rheumatoid arthritis', sex: 'female', esr: { westergren: 80, wintrobe: 45 }, note: 'Inflammation raises acute phase proteins. ESR follows disease activity but does not make the diagnosis.' },
    { id: 'poly', label: 'Polycythaemia', sex: 'male', esr: { westergren: 1, wintrobe: 1 }, note: 'Many red cells make the blood viscous and slow their settling.' },
];
const randomSampleIndex = () => Math.floor(Math.random() * SAMPLES.length);

// Normal values, mm at the end of the 1st hour (GK Pal)
const NORMAL: Record<Method, Record<'male' | 'female', [number, number]>> = {
    westergren: { male: [3, 5], female: [5, 12] },
    wintrobe: { male: [0, 9], female: [0, 20] },
};
const verdictOf = (value: number, [lo, hi]: [number, number]): Verdict => (value < lo ? 'low' : value > hi ? 'raised' : 'normal');
const VERDICT_LABELS: Record<Verdict, string> = { low: 'Low', normal: 'Normal', raised: 'Raised' };

// Fall of the red cell column through the hour: rouleaux form (first ~10 min, slow), the rouleaux sink
// at a steady rate (~40 min), then pack at the bottom (last ~10 min)
function fallFraction(minutes: number) {
    if (minutes <= 10) return 0.05 * (minutes / 10) ** 2;
    if (minutes <= 50) return 0.05 + 0.87 * ((minutes - 10) / 40);
    return 0.92 + 0.08 * (1 - (1 - clamp01((minutes - 50) / 10)) ** 2);
}

// --- Geometry ---
const W = 1000;
const H = 690;
const BENCH_Y = 640;
const TUBE_X = 420;
interface TubeSpec { name: string; zeroY: number; pxPerMm: number; maxMm: number; top: number; half: number; roundBottom: boolean }
const TUBE: Record<Method, TubeSpec> = {
    // 300 mm long, 2.5 mm bore, graduated 0 to 200 mm in its lower two thirds
    westergren: { name: 'Westergren pipette', zeroY: 280, pxPerMm: 1.6, maxMm: 200, top: 120, half: 8, roundBottom: false },
    // about 110 mm long, thick walled, graduated 0 to 100 mm (10 cm)
    wintrobe: { name: 'Wintrobe tube', zeroY: 276, pxPerMm: 3.2, maxMm: 100, top: 246, half: 10, roundBottom: true },
};
const bottomOf = (s: TubeSpec) => s.zeroY + s.maxMm * s.pxPerMm;
const VIAL_X = 760;
const SYRINGE_REST: Point = { x: 940, y: 636 };
const SYRINGE_OVER_VIAL: Point = { x: VIAL_X, y: 500 };
const VIAL_SCALE = 1.5;    // bottle and syringe drawn larger so their labels and contents read clearly
const SYRINGE_SCALE = 1.6;
const WEST_REST: Point = { x: TUBE_X, y: 600 };       // bottom of the pipette on the rubber pad
const WEST_IN_VIAL: Point = { x: VIAL_X, y: 632 };
const PASTEUR_REST: Point = { x: VIAL_X + 12, y: 632 }; // nozzle tip, standing in the vial
const PASTEUR_NOZZLE = 360;

// --- Timelines (s) ---
const MIX = { in: 0.6, push: 1.0, out: 0.5, swirl: 1.0 };
const MIX_DURATION = MIX.in + MIX.push + MIX.out + MIX.swirl;
const WEST_FILL = { out: 0.9, suck: 1.6, back: 1.0, press: 0.3 };
const WIN_FILL = { suck: 0.5, move: 0.8, insert: 0.5, fill: 1.6, back: 0.8 };
const FILL_DURATION: Record<Method, number> = {
    westergren: WEST_FILL.out + WEST_FILL.suck + WEST_FILL.back + WEST_FILL.press,
    wintrobe: WIN_FILL.suck + WIN_FILL.move + WIN_FILL.insert + WIN_FILL.fill + WIN_FILL.back,
};
const WAIT_SECONDS = 12; // the hour, sped up (1 s = 5 min)

const BLOOD = '#8b1414';
const PLASMA = 'rgb(246, 222, 150)';

// --- SVG parts ---

const SceneDefs = () => (
    <defs>
        <filter id="esr-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <linearGradient id="esr-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#eef2f6" /><stop offset="1" stopColor="#d9e0e8" /></linearGradient>
        <linearGradient id="esr-bench" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ddd6cc" /><stop offset="1" stopColor="#c4bcb0" /></linearGradient>
        <linearGradient id="esr-metal" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#94a3b8" /><stop offset="0.45" stopColor="#e2e8f0" /><stop offset="1" stopColor="#64748b" /></linearGradient>
        <linearGradient id="esr-blood" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#5c0b0b" /><stop offset="0.35" stopColor={BLOOD} /><stop offset="1" stopColor="#4a0909" /></linearGradient>
        <linearGradient id="esr-plasma" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#e9c873" /><stop offset="0.35" stopColor={PLASMA} /><stop offset="1" stopColor="#dcb85f" /></linearGradient>
    </defs>
);

const Shadow = ({ cx, cy, rx, ry = 7 }: { cx: number; cy: number; rx: number; ry?: number }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(15,23,42,0.22)" filter="url(#esr-blur)" />
);

// Lab wall and bench top; they run past the viewBox (the svg is drawn with overflow visible)
const LabBackground = () => (
    <g>
        <rect x={-2000} y={-2000} width={W + 4000} height={2000} fill="#eef2f6" />
        <rect x={-2000} y={0} width={W + 4000} height={BENCH_Y} fill="url(#esr-wall)" />
        <rect x={-2000} y={BENCH_Y} width={W + 4000} height={H - BENCH_Y} fill="url(#esr-bench)" />
        <rect x={-2000} y={H} width={W + 4000} height={2000} fill="#c4bcb0" />
        <rect x={-2000} y={BENCH_Y - 3} width={W + 4000} height={5} fill="#a8a29e" opacity={0.55} />
    </g>
);

// Lab wall clock; during the wait the elapsed part of the hour is shaded
const WallClock = ({ minutes, waiting }: { minutes: number; waiting: boolean }) => {
    const cx = 110;
    const cy = 100;
    const r = 52;
    const point = (deg: number, len: number) => ({ x: cx + len * Math.sin((deg * Math.PI) / 180), y: cy - len * Math.cos((deg * Math.PI) / 180) });
    const sweep = Math.min(359.9, minutes * 6);
    const end = point(sweep, r - 6);
    const minuteHand = point(sweep, r - 10);
    const hourHand = point(60 + minutes * 0.5, r - 24);
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
            {waiting && <text x={cx} y={cy + r + 32} textAnchor="middle" fill="#334155" fontSize={20} fontWeight="bold">{Math.floor(minutes)} of 60 min</text>}
        </g>
    );
};

const SpiritLevel = ({ x, y }: { x: number; y: number }) => (
    <g pointerEvents="none">
        <rect x={x - 22} y={y - 6} width={44} height={12} rx={6} fill="#bbf7d0" stroke="#64748b" strokeWidth={1.5} />
        <ellipse cx={x} cy={y} rx={6} ry={3.5} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.8} />
        <line x1={x - 9} x2={x - 9} y1={y - 5} y2={y + 5} stroke="#475569" strokeWidth={1} />
        <line x1={x + 9} x2={x + 9} y1={y - 5} y2={y + 5} stroke="#475569" strokeWidth={1} />
    </g>
);

// Westergren stand: base with a rubber pad for the lower end of the pipette, pillar and screw cap for the top
const WestergrenStand = () => (
    <g pointerEvents="none">
        <Shadow cx={410} cy={642} rx={110} ry={7} />
        <rect x={320} y={612} width={190} height={28} rx={4} fill="#334155" />
        <rect x={320} y={612} width={190} height={3} fill="#64748b" />
        <rect x={336} y={96} width={12} height={518} fill="url(#esr-metal)" />
        <rect x={336} y={104} width={TUBE_X - 336 + 6} height={10} rx={2} fill="url(#esr-metal)" />
        <rect x={TUBE_X - 13} y={600} width={26} height={13} rx={3} fill="#1f2937" />
        <SpiritLevel x={472} y={626} />
    </g>
);

// Screw cap on the arm of the stand, closing the top of the pipette
const ScrewCap = () => (
    <g pointerEvents="none">
        <rect x={TUBE_X - 12} y={106} width={24} height={24} rx={3} fill="#475569" />
        {[110, 116, 122].map(y => <line key={y} x1={TUBE_X - 12} x2={TUBE_X + 12} y1={y} y2={y} stroke="#94a3b8" strokeWidth={1} />)}
    </g>
);

// Wintrobe stand: base, back plate and two clips holding the tube upright
const WintrobeStand = ({ front }: { front: boolean }) => (
    front ? (
        <g pointerEvents="none">
            {[310, 560].map(y => <rect key={y} x={TUBE_X - 16} y={y} width={32} height={10} rx={3} fill="url(#esr-metal)" />)}
        </g>
    ) : (
        <g pointerEvents="none">
            <Shadow cx={420} cy={642} rx={100} ry={7} />
            <rect x={340} y={606} width={160} height={34} rx={4} fill="#334155" />
            <rect x={340} y={606} width={160} height={3} fill="#64748b" />
            <rect x={TUBE_X - 22} y={230} width={44} height={378} rx={4} fill="#475569" />
            <rect x={TUBE_X - 18} y={234} width={36} height={370} rx={3} fill="#f8fafc" />
            <SpiritLevel x={470} y={624} />
        </g>
    )
);

// ESR tube or pipette; `bloodTop` is the top of the blood column (y), `esr` the mm of clear plasma
const ESRTube = ({ method, at, bloodTop, esr, bulb }: { method: Method; at: Point; bloodTop: number | null; esr: number; bulb: boolean }) => {
    const s = TUBE[method];
    const bottom = bottomOf(s);
    const x = TUBE_X;
    const inner = s.half - 3;
    const interfaceY = s.zeroY + esr * s.pxPerMm;
    const glass = s.roundBottom
        ? `M ${x - s.half} ${s.top} L ${x - s.half} ${bottom - s.half + 4} A ${s.half} ${s.half} 0 0 0 ${x + s.half} ${bottom - s.half + 4} L ${x + s.half} ${s.top}`
        : `M ${x - s.half} ${s.top} L ${x - s.half} ${bottom} M ${x + s.half} ${s.top} L ${x + s.half} ${bottom}`;
    const clipId = `esr-bore-${method}`;
    const bore = s.roundBottom
        ? `M ${x - inner} ${s.top} L ${x - inner} ${bottom - inner + 1} A ${inner} ${inner} 0 0 0 ${x + inner} ${bottom - inner + 1} L ${x + inner} ${s.top} Z`
        : `M ${x - inner} ${s.top} L ${x - inner} ${bottom} L ${x + inner} ${bottom} L ${x + inner} ${s.top} Z`;
    const majorEvery = method === 'westergren' ? 10 : 10;
    const minorEvery = 5;
    const labelEvery = method === 'westergren' ? 50 : 10;
    return (
        <g transform={`translate(${at.x - x} ${at.y - bottom})`} pointerEvents="none">
            <defs><clipPath id={clipId}><path d={bore} /></clipPath></defs>
            <path d={bore} fill="rgba(255,255,255,0.45)" />
            {bloodTop !== null && bloodTop < bottom && (
                <g clipPath={`url(#${clipId})`}>
                    <rect x={x - inner} y={bloodTop} width={2 * inner} height={bottom - bloodTop + 2} fill="url(#esr-blood)" />
                    {esr > 0.05 && <rect x={x - inner} y={bloodTop} width={2 * inner} height={interfaceY - bloodTop} fill="url(#esr-plasma)" />}
                    {esr > 0.05 && <rect x={x - inner} y={interfaceY} width={2 * inner} height={2} fill="#3f0606" opacity={0.6} />}
                </g>
            )}
            {Array.from({ length: s.maxMm / minorEvery + 1 }, (_, i) => {
                const mm = i * minorEvery;
                const y = s.zeroY + mm * s.pxPerMm;
                const major = mm % majorEvery === 0;
                return (
                    <g key={mm}>
                        <line x1={x - s.half} x2={x - s.half + (major ? 9 : 5)} y1={y} y2={y} stroke="#1e293b" strokeWidth={major ? 1.4 : 0.9} />
                        {mm % labelEvery === 0 && (
                            <text x={x - s.half - 5} y={y + 5} textAnchor="end" fill="#1e293b" fontSize={method === 'westergren' ? 15 : 14} fontWeight="bold">
                                {method === 'westergren' ? mm : mm / 10}
                            </text>
                        )}
                    </g>
                );
            })}
            <path d={glass} fill="none" stroke="#8a9bb0" strokeWidth={2.2} />
            <ellipse cx={x} cy={s.top} rx={s.half} ry={2.5} fill="rgba(255,255,255,0.4)" stroke="#8a9bb0" strokeWidth={1.5} />
            {!s.roundBottom && <ellipse cx={x} cy={bottom} rx={s.half} ry={2.5} fill="none" stroke="#8a9bb0" strokeWidth={1.5} />}
            <rect x={x - s.half + 3} y={s.top + 10} width={2} height={bottom - s.top - 24} fill="#ffffff" opacity={0.7} />
            {bulb && <path d={`M ${x - 7} ${s.top + 4} L ${x - 7} ${s.top - 12} Q ${x - 11} ${s.top - 34} ${x} ${s.top - 36} Q ${x + 11} ${s.top - 34} ${x + 7} ${s.top - 12} L ${x + 7} ${s.top + 4} Z`} fill="#dc2626" />}
        </g>
    );
};

// Penicillin bottle with the anticoagulant; `blood` 0 to 1 as the blood goes in, `mixed` once swirled
const Vial = ({ method, blood, mixed, tilt }: { method: Method; blood: number; mixed: number; tilt: number }) => {
    const x = VIAL_X;
    const level = 628 - 18 - 52 * blood;
    const citrate = method === 'westergren';
    return (
        <g transform={`rotate(${tilt} ${x} 640) translate(${x} 640) scale(${VIAL_SCALE}) translate(${-x} -640)`} pointerEvents="none">
            <Shadow cx={x} cy={644} rx={34} ry={5} />
            <path d={`M ${x - 28} 586 Q ${x - 28} 570 ${x - 16} 568 L ${x - 14} 556 L ${x + 14} 556 L ${x + 16} 568 Q ${x + 28} 570 ${x + 28} 586 L ${x + 28} 634 Q ${x + 28} 640 ${x + 22} 640 L ${x - 22} 640 Q ${x - 28} 640 ${x - 28} 634 Z`}
                fill="rgba(255,255,255,0.45)" stroke="#8a9bb0" strokeWidth={2} />
            {(citrate || blood > 0) && (
                <path d={`M ${x - 25} ${level} L ${x + 25} ${level} L ${x + 25} 633 Q ${x + 25} 637 ${x + 21} 637 L ${x - 21} 637 Q ${x - 25} 637 ${x - 25} 633 Z`}
                    fill={blood > 0 ? BLOOD : 'rgba(224,242,254,0.8)'} opacity={blood > 0 ? 0.75 + 0.25 * mixed : 1} />
            )}
            {!citrate && blood === 0 && <ellipse cx={x} cy={634} rx={16} ry={3} fill="#f8fafc" stroke="#cbd5e1" />}
            <rect x={x - 22} y={596} width={44} height={26} rx={2} fill="#fefce8" stroke="#d6d3d1" />
            <text x={x} y={608} textAnchor="middle" fill="#111827" fontSize={10} fontWeight="bold">{citrate ? '3.8% Na' : 'Double'}</text>
            <text x={x} y={619} textAnchor="middle" fill="#111827" fontSize={10} fontWeight="bold">{citrate ? 'citrate' : 'oxalate'}</text>
        </g>
    );
};

// 2 mL syringe with venous blood, needle already removed; nozzle at (x, y)
const BloodSyringe = ({ at, volume }: { at: Point; volume: number }) => {
    const { x, y } = at;
    const barrelBottom = y - 10;
    const barrelLen = 80;
    const liquidTop = barrelBottom - barrelLen * (volume / 2.4);
    return (
        <g transform={`translate(${x} ${y}) scale(${SYRINGE_SCALE}) translate(${-x} ${-y})`} pointerEvents="none">
            <rect x={x - 2.5} y={y - 10} width={5} height={10} fill="#cbd5e1" />
            {volume > 0.01 && <rect x={x - 6} y={liquidTop} width={12} height={barrelBottom - liquidTop} fill={BLOOD} />}
            <rect x={x - 3} y={liquidTop - barrelLen * 0.15 - 46} width={6} height={46 + barrelLen * 0.15} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
            <rect x={x - 6} y={liquidTop - 5} width={12} height={5} fill="#1e293b" />
            <rect x={x - 10} y={liquidTop - barrelLen * 0.15 - 50} width={20} height={4} rx={1.5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
            <rect x={x - 7} y={barrelBottom - barrelLen} width={14} height={barrelLen} rx={2} fill="rgba(255,255,255,0.25)" stroke="#94a3b8" strokeWidth={1.5} />
            {[0, 0.5, 1, 1.5, 2].map(v => <line key={v} x1={x - 7} x2={x - 2} y1={barrelBottom - (barrelLen * v) / 2.4} y2={barrelBottom - (barrelLen * v) / 2.4} stroke="#64748b" strokeWidth={1} />)}
            <rect x={x - 13} y={barrelBottom - barrelLen - 3} width={26} height={4} rx={1.5} fill="#cbd5e1" />
        </g>
    );
};

// Pasteur pipette with a long nozzle (to fill the Wintrobe tube from the bottom up); tip at (x, y)
const PasteurPipette = ({ at, filled }: { at: Point; filled: number }) => {
    const { x, y } = at;
    const bodyTop = y - PASTEUR_NOZZLE - 70;
    return (
        <g pointerEvents="none">
            <path d={`M ${x - 1.6} ${y} L ${x - 1.6} ${y - PASTEUR_NOZZLE} L ${x - 6} ${y - PASTEUR_NOZZLE - 14} L ${x - 6} ${bodyTop} L ${x + 6} ${bodyTop} L ${x + 6} ${y - PASTEUR_NOZZLE - 14} L ${x + 1.6} ${y - PASTEUR_NOZZLE} L ${x + 1.6} ${y} Z`}
                fill="rgba(255,255,255,0.55)" stroke="#8a9bb0" strokeWidth={1} />
            {filled > 0.01 && <rect x={x - 4} y={y - PASTEUR_NOZZLE - 14 - 50 * filled} width={8} height={50 * filled} fill={BLOOD} />}
            {filled > 0.01 && <rect x={x - 0.8} y={y - PASTEUR_NOZZLE} width={1.6} height={PASTEUR_NOZZLE} fill={BLOOD} />}
            <path d={`M ${x - 8} ${bodyTop} L ${x - 8} ${bodyTop - 14} Q ${x - 8} ${bodyTop - 32} ${x} ${bodyTop - 32} Q ${x + 8} ${bodyTop - 32} ${x + 8} ${bodyTop - 14} L ${x + 8} ${bodyTop} Z`} fill="#b91c1c" />
        </g>
    );
};

// Magnified scale at the top of the red cell column
const MAG = { cx: 800, cy: 280, r: 140, pxPerMm: 10 };
const Magnifier = ({ method, esr, anchor }: { method: Method; esr: number; anchor: Point }) => {
    const { cx, cy, r, pxPerMm } = MAG;
    const s = TUBE[method];
    const yOfMm = (mm: number) => cy + (mm - esr) * pxPerMm;
    const first = Math.max(0, Math.floor(esr - r / pxPerMm));
    const last = Math.min(s.maxMm, Math.ceil(esr + r / pxPerMm));
    const half = 34;
    return (
        <g pointerEvents="none">
            <line x1={anchor.x} y1={anchor.y} x2={cx - r} y2={cy} stroke="#475569" strokeWidth={2} strokeDasharray="6 5" />
            <defs><clipPath id="esr-mag"><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
            <g clipPath="url(#esr-mag)">
                <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#f8fafc" />
                <rect x={cx - half} y={yOfMm(0)} width={2 * half} height={Math.max(0, cy + r - yOfMm(0))} fill="url(#esr-plasma)" />
                <rect x={cx - half} y={cy} width={2 * half} height={r} fill="url(#esr-blood)" />
                <line x1={cx - half} x2={cx - half} y1={cy - r} y2={cy + r} stroke="#94a3b8" strokeWidth={4} />
                <line x1={cx + half} x2={cx + half} y1={cy - r} y2={cy + r} stroke="#94a3b8" strokeWidth={4} />
                {Array.from({ length: last - first + 1 }, (_, i) => first + i).map(mm => {
                    const y = yOfMm(mm);
                    const major = mm % 5 === 0;
                    return (
                        <g key={mm}>
                            <line x1={cx - half} x2={cx - half + (mm % 10 === 0 ? 26 : major ? 18 : 10)} y1={y} y2={y} stroke="#0f172a" strokeWidth={major ? 2.5 : 1.5} />
                            {major && <text x={cx - half - 8} y={y + 8} textAnchor="end" fill="#0f172a" fontSize={22} fontWeight="bold">{mm}</text>}
                        </g>
                    );
                })}
            </g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={6} />
            <line x1={cx + r * 0.72} y1={cy + r * 0.72} x2={cx + r * 0.72 + 40} y2={cy + r * 0.72 + 40} stroke="#334155" strokeWidth={14} strokeLinecap="round" />
            <text x={cx} y={cy - r - 14} textAnchor="middle" fill="#334155" fontSize={20}>{s.name}: scale in mm</text>
        </g>
    );
};

// --- Main Component ---
export const ESR: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [method, setMethod] = useState<Method>('westergren');
    const [sampleId, setSampleId] = useState('male');
    const [unknownIndex, setUnknownIndex] = useState(randomSampleIndex);
    const [phase, setPhase] = useState<Phase>('start');
    const [phaseStart, setPhaseStart] = useState(0);
    const [now, setNow] = useState(() => performance.now());
    const [reading, setReading] = useState('');
    const [verdict, setVerdict] = useState<Verdict | ''>('');
    const [checked, setChecked] = useState(false);
    const [blend, setBlend] = useState<{ from: number; start: number; end: number } | null>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const { label: hoverLabel, hover } = useHoverLabel();
    const questionSet = questionSetFor('esr');

    const isUnknown = sampleId === 'unknown';
    const sample = isUnknown ? SAMPLES[unknownIndex] : SAMPLES.find(s => s.id === sampleId)!;
    const spec = TUBE[method];
    const trueEsr = sample.esr[method];
    const normal = NORMAL[method][sample.sex];
    const t = (now - phaseStart) / 1000;
    // After a change of sample the picture moves on smoothly: during the wait it blends into the new sample's
    // course by the end of the wait; otherwise over 1.5 s.
    const shownEsr = blend ? lerp(blend.from, trueEsr, clamp01((now - blend.start) / (blend.end - blend.start))) : trueEsr;

    // Animation clock
    const animating = phase === 'mix' || phase === 'fill' || phase === 'waiting' || (blend !== null && now < blend.end);
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
        if (phase === 'mix' && t >= MIX_DURATION) setPhase('mixed');
        else if (phase === 'fill' && t >= FILL_DURATION[method]) setPhase('filled');
        else if (phase === 'waiting' && t >= WAIT_SECONDS) setPhase('done');
    }, [phase, t, method]);

    const reset = () => {
        setPhase('start');
        setPhaseStart(0);
        setReading('');
        setVerdict('');
        setChecked(false);
        setBlend(null);
    };
    const handleReset = () => {
        reset();
        if (isUnknown) setUnknownIndex(randomSampleIndex());
    };
    const handleMethod = (m: Method) => {
        setMethod(m);
        reset();
    };
    // The sample can be changed at any time; the answer starts afresh
    const handleSampleChange = (id: string) => {
        const start = performance.now();
        const end = phase === 'waiting' ? Math.max(phaseStart + WAIT_SECONDS * 1000, start + 1500) : start + 1500;
        setBlend({ from: shownEsr, start, end });
        setNow(start);
        setSampleId(id);
        if (id === 'unknown') setUnknownIndex(randomSampleIndex());
        setReading('');
        setVerdict('');
        setChecked(false);
    };

    // --- Scene for the current moment ---
    const bottom = bottomOf(spec);
    let syringe = { at: SYRINGE_REST, volume: 2 };
    let vial = { blood: 0, mixed: 0, tilt: 0 };
    let tubeAt: Point = { x: TUBE_X, y: bottom };
    let bloodTop: number | null = null;
    let bulb = false;
    let pasteur: { at: Point; filled: number } | null = null;
    let esr = 0;
    let clockMinutes = 0;
    let caption = '';
    const westergren = method === 'westergren';
    if (westergren) tubeAt = WEST_REST;

    if (phase === 'start') {
        caption = westergren
            ? 'Step 1: Mix 2 mL of venous blood with 0.5 mL of 3.8% sodium citrate (4 : 1)'
            : 'Step 1: Mix 2 mL of venous blood with the double oxalate powder';
    } else if (phase === 'mix') {
        const m1 = MIX.in;
        const m2 = m1 + MIX.push;
        const m3 = m2 + MIX.out;
        const pushed = clamp01((t - m1) / MIX.push);
        syringe = {
            at: t < m1 ? lerpPt(SYRINGE_REST, SYRINGE_OVER_VIAL, ease(t / m1)) : t < m2 ? SYRINGE_OVER_VIAL : lerpPt(SYRINGE_OVER_VIAL, SYRINGE_REST, ease((t - m2) / MIX.out)),
            volume: 2 * (1 - pushed),
        };
        vial = { blood: pushed, mixed: ease((t - m3) / MIX.swirl), tilt: t >= m3 ? 12 * Math.sin(((t - m3) / MIX.swirl) * 4 * Math.PI) : 0 };
        caption = t < m2 ? 'Needle removed first, then the blood is run gently into the bottle (to avoid hemolysis)' : 'Mixing gently by swirling. Do not shake, it causes froth';
    } else {
        vial = { blood: 1, mixed: 1, tilt: 0 };
        syringe = { at: SYRINGE_REST, volume: 0 };
    }

    if (phase === 'mixed') {
        caption = westergren ? `Fill the ${spec.name} with blood exactly to the 0 mark` : `Fill the ${spec.name} from the bottom up to the 0 mark`;
    } else if (phase === 'fill') {
        if (westergren) {
            const f1 = WEST_FILL.out;
            const f2 = f1 + WEST_FILL.suck;
            const f3 = f2 + WEST_FILL.back;
            const arc = (p: number) => -90 * Math.sin(Math.PI * p);
            if (t < f1) {
                const p = ease(t / f1);
                tubeAt = { ...lerpPt(WEST_REST, WEST_IN_VIAL, p), y: lerp(WEST_REST.y, WEST_IN_VIAL.y, p) + arc(p) };
            } else if (t < f2) {
                tubeAt = WEST_IN_VIAL;
                bloodTop = lerp(bottom, spec.zeroY, ease((t - f1) / WEST_FILL.suck));
            } else if (t < f3) {
                const p = ease((t - f2) / WEST_FILL.back);
                tubeAt = { ...lerpPt(WEST_IN_VIAL, WEST_REST, p), y: lerp(WEST_IN_VIAL.y, WEST_REST.y, p) + arc(p) };
                bloodTop = spec.zeroY;
            } else {
                bloodTop = spec.zeroY;
            }
            bulb = t < f2 + 0.2;
            caption = t < f2 ? 'Sucking citrated blood up to the 0 mark with a rubber bulb, no air bubbles'
                : 'Pressing the lower end into the rubber pad and closing the top under the screw cap, vertical';
        } else {
            const w1 = WIN_FILL.suck;
            const w2 = w1 + WIN_FILL.move;
            const w3 = w2 + WIN_FILL.insert;
            const w4 = w3 + WIN_FILL.fill;
            const overTube: Point = { x: TUBE_X, y: spec.top - 6 };
            const atBottom: Point = { x: TUBE_X, y: bottom - 6 };
            if (t < w1) pasteur = { at: PASTEUR_REST, filled: ease(t / w1) };
            else if (t < w2) pasteur = { at: lerpPt(PASTEUR_REST, overTube, ease((t - w1) / WIN_FILL.move)), filled: 1 };
            else if (t < w3) pasteur = { at: lerpPt(overTube, atBottom, ease((t - w2) / WIN_FILL.insert)), filled: 1 };
            else if (t < w4) {
                const p = ease((t - w3) / WIN_FILL.fill);
                bloodTop = lerp(bottom, spec.zeroY, p);
                pasteur = { at: { x: TUBE_X, y: Math.min(bottom - 6, bloodTop + 8) }, filled: 1 - 0.8 * p };
            } else {
                bloodTop = spec.zeroY;
                pasteur = { at: lerpPt({ x: TUBE_X, y: spec.zeroY + 8 }, PASTEUR_REST, ease((t - w4) / WIN_FILL.back)), filled: 0.2 };
            }
            caption = t < w3 ? 'Taking blood in the long-nozzled Pasteur pipette to the bottom of the tube'
                : 'Filling from the bottom up while withdrawing the nozzle, so no air bubbles form';
        }
    } else if (phase === 'filled') {
        bloodTop = spec.zeroY;
        caption = `${spec.name} upright in its stand. Note the time and leave it undisturbed for 1 hour`;
    } else if (phase === 'waiting' || phase === 'done') {
        bloodTop = spec.zeroY;
        const minutes = phase === 'waiting' ? 60 * clamp01(t / WAIT_SECONDS) : 60;
        clockMinutes = minutes;
        esr = shownEsr * fallFraction(minutes);
        caption = phase === 'waiting'
            ? (minutes < 10 ? 'Stage 1: red cells pile up into rouleaux' : minutes < 50 ? 'Stage 2: the rouleaux sink at a steady rate' : 'Stage 3: the red cells pack at the bottom')
            : 'One hour: read the height of clear plasma above the red cells, in mm';
    }

    const interfaceAt: Point = { x: TUBE_X + spec.half + 4, y: spec.zeroY + esr * spec.pxPerMm };
    const readingValue = reading.trim() === '' ? null : Number(reading);
    const readingOk = readingValue !== null && Math.abs(readingValue - trueEsr) <= 1;
    const verdictOk = verdict === verdictOf(trueEsr, normal);
    const step = phase === 'start' || phase === 'mix' ? 1 : phase === 'mixed' || phase === 'fill' ? 2 : phase === 'filled' || phase === 'waiting' ? 3 : 4;
    const tubeInStand = !westergren || (tubeAt.x === WEST_REST.x && tubeAt.y === WEST_REST.y);
    const tubeTopY = tubeAt.y - (bottom - spec.top);

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Erythrocyte Sedimentation Rate</h1>
                        <p className="text-slate-400 text-xs">Westergren and Wintrobe methods</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left: lab bench */}
                <div className="flex-1 bg-slate-900/40 flex flex-col p-4 min-h-0">
                    <p className="text-sm lg:text-base font-semibold text-indigo-300 text-center mb-3 min-h-[2.5rem] lg:min-h-0 flex items-center justify-center">{caption}</p>
                    <div className="relative flex-1 min-h-[280px] rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center bg-[#dfe5ec]">
                        <HoverLabel label={hoverLabel} />
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full max-h-[78vh]" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                            <SceneDefs />
                            <LabBackground />
                            <WallClock minutes={clockMinutes} waiting={phase === 'waiting'} />
                            {westergren ? <WestergrenStand /> : <WintrobeStand front={false} />}
                            <ESRTube method={method} at={tubeAt} bloodTop={bloodTop} esr={esr} bulb={bulb} />
                            {westergren ? <ScrewCap /> : <WintrobeStand front />}
                            <Vial method={method} blood={vial.blood} mixed={vial.mixed} tilt={vial.tilt} />
                            {pasteur && <PasteurPipette at={pasteur.at} filled={pasteur.filled} />}
                            <BloodSyringe at={syringe.at} volume={syringe.volume} />

                            {/* Part names on hover */}
                            <HoverZone x={52} y={42} w={116} h={116} {...hover('Wall clock')} />
                            {westergren ? (
                                <>
                                    <HoverZone x={320} y={612} w={190} h={28} {...hover('Westergren stand')} />
                                    <HoverZone x={334} y={96} w={16} h={516} {...hover('Westergren stand')} />
                                    <HoverZone x={450} y={618} w={44} h={16} {...hover('Spirit level: keeps the pipette exactly vertical')} />
                                    {tubeInStand && <HoverZone x={TUBE_X - 14} y={600} w={28} h={13} {...hover('Rubber pad: seals the lower end of the pipette')} />}
                                    <HoverZone x={TUBE_X - 14} y={104} w={28} h={28} {...hover('Screw cap: holds and closes the top of the pipette')} />
                                </>
                            ) : (
                                <>
                                    <HoverZone x={340} y={606} w={160} h={34} {...hover('Wintrobe stand')} />
                                    <HoverZone x={448} y={616} w={44} h={16} {...hover('Spirit level: keeps the tube exactly vertical')} />
                                </>
                            )}
                            <HoverZone x={tubeAt.x - spec.half - 4} y={tubeTopY - 4} w={2 * spec.half + 8} h={bottom - spec.top + 8}
                                {...hover(westergren ? 'Westergren pipette: 300 mm long, 2.5 mm bore, graduated 0 to 200 mm' : 'Wintrobe tube: 110 mm long, graduated 0 to 10 cm (ESR from the top, PCV from the bottom)')} />
                            <HoverZone x={VIAL_X - 44} y={510} w={88} h={132} {...hover(westergren ? 'Penicillin bottle: 3.8% sodium citrate (1 part to 4 parts blood)' : 'Penicillin bottle: double oxalate (ammonium + potassium oxalate)')} />
                            <HoverZone x={syringe.at.x - 21} y={syringe.at.y - 240} w={42} h={240} {...hover('2 mL syringe with venous blood (needle removed)')} />
                            {pasteur && <HoverZone x={pasteur.at.x - 9} y={pasteur.at.y - PASTEUR_NOZZLE - 102} w={18} h={PASTEUR_NOZZLE + 102} {...hover('Pasteur pipette with a long nozzle')} />}
                            {(phase === 'waiting' || phase === 'done') && <HoverZone x={MAG.cx - MAG.r} y={MAG.cy - MAG.r} w={2 * MAG.r} h={2 * MAG.r} {...hover('Magnified view of the scale')} />}

                            {(phase === 'waiting' || phase === 'done') && <Magnifier method={method} esr={esr} anchor={interfaceAt} />}
                        </svg>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-4 lg:p-6 space-y-4 lg:overflow-y-auto">
                    {/* Steps */}
                    <div className="flex gap-2 text-xs font-bold uppercase">
                        {['Mix', 'Fill', 'Wait 1 h', 'Read'].map((s, i) => (
                            <div key={s} className={`flex-1 text-center py-1.5 rounded-md border ${step === i + 1 ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : step > i + 1 ? 'border-emerald-700 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                                {i + 1}. {s}
                            </div>
                        ))}
                    </div>

                    {/* Method */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        {(['westergren', 'wintrobe'] as Method[]).map(m => (
                            <button key={m} onClick={() => handleMethod(m)}
                                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${method === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                {m === 'westergren' ? 'Westergren' : 'Wintrobe'}
                            </button>
                        ))}
                    </div>

                    {/* Sample */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                            <Droplet className="w-4 h-4 text-red-400" /> Blood sample (venous)
                        </label>
                        <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block p-2.5 outline-none focus:border-indigo-500 disabled:opacity-60">
                            {SAMPLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            <option value="unknown">Unknown sample</option>
                        </select>
                    </div>

                    {(phase === 'start' || phase === 'mix') && (
                        <div className="flex gap-3">
                            <button onClick={() => startPhase('mix')} disabled={phase === 'mix'}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <SyringeIcon className="w-5 h-5" /> {phase === 'mix' ? 'Mixing…' : westergren ? 'Add blood to the citrate' : 'Add blood to the oxalate'}
                            </button>
                            {phase === 'mix' && (
                                <button onClick={() => setPhase('mixed')}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                    Skip
                                </button>
                            )}
                        </div>
                    )}
                    {(phase === 'mixed' || phase === 'fill') && (
                        <div className="flex gap-3">
                            <button onClick={() => startPhase('fill')} disabled={phase === 'fill'}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <Pipette className="w-5 h-5" /> {phase === 'fill' ? 'Filling…' : `Fill the ${westergren ? 'pipette' : 'tube'} to 0`}
                            </button>
                            {phase === 'fill' && (
                                <button onClick={() => setPhase('filled')}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                    Skip
                                </button>
                            )}
                        </div>
                    )}
                    {phase === 'filled' && (
                        <button onClick={() => startPhase('waiting')}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            <Timer className="w-5 h-5" /> Note the time and wait 1 hour
                        </button>
                    )}
                    {phase === 'waiting' && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <Timer className="w-4 h-4 text-amber-400" />
                                Standing undisturbed: <span className="font-mono text-amber-300">{Math.floor(clockMinutes)} of 60 min</span>
                            </div>
                            <button onClick={() => setPhase('done')}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg text-sm border border-slate-600">
                                Skip
                            </button>
                        </div>
                    )}

                    {/* Reading and result */}
                    {phase === 'done' && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase">Your reading</div>
                            <div className="flex items-center gap-2">
                                <input type="number" inputMode="numeric" min={0} max={spec.maxMm} value={reading} onChange={(e) => { setReading(e.target.value); setChecked(false); }}
                                    placeholder="mm" className="w-24 bg-slate-900 border border-slate-700 text-slate-100 text-lg font-mono rounded-lg p-2 outline-none focus:border-indigo-500" />
                                <span className="text-sm text-slate-300">mm 1st hour</span>
                                {checked && (readingOk ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />)}
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-slate-300 flex items-center gap-2">
                                    For this {sample.sex === 'male' ? 'man' : 'woman'}, the ESR is
                                    {checked && (verdictOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['low', 'normal', 'raised'] as Verdict[]).map(v => (
                                        <button key={v} onClick={() => { setVerdict(v); setChecked(false); }}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-colors ${verdict === v ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                                            {VERDICT_LABELS[v]}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Normal ({westergren ? 'Westergren' : 'Wintrobe'}): men {NORMAL[method].male[0]} to {NORMAL[method].male[1]} mm, women {NORMAL[method].female[0]} to {NORMAL[method].female[1]} mm 1st hour.
                                </p>
                            </div>
                            <button onClick={() => setChecked(true)} disabled={readingValue === null || verdict === ''}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 rounded-lg text-sm">
                                Check
                            </button>
                            {checked && (
                                readingOk && verdictOk ? (
                                    <div className="text-sm space-y-1.5">
                                        <p className="text-emerald-400 font-bold flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                            ESR = {trueEsr} mm 1st hour ({westergren ? 'Westergren' : 'Wintrobe'}): {VERDICT_LABELS[verdictOf(trueEsr, normal)].toLowerCase()}.
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            <span className="text-slate-200 font-semibold">{isUnknown ? `The unknown sample was: ${sample.label}.` : `${sample.label}:`}</span> {sample.note}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-400 flex items-start gap-2">
                                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        {!readingOk
                                            ? 'Read again: the ESR is the height of the clear plasma, from the 0 mark down to the top of the red cells.'
                                            : 'Compare the reading with the normal range for the sex of the subject.'}
                                    </p>
                                )
                            )}
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
