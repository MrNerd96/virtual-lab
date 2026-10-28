import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Droplet, RefreshCw, CheckCircle2, XCircle, Timer, ListChecks, Microscope, FlaskConical, Pipette, Waves } from 'lucide-react';
import { useHoverLabel, HoverLabel, HoverZone } from './HoverLabel';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// --- Types & Constants ---

type Abo = 'A' | 'B' | 'AB' | 'O';
interface BloodGroup { abo: Abo; rh: boolean }

type Serum = 'A' | 'B' | 'D';
const SERA: { id: Serum; name: string; color: string; fluid: string }[] = [
    { id: 'A', name: 'Anti-A', color: '#2563eb', fluid: 'rgba(37, 99, 235, 0.45)' },   // commercial anti-A is dyed blue
    { id: 'B', name: 'Anti-B', color: '#eab308', fluid: 'rgba(234, 179, 8, 0.5)' },    // anti-B is dyed yellow
    { id: 'D', name: 'Anti-D', color: '#94a3b8', fluid: 'rgba(148, 163, 184, 0.25)' }, // anti-D is colourless
];

const ALL_GROUPS: BloodGroup[] = (['A', 'B', 'AB', 'O'] as Abo[]).flatMap(abo => [{ abo, rh: true }, { abo, rh: false }]);
const groupName = (g: BloodGroup) => `${g.abo} ${g.rh ? 'positive' : 'negative'}`;
const groupShort = (g: BloodGroup) => `${g.abo}${g.rh ? '+' : '−'}`;
const sameGroup = (a: BloodGroup, b: BloodGroup) => a.abo === b.abo && a.rh === b.rh;

// Antigen D is the Rh antigen; A and B are on the red cells of groups A, B and AB
const hasAntigen = (g: BloodGroup, s: Serum) => (s === 'D' ? g.rh : g.abo.includes(s));

// Red cells can be given when the donor carries no antigen the recipient lacks
const canDonate = (donor: BloodGroup, recipient: BloodGroup) =>
    (['A', 'B', 'D'] as Serum[]).every(s => !hasAntigen(donor, s) || hasAntigen(recipient, s));

// Rough ABO and Rh mix of an Indian population, so the unknowns feel like real patients
function randomGroup(): BloodGroup {
    const r = Math.random();
    const abo: Abo = r < 0.36 ? 'O' : r < 0.70 ? 'B' : r < 0.92 ? 'A' : 'AB';
    return { abo, rh: Math.random() > 0.1 };
}

// --- Timing ---
const DROP_TIME = 350;     // ms for a drop to fall from the dropper to the slide
const MIX_TIME = 1100;     // ms of stirring with the applicator stick
const READ_TIME = 120;     // s: reactions are read within about 2 minutes of rocking
const SIM_SPEED = 15;      // simulated seconds per real second while rocking
// Anti-D gives a weaker, slower reaction than anti-A and anti-B
const TAU: Record<Serum, number> = { A: 18, B: 18, D: 40 };

const agglutination = (s: Serum, t: number) => (1 - Math.exp(-t / TAU[s])) / (1 - Math.exp(-READ_TIME / TAU[s]));
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

// Cells spread evenly over a disc of radius `radius` (u), and the same cells drawn into clumps (c)
function makeCells(seed: number, count: number, radius: number, clumps: number, clumpRadius: number): Cell[] {
    const rand = mulberry32(seed);
    const disc = (r: number) => {
        const a = rand() * Math.PI * 2, d = r * Math.sqrt(rand());
        return [Math.cos(a) * d, Math.sin(a) * d];
    };
    const centres = Array.from({ length: clumps }, () => disc(radius * 0.72));
    return Array.from({ length: count }, (_, i) => {
        const [ux, uy] = disc(radius);
        const [ox, oy] = centres[i % clumps];
        const [jx, jy] = disc(clumpRadius);
        return { ux, uy, cx: ox + jx, cy: oy + jy };
    });
}

interface CircleState { serumT0: number | null; bloodT0: number | null; mixT0: number | null }
const EMPTY: CircleState = { serumT0: null, bloodT0: null, mixT0: null };

// --- SVG layout ---
const SVG_W = 1000;
const SVG_H = 600;
const CIRCLE_X = [230, 500, 770];
const CIRCLE_Y = 365;
const WAX_R = 82;
const PUDDLE_R = 60;
const DROPPER_TIP = 182;
const BLOOD_OFFSET = { x: 30, y: -14 }; // the blood drop is placed beside the serum, not on it

const DropperBottle = ({ x, label, color, fluid, active, onClick, hoverProps }: {
    x: number; label: string; color: string; fluid: string; active: boolean; onClick?: () => void; hoverProps: object;
}) => (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }} {...hoverProps}>
        <rect x={x - 40} y={20} width={80} height={170} fill="transparent" />
        {/* Rubber bulb and glass dropper */}
        <ellipse cx={x} cy={38} rx={12} ry={16} fill="#1e293b" stroke="#475569" />
        <rect x={x - 3} y={52} width={6} height={active ? 128 : 30} fill="rgba(226,232,240,0.7)" rx={2} />
        <rect x={x - 14} y={68} width={28} height={12} rx={3} fill="#334155" />
        {/* Bottle */}
        <path d={`M ${x - 28} 90 Q ${x - 28} 80 ${x - 18} 80 L ${x + 18} 80 Q ${x + 28} 80 ${x + 28} 90 L ${x + 28} 150 Q ${x + 28} 158 ${x + 20} 158 L ${x - 20} 158 Q ${x - 28} 158 ${x - 28} 150 Z`}
            fill={fluid} stroke={active ? '#fbbf24' : '#cbd5e1'} strokeWidth={active ? 3 : 2} />
        <rect x={x - 22} y={104} width={44} height={26} rx={3} fill="#f8fafc" />
        <text x={x} y={122} textAnchor="middle" fontSize={13} fontWeight="bold" fill={color === '#94a3b8' ? '#334155' : color}>{label}</text>
    </g>
);

const BloodDropper = ({ x }: { x: number }) => (
    <g pointerEvents="none">
        <ellipse cx={x} cy={DROPPER_TIP - 120} rx={10} ry={14} fill="#f97316" />
        <rect x={x - 4} y={DROPPER_TIP - 106} width={8} height={92} fill="#e2e8f0" opacity={0.9} rx={2} />
        <rect x={x - 3} y={DROPPER_TIP - 60} width={6} height={45} fill="#b91c1c" opacity={0.85} />
        <path d={`M ${x - 4} ${DROPPER_TIP - 15} L ${x - 1.5} ${DROPPER_TIP} L ${x + 1.5} ${DROPPER_TIP} L ${x + 4} ${DROPPER_TIP - 15} Z`} fill="#e2e8f0" />
    </g>
);

// One wax-pencil circle on the slide with its antiserum, blood and (if any) clumps
const SlideCircle = ({ index, serum, state, cells, now, simTime, positive, onClick, hoverProps }: {
    index: number; serum: typeof SERA[number]; state: CircleState; cells: Cell[]; now: number; simTime: number;
    positive: boolean; onClick: () => void; hoverProps: object;
}) => {
    const cx = CIRCLE_X[index];
    const cy = CIRCLE_Y;
    const serumIn = state.serumT0 !== null ? easeOut((now - state.serumT0 - DROP_TIME) / 200) : 0;
    const bloodIn = state.bloodT0 !== null ? easeOut((now - state.bloodT0 - DROP_TIME) / 200) : 0;
    const mixT = state.mixT0 !== null ? (now - state.mixT0) / MIX_TIME : 0;
    const mix = easeOut(mixT);
    const p = positive && mix >= 1 ? agglutination(serum.id, simTime) : 0;
    const bx = cx + BLOOD_OFFSET.x, by = cy + BLOOD_OFFSET.y;
    const dropScale = 14 / PUDDLE_R;

    // Drops in flight from the dropper above
    const falling = (t0: number | null, tx: number, ty: number, color: string) => {
        if (t0 === null || now - t0 >= DROP_TIME) return null;
        const f = (now - t0) / DROP_TIME;
        return <ellipse cx={tx} cy={lerp(DROPPER_TIP, ty, f * f)} rx={5} ry={7} fill={color} />;
    };

    // Stick stirring in a spiral while mixing
    const stirring = state.mixT0 !== null && mixT < 1;
    const angle = (now - (state.mixT0 ?? 0)) / 90;
    const stirR = 12 + 35 * mix;
    const sx = cx + Math.cos(angle) * stirR, sy = cy + Math.sin(angle) * stirR * 0.8;

    return (
        <g onClick={onClick} style={{ cursor: 'pointer' }} {...hoverProps}>
            <circle cx={cx} cy={cy} r={WAX_R + 10} fill="transparent" />
            <circle cx={cx} cy={cy} r={WAX_R} fill="none" stroke="#64748b" strokeWidth={3} opacity={0.7} />
            <text x={cx} y={cy - WAX_R - 12} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#475569" fontFamily="cursive">{serum.id}</text>

            {serumIn > 0 && <circle cx={cx} cy={cy} r={PUDDLE_R * lerp(0.55, 1, mix) * serumIn} fill={serum.fluid} />}

            {/* Blood: a separate drop until it is mixed, then a red suspension that clears where the cells clump */}
            {bloodIn > 0 && (
                <circle cx={lerp(bx, cx, mix)} cy={lerp(by, cy, mix)} r={lerp(14, PUDDLE_R, mix) * bloodIn}
                    fill="#b91c1c" opacity={lerp(0.9, 0.5, mix) * (1 - 0.85 * p)} />
            )}
            {bloodIn > 0 && cells.map((c, i) => {
                const x0 = lerp(bx + c.ux * dropScale, cx + c.ux, mix);
                const y0 = lerp(by + c.uy * dropScale, cy + c.uy, mix);
                return (
                    <circle key={i} cx={lerp(x0, cx + c.cx, p)} cy={lerp(y0, cy + c.cy, p)} r={lerp(1.6, 2.8, p)}
                        fill="#7f1d1d" opacity={(0.35 + 0.6 * p) * bloodIn} />
                );
            })}

            {falling(state.serumT0, cx, cy, serum.color)}
            {falling(state.bloodT0, bx, by, '#b91c1c')}
            {stirring && <line x1={sx} y1={sy} x2={sx + 90} y2={sy - 150} stroke="#a16207" strokeWidth={6} strokeLinecap="round" />}

            <text x={cx} y={cy + WAX_R + 34} textAnchor="middle" fontSize={20} fontWeight="bold" fill={serum.color === '#94a3b8' ? '#475569' : serum.color}>{serum.name}</text>
        </g>
    );
};

// Low-power view of one circle: cells spread out evenly, or stuck together in clumps
const LowPowerView = ({ cells, p, tint }: { cells: Cell[]; p: number; tint: string }) => (
    <svg viewBox="-110 -110 220 220" className="w-full max-w-[240px] mx-auto">
        <defs><clipPath id="lp-field"><circle r={100} /></clipPath></defs>
        <circle r={104} fill="#0f172a" />
        <g clipPath="url(#lp-field)">
            <circle r={100} fill="#fef3c7" />
            <circle r={100} fill={tint} />
            {cells.map((c, i) => (
                <g key={i} transform={`translate(${lerp(c.ux, c.cx, p)} ${lerp(c.uy, c.cy, p)})`}>
                    <circle r={6.5} fill="#dc2626" stroke="#991b1b" strokeWidth={0.8} />
                    <circle r={2.6} fill="#fca5a5" opacity={0.8} />
                </g>
            ))}
        </g>
        <circle r={100} fill="none" stroke="#334155" strokeWidth={6} />
    </svg>
);

// --- Main Component ---
export const BloodGrouping: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [sampleId, setSampleId] = useState<string>('unknown');
    const [unknown, setUnknown] = useState<BloodGroup>(randomGroup);
    const [circles, setCircles] = useState<CircleState[]>(() => SERA.map(() => EMPTY));
    const [rockStart, setRockStart] = useState<number | null>(null);
    const [now, setNow] = useState(() => performance.now());
    const [message, setMessage] = useState<string | null>(null);
    const [viewIndex, setViewIndex] = useState(0);
    const [answer, setAnswer] = useState<BloodGroup | null>(null);
    const [checked, setChecked] = useState<null | boolean>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const timers = useRef<number[]>([]);
    const { label: hoverLabel, hover } = useHoverLabel();
    const questionSet = questionSetFor('blood-grouping');

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const isUnknown = sampleId === 'unknown';
    const group = isUnknown ? unknown : ALL_GROUPS.find(g => groupShort(g) === sampleId)!;

    const macroCells = useMemo(() => SERA.map((_, i) => makeCells(11 + i * 7, 120, PUDDLE_R - 4, 9, 7)), []);
    const microCells = useMemo(() => SERA.map((_, i) => makeCells(101 + i * 13, 70, 92, 5, 20)), []);

    const simTime = rockStart === null ? 0 : Math.min(READ_TIME, ((now - rockStart) / 1000) * SIM_SPEED);
    const rocking = rockStart !== null && simTime < READ_TIME;
    const rocked = rockStart !== null && simTime >= READ_TIME;

    // Animation clock: runs while drops fall, sticks stir or the slide is rocked
    const animating = useMemo(() => {
        const busy = (t0: number | null, d: number) => t0 !== null && now - t0 < d;
        return rocking || circles.some(c => busy(c.serumT0, DROP_TIME + 250) || busy(c.bloodT0, DROP_TIME + 250) || busy(c.mixT0, MIX_TIME + 50));
    }, [circles, now, rocking]);

    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    const allHave = (key: keyof CircleState) => circles.every(c => c[key] !== null);
    const mixedDone = circles.every(c => c.mixT0 !== null && now - c.mixT0 >= MIX_TIME);
    const step = !allHave('serumT0') ? 1 : !allHave('bloodT0') ? 2 : !allHave('mixT0') ? 3 : !rocked ? 4 : 5;

    const update = (i: number, patch: Partial<CircleState>) => {
        const t = performance.now();
        setCircles(prev => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
        setNow(t);
    };

    // Clicking a circle does the next thing it needs
    const actOn = (i: number) => {
        const c = circles[i];
        const t = performance.now();
        setMessage(null);
        if (c.serumT0 === null) update(i, { serumT0: t });
        else if (c.bloodT0 === null) {
            if (!allHave('serumT0')) setMessage('Put antiserum in all three circles first.');
            else update(i, { bloodT0: t });
        } else if (c.mixT0 === null) {
            if (!allHave('bloodT0')) setMessage('Add a drop of blood beside the antiserum in every circle first.');
            else update(i, { mixT0: t });
        } else setViewIndex(i);
    };

    // Do one step in every circle, a little apart so the drops are seen falling
    const doAll = (key: keyof CircleState) => {
        setMessage(null);
        circles.forEach((c, i) => {
            if (c[key] !== null) return;
            timers.current.push(window.setTimeout(() => update(i, { [key]: performance.now() }), i * (key === 'mixT0' ? 250 : 300)));
        });
    };

    const handleRock = () => {
        if (!mixedDone) { setMessage('Mix each circle with its own applicator stick before rocking.'); return; }
        setMessage(null);
        const t = performance.now();
        setRockStart(t);
        setNow(t);
    };

    const resetSlide = (newUnknown: boolean) => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setCircles(SERA.map(() => EMPTY));
        setRockStart(null);
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

    const slideAngle = rocking ? Math.sin((now - rockStart!) / 140) * 3 : 0;
    const viewP = circles[viewIndex].mixT0 !== null && hasAntigen(group, SERA[viewIndex].id) && mixedDone ? agglutination(SERA[viewIndex].id, simTime) : 0;
    const activeCircle = circles.findIndex(c => (step === 1 ? c.serumT0 === null : step === 2 ? c.bloodT0 === null : c.mixT0 === null));

    const caption = [
        'Step 1: Put a drop of each antiserum in its circle',
        'Step 2: Put a drop of blood beside each antiserum',
        'Step 3: Mix each circle with a separate applicator stick',
        rocking ? `Rocking the slide… ${Math.floor(simTime / 60)}:${String(Math.floor(simTime % 60)).padStart(2, '0')}` : 'Step 4: Rock the slide gently for 2 minutes',
        'Step 5: Look for clumping in each circle',
    ][step - 1];

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
                {/* Left: bench with antisera and the slide */}
                <div className="flex-1 bg-slate-900/40 flex flex-col p-4 min-h-0">
                    <div className="relative flex-1 min-h-[320px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                        <HoverLabel label={hoverLabel} />
                        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full max-h-[75vh]" preserveAspectRatio="xMidYMid meet">
                            {SERA.map((s, i) => (
                                <DropperBottle key={s.id} x={CIRCLE_X[i]} label={s.name} color={s.color} fluid={s.fluid}
                                    active={circles[i].serumT0 !== null && now - circles[i].serumT0! < DROP_TIME}
                                    onClick={circles[i].serumT0 === null ? () => actOn(i) : undefined}
                                    hoverProps={hover(`${s.name} serum${s.id === 'D' ? ' (anti-Rh)' : ''}`)} />
                            ))}
                            {circles.map((c, i) => c.bloodT0 !== null && now - c.bloodT0 < DROP_TIME + 150 && (
                                <BloodDropper key={i} x={CIRCLE_X[i] + BLOOD_OFFSET.x} />
                            ))}

                            <g transform={`rotate(${slideAngle} ${SVG_W / 2} ${CIRCLE_Y})`}>
                                {/* White tile under a clean glass slide */}
                                <rect x={70} y={225} width={860} height={300} rx={14} fill="#f1f5f9" />
                                <HoverZone x={70} y={225} w={860} h={300} {...hover('White tile')} />
                                <rect x={95} y={250} width={810} height={250} rx={6} fill="rgba(186, 230, 253, 0.25)" stroke="#94a3b8" strokeWidth={2} />
                                <line x1={110} y1={262} x2={890} y2={262} stroke="#ffffff" strokeWidth={3} opacity={0.8} />
                                {SERA.map((s, i) => (
                                    <SlideCircle key={s.id} index={i} serum={s} state={circles[i]} cells={macroCells[i]} now={now} simTime={simTime}
                                        positive={hasAntigen(group, s.id)} onClick={() => actOn(i)}
                                        hoverProps={hover(`Circle ${s.id}: ${s.name}${circles[i].bloodT0 !== null ? ' + blood' : ''}`)} />
                                ))}
                            </g>

                            <text x={SVG_W / 2} y={575} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">{caption}</text>
                            {step < 4 && activeCircle >= 0 && (
                                <text x={SVG_W / 2} y={215} textAnchor="middle" fill="#94a3b8" fontSize={16}>Click a circle or use the buttons on the right</text>
                            )}
                        </svg>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 p-4 lg:p-6 space-y-4 lg:overflow-y-auto">
                    <div className="flex gap-1.5 text-[11px] font-bold uppercase">
                        {['Sera', 'Blood', 'Mix', 'Rock', 'Read'].map((s, i) => (
                            <div key={s} className={`flex-1 text-center py-1.5 rounded-md border ${step === i + 1 ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : step > i + 1 ? 'border-emerald-700 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                                {i + 1}. {s}
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                            <Droplet className="w-4 h-4 text-red-400" /> Blood Sample
                        </label>
                        <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block p-2.5 outline-none focus:border-indigo-500">
                            <option value="unknown">Unknown patient</option>
                            {ALL_GROUPS.map(g => <option key={groupShort(g)} value={groupShort(g)}>Known sample: {groupName(g)}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => doAll('serumT0')} disabled={step !== 1}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            <FlaskConical className="w-4 h-4" /> Add antisera
                        </button>
                        <button onClick={() => doAll('bloodT0')} disabled={step !== 2}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            <Pipette className="w-4 h-4" /> Add blood
                        </button>
                        <button onClick={() => doAll('mixT0')} disabled={step !== 3}
                            className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            <RefreshCw className="w-4 h-4" /> Mix (3 sticks)
                        </button>
                        <button onClick={handleRock} disabled={step !== 4 || rocking}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            <Waves className="w-4 h-4" /> {rocking ? 'Rocking…' : 'Rock slide'}
                        </button>
                    </div>
                    {message && <p className="text-sm text-amber-400 -mt-1">{message}</p>}

                    {/* Low-power view of a chosen circle */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Microscope className="w-4 h-4" /> Low-power view</span>
                            {rockStart !== null && (
                                <span className={`text-xs font-mono font-bold flex items-center gap-1 ${rocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <Timer className="w-3.5 h-3.5" /> {Math.floor(simTime / 60)}:{String(Math.floor(simTime % 60)).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        <div className="flex bg-slate-900 rounded-lg p-1">
                            {SERA.map((s, i) => (
                                <button key={s.id} onClick={() => setViewIndex(i)}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${viewIndex === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    {s.name}
                                </button>
                            ))}
                        </div>
                        {circles[viewIndex].mixT0 !== null && mixedDone ? (
                            <LowPowerView cells={microCells[viewIndex]} p={viewP} tint={SERA[viewIndex].fluid} />
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-6">Mix the blood with the antiserum to look at the cells.</p>
                        )}
                    </div>

                    {/* Result */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Blood group of the sample</label>
                        <div className="grid grid-cols-4 gap-2">
                            {ALL_GROUPS.map(g => (
                                <button key={groupShort(g)} onClick={() => { setAnswer(g); setChecked(null); }} disabled={!rocked}
                                    className={`py-2 rounded-lg text-sm font-bold border transition-colors disabled:opacity-40 ${answer && sameGroup(answer, g) ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                                    {groupShort(g)}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCheck} disabled={!answer || !rocked}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 rounded-lg text-sm">
                            Check
                        </button>
                        {!rocked && <p className="text-xs text-slate-500">Read the slide after rocking it for 2 minutes.</p>}
                        {checked === false && (
                            <p className="text-sm text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                Not quite. Clumping with an antiserum means the red cells carry that antigen: anti-A for A, anti-B for B, anti-D for Rh.
                            </p>
                        )}
                        {checked === true && (
                            <div className="text-sm space-y-2">
                                <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Blood group {groupName(group)}</p>
                                <table className="w-full text-xs">
                                    <tbody>
                                        {SERA.map(s => (
                                            <tr key={s.id} className="border-t border-slate-700">
                                                <td className="py-1 text-slate-400">{s.name}</td>
                                                <td className={`py-1 font-bold ${hasAntigen(group, s.id) ? 'text-red-400' : 'text-slate-300'}`}>{hasAntigen(group, s.id) ? 'Agglutination' : 'No agglutination'}</td>
                                                <td className="py-1 text-slate-400 text-right">{s.id === 'D' ? 'Rh (D)' : s.id} antigen {hasAntigen(group, s.id) ? 'present' : 'absent'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="text-slate-300">Plasma antibodies: <span className="font-semibold text-white">{plasmaAntibodies.length ? plasmaAntibodies.join(' and ') : 'neither anti-A nor anti-B'}</span>{!group.rh && <span className="text-slate-400"> (no natural anti-D; it forms only after exposure to Rh-positive cells)</span>}</p>
                                <p className="text-slate-300">Can receive red cells from: <span className="font-mono font-semibold text-white">{donorsFor.join(', ')}</span></p>
                                <p className="text-slate-300">Can give red cells to: <span className="font-mono font-semibold text-white">{recipientsOf.join(', ')}</span></p>
                                {isUnknown && <p className="text-slate-400 text-xs">This was a random unknown sample. Press "New slide" for another patient.</p>}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300 uppercase">Precautions</p>
                        <p>• Use a separate applicator stick for each circle, so one antiserum is not carried into another.</p>
                        <p>• Do not let the drops of the different circles run into each other.</p>
                        <p>• Read within a few minutes: a drying edge can look like clumping.</p>
                        <p>• The anti-D reaction is weaker and slower; confirm a doubtful one under the low-power objective.</p>
                    </div>

                    <button onClick={() => resetSlide(isUnknown)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" /> New slide
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
