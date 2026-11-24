import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
    ArrowLeft, Eye, LineChart, Play, Square, Moon, Sun, Activity, ListChecks, Pipette, CheckCircle2, XCircle,
    FastForward, RefreshCw, Wind, Thermometer, Loader2,
} from 'lucide-react';
import { LabEnvironment } from './LabEnvironment';
import { DalesApparatus, DALE_ORGAN, DALE_HOOK, DALE_HOOK_TIP, DALE_PIVOT, DALE_SHORT_ARM, DALE_LONG_ARM, DALE_TIP_X, type DalesLive, type DalesMotion } from './DalesApparatus';
import { KymographModel, useKymograph, type KymoPen } from './Kymograph';
import {
    clamp01, smooth, seg, progressOf, hoverProps, FitCamera, Forceps, PetriDish, LiveThread, RecordGraph, StepList,
    type Anim, type AnimRef, type Hover, type Choice, type View, type Sample, type Mark,
} from './perfusionShared';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// Movements of the isolated rabbit intestine and the effect of drugs and ions.
// Follows GK Pal Ch 73 (printed pp. 489–492) and AK Jain Ch 67 (pp. 319–323): the segment of jejunum hangs in an
// organ bath of Tyrode's solution at 37 °C, aerated slowly, tied below to the curved end of the air tube and above
// to a frontal writing lever that writes on a slow drum: Dale's apparatus, as in Jain Fig. 67.1 and Pal Fig. 73.1.
// Where the books differ, Pal is followed (doses of acetylcholine and barium chloride, the effect of KCl).
// Not from the books: the sizes of the effects.

// --- Agents (Pal p. 490; Jain p. 321 and Table 67.2), in Jain's order ---

type AgentId = 'ach' | 'eserine' | 'adrenaline' | 'atropine' | 'histamine' | 'kcl' | 'cacl2' | 'bacl2';
type RowId = AgentId | 'achAtropine';

interface Agent {
    id: AgentId;
    label: string;
    dose: string;
    color: string;
    tone: number;   // cm the baseline moves (contraction up)
    rate: number;   // where the rate of contraction settles, as a multiple of normal
    amp: number;    // where the height of contraction settles
    rough?: boolean; // violent, irregular contractions
}

const AGENTS: Record<AgentId, Agent> = {
    ach: { id: 'ach', label: 'Acetylcholine', dose: '1 mL of 1 in 10,00,000', color: '#fbbf24', tone: 1.4, rate: 1.3, amp: 1.4 },
    eserine: { id: 'eserine', label: 'Eserine', dose: '0.2 mL (physostigmine)', color: '#fb923c', tone: 0.6, rate: 1.15, amp: 1.4 },
    adrenaline: { id: 'adrenaline', label: 'Adrenaline', dose: '1 mL of 1 in 1,00,000', color: '#f87171', tone: -0.4, rate: 0.4, amp: 0.15 },
    atropine: { id: 'atropine', label: 'Atropine', dose: '1 mL of 0.01%', color: '#a3e635', tone: -0.2, rate: 0.85, amp: 0.7 },
    histamine: { id: 'histamine', label: 'Histamine', dose: '1 mL of 50 µg/mL', color: '#f472b6', tone: 0.7, rate: 1.3, amp: 1.4 },
    kcl: { id: 'kcl', label: 'KCl', dose: '1 mL of 1%', color: '#c084fc', tone: 0.5, rate: 1.15, amp: 1.3 },
    cacl2: { id: 'cacl2', label: 'CaCl₂', dose: '1 mL of 1%', color: '#22d3ee', tone: 0.4, rate: 1, amp: 1.5 },
    bacl2: { id: 'bacl2', label: 'BaCl₂', dose: '1 mL of 2%', color: '#e2e8f0', tone: 1.2, rate: 1.7, amp: 2, rough: true },
};
const AGENT_ORDER: AgentId[] = ['ach', 'eserine', 'adrenaline', 'atropine', 'histamine', 'kcl', 'cacl2', 'bacl2'];

// The rows of Jain's Table 67.3, in his order
const ROWS: RowId[] = ['ach', 'eserine', 'adrenaline', 'atropine', 'achAtropine', 'histamine', 'kcl', 'cacl2', 'bacl2'];
const ROW_LABEL: Record<RowId, string> = {
    ach: 'Acetylcholine', eserine: 'Eserine', adrenaline: 'Adrenaline', atropine: 'Atropine', achAtropine: 'Acetylcholine after atropine',
    histamine: 'Histamine', kcl: '1% KCl', cacl2: '1% CaCl₂', bacl2: '2% BaCl₂',
};

// What is seen and why, in our own words (Pal pp. 490–492; Jain Table 67.2)
const EXPLAIN: Record<RowId, { seen: string; why: string }> = {
    ach: {
        seen: 'The tone rises, and the contractions become larger and more frequent.',
        why: 'Acting on muscarinic receptors it depolarises the smooth muscle, letting in more Na⁺ and Ca²⁺, and through IP₃ it releases calcium inside the cell, so the muscle contracts more.',
    },
    eserine: {
        seen: 'Larger contractions, with a rise in tone.',
        why: 'It inhibits acetylcholinesterase, the enzyme that destroys acetylcholine, so acetylcholine lasts longer and its action is potentiated.',
    },
    adrenaline: {
        seen: 'The intestine relaxes: the tone, the rate and the height of contraction all fall.',
        why: 'It hyperpolarises the muscle. Through β receptors and cyclic AMP it binds Ca²⁺ inside the cell, and through α receptors it increases Ca²⁺ efflux, so less calcium is free for contraction.',
    },
    atropine: {
        seen: 'The movements become a little smaller and slower.',
        why: 'It blocks the muscarinic receptors at which acetylcholine acts. In the isolated gut its effect is smaller than in the living animal.',
    },
    achAtropine: {
        seen: 'No change: the acetylcholine has no effect.',
        why: 'Atropine is holding the muscarinic receptors (competitive inhibition), so the effect of acetylcholine is abolished.',
    },
    histamine: {
        seen: 'The tone rises, and the contractions become larger and more frequent.',
        why: 'It stimulates the gut muscle directly: through H₁ receptors it raises intracellular calcium, through H₂ receptors cyclic AMP. It also facilitates the action of acetylcholine.',
    },
    kcl: {
        seen: 'The movements are stimulated, much as with acetylcholine.',
        why: 'More K⁺ outside the fibres depolarises the smooth muscle membrane, so it contracts more. (This follows Pal; Jain records little change.)',
    },
    cacl2: {
        seen: 'The height of contraction increases, with a rise in tone.',
        why: 'More Ca²⁺ enters the smooth muscle cells and stimulates contraction; calcium causes a tonic contraction.',
    },
    bacl2: {
        seen: 'A marked increase in the frequency and force of contraction: violent, colicky contractions.',
        why: 'Barium acts directly on the intestinal smooth muscle and stimulates it strongly. It is so toxic that it is used as a rat poison.',
    },
};

// --- Intestine model ---

const SAMPLE_INTERVAL = 20;    // ms
const NORMAL_RATE = 14;        // contractions a minute (Jain: 10–20 a minute)
const BASE_TONE = 0.6;         // cm: the baseline of the record
const BASE_AMP = 1.2;          // cm: height of a normal contraction on the record
const ONSET_MS = 1000;
const WINDOW_MS = 60000;       // record shown: the last minute of paper (15 cm at 2.5 mm/s)

interface Sim {
    t: number;
    tone: number;   // cm, above the zero of the record
    rate: number;   // multiple of normal
    amp: number;    // multiple of normal
    rough: number;  // 0..1, how violent and irregular
    agents: AgentId[];
    agentAt: number;
    phase: number;  // of the rhythmic segmental contractions, in cycles
    cycles: number; // contractions begun so far
    slow: number;   // phase of the slow peristaltic waves
    rec: number;    // cm: the height of the writing point on the record
    jitter: number;
}
const newSim = (): Sim => ({ t: 0, tone: BASE_TONE, rate: 1, amp: 1, rough: 0, agents: [], agentAt: 0, phase: 0, cycles: 0, slow: 0, rec: BASE_TONE, jitter: 0 });

const isNormal = (s: Sim) => !s.agents.length && Math.abs(s.tone - BASE_TONE) < 0.03 && Math.abs(s.rate - 1) < 0.02 && Math.abs(s.amp - 1) < 0.03 && s.rough < 0.05;

function stepSim(s: Sim, dt: number) {
    s.t += dt;
    let toneT = BASE_TONE, rateT = 1, ampT = 1, roughT = 0, tau = 4000;
    if (s.agents.length && s.t - s.agentAt > ONSET_MS) {
        for (const id of s.agents) {
            if (id === 'ach' && s.agents.includes('atropine')) continue;   // blocked
            const a = AGENTS[id];
            toneT += a.tone; rateT *= a.rate; ampT *= a.amp; if (a.rough) roughT = 1;
            tau = 2500;
        }
    }
    const k = 1 - Math.exp(-dt / tau);
    s.tone += (toneT - s.tone) * k;
    s.rate += (rateT - s.rate) * k;
    s.amp += (ampT - s.amp) * k;
    s.rough += (roughT - s.rough) * k;
    // Rhythmic segmental contractions, with the slow peristaltic waves riding on them
    const before = Math.floor(s.phase);
    s.phase += (dt / 60000) * NORMAL_RATE * s.rate * (1 + s.rough * 0.4 * Math.sin(s.t / 700));
    if (Math.floor(s.phase) !== before) { s.cycles++; s.jitter = s.rough * (Math.random() - 0.5); }
    s.slow += dt / 22000;
    const f = s.phase % 1;
    const wave = Math.pow(Math.sin(Math.PI * f), 2.2);   // a contraction, then relaxation
    const peristalsis = 0.22 * Math.max(0, Math.sin(2 * Math.PI * s.slow));
    s.rec = s.tone + BASE_AMP * s.amp * (wave * (1 + s.jitter * 0.6) + peristalsis) + (Math.random() - 0.5) * 0.03;
}

const rateNow = (s: Sim) => Math.round(NORMAL_RATE * s.rate);
const ampCm = (s: Sim) => Math.round(BASE_AMP * s.amp * 10) / 10;
const toneCm = (s: Sim) => Math.round(s.tone * 10) / 10;

// --- Layout (cm; the top of the apparatus's base plate is y = 0) ---
// The left inner tube of the bath is the organ bath. The segment hangs in it, its lower end tied to the curved end
// of the air tube, its upper end tied by a thread to a frontal writing lever above the bath. The lever writes on the
// E-8 drum, which stands on a raised stand to the left so that its paper is level with the writing point.
const ORGAN = { x: DALE_ORGAN.x, z: DALE_ORGAN.z };
const SEG_BASE = DALE_HOOK;
const SEG_LEN = 3.5;                                 // cm (Jain: segments of 2–3 cm; Pal: about 5 cm)
const FLUID_TOP_Y = DALE_ORGAN.fluidTop;
const PIVOT = DALE_PIVOT;
const SHORT_ARM = DALE_SHORT_ARM, LONG_ARM = DALE_LONG_ARM;
const TIP_X = DALE_TIP_X;
const KYMO_LIFT = 9;                                 // the drum raised on its screw lift to the height of the lever
const KYMO_AT: [number, number, number] = [TIP_X - 7.56, 0, ORGAN.z];
const DISH_AT: [number, number, number] = [-6, 0, 17];
const PIPETTE_AT: [number, number, number] = [ORGAN.x + 0.5, 41.5, ORGAN.z + 0.4];
const REST_REC = BASE_TONE;                          // record height at which the lever is level
const KYMO_PARTS: Record<string, string> = {
    base: 'Kymograph (E-8 recording drum)', speed: 'Speed lever, set to 2.5 mm/s', switch: 'Mains switch of the kymograph',
    clutch: 'Neutralising clutch', contact: 'Time contact', spindle: 'Spindle of the drum', lift: 'Screw lift of the drum',
    drum: 'Recording drum', paper: 'Smoked paper on the drum',
};
const PART_NAMES: Record<string, string> = {
    stand: 'Stand of Dale\'s apparatus', bath: 'Perspex bath of water at 37 °C', organ: 'Central glass organ bath (20 mL) of Tyrode\'s solution',
    airtube: 'Hollow bent glass tube: air inlet, holding the intestine', rods: 'Rods and clamps', lever: 'Frontal writing lever',
    heater: 'Heating element with thermostat', stirrer: 'Stirrer', thermometer: 'Thermometer', outlet: 'Outlet for Tyrode\'s solution, with clip',
};

// --- 3D: the segment of intestine and what handles it ---

const RINGS = 8;
interface GutShape { rings: number[]; len: number }   // radius of each ring (fraction), length (fraction)

// The segment, as in Jain's Fig. 67.1: a thin, wrinkled, slightly bent strip of orange-red jejunum. Its wall is
// rebuilt every frame: each part of it narrows as the rhythmic segmental contractions pass, and the whole segment
// shortens as the tone rises. Its origin is its lower end; it stands up along +y.
const SEG_R = 0.34, TUB = 56, RAD = 12;
const SEG_CURVE = new THREE.CatmullRomCurve3([
    [0, 0, 0], [0.12, 0.7, 0.05], [-0.1, 1.4, -0.04], [0.1, 2.1, 0.04], [-0.06, 2.8, -0.02], [0, SEG_LEN, 0],
].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
const Segment = ({ shape }: { shape: React.MutableRefObject<GutShape> }) => {
    const { geo, centers, offsets } = useMemo(() => {
        const g = new THREE.TubeGeometry(SEG_CURVE, TUB, SEG_R, RAD, false);
        const pos = g.attributes.position as THREE.BufferAttribute;
        const c: THREE.Vector3[] = [], o: THREE.Vector3[] = [];
        for (let i = 0; i <= TUB; i++) {
            const centre = SEG_CURVE.getPointAt(i / TUB);
            for (let k = 0; k <= RAD; k++) {
                const idx = i * (RAD + 1) + k;
                // Wrinkles: the wall is a little uneven, more so round its length than along it
                const bump = 1 + 0.1 * Math.sin(i * 1.3) + 0.06 * Math.sin(i * 3.1 + k * 1.7) + 0.05 * Math.cos(k * 2.1 + i * 0.7);
                c.push(centre);
                o.push(new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)).sub(centre).multiplyScalar(bump));
            }
        }
        return { geo: g, centers: c, offsets: o };
    }, []);
    useFrame(() => {
        const sh = shape.current;
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i <= TUB; i++) {
            // Narrowing here: from the ring of the contraction pattern at this height
            const r = (i / TUB) * (RINGS - 1);
            const a = Math.floor(r), f = r - a;
            const narrow = sh.rings[a] * (1 - f) + sh.rings[Math.min(RINGS - 1, a + 1)] * f;
            for (let k = 0; k <= RAD; k++) {
                const idx = i * (RAD + 1) + k, c = centers[idx], o = offsets[idx];
                pos.setXYZ(idx, c.x + o.x * narrow, c.y * sh.len + o.y * narrow, c.z + o.z * narrow);
            }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    });
    return (
        <group>
            <mesh geometry={geo}><meshStandardMaterial color="#e0441c" emissive="#8a2208" emissiveIntensity={0.6} roughness={0.55} side={THREE.DoubleSide} /></mesh>
            {/* The cut ends, closed off, and the thread loops through the wall near each end */}
            {[0, 1].map(e => <mesh key={e} position={[0, e * SEG_LEN, 0]}><sphereGeometry args={[SEG_R * 0.95, 12, 8]} /><meshStandardMaterial color="#d23c18" emissive="#7a1d06" emissiveIntensity={0.5} roughness={0.6} /></mesh>)}
            {[0.2, SEG_LEN - 0.2].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[SEG_R + 0.06, 0.03, 6, 18]} /><meshBasicMaterial color="#f8fafc" /></mesh>)}
        </group>
    );
};

type GutStage = 'none' | 'held' | 'dish' | 'organ';
const HELD_HIGH = new THREE.Vector3(DISH_AT[0], 17, DISH_AT[2]);
const HELD = new THREE.Vector3(DISH_AT[0], 6.5, DISH_AT[2]);
const IN_DISH = new THREE.Vector3(DISH_AT[0] - 1.5, 1.0, DISH_AT[2] + 0.4);
const ABOVE_ORGAN = new THREE.Vector3(SEG_BASE[0], 39.5, SEG_BASE[2] + 3.5);   // in front of the lever, just above the rim
const IN_ORGAN = new THREE.Vector3(...SEG_BASE);
const LYING = new THREE.Euler(0, 0.4, Math.PI / 2);
const UPRIGHT = new THREE.Euler(0, 0, 0);
const lerpEuler = (a: THREE.Euler, b: THREE.Euler, t: number) => new THREE.Euler(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

const GutRig = ({ stage, anim, shape, onHover }: { stage: GutStage; anim: AnimRef; shape: React.MutableRefObject<GutShape>; onHover: Hover }) => {
    const gut = useRef<THREE.Group>(null);
    const forceps = useRef<THREE.Group>(null);
    const tie = useRef<THREE.Group>(null);
    const syringe = useRef<THREE.Group>(null);
    const spray = useRef<THREE.Group>(null);
    const tmp = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        const g = gut.current;
        if (!g) return;
        let pos = IN_ORGAN, rot = UPRIGHT, held = false, visible = stage !== 'none';
        const ps = progressOf(anim, 'segment'), pr = progressOf(anim, 'rinse'), pm = progressOf(anim, 'mount');
        if (ps !== null) {
            // Brought over the dish and laid in the Tyrode's solution
            visible = true; held = ps < 0.85;
            if (ps < 0.5) pos = HELD_HIGH.clone().lerp(HELD, smooth(ps / 0.5));
            else { const q = smooth(seg(ps, 0.5, 0.85)); pos = HELD.clone().lerp(IN_DISH, q); rot = lerpEuler(UPRIGHT, LYING, q); }
        } else if (pm !== null) {
            // Lifted out of the dish, carried over the bath and lowered into the organ bath
            visible = true; held = pm < 0.9;
            if (pm < 0.15) { const q = smooth(pm / 0.15); pos = IN_DISH.clone().lerp(HELD, q); rot = lerpEuler(LYING, UPRIGHT, q); }
            else if (pm < 0.65) { const q = smooth(seg(pm, 0.15, 0.65)); pos = HELD.clone().lerp(ABOVE_ORGAN, q); pos.y += Math.sin(q * Math.PI) * 5; }
            else pos = ABOVE_ORGAN.clone().lerp(IN_ORGAN, smooth(seg(pm, 0.65, 0.9)));
        } else if (stage === 'held') { held = true; pos = HELD; }
        else if (stage === 'dish') { pos = IN_DISH; rot = LYING; }
        g.visible = visible;
        if (tie.current) tie.current.visible = (stage === 'organ' && pm === null) || (pm !== null && pm > 0.88);
        g.position.copy(pos);
        g.rotation.copy(rot);
        g.updateMatrixWorld();
        if (forceps.current) {
            forceps.current.visible = visible && held;
            g.localToWorld(tmp.set(0, SEG_LEN - 0.1, 0));
            forceps.current.position.copy(tmp);
        }
        // Rinsing: a syringe at one end pushes Tyrode's solution through the lumen and out of the other end
        if (syringe.current) {
            syringe.current.visible = pr !== null;
            if (pr !== null) {
                g.localToWorld(tmp.set(0, -0.2, 0));
                const away = 1 - smooth(seg(pr, 0, 0.2)) + smooth(seg(pr, 0.85, 1));
                syringe.current.position.set(tmp.x - 0.2 - away * 3, tmp.y + 0.15, tmp.z);
            }
        }
        if (spray.current) {
            spray.current.visible = pr !== null && pr > 0.25 && pr < 0.85;
            if (pr !== null) {
                g.localToWorld(tmp.set(0, SEG_LEN + 0.1, 0));
                spray.current.children.forEach((c, i) => {
                    const q = ((pr * 6 + i / 5) % 1);
                    c.position.set(tmp.x + q * 2.2, tmp.y + Math.sin(q * Math.PI) * 0.5, tmp.z);
                });
            }
        }
    });
    return (
        <group>
            <group ref={gut} {...hoverProps(onHover, stage === 'organ' ? 'Segment of jejunum in the organ bath' : 'Segment of jejunum')}>
                <Segment shape={shape} />
            </group>
            <group ref={forceps} visible={false}><Forceps /></group>
            {/* Thread loop through the wall near the lower end, tied to the curved end of the glass tube (Jain) */}
            <group ref={tie} visible={false}>
                <LiveThread ends={() => [[DALE_HOOK_TIP[0], DALE_HOOK_TIP[1], DALE_HOOK_TIP[2] + 0.08], [SEG_BASE[0], SEG_BASE[1] + 0.2, SEG_BASE[2] + 0.1]]} r={0.03} />
                <LiveThread ends={() => [[DALE_HOOK_TIP[0], DALE_HOOK_TIP[1], DALE_HOOK_TIP[2] - 0.08], [SEG_BASE[0], SEG_BASE[1] + 0.2, SEG_BASE[2] - 0.1]]} r={0.03} />
                <mesh position={DALE_HOOK_TIP} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.24, 0.03, 6, 14]} /><meshBasicMaterial color="#f8fafc" /></mesh>
            </group>
            <group ref={syringe} visible={false} rotation={[0, 0, Math.PI / 2]}>
                <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.4, 0.4, 3.6, 16, 1, true]} /><meshPhysicalMaterial color="#f8fafc" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} /></mesh>
                <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.06, 0.15, 0.5, 8]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.34, 0.34, 3, 12]} /><meshStandardMaterial color="#3b9eea" transparent opacity={0.7} /></mesh>
                <mesh position={[0, 4.4, 0]}><cylinderGeometry args={[0.55, 0.55, 0.15, 14]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
            </group>
            <group ref={spray} visible={false}>
                {[0, 1, 2, 3, 4].map(i => <mesh key={i}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#3b9eea" transparent opacity={0.85} /></mesh>)}
            </group>
        </group>
    );
};

// Pipette that adds a drug to the organ bath, its drops falling into the Tyrode's solution
const PipetteModel = ({ color, startedAt }: { color: string; startedAt: number }) => {
    const drop = useRef<THREE.Mesh>(null);
    useFrame(() => {
        const t = (performance.now() - startedAt) / 1000;
        if (drop.current) { const p = (t * 1.6) % 1; drop.current.position.y = -0.3 - p * (PIPETTE_AT[1] - FLUID_TOP_Y); drop.current.visible = t > 0.3 && t < 1.8; }
    });
    return (
        <group position={PIPETTE_AT} rotation={[0, 0, 0.12]}>
            <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.18, 0.18, 6, 10, 1, true]} /><meshPhysicalMaterial color="#f8fafc" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} /></mesh>
            <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.14, 0.14, 2.4, 10]} /><meshStandardMaterial color={color} transparent opacity={0.8} /></mesh>
            <mesh position={[0, 6.5, 0]}><sphereGeometry args={[0.45, 14, 10]} /><meshStandardMaterial color="#b91c1c" roughness={0.7} /></mesh>
            <mesh ref={drop}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color={color} /></mesh>
        </group>
    );
};

// The bench
const Bench = () => (
    <mesh position={[-10, -1.5, 3]}><boxGeometry args={[110, 3, 52]} /><meshStandardMaterial color="#7c6248" roughness={0.85} /></mesh>
);

// --- Camera views ---

type ViewId = 'bath' | 'organ' | 'organTop' | 'panel' | 'dish' | 'dishClose' | 'lever' | 'drum' | 'whole';
const VIEWS: Record<ViewId, View> = {
    bath: { center: [0, 32, 0], halfW: 20, halfH: 16, from: [0.2, 0.15, 1] },
    organ: { center: [ORGAN.x + 0.3, 33.5, ORGAN.z], halfW: 5, halfH: 6.5, from: [0.12, 0.06, 1] },
    organTop: { center: [ORGAN.x + 0.3, 36, ORGAN.z + 3], halfW: 10, halfH: 11, from: [0.2, 0.22, 1] },
    panel: { center: [6, 30, 3], halfW: 16, halfH: 14, from: [0.35, 0.2, 1] },
    dish: { center: [DISH_AT[0], 7, DISH_AT[2]], halfW: 11, halfH: 12, from: [0.2, 0.35, 1] },
    dishClose: { center: [DISH_AT[0] - 0.5, 1.6, DISH_AT[2] + 0.5], halfW: 7, halfH: 6, from: [0.25, 0.9, 1] },
    lever: { center: [-12, 38, 2], halfW: 24, halfH: 14, from: [0.12, 0.15, 1] },
    // The drum turns clockwise seen from above: the paper under the writing point (on its right, facing the lever)
    // runs towards the front, so the fresh record is seen from in front
    drum: { center: [KYMO_AT[0] + 3, PIVOT[1], KYMO_AT[2] + 2], halfW: 15, halfH: 11, from: [0.4, 0.15, 1] },
    whole: { center: [-12, 26, 0], halfW: 34, halfH: 28, from: [0.25, 0.2, 1] },
};
const VIEW_BUTTONS: [ViewId, string][] = [['organ', 'Intestine'], ['lever', 'Lever'], ['drum', 'Drum'], ['whole', 'Whole set']];

// --- Set-up (Pal pp. 489–490; Jain p. 321) ---

type StepId = 'fill' | 'warm' | 'air' | 'segment' | 'rinse' | 'mount' | 'lever';
interface Step { id: StepId; name: string; title: string; text: string; view: ViewId; choices?: Choice[]; action?: string; done?: string; dur: number; shots: [number, ViewId][]; doing: string }

const STEPS: Step[] = [
    {
        id: 'fill', name: 'Fill', title: 'Fill the organ bath', view: 'organ', dur: 3000, shots: [[0, 'organ']], doing: 'Filling the organ bath…',
        text: 'The central organ bath (20 mL) is filled, and the outer bath with water. Which fluid goes into the organ bath?',
        choices: [
            { label: 'Tyrode\'s solution, freshly prepared', ok: true, say: 'Right. Tyrode\'s solution is used fresh: it keeps the segment isotonic, supplies glucose, and holds the pH at 7.4–7.6.' },
            { label: 'Tyrode\'s solution made a week ago', ok: false, say: 'Only freshly prepared Tyrode\'s solution is used (Jain).' },
            { label: '0.9% sodium chloride alone', ok: false, say: 'Saline alone lacks the potassium, calcium, magnesium, glucose and buffers of Tyrode\'s solution that keep the intestine working.' },
        ],
    },
    {
        id: 'warm', name: 'Warm', title: 'Warm the bath', view: 'panel', dur: 3500, shots: [[0, 'panel']], doing: 'Switching on the heater…',
        text: 'The outer bath has a heating element and a thermostat. At what temperature is it kept?',
        choices: [
            { label: '30 °C', ok: false, say: 'Too cool. The water is kept at body temperature, about 37 °C, and checked often.' },
            { label: '37 °C', ok: true, say: 'Right: body temperature, checked often during the experiment.' },
            { label: '42 °C', ok: false, say: 'Too warm. The water is kept at about 37 °C.' },
        ],
    },
    {
        id: 'air', name: 'Air', title: 'Aerate the Tyrode\'s solution', view: 'organ', dur: 3000, shots: [[0, 'organ']], doing: 'Opening the air supply…',
        text: 'Air (or oxygen) is passed through the hollow bent glass tube into the organ bath. How fast?',
        choices: [
            { label: 'Slowly, 2–3 bubbles a second', ok: true, say: 'Right. Air or oxygen is supplied slowly, all through the experiment.' },
            { label: 'A brisk, continuous stream', ok: false, say: 'Pal and Jain aerate slowly, about 2–3 bubbles a second, throughout.' },
        ],
    },
    {
        id: 'segment', name: 'Segment', title: 'Take out a segment', view: 'dish', dur: 2800, shots: [[0, 'dish']], doing: 'Placing the segment in Tyrode\'s solution…',
        text: 'A rabbit fasted overnight is stunned and the abdomen opened. Which part of the gut is taken?',
        choices: [
            { label: 'Segments of jejunum, 2–3 cm long, close to the duodenum', ok: true, say: 'Right. Duodenal or jejunal segments work well. They go at once into Tyrode\'s solution in a petri dish.' },
            { label: 'A piece of the colon', ok: false, say: 'The small intestine is used: segments of jejunum close to the duodenum, which work well.' },
        ],
    },
    {
        id: 'rinse', name: 'Rinse', title: 'Rinse the lumen', view: 'dishClose', dur: 2800, shots: [[0, 'dishClose']], doing: 'Rinsing the lumen with Tyrode\'s solution…',
        text: 'Rinse the lumen of the segment by gently pushing Tyrode\'s solution through it from a syringe.',
        action: 'Rinse the lumen', done: 'The lumen is clear and open. Rinse quickly: the segment must not be mishandled.',
    },
    {
        id: 'mount', name: 'Mount', title: 'Mount the segment', view: 'dish', dur: 4600, shots: [[0, 'dish'], [1000, 'organTop'], [3900, 'organ']], doing: 'Mounting the segment in the organ bath…',
        text: 'Threads are passed through the wall near each end. How is the segment mounted?',
        choices: [
            { label: 'Loop near one end tied to the curved end of the glass tube; a long thread at the other end', ok: true, say: 'Right. The lumen stays open, and the long thread will go to the lever.' },
            { label: 'Thread tied tightly round the middle, closing the lumen', ok: false, say: 'The lumen must stay patent. If it is obstructed, the peristaltic contractions disappear and only the segmental ones are recorded.' },
        ],
    },
    {
        id: 'lever', name: 'Lever', title: 'Attach the frontal lever', view: 'organTop', dur: 3200, shots: [[0, 'organTop'], [2300, 'lever']], doing: 'Tying the thread to the frontal lever…',
        text: 'Tie the long thread to the frontal writing lever. How tight?',
        choices: [
            { label: 'Just taut, without stretching the segment', ok: true, say: 'Right. The lever now follows the movements. Start the drum at its slowest speed (2.5 mm/s).' },
            { label: 'Pulled hard, stretching the segment', ok: false, say: 'Excessive stretch is avoided: stretching raises the tone and amplitude only up to an optimal length; beyond it the response falls.' },
        ],
    },
];
const stepIndex = (id: StepId) => STEPS.findIndex(s => s.id === id);

// --- Main component ---

interface Values { tone: number; rate: number; amp: number }
interface Result { before: Values; after: Values }
interface Frame { normal: boolean; agents: AgentId[]; rate: number }
const frameOf = (s: Sim): Frame => ({ normal: isNormal(s), agents: [...s.agents], rate: rateNow(s) });
const valuesOf = (s: Sim): Values => ({ tone: toneCm(s), rate: rateNow(s), amp: ampCm(s) });
const arrow = (a: number, b: number) => (b > a * 1.08 + 0.05 ? '↑' : b < a * 0.92 - 0.05 ? '↓' : '–');

const LIGHT_BG = '#CBD5E1', DARK_BG = '#2F3E46';

export const IsolatedIntestine: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const [hoverPart, setHoverPart] = useState<string | null>(null);
    const draggingRef = useRef(false);
    const handleHover = useCallback((label: string | null) => { if (!draggingRef.current) setHoveredLabel(label); }, []);
    const handlePart = useCallback((id: string | null) => {
        if (draggingRef.current) return;
        setHoverPart(id);
        setHoveredLabel(id ? PART_NAMES[id] ?? null : null);
    }, []);
    const handleKymoPart = useCallback((id: string | null) => { if (!draggingRef.current) setHoveredLabel(id ? KYMO_PARTS[id] ?? 'Kymograph' : null); }, []);
    const noSelect = useCallback(() => { }, []);
    const [quizOpen, setQuizOpen] = useState(false);
    const questionSet = questionSetFor('intestine');
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d');
    const [sceneBg, setSceneBg] = useState(DARK_BG);   // the apparatus reads best on the dark background

    // Set-up
    const [step, setStep] = useState(0);
    const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [heaterOn, setHeaterOn] = useState(false);
    const [air, setAir] = useState(false);
    const [sv, setSv] = useState(25);
    const [pv, setPv] = useState(25);
    const [viewId, setViewId] = useState<ViewId>('whole');
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
    const [marks, setMarks] = useState<Mark[]>([]);
    const [results, setResults] = useState<Partial<Record<RowId, Result>>>({});
    const [lastRow, setLastRow] = useState<RowId | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pipette, setPipette] = useState<{ color: string; at: number } | null>(null);

    const simRef = useRef<Sim>(newSim());
    const dataRef = useRef<Sample[]>([]);
    const paperRef = useRef(0);
    const beforeRef = useRef<Partial<Record<RowId, Values>>>({});
    const levelRef = useRef(0);            // how full the organ bath is (0..1)
    const drainRef = useRef<number | null>(null);   // when a drain and refill began
    const tiltRef = useRef(0);
    const shapeRef = useRef<GutShape>({ rings: Array(RINGS).fill(1), len: 1 });
    const penRef = useRef<KymoPen>({ y: 0, on: false });
    const motionRef = useRef<DalesMotion>({ tilt: 0, level: 0 });
    const [frame, setFrame] = useState<Frame>(() => frameOf(simRef.current));
    const [, setTick] = useState(0);

    const kymo = useKymograph();
    const { set: setKymo, newPaper } = kymo;
    useEffect(() => { setKymo({ speed: 3, lift: KYMO_LIFT, clutch: true, on: drumOn, leverOn: true }); }, [drumOn, setKymo]);

    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(id);
    }, [notice]);
    useEffect(() => {
        if (!pipette) return;
        const id = setTimeout(() => setPipette(null), 2200);
        return () => clearTimeout(id);
    }, [pipette]);
    // The bath warms to the set temperature
    useEffect(() => {
        if (pv === sv) return;
        const id = setTimeout(() => setPv(v => (v < sv ? Math.min(sv, Math.round((v + 0.5) * 10) / 10) : Math.max(sv, Math.round((v - 0.5) * 10) / 10))), 90);
        return () => clearTimeout(id);
    }, [pv, sv]);

    const viewRef = useRef<ViewId>('whole');
    const goView = (id: ViewId) => { viewRef.current = id; setViewId(id); setViewNonce(n => n + 1); };
    const userCamRef = useRef(false);
    const handleUserMove = useCallback(() => { userCamRef.current = true; }, []);
    const shot = (id: ViewId) => { if (!userCamRef.current) goView(id); };
    // The student first sees the whole apparatus; the camera moves in close once the set-up is under way
    useEffect(() => {
        if (step === 0) return;
        if (!animRef.current) goView(setupDone ? 'organ' : STEPS[step].view);
    }, [step, setupDone]);
    // During the set-up: the whole apparatus, or a close view of where the current step happens
    const viewButtons: [ViewId, string][] = setupDone ? VIEW_BUTTONS : [['whole', 'Whole set'], [STEPS[Math.min(step, STEPS.length - 1)].view, 'This step']];

    const addMark = (text: string, color: string) => { if (drumOn) setMarks(prev => [...prev, { x: paperRef.current, text, color }]); };

    // --- Set-up actions ---
    const runStep = (fb: { ok: boolean; text: string }) => {
        const st = STEPS[step];
        const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
        clearTimers();
        setFeedback(fb);
        setBusy(true);
        userCamRef.current = false;
        animRef.current = { id: st.id, t0: performance.now(), dur: st.dur };
        for (const [ms, v] of st.shots) at(ms, () => shot(v));
        if (st.id === 'warm') { at(300, () => setHeaterOn(true)); at(700, () => setSv(37)); }
        if (st.id === 'air') at(800, () => setAir(true));
        at(st.dur, () => { animRef.current = null; setBusy(false); setStep(i => i + 1); });
    };
    const choose = (c: Choice) => {
        if (busy) return;
        if (!c.ok) { setFeedback({ ok: false, text: c.say }); return; }
        runStep({ ok: true, text: c.say });
    };
    const resetPrep = () => { simRef.current = newSim(); beforeRef.current = {}; };
    const skipSetup = () => {
        clearTimers(); animRef.current = null; setBusy(false);
        setHeaterOn(true); setSv(37); setPv(37); setAir(true); setFeedback(null);
        setStep(STEPS.length);
    };
    const jumpToStep = (i: number) => {
        if (i <= step) return;
        clearTimers(); animRef.current = null; setBusy(false); setFeedback(null); setNotice(null);
        if (i > stepIndex('warm')) { setHeaterOn(true); setSv(37); setPv(37); }
        if (i > stepIndex('air')) setAir(true);
        setStep(i);
    };
    const goToStep = (i: number) => {
        if (i >= step) return;
        clearTimers(); animRef.current = null; setBusy(false); setFeedback(null); setNotice(null); setPipette(null);
        setDrumOn(false);
        if (i <= stepIndex('warm')) { setHeaterOn(false); setSv(25); }
        if (i <= stepIndex('air')) setAir(false);
        if (i <= stepIndex('mount')) resetPrep();
        else { simRef.current.agents = []; }
        setStep(i);
    };
    const newPreparation = () => {
        clearTimers(); animRef.current = null; setBusy(false);
        resetPrep();
        dataRef.current = []; paperRef.current = 0;
        setDrumOn(false); setMarks([]); setNotice(null); setPipette(null);
        setHeaterOn(false); setAir(false); setSv(25); setPv(25);
        newPaper();
        setFeedback(null);
        setStep(0);
    };

    // --- Experiment actions ---
    const addDrug = (id: AgentId) => {
        const s = simRef.current;
        if (!drumOn) return setNotice('Start the drum and record the normal movements first.');
        if (paperRef.current < 12000) return setNotice('Record the normal movements for a little longer before adding anything.');
        if (drainRef.current !== null) return setNotice('Wait for the organ bath to be refilled.');
        const afterAtropine = id === 'ach' && s.agents.length === 1 && s.agents[0] === 'atropine' && s.t - s.agentAt > ONSET_MS + 3000;
        if (!afterAtropine) {
            if (s.agents.length) return setNotice('Drain the organ bath and refill it with fresh Tyrode\'s solution first, then wait for normal movements.');
            if (!isNormal(s)) return setNotice('Wait until the movements are normal again before the next drug.');
        }
        const row: RowId = afterAtropine ? 'achAtropine' : id;
        beforeRef.current[row] = valuesOf(s);
        s.agents = [...s.agents, id];
        s.agentAt = s.t;
        setLastRow(row);
        setPipette({ color: AGENTS[id].color, at: performance.now() });
        addMark(AGENTS[id].label, AGENTS[id].color);
        const back = viewRef.current;
        userCamRef.current = false;
        goView('organ');
        viewRef.current = back;
        timers.current.push(window.setTimeout(() => { if (viewRef.current === back) shot(back); }, 2300));
    };
    const wash = () => {
        const s = simRef.current;
        if (!s.agents.length) return setNotice('There is no drug in the bath: it holds fresh Tyrode\'s solution.');
        if (drainRef.current !== null) return;
        drainRef.current = performance.now();
        s.agents = [];
        addMark('Wash', '#4ade80');
    };

    const startDrum = () => { setFeedback(null); setDrumOn(true); goView('drum'); };
    const stopDrum = () => setDrumOn(false);
    const freshPaper = () => { dataRef.current = []; paperRef.current = 0; setMarks([]); newPaper(); };

    // --- Loop: the intestine moves once it is mounted; the drum writes only while it turns ---
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
            const st = stepRef.current;
            const mounted = st > stepIndex('mount');
            const tied = st > stepIndex('lever') || (progressOf(animRef, 'lever') ?? 0) >= 0.4;
            let cycles = s.cycles;
            while (pending >= SAMPLE_INTERVAL) {
                pending -= SAMPLE_INTERVAL;
                stepSim(s, SAMPLE_INTERVAL);
                const rel = tied ? s.rec - REST_REC : 0;
                const tilt = Math.asin(Math.max(-0.5, Math.min(0.5, rel / LONG_ARM)));
                tiltRef.current = tilt;
                if (drumRef.current) {
                    paperRef.current += SAMPLE_INTERVAL;
                    dataRef.current.push({ x: paperRef.current, y: s.rec });
                }
                // The table: the latest contraction under each drug, against the movements before it
                if (s.cycles !== cycles && s.agents.length && s.t - s.agentAt > ONSET_MS + 2000) {
                    const lastAgent = s.agents[s.agents.length - 1];
                    const row: RowId = lastAgent === 'ach' && s.agents.includes('atropine') ? 'achAtropine' : lastAgent;
                    const before = beforeRef.current[row];
                    if (before) { const after = valuesOf(s); setResults(prev => ({ ...prev, [row]: { before, after } })); }
                }
                cycles = s.cycles;
            }
            // The segment: rings narrowing in turn, shortening as the tone and the contraction rise
            const f = s.phase % 1;
            const contr = Math.max(0, (s.rec - BASE_TONE * 0.5) / (BASE_AMP * 2.5));
            shapeRef.current = {
                len: mounted ? 1 - 0.12 * clamp01(contr) : 1,
                rings: Array.from({ length: RINGS }, (_, i) => mounted
                    ? 1 - 0.28 * s.amp * Math.max(0, Math.sin(2 * Math.PI * (f + (i % 2) * 0.5))) * 0.6 - 0.08 * clamp01(s.tone - BASE_TONE)
                    : 1),
            };
            // Organ bath level: filled in step 1, drained and refilled on washing
            const pfill = progressOf(animRef, 'fill');
            let level = st > stepIndex('fill') ? 1 : pfill ?? 0;
            if (drainRef.current !== null) {
                const d = (performance.now() - drainRef.current) / 2400;
                level = d < 0.45 ? 1 - 0.85 * smooth(d / 0.45) : 0.15 + 0.85 * smooth((d - 0.45) / 0.55);
                if (d >= 1) drainRef.current = null;
            }
            levelRef.current = level;
            motionRef.current.level = level;
            motionRef.current.tilt = tiltRef.current;
            // The writing point, in the kymograph's own frame (it stands on its side, turned towards the lever)
            penRef.current.y = PIVOT[1] + LONG_ARM * Math.sin(tiltRef.current) - KYMO_AT[1];
            penRef.current.on = drumRef.current && tied;
            setFrame(frameOf(s));
            setTick(n => (n + 1) % 1000000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // --- What the model shows ---
    const gutStage: GutStage = doneStep('mount') ? 'organ' : doneStep('rinse') || doneStep('segment') ? 'dish' : 'none';
    const live = useMemo<DalesLive>(() => ({ air, heaterOn, motion: motionRef }), [air, heaterOn]);
    const threadEnds = useCallback((): [[number, number, number], [number, number, number]] | null => {
        const st = stepRef.current;
        const on = st > stepIndex('lever') || (progressOf(animRef, 'lever') ?? 0) >= 0.4;
        if (!on) return null;
        const t = tiltRef.current;
        const top = SEG_BASE[1] + SEG_LEN * shapeRef.current.len;
        // The short arm goes down as the long arm rises
        const tie: [number, number, number] = [PIVOT[0] + SHORT_ARM * Math.cos(t), PIVOT[1] - SHORT_ARM * Math.sin(t), PIVOT[2]];
        return [[SEG_BASE[0], top, SEG_BASE[2]], tie];
    }, []);
    // Before it is tied to the lever, the long thread from the upper end hangs loose over the rim of the organ bath
    const looseOn = () => { const st = stepRef.current; return st > stepIndex('mount') && st <= stepIndex('lever') && (progressOf(animRef, 'lever') ?? 0) < 0.4; };
    const RIM: [number, number, number] = [SEG_BASE[0] + 0.7, DALE_ORGAN.y1 + 0.15, SEG_BASE[2] + 0.5];
    const looseUp = useCallback((): [[number, number, number], [number, number, number]] | null =>
        looseOn() ? [[SEG_BASE[0], SEG_BASE[1] + SEG_LEN * shapeRef.current.len, SEG_BASE[2]], RIM] : null, []);   // eslint-disable-line react-hooks/exhaustive-deps
    const looseDown = useCallback((): [[number, number, number], [number, number, number]] | null =>
        looseOn() ? [RIM, [RIM[0] + 0.6, RIM[1] - 4.5, RIM[2] + 0.4]] : null, []);   // eslint-disable-line react-hooks/exhaustive-deps

    // --- Panel text ---
    const guidance = notice
        ?? (!drumOn ? (dataRef.current.length ? 'Drum stopped. Start it again to go on recording.' : 'Start the drum (2.5 mm/s) and record the normal movements.')
            : drainRef.current !== null ? 'Draining the organ bath and refilling it with fresh Tyrode\'s solution…'
                : frame.agents.length === 2 ? 'Acetylcholine added after atropine. Note whether the movements change, then drain and refill.'
                    : frame.agents[0] === 'atropine' ? 'Atropine in the bath. Note the movements, then add acetylcholine on top of it, or drain and refill.'
                        : frame.agents.length ? `${AGENTS[frame.agents[0]].label} in the bath. Watch the movements change, then drain and refill with fresh Tyrode's solution.`
                            : !frame.normal ? 'Wait for the movements to return to normal.'
                                : paperRef.current < 12000 ? 'Recording the normal movements…'
                                    : 'Normal movements recorded. Add the next drug (Jain\'s order: top left first).');
    const explain = lastRow ? EXPLAIN[lastRow] : null;
    const rows = ROWS.filter(r => results[r]);
    const cur = STEPS[Math.min(step, STEPS.length - 1)];
    const canAdd = drumOn && drainRef.current === null && (frame.normal || (frame.agents.length === 1 && frame.agents[0] === 'atropine'));

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 font-sans relative">
            <header className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-slate-900 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} aria-label="Back" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="min-w-0">
                        <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-300 to-rose-400 bg-clip-text text-transparent truncate">Isolated Rabbit Intestine</h1>
                        <p className="text-slate-400 text-xs truncate">Mammalian / Movements of the intestine: effect of drugs and ions</p>
                    </div>
                </div>
                <button onClick={() => setSceneBg(b => (b === LIGHT_BG ? DARK_BG : LIGHT_BG))}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors" title="Toggle Canvas Background">
                    {sceneBg === LIGHT_BG ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="lg:hidden flex bg-slate-800 border-b border-slate-700">
                    {([['3d', '3D View', Eye], ['graph', 'Record', LineChart]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setMobileView(id)}
                            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === id
                                ? 'bg-slate-900 text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Icon className="w-4 h-4" /><span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* 3D */}
                <div className={`flex-1 min-w-0 relative bg-black min-h-[260px] ${mobileView === 'graph' ? 'hidden lg:flex' : 'flex'}`}
                    onPointerDown={() => { draggingRef.current = true; setHoveredLabel(null); setHoverPart(null); }}
                    onPointerUp={() => { draggingRef.current = false; }}
                    onPointerLeave={() => { draggingRef.current = false; }}>
                    <Canvas camera={{ position: [10, 60, 40], fov: 35 }}>
                        <color attach="background" args={[sceneBg]} />
                        <LabEnvironment variant="studio" />
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 8, 6]} intensity={1} />
                        <Bench />
                        <DalesApparatus active={hoverPart} onHover={handlePart} onSelect={noSelect} live={live} />
                        <group position={KYMO_AT} rotation={[0, Math.PI / 2, 0]}>
                            <KymographModel active={null} onHover={handleKymoPart} onSelect={noSelect} kymo={kymo} bare pen={penRef} />
                        </group>
                        <LiveThread ends={threadEnds} r={0.06} />
                        <LiveThread ends={looseUp} r={0.06} />
                        <LiveThread ends={looseDown} r={0.06} />
                        <PetriDish at={DISH_AT} label="Petri dish of Tyrode's solution" onHover={handleHover} />
                        <GutRig stage={gutStage} anim={animRef} shape={shapeRef} onHover={handleHover} />
                        {pipette && <PipetteModel color={pipette.color} startedAt={pipette.at} />}
                        <OrbitControls makeDefault enablePan screenSpacePanning zoomToCursor />
                        <FitCamera view={VIEWS[viewId]} nonce={viewNonce} onUserMove={handleUserMove} />
                    </Canvas>

                    {hoveredLabel && (
                        <div className="absolute top-3 left-3 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none">{hoveredLabel}</div>
                    )}
                    {busy && (
                        <div className="absolute top-3 right-3 bg-rose-600/90 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 pointer-events-none">
                            <Loader2 className="w-4 h-4 animate-spin" /> {cur.doing}
                        </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
                        <div className="flex flex-wrap gap-1.5">
                            {heaterOn && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 text-slate-200 border-slate-600 flex items-center gap-1">
                                    <Thermometer className="w-3.5 h-3.5" /> {pv.toFixed(1)} °C
                                </span>
                            )}
                            {air && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 text-emerald-300 border-emerald-500/60 flex items-center gap-1">
                                    <Wind className="w-3.5 h-3.5" /> Air 2–3/s
                                </span>
                            )}
                            {doneStep('mount') && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/90 text-rose-200 border-rose-500/60">{frame.rate}/min</span>
                            )}
                        </div>
                        {(
                            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900/90 pointer-events-auto">
                                {viewButtons.map(([id, label]) => (
                                    <button key={label} onClick={() => { userCamRef.current = true; goView(id); }}
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
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Record on the slow drum</h3>
                            <p className="text-[11px] text-slate-500 leading-snug mb-2">Contraction upward. The baseline is the tone; on it ride the rhythmic segmental contractions and the slower peristaltic waves.</p>
                            <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative min-h-[170px]">
                                <RecordGraph data={dataRef.current} marks={marks} paperT={paperRef.current} running={drumOn} windowMs={WINDOW_MS}
                                    yMin={-0.5} yMax={5} yTicks={[0, 1, 2, 3, 4]} yLabel="cm (contraction ↑)" speed="2.5 mm/s"
                                    status={{ text: `${frame.rate} / min`, color: '#4ade80' }} />
                            </div>
                        </div>
                    )}

                    <div className={`p-4 lg:p-5 bg-slate-900 z-10 space-y-3 overflow-y-auto ${setupDone ? 'lg:max-h-[62%]' : 'flex-1'}`}>
                        <StepList steps={STEPS} step={step} onBack={goToStep} onAhead={jumpToStep} onRecord={skipSetup} />

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
                                    <FastForward className="w-4 h-4" /> Skip to the moving intestine
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={`rounded-lg border p-3 text-sm ${notice ? 'bg-amber-950/40 border-amber-600/50 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200'}`} aria-live="polite">
                                    {guidance}
                                </div>

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

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                        <Pipette className="w-4 h-4 text-cyan-400" /> Add to the organ bath (Jain's order)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AGENT_ORDER.map(id => {
                                            const a = AGENTS[id];
                                            const active = frame.agents.includes(id);
                                            const allowed = canAdd && (!frame.agents.length || id === 'ach');
                                            return (
                                                <button key={id} onClick={() => addDrug(id)} aria-disabled={!allowed}
                                                    className={`text-left rounded-lg border px-3 py-2 transition-all ${active ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'} ${allowed || active ? '' : 'opacity-50'}`}
                                                    style={{ borderColor: active ? a.color : '#334155' }}>
                                                    <span className="block text-sm font-bold" style={{ color: a.color }}>{a.label}</span>
                                                    <span className="block text-[11px] text-slate-400 leading-tight">{a.dose}</span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={wash} aria-disabled={!frame.agents.length}
                                            className={`col-span-2 text-left rounded-lg border border-emerald-600/60 bg-emerald-950/40 hover:bg-emerald-900/40 px-3 py-2 transition-all ${frame.agents.length ? '' : 'opacity-50'}`}>
                                            <span className="block text-sm font-bold text-emerald-300">Drain and refill with fresh Tyrode's</span>
                                            <span className="block text-[11px] text-slate-400 leading-tight">After each drug, then wait for normal movements</span>
                                        </button>
                                    </div>
                                </div>

                                {explain && results[lastRow!] && (
                                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-1.5">
                                        <p className="font-bold text-slate-100">{ROW_LABEL[lastRow!]}</p>
                                        <p className="text-slate-200"><span className="text-slate-400">Seen: </span>{explain.seen}</p>
                                        <p className="text-slate-200"><span className="text-slate-400">Why: </span>{explain.why}</p>
                                    </div>
                                )}

                                {/* Results, as Jain's Table 67.3 */}
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
                                                        <th className="text-left font-semibold px-2 py-1.5">Agent</th>
                                                        <th className="text-right font-semibold px-2 py-1.5">Tone (cm)</th>
                                                        <th className="text-right font-semibold px-2 py-1.5">Rate (/min)</th>
                                                        <th className="text-right font-semibold px-2 py-1.5">Height (cm)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map(r => {
                                                        const { before: b, after: a } = results[r]!;
                                                        return (
                                                            <tr key={r} className="border-t border-slate-800">
                                                                <td className="px-2 py-1.5 text-slate-200">{ROW_LABEL[r]}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{b.tone.toFixed(1)} → {a.tone.toFixed(1)} {arrow(b.tone, a.tone)}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{b.rate} → {a.rate} {arrow(b.rate, a.rate)}</td>
                                                                <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{b.amp.toFixed(1)} → {a.amp.toFixed(1)} {arrow(b.amp, a.amp)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <button onClick={newPreparation}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Set up a new preparation
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
