import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Cylinder, Box, Sphere, Tube } from '@react-three/drei';
import { LabEnvironment } from './LabEnvironment';
import { ArrowLeft, Eye, LineChart, RefreshCw, Play, Square, Volume2, VolumeX, Moon, Sun, Activity, ListChecks, Droplet, ArrowUp, ArrowDown } from 'lucide-react';
import * as THREE from 'three';
import { useHeartbeatSound } from './useHeartbeatSound';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { InteractiveObject, FrogHeart } from './NormalCardiogram';

// Perfusion of the isolated frog's heart and the effect of ions and drugs on it.
// Follows GK Pal Ch 72 (doses, order of work, effects), with the perfusion pressure step from CL Ghai Expt 4-16 and
// AK Jain Ch 33. The heart hangs from a Syme's cannula tied into the sinus venosus and is fed with frog's Ringer from
// a Mariotte bottle; a thread from the apex runs down to a heart lever, so on this record the upstroke is systole.
// The apparatus is drawn from the books' descriptions and line figures, not from a photograph of a real set.

// --- Agents ---

type AgentId = 'cacl2' | 'kcl' | 'nacl' | 'adrenaline' | 'ach';
type RowId = AgentId | 'pressure';

interface Agent {
    id: AgentId;
    label: string;
    dose: string;
    color: string;
    rate: number;   // where the rate settles, as a multiple of normal
    amp: number;    // where the force settles
    tone: number;   // how far relaxation fails (1 = the heart stays fully contracted)
    tau: number;    // ms, how quickly the effect develops
}

const AGENTS: Record<AgentId, Agent> = {
    cacl2: { id: 'cacl2', label: 'CaCl₂', dose: '1 mL of 1% calcium chloride', color: '#22d3ee', rate: 1, amp: 1.45, tone: 1, tau: 2500 },
    kcl: { id: 'kcl', label: 'KCl', dose: '1 mL of 1% potassium chloride', color: '#c084fc', rate: 0.4, amp: 0.1, tone: 0, tau: 4000 },
    nacl: { id: 'nacl', label: 'NaCl', dose: '2 mL of 1% sodium chloride', color: '#e2e8f0', rate: 1.2, amp: 0.6, tone: 0, tau: 4000 },
    adrenaline: { id: 'adrenaline', label: 'Adrenaline', dose: '0.5 mL of 1 in 100,000 adrenaline', color: '#f87171', rate: 1.5, amp: 1.4, tone: 0, tau: 3000 },
    ach: { id: 'ach', label: 'Acetylcholine', dose: '0.5 mL of 1 in 1,000,000 acetylcholine', color: '#fbbf24', rate: 0.5, amp: 0.5, tone: 0, tau: 2500 },
};
const AGENT_ORDER: AgentId[] = ['cacl2', 'kcl', 'nacl', 'adrenaline', 'ach'];

const ROW_LABEL: Record<RowId, string> = {
    pressure: 'Raised pressure', cacl2: 'CaCl₂', kcl: 'KCl', nacl: 'NaCl', adrenaline: 'Adrenaline', ach: 'Acetylcholine',
};

// What is seen and why, in our own words (Pal pp. 486–487; Ghai p. 344; Jain pp. 120–121)
const EXPLAIN: Record<RowId, { seen: string; why: string }> = {
    pressure: {
        seen: 'The beats become stronger. The rate does not change.',
        why: 'More fluid fills and stretches the ventricle. A longer starting length of the fibres gives a stronger contraction: the Frank-Starling law of the heart.',
    },
    cacl2: {
        seen: 'The beats become stronger and relaxation is cut short. The heart finally stops contracted, in systole (calcium rigor). The rate hardly changes.',
        why: 'With more calcium outside the fibres, more of it reaches the contractile machinery at every beat, until the muscle cannot relax.',
    },
    kcl: {
        seen: 'The beats become slower and weaker, and the heart stops relaxed, in diastole.',
        why: 'Excess potassium lowers the resting membrane potential, so the fibres can no longer be excited.',
    },
    nacl: {
        seen: 'The beats become weaker, and the rate rises a little.',
        why: 'Sodium competes with calcium in the contractile process, so the force falls, while depolarisation is made easier. (This follows Pal. Ghai adds that a strong sodium solution alone finally stops the heart in diastole, and Jain reports no change in rate.)',
    },
    adrenaline: {
        seen: 'Both the rate and the force of the beat rise.',
        why: 'Acting on beta receptors it raises cyclic AMP, which opens calcium channels in the pacemaker tissue and in the muscle.',
    },
    ach: {
        seen: 'Both the rate and the force of the beat fall.',
        why: 'Through muscarinic receptors it opens potassium channels and hyperpolarises the pacemaker, and it lowers cyclic AMP so less calcium enters the muscle.',
    },
};

// --- Heart model ---

const NORMAL_PERIOD = 2000;   // 30 beats/min at room temperature
const SAMPLE_INTERVAL = 20;   // ms
const PAPER_MS = 60000;       // one sheet of smoked paper
const ONSET_MS = 1200;        // the fluid takes a moment to reach the heart
const PRESSURE_GAIN = 1.3;    // force with the reservoir raised
const MIN_NORMAL_BEATS = 3;

interface Sim {
    t: number;
    rate: number;
    amp: number;
    tone: number;
    agent: AgentId | null;
    agentAt: number;
    raised: boolean;
    arrest: null | 'systole' | 'diastole';
    beat: { t0: number; dur: number; amp: number } | null;
    beats: number;   // beats begun so far
    d: number;       // deflection of the record: 0 = relaxed, 1 = a normal full beat
    phase: number;   // 0..1 within the beat, -1 when the heart is still
    hr: number;
}

const newSim = (raised: boolean): Sim => ({
    t: 0, rate: 1, amp: raised ? PRESSURE_GAIN : 1, tone: 0, agent: null, agentAt: 0, raised,
    arrest: null, beat: null, beats: 0, d: 0, phase: -1, hr: Math.round(60000 / NORMAL_PERIOD),
});

const smooth = (p: number) => (1 - Math.cos(p * Math.PI)) / 2;
// One cycle as a fraction of the full deflection: the smaller atrial wave, then the ventricular wave
function beatShape(phase: number): number {
    if (phase < 0.16) return (2 / 3) * smooth(phase / 0.16);
    if (phase < 0.32) return 2 / 3 - (1 / 3) * smooth((phase - 0.16) / 0.16);
    if (phase < 0.40) return 1 / 3;
    if (phase < 0.56) return 1 / 3 + (2 / 3) * smooth((phase - 0.40) / 0.16);
    return 1 - smooth((phase - 0.56) / 0.44);
}

const isNormal = (s: Sim) => !s.agent && !s.arrest && Math.abs(s.rate - 1) < 0.03
    && Math.abs(s.amp - (s.raised ? PRESSURE_GAIN : 1)) < 0.03 && s.tone < 0.03;

function stepSim(s: Sim, dt: number) {
    s.t += dt;
    const base = s.raised ? PRESSURE_GAIN : 1;
    let rateT = 1, ampT = base, toneT = 0, tau = 3500, toneTau = 2200;
    const a = s.agent ? AGENTS[s.agent] : null;
    if (a && s.t - s.agentAt > ONSET_MS) { rateT = a.rate; ampT = a.amp * base; toneT = a.tone; tau = a.tau; toneTau = 6000; }
    const k = 1 - Math.exp(-dt / tau);
    s.rate += (rateT - s.rate) * k;
    s.amp += (ampT - s.amp) * k;
    s.tone += (toneT - s.tone) * (1 - Math.exp(-dt / toneTau));

    // A stopped heart starts again only after the chemical has been washed out
    if (!s.agent && s.arrest === 'diastole' && s.amp > 0.3) s.arrest = null;
    if (!s.agent && s.arrest === 'systole' && s.tone < 0.45) s.arrest = null;

    if (!s.arrest && (!s.beat || s.t >= s.beat.t0 + s.beat.dur)) {
        if (s.agent === 'kcl' && s.amp < 0.2) s.arrest = 'diastole';
        else if (s.agent === 'cacl2' && s.tone > 0.85) s.arrest = 'systole';
        else {
            s.beat = { t0: s.beat ? s.beat.t0 + s.beat.dur : s.t, dur: NORMAL_PERIOD / s.rate, amp: s.amp };
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
        s.d = floor + (s.beat.amp - floor) * beatShape(s.phase);
        s.hr = Math.round(60000 / s.beat.dur);
    }
}

// --- Layout of the bench (y = 0 is the table top; the camera looks from +z) ---

type V3 = [number, number, number];
const PLANE_Z = 0.05;                      // plane of the thread, the lever and the writing point
const HEART_Y = 2.8;
const APEX_Y = HEART_Y - 0.4;              // apex of the relaxed ventricle
const APEX_RISE = 0.09;                    // how far the apex lifts in a normal beat
const PIVOT: V3 = [0.7, 1.5, PLANE_Z];     // fulcrum of the heart lever
const R_THREAD = 0.7;                      // fulcrum to thread
const R_TIP = 3.5;                         // fulcrum to writing point
const DRUM: V3 = [PIVOT[0] - R_TIP - 1, 1.9, PLANE_Z];
const CANNULA_Z = -0.2;                    // the sinus venosus lies at the back of the heart
const CANNULA_ARM: V3 = [0.45, 4.75, CANNULA_Z];
const BOTTLE_X = 2.3, BOTTLE_Z = -0.3;
const BOTTLE_LOW = 4.9, BOTTLE_HIGH = 5.9;
const SCENE_CENTER: V3 = [-0.6, 3.5, 0];

const leverAngle = (d: number) => Math.asin(Math.max(-0.9, Math.min(0.9, (APEX_RISE * d) / R_THREAD)));

// --- Small building blocks ---

const Bar = ({ a, b, r, children, seg = 12 }: { a: V3; b: V3; r: number; children: React.ReactNode; seg?: number }) => {
    const { pos, quat, len } = useMemo(() => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), dir = vb.clone().sub(va);
        return {
            pos: va.clone().add(vb).multiplyScalar(0.5),
            quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
            len: dir.length(),
        };
    }, [a[0], a[1], a[2], b[0], b[1], b[2]]);
    return <mesh position={pos} quaternion={quat}><cylinderGeometry args={[r, r, len, seg, 1]} />{children}</mesh>;
};
const Steel = () => <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.3} />;
const Glass = ({ opacity = 0.3 }: { opacity?: number }) => (
    <meshPhysicalMaterial color="#eef6fa" transparent opacity={opacity} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
);
const RINGER = '#bfe3f5';

type Hover = (l: string | null) => void;

// Retort stand: carries the cannula above and the heart lever below
const RetortStand = ({ onHoverChange }: { onHoverChange: Hover }) => (
    <InteractiveObject label="Stand" onHoverChange={onHoverChange}>
        <Box args={[1.6, 0.14, 1.3]} position={[1.3, 0.07, -0.25]}><meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} /></Box>
        <Bar a={[1.5, 0.1, -0.45]} b={[1.5, 5.4, -0.45]} r={0.055}><Steel /></Bar>
        {/* Bossheads */}
        {[4.35, 1.5, 0.85].map(y => <Box key={y} args={[0.2, 0.2, 0.2]} position={[1.5, y, -0.45]}><meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} /></Box>)}
        {/* Clamp for the cannula */}
        <Bar a={[1.5, 4.35, -0.45]} b={[0.22, 4.35, CANNULA_Z]} r={0.035}><Steel /></Bar>
        <Box args={[0.3, 0.16, 0.26]} position={[0.02, 4.35, CANNULA_Z]}><meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} /></Box>
        {/* Arm and axle of the lever */}
        <Bar a={[1.5, 1.5, -0.45]} b={[PIVOT[0], 1.5, -0.45]} r={0.035}><Steel /></Bar>
        <Bar a={[PIVOT[0], 1.5, -0.45]} b={[PIVOT[0], 1.5, PLANE_Z + 0.08]} r={0.025}><Steel /></Bar>
        {/* Arm that anchors the spring */}
        <Bar a={[1.5, 0.85, -0.45]} b={[0.35, 0.85, -0.45]} r={0.03}><Steel /></Bar>
        <Bar a={[0.35, 0.85, -0.45]} b={[0.35, 0.85, PLANE_Z]} r={0.02}><Steel /></Bar>
    </InteractiveObject>
);

// Syme's cannula: its tip is tied into the sinus venosus; Ringer comes in by the side arm
const SymesCannula = ({ onHoverChange }: { onHoverChange: Hover }) => (
    <InteractiveObject label="Syme's cannula (tied into the sinus venosus)" onHoverChange={onHoverChange}>
        <mesh position={[0, 4.17, CANNULA_Z]}><cylinderGeometry args={[0.085, 0.085, 1.45, 20, 1, true]} /><Glass opacity={0.55} /></mesh>
        <mesh position={[0, 4.95, CANNULA_Z]}><cylinderGeometry args={[0.15, 0.085, 0.12, 20, 1, true]} /><Glass opacity={0.55} /></mesh>
        {/* Neck and bulb at the tip: the thread is tied round the neck */}
        <mesh position={[0, 3.41, CANNULA_Z]}><cylinderGeometry args={[0.075, 0.04, 0.08, 16, 1, true]} /><Glass opacity={0.4} /></mesh>
        <Sphere args={[0.06, 16, 12]} position={[0, 3.34, CANNULA_Z]}><Glass opacity={0.45} /></Sphere>
        <mesh position={[0, 3.41, CANNULA_Z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.062, 0.012, 8, 20]} /><meshStandardMaterial color="#f8fafc" roughness={0.8} /></mesh>
        {/* Side arm */}
        <Bar a={[0.06, 4.6, CANNULA_Z]} b={CANNULA_ARM} r={0.05}><Glass opacity={0.4} /></Bar>
        {/* Ringer standing in the cannula */}
        <Cylinder args={[0.06, 0.06, 1.25, 12]} position={[0, 4.07, CANNULA_Z]}><meshStandardMaterial color="#8fcdea" transparent opacity={0.8} /></Cylinder>
    </InteractiveObject>
);

// Mariotte bottle of frog's Ringer on its own stand; raising it raises the perfusion pressure
const Reservoir = ({ raised, onHoverChange }: { raised: boolean; onHoverChange: Hover }) => {
    const target = raised ? BOTTLE_HIGH : BOTTLE_LOW;
    const [y, setY] = useState(target);
    useFrame((_, dt) => {
        if (Math.abs(y - target) > 0.003) setY(y + (target - y) * Math.min(1, dt * 4));
        else if (y !== target) setY(target);
    });
    const hose = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(BOTTLE_X - 0.62, y + 0.15, BOTTLE_Z),
        new THREE.Vector3(BOTTLE_X - 1.0, y - 0.1, BOTTLE_Z + 0.05),
        new THREE.Vector3(1.0, (y + CANNULA_ARM[1]) / 2 - 0.25, CANNULA_Z + 0.1),
        new THREE.Vector3(0.75, CANNULA_ARM[1] + 0.05, CANNULA_Z),
        new THREE.Vector3(...CANNULA_ARM),
    ]), [y]);
    const clip = useMemo(() => hose.getPoint(0.45), [hose]);

    return (
        <group>
            <InteractiveObject label="Stand of the reservoir" onHoverChange={onHoverChange}>
                <Box args={[1.5, 0.14, 1.2]} position={[2.8, 0.07, BOTTLE_Z]}><meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} /></Box>
                <Bar a={[3.0, 0.1, BOTTLE_Z]} b={[3.0, 7.3, BOTTLE_Z]} r={0.055}><Steel /></Bar>
            </InteractiveObject>
            <group position={[0, y, 0]}>
                <InteractiveObject label={raised ? 'Mariotte bottle of frog\'s Ringer (raised)' : 'Mariotte bottle of frog\'s Ringer'} onHoverChange={onHoverChange}>
                    {/* Shelf and its collar on the rod */}
                    <Cylinder args={[0.6, 0.6, 0.06, 28]} position={[BOTTLE_X, -0.03, BOTTLE_Z]}><meshStandardMaterial color="#e2e8f0" roughness={0.5} /></Cylinder>
                    <Box args={[0.3, 0.2, 0.22]} position={[2.95, -0.05, BOTTLE_Z]}><meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} /></Box>
                    {/* Bottle, neck and stopper */}
                    <mesh position={[BOTTLE_X, 0.55, BOTTLE_Z]}><cylinderGeometry args={[0.5, 0.5, 1.1, 32, 1, true]} /><Glass opacity={0.28} /></mesh>
                    <mesh position={[BOTTLE_X, 1.19, BOTTLE_Z]}><cylinderGeometry args={[0.18, 0.5, 0.18, 32, 1, true]} /><Glass opacity={0.28} /></mesh>
                    <mesh position={[BOTTLE_X, 1.38, BOTTLE_Z]}><cylinderGeometry args={[0.18, 0.18, 0.2, 24, 1, true]} /><Glass opacity={0.28} /></mesh>
                    <Cylinder args={[0.2, 0.16, 0.2, 20]} position={[BOTTLE_X, 1.5, BOTTLE_Z]}><meshStandardMaterial color="#7c2d12" roughness={0.9} /></Cylinder>
                    {/* Ringer, and the air tube that keeps the pressure head steady as the level falls */}
                    <Cylinder args={[0.47, 0.47, 0.85, 28]} position={[BOTTLE_X, 0.45, BOTTLE_Z]}><meshStandardMaterial color={RINGER} transparent opacity={0.5} /></Cylinder>
                    <Bar a={[BOTTLE_X, 0.2, BOTTLE_Z]} b={[BOTTLE_X, 1.95, BOTTLE_Z]} r={0.035}><Glass opacity={0.5} /></Bar>
                    {/* Outlet at the foot */}
                    <Bar a={[BOTTLE_X - 0.48, 0.15, BOTTLE_Z]} b={[BOTTLE_X - 0.66, 0.15, BOTTLE_Z]} r={0.06}><Glass opacity={0.4} /></Bar>
                </InteractiveObject>
            </group>
            <InteractiveObject label="Rubber tube with pinch-cock" onHoverChange={onHoverChange}>
                <Tube args={[hose, 40, 0.05, 8, false]}><meshStandardMaterial color="#a8405f" roughness={0.8} /></Tube>
                <Box args={[0.22, 0.12, 0.16]} position={[clip.x, clip.y, clip.z]}><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></Box>
            </InteractiveObject>
        </group>
    );
};

// The heart on the cannula, with the thread from its apex
const HangingHeart = ({ d, onHoverChange }: { d: number; onHoverChange: Hover }) => {
    const apexY = APEX_Y + APEX_RISE * d;
    const leverY = PIVOT[1] + R_THREAD * Math.sin(leverAngle(d));
    return (
        <group>
            {/* FrogHeart is built apex-up for the heart in the frog; turned over here so it hangs by its base */}
            <group position={[0, HEART_Y, 0]} rotation={[0, 0, Math.PI]}>
                <FrogHeart contraction={3 - 3 * d} temperature={25} onHoverChange={onHoverChange} />
            </group>
            <InteractiveObject label="Thread from the apex to the lever" onHoverChange={onHoverChange}>
                <Bar a={[0, apexY + 0.03, PLANE_Z]} b={[0, leverY, PLANE_Z]} r={0.006} seg={6}><meshStandardMaterial color="#f8fafc" roughness={0.6} /></Bar>
                <Sphere args={[0.02, 8, 8]} position={[0, apexY + 0.02, PLANE_Z]}><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></Sphere>
            </InteractiveObject>
        </group>
    );
};

const springGeo = (() => {
    let cached: THREE.TubeGeometry | null = null;
    return () => cached ?? (cached = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(Array.from({ length: 121 }, (_, i) => {
            const t = i / 120, a = t * Math.PI * 2 * 10;
            return new THREE.Vector3(Math.cos(a) * 0.04, t, Math.sin(a) * 0.04);
        })), 240, 0.007, 6, false));
})();

// Heart lever below the heart: the thread lifts it in systole, a light spring brings it back
const HeartLever = ({ d, onHoverChange }: { d: number; onHoverChange: Hover }) => {
    const theta = leverAngle(d);
    const spring = useMemo(springGeo, []);
    const springLen = PIVOT[1] + 0.35 * Math.sin(theta) - 0.85;
    return (
        <group>
            <group position={PIVOT} rotation={[0, 0, -theta]}>
                <InteractiveObject label="Heart lever" onHoverChange={onHoverChange}>
                    <Box args={[1.5, 0.1, 0.03]} position={[-0.55, 0, 0]}><meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.3} /></Box>
                    {[-0.2, -0.35, -0.7, -0.95, -1.15].map(x => (
                        <Cylinder key={x} args={[0.022, 0.022, 0.034, 10]} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><meshBasicMaterial color="#1e293b" /></Cylinder>
                    ))}
                </InteractiveObject>
                <InteractiveObject label="Writing point" onHoverChange={onHoverChange}>
                    <Cylinder args={[0.012, 0.012, R_TIP - 1.3, 8]} position={[-(R_TIP + 1.3) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><meshStandardMaterial color="#222" roughness={0.6} /></Cylinder>
                    <mesh position={[-R_TIP + 0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.014, 0.07, 8]} /><meshStandardMaterial color="#111" /></mesh>
                </InteractiveObject>
            </group>
            <InteractiveObject label="Spring of the lever" onHoverChange={onHoverChange}>
                <mesh geometry={spring} position={[0.35, 0.85, PLANE_Z]} scale={[1, springLen, 1]}><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} /></mesh>
            </InteractiveObject>
        </group>
    );
};

// Beaker that catches the fluid dripping from the heart
const Beaker = ({ onHoverChange }: { onHoverChange: Hover }) => {
    const drop = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!drop.current) return;
        const p = (clock.elapsedTime % 1.4) / 1.4;
        drop.current.visible = p < 0.6;
        drop.current.position.y = APEX_Y - 0.05 - (APEX_Y - 0.35) * Math.min(1, (p / 0.6) ** 2);
    });
    return (
        <InteractiveObject label="Beaker (collects the fluid leaving the heart)" onHoverChange={onHoverChange}>
            <mesh position={[0.05, 0.4, 0.25]}><cylinderGeometry args={[0.48, 0.44, 0.8, 28, 1, true]} /><Glass opacity={0.25} /></mesh>
            <Cylinder args={[0.44, 0.44, 0.03, 28]} position={[0.05, 0.015, 0.25]}><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.35} roughness={0.05} /></Cylinder>
            <Cylinder args={[0.43, 0.42, 0.22, 28]} position={[0.05, 0.14, 0.25]}><meshStandardMaterial color={RINGER} transparent opacity={0.5} /></Cylinder>
            <Sphere ref={drop} args={[0.025, 8, 8]} position={[0.06, APEX_Y, 0.17]}><meshStandardMaterial color={RINGER} transparent opacity={0.85} /></Sphere>
        </InteractiveObject>
    );
};

// Dropper held over the mouth of the cannula while a chemical is added
const Dropper = ({ color }: { color: string | null }) => {
    const drop = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (!drop.current) return;
        drop.current.position.y -= dt * 1.6;
        if (drop.current.position.y < -0.75) drop.current.position.y = -0.42;
    });
    if (!color) return null;
    return (
        <group position={[0, 5.75, CANNULA_Z]}>
            <Cylinder args={[0.045, 0.045, 0.6, 14]}><meshPhysicalMaterial color="#f0f0f0" transparent opacity={0.45} roughness={0} /></Cylinder>
            <Sphere args={[0.07, 16, 16]} position={[0, 0.36, 0]}><meshStandardMaterial color="#333333" roughness={0.8} /></Sphere>
            <Cylinder args={[0.035, 0.015, 0.15, 12]} position={[0, -0.36, 0]}><meshPhysicalMaterial color="#f0f0f0" transparent opacity={0.5} roughness={0} /></Cylinder>
            <Cylinder args={[0.033, 0.033, 0.4, 12]} position={[0, -0.05, 0]}><meshStandardMaterial color={color} transparent opacity={0.85} /></Cylinder>
            <Sphere ref={drop} args={[0.028, 8, 8]} position={[0, -0.45, 0]}><meshStandardMaterial color={color} /></Sphere>
        </group>
    );
};

// The chemicals, each with its own dropper
const ReagentRack = ({ onHoverChange }: { onHoverChange: Hover }) => (
    <group position={[-1.9, 0, 1.25]}>
        <Box args={[2.3, 0.08, 0.5]} position={[0.85, 0.04, 0]}><meshStandardMaterial color="#9a5b2e" roughness={0.7} /></Box>
        {AGENT_ORDER.map((id, i) => (
            <InteractiveObject key={id} label={`${AGENTS[id].dose} (its own dropper)`} onHoverChange={onHoverChange}>
                <group position={[i * 0.42, 0.08, 0]}>
                    <Cylinder args={[0.13, 0.13, 0.42, 20]} position={[0, 0.21, 0]}><meshPhysicalMaterial color="#b45309" transparent opacity={0.75} roughness={0.15} /></Cylinder>
                    <Cylinder args={[0.06, 0.1, 0.1, 16]} position={[0, 0.47, 0]}><meshPhysicalMaterial color="#b45309" transparent opacity={0.75} roughness={0.15} /></Cylinder>
                    <Sphere args={[0.075, 14, 12]} position={[0, 0.6, 0]}><meshStandardMaterial color="#1f2937" roughness={0.8} /></Sphere>
                    <Box args={[0.2, 0.16, 0.01]} position={[0, 0.2, 0.13]}><meshStandardMaterial color={AGENTS[id].color} roughness={0.6} /></Box>
                </group>
            </InteractiveObject>
        ))}
    </group>
);

// Smoked drum. The whole record so far is drawn from the samples, so nothing is lost at a low frame rate.
const PX_PER_UNIT = 512 / 2.5;
const PAPER_X0 = 70, PAPER_W = 1900;
const Drum = ({ samples, running, resetKey, onHoverChange }: {
    samples: React.MutableRefObject<{ t: number; y: number }[]>;
    running: boolean;
    resetKey: number;
    onHoverChange: Hover;
}) => {
    const drumRef = useRef<THREE.Group>(null);
    const drawn = useRef(0);
    const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 512; return c; }, []);
    const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

    const xy = (p: { t: number; y: number }) => ({
        x: PAPER_X0 + (p.t / PAPER_MS) * PAPER_W,
        y: 256 - (PIVOT[1] + R_TIP * Math.sin(leverAngle(p.y)) - DRUM[1]) * PX_PER_UNIT,
    });

    useEffect(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 2048, 512);
        ctx.fillStyle = '#0d0d0d';
        for (let i = 0; i < 200; i++) ctx.fillRect(Math.random() * 2048, Math.random() * 512, Math.random() * 4, Math.random() * 4);
        drawn.current = 0;
        texture.needsUpdate = true;
    }, [resetKey, canvas, texture]);

    useFrame(() => {
        const pts = samples.current;
        if (pts.length > drawn.current + 1) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
                ctx.beginPath();
                const first = xy(pts[Math.max(0, drawn.current - 1)]);
                ctx.moveTo(first.x, first.y);
                for (let i = Math.max(1, drawn.current); i < pts.length; i++) { const p = xy(pts[i]); ctx.lineTo(p.x, p.y); }
                ctx.stroke();
                drawn.current = pts.length;
                texture.needsUpdate = true;
            }
        }
        // The paper under the writing point (on the +x side of the drum) is the latest sample
        const t = pts.length ? pts[pts.length - 1].t : 0;
        if (drumRef.current) drumRef.current.rotation.y = Math.PI / 2 - ((PAPER_X0 + (t / PAPER_MS) * PAPER_W) / 2048) * Math.PI * 2;
    });

    return (
        <group position={DRUM}>
            <InteractiveObject label={running ? 'Kymograph drum (slow speed)' : 'Kymograph drum'} onHoverChange={onHoverChange}>
                <group ref={drumRef} rotation={[0, Math.PI / 2 - (PAPER_X0 / 2048) * Math.PI * 2, 0]}>
                    <Cylinder args={[1.0, 1.0, 2.5, 64]}>
                        <meshBasicMaterial attach="material-0" map={texture} />
                        <meshStandardMaterial attach="material-1" color="#111" />
                        <meshStandardMaterial attach="material-2" color="#111" />
                    </Cylinder>
                </group>
                <Cylinder args={[0.06, 0.06, 3.3, 12]} position={[0, -0.25, 0]}><meshStandardMaterial color="#1e293b" metalness={0.8} /></Cylinder>
                <Box args={[1.5, 0.6, 1.5]} position={[0, -DRUM[1] + 0.3, 0]}><meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.6} /></Box>
            </InteractiveObject>
        </group>
    );
};

// Stands back far enough for the whole bench to fit, whatever the shape of the view
const FitCamera = () => {
    const { camera, size, controls } = useThree();
    useEffect(() => {
        const cam = camera as THREE.PerspectiveCamera;
        const t = Math.tan((cam.fov * Math.PI) / 360);
        const dist = Math.max(4.7 / t, 5.6 / (t * (size.width / size.height)));
        cam.position.set(SCENE_CENTER[0] + dist * 0.12, SCENE_CENTER[1] + dist * 0.07, dist);
        cam.lookAt(...SCENE_CENTER);
        (controls as unknown as { update?: () => void } | null)?.update?.();
    }, [camera, controls, size.width, size.height]);
    return null;
};

// --- Record, as an oscilloscope-style graph of the whole sheet ---

interface Mark { t: number; text: string; color: string }

const PerfusionGraph = ({ data, marks, isRecording, heartRate, arrest }: {
    data: { t: number; y: number }[];
    marks: Mark[];
    isRecording: boolean;
    heartRate: number;
    arrest: Sim['arrest'];
}) => {
    const W = 900, H = 380;
    const m = { top: 92, right: 20, bottom: 44, left: 40 };
    const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    const yMin = -0.12, yMax = 1.75;
    const ys = (y: number) => m.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
    const xs = (t: number) => m.left + (t / PAPER_MS) * plotW;
    const path = data.length > 1 ? `M ${data.map(p => `${xs(p.t).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' L ')}` : '';
    const hasData = data.length > 0;
    const ticks: number[] = [];
    for (let t = 0; t <= PAPER_MS; t += 10000) ticks.push(t);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {[0, 0.5, 1, 1.5].map(v => (
                <line key={v} x1={m.left} y1={ys(v)} x2={W - m.right} y2={ys(v)} stroke={v === 0 ? '#166534' : '#14532d'} strokeWidth={1} />
            ))}
            {ticks.map(t => (
                <g key={t}>
                    <line x1={xs(t)} y1={m.top} x2={xs(t)} y2={m.top + plotH} stroke="#14532d" strokeWidth={1} />
                    <text x={xs(t)} y={m.top + plotH + 16} textAnchor="middle" fill="#166534" fontSize={12} fontFamily="monospace">{t / 1000}s</text>
                </g>
            ))}
            <text x={m.left + 4} y={ys(1) - 5} fill="#166534" fontSize={11} fontFamily="monospace">normal beat</text>
            <text x={m.left - 26} y={m.top + plotH / 2} fill="#166534" fontSize={11} fontFamily="monospace" transform={`rotate(-90 ${m.left - 26} ${m.top + plotH / 2})`} textAnchor="middle">systole ↑</text>

            <path d={path} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinejoin="round" />

            {marks.map((mk, i) => {
                const x = xs(mk.t);
                const textY = i % 2 === 0 ? 28 : 56;
                const anchor = x < 110 ? 'start' : x > W - 130 ? 'end' : 'middle';
                return (
                    <g key={i}>
                        <text x={x} y={textY} textAnchor={anchor} fill={mk.color} fontSize={17} fontFamily="monospace" fontWeight="bold">{mk.text}</text>
                        <line x1={x} y1={textY + 6} x2={x} y2={m.top + plotH} stroke={mk.color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
                    </g>
                );
            })}

            <text x={W - m.right - 10} y={m.top + plotH - 8} textAnchor="end" fill={heartRate > 0 ? '#4ade80' : '#f87171'} fontSize={14} fontFamily="monospace" fontWeight="bold">
                {heartRate > 0 ? (hasData ? `HR: ${heartRate} BPM` : '') : arrest === 'systole' ? 'STOPPED IN SYSTOLE' : 'STOPPED IN DIASTOLE'}
            </text>
            {isRecording && <text x={m.left + 10} y={m.top + plotH - 8} fill="#ef4444" fontSize={14} fontFamily="monospace" fontWeight="bold">● REC</text>}
        </svg>
    );
};

// --- Main component ---

interface Result { beforeHr: number; beforeForce: number; hr: number; force: number; note?: string }
interface Frame { t: number; d: number; phase: number; hr: number; arrest: Sim['arrest']; agent: AgentId | null; beats: number; normal: boolean; dropper: AgentId | null }

const frameOf = (s: Sim, dropper: AgentId | null): Frame => ({
    t: s.t, d: s.d, phase: s.phase, hr: s.hr, arrest: s.arrest, agent: s.agent, beats: s.beats, normal: isNormal(s), dropper,
});

export const FrogHeartPerfusion: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const draggingRef = useRef(false);
    const handleHover = useCallback((label: string | null) => { if (!draggingRef.current) setHoveredLabel(label); }, []);
    const [quizOpen, setQuizOpen] = useState(false);
    const questionSet = questionSetFor('frog-heart-perfusion');
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d');
    const [soundMuted, setSoundMuted] = useState(false);
    const [sceneBgColor, setSceneBgColor] = useState('#CBD5E1');

    const [isRecording, setIsRecording] = useState(false);
    const [paperFull, setPaperFull] = useState(false);
    const [raised, setRaised] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const [data, setData] = useState<{ t: number; y: number }[]>([]);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [results, setResults] = useState<Partial<Record<RowId, Result>>>({});
    const [lastRow, setLastRow] = useState<RowId | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const simRef = useRef<Sim>(newSim(false));
    const dataRef = useRef<{ t: number; y: number }[]>([]);
    const dropperRef = useRef<{ id: AgentId; t0: number } | null>(null);
    const beforeRef = useRef<Partial<Record<RowId, { hr: number; force: number }>>>({});
    const latestRef = useRef<{ hr: number; force: number } | null>(null);
    const [frame, setFrame] = useState<Frame>(() => frameOf(simRef.current, null));

    const { ensureAudioContext } = useHeartbeatSound({
        isRecording,
        phase: frame.phase,
        volume: 1.0,
        muted: soundMuted,
        silent: frame.phase < 0,
    });

    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), 4500);
        return () => clearTimeout(id);
    }, [notice]);

    const addMark = (text: string, color: string) => setMarks(prev => [...prev, { t: simRef.current.t, text, color }]);
    const force = (amp: number) => Math.round(amp * 100);

    const freshPaper = (start: boolean) => {
        simRef.current = newSim(raised);
        dataRef.current = [];
        dropperRef.current = null;
        beforeRef.current = raised ? { pressure: { hr: 30, force: 100 } } : {};
        setData([]);
        setMarks([]);
        setPaperFull(false);
        setNotice(null);
        setFrame(frameOf(simRef.current, null));
        setResetKey(k => k + 1);
        setIsRecording(start);
    };

    const handleStart = () => { ensureAudioContext(); freshPaper(true); };
    const handleStop = () => setIsRecording(false);
    const handleReset = () => freshPaper(false);

    const applyAgent = (id: AgentId) => {
        const s = simRef.current;
        if (!isRecording) return setNotice('Start the drum and record the normal beat first.');
        if (s.beats <= MIN_NORMAL_BEATS) return setNotice('Record a few normal beats before adding anything.');
        if (s.agent || s.arrest) return setNotice('Wash the heart with Ringer before adding another chemical.');
        if (!isNormal(s)) return setNotice('Wait until the beat has returned to normal.');
        s.agent = id;
        s.agentAt = s.t;
        dropperRef.current = { id, t0: s.t };
        beforeRef.current[id] = { hr: s.hr, force: force(s.beat?.amp ?? s.amp) };
        latestRef.current = null;
        setLastRow(id);
        addMark(AGENTS[id].label, AGENTS[id].color);
    };

    const washHeart = () => {
        const s = simRef.current;
        if (!isRecording) return;
        if (!s.agent) return setNotice('There is nothing to wash out: the heart is already on plain Ringer.');
        s.agent = null;
        addMark('Ringer wash', '#4ade80');
    };

    const toggleReservoir = () => {
        const s = simRef.current;
        if (isRecording && (s.agent || s.arrest)) return setNotice('Change the pressure only while the heart is on plain Ringer.');
        const next = !raised;
        s.raised = next;
        setRaised(next);
        if (next) {
            beforeRef.current.pressure = { hr: s.hr || 30, force: force(s.beat?.amp ?? s.amp) };
            setLastRow('pressure');
        }
        if (isRecording) addMark(next ? 'Pressure raised' : 'Pressure lowered', '#60a5fa');
    };

    // Simulation loop
    useEffect(() => {
        if (!isRecording) return;
        let raf = 0;
        let last = Date.now();
        let pending = 0;

        const loop = () => {
            const now = Date.now();
            pending += Math.min(500, now - last);
            last = now;
            const s = simRef.current;
            let beats = s.beats, arrest = s.arrest;

            while (pending >= SAMPLE_INTERVAL && s.t < PAPER_MS) {
                pending -= SAMPLE_INTERVAL;
                stepSim(s, SAMPLE_INTERVAL);
                dataRef.current.push({ t: s.t, y: s.d });

                // Fill the table of results as each new beat begins, or as the heart stops
                const row: RowId | null = s.agent && s.t - s.agentAt > ONSET_MS ? s.agent : !s.agent && s.raised && !s.arrest ? 'pressure' : null;
                const before = row && beforeRef.current[row];
                if (row && before && (s.beats !== beats || s.arrest !== arrest)) {
                    const note = s.arrest === 'systole' ? 'Stopped in systole' : s.arrest === 'diastole' ? 'Stopped in diastole' : undefined;
                    // When the heart stops, the row keeps the last beat it gave and adds how it stopped
                    if (!s.arrest || !latestRef.current) latestRef.current = { hr: s.hr, force: force(s.beat?.amp ?? s.amp) };
                    const result: Result = { beforeHr: before.hr, beforeForce: before.force, ...latestRef.current, note };
                    setResults(prev => ({ ...prev, [row]: result }));
                }
                if (s.arrest && s.arrest !== arrest) {
                    const t = s.t;
                    const text = s.arrest === 'systole' ? 'Stops in systole' : 'Stops in diastole';
                    setMarks(prev => [...prev, { t, text, color: '#f87171' }]);
                }
                beats = s.beats; arrest = s.arrest;
            }

            const dropper = dropperRef.current && s.t - dropperRef.current.t0 < 2200 ? dropperRef.current.id : null;
            setData([...dataRef.current]);
            setFrame(frameOf(s, dropper));

            if (s.t >= PAPER_MS) { setPaperFull(true); setIsRecording(false); return; }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [isRecording]);

    const hasRun = data.length > 0;
    const d = isRecording || hasRun ? frame.d : 0;
    const heartRate = isRecording || hasRun ? frame.hr : 30;
    const canAdd = isRecording && frame.normal && frame.beats > MIN_NORMAL_BEATS;

    const guidance = notice
        ?? (paperFull ? 'The paper is full. Press Reset for a fresh sheet.'
            : !isRecording ? (hasRun ? 'Drum stopped. Press Start to record on a fresh sheet.' : 'Press Start to record the normal beat on the drum.')
                : frame.arrest ? `The heart has stopped in ${frame.arrest}. Wash it with Ringer to revive it.`
                    : frame.agent ? `${AGENTS[frame.agent].label} added. Watch the beat change, then wash with Ringer.`
                        : frame.beats <= MIN_NORMAL_BEATS ? 'Recording the normal beat. Wait for a few beats.'
                            : !frame.normal ? 'Washing out. Wait for the beat to return to normal.'
                                : raised ? 'Pressure raised: note the stronger beat. Add a chemical, or lower the reservoir.'
                                    : 'Normal beat recorded. Add one chemical, or raise the reservoir.');

    const explain = lastRow ? EXPLAIN[lastRow] : null;
    const rows = (['pressure', ...AGENT_ORDER] as RowId[]).filter(r => results[r]);

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans relative">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-rose-300 to-red-400 bg-clip-text text-transparent">Perfusion of Frog's Heart</h1>
                        <p className="text-slate-400 text-xs">Amphibian / Isolated Heart — Effect of Ions, Drugs & Perfusion Pressure</p>
                    </div>
                </div>
                <button
                    onClick={() => setSceneBgColor(prev => prev === '#CBD5E1' ? '#2F3E46' : '#CBD5E1')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors flex items-center justify-center"
                    title="Toggle Canvas Background"
                >
                    {sceneBgColor === '#CBD5E1' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Mobile View Toggle */}
                <div className="lg:hidden flex bg-slate-800 border-b border-slate-700">
                    {([['3d', '3D View', Eye], ['graph', 'Cardiogram', LineChart]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setMobileView(id)}
                            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === id
                                ? 'bg-slate-900 text-red-400 border-b-2 border-red-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* 3D View */}
                <div className={`flex-1 relative bg-black min-h-[240px] ${mobileView === 'graph' ? 'hidden lg:flex' : 'flex'}`}
                    onPointerDown={() => { draggingRef.current = true; setHoveredLabel(null); }}
                    onPointerUp={() => { draggingRef.current = false; }}
                    onPointerLeave={() => { draggingRef.current = false; }}>
                    <Canvas shadows camera={{ position: [1.4, 4.7, 12], fov: 38 }}>
                        <color attach="background" args={[sceneBgColor]} />
                        <LabEnvironment />
                        <ambientLight intensity={0.6} color="#ffffff" />
                        <spotLight position={[8, 12, 8]} angle={0.35} penumbra={0.5} intensity={2} castShadow />
                        <pointLight position={[-6, 6, 5]} intensity={0.5} color="#ffeedd" />

                        {/* Table top */}
                        <Box args={[10.2, 0.16, 4.4]} position={[-0.7, -0.08, 0.3]}><meshStandardMaterial color="#7c6248" roughness={0.85} /></Box>

                        <RetortStand onHoverChange={handleHover} />
                        <SymesCannula onHoverChange={handleHover} />
                        <Reservoir raised={raised} onHoverChange={handleHover} />
                        <HangingHeart d={d} onHoverChange={handleHover} />
                        <HeartLever d={d} onHoverChange={handleHover} />
                        <Beaker onHoverChange={handleHover} />
                        <ReagentRack onHoverChange={handleHover} />
                        <Dropper color={isRecording && frame.dropper ? AGENTS[frame.dropper].color : null} />
                        <Drum samples={dataRef} running={isRecording} resetKey={resetKey} onHoverChange={handleHover} />

                        <OrbitControls makeDefault target={SCENE_CENTER} minPolarAngle={0} maxPolarAngle={Math.PI * 0.52} zoomToCursor />
                        <FitCamera />
                    </Canvas>

                    {hoveredLabel && (
                        <div className="absolute top-4 left-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
                            {hoveredLabel}
                        </div>
                    )}

                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
                        {isRecording && frame.agent && (
                            <div className="px-3 py-1.5 rounded-full text-sm font-bold border bg-slate-900/90" style={{ color: AGENTS[frame.agent].color, borderColor: AGENTS[frame.agent].color }}>
                                {AGENTS[frame.agent].label} in the heart
                            </div>
                        )}
                        {raised && (
                            <div className="px-3 py-1.5 rounded-full text-sm font-bold border bg-slate-900/90 text-blue-300 border-blue-400">Reservoir raised</div>
                        )}
                        {(isRecording || hasRun) && frame.arrest && (
                            <div className="bg-red-500/90 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">Stopped in {frame.arrest}</div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Graph + Controls */}
                <div className="w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col flex-1 lg:flex-none min-h-0">
                    <div className={`flex-1 p-4 min-h-0 flex-col border-b border-slate-800 ${mobileView === '3d' ? 'hidden lg:flex' : 'flex'}`}>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Cardiogram (upstroke = systole)</h3>
                        <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative min-h-[180px]">
                            <PerfusionGraph data={data} marks={marks} isRecording={isRecording} heartRate={heartRate} arrest={frame.arrest} />
                        </div>
                    </div>

                    <div className="p-4 lg:p-6 bg-slate-900 z-10 space-y-4 overflow-y-auto lg:max-h-[62%]">
                        {/* What to do next */}
                        <div className={`rounded-lg border p-3 text-sm ${notice ? 'bg-amber-950/40 border-amber-600/50 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200'}`} aria-live="polite">
                            {guidance}
                        </div>

                        {/* Heart rate and sound */}
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${heartRate > 0 ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-sm text-slate-300">Heart Rate</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-lg font-mono font-bold ${heartRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {heartRate > 0 ? `${heartRate} bpm` : 'Stopped'}
                                </span>
                                <button
                                    onClick={() => { ensureAudioContext(); setSoundMuted(mu => !mu); }}
                                    className={`p-1.5 rounded-lg transition-all border ${soundMuted
                                        ? 'bg-slate-700 border-slate-600 text-slate-500'
                                        : 'bg-red-900/40 border-red-700/50 text-red-400 hover:bg-red-900/60'}`}
                                    title={soundMuted ? 'Unmute heartbeat sound' : 'Mute heartbeat sound'}
                                >
                                    {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Start / stop */}
                        <div className="flex gap-3">
                            {!isRecording ? (
                                <button onClick={handleStart}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                    <Play className="w-5 h-5" /> Start Recording
                                </button>
                            ) : (
                                <button onClick={handleStop}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Square className="w-5 h-5" /> Stop
                                </button>
                            )}
                            <button onClick={handleReset}
                                className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>

                        {/* Chemicals */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                <Droplet className="w-4 h-4 text-cyan-400" /> Add through the cannula (one at a time)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {AGENT_ORDER.map(id => {
                                    const a = AGENTS[id];
                                    const active = isRecording && frame.agent === id;
                                    return (
                                        <button key={id} onClick={() => applyAgent(id)} aria-disabled={!canAdd}
                                            className={`text-left rounded-lg border px-3 py-2 transition-all ${active ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'} ${canAdd || active ? '' : 'opacity-50'}`}
                                            style={{ borderColor: active ? a.color : '#334155' }}>
                                            <span className="block text-sm font-bold" style={{ color: a.color }}>{a.label}</span>
                                            <span className="block text-[11px] text-slate-400 leading-tight">{a.dose}</span>
                                        </button>
                                    );
                                })}
                                <button onClick={washHeart} aria-disabled={!(isRecording && frame.agent)}
                                    className={`text-left rounded-lg border border-emerald-600/60 bg-emerald-950/40 hover:bg-emerald-900/40 px-3 py-2 transition-all ${isRecording && frame.agent ? '' : 'opacity-50'}`}>
                                    <span className="block text-sm font-bold text-emerald-300">Wash with Ringer</span>
                                    <span className="block text-[11px] text-slate-400 leading-tight">Before and after every chemical</span>
                                </button>
                            </div>
                        </div>

                        {/* Perfusion pressure */}
                        <button onClick={toggleReservoir}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-blue-200 font-bold py-3 rounded-xl transition-all border border-blue-500/40 flex items-center justify-center gap-2">
                            {raised ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                            {raised ? 'Lower the reservoir' : 'Raise the reservoir (perfusion pressure)'}
                        </button>

                        {/* What was seen, and why */}
                        {explain && results[lastRow!] && (
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-1.5">
                                <p className="font-bold text-slate-100">{ROW_LABEL[lastRow!]}</p>
                                <p className="text-slate-200"><span className="text-slate-400">Seen: </span>{explain.seen}</p>
                                <p className="text-slate-200"><span className="text-slate-400">Why: </span>{explain.why}</p>
                            </div>
                        )}

                        {/* Results */}
                        {rows.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-400" /> Results
                                    </label>
                                    <button onClick={() => { setResults({}); setLastRow(null); }} className="text-xs text-slate-400 hover:text-slate-200 underline">Clear</button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-700">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-800 text-slate-400">
                                            <tr>
                                                <th className="text-left font-semibold px-2 py-1.5">Effect of</th>
                                                <th className="text-right font-semibold px-2 py-1.5">Rate (bpm)</th>
                                                <th className="text-right font-semibold px-2 py-1.5">Force (% of normal beat)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(r => {
                                                const x = results[r]!;
                                                return (
                                                    <tr key={r} className="border-t border-slate-800">
                                                        <td className="px-2 py-1.5 text-slate-200">
                                                            {ROW_LABEL[r]}
                                                            {x.note && <span className="block text-red-300">{x.note}</span>}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{x.beforeHr} → {x.hr}</td>
                                                        <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{x.beforeForce} → {x.force}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
