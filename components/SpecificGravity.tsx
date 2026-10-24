import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Droplet, FlaskConical, RefreshCw, Pipette, CheckCircle2, XCircle, TestTubes, Timer, ListChecks } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

type HoverProps = { onPointerEnter?: () => void; onPointerLeave?: () => void };

// --- Types & Constants ---

type Mode = 'blood' | 'donor';

interface Sample {
    id: string;
    label: string;
    sg: number;
    note: string;
}

interface DropState {
    t0: number;       // performance.now() when the drop leaves the pipette
    sg: number;       // specific gravity of the drop
}

// Philips & Van Slyke working solutions: stock CuSO₄ (SG 1.100) + distilled water = 10 mL
const TUBES = Array.from({ length: 10 }, (_, i) => {
    const stock = Math.round((4.9 + i * 0.2) * 10) / 10;
    return {
        no: i + 1,
        stock,
        water: Math.round((10 - stock) * 10) / 10,
        sg: Math.round((1.050 + i * 0.002) * 1000) / 1000,
    };
});

const DONOR_SOLUTION_SG = 1.053; // 52 mL stock + 48 mL distilled water
const DONOR_HB_CUTOFF = 12.5;    // g/dL

// SG of blood ↔ Hb concentration (CuSO₄ falling drop method)
const SG_HB_TABLE: [number, number][] = [
    [1.050, 8.5], [1.052, 10.5], [1.055, 12.5], [1.058, 13.5], [1.060, 14.5], [1.062, 15.5], [1.065, 17.0],
];

// Linear interpolation, extrapolating from the end segments outside the table
function hbFromSg(sg: number) {
    let i = SG_HB_TABLE.findIndex(([s]) => s >= sg);
    if (i <= 0) i = i === 0 ? 1 : SG_HB_TABLE.length - 1;
    const [[s1, h1], [s2, h2]] = [SG_HB_TABLE[i - 1], SG_HB_TABLE[i]];
    return Math.round((h1 + ((sg - s1) / (s2 - s1)) * (h2 - h1)) * 10) / 10;
}

const SAMPLES: Sample[] = [
    { id: 'male', label: 'Healthy adult male', sg: 1.058, note: 'Within the normal range (1.048–1.066). Males have a higher SG than females because of a higher RBC count and Hb.' },
    { id: 'female', label: 'Healthy adult female', sg: 1.054, note: 'Within the normal range (1.048–1.066). SG is lower in females because of a lower RBC count and Hb.' },
    { id: 'anaemia', label: 'Anaemia', sg: 1.050, note: 'Low SG: fewer red cells and less haemoglobin lower the density of blood.' },
    { id: 'pregnancy', label: 'Pregnancy', sg: 1.052, note: 'Low SG: haemodilution, as plasma volume rises more than red cell mass.' },
    { id: 'dehydration', label: 'Dehydration (vomiting / diarrhoea)', sg: 1.064, note: 'High SG: loss of water causes haemoconcentration.' },
    { id: 'polycythaemia', label: 'Polycythaemia (high altitude)', sg: 1.068, note: 'High SG: increased RBC count and Hb. Seen at high altitude, in newborns and in polycythaemia vera.' },
];

const DONORS = [
    { id: 'd1', label: 'Donor 1', hb: 14.2 },
    { id: 'd2', label: 'Donor 2', hb: 11.0 },
    { id: 'd3', label: 'Donor 3', hb: 13.1 },
    { id: 'd4', label: 'Donor 4', hb: 9.8 },
    { id: 'd5', label: 'Donor 5', hb: 12.9 },
];

// --- Drop physics ---
// Depth (cm below the surface) of a drop t seconds after it leaves the pipette.
// 1. Falls ~1 cm through air.  2. Breaks the surface and travels ~2.5 cm on its momentum, losing it in 3–4 s.
// 3. Then rises or sinks according to the SG difference. The copper proteinate sac keeps its SG
//    constant for 15–20 s; after that the drop gets heavier and settles as a precipitate.
const FALL_TIME = 0.25;       // s through 1 cm of air
const MOMENTUM_DEPTH = 2.5;   // cm
const MOMENTUM_TAU = 1.0;     // s
const DRIFT_RATE = 250;       // cm/s per unit SG difference
const STABLE_TIME = 20;       // s the copper proteinate layer stays stable
const MAX_DEPTH = 8.2;        // cm of liquid in the tube

function dropDepth(t: number, dropSg: number, solutionSg: number): number {
    if (t < FALL_TIME) return -1 + t / FALL_TIME; // above the surface (negative depth)
    const ts = t - FALL_TIME;
    const momentum = MOMENTUM_DEPTH * (1 - Math.exp(-ts / MOMENTUM_TAU));
    const drift = DRIFT_RATE * (dropSg - solutionSg) * (ts - MOMENTUM_TAU * (1 - Math.exp(-ts / MOMENTUM_TAU)));
    const precipitate = ts > STABLE_TIME ? 0.08 * (ts - STABLE_TIME) ** 2 : 0;
    const wobble = Math.abs(dropSg - solutionSg) < 1e-6 ? 0.06 * Math.sin(ts * 1.7) : 0;
    return Math.max(0, Math.min(MAX_DEPTH, momentum + drift + precipitate + wobble));
}

type Behaviour = 'sinks' | 'floats' | 'suspended';
const behaviourOf = (dropSg: number, solutionSg: number): Behaviour =>
    dropSg > solutionSg + 1e-6 ? 'sinks' : dropSg < solutionSg - 1e-6 ? 'floats' : 'suspended';

const solutionColor = (stockMl: number, totalMl: number) => {
    const fraction = stockMl / totalMl; // 0.49–0.67
    const lightness = 88 - (fraction - 0.45) * 110;
    return `hsl(200, 85%, ${lightness}%)`;
};

// --- Solution preparation ---
// Each tube has its own syringe. The syringes set off one after another: each travels to the stock
// CuSO₄ bottle, draws up its volume, returns and dispenses into its tube; then the same with distilled
// water, which floats on top as a lighter layer (CuSO₄ is denser) until the layers even out.
const STOCK_COLOR = 'hsl(205, 90%, 36%)';
const WATER_COLOR = 'rgba(186, 230, 253, 0.6)';
const STAGGER = 0.15;     // s between successive syringes setting off
const TRAVEL = 0.8;       // s for one leg (tube → bottle or bottle → tube)
const DRAW = 0.5;         // s to draw up
const DISPENSE = 0.7;     // s to dispense
const BLEND_TIME = 0.6;   // s for the layers to even out
const ARC_HEIGHT = 60;    // px the syringes lift while travelling

const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

const cycleLength = (count: number) => 2 * TRAVEL + DRAW + DISPENSE + (count - 1) * STAGGER;
const prepareDuration = (count: number) => 2 * cycleLength(count) + BLEND_TIME;

// State of syringe `index` (of `count`) at time t seconds into the preparation.
// Syringes leave in tube order 1 → n for both stock CuSO₄ and distilled water.
function syringeFrame(t: number, index: number, count: number, stockMl: number, waterMl: number) {
    const cycle = cycleLength(count);
    const leg = (c: 0 | 1, ml: number) => {
        const local = t - c * cycle - index * STAGGER;
        const go = easeInOut(clamp01(local / TRAVEL));
        const drawn = easeInOut(clamp01((local - TRAVEL) / DRAW));
        const back = easeInOut(clamp01((local - TRAVEL - DRAW) / TRAVEL));
        const fill = easeInOut(clamp01((local - 2 * TRAVEL - DRAW) / DISPENSE));
        return { travel: go * (1 - back), volume: ml * (drawn - fill), drawn, fill, dispensing: fill > 0 && fill < 1 };
    };
    const stock = leg(0, stockMl);
    const water = leg(1, waterMl);
    const current = t >= cycle ? water : stock;
    return {
        travel: current.travel,
        volume: current.volume,
        isWater: t >= cycle,
        dispensing: current.dispensing,
        stockFill: stock.fill,
        waterFill: water.fill,
        stockDrawn: stock.drawn,
        waterDrawn: water.drawn,
    };
}

const blendAt = (t: number, count: number) => easeInOut(clamp01((t - 2 * cycleLength(count)) / BLEND_TIME));

// Liquid levels as fractions of the full (10 mL) column
interface TubeLevel { stock: number; total: number; blend: number }

function tubeLevel(t: number, index: number, count: number, stockFraction: number): TubeLevel {
    const f = syringeFrame(t, index, count, 0, 0);
    const stock = stockFraction * f.stockFill;
    return { stock, total: stock + (1 - stockFraction) * f.waterFill, blend: blendAt(t, count) };
}

// --- SVG: test tube with solution and drop ---

const PX_PER_CM = 36;

const TestTube = ({
    x, tubeTop, fullTop, liquidBottom, level, finalColor, label, sublabel, number, drop, solutionSg, now, selected, onClick, width = 46, hoverProps,
}: {
    x: number;
    tubeTop: number;
    fullTop: number;
    liquidBottom: number;
    level: TubeLevel;
    finalColor: string;
    label: string;
    sublabel?: string;
    number?: number;
    drop: DropState | null;
    solutionSg: number;
    now: number;
    selected: boolean;
    onClick?: () => void;
    width?: number;
    hoverProps?: HoverProps;
}) => {
    const r = width / 2;
    const tubePath = `M ${x - r} ${tubeTop} L ${x - r} ${liquidBottom - r} A ${r} ${r} 0 0 0 ${x + r} ${liquidBottom - r} L ${x + r} ${tubeTop}`;
    const interiorPath = `M ${x - r + 3} ${tubeTop} L ${x - r + 3} ${liquidBottom - r} A ${r - 3} ${r - 3} 0 0 0 ${x + r - 3} ${liquidBottom - r} L ${x + r - 3} ${tubeTop} Z`;
    const clipId = `tube-interior-${Math.round(x)}`;
    const columnHeight = liquidBottom - fullTop;
    const stockTop = liquidBottom - columnHeight * level.stock;
    const liquidTop = liquidBottom - columnHeight * level.total;
    const hasLiquid = level.total > 0.001;

    let dropEl: React.ReactNode = null;
    let elapsed = 0;
    if (drop) {
        const t = (now - drop.t0) / 1000;
        elapsed = Math.max(0, t - FALL_TIME);
        const depth = dropDepth(t, drop.sg, solutionSg);
        const y = depth < 0 ? liquidTop + depth * PX_PER_CM : liquidTop + 6 + depth * (liquidBottom - liquidTop - 16) / MAX_DEPTH;
        const atSurface = depth >= 0 && depth < 0.05;
        const atBottom = depth >= MAX_DEPTH - 0.01;
        dropEl = (
            <ellipse cx={x} cy={y} rx={atSurface || atBottom ? 9 : 7} ry={atSurface || atBottom ? 4.5 : 7.5}
                fill={depth < 0 ? '#dc2626' : '#7f1d1d'} stroke="#450a0a" strokeWidth={1.5} />
        );
    }

    const inWindow = drop && elapsed >= 15 && elapsed <= STABLE_TIME;

    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }} {...hoverProps}>
            {/* Invisible hit area so the empty part of the tube is clickable too */}
            <rect x={x - r - 6} y={tubeTop - 30} width={width + 12} height={liquidBottom - tubeTop + 80} fill="transparent" />
            {selected && <rect x={x - r - 10} y={tubeTop - 8} width={width + 20} height={liquidBottom - tubeTop + 16} rx={14} fill="#6366f1" opacity={0.15} />}
            <defs><clipPath id={clipId}><path d={interiorPath} /></clipPath></defs>
            {hasLiquid && (
                <g clipPath={`url(#${clipId})`} opacity={0.85}>
                    {level.blend < 1 && (
                        <g opacity={1 - level.blend}>
                            <rect x={x - r} y={stockTop} width={width} height={liquidBottom - stockTop + 2} fill={STOCK_COLOR} />
                            {liquidTop < stockTop && <rect x={x - r} y={liquidTop} width={width} height={stockTop - liquidTop} fill={WATER_COLOR} />}
                        </g>
                    )}
                    {level.blend > 0 && <rect x={x - r} y={liquidTop} width={width} height={liquidBottom - liquidTop + 2} fill={finalColor} opacity={level.blend} />}
                </g>
            )}
            {hasLiquid && <line x1={x - r + 3} y1={liquidTop} x2={x + r - 3} y2={liquidTop} stroke="#0369a1" strokeWidth={1.5} opacity={0.6} />}
            {dropEl}
            <path d={tubePath} fill="none" stroke="#cbd5e1" strokeWidth={2.5} />
            <line x1={x - r + 7} y1={tubeTop + 10} x2={x - r + 7} y2={liquidBottom - r} stroke="#ffffff" strokeWidth={2} opacity={0.25} />
            <ellipse cx={x} cy={tubeTop} rx={r} ry={4} fill="none" stroke="#cbd5e1" strokeWidth={2} />
            <text x={x} y={liquidBottom + 56} textAnchor="middle" fill="#e2e8f0" fontSize={23} fontFamily="monospace" fontWeight="bold">{label}</text>
            {/* "Tube N" label on the bottom bar of the rack, clear of the dropper and syringes */}
            {number !== undefined && (
                <text x={x} y={liquidBottom + 28} textAnchor="middle" fill="#fde68a" fontSize={22} fontWeight="bold">Tube {number}</text>
            )}
            {sublabel && <text x={x} y={liquidBottom + 82} textAnchor="middle" fill="#94a3b8" fontSize={19} fontFamily="monospace">{sublabel}</text>}
            {/* Timer only while the drop is being watched; hidden once it has settled */}
            {drop && elapsed > 0 && elapsed <= STABLE_TIME + 15 && (
                <text x={x} y={tubeTop - 14} textAnchor="middle" fontSize={20} fontFamily="monospace" fontWeight="bold"
                    fill={inWindow ? '#4ade80' : elapsed > STABLE_TIME ? '#64748b' : '#fbbf24'}>
                    {elapsed.toFixed(0)}s
                </text>
            )}
        </g>
    );
};

const ReagentBottle = ({ x, y, label, sublabel, liquidColor, level, active, labelSide }: {
    x: number; y: number; label: string; sublabel: string; liquidColor: string; level: number; active: boolean; labelSide: 'left' | 'right';
}) => {
    const w = 64, h = 70, neckW = 26;
    const clipId = `bottle-${Math.round(x)}`;
    const body = `M ${x} ${y + 18} Q ${x} ${y + 12} ${x + 6} ${y + 12} L ${x + (w - neckW) / 2} ${y + 12} L ${x + (w - neckW) / 2} ${y} L ${x + (w + neckW) / 2} ${y} L ${x + (w + neckW) / 2} ${y + 12} L ${x + w - 6} ${y + 12} Q ${x + w} ${y + 12} ${x + w} ${y + 18} L ${x + w} ${y + h - 6} Q ${x + w} ${y + h} ${x + w - 6} ${y + h} L ${x + 6} ${y + h} Q ${x} ${y + h} ${x} ${y + h - 6} Z`;
    const liquidTop = y + h - (h - 16) * level;
    const textX = labelSide === 'right' ? x + w + 12 : x - 12;
    const anchor = labelSide === 'right' ? 'start' : 'end';
    return (
        <g pointerEvents="none">
            <defs><clipPath id={clipId}><path d={body} /></clipPath></defs>
            <rect x={x} y={liquidTop} width={w} height={y + h - liquidTop} fill={liquidColor} clipPath={`url(#${clipId})`} />
            <path d={body} fill="none" stroke={active ? '#fbbf24' : '#cbd5e1'} strokeWidth={active ? 3 : 2} />
            <rect x={x + (w - neckW) / 2 - 2} y={y - 8} width={neckW + 4} height={9} rx={2} fill="#334155" />
            <text x={textX} y={y + 30} textAnchor={anchor} fill="#e2e8f0" fontSize={18} fontWeight="bold">{label}</text>
            <text x={textX} y={y + 52} textAnchor={anchor} fill="#94a3b8" fontSize={16} fontFamily="monospace">{sublabel}</text>
        </g>
    );
};

// Graduated syringe: needle tip at (x, tipY), plunger drawn back to the contained volume
const Syringe = ({ x, tipY, volume, capacity, barrelLength, barrelWidth, liquidColor, streamToY, opacity, lift }: {
    x: number; tipY: number; volume: number; capacity: number; barrelLength: number; barrelWidth: number;
    liquidColor: string; streamToY: number | null; opacity: number; lift: number;
}) => {
    const needleLength = 26;
    const hubY = tipY - needleLength;
    const barrelTop = hubY - 6 - barrelLength;
    const barrelBottom = hubY - 6;
    const pxPerMl = barrelLength / capacity;
    const stopperY = barrelBottom - volume * pxPerMl;
    const rodTop = barrelTop - volume * pxPerMl - 4;
    const half = barrelWidth / 2;
    const tickStep = capacity >= 50 ? 10 : 2;
    return (
        <g opacity={opacity} transform={`translate(0 ${-lift})`} pointerEvents="none">
            {streamToY !== null && (
                <line x1={x} y1={tipY} x2={x} y2={streamToY} stroke={liquidColor} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
            )}
            {/* Needle & hub */}
            <line x1={x} y1={hubY} x2={x} y2={tipY} stroke="#cbd5e1" strokeWidth={2} />
            <path d={`M ${x - 5} ${barrelBottom} L ${x + 5} ${barrelBottom} L ${x + 3} ${hubY} L ${x - 3} ${hubY} Z`} fill="#94a3b8" />
            {/* Liquid in barrel */}
            {volume > 0.01 && <rect x={x - half + 2} y={stopperY} width={barrelWidth - 4} height={barrelBottom - stopperY} fill={liquidColor} />}
            {/* Plunger rod, stopper and thumb rest */}
            <rect x={x - 2.5} y={rodTop} width={5} height={stopperY - rodTop} fill="#e2e8f0" />
            <rect x={x - half + 2} y={stopperY - 5} width={barrelWidth - 4} height={5} fill="#1e293b" />
            <rect x={x - half - 1} y={rodTop - 4} width={barrelWidth + 2} height={4} rx={1.5} fill="#e2e8f0" />
            {/* Barrel with graduations and finger flange */}
            <rect x={x - half} y={barrelTop} width={barrelWidth} height={barrelLength + 6} rx={2} fill="rgba(255,255,255,0.06)" stroke="#cbd5e1" strokeWidth={1.5} />
            {Array.from({ length: Math.floor(capacity / tickStep) + 1 }, (_, i) => (
                <line key={i} x1={x - half} y1={barrelBottom - i * tickStep * pxPerMl} x2={x - half + (i % 2 === 0 ? 7 : 4)} y2={barrelBottom - i * tickStep * pxPerMl} stroke="#94a3b8" strokeWidth={1} />
            ))}
            <rect x={x - half - 6} y={barrelTop - 3} width={barrelWidth + 12} height={4} rx={1.5} fill="#cbd5e1" />
        </g>
    );
};

const PipetteIcon = ({ x, tipY, squeezing, onClick, hoverProps }: { x: number; tipY: number; squeezing: boolean; onClick: () => void; hoverProps?: HoverProps }) => (
    <g transform={`translate(${x} ${tipY})`} onClick={onClick} style={{ cursor: 'pointer' }} {...hoverProps}>
        <rect x={-16} y={-138} width={32} height={140} fill="transparent" />
        <rect x={-4} y={-110} width={8} height={95} fill="#e2e8f0" opacity={0.9} rx={2} />
        <rect x={-3} y={-60} width={6} height={45} fill="#b91c1c" opacity={0.85} />
        <path d="M -4 -15 L -1.5 0 L 1.5 0 L 4 -15 Z" fill="#e2e8f0" />
        <ellipse cx={0} cy={-122} rx={squeezing ? 11 : 9} ry={squeezing ? 9 : 13} fill="#f97316" />
    </g>
);

// --- Main Component ---
export const SpecificGravity: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [mode, setMode] = useState<Mode>('blood');
    const [prepared, setPrepared] = useState(false);
    const [prepareStart, setPrepareStart] = useState<number | null>(null);
    const [sampleId, setSampleId] = useState<string>('male');
    const [unknownSg, setUnknownSg] = useState(() => TUBES[Math.floor(Math.random() * TUBES.length)].sg);
    const [drops, setDrops] = useState<(DropState | null)[]>(() => TUBES.map(() => null));
    const [selectedTube, setSelectedTube] = useState(4);
    const [answer, setAnswer] = useState<string>('');
    const [checked, setChecked] = useState<null | boolean>(null);
    const [now, setNow] = useState(() => performance.now());
    const [squeezeUntil, setSqueezeUntil] = useState(0);
    const [quizOpen, setQuizOpen] = useState(false);
    const { label: hoverLabel, hover } = useHoverLabel();
    const questionSet = questionSetFor('specific-gravity');

    const [donorId, setDonorId] = useState(DONORS[0].id);
    const [donorDrop, setDonorDrop] = useState<DropState | null>(null);
    const [donorDecision, setDonorDecision] = useState<null | 'accept' | 'defer'>(null);

    const serialTimers = useRef<number[]>([]);

    const isUnknown = sampleId === 'unknown';
    const sample = isUnknown
        ? { id: 'unknown', label: 'Unknown sample', sg: unknownSg, note: '' }
        : SAMPLES.find(s => s.id === sampleId)!;
    const donor = DONORS.find(d => d.id === donorId)!;
    // Drop density relative to the 1.053 screening solution follows the 12.5 g/dL cutoff
    const donorSg = DONOR_SOLUTION_SG + (donor.hb - DONOR_HB_CUTOFF) * 0.004;

    // Animation clock — runs while any drop is still moving or solutions are being prepared
    const animating = useMemo(() => {
        const active = (d: DropState | null) => d && (now - d.t0) / 1000 < STABLE_TIME + 15;
        return drops.some(active) || active(donorDrop) || (prepareStart !== null && !prepared) || now < squeezeUntil;
    }, [drops, donorDrop, now, prepareStart, prepared, squeezeUntil]);

    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    // Kick the clock whenever a new drop is added
    const kick = () => setNow(performance.now());

    useEffect(() => () => serialTimers.current.forEach(clearTimeout), []);

    // Solution preparation animation (time-based, driven by the animation clock)
    const syringeCount = mode === 'blood' ? TUBES.length : 1;
    const preparing = prepareStart !== null && !prepared;
    const prepTime = prepared ? prepareDuration(syringeCount) : preparing ? Math.max(0, (now - prepareStart!) / 1000) : 0;
    useEffect(() => {
        if (preparing && prepTime >= prepareDuration(syringeCount)) setPrepared(true);
    }, [preparing, prepTime, syringeCount]);

    const clearDrops = () => {
        serialTimers.current.forEach(clearTimeout);
        serialTimers.current = [];
        setDrops(TUBES.map(() => null));
        setAnswer('');
        setChecked(null);
    };

    const handlePrepare = () => {
        if (prepared || preparing) return;
        setPrepareStart(performance.now());
        kick();
    };

    const dropInto = (index: number) => {
        if (!prepared) return;
        const t0 = performance.now();
        setSelectedTube(index);
        setSqueezeUntil(t0 + 300);
        setDrops(prev => prev.map((d, i) => (i === index ? { t0, sg: sample.sg } : d)));
        kick();
    };

    const dropSerially = () => {
        if (!prepared) return;
        clearDrops();
        TUBES.forEach((_, i) => {
            serialTimers.current.push(window.setTimeout(() => dropInto(i), i * 700));
        });
    };

    const handleSampleChange = (id: string) => {
        setSampleId(id);
        if (id === 'unknown') setUnknownSg(TUBES[Math.floor(Math.random() * TUBES.length)].sg);
        clearDrops();
    };

    const handleReset = () => {
        clearDrops();
        setPrepared(false);
        setPrepareStart(null);
        setDonorDrop(null);
        setDonorDecision(null);
    };

    const handleDonorDrop = () => {
        const t0 = performance.now();
        setDonorDrop({ t0, sg: donorSg });
        setDonorDecision(null);
        setSqueezeUntil(t0 + 300);
        kick();
    };

    // Behaviour of each drop is recorded once it has been watched for 15 s
    const observations = TUBES.map((tube, i) => {
        const d = drops[i];
        if (!d) return null;
        const elapsed = (now - d.t0) / 1000 - FALL_TIME;
        return elapsed >= 15 ? behaviourOf(d.sg, tube.sg) : 'observing';
    });
    const tested = observations.filter(o => o !== null).length;
    const suspendedIndex = observations.indexOf('suspended');
    const stillObserving = observations.includes('observing');

    const donorElapsed = donorDrop ? (now - donorDrop.t0) / 1000 - FALL_TIME : 0;
    const donorBehaviour = donorDrop && donorElapsed >= 15 ? behaviourOf(donorDrop.sg, DONOR_SOLUTION_SG) : null;
    const donorCorrect = donor.hb > DONOR_HB_CUTOFF ? 'accept' : 'defer';

    const handleCheck = () => {
        if (!answer) return;
        setChecked(Math.abs(Number(answer) - sample.sg) < 1e-6);
    };

    // --- Layout constants for the rack SVG ---
    const SVG_W = 1000;
    const TOP_BAND = 170; // strip above the rack for the reagent bottles and captions
    const BOTTLE_Y = 92;  // bottles sit in the band so the syringes can dip into them
    const bottleTip = (bottleX: number) => ({ x: bottleX + 32, y: BOTTLE_Y + 58 - TOP_BAND }); // in rack coordinates
    const SVG_H = 655 + TOP_BAND;
    const LIQ_TOP = 200;
    const LIQ_BOTTOM = 500;
    const TUBE_TOP = LIQ_TOP - 90;
    const tubeX = (i: number) => 70 + i * 95;
    const pipetteX = mode === 'blood' ? tubeX(selectedTube) : SVG_W / 2;
    const cycle = cycleLength(syringeCount);
    const blend = blendAt(prepTime, syringeCount);
    const frames = Array.from({ length: syringeCount }, (_, i) =>
        mode === 'blood' ? syringeFrame(prepTime, i, syringeCount, TUBES[i].stock, TUBES[i].water) : syringeFrame(prepTime, 0, 1, 52, 48));
    const average = (key: 'stockDrawn' | 'waterDrawn') => frames.reduce((sum, f) => sum + f[key], 0) / frames.length;
    const first = TUBES[0], last = TUBES[TUBES.length - 1];
    const prepareCaption = !preparing && !prepared
        ? 'Step 1: Prepare the copper sulphate solutions'
        : prepTime < cycle
            ? (mode === 'blood' ? `Transferring stock CuSO₄ (${first.stock} → ${last.stock} mL) to the tubes` : 'Transferring 52 mL stock CuSO₄ to the bottle')
            : prepTime < 2 * cycle
                ? (mode === 'blood' ? `Transferring distilled water (${first.water} → ${last.water} mL) to make 10 mL` : 'Transferring 48 mL distilled water to make 100 mL')
                : (mode === 'blood' ? `Solutions ready: SG ${first.sg.toFixed(3)} → ${last.sg.toFixed(3)}` : `Solution ready: SG ${DONOR_SOLUTION_SG.toFixed(3)}`);
    const step = !prepared ? 1 : (mode === 'donor' ? donorDecision : checked) ? 3 : 2;

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Specific Gravity of Blood</h1>
                        <p className="text-slate-400 text-xs">Philips–Vanslyke's Copper Sulphate Method</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left: Test tube rack */}
                <div className="flex-1 bg-slate-900/40 flex flex-col p-4 min-h-0">
                    <div className="flex bg-slate-800 rounded-lg p-1 mb-3 w-fit">
                        {([['blood', 'Blood SG (10 tubes)'], ['donor', 'Donor screening (SG 1.053)']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => { setMode(id); clearDrops(); setDonorDrop(null); setDonorDecision(null); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${mode === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 min-h-[320px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                        <HoverLabel label={hoverLabel} />
                        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full max-h-[75vh]" preserveAspectRatio="xMidYMid meet">
                            {!prepared && (
                                <>
                                    <ReagentBottle x={40} y={BOTTLE_Y} label="Stock CuSO₄" sublabel="SG 1.100" liquidColor={STOCK_COLOR}
                                        level={0.9 - 0.5 * average('stockDrawn')} active={preparing && prepTime < cycle} labelSide="right" />
                                    <ReagentBottle x={SVG_W - 104} y={BOTTLE_Y} label="Distilled water" sublabel="SG 1.000" liquidColor={WATER_COLOR}
                                        level={0.9 - 0.45 * average('waterDrawn')} active={preparing && prepTime >= cycle && prepTime < 2 * cycle} labelSide="left" />
                                    <HoverZone x={36} y={BOTTLE_Y - 10} w={72} h={84} {...hover('Stock CuSO₄ solution (SG 1.100)')} />
                                    <HoverZone x={SVG_W - 108} y={BOTTLE_Y - 10} w={72} h={84} {...hover('Distilled water')} />
                                    <text x={SVG_W / 2} y={52} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">
                                        {prepareCaption}
                                    </text>
                                </>
                            )}
                            {/* 15–20 s reading window legend */}
                            {prepared && (
                                <text x={30} y={52} fill="#94a3b8" fontSize={19} fontFamily="monospace">
                                    <tspan fill="#fbbf24">■</tspan> momentum / settling  <tspan fill="#4ade80">■</tspan> read at 15–20 s
                                </text>
                            )}
                            <g transform={`translate(0 ${TOP_BAND})`}>
                            {/* Rack (test tubes only; the donor screening bottle stands on the bench) */}
                            {mode === 'blood' && <>
                            <rect x={20} y={LIQ_TOP - 40} width={SVG_W - 40} height={22} rx={4} fill="#78350f" />
                            <rect x={20} y={LIQ_BOTTOM + 92} width={SVG_W - 40} height={18} rx={4} fill="#78350f" />
                            <rect x={26} y={LIQ_TOP - 40} width={12} height={LIQ_BOTTOM - LIQ_TOP + 150} fill="#92400e" />
                            <rect x={SVG_W - 38} y={LIQ_TOP - 40} width={12} height={LIQ_BOTTOM - LIQ_TOP + 150} fill="#92400e" />
                            </>}
                            {mode === 'donor' && <rect x={SVG_W / 2 - 160} y={LIQ_BOTTOM + 4} width={320} height={10} rx={3} fill="#475569" />}
                            {mode === 'blood' && <>
                                <HoverZone x={20} y={LIQ_TOP - 40} w={SVG_W - 40} h={22} {...hover('Test tube rack')} />
                                <HoverZone x={20} y={LIQ_BOTTOM + 92} w={SVG_W - 40} h={18} {...hover('Test tube rack')} />
                            </>}

                            {mode === 'blood' ? (
                                TUBES.map((tube, i) => {
                                    return (
                                        <TestTube key={tube.no}
                                            x={tubeX(i)}
                                            tubeTop={TUBE_TOP}
                                            fullTop={LIQ_TOP}
                                            liquidBottom={LIQ_BOTTOM}
                                            level={tubeLevel(prepTime, i, syringeCount, tube.stock / 10)}
                                            finalColor={solutionColor(tube.stock, 10)}
                                            label={tube.sg.toFixed(3)}
                                            sublabel={`${tube.stock}+${tube.water}`}
                                            number={tube.no}
                                            drop={drops[i]}
                                            solutionSg={tube.sg}
                                            now={now}
                                            selected={prepared && selectedTube === i}
                                            onClick={prepared ? () => dropInto(i) : undefined}
                                            hoverProps={hover(`Test tube ${tube.no}: CuSO₄ solution, SG ${tube.sg.toFixed(3)}`)}
                                        />
                                    );
                                })
                            ) : (
                                <TestTube
                                    x={SVG_W / 2}
                                    tubeTop={TUBE_TOP}
                                    width={150}
                                    fullTop={LIQ_TOP}
                                    liquidBottom={LIQ_BOTTOM}
                                    level={tubeLevel(prepTime, 0, 1, 0.52)}
                                    finalColor={solutionColor(52, 100)}
                                    label={`SG ${DONOR_SOLUTION_SG.toFixed(3)}`}
                                    sublabel="52 mL stock + 48 mL water"
                                    drop={donorDrop}
                                    solutionSg={DONOR_SOLUTION_SG}
                                    now={now}
                                    selected={false}
                                    onClick={prepared ? handleDonorDrop : undefined}
                                    hoverProps={hover(`CuSO₄ solution, SG ${DONOR_SOLUTION_SG.toFixed(3)}`)}
                                />
                            )}

                            {/* Syringes travelling bottle → tube to make up the solutions */}
                            {preparing && blend < 1 && frames.map((f, i) => {
                                const home = { x: mode === 'blood' ? tubeX(i) : SVG_W / 2, y: TUBE_TOP + 30 };
                                const bottle = bottleTip(f.isWater ? SVG_W - 104 : 40);
                                const e = f.travel;
                                const level = mode === 'blood' ? tubeLevel(prepTime, i, syringeCount, TUBES[i].stock / 10) : tubeLevel(prepTime, 0, 1, 0.52);
                                return (
                                    <Syringe key={i}
                                        x={home.x + (bottle.x - home.x) * e}
                                        tipY={home.y + (bottle.y - home.y) * e - ARC_HEIGHT * Math.sin(Math.PI * e)}
                                        volume={f.volume}
                                        capacity={mode === 'blood' ? 10 : 60}
                                        barrelLength={mode === 'blood' ? 60 : 66}
                                        barrelWidth={mode === 'blood' ? 22 : 34}
                                        liquidColor={f.isWater ? WATER_COLOR : STOCK_COLOR}
                                        streamToY={f.dispensing ? LIQ_BOTTOM - (LIQ_BOTTOM - LIQ_TOP) * level.total : null}
                                        opacity={1 - blend} lift={blend * 40} />
                                );
                            })}

                            {prepared && <PipetteIcon x={pipetteX} tipY={LIQ_TOP - PX_PER_CM} squeezing={now < squeezeUntil} hoverProps={hover('Dropper with blood')}
                                onClick={() => (mode === 'blood' ? dropInto(selectedTube) : handleDonorDrop())} />}
                            {mode === 'blood' && (
                                <text x={30} y={LIQ_BOTTOM + 140} fill="#94a3b8" fontSize={18} fontFamily="monospace">Volumes: mL stock CuSO₄ (SG 1.100) + mL distilled water</text>
                            )}
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-4 lg:p-6 space-y-4 lg:overflow-y-auto">
                    {/* Steps */}
                    <div className="flex gap-2 text-xs font-bold uppercase">
                        {['Prepare', mode === 'donor' ? 'Test donor' : 'Drop blood', 'Result'].map((s, i) => (
                            <div key={s} className={`flex-1 text-center py-1.5 rounded-md border ${step === i + 1 ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : step > i + 1 ? 'border-emerald-700 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                                {i + 1}. {s}
                            </div>
                        ))}
                    </div>

                    {!prepared && (
                        <div className="flex gap-3">
                            <button onClick={handlePrepare} disabled={preparing}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <FlaskConical className="w-5 h-5" /> {preparing ? 'Preparing…' : 'Prepare CuSO₄ Solutions'}
                            </button>
                            {preparing && (
                                <button onClick={() => setPrepared(true)}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all">
                                    Skip
                                </button>
                            )}
                        </div>
                    )}

                    {mode === 'blood' ? (
                        <>
                            {/* Sample selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                    <Droplet className="w-4 h-4 text-red-400" /> Blood Sample (double oxalate)
                                </label>
                                <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block p-2.5 outline-none focus:border-indigo-500">
                                    {SAMPLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    <option value="unknown">Unknown sample</option>
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={dropSerially} disabled={!prepared}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    <TestTubes className="w-4 h-4" /> Drop in All Tubes
                                </button>
                                {/* Clears only the drops and the answer; the prepared solutions stay */}
                                <button onClick={clearDrops} disabled={!prepared}
                                    className="px-5 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-sm">
                                    <RefreshCw className="w-4 h-4" /> Reset
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 -mt-2">Tip: click any tube or the dropper to drop blood from ~1 cm above the solution.</p>

                            {/* Observation: a single line naming the tube where the drop stayed suspended */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 px-3 py-2.5 flex items-center gap-2 text-sm">
                                <Timer className="w-4 h-4 text-amber-400 shrink-0" />
                                {suspendedIndex >= 0 ? (
                                    <span>
                                        <span className="text-emerald-400 font-semibold">
                                            Blood drop suspended in Tube {TUBES[suspendedIndex].no} (SG {TUBES[suspendedIndex].sg.toFixed(3)}) at 15–20 s
                                        </span>
                                        {/* After the reading window the copper proteinate sac gets heavier and every drop sinks */}
                                        {(now - drops[suspendedIndex]!.t0) / 1000 - FALL_TIME > STABLE_TIME && (
                                            <span className="block text-xs text-slate-400 mt-0.5">After 20 s the drops may eventually settle to the bottom. This is normal.</span>
                                        )}
                                    </span>
                                ) : tested === 0 ? (
                                    <span className="text-slate-500">No drops yet</span>
                                ) : stillObserving ? (
                                    <span className="text-amber-400">Observing…</span>
                                ) : (
                                    <span className="text-slate-300">Not suspended in the tubes tested so far. Try another tube.</span>
                                )}
                            </div>

                            {/* Result */}
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Specific gravity of the blood sample</label>
                                <div className="flex gap-2">
                                    <select value={answer} onChange={(e) => { setAnswer(e.target.value); setChecked(null); }}
                                        className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2 outline-none focus:border-indigo-500">
                                        <option value="">Select…</option>
                                        {TUBES.map(t => <option key={t.no} value={t.sg.toFixed(3)}>{t.sg.toFixed(3)} (Tube {t.no})</option>)}
                                    </select>
                                    <button onClick={handleCheck} disabled={!answer}
                                        className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg text-sm">
                                        Check
                                    </button>
                                </div>
                                {checked === false && (
                                    <p className="text-sm text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /> Not quite. Find the tube where the drop neither sinks nor rises during the 15–20 s window.</p>
                                )}
                                {checked === true && (
                                    <div className="text-sm space-y-1.5">
                                        <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> SG of blood = {sample.sg.toFixed(3)}</p>
                                        <p className="text-slate-300">Estimated Hb ≈ <span className="font-mono font-bold text-white">{hbFromSg(sample.sg)} g/dL</span></p>
                                        <p className="text-slate-300">
                                            {sample.sg < 1.048 ? 'Below' : sample.sg > 1.066 ? 'Above' : 'Within'} the normal range (1.048–1.066; male avg 1.057, female avg 1.053).
                                        </p>
                                        {isUnknown
                                            ? <p className="text-slate-400 text-xs">This was a random unknown sample. Select it again for a new one.</p>
                                            : <p className="text-slate-400 text-xs"><span className="text-slate-200 font-semibold">{sample.label}:</span> {sample.note}</p>}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                    <Droplet className="w-4 h-4 text-red-400" /> Select Donor
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {DONORS.map(d => (
                                        <button key={d.id} onClick={() => { setDonorId(d.id); setDonorDrop(null); setDonorDecision(null); }}
                                            className={`py-2 rounded-lg text-xs font-bold border transition-colors ${donorId === d.id ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                                            {d.label.replace('Donor ', 'D')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleDonorDrop} disabled={!prepared}
                                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <Pipette className="w-5 h-5" /> Drop {donor.label}'s Blood
                            </button>

                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Drop behaviour (at 15 s)</span>
                                    <span className={`font-bold ${donorBehaviour ? 'text-white' : 'text-amber-400'}`}>
                                        {!donorDrop ? 'Not tested' : donorBehaviour ? (donorBehaviour === 'sinks' ? 'Sinks' : 'Floats') : 'Observing…'}
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Decision</div>
                                <div className="flex gap-2">
                                    {(['accept', 'defer'] as const).map(choice => (
                                        <button key={choice} onClick={() => setDonorDecision(choice)} disabled={!donorBehaviour}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors disabled:opacity-40 ${donorDecision === choice ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                                            {choice === 'accept' ? 'Accept for donation' : 'Defer donor'}
                                        </button>
                                    ))}
                                </div>
                                {donorDecision && (
                                    donorDecision === donorCorrect ? (
                                        <p className="text-sm text-emerald-400 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                            Correct. The drop {donorBehaviour === 'sinks' ? 'sank, so Hb is above' : 'floated, so Hb is below'} {DONOR_HB_CUTOFF} g/dL (actual Hb {donor.hb} g/dL).
                                        </p>
                                    ) : (
                                        <p className="text-sm text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            Incorrect. A drop that sinks has Hb above {DONOR_HB_CUTOFF} g/dL (accept); a drop that floats for over 15 s has Hb below it (defer).
                                        </p>
                                    )
                                )}
                            </div>
                        </>
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
