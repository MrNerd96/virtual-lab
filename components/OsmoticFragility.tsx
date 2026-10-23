import React, { useState, useEffect } from 'react';
import { ArrowLeft, Droplet, FlaskConical, RefreshCw, CheckCircle2, XCircle, Timer, Pipette, Search } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';

// --- Types & Constants ---

type Phase = 'empty' | 'nacl' | 'nacl-done' | 'water' | 'ready' | 'blood' | 'waiting' | 'done';
type Fragility = 'normal' | 'increased' | 'decreased';
type RGB = [number, number, number];
type Point = { x: number; y: number };

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const css = (c: RGB) => `rgb(${c.map(v => Math.round(Math.min(255, Math.max(0, v)))).join(', ')})`;

// Drops of 1% NaCl and distilled water in tubes 1 to 12, 25 drops in each (AK Jain, GK Pal, CL Ghai)
const TUBES = ([[22, 3], [16, 9], [15, 10], [14, 11], [13, 12], [12, 13], [11, 14], [10, 15], [9, 16], [8, 17], [7, 18], [0, 25]] as const)
    .map(([nacl, water], i) => ({ no: i + 1, nacl, water, pct: nacl / 25 }));
const pctText = (pct: number) => (pct === 0 ? '0' : pct.toFixed(2));
const tubeName = (i: number) => (TUBES[i].pct === 0 ? `Tube ${TUBES[i].no} (distilled water)` : `Tube ${TUBES[i].no} (${pctText(TUBES[i].pct)}% NaCl)`);

interface Sample {
    id: string;
    label: string;
    start: number; // % NaCl in which the most fragile cells start to burst
    end: number;   // % NaCl in which every cell has burst
    fragility: Fragility;
    note: string;
}

const SAMPLES: Sample[] = [
    { id: 'normal', label: 'Healthy adult', start: 0.5, end: 0.34, fragility: 'normal', note: 'Biconcave cells can swell to about 150% of their volume before they become spheres and burst.' },
    { id: 'hs', label: 'Hereditary spherocytosis', start: 0.7, end: 0.46, fragility: 'increased', note: 'Spherocytes are already nearly round, so they can take in little water before they burst: fragility is increased.' },
    { id: 'ida', label: 'Iron deficiency anaemia', start: 0.42, end: 0.26, fragility: 'decreased', note: 'Thin, hypochromic cells can take in more water before they burst: fragility is decreased.' },
    { id: 'thal', label: 'Thalassaemia', start: 0.38, end: 0.22, fragility: 'decreased', note: 'Target cells are flat, with a large surface for their volume, so fragility is decreased.' },
];
const randomSampleIndex = () => Math.floor(Math.random() * SAMPLES.length);

// Fraction of the red cells hemolysed in a given % NaCl
const hemolysed = (s: Sample, pct: number) => clamp01((s.start - pct) / (s.start - s.end));

const FRAGILITY_LABELS: Record<Fragility, string> = { normal: 'Normal', increased: 'Increased', decreased: 'Decreased' };

// --- Colours ---
// Released haemoglobin tints the saline from colourless to transparent cherry red; intact cells make it
// cloudy until they settle as a red button at the bottom.
const K_OXYHB: RGB = [0.06, 0.9, 0.8];
const SALINE: RGB = [226, 239, 249];
const supernatant = (lysis: number): RGB => SALINE.map((c, i) => c * 10 ** (-K_OXYHB[i] * 0.95 * lysis)) as RGB;
const SUSPENSION = 'rgb(186, 60, 58)';
const DROP_COLOR = '#e0f2fe';
const BLOOD = '#b91c1c';

// --- Geometry ---
const W = 1000;
const H = 800;
const BENCH_Y = 560;     // back edge of the bench top
const TUBE_TOP = 300;
const TUBE_BOTTOM = 576; // outside of the round bottom
const TUBE_R = 18;
const INNER_R = 15;
const INNER_BOTTOM = TUBE_BOTTOM - 3;
const PX_PER_DROP = 4.2;
const tubeX = (i: number) => 76 + i * 77;
const levelY = (drops: number) => INNER_BOTTOM - drops * PX_PER_DROP;
const above = (i: number): Point => ({ x: tubeX(i), y: TUBE_TOP - 6 });
const RACK_TOP = 392;    // front bar of the upper plate, which holds the tubes
const NACL_REST: Point = { x: 640, y: 736 };
const WATER_REST: Point = { x: 760, y: 736 };
const BLOOD_REST: Point = { x: 880, y: 736 };

// --- Timelines ---
// A dropper tours the tubes: bottle → tube → tube … → bottle, dwelling `dwell` s at each
const LEAD = 0.45;
const MOVE = 0.2;
const RETURN = 0.45;
const arrive = (k: number, dwell: number) => LEAD + k * (MOVE + dwell);
const tourDuration = (n: number, dwell: number) => arrive(n - 1, dwell) + dwell + RETURN;
function tourPos(t: number, stops: Point[], rest: Point, dwell: number): Point {
    if (t < LEAD) return lerpPt(rest, stops[0], ease(t / LEAD));
    for (let k = 0; k < stops.length; k++) {
        const a = arrive(k, dwell);
        if (t < a + dwell) return stops[k];
        if (k < stops.length - 1 && t < a + dwell + MOVE) return lerpPt(stops[k], stops[k + 1], ease((t - a - dwell) / MOVE));
    }
    return lerpPt(stops[stops.length - 1], rest, ease((t - arrive(stops.length - 1, dwell) - dwell) / RETURN));
}

const DISPENSE = 0.35;    // s to count the drops into one tube
const BLOOD_DWELL = 0.4;
const SWELL = 0.2;        // a drop swells at the dropper tip before it falls
const DROP_FALL = 0.18;
const INVERT = 1.0;       // each tube inverted gently once
const WAIT_SECONDS = 12;  // the 1 hour wait, sped up (1 s = 5 min)
const NACL_STOPS = TUBES.map((_, i) => i).filter(i => TUBES[i].nacl > 0);
const ALL_STOPS = TUBES.map((_, i) => i);
const NACL_DURATION = tourDuration(NACL_STOPS.length, DISPENSE);
const WATER_DURATION = tourDuration(ALL_STOPS.length, DISPENSE);
const BLOOD_TOUR = tourDuration(ALL_STOPS.length, BLOOD_DWELL);
const BLOOD_DURATION = BLOOD_TOUR + INVERT;
// Cells burst within the first quarter hour; the intact ones take most of the hour to settle
const lysisCurve = (w: number) => ease(clamp01(w / 0.25));
const settleCurve = (w: number) => 1 - (1 - clamp01(w / 0.92)) ** 2;

interface TubeLook {
    drops: number;   // drops of saline / water
    blood: boolean;  // the drop of blood is in
    cloud: number;   // the fresh drop as a red cloud, before mixing
    turbid: number;  // 1 once mixed: cells evenly suspended
    lysis: number;   // fraction of cells burst so far
    settle: number;  // 0 to 1: intact cells settled to the bottom
}
const EMPTY_LOOK: TubeLook = { drops: 0, blood: false, cloud: 0, turbid: 0, lysis: 0, settle: 0 };

// --- SVG parts ---

const SceneDefs = () => (
    <defs>
        <filter id="of-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <linearGradient id="of-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#eef2f6" /><stop offset="1" stopColor="#d9e0e8" /></linearGradient>
        <linearGradient id="of-bench" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ddd6cc" /><stop offset="1" stopColor="#c4bcb0" /></linearGradient>
        <linearGradient id="of-wood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b7834f" /><stop offset="1" stopColor="#8a5a2e" /></linearGradient>
        <radialGradient id="of-cloud" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stopColor={BLOOD} stopOpacity={0.95} /><stop offset="1" stopColor={BLOOD} stopOpacity={0} /></radialGradient>
        <radialGradient id="of-sediment" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#b91c1c" /><stop offset="1" stopColor="#6b1111" /></radialGradient>
    </defs>
);

const Shadow = ({ cx, cy, rx, ry = 7 }: { cx: number; cy: number; rx: number; ry?: number }) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(15,23,42,0.22)" filter="url(#of-blur)" />
);

// Lab wall and bench top; they run past the viewBox (the svg is drawn with overflow visible)
const LabBackground = () => (
    <g>
        <rect x={-2000} y={-2000} width={W + 4000} height={2000} fill="#eef2f6" />
        <rect x={-2000} y={0} width={W + 4000} height={BENCH_Y} fill="url(#of-wall)" />
        <rect x={-2000} y={BENCH_Y} width={W + 4000} height={H - BENCH_Y} fill="url(#of-bench)" />
        <rect x={-2000} y={H} width={W + 4000} height={2000} fill="#c4bcb0" />
        <rect x={-2000} y={BENCH_Y - 3} width={W + 4000} height={5} fill="#a8a29e" opacity={0.55} />
    </g>
);

// White paper behind the rack: the colour of the saline is judged against it
const WhitePaper = () => (
    <g pointerEvents="none">
        <rect x={48} y={240} width={912} height={332} fill="rgba(15,23,42,0.12)" filter="url(#of-blur)" />
        <rect x={44} y={236} width={912} height={332} fill="#ffffff" stroke="#e2e8f0" strokeWidth={1.5} />
    </g>
);

// Lab wall clock; during the wait the elapsed part of the hour is shaded
const WallClock = ({ minutes, waiting }: { minutes: number; waiting: boolean }) => {
    const cx = 96;
    const cy = 96;
    const r = 52;
    const point = (deg: number, len: number) => ({ x: cx + len * Math.sin((deg * Math.PI) / 180), y: cy - len * Math.cos((deg * Math.PI) / 180) });
    const sweep = Math.min(359.9, minutes * 6);
    const end = point(sweep, r - 6);
    const minuteHand = point(sweep, r - 10);
    const hourHand = point(330 + minutes * 0.5, r - 24);
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

// Wooden rack: side posts behind the tubes
const RackBack = () => (
    <g pointerEvents="none">
        <Shadow cx={500} cy={606} rx={480} ry={8} />
        <rect x={30} y={RACK_TOP - 12} width={14} height={TUBE_BOTTOM + 26 - RACK_TOP + 12} fill="#8a5a2e" />
        <rect x={956} y={RACK_TOP - 12} width={14} height={TUBE_BOTTOM + 26 - RACK_TOP + 12} fill="#8a5a2e" />
    </g>
);

// Front of the rack: upper bar with the tube numbers, base with the % NaCl, drops written below
const RackFront = () => (
    <g pointerEvents="none">
        <rect x={30} y={RACK_TOP - 6} width={940} height={7} fill="#c9965f" />
        <rect x={30} y={RACK_TOP} width={940} height={26} rx={3} fill="url(#of-wood)" />
        <rect x={30} y={TUBE_BOTTOM - 6} width={940} height={7} fill="#c9965f" />
        <rect x={30} y={TUBE_BOTTOM} width={940} height={26} rx={3} fill="url(#of-wood)" />
        {TUBES.map((tube, i) => (
            <g key={tube.no}>
                <text x={tubeX(i)} y={RACK_TOP + 20} textAnchor="middle" fill="#fef3c7" fontSize={19} fontWeight="bold">{tube.no}</text>
                <text x={tubeX(i)} y={TUBE_BOTTOM + 20} textAnchor="middle" fill="#fef3c7" fontSize={18} fontWeight="bold">{pctText(tube.pct)}</text>
                <text x={tubeX(i)} y={TUBE_BOTTOM + 52} textAnchor="middle" fill="#475569" fontSize={19} fontFamily="monospace">{tube.nacl}+{tube.water}</text>
            </g>
        ))}
        <text x={52} y={TUBE_BOTTOM + 90} fill="#475569" fontSize={20}>Base: % NaCl</text>
        <text x={52} y={TUBE_BOTTOM + 116} fill="#475569" fontSize={20}>Below: drops of 1% NaCl + water</text>
    </g>
);

// Test tube with its contents
const TubeView = ({ i, look, id }: { i: number; look: TubeLook; id: string }) => {
    const x = tubeX(i);
    const x0 = x - INNER_R;
    const x1 = x + INNER_R;
    const interior = `M ${x0} ${TUBE_TOP} L ${x0} ${INNER_BOTTOM - INNER_R} A ${INNER_R} ${INNER_R} 0 0 0 ${x1} ${INNER_BOTTOM - INNER_R} L ${x1} ${TUBE_TOP} Z`;
    const outer = `M ${x - TUBE_R} ${TUBE_TOP} L ${x - TUBE_R} ${TUBE_BOTTOM - TUBE_R} A ${TUBE_R} ${TUBE_R} 0 0 0 ${x + TUBE_R} ${TUBE_BOTTOM - TUBE_R} L ${x + TUBE_R} ${TUBE_TOP}`;
    const drops = look.drops + (look.blood ? 1 : 0);
    const yTop = levelY(drops);
    // Liquid below y, with a concave meniscus
    const column = (y: number) => `M ${x0} ${y - 3} Q ${x} ${y + 3} ${x1} ${y - 3} L ${x1} ${INNER_BOTTOM + 2} L ${x0} ${INNER_BOTTOM + 2} Z`;
    const cells = look.turbid * (1 - look.lysis); // intact cells, suspended or settled
    const front = yTop + (INNER_BOTTOM - yTop) * look.settle;
    const button = cells * look.settle;
    return (
        <g pointerEvents="none">
            <defs><clipPath id={id}><path d={interior} /></clipPath></defs>
            <path d={interior} fill="rgba(255,255,255,0.3)" />
            {drops > 0.01 && (
                <g clipPath={`url(#${id})`}>
                    <path d={column(yTop)} fill={css(supernatant(look.lysis))} opacity={0.9} />
                    <path d={`M ${x0} ${yTop - 3} Q ${x} ${yTop + 3} ${x1} ${yTop - 3}`} fill="none" stroke="#0369a1" strokeWidth={1.5} opacity={0.45} />
                    {look.cloud > 0.01 && <ellipse cx={x} cy={INNER_BOTTOM - 16} rx={4 + 10 * look.cloud} ry={6 + 16 * look.cloud} fill="url(#of-cloud)" />}
                    {cells > 0.01 && look.settle < 0.999 && <path d={column(front)} fill={SUSPENSION} opacity={0.9 * cells} />}
                    {button > 0.02 && <ellipse cx={x} cy={INNER_BOTTOM - 2 - 4 * button} rx={4 + 8 * button} ry={2 + 4.5 * button} fill="url(#of-sediment)" />}
                </g>
            )}
            <path d={outer} fill="none" stroke="#8a9bb0" strokeWidth={2.2} />
            <rect x={x - TUBE_R + 5} y={TUBE_TOP + 8} width={3} height={TUBE_BOTTOM - TUBE_TOP - 30} rx={1.5} fill="#ffffff" opacity={0.6} />
            <ellipse cx={x} cy={TUBE_TOP} rx={TUBE_R} ry={4} fill="rgba(255,255,255,0.3)" stroke="#8a9bb0" strokeWidth={2} />
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

// Reagent bottle with a paper label, standing on the front of the bench; `cx` is its centre
const Bottle = ({ cx, liquid, lines }: { cx: number; liquid: string; lines: [string, string] }) => {
    const x = cx - 40;
    return (
        <g pointerEvents="none">
            <Shadow cx={cx} cy={784} rx={44} ry={6} />
            <path d={`M ${x} 688 Q ${x} 668 ${x + 16} 664 L ${x + 26} 660 L ${x + 26} 640 L ${x + 54} 640 L ${x + 54} 660 L ${x + 64} 664 Q ${x + 80} 668 ${x + 80} 688 L ${x + 80} 772 Q ${x + 80} 780 ${x + 72} 780 L ${x + 8} 780 Q ${x} 780 ${x} 772 Z`}
                fill="rgba(255,255,255,0.45)" stroke="#8a9bb0" strokeWidth={2} />
            <path d={`M ${x + 3} 700 L ${x + 77} 700 L ${x + 77} 772 Q ${x + 77} 777 ${x + 72} 777 L ${x + 8} 777 Q ${x + 3} 777 ${x + 3} 772 Z`} fill={liquid} />
            <rect x={x + 8} y={712} width={64} height={44} rx={3} fill="#fefce8" stroke="#d6d3d1" />
            <text x={cx} y={731} textAnchor="middle" fill="#111827" fontSize={15} fontWeight="bold">{lines[0]}</text>
            <text x={cx} y={749} textAnchor="middle" fill="#111827" fontSize={13} fontWeight="bold">{lines[1]}</text>
            <rect x={x + 6} y={674} width={5} height={92} rx={2.5} fill="#ffffff" opacity={0.45} />
        </g>
    );
};

// Magnified view of one tube, with its number and saline strength
const MAG = { cx: 846, cy: 128, r: 96, scale: 1.6, focusY: 518 };
const Magnifier = ({ i, look }: { i: number; look: TubeLook }) => {
    const x = tubeX(i);
    const { cx, cy, r, scale, focusY } = MAG;
    return (
        <g pointerEvents="none">
            <line x1={cx - r * 0.72} y1={cy + r * 0.72} x2={x} y2={TUBE_TOP - 8} stroke="#475569" strokeWidth={2} strokeDasharray="6 5" />
            <defs><clipPath id="of-mag"><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
            <g clipPath="url(#of-mag)">
                <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#ffffff" />
                <g transform={`translate(${cx - scale * x} ${cy - scale * focusY}) scale(${scale})`}>
                    <TubeView i={i} look={look} id="of-mag-tube" />
                </g>
            </g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={6} />
            <line x1={cx + r * 0.72} y1={cy - r * 0.72} x2={cx + r * 0.72 + 30} y2={cy - r * 0.72 - 30} stroke="#334155" strokeWidth={12} strokeLinecap="round" />
            <text x={cx - r - 18} y={cy - 6} textAnchor="end" fill="#1e293b" fontSize={26} fontWeight="bold">Tube {TUBES[i].no}</text>
            <text x={cx - r - 18} y={cy + 24} textAnchor="end" fill="#475569" fontSize={21}>{TUBES[i].pct === 0 ? 'Distilled water' : `${pctText(TUBES[i].pct)}% NaCl`}</text>
        </g>
    );
};

// --- Main Component ---
export const OsmoticFragility: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [sampleId, setSampleId] = useState('normal');
    const [unknownIndex, setUnknownIndex] = useState(randomSampleIndex);
    const [phase, setPhase] = useState<Phase>('empty');
    const [phaseStart, setPhaseStart] = useState(0);
    const [now, setNow] = useState(() => performance.now());
    const [selected, setSelected] = useState<number | null>(null);
    const [begins, setBegins] = useState('');
    const [complete, setComplete] = useState('');
    const [fragility, setFragility] = useState<Fragility | ''>('');
    const [checked, setChecked] = useState(false);
    const [blend, setBlend] = useState<{ from: number[]; start: number; end: number } | null>(null);
    const { label: hoverLabel, hover } = useHoverLabel();

    const isUnknown = sampleId === 'unknown';
    const sample = isUnknown ? SAMPLES[unknownIndex] : SAMPLES.find(s => s.id === sampleId)!;
    const t = (now - phaseStart) / 1000;

    // Animation clock
    const animating = phase === 'nacl' || phase === 'water' || phase === 'blood' || phase === 'waiting' || (blend !== null && now < blend.end);
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
        if (phase === 'nacl' && t >= NACL_DURATION) setPhase('nacl-done');
        else if (phase === 'water' && t >= WATER_DURATION) setPhase('ready');
        else if (phase === 'blood' && t >= BLOOD_DURATION) startPhase('waiting');
        else if (phase === 'waiting' && t >= WAIT_SECONDS) setPhase('done');
    }, [phase, t]);

    const clearAnswers = () => {
        setBegins('');
        setComplete('');
        setFragility('');
        setChecked(false);
    };

    // The sample can be changed at any time; the answers start afresh
    const handleSampleChange = (id: string) => {
        const start = performance.now();
        const end = phase === 'waiting' ? Math.max(phaseStart + WAIT_SECONDS * 1000, start + 1500) : start + 1500;
        setBlend({ from: shownH, start, end });
        setNow(start);
        setSampleId(id);
        if (id === 'unknown') setUnknownIndex(randomSampleIndex());
        clearAnswers();
    };

    const handleReset = () => {
        setPhase('empty');
        setPhaseStart(0);
        setSelected(null);
        setBlend(null);
        clearAnswers();
        if (isUnknown) setUnknownIndex(randomSampleIndex());
    };

    // What the student should find
    const h = TUBES.map(tube => hemolysed(sample, tube.pct));
    const beginsIndex = h.findIndex(v => v > 0);
    const completeIndex = h.findIndex(v => v >= 1 - 1e-9);
    // After a change of sample the picture moves on smoothly: during the wait it blends into the new sample's
    // course by the end of the wait; otherwise over 1.5 s.
    const blendK = blend ? clamp01((now - blend.start) / (blend.end - blend.start)) : 1;
    const shownH = blend ? h.map((v, i) => lerp(blend.from[i], v, blendK)) : h;
    const beginsOk = begins !== '' && Number(begins) === beginsIndex;
    const completeOk = complete !== '' && Number(complete) === completeIndex;
    const fragilityOk = fragility === sample.fragility;

    // --- Scene for the current moment ---
    const looks: TubeLook[] = TUBES.map(() => ({ ...EMPTY_LOOK }));
    let naclDropper = NACL_REST;
    let waterDropper = WATER_REST;
    let bloodDropper = BLOOD_REST;
    let bloodSwell = 0;
    const falling: { x: number; y: number; color: string }[] = [];
    let counter: { x: number; n: number } | null = null;
    let clockMinutes = 0;
    let caption = '';

    // Drops counted into each tube as the dropper tours them; returns the count to show beside the dropper
    const dispense = (stops: number[], count: (i: number) => number, base: (i: number) => number) => {
        let shown: { x: number; n: number } | null = null;
        for (let k = 0; k < stops.length; k++) {
            const i = stops[k];
            const p = clamp01((t - arrive(k, DISPENSE)) / DISPENSE);
            const n = count(i);
            looks[i].drops = base(i) + n * p;
            if (p > 0 && p < 1) falling.push({ x: tubeX(i), y: lerp(TUBE_TOP, levelY(looks[i].drops), (p * n) % 1), color: DROP_COLOR });
            if (t >= arrive(k, DISPENSE) && t < arrive(k, DISPENSE) + DISPENSE + MOVE) shown = { x: tubeX(i), n: Math.round(n * p) };
        }
        return shown;
    };

    if (phase === 'empty') {
        caption = 'Step 1: The tubes are numbered 1 to 12. Add 1% NaCl to each, as written under the rack';
    } else if (phase === 'nacl') {
        caption = 'Adding 1% NaCl: 22 drops to tube 1, then 16 down to 7 drops, none to tube 12';
        naclDropper = tourPos(t, NACL_STOPS.map(above), NACL_REST, DISPENSE);
        counter = dispense(NACL_STOPS, i => TUBES[i].nacl, () => 0);
    } else if (phase === 'nacl-done') {
        caption = 'Now add distilled water to make 25 drops in every tube';
        TUBES.forEach((tube, i) => { looks[i].drops = tube.nacl; });
    } else if (phase === 'water') {
        caption = 'Adding distilled water: 3 drops to tube 1, up to 25 drops to tube 12';
        TUBES.forEach((tube, i) => { looks[i].drops = tube.nacl; });
        waterDropper = tourPos(t, ALL_STOPS.map(above), WATER_REST, DISPENSE);
        counter = dispense(ALL_STOPS, i => TUBES[i].water, i => TUBES[i].nacl);
    } else if (phase === 'ready') {
        caption = 'Saline from 0.88% (tube 1) to 0% (tube 12). Choose the blood sample and add one drop to each tube';
        looks.forEach(l => { l.drops = 25; });
    } else if (phase === 'blood') {
        const mix = ease((t - BLOOD_TOUR) / INVERT);
        caption = t < BLOOD_TOUR ? 'Adding one drop of blood to each tube' : 'Inverting each tube gently once to mix. Do not shake';
        bloodDropper = tourPos(t, ALL_STOPS.map(above), BLOOD_REST, BLOOD_DWELL);
        looks.forEach((l, i) => {
            const release = arrive(i, BLOOD_DWELL) + SWELL;
            const landed = release + DROP_FALL;
            l.drops = 25;
            l.turbid = mix;
            if (t >= landed) {
                l.blood = true;
                l.cloud = ease((t - landed) / 0.6) * (1 - mix);
            } else if (t >= release) {
                falling.push({ x: tubeX(i), y: lerp(TUBE_TOP, levelY(25), ((t - release) / DROP_FALL) ** 2), color: BLOOD });
            } else if (t >= release - SWELL) {
                bloodSwell = (t - (release - SWELL)) / SWELL;
            }
        });
    } else {
        const w = phase === 'waiting' ? clamp01(t / WAIT_SECONDS) : 1;
        clockMinutes = 60 * w;
        caption = phase === 'waiting'
            ? 'Leave the tubes undisturbed for 1 hour'
            : 'Observe the tubes against the white paper, without shaking. Tap a tube to look closely';
        looks.forEach((l, i) => {
            l.drops = 25;
            l.blood = true;
            l.turbid = 1;
            l.lysis = shownH[i] * lysisCurve(w);
            l.settle = settleCurve(w);
        });
    }

    const naclAtRest = naclDropper === NACL_REST;
    const waterAtRest = waterDropper === WATER_REST;
    const bloodAtRest = bloodDropper === BLOOD_REST;
    const canInspect = phase === 'waiting' || phase === 'done';
    const step = phase === 'empty' || phase === 'nacl' || phase === 'nacl-done' || phase === 'water' ? 1
        : phase === 'ready' || phase === 'blood' ? 2 : phase === 'waiting' ? 3 : 4;
    const rangeText = (i: number) => (TUBES[i].pct === 0 ? 'distilled water' : `${pctText(TUBES[i].pct)}% NaCl`);

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Osmotic Fragility of RBCs</h1>
                        <p className="text-slate-400 text-xs">Hemolysis in decreasing strengths of saline</p>
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
                            <WhitePaper />
                            <RackBack />
                            {selected !== null && canInspect && (
                                <rect x={tubeX(selected) - 27} y={TUBE_TOP - 14} width={54} height={TUBE_BOTTOM - TUBE_TOP + 24} rx={12} fill="#6366f1" opacity={0.18} />
                            )}
                            {TUBES.map((tube, i) => <TubeView key={tube.no} i={i} look={looks[i]} id={`of-tube-${i}`} />)}
                            <RackFront />

                            {/* Reagents: droppers resting in their bottles are drawn behind the glass */}
                            {naclAtRest && <Dropper x={NACL_REST.x} y={NACL_REST.y} liquid={DROP_COLOR} swell={0} dropColor={DROP_COLOR} />}
                            <Bottle cx={NACL_REST.x} liquid="rgba(186,230,253,0.5)" lines={['1%', 'NaCl']} />
                            {waterAtRest && <Dropper x={WATER_REST.x} y={WATER_REST.y} liquid={DROP_COLOR} swell={0} dropColor={DROP_COLOR} />}
                            <Bottle cx={WATER_REST.x} liquid="rgba(186,230,253,0.5)" lines={['Distilled', 'water']} />
                            {bloodAtRest && <Dropper x={BLOOD_REST.x} y={BLOOD_REST.y} liquid={BLOOD} swell={0} dropColor={BLOOD} />}
                            <Bottle cx={BLOOD_REST.x} liquid="rgba(153,27,27,0.85)" lines={['Blood', '(heparin)']} />

                            {!naclAtRest && <Dropper x={naclDropper.x} y={naclDropper.y} liquid={DROP_COLOR} swell={0} dropColor={DROP_COLOR} />}
                            {!waterAtRest && <Dropper x={waterDropper.x} y={waterDropper.y} liquid={DROP_COLOR} swell={0} dropColor={DROP_COLOR} />}
                            {!bloodAtRest && <Dropper x={bloodDropper.x} y={bloodDropper.y} liquid={BLOOD} swell={bloodSwell} dropColor={BLOOD} />}
                            {falling.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={4.5} fill={d.color} stroke="#8a9bb0" strokeWidth={0.6} />)}
                            {counter !== null && (
                                <text x={counter.x + 14} y={TUBE_TOP - 46} fill="#1e3a8a" fontSize={20} fontWeight="bold">{counter.n} drops</text>
                            )}

                            {/* Part names on hover; tap a tube to look at it closely */}
                            <HoverZone x={38} y={38} w={116} h={116} {...hover('Wall clock')} />
                            <HoverZone x={44} y={236} w={912} h={150} {...hover('White paper: the colour of the saline is judged against it')} />
                            <HoverZone x={30} y={RACK_TOP - 12} w={940} h={44} {...hover('Test tube rack')} />
                            <HoverZone x={30} y={TUBE_BOTTOM - 6} w={940} h={34} {...hover('Test tube rack: % NaCl in each tube')} />
                            <HoverZone x={44} y={TUBE_BOTTOM + 30} w={540} h={96} {...hover('Drops of 1% NaCl + distilled water in each tube')} />
                            {TUBES.map((tube, i) => (
                                <HoverZone key={tube.no} x={tubeX(i) - 24} y={TUBE_TOP - 8} w={48} h={RACK_TOP - TUBE_TOP + 8} {...hover(`Test tube ${tube.no}: ${tube.pct === 0 ? 'distilled water' : `${pctText(tube.pct)}% NaCl`}`)}
                                    style={{ cursor: canInspect ? 'pointer' : 'default' }} onClick={canInspect ? () => setSelected(i) : undefined} />
                            ))}
                            {TUBES.map((tube, i) => (
                                <HoverZone key={tube.no} x={tubeX(i) - 24} y={RACK_TOP + 26} w={48} h={TUBE_BOTTOM - RACK_TOP - 32} {...hover(`Test tube ${tube.no}: ${tube.pct === 0 ? 'distilled water' : `${pctText(tube.pct)}% NaCl`}`)}
                                    style={{ cursor: canInspect ? 'pointer' : 'default' }} onClick={canInspect ? () => setSelected(i) : undefined} />
                            ))}
                            <HoverZone x={NACL_REST.x - 40} y={630} w={80} h={152} {...hover('1% NaCl solution, with its dropper')} />
                            <HoverZone x={WATER_REST.x - 40} y={630} w={80} h={152} {...hover('Distilled water, with its dropper')} />
                            <HoverZone x={BLOOD_REST.x - 40} y={630} w={80} h={152} {...hover('Venous blood with heparin (anticoagulant), with a dropper')} />
                            {!naclAtRest && <HoverZone x={naclDropper.x - 10} y={naclDropper.y - 110} w={20} h={110} {...hover('Dropper: 1% NaCl')} />}
                            {!waterAtRest && <HoverZone x={waterDropper.x - 10} y={waterDropper.y - 110} w={20} h={110} {...hover('Dropper: distilled water')} />}
                            {!bloodAtRest && <HoverZone x={bloodDropper.x - 10} y={bloodDropper.y - 110} w={20} h={110} {...hover('Dropper: blood')} />}
                            {selected !== null && canInspect && <Magnifier i={selected} look={looks[selected]} />}
                        </svg>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-4 lg:p-6 space-y-4 lg:overflow-y-auto">
                    {/* Steps */}
                    <div className="flex gap-2 text-xs font-bold uppercase">
                        {['Saline', 'Blood', 'Wait 1 h', 'Result'].map((s, i) => (
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

                    {/* Saline series */}
                    {(phase === 'empty' || phase === 'nacl') && (
                        <div className="flex gap-3">
                            <button onClick={() => startPhase('nacl')} disabled={phase === 'nacl'}
                                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <FlaskConical className="w-5 h-5" /> {phase === 'nacl' ? 'Adding 1% NaCl…' : 'Add 1% NaCl'}
                            </button>
                            {phase === 'nacl' && (
                                <button onClick={() => setPhase('nacl-done')}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                    Skip
                                </button>
                            )}
                        </div>
                    )}
                    {(phase === 'nacl-done' || phase === 'water') && (
                        <div className="flex gap-3">
                            <button onClick={() => startPhase('water')} disabled={phase === 'water'}
                                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <Droplet className="w-5 h-5" /> {phase === 'water' ? 'Adding distilled water…' : 'Add distilled water'}
                            </button>
                            {phase === 'water' && (
                                <button onClick={() => setPhase('ready')}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                    Skip
                                </button>
                            )}
                        </div>
                    )}

                    {/* Blood */}
                    {phase === 'ready' && (
                        <button onClick={() => startPhase('blood')}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            <Pipette className="w-5 h-5" /> Add 1 drop of blood to each tube
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
                                Standing undisturbed: <span className="font-mono text-amber-300">{Math.floor(clockMinutes)} of 60 min</span>
                            </div>
                            <button onClick={() => setPhase('done')}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg text-sm border border-slate-600">
                                Skip
                            </button>
                        </div>
                    )}
                    {canInspect && (
                        <p className="text-xs text-slate-400 flex items-center gap-2"><Search className="w-4 h-4 text-sky-400 shrink-0" /> Tap a tube to see it magnified.</p>
                    )}

                    {/* Observation and result */}
                    {phase === 'done' && (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-3">
                            <div className="text-xs font-bold text-slate-400 uppercase">Your observation</div>
                            {([['Hemolysis begins in', begins, setBegins, beginsOk], ['Hemolysis is complete in', complete, setComplete, completeOk]] as const).map(([label, value, set, ok]) => (
                                <div key={label} className="space-y-1">
                                    <div className="text-sm text-slate-300 flex items-center gap-2">
                                        {label}
                                        {checked && (ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
                                    </div>
                                    <select value={value} onChange={(e) => { set(e.target.value); setChecked(false); }}
                                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2 outline-none focus:border-indigo-500">
                                        <option value="">Select a tube…</option>
                                        {TUBES.map((tube, i) => <option key={tube.no} value={i}>{tubeName(i)}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div className="space-y-1">
                                <div className="text-sm text-slate-300 flex items-center gap-2">
                                    Osmotic fragility is
                                    {checked && (fragilityOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />)}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['normal', 'increased', 'decreased'] as Fragility[]).map(f => (
                                        <button key={f} onClick={() => { setFragility(f); setChecked(false); }}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-colors ${fragility === f ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                                            {FRAGILITY_LABELS[f]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setChecked(true)} disabled={begins === '' || complete === '' || fragility === ''}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 rounded-lg text-sm">
                                Check
                            </button>
                            {checked && (
                                beginsOk && completeOk && fragilityOk ? (
                                    <div className="text-sm space-y-1.5">
                                        <p className="text-emerald-400 font-bold flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                            Hemolysis begins in {rangeText(beginsIndex)} and is complete in {rangeText(completeIndex)}: {FRAGILITY_LABELS[sample.fragility].toLowerCase()} fragility.
                                        </p>
                                        <p className="text-slate-300">Normal: begins at 0.45 to 0.50% and is complete at 0.30 to 0.33% NaCl.</p>
                                        <p className="text-slate-400 text-xs">
                                            <span className="text-slate-200 font-semibold">{isUnknown ? `The unknown sample was: ${sample.label}.` : `${sample.label}:`}</span> {sample.note}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-400 flex items-start gap-2">
                                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        Look again. Hemolysis begins in the first tube whose saline is tinged pink; it is complete in the first tube that is uniformly red with no red cells at the bottom.
                                    </p>
                                )
                            )}
                        </div>
                    )}

                    <button onClick={handleReset}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                </div>
            </main>
        </div>
    );
};
