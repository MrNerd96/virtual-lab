import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
    ArrowLeft, Eye, LineChart, Play, Square, Volume2, VolumeX, Moon, Sun, Activity, ListChecks, Syringe, ArrowUp, ArrowDown,
    CheckCircle2, XCircle, FastForward, RefreshCw, Wind, Gauge, Thermometer, Loader2,
} from 'lucide-react';
import { LabEnvironment } from './LabEnvironment';
import {
    LangendorffApparatus, CANNULA_AT, NOZZLE_TIP_Y, APEX_REST_Y, LEVER_TIP_X, leverTipY,
    type LangendorffLive, type LangendorffMotion,
} from './LangendorffApparatus';
import { KymographModel, useKymograph, type KymoPen } from './Kymograph';
import { useHeartbeatSound } from './useHeartbeatSound';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { instrumentById } from '../instruments';

// Perfusion of the isolated mammalian (rabbit) heart by Langendorff's method, and the effect of drugs and ions.
// Follows AK Jain Ch 68 (pp. 324–328), the only one of the user's books with this practical: the apparatus, the
// set-up in his order, his doses and his results table (Table 68.2). The apparatus is the department's own set
// (LangendorffApparatus, modelled on photographs), with the E-8 kymograph from the Instruments module beside it.
// On that set the thread pulls the lever down in systole, so the smoked paper shows systole downward; the record
// panel is drawn with systole upward, as in Jain's Fig. 68.3.
// Not from the books: the beat rate of the isolated heart (150/min is our own figure), the sizes of the effects,
// and the wooden block that raises the apparatus so its writing point meets the drum.

// --- Agents (Jain p. 325, Table 68.1) ---

type AgentId = 'adrenaline' | 'ach' | 'atropine' | 'cacl2' | 'nacl' | 'kcl';
type RowId = 'pUp' | 'pDown' | 'adrenaline' | 'ach' | 'atropine' | 'achAtropine' | 'cacl2' | 'nacl' | 'kcl' | 'anoxia';

interface Agent {
    id: AgentId;
    label: string;
    dose: string;
    color: string;
    rate: number;   // where the rate settles, as a multiple of normal
    amp: number;    // where the force settles
    tone: number;   // how far relaxation fails (1 = the heart stays contracted)
    tau: number;    // ms, how quickly the effect develops
}

const AGENTS: Record<AgentId, Agent> = {
    adrenaline: { id: 'adrenaline', label: 'Adrenaline', dose: '1 mL of 1 : 100,000', color: '#f87171', rate: 1.35, amp: 1.6, tone: 0, tau: 2500 },
    ach: { id: 'ach', label: 'Acetylcholine', dose: '0.5 mL of 1 : 100,000', color: '#fbbf24', rate: 0.55, amp: 0.45, tone: 0, tau: 2000 },
    atropine: { id: 'atropine', label: 'Atropine', dose: '1 mL of 1 : 2000', color: '#a3e635', rate: 1.12, amp: 1.15, tone: 0, tau: 3000 },
    cacl2: { id: 'cacl2', label: 'CaCl₂', dose: '1 mL of 1%', color: '#22d3ee', rate: 1.1, amp: 1.45, tone: 1, tau: 2500 },
    nacl: { id: 'nacl', label: 'NaCl', dose: '1 mL of 1%', color: '#e2e8f0', rate: 0.8, amp: 0.6, tone: 0, tau: 3500 },
    kcl: { id: 'kcl', label: 'KCl', dose: '1 mL of 1%', color: '#c084fc', rate: 0.45, amp: 0.1, tone: 0, tau: 3500 },
};
const AGENT_ORDER: AgentId[] = ['adrenaline', 'ach', 'atropine', 'cacl2', 'nacl', 'kcl'];

// The rows of Jain's Table 68.2, in his order
const ROWS: RowId[] = ['pUp', 'pDown', 'adrenaline', 'ach', 'atropine', 'achAtropine', 'cacl2', 'nacl', 'kcl', 'anoxia'];
const ROW_LABEL: Record<RowId, string> = {
    pUp: '1 (i) Perfusion pressure raised',
    pDown: '1 (ii) Perfusion pressure lowered',
    adrenaline: '2. Adrenaline 1 : 100,000 (1 mL)',
    ach: '3. Acetylcholine 1 : 100,000 (0.5 mL)',
    atropine: '4. Atropine 1 : 2000 (1 mL)',
    achAtropine: '5. Acetylcholine after atropine',
    cacl2: '6. 1% CaCl₂ (1 mL)',
    nacl: '7. 1% NaCl (1 mL)',
    kcl: '8. 1% KCl (1 mL)',
    anoxia: '9. Anoxaemia',
};

// What is seen and why, in our own words (Jain pp. 325–327)
const EXPLAIN: Record<RowId, { seen: string; why: string }> = {
    pUp: {
        seen: 'The heart swells and its beats grow weaker.',
        why: 'Above 80 mmHg fluid is forced into the left ventricle as well as the coronary arteries. The ventricle is overstretched and enlarges, and the preparation stops working properly.',
    },
    pDown: {
        seen: 'The beats become slower and weaker.',
        why: 'Below 60 mmHg too little fluid flows through the coronary vessels to supply the muscle, and the preparation fails after a time.',
    },
    adrenaline: {
        seen: 'A marked rise in both the rate and the force of the beat.',
        why: 'Acting on β receptors, it lets more Na⁺ in and less K⁺ out of the nodal tissue, so the pacemaker fires faster, and it raises cyclic AMP, so more Ca²⁺ enters the atrial and ventricular fibres.',
    },
    ach: {
        seen: 'Both the rate and the force of the beat fall.',
        why: 'Acting on muscarinic receptors, it lets more K⁺ leave the nodal cells, which hyperpolarises them, and it reduces the entry of Ca²⁺ into the muscle.',
    },
    atropine: {
        seen: 'The rate and the force of the beat rise.',
        why: 'It blocks the muscarinic receptors at which acetylcholine acts. It does not stop acetylcholine being formed.',
    },
    achAtropine: {
        seen: 'No change: the beat stays as it was under atropine.',
        why: 'Atropine is holding the muscarinic receptors, so the acetylcholine has nothing to act on.',
    },
    cacl2: {
        seen: 'The rate and the force rise, the heart relaxes less and less, and it finally stops contracted, in systole (calcium rigor).',
        why: 'Calcium lowers the threshold of the SA node and acts directly on the contractile process. In excess the muscle cannot relax.',
    },
    nacl: {
        seen: 'Both the rate and the force of the beat fall.',
        why: 'Excess Na⁺ raises the threshold of the nodal tissue, and it competes with Ca²⁺ in the contractile process, so less Ca²⁺ enters.',
    },
    kcl: {
        seen: 'The rate and the force fall, and the heart finally stops relaxed, in diastole.',
        why: 'Excess K⁺ lowers the resting membrane potential, so the fibres depolarise but cannot repolarise, and the action potential becomes smaller.',
    },
    anoxia: {
        seen: 'The heart goes on beating normally for a while, then the beats weaken, and it stops in diastole unless the oxygen is turned on again in time.',
        why: 'The mammalian heart needs a steady supply of oxygen, which is why pure oxygen is bubbled through the Ringer-Locke all through the experiment.',
    },
};

// --- Heart model ---

const NORMAL_PERIOD = 400;     // ms: 150 beats/min (our own figure; Jain gives no rate)
const SAMPLE_INTERVAL = 10;    // ms
const ONSET_MS = 800;          // injected just above the cannula, the drug soon reaches the heart
const REVIVE_MS = 6000;        // warm oxygenated fluid revives the heart over a few seconds
const WINDOW_MS = 20000;       // record shown: the last 20 s of paper (5 cm at 2.5 mm/s)
const P_LOW = 60, P_HIGH = 80; // Jain's perfusion pressure, mmHg

interface Sim {
    t: number;
    rate: number;
    amp: number;
    tone: number;
    swell: number;
    agents: AgentId[];       // in the heart now (atropine may be followed by acetylcholine)
    agentAt: number;
    p: number;               // perfusion pressure, mmHg
    o2: boolean;
    o2OffAt: number;
    flowAt: number | null;   // when the screw clip was opened and the heart began to be perfused
    arrest: null | 'systole' | 'diastole';
    beat: { t0: number; dur: number; amp: number } | null;
    beats: number;
    d: number;               // deflection: 0 = relaxed, 1 = a normal full beat
    phase: number;           // 0..1 within the beat, -1 when the heart is still
    hr: number;
}

const newSim = (): Sim => ({
    t: 0, rate: 1, amp: 0, tone: 0, swell: 1, agents: [], agentAt: 0, p: 0, o2: true, o2OffAt: 0, flowAt: null,
    arrest: null, beat: null, beats: 0, d: 0, phase: -1, hr: 0,
});

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (p: number) => (1 - Math.cos(clamp01(p) * Math.PI)) / 2;
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));   // 0..1 across [a, b] of the progress
// One beat: a quick contraction and a slower relaxation, then rest until the next
function beatShape(phase: number): number {
    if (phase < 0.25) return smooth(phase / 0.25);
    if (phase < 0.6) return 1 - smooth((phase - 0.25) / 0.35);
    return 0;
}

const revived = (s: Sim) => s.flowAt !== null && s.t - s.flowAt >= REVIVE_MS;
const isNormal = (s: Sim) => revived(s) && !s.agents.length && !s.arrest && s.o2 && s.p >= P_LOW && s.p <= P_HIGH
    && Math.abs(s.rate - 1) < 0.012 && Math.abs(s.amp - 1) < 0.015 && s.tone < 0.02 && Math.abs(s.swell - 1) < 0.01;

function stepSim(s: Sim, dt: number) {
    s.t += dt;
    if (s.flowAt === null) { s.d = 0; s.phase = -1; s.hr = 0; return; }   // not yet perfused: the heart is still

    let rateT = 1, ampT = 1, toneT = 0, swellT = 1, tau = 3500;
    // Reviving as the warm oxygenated fluid reaches it
    const rv = clamp01((s.t - s.flowAt) / REVIVE_MS);
    ampT *= rv; rateT *= 0.5 + 0.5 * rv;
    // Perfusion pressure outside 60–80 mmHg
    if (s.p > P_HIGH) { const f = clamp01((s.p - P_HIGH) / 40); swellT = 1 + 0.16 * f; ampT *= 1 - 0.5 * f; tau = 5000; }
    if (s.p < P_LOW) { const f = clamp01((P_LOW - s.p) / 30); ampT *= 1 - 0.6 * f; rateT *= 1 - 0.3 * f; tau = 5000; }
    // Drugs and ions
    if (s.agents.length && s.t - s.agentAt > ONSET_MS) {
        for (const id of s.agents) {
            if (id === 'ach' && s.agents.includes('atropine')) continue;   // blocked
            const a = AGENTS[id];
            rateT *= a.rate; ampT *= a.amp; toneT = Math.max(toneT, a.tone); tau = a.tau;
        }
    }
    // No oxygen: normal for a while, then failing
    if (!s.o2) {
        const off = s.t - s.o2OffAt;
        if (off > 7000) { const k = Math.exp(-(off - 7000) / 8000); ampT *= k; rateT *= 0.65 + 0.35 * k; tau = Math.min(tau, 2500); }
    }
    const k = 1 - Math.exp(-dt / tau);
    s.rate += (rateT - s.rate) * k;
    s.amp += (ampT - s.amp) * k;
    s.swell += (swellT - s.swell) * (1 - Math.exp(-dt / 4000));
    s.tone += (toneT - s.tone) * (1 - Math.exp(-dt / (toneT > s.tone ? 6000 : 2200)));

    // A stopped heart starts again once the cause has gone
    if (s.arrest === 'diastole' && !s.agents.includes('kcl') && s.o2 && s.amp > 0.3) s.arrest = null;
    if (s.arrest === 'systole' && !s.agents.includes('cacl2') && s.tone < 0.45) s.arrest = null;

    if (!s.arrest && (!s.beat || s.t >= s.beat.t0 + s.beat.dur)) {
        if (s.agents.includes('kcl') && s.amp < 0.2) s.arrest = 'diastole';
        else if (!s.o2 && s.amp < 0.15) s.arrest = 'diastole';
        else if (s.agents.includes('cacl2') && s.tone > 0.85) s.arrest = 'systole';
        else if (s.amp > 0.04) {
            // While it revives, the first beats are weak and come irregularly
            const irregular = rv < 0.6 ? 1 + 0.9 * Math.random() : 1;
            s.beat = { t0: s.beat ? s.beat.t0 + s.beat.dur : s.t, dur: (NORMAL_PERIOD / s.rate) * irregular, amp: s.amp };
            if (s.t - s.beat.t0 > s.beat.dur) s.beat.t0 = s.t;
            s.beats++;
        }
    }

    if (s.arrest) {
        s.beat = null; s.phase = -1; s.hr = 0;
        const target = s.arrest === 'systole' ? s.tone * s.amp : 0;
        s.d += (target - s.d) * (1 - Math.exp(-dt / 150));
    } else if (s.beat) {
        s.phase = (s.t - s.beat.t0) / s.beat.dur;
        const floor = s.tone * s.beat.amp;
        s.d = floor + (s.beat.amp - floor) * beatShape(Math.min(1, s.phase));
        s.hr = Math.round(60000 / s.beat.dur);
    }
}

// Geometry of the heart on the cannula (cm). Its base hangs just above the tip of the nozzle, with the aorta tied
// over the nozzle, and the apex hangs at APEX_REST_Y when relaxed.
const HEART_BASE_Y = NOZZLE_TIP_Y - 0.1;
const HEART_LEN = HEART_BASE_Y - APEX_REST_Y;   // 3.2 cm
const LIFT_CM = 0.38;          // how far the apex rises in a normal beat
const TIE_CM = 4.0, TIP_CM = 15.6;   // thread and writing point, from the fulcrum of the lever
const forceCm = (amp: number) => Math.round(amp * LIFT_CM * (TIP_CM / TIE_CM) * 10) / 10;

interface HeartShape { scaleY: number; radial: number }
const shapeOf = (s: Sim): HeartShape => ({
    scaleY: (1 + 0.4 * (s.swell - 1)) * (1 - (LIFT_CM * s.d) / HEART_LEN),
    radial: s.swell * (1 - 0.07 * Math.min(1, s.d)),
});

// --- The bench ---
// The apparatus stands on a wooden block on the bench, so its writing point meets the paper of the kymograph,
// which stands on the bench to its right with its drum turned towards the lever.
const BENCH_Y = -9.4;
const KYMO_AT: [number, number, number] = [LEVER_TIP_X + 7.56, BENCH_Y, CANNULA_AT[2]];
const KYMO_LIFT = 0;
const KYMO_PARTS: Record<string, string> = {
    base: 'Kymograph (E-8 recording drum)', speed: 'Speed lever, set to 2.5 mm/s', switch: 'Mains switch of the kymograph',
    clutch: 'Neutralising clutch', contact: 'Time contact', spindle: 'Spindle of the drum', lift: 'Screw lift of the drum',
    drum: 'Recording drum', paper: 'Smoked paper on the drum',
};
const DISH_AT: [number, number, number] = [-17, 0, 13.5];
const O2_AT: [number, number, number] = [-33, BENCH_Y, -4];
const SCREW_CLIP_AT: [number, number, number] = [-0.3, 31, 4.8];
const NEEDLE_AT: [number, number, number] = [0.15, 33, 3.75];

// --- Animation of the set-up steps ---
// Each step plays for a few seconds; its progress (0..1) is read every frame from a ref, so the 3D parts move
// smoothly without waiting for React.
interface Anim { id: string; t0: number; dur: number }
type AnimRef = React.MutableRefObject<Anim | null>;
const progressOf = (a: AnimRef, id: string): number | null => {
    const x = a.current;
    return x && x.id === id ? clamp01((performance.now() - x.t0) / x.dur) : null;
};

type Hover = (label: string | null) => void;
const hoverProps = (onHover: Hover, label: string) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onHover(label); },
    onPointerOut: () => onHover(null),
});

// --- 3D props: the heart and what handles it ---

const ventricleGeo = (() => {
    let cached: THREE.LatheGeometry | null = null;
    return () => cached ?? (cached = new THREE.LatheGeometry(
        [[0, -3.2], [0.3, -3.1], [0.72, -2.7], [1.06, -2.05], [1.28, -1.25], [1.3, -0.6], [1.15, -0.15], [0.85, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 32));
})();

// The rabbit's heart, with the stumps of the aorta and pulmonary artery. Its origin is the base of the ventricles.
const RabbitHeart = ({ shape, color, tied, cut }: { shape: React.MutableRefObject<HeartShape>; color: string; tied: boolean; cut: boolean }) => {
    const vent = useRef<THREE.Group>(null);
    const geo = useMemo(ventricleGeo, []);
    useFrame(() => {
        if (!vent.current) return;
        const { scaleY, radial } = shape.current;
        vent.current.scale.set(radial, scaleY, radial);
    });
    return (
        <group>
            <group ref={vent}>
                <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.55} /></mesh>
                {/* Interventricular groove with its vessels and a little fat */}
                <mesh position={[0.25, -1.3, 1.17]} rotation={[0.25, 0, 0.18]}><cylinderGeometry args={[0.07, 0.05, 2.4, 6]} /><meshStandardMaterial color="#e9d6b4" roughness={0.7} /></mesh>
            </group>
            {/* Atria at the base, right one larger */}
            <mesh position={[0.75, -0.1, -0.25]} scale={[1, 0.8, 1]}><sphereGeometry args={[0.6, 16, 12]} /><meshStandardMaterial color="#7d2a32" roughness={0.6} /></mesh>
            <mesh position={[-0.7, -0.05, -0.35]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.5, 16, 12]} /><meshStandardMaterial color="#7d2a32" roughness={0.6} /></mesh>
            {/* Fat at the base */}
            <mesh position={[0, 0.05, 0.3]} scale={[1.4, 0.45, 1]}><sphereGeometry args={[0.55, 14, 10]} /><meshStandardMaterial color="#ecdcb8" roughness={0.8} /></mesh>
            {/* Stump of the aorta (at least 1 cm long), tied over the nozzle */}
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.36, 0.4, 1.0, 16, 1, true]} /><meshStandardMaterial color="#efe0cc" roughness={0.6} side={THREE.DoubleSide} /></mesh>
            {tied && <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.38, 0.05, 6, 20]} /><meshStandardMaterial color="#1f2937" roughness={0.8} /></mesh>}
            {/* Pulmonary artery, with the short cut in its wall */}
            <group position={[0.42, 0.3, 0.38]} rotation={[0.35, 0, -0.3]}>
                <mesh><cylinderGeometry args={[0.28, 0.32, 0.6, 14, 1, true]} /><meshStandardMaterial color="#e6cdb9" roughness={0.6} side={THREE.DoubleSide} /></mesh>
                {cut && <mesh position={[0, 0.05, 0.3]}><boxGeometry args={[0.05, 0.36, 0.06]} /><meshStandardMaterial color="#3b0d12" roughness={0.8} /></mesh>}
            </group>
        </group>
    );
};

// Fine forceps, the tips at the origin, the handles rising up and to the right
const Forceps = () => (
    <group rotation={[0.35, 0, -0.5]}>
        {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.18, 5.2, 0]} rotation={[0, 0, -s * 0.035]}>
                <boxGeometry args={[0.14, 10.4, 0.06]} /><meshStandardMaterial color="#d4d9de" metalness={0.9} roughness={0.25} />
            </mesh>
        ))}
        <mesh position={[0, 10.4, 0]}><boxGeometry args={[0.6, 0.4, 0.1]} /><meshStandardMaterial color="#b8bec4" metalness={0.9} roughness={0.3} /></mesh>
    </group>
);

// Fine scissors: two blades that open and close about a screw, tips at the origin
const Scissors = ({ open }: { open: React.MutableRefObject<number> }) => {
    const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null);
    useFrame(() => {
        const o = open.current * 0.35;
        if (a.current) a.current.rotation.z = o;
        if (b.current) b.current.rotation.z = -o;
    });
    const blade = (ref: React.RefObject<THREE.Group>, s: number) => (
        <group ref={ref} position={[0, 2.2, 0]}>
            <mesh position={[0, -1.1, s * 0.02]}><boxGeometry args={[0.18, 2.2, 0.04]} /><meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} /></mesh>
            <mesh position={[0, 1.6, s * 0.02]}><boxGeometry args={[0.16, 3.2, 0.05]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} /></mesh>
            <mesh position={[s * 0.5, 3.6, s * 0.02]}><torusGeometry args={[0.5, 0.09, 8, 18]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} /></mesh>
        </group>
    );
    return <group>{blade(a, 1)}{blade(b, -1)}<mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.2, 10]} /><meshStandardMaterial color="#64748b" metalness={0.8} /></mesh></group>;
};

// Where the heart is: hanging from forceps over the dish, lying in the dish, carried to the cannula, or tied on it
type HeartStage = 'none' | 'held' | 'dish' | 'cannula';
const HELD_HIGH = new THREE.Vector3(DISH_AT[0], 17, DISH_AT[2]);
const HELD = new THREE.Vector3(DISH_AT[0], 6.5, DISH_AT[2]);
const IN_DISH = new THREE.Vector3(DISH_AT[0] - 1.4, 1.05, DISH_AT[2] + 0.4);
const BELOW_NOZZLE = new THREE.Vector3(CANNULA_AT[0], HEART_BASE_Y - 2.4, CANNULA_AT[2]);
const ON_CANNULA = new THREE.Vector3(CANNULA_AT[0], HEART_BASE_Y, CANNULA_AT[2]);
const LYING = new THREE.Euler(0, 0.5, Math.PI / 2);
const UPRIGHT = new THREE.Euler(0, 0, 0);
const lerpEuler = (a: THREE.Euler, b: THREE.Euler, t: number) => new THREE.Euler(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

const HeartRig = ({ stage, anim, shape, color, tied, cut, onHover }: {
    stage: HeartStage; anim: AnimRef; shape: React.MutableRefObject<HeartShape>; color: string; tied: boolean; cut: boolean; onHover: Hover;
}) => {
    const heart = useRef<THREE.Group>(null);
    const forceps = useRef<THREE.Group>(null);
    const scissors = useRef<THREE.Group>(null);
    const clots = useRef<THREE.Group>(null);
    const snip = useRef(0);
    const tmp = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        const h = heart.current;
        if (!h) return;
        let pos = ON_CANNULA, rot = UPRIGHT, held = false, visible = stage !== 'none';
        const pe = progressOf(anim, 'excise'), pt = progressOf(anim, 'transfer'), pc = progressOf(anim, 'cannulate'), pp = progressOf(anim, 'pulmonary');
        if (pe !== null) { visible = true; held = true; pos = HELD_HIGH.clone().lerp(HELD, smooth(pe)); }
        else if (pt !== null) {
            visible = true; held = pt < 0.8;
            const q = smooth(seg(pt, 0, 0.7));
            pos = HELD.clone().lerp(IN_DISH, q); rot = lerpEuler(UPRIGHT, LYING, q);
        } else if (pc !== null) {
            visible = true; held = pc < 0.92;
            if (pc < 0.15) { const q = smooth(pc / 0.15); pos = IN_DISH.clone().lerp(HELD, q); rot = lerpEuler(LYING, UPRIGHT, q); }
            else if (pc < 0.7) {
                // Carried in an arc from over the dish to just under the nozzle
                const q = smooth(seg(pc, 0.15, 0.7));
                pos = HELD.clone().lerp(BELOW_NOZZLE, q); pos.y += Math.sin(q * Math.PI) * 6;
            } else pos = BELOW_NOZZLE.clone().lerp(ON_CANNULA, smooth(seg(pc, 0.7, 0.9)));
        } else if (stage === 'held') { held = true; pos = HELD; }
        else if (stage === 'dish') { pos = IN_DISH; rot = LYING; }
        h.visible = visible;
        h.position.copy(pos);
        h.rotation.copy(rot);
        h.updateMatrixWorld();
        // Forceps grip the stump of the aorta
        if (forceps.current) {
            forceps.current.visible = visible && held;
            h.localToWorld(tmp.set(0, 0.9, 0));
            forceps.current.position.copy(tmp);
        }
        // Scissors come in to the pulmonary artery, snip twice and go away
        if (scissors.current) {
            scissors.current.visible = pp !== null;
            if (pp !== null) {
                h.localToWorld(tmp.set(0.42, 0.55, 0.45));
                const away = 1 - smooth(seg(pp, 0, 0.2)) + smooth(seg(pp, 0.85, 1));
                scissors.current.position.set(tmp.x + 0.6 + away * 3, tmp.y + 0.2 + away * 3, tmp.z + 0.4 + away * 2);
                const sn = seg(pp, 0.2, 0.85);
                snip.current = 0.5 + 0.5 * Math.cos(sn * Math.PI * 4);
            }
        }
        // Clots squeezed out into the dish
        if (clots.current) {
            clots.current.visible = pt !== null && pt > 0.7;
            if (pt !== null) {
                const q = seg(pt, 0.7, 1);
                clots.current.children.forEach((c, i) => {
                    const a = i * 2.1;
                    c.position.set(IN_DISH.x + 1.5 + Math.cos(a) * (0.6 + q * 1.6), 0.95, IN_DISH.z + Math.sin(a) * (0.6 + q * 1.6));
                    c.scale.setScalar(0.5 + q * 0.7);
                });
            }
        }
    });
    return (
        <group>
            <group ref={heart} {...hoverProps(onHover, stage === 'cannula' ? 'Rabbit\'s heart, tied on the cannula by its aorta' : 'Rabbit\'s heart')}>
                <RabbitHeart shape={shape} color={color} tied={tied} cut={cut} />
            </group>
            <group ref={forceps} visible={false}><Forceps /></group>
            <group ref={scissors} visible={false} rotation={[0.3, 0.4, 0.75]}><Scissors open={snip} /></group>
            <group ref={clots} visible={false}>
                {[0, 1, 2].map(i => <mesh key={i}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#5c0f17" roughness={0.7} /></mesh>)}
            </group>
        </group>
    );
};

// Fluid dripping from the heart: what has passed through the coronary vessels
const Drips = ({ shape, pressure }: { shape: React.MutableRefObject<HeartShape>; pressure: number }) => {
    const drop = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        const m = drop.current;
        if (!m) return;
        const period = 1.1 * 70 / Math.max(30, pressure);
        const p = (clock.elapsedTime % period) / period;
        const apex = HEART_BASE_Y - HEART_LEN * shape.current.scaleY;
        m.visible = p < 0.55;
        m.position.set(CANNULA_AT[0] - 0.35, apex + 0.4 - (apex + 0.4) * Math.min(1, (p / 0.55) ** 2), CANNULA_AT[2] + 0.3);
    });
    return <mesh ref={drop}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color="#d7eef8" transparent opacity={0.85} /></mesh>;
};

// Petri dish of chilled, oxygenated Ringer-Locke on the base plate, where the heart lies before it is cannulated
const PetriDish = ({ onHover }: { onHover: Hover }) => (
    <group position={DISH_AT} {...hoverProps(onHover, 'Petri dish of chilled, oxygenated Ringer-Locke')}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[4.2, 4.2, 1.2, 40, 1, true]} /><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[4.2, 4.2, 0.1, 40]} /><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.35} roughness={0.05} /></mesh>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[4.12, 4.12, 0.7, 40]} /><meshStandardMaterial color="#cfeaf7" transparent opacity={0.45} depthWrite={false} /></mesh>
    </group>
);

// Flasks of Ringer-Locke poured into the two reservoir bottles
const flaskGeo = (() => {
    let cached: THREE.LatheGeometry | null = null;
    return () => cached ?? (cached = new THREE.LatheGeometry(
        [[0, 0], [3, 0], [3.1, 0.3], [1, 4.2], [0.75, 4.6], [0.75, 6.2], [0.9, 6.4]].map(([r, y]) => new THREE.Vector2(r, y)), 28));
})();
// Each flask turns about its mouth, held just above and outside the mouth of its bottle
const POUR_AT_Y = 122.5, POUR_AT_X = 12.6;
const PourFlasks = ({ anim }: { anim: AnimRef }) => {
    const group = useRef<THREE.Group>(null);
    const flasks = useRef<(THREE.Group | null)[]>([]);
    const streams = useRef<(THREE.Mesh | null)[]>([]);
    const geo = useMemo(flaskGeo, []);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    useFrame(() => {
        const p = progressOf(anim, 'fill');
        if (group.current) group.current.visible = p !== null;
        if (p === null) return;
        const tilt = 2.05 * (smooth(seg(p, 0, 0.25)) - smooth(seg(p, 0.85, 1)));
        [-1, 1].forEach((s, i) => {
            const f = flasks.current[i];
            const m = streams.current[i];
            if (!f || !m) return;
            f.rotation.z = s * tilt;   // the body swings up and outward, the mouth towards the bottle
            const mouth = new THREE.Vector3(s * POUR_AT_X, POUR_AT_Y, -4);
            const target = new THREE.Vector3(s * 11, 119.8, -4);
            m.visible = tilt > 1.4 && p < 0.86;
            const d = target.clone().sub(mouth);
            m.position.copy(mouth.clone().add(target).multiplyScalar(0.5));
            m.quaternion.setFromUnitVectors(up, d.clone().normalize());
            m.scale.set(1, d.length(), 1);
        });
    });
    return (
        <group ref={group} visible={false}>
            {[-1, 1].map((s, i) => (
                <React.Fragment key={s}>
                    <group ref={el => { flasks.current[i] = el; }} position={[s * POUR_AT_X, POUR_AT_Y, -4]}>
                        <group position={[0, -6.3, 0]}>
                            <mesh geometry={geo}><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.35} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
                            <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[2.3, 2.9, 2.2, 24]} /><meshStandardMaterial color="#bfe3f5" transparent opacity={0.6} depthWrite={false} /></mesh>
                        </group>
                    </group>
                    <mesh ref={el => { streams.current[i] = el; }} visible={false}><cylinderGeometry args={[0.18, 0.18, 1, 8]} /><meshStandardMaterial color="#bfe3f5" transparent opacity={0.8} /></mesh>
                </React.Fragment>
            ))}
        </group>
    );
};

// Oxygen cylinder (black with a white shoulder) with its reducing valve, and the tube to the fine glass tubes
const O2_TUBE: THREE.Vector3[] = [
    [O2_AT[0] + 2.2, BENCH_Y + 54.4, O2_AT[2]], [O2_AT[0] + 5, BENCH_Y + 62, -5], [-24, 100, -7], [-14, 129, -6], [0, 129, -4.2],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const OxygenCylinder = ({ anim, open, onHover }: { anim: AnimRef; open: boolean; onHover: Hover }) => {
    const knob = useRef<THREE.Group>(null);
    const needle = useRef<THREE.Group>(null);
    const tube = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(O2_TUBE), 120, 0.35, 8, false), []);
    const branches = useMemo(() => ([[1.6, 121, -4.6], [-1.6, 119, -3.4]] as [number, number, number][]).map(end =>
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 129, -4.2), new THREE.Vector3(end[0] * 0.6, 127, end[2]), new THREE.Vector3(...end)]), 20, 0.3, 8, false)), []);
    useFrame(() => {
        const p = progressOf(anim, 'oxygen');
        const o = p !== null ? smooth(seg(p, 0.1, 0.45)) : open ? 1 : 0;
        if (knob.current) knob.current.rotation.y = -o * Math.PI * 1.5;
        if (needle.current) needle.current.rotation.z = 0.9 - o * 1.4;
    });
    return (
        <group {...hoverProps(onHover, 'Oxygen cylinder with its reducing valve')}>
            <group position={O2_AT}>
                <mesh position={[0, 24, 0]}><cylinderGeometry args={[4.5, 4.5, 48, 32]} /><meshStandardMaterial color="#17181b" metalness={0.4} roughness={0.45} /></mesh>
                <mesh position={[0, 48, 0]} scale={[1, 0.7, 1]}><sphereGeometry args={[4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f1f1ef" metalness={0.2} roughness={0.5} /></mesh>
                <mesh position={[0, 52.2, 0]}><cylinderGeometry args={[0.9, 1.1, 2.2, 16]} /><meshStandardMaterial color="#b8923a" metalness={0.85} roughness={0.35} /></mesh>
                {/* Reducing valve: brass body, pressure gauge facing the front, hand knob on top */}
                <mesh position={[0, 54.4, 0]}><boxGeometry args={[2.6, 2.2, 2.2]} /><meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.3} /></mesh>
                <group position={[0, 54.6, 1.4]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.3, 1.3, 0.5, 24]} /><meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.3} /></mesh>
                    <mesh position={[0, 0, 0.26]}><circleGeometry args={[1.12, 24]} /><meshStandardMaterial color="#f8fafc" /></mesh>
                    <group ref={needle} position={[0, 0, 0.28]}><mesh position={[0, 0.45, 0]}><boxGeometry args={[0.08, 0.9, 0.02]} /><meshBasicMaterial color="#b91c1c" /></mesh></group>
                </group>
                <group ref={knob} position={[0, 56.2, 0]}>
                    <mesh><cylinderGeometry args={[1.1, 1.1, 0.9, 6]} /><meshStandardMaterial color="#1f2937" roughness={0.6} /></mesh>
                    <mesh position={[0.7, 0.5, 0]}><boxGeometry args={[0.5, 0.25, 0.25]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
                </group>
                <mesh position={[1.6, 54.4, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 1.2, 10]} /><meshStandardMaterial color="#c9a24a" metalness={0.85} /></mesh>
            </group>
            <mesh geometry={tube}><meshStandardMaterial color="#334155" roughness={0.7} /></mesh>
            {branches.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#334155" roughness={0.7} /></mesh>)}
        </group>
    );
};

// The flow step, in four shots (ms): the screw clip opens, the fluid runs down the side tube into the cannula, the
// manometer rises to 70 mmHg, and the coronaries fill so the heart pales and starts to beat
const FLOW_MS = 9200;
const FLOW = { clipFrom: 300, clipTo: 1800, tubeFrom: 2200, tubeTo: 4400, hgFrom: 4600, hgTo: 6300, revive: 6500 };

// Screw clip on the side rubber tube just above the cannula: two jaws on either side of the tube, closed on it by a
// wing screw. Closed, the tube is pinched flat and nothing flows; opening the screw lets the tube round out again.
// It is lined up with the tube (local y along the tube), the jaws closing along local z.
const CLIP_QUAT = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.7, -4, 2.6).normalize());
const Steel = () => <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.3} />;
const ScrewClip = ({ anim, open, onHover }: { anim: AnimRef; open: boolean; onHover: Hover }) => {
    const tube = useRef<THREE.Mesh>(null), jawA = useRef<THREE.Group>(null), jawB = useRef<THREE.Group>(null), wing = useRef<THREE.Group>(null);
    useFrame(() => {
        const p = progressOf(anim, 'flow');
        const o = p !== null ? smooth((p * FLOW_MS - FLOW.clipFrom) / (FLOW.clipTo - FLOW.clipFrom)) : open ? 1 : 0;
        const flat = 0.25 + 0.75 * o;                // depth of the tube between the jaws, as a fraction of round
        const half = 0.5 * flat + 0.08;
        if (tube.current) tube.current.scale.set(1 + 0.6 * (1 - flat), 1, flat);
        if (jawA.current) jawA.current.position.z = half;
        if (jawB.current) jawB.current.position.z = -half;
        if (wing.current) { wing.current.position.z = half + 0.55; wing.current.rotation.z = o * Math.PI * 4; }
    });
    return (
        <group position={SCREW_CLIP_AT} quaternion={CLIP_QUAT} scale={1.25} {...hoverProps(onHover, 'Screw clip on the side tube (site of injection)')}>
            {/* The part of the rubber tube held in the clip */}
            <mesh ref={tube}><cylinderGeometry args={[0.5, 0.5, 1.7, 18]} /><meshStandardMaterial color="#a8405f" roughness={0.8} /></mesh>
            {/* Jaws, joined at the back by a spring loop, with the screw through them */}
            <group ref={jawA}><mesh><boxGeometry args={[1.7, 0.45, 0.14]} /><Steel /></mesh></group>
            <group ref={jawB}><mesh><boxGeometry args={[1.7, 0.45, 0.14]} /><Steel /></mesh></group>
            <mesh position={[-0.95, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.06, 6, 16, Math.PI]} /><Steel /></mesh>
            <mesh position={[0.6, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 2.2, 8]} /><Steel /></mesh>
            {/* Wing nut that is turned to open or close the clip */}
            <group ref={wing} position={[0.6, 0, 1]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.25, 10]} /><meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} /></mesh>
                <mesh><boxGeometry args={[1.2, 0.3, 0.08]} /><meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} /></mesh>
            </group>
        </group>
    );
};

// Syringe with a hypodermic needle in the side rubber tube, just above the cannula, while a drug is injected
const SyringeModel = ({ color, startedAt }: { color: string; startedAt: number }) => {
    const plunger = useRef<THREE.Group>(null);
    const fluid = useRef<THREE.Mesh>(null);
    useFrame(() => {
        const p = clamp01((performance.now() - startedAt - 300) / 1400);
        if (plunger.current) plunger.current.position.x = 6.4 - 3.6 * p;
        if (fluid.current) { const len = Math.max(0.05, 4.0 * (1 - p)); fluid.current.scale.x = len; fluid.current.position.x = 2.1 + len / 2; }
    });
    return (
        <group position={NEEDLE_AT} rotation={[0, -Math.PI / 4, 0.12]}>
            <mesh position={[0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 1.8, 6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} /></mesh>
            <mesh position={[1.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.22, 0.3, 10]} /><meshStandardMaterial color="#64748b" roughness={0.5} /></mesh>
            <mesh position={[4.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.48, 0.48, 4.4, 18, 1, true]} /><meshPhysicalMaterial color="#f8fafc" transparent opacity={0.35} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
            <mesh ref={fluid} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.42, 0.42, 1, 16]} /><meshStandardMaterial color={color} transparent opacity={0.75} /></mesh>
            <group ref={plunger}>
                <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.44, 0.44, 0.3, 16]} /><meshStandardMaterial color="#1f2937" roughness={0.7} /></mesh>
                <mesh position={[2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 4.8, 8]} /><meshStandardMaterial color="#e2e8f0" roughness={0.4} /></mesh>
                <mesh position={[4.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.15, 16]} /><meshStandardMaterial color="#e2e8f0" roughness={0.4} /></mesh>
            </group>
        </group>
    );
};

// Bench, and the wooden block the apparatus stands on
const Bench = () => (
    <group>
        <mesh position={[12, BENCH_Y - 1.5, 4]}><boxGeometry args={[120, 3, 56]} /><meshStandardMaterial color="#7c6248" roughness={0.85} /></mesh>
        <mesh position={[0, (BENCH_Y - 2) / 2, 2]}><boxGeometry args={[47, -2 - BENCH_Y, 33]} /><meshStandardMaterial color="#5b4330" roughness={0.8} /></mesh>
    </group>
);

// --- Camera views (what to frame and from where), as in the Instruments viewer ---

type ViewId = 'top' | 'cylinder' | 'columns' | 'clip' | 'tube' | 'manometer' | 'bath' | 'dish' | 'dishClose' | 'lift' | 'heart' | 'pressure' | 'lever' | 'drum' | 'inject' | 'whole';
type View = { center: [number, number, number]; halfW: number; halfH: number; from: [number, number, number] };
const VIEWS: Record<ViewId, View> = {
    top: { center: [0, 110, -4], halfW: 20, halfH: 19, from: [0.15, 0.1, 1] },
    cylinder: { center: [O2_AT[0], BENCH_Y + 52, O2_AT[2]], halfW: 7, halfH: 7, from: [0.35, 0.25, 1] },
    columns: { center: [0, 100, -4], halfW: 6, halfH: 6, from: [0.1, 0.05, 1] },
    bath: { center: [3, 40, 8], halfW: 15, halfH: 17, from: [0.45, 0.18, 1] },
    dish: { center: [DISH_AT[0], 7, DISH_AT[2]], halfW: 8, halfH: 9, from: [0.2, 0.35, 1] },
    dishClose: { center: [DISH_AT[0] - 0.5, 1.6, DISH_AT[2] + 0.5], halfW: 3.6, halfH: 3, from: [0.25, 0.9, 1] },
    lift: { center: [-9, 15, 10], halfW: 15, halfH: 12, from: [0.2, 0.2, 1] },
    heart: { center: [-0.5, 19, 7], halfW: 7, halfH: 5, from: [0.3, 0.12, 1] },
    pressure: { center: [-10.5, 21, 7], halfW: 14, halfH: 8, from: [0.05, 0.05, 1] },
    lever: { center: [17, 18, 7], halfW: 24, halfH: 10, from: [0.08, 0.1, 1] },
    // The E-8 drum turns clockwise seen from above, so the paper under the writing point (on the side of the drum
    // facing the lever) runs towards the back: the fresh record is seen from behind, on the left
    drum: { center: [43, 22, 3], halfW: 12, halfH: 9, from: [-0.6, 0.18, -1] },
    // From the right: the control panel of the bath hides the side tube from in front, the manometer's tubes from
    // the left
    inject: { center: [0, 30.5, 5], halfW: 6, halfH: 6.5, from: [1, 0.1, 0] },
    // The flow step, also from the right: the screw clip close up, the side tube down to the cannula, and the
    // manometer from the front
    clip: { center: SCREW_CLIP_AT, halfW: 2.6, halfH: 2.2, from: [1, 0.15, 0.1] },
    tube: { center: [-0.4, 30.5, 5], halfW: 4.5, halfH: 8, from: [1, 0.1, 0] },
    manometer: { center: [-21.2, 22.5, 7.2], halfW: 5.5, halfH: 8.5, from: [0, 0.05, 1] },
    whole: { center: [8, 55, 2], halfW: 50, halfH: 70, from: [0.3, 0.12, 1] },
};
const VIEW_BUTTONS: [ViewId, string][] = [['heart', 'Heart'], ['pressure', 'Manometer'], ['lever', 'Lever'], ['drum', 'Drum'], ['whole', 'Whole set']];

// Flies the camera to a view. As soon as the student drags or zooms, the flight stops and onUserMove is called, so
// the student keeps the camera instead of being pulled back to the preset view.
type Controls = THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3; update: () => void };
const FitCamera = ({ view, nonce, onUserMove }: { view: View; nonce: number; onUserMove: () => void }) => {
    const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
    const aspect = useThree(s => s.size.width / s.size.height);
    const controls = useThree(s => s.controls) as unknown as Controls | null;
    const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const placed = useRef(false);
    useEffect(() => {
        if (!controls) return;
        const take = () => { goal.current = null; onUserMove(); };
        controls.addEventListener('start', take);
        return () => controls.removeEventListener('start', take);
    }, [controls, onUserMove]);
    useEffect(() => {
        const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const dist = 1.15 * Math.max(view.halfH / t, view.halfW / (t * aspect));
        const target = new THREE.Vector3(...view.center);
        const pos = target.clone().add(new THREE.Vector3(...view.from).normalize().multiplyScalar(dist));
        if (!placed.current) {
            camera.position.copy(pos);
            camera.lookAt(target);
            if (controls) { controls.target.copy(target); controls.update(); placed.current = true; }
        } else {
            goal.current = { pos, target };
        }
    }, [view, nonce, aspect, camera, controls]);
    useFrame(() => {
        const g = goal.current;
        if (!g || !controls) return;
        camera.position.lerp(g.pos, 0.08);
        controls.target.lerp(g.target, 0.08);
        controls.update();
        if (camera.position.distanceTo(g.pos) < g.pos.distanceTo(g.target) * 0.002) goal.current = null;
    });
    return null;
};

// --- Set-up, in Jain's order (p. 325) ---

type StepId = 'fill' | 'oxygen' | 'bath' | 'excise' | 'transfer' | 'pulmonary' | 'cannulate' | 'flow' | 'thread';
interface Choice { label: string; ok: boolean; say: string }
interface Step {
    id: StepId; name: string; title: string; text: string; view: ViewId; choices?: Choice[]; action?: string; done?: string;
    dur: number;                      // ms the animation plays
    shots: [number, ViewId][];        // camera views during the animation, from ms
    doing: string;                    // shown while it plays
    captions?: [number, string][];    // what is happening, shown over the 3D view, from ms
}

const STEPS: Step[] = [
    {
        id: 'fill', name: 'Fill', title: 'Fill the reservoirs', view: 'top', dur: 3600, shots: [[0, 'top']], doing: 'Pouring Ringer-Locke into the reservoirs…',
        text: 'Fill the reservoir bottles high on the stand with the perfusion fluid. Which fluid?',
        choices: [
            { label: 'Ringer-Locke\'s solution, glucose added today', ok: true, say: 'Right. Glucose is added on the day of use, as food for the heart.' },
            { label: 'Ringer-Locke\'s solution, glucose added last week', ok: false, say: 'Glucose added in advance ferments and alters the pH of the solution. It is added on the same day.' },
            { label: '0.9% sodium chloride alone', ok: false, say: 'Saline keeps the fluid isotonic, but it has no calcium to keep the heart contracting, no bicarbonate to hold the pH and no glucose to feed it.' },
        ],
    },
    {
        id: 'oxygen', name: 'Oxygen', title: 'Oxygenate the fluid', view: 'cylinder', dur: 4600, shots: [[0, 'cylinder'], [1800, 'columns']], doing: 'Opening the reducing valve…',
        text: 'Adjust the reducing valve on the oxygen cylinder so that a good stream of oxygen bubbles continuously through the Ringer-Locke.',
        action: 'Open the reducing valve', done: 'Oxygen now bubbles through the fluid in both columns. It must keep bubbling all through the experiment.',
    },
    {
        id: 'bath', name: 'Bath', title: 'Warm the water bath', view: 'bath', dur: 4000, shots: [[0, 'bath']], doing: 'Switching on the heater and stirrer…',
        text: 'The water bath is switched on with its heater, thermostat and stirrer. To what temperature should the fluid leaving the cannula be held?',
        choices: [
            { label: '30 °C', ok: false, say: 'Too cool for a mammalian heart. The fluid coming out of the cannula is held at body temperature, 37 °C.' },
            { label: '37 °C', ok: true, say: 'Right: body temperature. The fluid takes up the heat of the bath in the glass coil on its way to the heart.' },
            { label: '42 °C', ok: false, say: 'Above body temperature. The fluid coming out of the cannula is held at 37 °C.' },
        ],
    },
    {
        id: 'excise', name: 'Excise', title: 'Take out the heart', view: 'dish', dur: 2600, shots: [[0, 'dish']], doing: 'Bringing the heart over the dish…',
        text: 'The rabbit is stunned by a hard blow on the head, the chest is opened quickly and the pericardium separated. The heart is held up and the roots of the lungs, the venae cavae and the aorta are cut. Where is the aorta cut?',
        choices: [
            { label: 'Leaving at least 1 cm of aorta on the heart', ok: true, say: 'Right. The stump of aorta is what slides onto the cannula and is tied.' },
            { label: 'Close to the heart, leaving no aorta', ok: false, say: 'With no aorta left there is nothing to tie onto the cannula. At least 1 cm is left on the heart.' },
        ],
    },
    {
        id: 'transfer', name: 'Cool', title: 'Put the heart in fluid', view: 'dish', dur: 3200, shots: [[0, 'dish'], [2000, 'dishClose']], doing: 'Lowering the heart into the cold fluid…',
        text: 'Where does the heart go at once?',
        choices: [
            { label: 'Chilled, oxygenated Ringer-Locke in a petri dish', ok: true, say: 'Right, and as quickly as possible. The blood clots are gently squeezed out of it there.' },
            { label: 'Ringer-Locke warmed to 37 °C', ok: false, say: 'The excised heart is put into cold oxygenated Ringer-Locke, as quickly as possible. It is warmed only once it is perfused.' },
            { label: 'On gauze, while the cannula is got ready', ok: false, say: 'It must not wait: it is transferred as quickly as possible into cold oxygenated Ringer-Locke.' },
        ],
    },
    {
        id: 'pulmonary', name: 'Cut PA', title: 'Open the pulmonary artery', view: 'dishClose', dur: 2600, shots: [[0, 'dishClose']], doing: 'Cutting the pulmonary artery…',
        text: 'Make a short cut in the wall of the pulmonary artery.',
        action: 'Cut the pulmonary artery', done: 'The cut lets the fluid that has passed through the heart flow out freely.',
    },
    {
        id: 'cannulate', name: 'Cannula', title: 'Tie the aorta on the cannula', view: 'lift', dur: 5000, shots: [[0, 'lift'], [3300, 'heart']], doing: 'Carrying the heart to the cannula and tying the aorta…',
        text: 'Find the ascending aorta and slide it onto the nozzle of the cannula. How far, and where is it tied?',
        choices: [
            { label: 'Nozzle kept above the aortic valve; aorta tied round it', ok: true, say: 'Right. With the tip well above the valve and the coronary arteries, the fluid closes the valve and runs down the coronaries.' },
            { label: 'Nozzle pushed down through the aortic valve', ok: false, say: 'The fluid would then pour into the left ventricle instead of the coronary arteries, and the ventricle would swell. The nozzle must not pass the valve.' },
            { label: 'Tied low, taking in the coronary arteries', ok: false, say: 'With the coronaries tied in, all the fluid enters the left ventricle and overstretches it, and the preparation stops working. The tip lies well above the coronaries.' },
        ],
    },
    {
        id: 'flow', name: 'Flow', title: 'Open the screw clip', view: 'pressure', dur: FLOW_MS, doing: 'Opening the screw clip…',
        shots: [[0, 'clip'], [FLOW.tubeFrom, 'tube'], [FLOW.tubeTo, 'manometer'], [FLOW.revive, 'heart']],
        captions: [
            [0, '1. The screw clip on the side tube is opened: the pinched tube rounds out'],
            [FLOW.tubeFrom, '2. Warm Ringer-Locke runs down the tube and fills the cannula'],
            [FLOW.tubeTo, '3. The manometer shows the perfusion pressure rising to 70 mmHg'],
            [FLOW.revive, '4. The fluid washes through the coronary vessels: the heart pales and starts to beat'],
        ],
        text: 'Open the screw clip to increase the flow of Ringer-Locke. At what perfusion pressure should the manometer be held?',
        choices: [
            { label: 'About 30 mmHg', ok: false, say: 'Too low: below 60 mmHg too little fluid reaches the muscle through the coronaries, and the preparation fails after a time.' },
            { label: '60–80 mmHg', ok: true, say: 'Right. The warm, oxygenated fluid soon revives the heart: watch it start to beat.' },
            { label: 'About 120 mmHg', ok: false, say: 'Too high: fluid is forced into the left ventricle, and the heart enlarges. The pressure is held at 60–80 mmHg.' },
        ],
    },
    {
        id: 'thread', name: 'Lever', title: 'Connect the heart to the lever', view: 'heart', dur: 3000, shots: [[0, 'heart'], [1100, 'lever']], doing: 'Passing the pin through the apex and taking the thread to the lever…',
        text: 'Pass a pin with a thread through the apex of the ventricle, and take the thread over the pulleys to the recording lever.',
        action: 'Tie the thread to the lever', done: 'Each beat now pulls on the lever. Start the slow drum (2.5 mm/s) and record the normal beat.',
    },
];
const stepIndex = (id: StepId) => STEPS.findIndex(s => s.id === id);

// --- The record, as on the slow drum ---

interface Sample { x: number; y: number }   // paper time (ms), height of the writing point (cm, systole up)
interface Mark { x: number; text: string; color: string }

const RecordGraph = ({ data, marks, paperT, running, heartRate, arrest }: {
    data: Sample[]; marks: Mark[]; paperT: number; running: boolean; heartRate: number; arrest: Sim['arrest'];
}) => {
    const W = 900, H = 380;
    const m = { top: 92, right: 20, bottom: 56, left: 44 };
    const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    const yMin = -1.2, yMax = 3.3;
    const x0 = Math.max(0, paperT - WINDOW_MS);
    const ys = (y: number) => m.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
    const xs = (x: number) => m.left + ((x - x0) / WINDOW_MS) * plotW;
    // Only the part of the paper in view
    let lo = 0, hi = data.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (data[mid].x < x0) lo = mid + 1; else hi = mid; }
    const shown = data.slice(Math.max(0, lo - 1));
    const path = shown.length > 1 ? `M ${shown.map(p => `${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' L ')}` : '';
    const ticks: number[] = [];
    for (let t = Math.ceil(x0 / 5000) * 5000; t <= x0 + WINDOW_MS; t += 5000) ticks.push(t);
    const seconds: number[] = [];
    for (let t = Math.ceil(x0 / 1000) * 1000; t <= Math.min(paperT, x0 + WINDOW_MS); t += 1000) seconds.push(t);
    const timeY = m.top + plotH + 30;
    const seen = marks.filter(mk => mk.x >= x0);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {[0, 1, 2, 3].map(v => (
                <g key={v}>
                    <line x1={m.left} y1={ys(v)} x2={W - m.right} y2={ys(v)} stroke={v === 0 ? '#166534' : '#14532d'} strokeWidth={1} />
                    <text x={m.left - 6} y={ys(v) + 4} textAnchor="end" fill="#166534" fontSize={12} fontFamily="monospace">{v}</text>
                </g>
            ))}
            <text x={m.left - 30} y={m.top + plotH / 2} fill="#166534" fontSize={11} fontFamily="monospace" transform={`rotate(-90 ${m.left - 30} ${m.top + plotH / 2})`} textAnchor="middle">cm (systole ↑)</text>
            {ticks.map(t => (
                <g key={t}>
                    <line x1={xs(t)} y1={m.top} x2={xs(t)} y2={m.top + plotH} stroke="#14532d" strokeWidth={1} />
                    <text x={xs(t)} y={m.top + plotH + 16} textAnchor="middle" fill="#166534" fontSize={12} fontFamily="monospace">{t / 1000}s</text>
                </g>
            ))}
            {/* Time marker: one mark a second */}
            <line x1={m.left} y1={timeY} x2={xs(Math.min(paperT, x0 + WINDOW_MS))} y2={timeY} stroke="#4b5563" strokeWidth={1.5} />
            {seconds.map(t => <line key={t} x1={xs(t)} y1={timeY - 6} x2={xs(t)} y2={timeY} stroke="#6b7280" strokeWidth={1.5} />)}
            <text x={W - m.right} y={timeY + 16} textAnchor="end" fill="#4b5563" fontSize={11} fontFamily="monospace">time marker, 1 s</text>

            <path d={path} fill="none" stroke="#4ade80" strokeWidth={1.6} strokeLinejoin="round" />

            {seen.map((mk, i) => {
                const x = xs(mk.x);
                const textY = i % 2 === 0 ? 28 : 56;
                const anchor = x < 110 ? 'start' : x > W - 130 ? 'end' : 'middle';
                return (
                    <g key={`${mk.x}-${i}`}>
                        <text x={x} y={textY} textAnchor={anchor} fill={mk.color} fontSize={16} fontFamily="monospace" fontWeight="bold">{mk.text}</text>
                        <line x1={x} y1={textY + 6} x2={x} y2={m.top + plotH} stroke={mk.color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
                    </g>
                );
            })}
            {!data.length && <text x={W / 2} y={m.top + plotH / 2} textAnchor="middle" fill="#166534" fontSize={15} fontFamily="monospace">Drum stopped</text>}
            {data.length > 0 && (
                <text x={W - m.right - 10} y={m.top + plotH - 8} textAnchor="end" fill={heartRate > 0 ? '#4ade80' : '#f87171'} fontSize={14} fontFamily="monospace" fontWeight="bold">
                    {heartRate > 0 ? `HR: ${heartRate} BPM` : arrest === 'systole' ? 'STOPPED IN SYSTOLE' : 'STOPPED IN DIASTOLE'}
                </text>
            )}
            {running && <text x={m.left + 10} y={m.top + plotH - 8} fill="#ef4444" fontSize={14} fontFamily="monospace" fontWeight="bold">● 2.5 mm/s</text>}
        </svg>
    );
};

// --- Main component ---

interface Result { beforeHr: number; beforeForce: number; hr: number; force: number; note?: string }
interface Frame { hr: number; arrest: Sim['arrest']; normal: boolean; agents: AgentId[]; o2: boolean; revived: boolean; beating: boolean; phase: number }
const frameOf = (s: Sim): Frame => ({
    hr: s.hr, arrest: s.arrest, normal: isNormal(s), agents: [...s.agents], o2: s.o2, revived: revived(s), beating: s.phase >= 0, phase: s.phase,
});

const LIGHT_BG = '#CBD5E1', DARK_BG = '#2F3E46';
const HEART_RED = new THREE.Color('#8a2c33'), HEART_PALE = new THREE.Color('#b8574f');
const PARTS = instrumentById('langendorff').parts;

export const LangendorffPerfusion: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const [hoverPart, setHoverPart] = useState<string | null>(null);
    const draggingRef = useRef(false);
    const handleHover = useCallback((label: string | null) => { if (!draggingRef.current) setHoveredLabel(label); }, []);
    const handlePart = useCallback((id: string | null) => {
        if (draggingRef.current) return;
        setHoverPart(id);
        setHoveredLabel(id ? PARTS.find(p => p.id === id)?.name ?? null : null);
    }, []);
    const handleKymoPart = useCallback((id: string | null) => { if (!draggingRef.current) setHoveredLabel(id ? KYMO_PARTS[id] ?? 'Kymograph' : null); }, []);
    const noSelect = useCallback(() => { }, []);
    const [quizOpen, setQuizOpen] = useState(false);
    const questionSet = questionSetFor('langendorff');
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d');
    const [soundMuted, setSoundMuted] = useState(false);
    const [sceneBg, setSceneBg] = useState(LIGHT_BG);

    // Set-up
    const [step, setStep] = useState(0);              // index into STEPS; STEPS.length = the experiment
    const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);          // a step's animation is playing
    const [caption, setCaption] = useState<string | null>(null);
    const [o2Started, setO2Started] = useState(false);
    const [heaterOn, setHeaterOn] = useState(false);
    const [sv, setSv] = useState(25);
    const [pv, setPv] = useState(25);
    const [viewId, setViewId] = useState<ViewId>('top');
    const [viewNonce, setViewNonce] = useState(0);
    const setupDone = step >= STEPS.length;
    const doneStep = (id: StepId) => step > stepIndex(id);
    const stepRef = useRef(step);
    stepRef.current = step;
    const animRef = useRef<Anim | null>(null);
    const timers = useRef<number[]>([]);
    const clearTimers = () => { timers.current.forEach(id => clearTimeout(id)); timers.current = []; };
    useEffect(() => () => clearTimers(), []);

    // Experiment
    const [drumOn, setDrumOn] = useState(false);
    const [pressure, setPressure] = useState(0);
    const [oxygen, setOxygen] = useState(true);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [results, setResults] = useState<Partial<Record<RowId, Result>>>({});
    const [lastRow, setLastRow] = useState<RowId | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [syringe, setSyringe] = useState<{ color: string; at: number } | null>(null);

    const simRef = useRef<Sim>(newSim());
    const dataRef = useRef<Sample[]>([]);
    const paperRef = useRef(0);
    const beforeRef = useRef<Partial<Record<RowId, { hr: number; force: number }>>>({});
    const latestRef = useRef<{ hr: number; force: number } | null>(null);
    const motionRef = useRef<LangendorffMotion>({ lift: 0, tilt: 0, fill: 0, thread: 0, hg: 0, perfuse: 0 });
    const shapeRef = useRef<HeartShape>({ scaleY: 1, radial: 1 });
    const penRef = useRef<KymoPen>({ y: 0, on: false });
    const [frame, setFrame] = useState<Frame>(() => frameOf(simRef.current));
    const [, setTick] = useState(0);

    // The kymograph beside the apparatus: 2.5 mm/s, drum right down, turning while the drum is on
    const kymo = useKymograph();
    const { set: setKymo, newPaper } = kymo;
    useEffect(() => { setKymo({ speed: 3, lift: KYMO_LIFT, clutch: true, on: drumOn, leverOn: true }); }, [drumOn, setKymo]);

    const { ensureAudioContext } = useHeartbeatSound({
        isRecording: drumOn,
        phase: frame.phase,
        volume: 0.8,
        muted: soundMuted,
        silent: !frame.beating,
    });

    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(id);
    }, [notice]);
    useEffect(() => {
        if (!syringe) return;
        const id = setTimeout(() => setSyringe(null), 2200);
        return () => clearTimeout(id);
    }, [syringe]);

    // The bath warms up to the set temperature
    useEffect(() => {
        if (pv === sv) return;
        const id = setTimeout(() => setPv(v => (v < sv ? Math.min(sv, Math.round((v + 0.5) * 10) / 10) : Math.max(sv, Math.round((v - 0.5) * 10) / 10))), 90);
        return () => clearTimeout(id);
    }, [pv, sv]);

    const viewRef = useRef<ViewId>('top');
    const goView = (id: ViewId) => { viewRef.current = id; setViewId(id); setViewNonce(n => n + 1); };
    // Once the student moves the camera during an animation, its remaining preset shots are skipped
    const userCamRef = useRef(false);
    const handleUserMove = useCallback(() => { userCamRef.current = true; }, []);
    const shot = (id: ViewId) => { if (!userCamRef.current) goView(id); };
    // Between steps, the camera shows where the next step happens
    useEffect(() => { if (!animRef.current) goView(setupDone ? 'heart' : STEPS[step].view); }, [step, setupDone]);

    const addMark = (text: string, color: string) => {
        if (drumOn) setMarks(prev => [...prev, { x: paperRef.current, text, color }]);
    };

    // --- Set-up actions: each correct step plays its animation, then the next step comes up ---
    const runStep = (fb: { ok: boolean; text: string }) => {
        const st = STEPS[step];
        const s = simRef.current;
        const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
        clearTimers();
        setFeedback(fb);
        setBusy(true);
        animRef.current = { id: st.id, t0: performance.now(), dur: st.dur };
        userCamRef.current = false;
        for (const [ms, v] of st.shots) at(ms, () => shot(v));
        setCaption(null);
        for (const [ms, text] of st.captions ?? []) at(ms, () => setCaption(text));
        if (st.id === 'oxygen') at(1500, () => setO2Started(true));
        if (st.id === 'bath') { at(400, () => setHeaterOn(true)); at(900, () => setSv(37)); }
        if (st.id === 'flow') {
            // The pressure itself is raised smoothly in the loop below; the heart is perfused from the last shot
            at(FLOW.hgTo, () => setPressure(70));
            at(FLOW.revive, () => { simRef.current.flowAt = simRef.current.t; });
        }
        at(st.dur, () => {
            if (st.id === 'flow') simRef.current.p = 70;
            animRef.current = null;
            setBusy(false);
            setCaption(null);
            setStep(i => i + 1);
        });
    };
    const choose = (c: Choice) => {
        if (busy) return;
        if (!c.ok) { setFeedback({ ok: false, text: c.say }); return; }
        runStep({ ok: true, text: c.say });
    };

    const skipSetup = () => {
        clearTimers();
        animRef.current = null;
        setBusy(false);
        const s = simRef.current;
        s.p = 70; s.o2 = true;
        if (s.flowAt === null || !revived(s)) s.flowAt = s.t - REVIVE_MS;
        s.amp = Math.max(s.amp, 0.999); s.rate = 1;
        setPressure(70); setOxygen(true); setO2Started(true); setHeaterOn(true); setSv(37); setPv(37);
        setFeedback(null);
        setCaption(null);
        setStep(STEPS.length);
    };

    // Back to an earlier step: whatever that step and the ones after it did is undone, and the step comes up again
    // Ahead to a later step: every step before it is done at once, without its animation
    const jumpToStep = (i: number) => {
        if (i <= step) return;
        clearTimers();
        animRef.current = null;
        setBusy(false);
        setFeedback(null);
        setCaption(null);
        setNotice(null);
        if (i > stepIndex('oxygen')) { setO2Started(true); setOxygen(true); }
        if (i > stepIndex('bath')) { setHeaterOn(true); setSv(37); setPv(37); }
        if (i > stepIndex('flow')) {
            // Perfused and beating normally at 70 mmHg
            const s = simRef.current;
            s.p = 70; s.o2 = true;
            if (s.flowAt === null || !revived(s)) s.flowAt = s.t - REVIVE_MS;
            s.amp = Math.max(s.amp, 0.999); s.rate = 1;
            setPressure(70);
        }
        setStep(i);
    };

    const goToStep = (i: number) => {
        if (i >= step) return;
        clearTimers();
        animRef.current = null;
        setBusy(false);
        setFeedback(null);
        setCaption(null);
        setNotice(null);
        setSyringe(null);
        setDrumOn(false);
        if (i <= stepIndex('oxygen')) setO2Started(false);
        if (i <= stepIndex('bath')) { setHeaterOn(false); setSv(25); }
        if (i <= stepIndex('flow')) {
            // The heart is no longer perfused (or not yet on the cannula): it is still again
            simRef.current = newSim();
            beforeRef.current = {}; latestRef.current = null;
            setPressure(0); setOxygen(true);
        } else {
            // Only the thread is undone: the heart keeps beating on plain, oxygenated Ringer-Locke
            const s = simRef.current;
            s.agents = []; s.o2 = true; s.p = 70;
            setPressure(70); setOxygen(true);
        }
        setStep(i);
    };

    const newHeart = () => {
        clearTimers();
        animRef.current = null;
        setBusy(false);
        simRef.current = newSim();
        dataRef.current = []; paperRef.current = 0;
        beforeRef.current = {}; latestRef.current = null;
        setDrumOn(false); setMarks([]); setPressure(0); setOxygen(true); setNotice(null); setSyringe(null);
        setO2Started(false); setHeaterOn(false); setSv(25); setPv(25);
        newPaper();
        setFeedback(null);
        setCaption(null);
        setStep(0);
    };

    // --- Experiment actions ---
    const recordedNormal = () => drumOn && paperRef.current > 3000;

    const inject = (id: AgentId) => {
        const s = simRef.current;
        if (!drumOn) return setNotice('Start the drum and record the normal beat first.');
        if (!recordedNormal()) return setNotice('Record a few seconds of normal beats before injecting anything.');
        const afterAtropine = id === 'ach' && s.agents.length === 1 && s.agents[0] === 'atropine' && !s.arrest && s.t - s.agentAt > ONSET_MS + 2000;
        if (!afterAtropine) {
            if (s.agents.length || s.arrest) return setNotice('Wash out the drug with Ringer-Locke and wait for the beats to become normal before the next one.');
            if (!s.o2) return setNotice('Turn the oxygen back on and let the heart recover first.');
            if (s.p < P_LOW || s.p > P_HIGH) return setNotice('Bring the perfusion pressure back to 60–80 mmHg first.');
            if (!isNormal(s)) return setNotice('Wait until the beat has returned to normal.');
        }
        const row: RowId = afterAtropine ? 'achAtropine' : id;
        s.agents = [...s.agents, id];
        s.agentAt = s.t;
        beforeRef.current[row] = { hr: s.hr, force: forceCm(s.beat?.amp ?? s.amp) };
        latestRef.current = null;
        setLastRow(row);
        setSyringe({ color: AGENTS[id].color, at: performance.now() });
        addMark(AGENTS[id].label, AGENTS[id].color);
        // Show the injection, then go back to the view the student had
        const back = viewRef.current;
        userCamRef.current = false;
        goView('inject');
        viewRef.current = back;
        timers.current.push(window.setTimeout(() => { if (viewRef.current === back) shot(back); }, 2300));
    };

    const wash = () => {
        const s = simRef.current;
        if (!s.agents.length) return setNotice('There is no drug to wash out: the heart is on plain Ringer-Locke.');
        s.agents = [];
        addMark('Wash', '#4ade80');
    };

    const changePressure = (delta: number) => {
        const s = simRef.current;
        const next = Math.max(30, Math.min(120, s.p + delta));
        if (next === s.p) return;
        if (s.agents.length || s.arrest || !s.o2) return setNotice('Change the pressure only while the heart beats normally on oxygenated Ringer-Locke.');
        const inBand = (p: number) => p >= P_LOW && p <= P_HIGH;
        if (inBand(s.p) && !inBand(next)) {
            if (!isNormal(s)) return setNotice('Wait until the beat has returned to normal.');
            const row: RowId = next > P_HIGH ? 'pUp' : 'pDown';
            beforeRef.current[row] = { hr: s.hr, force: forceCm(s.beat?.amp ?? s.amp) };
            latestRef.current = null;
            setLastRow(row);
        }
        s.p = next;
        setPressure(next);
        addMark(`${next} mmHg`, '#60a5fa');
    };

    const toggleOxygen = () => {
        const s = simRef.current;
        if (s.o2) {
            if (!drumOn) return setNotice('Start the drum first, so the effect is recorded.');
            if (!isNormal(s)) return setNotice('Stop the oxygen only when the heart is beating normally.');
            s.o2 = false; s.o2OffAt = s.t;
            beforeRef.current.anoxia = { hr: s.hr, force: forceCm(s.beat?.amp ?? s.amp) };
            latestRef.current = null;
            setLastRow('anoxia');
            addMark('O₂ off', '#f97316');
        } else {
            s.o2 = true;
            addMark('O₂ on', '#4ade80');
        }
        setOxygen(s.o2);
    };

    const startDrum = () => { ensureAudioContext(); setFeedback(null); setDrumOn(true); goView('drum'); };
    const stopDrum = () => setDrumOn(false);
    const freshPaper = () => { dataRef.current = []; paperRef.current = 0; setMarks([]); newPaper(); };

    // --- Simulation loop: the heart beats whenever it is perfused; the drum writes only while it turns ---
    const drumRef = useRef(drumOn);
    drumRef.current = drumOn;
    useEffect(() => {
        let raf = 0;
        let last = Date.now();
        let pending = 0;
        const loop = () => {
            const now = Date.now();
            pending += Math.min(500, now - last);
            last = now;
            const s = simRef.current;
            let beats = s.beats, arrest = s.arrest;
            // The lever follows the heart only once the thread from the apex is tied to it
            const tied = stepRef.current > stepIndex('thread') || (progressOf(animRef, 'thread') ?? 0) >= 0.4;
            while (pending >= SAMPLE_INTERVAL) {
                pending -= SAMPLE_INTERVAL;
                stepSim(s, SAMPLE_INTERVAL);
                const shape = shapeOf(s);
                const apexY = HEART_BASE_Y - HEART_LEN * shape.scaleY;
                const lift = apexY - APEX_REST_Y;
                const tilt = tied ? Math.asin(Math.max(-0.3, Math.min(0.9, lift / TIE_CM))) : 0;
                motionRef.current.lift = lift;
                motionRef.current.tilt = tilt;
                shapeRef.current = shape;
                if (drumRef.current) {
                    paperRef.current += SAMPLE_INTERVAL;
                    dataRef.current.push({ x: paperRef.current, y: TIP_CM * Math.sin(tilt) });
                }

                // Fill the table as each new beat begins, or as the heart stops
                const lastAgent = s.agents[s.agents.length - 1];
                const row: RowId | null = s.agents.length && s.t - s.agentAt > ONSET_MS
                    ? (lastAgent === 'ach' && s.agents.includes('atropine') ? 'achAtropine' : lastAgent)
                    : !s.agents.length && !s.o2 ? 'anoxia'
                        : !s.agents.length && s.p > P_HIGH ? 'pUp' : !s.agents.length && s.p < P_LOW && revived(s) ? 'pDown' : null;
                const before = row && beforeRef.current[row];
                if (row && before && (s.beats !== beats || s.arrest !== arrest)) {
                    const note = s.arrest === 'systole' ? 'Stopped in systole' : s.arrest === 'diastole' ? 'Stopped in diastole' : undefined;
                    if (!s.arrest || !latestRef.current) latestRef.current = { hr: s.hr, force: forceCm(s.beat?.amp ?? s.amp) };
                    const result: Result = { beforeHr: before.hr, beforeForce: before.force, ...latestRef.current, note };
                    setResults(prev => ({ ...prev, [row]: result }));
                }
                if (s.arrest && s.arrest !== arrest && drumRef.current) {
                    const x = paperRef.current;
                    setMarks(prev => [...prev, { x, text: s.arrest === 'systole' ? 'Stops in systole' : 'Stops in diastole', color: '#f87171' }]);
                }
                beats = s.beats; arrest = s.arrest;
            }
            // How far the reservoirs are filled and the thread laid, from the set-up and its animations
            const st = stepRef.current;
            motionRef.current.fill = st > stepIndex('fill') ? 1 : progressOf(animRef, 'fill') ?? 0;
            const laid = st > stepIndex('thread') ? 1 : progressOf(animRef, 'thread') ?? 0;
            // The pin goes into the apex first; then the whole thread is there at once, over the pulleys to the lever
            motionRef.current.thread = laid === 0 ? 0 : laid < 0.4 ? 0.004 : 1;
            // Opening the screw clip: the fluid runs down to the cannula, then the pressure rises smoothly to 70 mmHg
            const pf = progressOf(animRef, 'flow');
            if (pf !== null) s.p = Math.round(70 * smooth((pf * FLOW_MS - FLOW.hgFrom) / (FLOW.hgTo - FLOW.hgFrom)));
            motionRef.current.perfuse = st > stepIndex('flow') ? 1
                : pf !== null ? clamp01((pf * FLOW_MS - FLOW.tubeFrom) / (FLOW.tubeTo - FLOW.tubeFrom)) : 0;
            motionRef.current.hg += (s.p - motionRef.current.hg) * 0.08;
            // The writing point, in the kymograph's own frame
            penRef.current.y = leverTipY(motionRef.current.tilt) - BENCH_Y;
            penRef.current.on = drumRef.current && laid >= 1;

            setFrame(frameOf(s));
            setTick(n => (n + 1) % 1000000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // --- What the model shows ---
    const heartStage: HeartStage = doneStep('cannulate') ? 'cannula' : doneStep('transfer') ? 'dish' : doneStep('excise') ? 'held' : 'none';
    const live = useMemo<LangendorffLive>(() => ({
        oxygen: o2Started && oxygen,
        heaterOn,
        pv: pv.toFixed(1), sv: sv.toFixed(1),
        heart: heartStage === 'cannula',
        motion: motionRef,
    }), [o2Started, oxygen, heaterOn, pv, sv, heartStage]);
    const flowAt = simRef.current.flowAt;
    const perfused = heartStage === 'cannula' && flowAt !== null;
    // Blood-red before perfusion, paling over two seconds as Ringer-Locke washes through the coronaries
    const paled = perfused ? clamp01((simRef.current.t - flowAt!) / 2200) : 0;
    const heartColor = perfused && !frame.o2 && !frame.beating ? '#7a3446' : '#' + HEART_RED.clone().lerp(HEART_PALE, paled).getHexString();
    const shownHg = Math.round(motionRef.current.hg);

    // --- Panel text ---
    const heartRate = frame.hr;
    const canInject = drumOn && (frame.normal || (frame.agents.length === 1 && frame.agents[0] === 'atropine' && !frame.arrest));
    const guidance = notice
        ?? (!drumOn ? (dataRef.current.length ? 'Drum stopped. Start it again to go on recording.' : 'Start the drum (2.5 mm/s) and record the normal beat.')
            : frame.arrest ? (frame.agents.length ? `The heart has stopped in ${frame.arrest}. Wash out with Ringer-Locke to revive it.` : `The heart has stopped in ${frame.arrest}. Turn the oxygen on again.`)
                : !frame.o2 ? 'Oxygen stopped. Watch the beats, and turn it on again before the heart is lost.'
                    : frame.agents.length === 2 ? 'Acetylcholine given after atropine. Note whether the beat changes, then wash out.'
                        : frame.agents[0] === 'atropine' ? 'Atropine in the heart. Note the beat, then give acetylcholine on top of it (row 5), or wash out.'
                            : frame.agents.length ? `${AGENTS[frame.agents[0]].label} in the heart. Watch the beat change, then wash out.`
                                : pressure > P_HIGH || pressure < P_LOW ? `Perfusion pressure ${pressure} mmHg. Watch the heart, then bring it back to 60–80 mmHg.`
                                    : !frame.revived ? 'The heart is reviving. Wait for regular beats.'
                                        : !frame.normal ? 'Wait for the beat to return to normal.'
                                            : paperRef.current < 3000 ? 'Recording the normal beat…'
                                                : 'Normal beat recorded. Inject the next agent (Jain\'s order: top left first), change the pressure, or stop the oxygen.');

    const explain = lastRow ? EXPLAIN[lastRow] : null;
    const rows = ROWS.filter(r => results[r]);
    const cur = STEPS[Math.min(step, STEPS.length - 1)];

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 font-sans relative">
            <header className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-slate-900 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} aria-label="Back" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="min-w-0">
                        <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-300 to-rose-400 bg-clip-text text-transparent truncate">Langendorff Perfused Heart</h1>
                        <p className="text-slate-400 text-xs truncate">Mammalian / Isolated rabbit heart: effect of drugs and ions</p>
                    </div>
                </div>
                <button onClick={() => setSceneBg(b => (b === LIGHT_BG ? DARK_BG : LIGHT_BG))}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors" title="Toggle Canvas Background">
                    {sceneBg === LIGHT_BG ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Phone: 3D or record */}
                <div className="lg:hidden flex bg-slate-800 border-b border-slate-700">
                    {([['3d', '3D View', Eye], ['graph', 'Record', LineChart]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setMobileView(id)}
                            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === id
                                ? 'bg-slate-900 text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* 3D */}
                <div className={`flex-1 min-w-0 relative bg-black min-h-[260px] ${mobileView === 'graph' ? 'hidden lg:flex' : 'flex'}`}
                    onPointerDown={() => { draggingRef.current = true; setHoveredLabel(null); setHoverPart(null); }}
                    onPointerUp={() => { draggingRef.current = false; }}
                    onPointerLeave={() => { draggingRef.current = false; }}>
                    <Canvas camera={{ position: [10, 30, 40], fov: 35 }}>
                        <color attach="background" args={[sceneBg]} />
                        <LabEnvironment variant="studio" />
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 8, 6]} intensity={1} />
                        <Bench />
                        <LangendorffApparatus active={hoverPart} onHover={handlePart} onSelect={noSelect} live={live} />
                        <group position={KYMO_AT} rotation={[0, -Math.PI / 2, 0]}>
                            <KymographModel active={null} onHover={handleKymoPart} onSelect={noSelect} kymo={kymo} bare pen={penRef} />
                        </group>
                        <OxygenCylinder anim={animRef} open={o2Started} onHover={handleHover} />
                        <PourFlasks anim={animRef} />
                        <ScrewClip anim={animRef} open={doneStep('flow')} onHover={handleHover} />
                        <PetriDish onHover={handleHover} />
                        <HeartRig stage={heartStage} anim={animRef} shape={shapeRef} color={heartColor}
                            tied={heartStage === 'cannula'} cut={doneStep('pulmonary')} onHover={handleHover} />
                        {perfused && pressure > 0 && <Drips shape={shapeRef} pressure={pressure} />}
                        {syringe && <SyringeModel color={syringe.color} startedAt={syringe.at} />}
                        <OrbitControls makeDefault enablePan screenSpacePanning zoomToCursor />
                        <FitCamera view={VIEWS[viewId]} nonce={viewNonce} onUserMove={handleUserMove} />
                    </Canvas>

                    {hoveredLabel && (
                        <div className="absolute top-3 left-3 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none">
                            {hoveredLabel}
                        </div>
                    )}
                    {busy && (
                        <div className="absolute top-3 right-3 bg-rose-600/90 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 pointer-events-none">
                            <Loader2 className="w-4 h-4 animate-spin" /> {cur.doing}
                        </div>
                    )}

                    {/* What the animation is showing at this moment */}
                    {caption && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-14 w-[min(92%,560px)] bg-slate-900/90 border border-rose-400/50 text-white px-4 py-2.5 rounded-xl text-sm md:text-base font-semibold text-center shadow-lg pointer-events-none">
                            {caption}
                        </div>
                    )}

                    {/* Readings, and views of the apparatus */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
                        <div className="flex flex-wrap gap-1.5">
                            {(doneStep('flow') || (busy && cur.id === 'flow')) && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 flex items-center gap-1 ${shownHg >= P_LOW && shownHg <= P_HIGH ? 'text-sky-300 border-sky-500/60' : 'text-amber-300 border-amber-500/60'}`}>
                                    <Gauge className="w-3.5 h-3.5" /> {shownHg} mmHg
                                </span>
                            )}
                            {heaterOn && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 text-slate-200 border-slate-600 flex items-center gap-1">
                                    <Thermometer className="w-3.5 h-3.5" /> {pv.toFixed(1)} °C
                                </span>
                            )}
                            {o2Started && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 flex items-center gap-1 ${oxygen ? 'text-emerald-300 border-emerald-500/60' : 'text-orange-300 border-orange-500/60'}`}>
                                    <Wind className="w-3.5 h-3.5" /> O₂ {oxygen ? 'on' : 'off'}
                                </span>
                            )}
                            {frame.arrest && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/90 text-white">Stopped in {frame.arrest}</span>}
                        </div>
                        {setupDone && (
                            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900/90 pointer-events-auto">
                                {VIEW_BUTTONS.map(([id, label]) => (
                                    <button key={id} onClick={() => goView(id)}
                                        className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${viewId === id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col flex-1 lg:flex-none min-h-0">
                    {setupDone && (
                        <div className={`h-[42vh] flex-none lg:h-auto lg:flex-1 p-3 lg:p-4 lg:min-h-0 flex-col border-b border-slate-800 ${mobileView === '3d' ? 'hidden lg:flex' : 'flex'}`}>
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Record on the slow drum</h3>
                            <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative min-h-[170px]">
                                <RecordGraph data={dataRef.current} marks={marks} paperT={paperRef.current} running={drumOn} heartRate={heartRate} arrest={frame.arrest} />
                            </div>
                        </div>
                    )}

                    <div className={`p-4 lg:p-5 bg-slate-900 z-10 space-y-3 overflow-y-auto ${setupDone ? 'lg:max-h-[62%]' : 'flex-1'}`}>
                        {/* Steps of the set-up */}
                        <ol className="grid grid-cols-5 gap-x-1.5 gap-y-1 text-[11px] font-bold" aria-label="Set-up steps">
                            {STEPS.map((st, i) => {
                                const state = i < step ? 'done' : i === step ? 'current' : 'later';
                                const look = `flex items-center gap-1 px-1 py-1 rounded-md ${state === 'done' ? 'text-emerald-400' : state === 'current' ? 'text-white bg-slate-800 ring-1 ring-rose-400' : 'text-slate-500'}`;
                                const inner = <>
                                    {state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 text-center shrink-0">{i + 1}</span>}
                                    <span className="truncate">{st.name}</span>
                                </>;
                                return (
                                    <li key={st.id}>
                                        {state === 'done' ? (
                                            // A finished step: go back to it and do it again
                                            <button onClick={() => goToStep(i)} title={`Go back to step ${i + 1} (${st.title})`}
                                                className={`w-full text-left hover:bg-slate-800 hover:text-emerald-300 cursor-pointer transition-colors ${look}`}>
                                                {inner}
                                            </button>
                                        ) : state === 'later' ? (
                                            // A step still to come: jump ahead to it, with the steps before it done
                                            <button onClick={() => jumpToStep(i)} title={`Skip ahead to step ${i + 1} (${st.title})`}
                                                className={`w-full text-left hover:bg-slate-800 hover:text-slate-300 cursor-pointer transition-colors ${look}`}>
                                                {inner}
                                            </button>
                                        ) : <div className={look}>{inner}</div>}
                                    </li>
                                );
                            })}
                            <li>
                                {setupDone ? (
                                    <div className="flex items-center gap-1 px-1 py-1 rounded-md text-white bg-slate-800 ring-1 ring-rose-400">
                                        <span className="w-3.5 text-center shrink-0">10</span><span className="truncate">Record</span>
                                    </div>
                                ) : (
                                    <button onClick={skipSetup} title="Skip ahead to recording, with the set-up done"
                                        className="w-full text-left flex items-center gap-1 px-1 py-1 rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-300 cursor-pointer transition-colors">
                                        <span className="w-3.5 text-center shrink-0">10</span><span className="truncate">Record</span>
                                    </button>
                                )}
                            </li>
                        </ol>

                        {feedback && (
                            <div className={`rounded-lg border p-3 text-sm flex gap-2 ${feedback.ok ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-100' : 'bg-red-950/40 border-red-700/60 text-red-100'}`} aria-live="polite">
                                {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />}
                                <span>{feedback.text}</span>
                            </div>
                        )}

                        {!setupDone ? (
                            <>
                                <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                                    <p className="font-bold text-slate-100">Step {step + 1}. {cur.title}</p>
                                    <p className="text-sm text-slate-300">{busy ? cur.doing : cur.text}</p>
                                </div>
                                {busy ? (
                                    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-rose-200 bg-rose-950/40 border border-rose-800/60 rounded-xl py-3">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Watch the apparatus
                                    </p>
                                ) : cur.choices ? (
                                    <div className="space-y-2">
                                        {cur.choices.map(c => (
                                            <button key={c.label} onClick={() => choose(c)}
                                                className="w-full text-left rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-rose-400/60 px-3 py-2.5 text-sm text-slate-100 transition-colors">
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <button onClick={() => runStep({ ok: true, text: cur.done ?? '' })}
                                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                        <Play className="w-4 h-4 fill-current" /> {cur.action}
                                    </button>
                                )}
                                <button onClick={skipSetup}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                                    <FastForward className="w-4 h-4" /> Skip to the beating heart
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={`rounded-lg border p-3 text-sm ${notice ? 'bg-amber-950/40 border-amber-600/50 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200'}`} aria-live="polite">
                                    {guidance}
                                </div>

                                {/* Heart rate and sound */}
                                <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${heartRate > 0 ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="text-sm text-slate-300">Heart rate</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg font-mono font-bold ${heartRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{heartRate > 0 ? `${heartRate} bpm` : 'Stopped'}</span>
                                        <button onClick={() => { ensureAudioContext(); setSoundMuted(mu => !mu); }}
                                            className={`p-1.5 rounded-lg transition-all border ${soundMuted ? 'bg-slate-700 border-slate-600 text-slate-500' : 'bg-rose-900/40 border-rose-700/50 text-rose-300 hover:bg-rose-900/60'}`}
                                            title={soundMuted ? 'Unmute heartbeat sound' : 'Mute heartbeat sound'}>
                                            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Drum */}
                                <div className="flex gap-2">
                                    {!drumOn ? (
                                        <button onClick={startDrum} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                            <Play className="w-5 h-5" /> Start the drum
                                        </button>
                                    ) : (
                                        <button onClick={stopDrum} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                                            <Square className="w-5 h-5" /> Stop the drum
                                        </button>
                                    )}
                                    <button onClick={freshPaper} disabled={drumOn}
                                        className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-40" title="Fresh smoked paper">
                                        <RefreshCw className="w-4 h-4" /> New sheet
                                    </button>
                                </div>

                                {/* Injections */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                        <Syringe className="w-4 h-4 text-cyan-400" /> Inject into the side tube (Jain's order)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AGENT_ORDER.map(id => {
                                            const a = AGENTS[id];
                                            const active = frame.agents.includes(id);
                                            const allowed = canInject && (!frame.agents.length || id === 'ach');
                                            return (
                                                <button key={id} onClick={() => inject(id)} aria-disabled={!allowed}
                                                    className={`text-left rounded-lg border px-3 py-2 transition-all ${active ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'} ${allowed || active ? '' : 'opacity-50'}`}
                                                    style={{ borderColor: active ? a.color : '#334155' }}>
                                                    <span className="block text-sm font-bold" style={{ color: a.color }}>{a.label}</span>
                                                    <span className="block text-[11px] text-slate-400 leading-tight">{a.dose}</span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={wash} aria-disabled={!frame.agents.length}
                                            className={`col-span-2 text-left rounded-lg border border-emerald-600/60 bg-emerald-950/40 hover:bg-emerald-900/40 px-3 py-2 transition-all ${frame.agents.length ? '' : 'opacity-50'}`}>
                                            <span className="block text-sm font-bold text-emerald-300">Wash out with Ringer-Locke</span>
                                            <span className="block text-[11px] text-slate-400 leading-tight">After each drug, then wait for normal beats</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Pressure and oxygen */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-blue-500/40 bg-slate-800 p-2">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-sky-400" /> Screw clip</p>
                                        <div className="flex items-center justify-between gap-1">
                                            <button onClick={() => changePressure(-10)} aria-label="Close the screw clip a little: lower the pressure" className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-200"><ArrowDown className="w-4 h-4" /></button>
                                            <span className={`font-mono font-bold text-sm ${pressure >= P_LOW && pressure <= P_HIGH ? 'text-sky-200' : 'text-amber-300'}`}>{pressure} mmHg</span>
                                            <button onClick={() => changePressure(10)} aria-label="Open the screw clip more: raise the pressure" className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-200"><ArrowUp className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <button onClick={toggleOxygen}
                                        className={`rounded-lg border p-2 text-left transition-colors ${oxygen ? 'border-orange-500/50 bg-slate-800 hover:bg-slate-700' : 'border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-900/40'}`}>
                                        <span className={`block text-sm font-bold ${oxygen ? 'text-orange-300' : 'text-emerald-300'}`}>{oxygen ? 'Stop the oxygen' : 'Turn oxygen on'}</span>
                                        <span className="block text-[11px] text-slate-400 leading-tight">{oxygen ? 'Effect of anoxaemia' : 'Before the heart stops'}</span>
                                    </button>
                                </div>

                                {/* What was seen, and why */}
                                {explain && results[lastRow!] && (
                                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-1.5">
                                        <p className="font-bold text-slate-100">{ROW_LABEL[lastRow!]}</p>
                                        <p className="text-slate-200"><span className="text-slate-400">Seen: </span>{explain.seen}</p>
                                        <p className="text-slate-200"><span className="text-slate-400">Why: </span>{explain.why}</p>
                                    </div>
                                )}

                                {/* Results, as Jain's Table 68.2 */}
                                {rows.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> Results</label>
                                            <button onClick={() => { setResults({}); setLastRow(null); }} className="text-xs text-slate-400 hover:text-slate-200 underline">Clear</button>
                                        </div>
                                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-800 text-slate-400">
                                                    <tr>
                                                        <th className="text-left font-semibold px-2 py-1.5">Effect of</th>
                                                        <th className="text-right font-semibold px-2 py-1.5">Rate (bpm)</th>
                                                        <th className="text-right font-semibold px-2 py-1.5">Force (cm)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map(r => {
                                                        const x = results[r]!;
                                                        return (
                                                            <tr key={r} className="border-t border-slate-800">
                                                                <td className="px-2 py-1.5 text-slate-200">{ROW_LABEL[r]}{x.note && <span className="block text-red-300">{x.note}</span>}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{x.beforeHr} → {x.hr}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{x.beforeForce.toFixed(1)} → {x.force.toFixed(1)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <button onClick={newHeart}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Set up a new heart
                                </button>
                            </>
                        )}

                        {questionSet && (
                            <button onClick={() => setQuizOpen(true)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl transition-all border border-indigo-500/40 flex items-center justify-center gap-2">
                                <ListChecks className="w-4 h-4" /> Test yourself (MCQs)
                            </button>
                        )}
                    </div>
                </div>
            </main>
            {quizOpen && questionSet && <Quiz set={questionSet} onClose={() => setQuizOpen(false)} />}
        </div>
    );
};
