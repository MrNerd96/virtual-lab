import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, ListChecks, Play, Droplet, Timer, Minus, Plus } from 'lucide-react';
import { useHoverLabel, HoverLabel } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { Finger, Lancet, pulpSite, useNarrowScreen, wrapCaption, easeInOut, easeOut, lerp, clamp01, type Pt } from './fingerPrick';

// Bleeding time by the Duke method and clotting time by the capillary tube method, as in GK Pal (Ch 17), CL Ghai
// (Expt 1-19) and AK Jain (Ch 9). BT: a deep finger-prick, the drop blotted with the edge of a filter paper every
// 30 s without touching the wound, until a blot shows no blood; BT = number of blood spots × 30 s. CT: the first drop
// wiped away, a capillary tube filled from a large drop, held between the palms, and 1 cm broken off every 30 s from
// 2 minutes (Pal) until a fibrin thread spans the broken ends.

// --- Subjects ---

type Subject = 'normal' | 'purpura' | 'haemophilia';
const SUBJECTS: { id: Subject; name: string }[] = [
    { id: 'normal', name: 'Normal subject' },
    { id: 'purpura', name: 'Purpura (low platelets)' },
    { id: 'haemophilia', name: 'Haemophilia' },
];

// The bleeding time a correct count gives, and the time at which a fibrin thread first forms. Normal values fall
// inside every book's range (BT 2–4 min, CT 3–6 min). In purpura bleeding goes on past 10 minutes and CT is normal;
// in haemophilia BT is normal and no thread forms in the tube.
function randomTimes(subject: Subject) {
    const pick = (lo: number, hi: number) => 30 * (lo + Math.floor(Math.random() * (hi - lo + 1)));
    return {
        bt: subject === 'purpura' ? Infinity : pick(4, 8),
        ct: subject === 'haemophilia' ? Infinity : pick(6, 12),
    };
}

// --- Timing ---
const SPEED = 12;           // simulated seconds per real second on the stopwatch
const WAIT_SPEED = 40;      // faster while the tube waits in the palms for the first break at 2 minutes
const CLEAN_RUB = 1000;     // ms rubbing the fingertip with the spirit swab
const CLEAN_TIME = 2400;    // ms until the spirit has dried
const PRICK_TIME = 600;     // ms for the lancet to go in and out
const BLOT_TIME = 650;      // ms for the filter paper to touch the drop and come back
const ROTATE_TIME = 350;    // ms turning the paper to a fresh part of its edge
const BLOT_TOTAL = BLOT_TIME + ROTATE_TIME;
const BT_LIMIT = 600;       // s: still bleeding at 10 minutes, the test is stopped (Pal; Ghai 10–12 min)
const WIPE_TIME = 1600;     // ms: first drop wiped away, a large drop forms
const MOVE = 700, FILL = 1300;
const FILL_TOTAL = MOVE + FILL + MOVE;   // ms: tube to the drop, filling by capillary action, tube back
const PALM_TIME = 700;
const SEP = 400, LOOK = 600, FALL = 500;
const BREAK_TOTAL = SEP + LOOK + FALL;   // ms: 1 cm snapped off, the ends drawn apart and looked at, the bit dropped
const TUBE_CM = 15;         // capillary tube 10–15 cm long (Pal)
const FIRST_BREAK = 120;    // s: first break at 2 minutes (Pal)
const MAX_BREAKS = TUBE_CM - 1;           // the last centimetre is kept in the fingers
const STEP_DEG = 18;        // the paper turns this far between blots, so 20 blots go once round its edge

// Elapsed time written out, e.g. "3 min 30 s", and as a stopwatch shows it, "3:30"
const clock = (s: number) => `${Math.floor(s / 60)} min ${Math.floor(s % 60)} s`;
const watch = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// The stopwatch runs from `since` (real time) at `speed` and stops at `target`, the next 30-second mark, until that
// mark's blot or break is done. `since` null means it is stopped. For CT it runs at real speed from the prick until
// the tube is in the palms, so collecting the blood takes the few seconds it does at the bench, then runs fast to
// the first break and at SPEED after that.
interface Clock { base: number; since: number | null; target: number; speed: number }
const CLOCK0: Clock = { base: 0, since: null, target: 0, speed: SPEED };
const simAt = (c: Clock, now: number) => (c.since === null ? c.base : Math.min(c.target, c.base + (Math.max(0, now - c.since) / 1000) * c.speed));
const clockRunning = (c: Clock, now: number) => c.since !== null && simAt(c, now) < c.target;
const atMark = (c: Clock, now: number) => c.since !== null && simAt(c, now) >= c.target;

interface Blot { t: number; size: number; at: number }     // size 0: no blood on the paper
interface BtState { cleanT0: number | null; prickT0: number | null; clock: Clock; blots: Blot[]; stopped: boolean; count: number; checked: boolean | null }
const BT0: BtState = { cleanT0: null, prickT0: null, clock: CLOCK0, blots: [], stopped: false, count: 0, checked: null };

interface Break { t: number; thread: boolean; at: number }
interface CtState { cleanT0: number | null; prickT0: number | null; wipeT0: number | null; fillT0: number | null; palmT0: number | null; clock: Clock; breaks: Break[]; stopped: boolean }
const CT0: CtState = { cleanT0: null, prickT0: null, wipeT0: null, fillT0: null, palmT0: null, clock: CLOCK0, breaks: [], stopped: false };

// --- SVG layouts: finger to the left, palm up; filter paper (BT) above it, or capillary tube (CT) below it ---
interface Layout {
    w: number; h: number;
    tip: Pt; btTip: Pt;                        // the fingertip for CT and, lower down under the filter paper, for BT
    paper: Pt & { r: number };
    tube: Pt; cm: number; fillAngle: number;   // left end of the tube at rest, px per cm, tilt while filling
    hand: number;                              // size of the hands holding the tube
    inset: Pt & { r: number };                 // magnified view of the broken ends
    watch: Pt; ctWatch: Pt;
    caption: { x: number; y: number; maxChars: number };
}
const WIDE: Layout = {
    w: 1000, h: 600,
    tip: { x: 340, y: 200 }, btTip: { x: 340, y: 440 },
    paper: { x: 405, y: 178, r: 180 },
    tube: { x: 170, y: 410 }, cm: 40, fillAngle: 13, hand: 1,
    inset: { x: 860, y: 175, r: 110 },
    watch: { x: 108, y: 170 }, ctWatch: { x: 560, y: 85 },
    caption: { x: 500, y: 560, maxChars: 72 },
};
const NARROW: Layout = {
    w: 700, h: 840,
    tip: { x: 240, y: 180 }, btTip: { x: 240, y: 560 },
    paper: { x: 314, y: 280, r: 200 },
    tube: { x: 60, y: 560 }, cm: 32, fillAngle: 34, hand: 0.85,
    inset: { x: 545, y: 330, r: 115 },
    watch: { x: 110, y: 690 }, ctWatch: { x: 150, y: 360 },
    caption: { x: 350, y: 765, maxChars: 46 },
};
const DROP_MAX = 22;

// --- Drawing parts ---

// One hand seen from the back, fingers pointing right with the middle fingertip at (0, 0) and the tube running under
// it along y = 0: the back of the hand ending at the wrist, four fingers with nails, and the thumb on the upper side. The other hand, palm up underneath, is the same drawing mirrored and shaded darker.
const FINGERS = [{ y: -36, len: 92 }, { y: -12, len: 108 }, { y: 12, len: 100 }, { y: 36, len: 78 }];   // index to little
const BackOfHand = ({ under = false }: { under?: boolean }) => {
    const skin = under ? '#c99372' : '#e8b48f', line = under ? '#a8714f' : '#c48a63', nail = under ? '#e2b8a4' : '#f5d0c0';
    return (
        <g>
            {/* Thumb, from the base of the hand along the index finger */}
            <g transform="rotate(-12 -205 -42)">
                <rect x={-215} y={-56} width={122} height={26} rx={13} fill={skin} stroke={line} strokeWidth={1.8} />
                <rect x={-118} y={-50} width={18} height={14} rx={6} fill={nail} stroke={line} strokeWidth={1} />
                <path d="M -150 -55 Q -146 -43 -150 -31" fill="none" stroke={line} strokeWidth={1.2} />
            </g>
            {/* Back of the hand from the wrist, widening to the knuckles */}
            <path d="M -285 -40 L -245 -40 Q -205 -42 -175 -52 L -112 -50 L -112 50 L -175 50 Q -205 42 -245 40 L -285 40 Q -297 0 -285 -40 Z"
                fill={skin} stroke={line} strokeWidth={2} />
            {/* Tendons on the back of the hand */}
            <path d="M -235 -14 L -125 -34 M -235 -4 L -125 -12 M -235 6 L -125 12 M -235 16 L -125 34" stroke={line} strokeWidth={1} opacity={0.35} />
            {FINGERS.map(f => {
                const tip = -110 + f.len;
                return (
                    <g key={f.y}>
                        <rect x={-124} y={f.y - 11} width={f.len + 14} height={22} rx={11} fill={skin} stroke={line} strokeWidth={1.6} />
                        <rect x={tip - 22} y={f.y - 7} width={17} height={14} rx={6} fill={nail} stroke={line} strokeWidth={1} />
                        {/* Knuckle and the creases over the middle joint */}
                        <ellipse cx={-110} cy={f.y} rx={6} ry={7} fill="#ffffff" opacity={under ? 0.06 : 0.18} />
                        <path d={`M ${-110 + f.len * 0.48} ${f.y - 7} Q ${-106 + f.len * 0.48} ${f.y} ${-110 + f.len * 0.48} ${f.y + 7}`} fill="none" stroke={line} strokeWidth={1.2} />
                    </g>
                );
            })}
        </g>
    );
};

// Digital stopwatch, centre (x, y). It flashes amber at each 30-second mark while it waits for a blot or break.
const Stopwatch = ({ x, y, s, ringing, hoverProps }: { x: number; y: number; s: number; ringing: boolean; hoverProps: object }) => (
    <g {...hoverProps}>
        <rect x={x - 14} y={y - 58} width={28} height={14} rx={3} fill="#475569" />
        <rect x={x - 90} y={y - 46} width={180} height={92} rx={22} fill="#1e293b" stroke={ringing ? '#f59e0b' : '#475569'} strokeWidth={ringing ? 5 : 3} />
        <rect x={x - 72} y={y - 30} width={144} height={52} rx={8} fill="#a3b18a" />
        <text x={x} y={y + 12} textAnchor="middle" fontSize={40} fontWeight="bold" fill="#1f2937" fontFamily="monospace">{watch(s)}</text>
        <text x={x} y={y + 38} textAnchor="middle" fontSize={13} fill={ringing ? '#fbbf24' : '#94a3b8'} fontWeight="bold">{ringing ? '30 s mark' : 'STOPWATCH'}</text>
    </g>
);

// --- Main Component ---
export const BleedingClottingTime: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [tab, setTab] = useState<'bt' | 'ct'>('bt');
    const [subject, setSubject] = useState<Subject>('normal');
    const [times, setTimes] = useState(() => randomTimes('normal'));
    const [bt, setBt] = useState<BtState>(BT0);
    const [ct, setCt] = useState<CtState>(CT0);
    const [auto, setAuto] = useState(false);
    const [now, setNow] = useState(() => performance.now());
    const [message, setMessage] = useState<string | null>(null);
    const [quizOpen, setQuizOpen] = useState(false);
    const { label: hoverLabel, hover } = useHoverLabel();
    const narrow = useNarrowScreen();
    const L = narrow ? NARROW : WIDE;
    const questionSet = questionSetFor('bt-ct');

    const done = (t0: number | null, d: number) => t0 !== null && performance.now() - t0 >= d;
    const busy = (t0: number | null, d: number) => t0 !== null && now - t0 < d;

    // --- Bleeding time ---
    // Bleeding stops 15 s before the reported BT, so the blot at BT still picks up a little blood and the next one is
    // clean. The flow is strongest at first and falls off; in purpura it goes on.
    const stopAt = times.bt - 15;
    const rate = (tl: number) => (times.bt === Infinity ? 0.35 + 0.65 * Math.exp(-tl / 150) : Math.max(0, 1 - tl / stopAt) ** 0.6);
    // Size of the drop that has collected since the last blot at tl, at time t (0 to 1)
    const dropSize = (tl: number, t: number) => {
        const end = Math.min(t, stopAt);
        return end <= tl ? 0 : rate(tl) * easeOut((end - tl) / 8);
    };

    const btSim = simAt(bt.clock, now);
    const lastBlot = bt.blots.length ? bt.blots[bt.blots.length - 1] : null;
    const lastBlank = lastBlot !== null && lastBlot.size === 0;
    const discontinued = lastBlot !== null && !lastBlank && lastBlot.t >= BT_LIMIT;
    const blotBusy = lastBlot !== null && busy(lastBlot.at, BLOT_TOTAL);
    const bloodSpots = bt.blots.filter(b => b.size > 0).length;
    const btStep = bt.cleanT0 === null ? 1 : bt.prickT0 === null ? 2 : !lastBlank && !discontinued ? 3 : !bt.stopped ? 4 : 5;
    const btRinging = btStep === 3 && atMark(bt.clock, now) && !blotBusy;

    // --- Clotting time ---
    const ctSim = simAt(ct.clock, now);
    const lastBreak = ct.breaks.length ? ct.breaks[ct.breaks.length - 1] : null;
    const threadSeen = lastBreak?.thread ?? false;
    const breakBusy = lastBreak !== null && busy(lastBreak.at, BREAK_TOTAL);
    const usedUp = ct.breaks.length >= MAX_BREAKS && !threadSeen;
    const ctStep = ct.cleanT0 === null ? 1 : ct.prickT0 === null ? 2 : ct.wipeT0 === null ? 3 : ct.fillT0 === null ? 4 : ct.palmT0 === null ? 5
        : threadSeen ? (ct.stopped ? 8 : 7) : usedUp && !breakBusy ? 8 : 6;
    const ctRinging = ctStep === 6 && atMark(ct.clock, now) && !breakBusy && done(ct.palmT0, PALM_TIME);

    // Animation clock: runs while anything moves or a stopwatch is running
    const animating = useMemo(() => (
        busy(bt.cleanT0, CLEAN_TIME + 50) || busy(bt.prickT0, PRICK_TIME + 50) || clockRunning(bt.clock, now) || (lastBlot !== null && busy(lastBlot.at, BLOT_TOTAL + 50))
        || busy(ct.cleanT0, CLEAN_TIME + 50) || busy(ct.prickT0, PRICK_TIME + 800) || busy(ct.wipeT0, WIPE_TIME + 50) || busy(ct.fillT0, FILL_TOTAL + 50)
        || busy(ct.palmT0, PALM_TIME + 50) || clockRunning(ct.clock, now) || (lastBreak !== null && busy(lastBreak.at, BREAK_TOTAL + 700))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [bt, ct, now]);

    useEffect(() => {
        if (!animating) return;
        let raf = 0;
        const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [animating]);

    const start = () => { const t = performance.now(); setNow(t); setMessage(null); return t; };

    // --- Actions ---
    const cleanFinger = (which: 'bt' | 'ct') => {
        const t = start();
        if (which === 'bt') setBt(s => (s.cleanT0 === null ? { ...s, cleanT0: t } : s));
        else setCt(s => (s.cleanT0 === null ? { ...s, cleanT0: t } : s));
    };

    // The stopwatch is started as soon as blood appears (Pal)
    const prick = (which: 'bt' | 'ct') => {
        const s = which === 'bt' ? bt : ct;
        if (!done(s.cleanT0, CLEAN_TIME)) { setMessage('Let the spirit dry completely before pricking.'); return; }
        const t = start();
        const clockOn: Clock = { base: 0, since: t + PRICK_TIME, target: which === 'bt' ? 30 : FIRST_BREAK, speed: which === 'bt' ? SPEED : 1 };
        if (which === 'bt') setBt(b => (b.prickT0 === null ? { ...b, prickT0: t, clock: clockOn } : b));
        else setCt(c => (c.prickT0 === null ? { ...c, prickT0: t, clock: clockOn } : c));
    };

    const blot = () => {
        if (blotBusy || btStep !== 3) return;
        if (!atMark(bt.clock, performance.now())) {
            setMessage(`Blot exactly every 30 seconds: wait for the stopwatch to reach ${watch(bt.clock.target)}.`);
            return;
        }
        const t = start();
        const mark = bt.clock.target;
        const size = dropSize(lastBlot?.t ?? 0, mark);
        const blank = size < 0.03;
        const halt = blank || mark >= BT_LIMIT;
        setBt(b => ({
            ...b,
            blots: [...b.blots, { t: mark, size: blank ? 0 : size, at: t }],
            clock: halt ? { ...b.clock, base: mark, since: null, target: mark } : { ...b.clock, base: mark, since: t, target: mark + 30 },
        }));
    };

    const stopBt = () => { start(); setBt(b => ({ ...b, stopped: true })); };

    const wipe = () => {
        if (!done(ct.prickT0, PRICK_TIME + 500)) { setMessage('Let the first drop form.'); return; }
        const t = start();
        setCt(c => (c.wipeT0 === null ? { ...c, wipeT0: t } : c));
    };

    const fillTube = () => {
        if (!done(ct.wipeT0, WIPE_TIME)) { setMessage('Wait for a large drop to form, so the tube fills in one go without air bubbles.'); return; }
        const t = start();
        setCt(c => (c.fillT0 === null ? { ...c, fillT0: t } : c));
    };

    const holdInPalms = () => {
        if (!done(ct.fillT0, FILL_TOTAL)) return;
        const t = start();
        setCt(c => (c.palmT0 === null ? { ...c, palmT0: t, clock: { ...c.clock, base: simAt(c.clock, t), since: t, speed: WAIT_SPEED } } : c));
    };

    const breakTube = () => {
        if (breakBusy || ctStep !== 6) return;
        if (!done(ct.palmT0, PALM_TIME)) return;
        if (!atMark(ct.clock, performance.now())) {
            setMessage(ct.breaks.length === 0
                ? 'Keep the tube between your palms. The first piece is broken off at 2 minutes.'
                : `Break off a piece every 30 seconds: wait for ${watch(ct.clock.target)}.`);
            return;
        }
        const t = start();
        const mark = ct.clock.target;
        const thread = mark >= times.ct;
        const halt = thread || ct.breaks.length + 1 >= MAX_BREAKS;
        setCt(c => ({
            ...c,
            breaks: [...c.breaks, { t: mark, thread, at: t }],
            clock: halt ? { ...c.clock, base: mark, since: null, target: mark } : { base: mark, since: t, target: mark + 30, speed: SPEED },
        }));
    };

    const stopCt = () => { start(); setCt(c => ({ ...c, stopped: true })); };

    // Auto: blot or break at each 30-second mark without a tap
    useEffect(() => {
        if (!auto) return;
        if (tab === 'bt' && btRinging) blot();
        if (tab === 'ct' && ctRinging) breakTube();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, tab, btRinging, ctRinging]);

    const resetTab = (which: 'bt' | 'ct' | 'both', subj: Subject = subject) => {
        start();
        const fresh = randomTimes(subj);
        if (which !== 'ct') setBt(BT0);
        if (which !== 'bt') setCt(CT0);
        setTimes(prev => ({ bt: which === 'ct' ? prev.bt : fresh.bt, ct: which === 'bt' ? prev.ct : fresh.ct }));
    };

    const changeSubject = (s: Subject) => { setSubject(s); resetTab('both', s); };

    // --- Steps: a short name for the checklist and the wording of the big Next button ---
    interface StepButton { name: string; title: string; run: () => void; busy: boolean; color: string }
    const BT_STEPS: StepButton[] = [
        { name: 'Clean', title: 'Clean with spirit', run: () => cleanFinger('bt'), busy: false, color: 'bg-sky-600 hover:bg-sky-500 border-sky-500' },
        { name: 'Prick', title: 'Prick the finger', run: () => prick('bt'), busy: !done(bt.cleanT0, CLEAN_TIME), color: 'bg-rose-600 hover:bg-rose-500 border-rose-500' },
        { name: 'Blot', title: `Blot at ${watch(bt.clock.target)}`, run: blot, busy: !btRinging, color: 'bg-red-600 hover:bg-red-500 border-red-500' },
        { name: 'Stop', title: discontinued ? 'Stop the test, press on the wound' : 'Stop the watch', run: stopBt, busy: blotBusy, color: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500' },
        { name: 'Count', title: 'Count the spots', run: () => {}, busy: true, color: 'bg-emerald-700 border-emerald-500' },
    ];
    const CT_STEPS: StepButton[] = [
        { name: 'Clean', title: 'Clean with spirit', run: () => cleanFinger('ct'), busy: false, color: 'bg-sky-600 hover:bg-sky-500 border-sky-500' },
        { name: 'Prick', title: 'Prick the finger', run: () => prick('ct'), busy: !done(ct.cleanT0, CLEAN_TIME), color: 'bg-rose-600 hover:bg-rose-500 border-rose-500' },
        { name: 'Wipe', title: 'Wipe the first drop', run: wipe, busy: !done(ct.prickT0, PRICK_TIME + 500), color: 'bg-slate-600 hover:bg-slate-500 border-slate-500' },
        { name: 'Fill', title: 'Fill the capillary tube', run: fillTube, busy: !done(ct.wipeT0, WIPE_TIME), color: 'bg-red-600 hover:bg-red-500 border-red-500' },
        { name: 'Palms', title: 'Hold between palms', run: holdInPalms, busy: !done(ct.fillT0, FILL_TOTAL), color: 'bg-amber-600 hover:bg-amber-500 border-amber-500' },
        { name: 'Break', title: `Break 1 cm at ${watch(ct.clock.target)}`, run: breakTube, busy: !ctRinging, color: 'bg-red-600 hover:bg-red-500 border-red-500' },
        { name: 'Stop', title: 'Stop the watch', run: stopCt, busy: breakBusy, color: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500' },
        { name: 'Read', title: 'Read the clotting time', run: () => {}, busy: true, color: 'bg-emerald-700 border-emerald-500' },
    ];
    const steps = tab === 'bt' ? BT_STEPS : CT_STEPS;
    const step = tab === 'bt' ? btStep : ctStep;
    const lastStep = steps.length;
    const simNow = tab === 'bt' ? btSim : ctSim;
    const ticking = clockRunning(tab === 'bt' ? bt.clock : ct.clock, now);

    // --- Captions ---
    const btCaption = [
        busy(bt.cleanT0, CLEAN_TIME) ? 'Letting the spirit dry completely…' : 'Step 1: Clean the fingertip with spirit and let it dry',
        'Step 2: A deep prick (3–4 mm) with a sterile lancet; start the stopwatch as blood appears',
        btRinging ? `${clock(bt.clock.target)}: touch the drop with the edge of the filter paper` : `Blood flowing freely… blot at every 30 s (next at ${watch(bt.clock.target)})`,
        discontinued ? 'Still bleeding at 10 minutes: stop the test and press on the wound' : 'No blood on the paper: the bleeding has stopped. Stop the watch',
        discontinued ? 'Bleeding time more than 10 minutes' : 'Count the blood spots: BT = number of spots × 30 s',
    ][btStep - 1];
    const ctCaption = [
        busy(ct.cleanT0, CLEAN_TIME) ? 'Letting the spirit dry completely…' : 'Step 1: Clean the fingertip with spirit and let it dry',
        'Step 2: A deep prick with a sterile lancet; start the stopwatch as blood appears',
        'Step 3: Wipe away the first drop and let a large drop form',
        'Step 4: Touch the tube to the drop, its other end held lower: it fills by capillary action',
        'Step 5: Hold the tube between the palms to keep it at body temperature',
        ctRinging ? `${clock(ct.clock.target)}: break off 1 cm and look for a fibrin thread`
            : ct.breaks.length === 0 ? `Tube held between the palms… first break at 2 min` : `No thread yet… next break at ${watch(ct.clock.target)}`,
        'A fibrin thread spans the broken ends: blood has clotted. Stop the watch',
        threadSeen ? `Clotting time ${clock(lastBreak!.t)}` : 'The tube is used up and no fibrin thread has formed',
    ][ctStep - 1];

    // --- Drawing state: bleeding time ---
    const tip = tab === 'bt' ? L.btTip : L.tip;
    const site = pulpSite(tip.x, tip.y);       // the ball of the finger, where it is pricked
    const cleaning = (t0: number | null) => {
        if (t0 === null) return { wet: 0, swab: null as Pt | null };
        const e = now - t0;
        const wet = e < CLEAN_RUB ? 1 : 1 - clamp01((e - CLEAN_RUB) / (CLEAN_TIME - CLEAN_RUB));
        const swab = e < CLEAN_RUB ? { x: site.x + Math.sin(e / 60) * 28, y: site.y - 16 } : null;
        return { wet, swab };
    };
    const lancetAt = (t0: number | null): Pt | null => {
        if (t0 === null || now - t0 >= PRICK_TIME) return null;
        const k = Math.sin((Math.PI * (now - t0)) / PRICK_TIME);
        return { x: site.x, y: lerp(site.y - 80, site.y + 3, k) };
    };

    // The drop wells up on the ball of the finger; after each blot (once the paper has touched it) it collects again
    const touched = bt.blots.filter(b => now - b.at >= BLOT_TIME / 2);
    const tl = touched.length ? touched[touched.length - 1].t : 0;
    const btDrop = bt.prickT0 === null || bt.stopped ? 0 : dropSize(tl, btSim);
    const dropAt = (size: number): Pt => ({ x: site.x, y: site.y + 3 - DROP_MAX * size * 0.85 });
    const btDropPos = dropAt(Math.max(btDrop, 0.5));

    // Filter paper: its edge is brought to the drop, then it is turned so the next blot falls on fresh paper
    const paper = L.paper;
    const a0 = Math.atan2(btDropPos.y - paper.y, btDropPos.x - paper.x);
    const dist = Math.hypot(btDropPos.x - paper.x, btDropPos.y - paper.y);
    const reach = lastBlot && now - lastBlot.at < BLOT_TIME ? Math.sin((Math.PI * (now - lastBlot.at)) / BLOT_TIME) : 0;
    const shift = reach * (dist - paper.r - 2);
    const px = paper.x + Math.cos(a0) * shift, py = paper.y + Math.sin(a0) * shift;
    const rot = bt.blots.reduce((sum, b) => sum + STEP_DEG * easeInOut((now - b.at - BLOT_TIME) / ROTATE_TIME), 0);
    const spotPos = (i: number, radius: number) => {
        const a = a0 + ((rot - i * STEP_DEG) * Math.PI) / 180;
        return { x: px + Math.cos(a) * radius, y: py + Math.sin(a) * radius };
    };

    // --- Drawing state: clotting time ---
    const ctDrop = (() => {
        if (ct.prickT0 === null) return 0;
        if (ct.wipeT0 === null) return 0.55 * easeOut((now - ct.prickT0 - PRICK_TIME) / 700);
        const w = now - ct.wipeT0;
        if (w < 300) return 0.55 * (1 - w / 300);
        if (ct.fillT0 === null) return easeOut((w - 600) / (WIPE_TIME - 600));
        const f = now - ct.fillT0;
        return f < MOVE ? 1 : 1 - 0.75 * easeOut((f - MOVE) / FILL);
    })();
    const ctDropPos = dropAt(Math.max(ctDrop, 0.5));
    const wipeSwab = ct.wipeT0 !== null && now - ct.wipeT0 < 600 ? { x: lerp(site.x + 80, site.x - 80, (now - ct.wipeT0) / 600), y: site.y - 18 } : null;

    // Tube pose: at rest on the bench, or taken to the drop and tilted down so blood runs in, then brought back
    const tubeLen = TUBE_CM * L.cm;
    const fillE = ct.fillT0 === null ? -1 : now - ct.fillT0;
    const toDrop = fillE < 0 ? 0 : fillE < MOVE ? easeInOut(fillE / MOVE) : fillE < MOVE + FILL ? 1 : 1 - easeInOut((fillE - MOVE - FILL) / MOVE);
    const filled = fillE < 0 ? 0 : fillE < MOVE ? 0 : easeOut((fillE - MOVE) / FILL);
    const tubeX = lerp(L.tube.x, ctDropPos.x - 4, toDrop), tubeY = lerp(L.tube.y, ctDropPos.y + 2, toDrop);
    const tubeAngle = L.fillAngle * toDrop;
    const curCm = TUBE_CM - ct.breaks.length;
    const palms = ct.palmT0 === null ? 0 : easeOut((now - ct.palmT0) / PALM_TIME);

    // The piece just broken off: drawn apart from the tube, then dropped unless a thread holds it
    const breakE = lastBreak ? now - lastBreak.at : 0;
    const sep = lastBreak ? easeOut(breakE / SEP) : 0;
    const fall = lastBreak && !lastBreak.thread ? clamp01((breakE - SEP - LOOK) / FALL) : 0;
    const showPiece = lastBreak !== null && fall < 1;
    // The tube is snapped by bending it: the two parts hinge at the break into an inverted V, then are drawn a little apart
    const bend = 22 * sep;
    const pull = lastBreak ? 6 * clamp01((breakE - SEP) / 250) : 0;
    // The hands part a little at each break, then close round the tube again, gripping 1 cm further back. Once the
    // thread is seen or the tube is used up they let go of it.
    const handOpen = !lastBreak || breakE >= BREAK_TOTAL ? 0 : breakE < 200 ? breakE / 200 : Math.min(1, (BREAK_TOTAL - breakE) / 300);
    const release = lastBreak && (lastBreak.thread || usedUp) ? easeOut((breakE - BREAK_TOTAL) / 600) : 0;
    const regrip = lastBreak ? clamp01((breakE - SEP - LOOK) / FALL) : 1;
    const handTip = L.tube.x + (curCm + 1 - regrip - 1.4) * L.cm;
    const handGap = 70 * (1 - palms) + 30 * handOpen + 200 * release;
    const rotAbout = (px: number, py: number, cx: number, cy: number, deg: number): Pt => {
        const a = (deg * Math.PI) / 180;
        return { x: cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a), y: cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a) };
    };

    const caption = tab === 'bt' ? btCaption : ctCaption;
    const { wet, swab } = cleaning(tab === 'bt' ? bt.cleanT0 : ct.cleanT0);
    const lancet = lancetAt(tab === 'bt' ? bt.prickT0 : ct.prickT0);
    const pricked = (tab === 'bt' ? bt.prickT0 : ct.prickT0) !== null;
    const btWithinNormal = times.bt !== Infinity;

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">Bleeding Time & Clotting Time</h1>
                        <p className="text-slate-400 text-xs">Duke method • Capillary tube method</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left: the fingertip with the filter paper or the capillary tube */}
                <div className="lg:flex-1 bg-slate-900/40 flex flex-col p-3 lg:p-4 min-h-0">
                    <div className="relative lg:flex-1 lg:min-h-[300px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
                        <HoverLabel label={hoverLabel} />
                        <ZoomableSvg w={L.w} h={L.h} className="w-full h-auto lg:h-full max-h-[75vh]">
                            {tab === 'bt' && (
                                <g>
                                    {/* Circular filter paper; each blot leaves a spot near its edge, numbered in order */}
                                    <g {...hover('Circular filter paper: each spot is one blot, 30 s apart')}>
                                        <circle cx={px} cy={py} r={paper.r} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
                                        <circle cx={px} cy={py} r={paper.r - 60} fill="none" stroke="#e2e8f0" strokeWidth={1} />
                                        {bt.blots.map((b, i) => {
                                            if (now - b.at < BLOT_TIME / 2) return null;
                                            const s = spotPos(i, paper.r - 24);
                                            const n = spotPos(i, paper.r - 50);
                                            return (
                                                <g key={i}>
                                                    {b.size > 0
                                                        ? <circle cx={s.x} cy={s.y} r={3 + 15 * b.size} fill="#b91c1c" opacity={0.85} />
                                                        : bt.stopped && <circle cx={s.x} cy={s.y} r={14} fill="none" stroke="#475569" strokeWidth={1.8} strokeDasharray="3 2" />}
                                                    <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill={b.size > 0 ? '#475569' : '#94a3b8'}>{i + 1}</text>
                                                </g>
                                            );
                                        })}
                                    </g>
                                    <Finger x={tip.x} y={tip.y} wet={wet} swab={swab} hoverProps={hover('Fingertip, cleaned with spirit')} />
                                    {btDrop > 0.02 && <circle cx={dropAt(btDrop).x} cy={dropAt(btDrop).y} r={DROP_MAX * btDrop} fill="#b91c1c" {...hover('Drop of blood flowing freely; never squeezed')} />}
                                    {bt.stopped && discontinued && (
                                        <g {...hover('Sterile gauze pressed on the wound')}>
                                            <rect x={site.x - 32} y={site.y - 34} width={64} height={38} rx={6} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
                                            <path d={`M ${site.x - 26} ${site.y - 24} L ${site.x + 26} ${site.y - 24} M ${site.x - 26} ${site.y - 14} L ${site.x + 26} ${site.y - 14} M ${site.x - 26} ${site.y - 4} L ${site.x + 26} ${site.y - 4}`} stroke="#e2e8f0" strokeWidth={2} />
                                        </g>
                                    )}
                                </g>
                            )}

                            {tab === 'ct' && (
                                <g>
                                    <Finger x={tip.x} y={tip.y} wet={wet} swab={swab} hoverProps={hover('Fingertip, cleaned with spirit')} />
                                    {ctDrop > 0.02 && <circle cx={dropAt(ctDrop).x} cy={dropAt(ctDrop).y} r={DROP_MAX * ctDrop} fill="#b91c1c" {...hover(ct.wipeT0 === null ? 'First drop of blood: wiped away' : 'Large drop of blood')} />}
                                    {wipeSwab && (
                                        <g pointerEvents="none">
                                            <circle cx={wipeSwab.x} cy={wipeSwab.y} r={20} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.5} />
                                            <circle cx={wipeSwab.x + 5} cy={wipeSwab.y + 4} r={8} fill="#fecaca" />
                                        </g>
                                    )}

                                    {/* The lower hand, palm up under the tube */}
                                    {palms > 0 && release < 1 && (
                                        <g transform={`translate(${handTip + 6} ${L.tube.y + 8 + handGap}) scale(${L.hand} ${-L.hand})`} opacity={palms * (1 - release)} pointerEvents="none">
                                            <BackOfHand under />
                                        </g>
                                    )}

                                    {/* Capillary tube without anticoagulant; drawn from its left end along +x */}
                                    <g transform={`translate(${tubeX} ${tubeY}) rotate(${tubeAngle})`} {...hover('Capillary glass tube, 10–15 cm long and 1–2 mm bore, no anticoagulant')}>
                                        <rect x={0} y={-6} width={curCm * L.cm} height={12} rx={3} fill="rgba(226, 232, 240, 0.35)" stroke="#94a3b8" strokeWidth={1.2} />
                                        {filled > 0 && <rect x={2} y={-3} width={Math.max(0, Math.min(filled * (tubeLen - 10), curCm * L.cm - 4))} height={6} fill="#991b1b" />}
                                        <line x1={3} y1={-3.5} x2={curCm * L.cm - 3} y2={-3.5} stroke="#ffffff" strokeWidth={1.2} opacity={0.5} />
                                        {/* Centimetre marks, from the far end where the pieces are broken off */}
                                        {Array.from({ length: curCm - 1 }, (_, i) => (
                                            <line key={i} x1={(i + 1) * L.cm} y1={6} x2={(i + 1) * L.cm} y2={10} stroke="#64748b" strokeWidth={1} />
                                        ))}
                                        {/* The piece is bent down at the break, hinging on the tube's lower edge */}
                                        {showPiece && (
                                            <g transform={`translate(0 ${fall * 70}) rotate(${bend} ${curCm * L.cm} 6) translate(${pull * 0.5} 0)`} opacity={1 - fall}>
                                                <rect x={curCm * L.cm} y={-6} width={L.cm} height={12} rx={3} fill="rgba(226, 232, 240, 0.35)" stroke="#94a3b8" strokeWidth={1.2} />
                                                <rect x={curCm * L.cm + 2} y={-3} width={L.cm - 6} height={6} fill="#991b1b" />
                                            </g>
                                        )}
                                        {lastBreak?.thread && (() => {
                                            const end = rotAbout(curCm * L.cm + pull * 0.5, 0, curCm * L.cm, 6, bend);
                                            return <line x1={curCm * L.cm} y1={0} x2={end.x} y2={end.y} stroke="#7f1d1d" strokeWidth={1.5} />;
                                        })()}
                                    </g>

                                    {/* The upper hand, palm down over the tube, its far end left free for breaking */}
                                    {palms > 0 && release < 1 && (
                                        <g opacity={palms * (1 - release)} {...hover('Tube held between the palms to keep it near body temperature')}>
                                            <g transform={`translate(${handTip} ${L.tube.y - handGap}) scale(${L.hand})`}><BackOfHand /></g>
                                            <text x={handTip - 200 * L.hand} y={L.tube.y + 66 * L.hand + 22 + handGap} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#fcd34d">≈ 37 °C</text>
                                        </g>
                                    )}

                                    {/* Magnified view of the broken ends, once the tube is in the palms */}
                                    {ct.palmT0 !== null && <g {...hover('Magnified view of the broken ends')}>
                                        <defs><clipPath id="ct-inset"><circle cx={L.inset.x} cy={L.inset.y} r={L.inset.r} /></clipPath></defs>
                                        <circle cx={L.inset.x} cy={L.inset.y} r={L.inset.r + 5} fill="#334155" />
                                        <circle cx={L.inset.x} cy={L.inset.y} r={L.inset.r} fill="#0f172a" />
                                        {lastBreak ? (() => {
                                            // Both parts hinge on the lower edge at the break (hx, hy): the tube tilts down
                                            // to the left, the piece down to the right, so the break opens at the top
                                            const { x, y, r } = L.inset;
                                            const hx = x, hy = y + 30, H = 44, P = pull * 2.5;
                                            const leftEnd = rotAbout(hx, hy - H / 2, hx, hy, -bend);
                                            const rightEnd = rotAbout(hx + P, hy - H / 2, hx, hy, bend);
                                            const mx = (leftEnd.x + rightEnd.x) / 2, my = (leftEnd.y + rightEnd.y) / 2;
                                            return (
                                                <g clipPath="url(#ct-inset)">
                                                    <g transform={`rotate(${-bend} ${hx} ${hy})`}>
                                                        <rect x={hx - 2 * r} y={hy - H} width={2 * r} height={H} fill="rgba(226, 232, 240, 0.25)" stroke="#94a3b8" strokeWidth={2} />
                                                        <rect x={hx - 2 * r} y={hy - H + 9} width={2 * r} height={H - 18} fill="#991b1b" />
                                                    </g>
                                                    <g transform={`translate(0 ${fall * 120}) rotate(${bend} ${hx} ${hy}) translate(${P} 0)`} opacity={1 - fall}>
                                                        <rect x={hx} y={hy - H} width={2 * r} height={H} fill="rgba(226, 232, 240, 0.25)" stroke="#94a3b8" strokeWidth={2} />
                                                        <rect x={hx} y={hy - H + 9} width={2 * r} height={H - 18} fill="#991b1b" />
                                                    </g>
                                                    {lastBreak.thread && sep > 0.3 && (
                                                        <g stroke="#f87171" fill="none" strokeLinecap="round">
                                                            <path d={`M ${leftEnd.x} ${leftEnd.y} Q ${mx - 4} ${my - 7} ${mx} ${my} T ${rightEnd.x} ${rightEnd.y}`} strokeWidth={2.5} />
                                                            <path d={`M ${leftEnd.x} ${leftEnd.y + 5} Q ${mx + 3} ${my + 9} ${mx + 1} ${my + 2} T ${rightEnd.x} ${rightEnd.y - 4}`} strokeWidth={1.5} />
                                                        </g>
                                                    )}
                                                    {/* Arrow pointing to the thread */}
                                                    {lastBreak.thread && sep > 0.6 && (
                                                        <g stroke="#f8fafc" fill="#f8fafc" strokeWidth={3}>
                                                            <line x1={mx} y1={my - 78} x2={mx} y2={my - 30} />
                                                            <path d={`M ${mx - 8} ${my - 32} L ${mx + 8} ${my - 32} L ${mx} ${my - 18} Z`} strokeWidth={1} />
                                                        </g>
                                                    )}
                                                </g>
                                            );
                                        })() : (
                                            <text x={L.inset.x} y={L.inset.y + 5} textAnchor="middle" fontSize={14} fill="#64748b">broken ends seen here</text>
                                        )}
                                        <text x={L.inset.x} y={L.inset.y + L.inset.r + 26} textAnchor="middle" fontSize={15} fontWeight="bold"
                                            fill={lastBreak?.thread ? '#fca5a5' : '#94a3b8'}>
                                            {!lastBreak ? 'Magnified' : lastBreak.thread ? 'Fibrin thread (≈ 5 mm)' : 'Clean break: no thread'}
                                        </text>
                                    </g>}
                                </g>
                            )}

                            {lancet && <Lancet x={lancet.x} y={lancet.y} />}
                            {pricked && (
                                <Stopwatch x={tab === 'bt' ? L.watch.x : L.ctWatch.x} y={tab === 'bt' ? L.watch.y : L.ctWatch.y} s={simNow} ringing={tab === 'bt' ? btRinging : ctRinging}
                                    hoverProps={hover('Stopwatch, started as blood appears (zero time)')} />
                            )}

                            <text x={L.caption.x} y={L.caption.y} textAnchor="middle" fill="#a5b4fc" fontSize={24} fontWeight="bold">
                                {wrapCaption(caption, L.caption.maxChars).map((line, i) => <tspan key={i} x={L.caption.x} dy={i === 0 ? 0 : 28}>{line}</tspan>)}
                            </text>
                        </ZoomableSvg>
                    </div>
                </div>

                {/* Right panel: method tabs, checklist, subject and the big Next button, then the result */}
                <div className="w-full flex-1 lg:flex-none lg:w-[400px] bg-slate-900 border-l border-slate-800 p-4 lg:p-5 space-y-3 lg:overflow-y-auto">
                    <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
                        {(['bt', 'ct'] as const).map(t => (
                            <button key={t} onClick={() => { setTab(t); setMessage(null); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                {t === 'bt' ? <><Droplet className="w-4 h-4" /> Bleeding time</> : <><Timer className="w-4 h-4" /> Clotting time</>}
                            </button>
                        ))}
                    </div>

                    {/* Checklist: done steps ticked, the current one highlighted (pressing it does it, like Next) */}
                    <ol className="grid grid-cols-4 gap-x-2 gap-y-1 text-[11px] font-bold" aria-label={`Step ${step} of ${lastStep}`}>
                        {steps.map((b, i) => {
                            const n = i + 1;
                            const state = n < step ? 'done' : n === step ? 'current' : 'later';
                            const press = () => {
                                if (state === 'current' && n < lastStep && !b.busy) b.run();
                                else if (state === 'later') setMessage(`Finish step ${step} (${steps[step - 1].name}) first.`);
                            };
                            return (
                                <li key={b.name}>
                                    <button onClick={press} disabled={state === 'done' || (state === 'current' && (b.busy || n === lastStep))}
                                        className={`w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-left transition-colors ${
                                            state === 'done' ? 'text-emerald-400'
                                                : state === 'current' ? 'text-white bg-slate-800 ring-1 ring-indigo-400 hover:bg-slate-700 enabled:cursor-pointer'
                                                    : 'text-slate-600 hover:text-slate-500'}`}>
                                        {state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 text-center shrink-0">{n}</span>}
                                        <span className="truncate">{b.name}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="flex items-stretch gap-2">
                        <select value={subject} onChange={(e) => changeSubject(e.target.value as Subject)} aria-label="Subject"
                            className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg block px-2 py-2 outline-none focus:border-indigo-500">
                            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {step < lastStep ? (() => {
                            const b = steps[step - 1];
                            return (
                                <button onClick={b.run} disabled={b.busy}
                                    className={`flex-[1.25] min-w-0 ${b.color} border text-white font-bold py-2.5 px-2 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg transition-colors disabled:opacity-60`}>
                                    {b.busy && ticking ? <><Timer className="w-4 h-4 shrink-0" /> <span className="truncate">Waiting… {watch(simNow)}</span></>
                                        : b.busy ? <span className="truncate">Working…</span>
                                            : <><Play className="w-4 h-4 fill-current shrink-0" /> <span className="truncate">Next: {b.title}</span></>}
                                </button>
                            );
                        })() : (
                            <p className="flex-[1.25] flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800 rounded-xl px-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> {tab === 'bt' && !discontinued ? 'Count below' : 'Result below'}
                            </p>
                        )}
                    </div>

                    {/* Auto blot/break */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer mr-auto">
                            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} className="accent-indigo-500" />
                            Auto {tab === 'bt' ? 'blot' : 'break'} every 30 s
                        </label>
                    </div>
                    {message && <p className="text-sm text-amber-400">{message}</p>}

                    {/* Result: bleeding time */}
                    {tab === 'bt' && btStep === 5 && (discontinued ? (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <p className="text-red-400 font-bold">Bleeding time: more than 10 minutes (prolonged)</p>
                            <p className="text-slate-300">Bleeding had not stopped at 10 minutes, so the test was stopped and pressure applied.</p>
                            <p className="text-slate-300">BT is prolonged in thrombocytopenia (platelets below about 50,000 per µL), thrombasthenia and von Willebrand disease. In purpura the clotting time is usually normal: try the Clotting time tab.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Spots of blood on the filter paper</label>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setBt(b => ({ ...b, count: Math.max(0, b.count - 1), checked: null }))} aria-label="One fewer"
                                    className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-700"><Minus className="w-4 h-4" /></button>
                                <span className="w-10 text-center text-xl font-bold font-mono">{bt.count}</span>
                                <button onClick={() => setBt(b => ({ ...b, count: Math.min(b.blots.length, b.count + 1), checked: null }))} aria-label="One more"
                                    className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-700"><Plus className="w-4 h-4" /></button>
                                <span className="text-slate-400">× 30 s = {clock(bt.count * 30)}</span>
                            </div>
                            <button onClick={() => setBt(b => ({ ...b, checked: b.count === bloodSpots }))}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-sm">Check</button>
                            {bt.checked === false && (
                                <p className="text-red-400 flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    Count again: only the spots with blood. The last, circled blot is clean and is not counted.</p>
                            )}
                            {bt.checked === true && (
                                <>
                                    <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Bleeding time {clock(bloodSpots * 30)}</p>
                                    <p className="text-slate-300">{bloodSpots} spots × 30 s. Normal by the Duke method: 1–5 min (Pal, Ghai); 2–6 min (Jain).</p>
                                    {subject === 'haemophilia' && btWithinNormal && (
                                        <p className="text-slate-300">BT is normal in haemophilia: platelets and vessel walls are normal, and it is the clotting time that is prolonged. Try the Clotting time tab.</p>
                                    )}
                                </>
                            )}
                        </div>
                    ))}

                    {/* Result: clotting time */}
                    {tab === 'ct' && ctStep === 8 && (threadSeen ? (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Clotting time {clock(lastBreak!.t)}</p>
                            <p className="text-slate-300">The first fibrin thread appeared at {watch(lastBreak!.t)} from zero time. Normal by the capillary tube method: 2–8 min (Pal); 3–6 min (Ghai); 3–8 min (Jain).</p>
                            {subject === 'purpura' && (
                                <p className="text-slate-300">CT is normal in thrombocytopenic purpura: the platelets that are left are enough for clotting, though the bleeding time is prolonged.</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-2">
                            <p className="text-red-400 font-bold">Clotting time: more than {clock(lastBreak!.t)} (prolonged)</p>
                            <p className="text-slate-300">No fibrin thread had formed when the tube was used up. CT is prolonged when clotting factors are lacking: haemophilia (factor VIII), vitamin K deficiency, or an overdose of anticoagulant. In haemophilia the bleeding time stays normal.</p>
                            <p className="text-slate-400 text-xs">A CT over 10 minutes calls for tests to find the missing factor (Pal).</p>
                        </div>
                    ))}

                    <div className={`grid gap-2 ${questionSet ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button onClick={() => { resetTab(tab); setMessage(null); }}
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
