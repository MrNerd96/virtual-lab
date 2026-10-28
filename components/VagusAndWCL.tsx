import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Cylinder, Box, Sphere, Tube, Torus } from '@react-three/drei';
import { LabEnvironment } from './LabEnvironment';
import { ArrowLeft, Eye, LineChart, Zap, RefreshCw, Play, Square, Volume2, VolumeX, Moon, Sun, Activity, ListChecks } from 'lucide-react';
import * as THREE from 'three';
import { useHeartbeatSound } from './useHeartbeatSound';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';
import { InteractiveObject, MyographBoard, FrogBody, FrogHeart, SpringLoadedLever, HeartThread } from './NormalCardiogram';

// --- Types & Constants ---

type Site = 'right-vagus' | 'left-vagus' | 'wcl';
type Drug = 'nicotine' | 'atropine' | 'ringer';
type ExperimentId = 'graded' | 'escape' | 'wcl' | 'drugs';

interface Beat { t0: number; dur: number; amp: number; idio?: boolean }
interface Stim { t0: number; t1: number; site: Site; strength: 'low' | 'high' }
interface DrugEvent { t: number; drug: Drug }
interface Annotation { t: number; text: string; color: string; row: 0 | 1 }

interface Protocol {
    id: ExperimentId;
    title: string;
    duration: number;
    beats: Beat[];
    stims: Stim[];
    drugs: DrugEvent[];
    annotations: Annotation[];
}

const NORMAL_PERIOD = 2000; // 30 beats/min at room temperature
const ESCAPE_PERIOD = 4000; // idioventricular rhythm ~15 beats/min
const SAMPLE_INTERVAL = 20; // ms between data points (50 samples/sec)

const SITE_LABELS: Record<Site, string> = {
    'right-vagus': 'Right Vagus',
    'left-vagus': 'Left Vagus',
    'wcl': 'WCL',
};

const DRUG_INFO: Record<Drug, { label: string; color: string }> = {
    nicotine: { label: 'Nicotine', color: '#f59e0b' },
    atropine: { label: 'Atropine', color: '#c084fc' },
    ringer: { label: 'Ringer wash', color: '#22d3ee' },
};

// Sequential beat builder — keeps protocol definitions readable
function beatSequence() {
    const beats: Beat[] = [];
    let t = 0;
    const api = {
        beats(n: number, dur: number, amp: number | number[], idio = false) {
            for (let i = 0; i < n; i++) {
                beats.push({ t0: t, dur, amp: Array.isArray(amp) ? amp[i] : amp, idio });
                t += dur;
            }
            return api;
        },
        arrest(ms: number) { t += ms; return api; },
        get list() { return beats; },
    };
    return api;
}

const P = NORMAL_PERIOD;

const PROTOCOLS: Protocol[] = [
    {
        id: 'graded',
        title: '1. Graded stimulation of vagosympathetic trunk',
        duration: 42000,
        beats: beatSequence()
            .beats(4, P, 1)                       // normal cardiogram
            .beats(1, P, 0.95)                    // latent period after low-strength stimulus
            .beats(2, 3000, 0.7)                  // slower & weaker
            .beats(1, 2800, 0.75)
            .beats(3, P, 1)                       // recovery
            .beats(1, P, 0.8)                     // high-strength stimulus begins
            .arrest(5200)                         // stops in diastole
            .beats(5, P, [0.7, 0.82, 0.92, 1, 1]) // staircase on recovery
            .list,
        stims: [
            { t0: 8000, t1: 18000, site: 'right-vagus', strength: 'low' },
            { t0: 24800, t1: 31000, site: 'right-vagus', strength: 'high' },
        ],
        drugs: [],
        annotations: [
            { t: 3000, text: 'Normal', color: '#4ade80', row: 1 },
            { t: 13000, text: 'Low strength: slower, weaker', color: '#fbbf24', row: 0 },
            { t: 29000, text: 'High strength: arrest', color: '#f87171', row: 1 },
            { t: 36000, text: 'Staircase', color: '#c084fc', row: 0 },
        ],
    },
    {
        id: 'escape',
        title: '2. Vagal inhibition & vagal escape',
        duration: 43000,
        beats: beatSequence()
            .beats(4, P, 1)
            .beats(1, P, 0.85)
            .arrest(8000)
            .beats(4, ESCAPE_PERIOD, 0.85, true)  // idioventricular escape beats
            .arrest(800)
            .beats(4, P, [0.85, 0.95, 1, 1])
            .list,
        stims: [
            { t0: 8000, t1: 34200, site: 'right-vagus', strength: 'high' },
        ],
        drugs: [],
        annotations: [
            { t: 3000, text: 'Normal', color: '#4ade80', row: 1 },
            { t: 14000, text: 'Vagal inhibition', color: '#f87171', row: 0 },
            { t: 26000, text: 'Vagal escape (~15/min)', color: '#fbbf24', row: 1 },
            { t: 38500, text: 'Stimulus off', color: '#4ade80', row: 0 },
        ],
    },
    {
        id: 'wcl',
        title: '3. Right vagus, left vagus & white crescentic line',
        duration: 46000,
        beats: beatSequence()
            .beats(3, P, 1)
            .beats(1, P, 0.9)
            .arrest(4000)                          // right vagus: arrest
            .beats(4, P, [0.8, 0.92, 1, 1])
            .beats(1, P, 1)
            .beats(2, 3000, 0.75)                  // left vagus: slowing only
            .beats(3, P, 1)
            .beats(1, P, 0.9)
            .arrest(4000)                          // WCL: arrest
            .beats(3, P, [0.8, 0.92, 1])
            .list,
        stims: [
            { t0: 6000, t1: 11000, site: 'right-vagus', strength: 'high' },
            { t0: 20000, t1: 26000, site: 'left-vagus', strength: 'high' },
            { t0: 34000, t1: 38000, site: 'wcl', strength: 'high' },
        ],
        drugs: [],
        annotations: [
            { t: 10000, text: 'Right vagus: arrest', color: '#f87171', row: 0 },
            { t: 25000, text: 'Left vagus: slowing', color: '#fbbf24', row: 1 },
            { t: 38000, text: 'WCL: arrest', color: '#e2e8f0', row: 0 },
        ],
    },
    {
        id: 'drugs',
        title: '4. Effect of nicotine & atropine',
        duration: 47000,
        beats: beatSequence()
            .beats(2, P, 1)
            .beats(2, P, 1)                        // nicotine applied: no effect on heart
            .beats(2, P, 1)                        // vagus stimulated: no effect
            .beats(2, P, 1)
            .beats(1, P, 0.9)
            .arrest(3000)                          // WCL stimulated: inhibited
            .beats(2, P, [0.85, 1])
            .beats(2, P, 1)                        // washed with Ringer
            .beats(2, P, 1)                        // atropine applied: no effect on heart
            .beats(2, P, 1)                        // vagus stimulated: no effect
            .beats(1, P, 1)
            .beats(4, P, 1)                        // WCL stimulated: no effect
            .list,
        stims: [
            { t0: 8000, t1: 12000, site: 'right-vagus', strength: 'high' },
            { t0: 16000, t1: 20000, site: 'wcl', strength: 'high' },
            { t0: 33000, t1: 37000, site: 'right-vagus', strength: 'high' },
            { t0: 39000, t1: 43000, site: 'wcl', strength: 'high' },
        ],
        drugs: [
            { t: 4000, drug: 'nicotine' },
            { t: 25000, drug: 'ringer' },
            { t: 29000, drug: 'atropine' },
        ],
        annotations: [
            { t: 10000, text: 'Vagus: no effect', color: '#94a3b8', row: 0 },
            { t: 19000, text: 'WCL: inhibited', color: '#f87171', row: 1 },
            { t: 35000, text: 'Vagus: no effect', color: '#94a3b8', row: 0 },
            { t: 41500, text: 'WCL: no effect', color: '#94a3b8', row: 1 },
        ],
    },
];

// --- Waveform ---

// One cardiac cycle mapped to phase 0..1. Baseline (diastole) is 3, deflection is downward.
// Sinus beat: atrial systole → atrial diastole → AV delay → ventricular systole → relaxation.
// Idioventricular beat: no atrial component — only the ventricle contracts.
function beatWaveform(phase: number, amp: number, idio: boolean): number {
    const smooth = (p: number) => (1 - Math.cos(p * Math.PI)) / 2;
    let y: number;
    if (idio) {
        if (phase < 0.3) y = 3.0;
        else if (phase < 0.48) y = 3.0 - 3.0 * smooth((phase - 0.3) / 0.18);
        else y = 3.0 * smooth((phase - 0.48) / 0.52);
    } else if (phase < 0.16) {
        y = 3.0 - 2.0 * smooth(phase / 0.16);
    } else if (phase < 0.32) {
        y = 1.0 + 1.0 * smooth((phase - 0.16) / 0.16);
    } else if (phase < 0.40) {
        y = 2.0;
    } else if (phase < 0.56) {
        y = 2.0 - 2.0 * smooth((phase - 0.40) / 0.16);
    } else {
        y = 3.0 * smooth((phase - 0.56) / 0.44);
    }
    // Scale the deflection, not the baseline
    return 3.0 - (3.0 - y) * amp;
}

function sampleProtocol(protocol: Protocol, t: number) {
    const beat = protocol.beats.find(b => t >= b.t0 && t < b.t0 + b.dur);
    if (!beat) return { y: 3.0, phase: -1, hr: 0 };
    const phase = (t - beat.t0) / beat.dur;
    return { y: beatWaveform(phase, beat.amp, !!beat.idio), phase, hr: Math.round(60000 / beat.dur) };
}

const activeStimAt = (protocol: Protocol, t: number) => protocol.stims.find(s => t >= s.t0 && t < s.t1) || null;

// Drum speed chosen so that the whole protocol fits on one revolution of the drum
const drumSpeedFor = (protocol: Protocol) => Math.round(((2048 - 160) / 15 / (protocol.duration / 1000)) * 10) / 10;

// --- Coordinate helpers ---
// The frog/board assembly is built from nested rotated groups (shared with NormalCardiogram).
// These map points from the frog-body frame and the heart frame into the scene group frame.
type Vec3 = [number, number, number];
const bodyToScene = ([x, y, z]: Vec3): Vec3 => [-x - 0.01, y - 0.84, -z + 0.05];
const heartToScene = ([x, y, z]: Vec3): Vec3 => [x - 0.01, -0.56 - y, 0.55 - z];

const NERVE_PATHS: Record<'right-vagus' | 'left-vagus', Vec3[]> = {
    'right-vagus': [[0.34, -0.06, -1.3], [0.28, 0.05, -1.0], [0.2, 0.08, -0.8], [0.1, 0.0, -0.62], [0.03, -0.12, -0.52]],
    'left-vagus': [[-0.34, -0.06, -1.3], [-0.28, 0.05, -1.0], [-0.2, 0.08, -0.8], [-0.1, 0.0, -0.62], [-0.03, -0.12, -0.52]],
};

// The WCL is drawn as a crescent around the base of the heart on the side facing the camera
// (anatomically it lies at the sinus venosus–atrial junction; see the 2D dorsal-view inset).
const WCL_CENTER = heartToScene([0, 0.15, 0]);
const WCL_RADIUS = 0.33;
const WCL_FACING = (175 * Math.PI) / 180; // angle in the scene XZ plane pointing toward the camera

const ELECTRODE_TIPS: Record<Site, Vec3> = {
    'right-vagus': bodyToScene([0.28, 0.07, -1.0]),
    'left-vagus': bodyToScene([-0.28, 0.07, -1.0]),
    'wcl': [WCL_CENTER[0] + WCL_RADIUS * Math.cos(WCL_FACING), WCL_CENTER[1], WCL_CENTER[2] + WCL_RADIUS * Math.sin(WCL_FACING)],
};

const COIL_POSITION: Vec3 = [2.3, -1.0, 1.7];
const COIL_ROTATION_Y = Math.PI + 0.4;
// Map a point from the induction coil's own frame (x runs from the hammer end to the secondary end) into the scene
const coilToScene = ([x, y, z]: Vec3): Vec3 => {
    const c = Math.cos(COIL_ROTATION_Y), sn = Math.sin(COIL_ROTATION_Y);
    return [COIL_POSITION[0] + x * c + z * sn, COIL_POSITION[1] + y, COIL_POSITION[2] - x * sn + z * c];
};
// The stimulating electrodes are connected to the secondary coil's binding post
const SECONDARY_TERMINAL = coilToScene([0.78, 0.14, 0.12]);

// --- 3D Components ---

// Vagosympathetic trunk running from the base of the skull to the sinus venosus
const VagosympatheticTrunk = ({ side, active, onHoverChange }: {
    side: 'right-vagus' | 'left-vagus',
    active: boolean,
    onHoverChange?: (l: string | null) => void
}) => {
    const curve = useMemo(
        () => new THREE.CatmullRomCurve3(NERVE_PATHS[side].map(p => new THREE.Vector3(...bodyToScene(p)))),
        [side]
    );
    const matRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock }) => {
        if (matRef.current) {
            matRef.current.emissiveIntensity = active ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 30) : 0;
        }
    });

    return (
        <InteractiveObject label={`${side === 'right-vagus' ? 'Right' : 'Left'} Vagosympathetic Trunk`} onHoverChange={onHoverChange}>
            <Tube args={[curve, 40, 0.026, 8, false]}>
                <meshStandardMaterial ref={matRef} color="#f5f0d8" emissive="#fbbf24" emissiveIntensity={0} roughness={0.4} />
            </Tube>
        </InteractiveObject>
    );
};

// White crescentic line at the junction of the sinus venosus and the atria
const WhiteCrescenticLine = ({ active, onHoverChange }: { active: boolean, onHoverChange?: (l: string | null) => void }) => {
    const matRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock }) => {
        if (matRef.current) {
            matRef.current.emissiveIntensity = active ? 0.8 + 0.6 * Math.sin(clock.elapsedTime * 30) : 0.25;
        }
    });

    return (
        <InteractiveObject label="White Crescentic Line (Remak's ganglion)" onHoverChange={onHoverChange}>
            <group position={WCL_CENTER} rotation={[0, -(WCL_FACING - Math.PI * 0.4), 0]}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                    <Torus args={[WCL_RADIUS, 0.025, 8, 40, Math.PI * 0.8]}>
                        <meshStandardMaterial ref={matRef} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} roughness={0.3} />
                    </Torus>
                </group>
            </group>
        </InteractiveObject>
    );
};

// Stimulating electrode — moves to the selected site and sparks while stimulating
const StimulatingElectrode = ({ site, active, onHoverChange }: {
    site: Site,
    active: boolean,
    onHoverChange?: (l: string | null) => void
}) => {
    const tip = ELECTRODE_TIPS[site];
    const sparkRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
    const HANDLE_TOP: Vec3 = [tip[0] - 0.25, tip[1] + 0.95, tip[2] + 0.1];

    const cable = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(...HANDLE_TOP),
        new THREE.Vector3(HANDLE_TOP[0] + 0.6, HANDLE_TOP[1] + 0.4, HANDLE_TOP[2] + 0.3),
        new THREE.Vector3(SECONDARY_TERMINAL[0] - 0.4, SECONDARY_TERMINAL[1] + 0.5, SECONDARY_TERMINAL[2]),
        new THREE.Vector3(SECONDARY_TERMINAL[0], SECONDARY_TERMINAL[1] + 0.15, SECONDARY_TERMINAL[2]),
        new THREE.Vector3(...SECONDARY_TERMINAL),
    ]), [site]);

    // Direction from tip to handle, used to orient the electrode
    const { quaternion, length } = useMemo(() => {
        const dir = new THREE.Vector3(HANDLE_TOP[0] - tip[0], HANDLE_TOP[1] - tip[1], HANDLE_TOP[2] - tip[2]);
        const len = dir.length();
        return { quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), length: len };
    }, [site]);

    useFrame(() => {
        sparkRefs.forEach(ref => {
            if (ref.current) {
                ref.current.visible = active;
                ref.current.scale.setScalar(0.6 + Math.random() * 0.8);
            }
        });
    });

    return (
        <InteractiveObject label="Stimulating Electrode" onHoverChange={onHoverChange}>
            <group position={tip} quaternion={quaternion}>
                {/* Twin silver wire tips */}
                {[-0.025, 0.025].map((dx, i) => (
                    <group key={i}>
                        <Cylinder args={[0.006, 0.006, length * 0.45]} position={[dx, length * 0.225, 0]}>
                            <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.15} />
                        </Cylinder>
                        <Sphere ref={sparkRefs[i]} args={[0.022, 8, 8]} position={[dx, 0, 0]} visible={false}>
                            <meshBasicMaterial color="#fde047" />
                        </Sphere>
                    </group>
                ))}
                {/* Ebonite handle */}
                <Cylinder args={[0.035, 0.03, length * 0.55]} position={[0, length * 0.725, 0]}>
                    <meshStandardMaterial color="#18181b" roughness={0.5} />
                </Cylinder>
            </group>
            <Tube args={[cable, 32, 0.012, 6, false]}>
                <meshStandardMaterial color={active ? '#dc2626' : '#7f1d1d'} roughness={0.6} />
            </Tube>
        </InteractiveObject>
    );
};

// Du Bois-Reymond induction coil with Neef's hammer (automatic interrupter for repeated/tetanizing stimuli).
// Local frame: x runs from the hammer end (−x) to the secondary coil end (+x), y up, z towards the front scale.
const BRASS = '#c9a227';
const WOOD = '#9a5b2e';
const WOOD_DARK = '#6b3b1c';

const BindingPost = ({ position }: { position: Vec3 }) => (
    <group position={position}>
        <Cylinder args={[0.022, 0.026, 0.05, 12]} position={[0, 0.025, 0]}>
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.25} />
        </Cylinder>
        <Cylinder args={[0.03, 0.03, 0.025, 16]} position={[0, 0.065, 0]}>
            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} />
        </Cylinder>
    </group>
);

const InductionCoil = ({ active, onHoverChange }: { active: boolean, onHoverChange?: (l: string | null) => void }) => {
    const hammerRef = useRef<THREE.Group>(null);
    const sparkRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (hammerRef.current) {
            // Spring strip and armature flutter against the contact screw while the circuit is made and broken
            hammerRef.current.rotation.x = active ? -0.04 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 70)) : 0;
        }
        if (sparkRef.current) {
            sparkRef.current.visible = active && Math.sin(clock.elapsedTime * 70) > 0.3;
            sparkRef.current.scale.setScalar(0.6 + Math.random() * 0.8);
        }
    });

    return (
        <InteractiveObject label="Induction Coil (Du Bois-Reymond)" onHoverChange={onHoverChange}>
            <group position={COIL_POSITION} rotation={[0, COIL_ROTATION_Y, 0]}>
                {/* Two-layer wooden base */}
                <Box args={[1.8, 0.07, 0.46]} position={[-0.05, 0, 0]}>
                    <meshStandardMaterial color={WOOD} roughness={0.6} />
                </Box>
                <Box args={[1.82, 0.05, 0.48]} position={[-0.05, -0.06, 0]}>
                    <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
                </Box>

                {/* Brass scale (cm) along the front edge, for the secondary coil's position */}
                <Box args={[0.86, 0.01, 0.055]} position={[0.36, 0.04, 0.2]}>
                    <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
                </Box>
                {Array.from({ length: 16 }, (_, i) => (
                    <Box key={i} args={[0.004, 0.012, i % 5 === 0 ? 0.03 : 0.018]} position={[-0.02 + i * 0.05, 0.046, 0.21]}>
                        <meshStandardMaterial color="#3f2a0a" />
                    </Box>
                ))}
                {/* Maker's plate */}
                <Box args={[0.2, 0.05, 0.006]} position={[-0.2, 0, 0.232]}>
                    <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
                </Box>

                {/* Rails for the sliding secondary coil */}
                {[-0.1, 0.1].map(z => (
                    <Box key={z} args={[0.95, 0.025, 0.03]} position={[0.32, 0.048, z]}>
                        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
                    </Box>
                ))}

                {/* Wooden upright carrying the hammer and the primary coil */}
                <Box args={[0.1, 0.32, 0.34]} position={[-0.5, 0.195, 0]}>
                    <meshStandardMaterial color={WOOD} roughness={0.55} />
                </Box>
                <BindingPost position={[-0.5, 0.355, -0.1]} />
                <BindingPost position={[-0.5, 0.355, 0.1]} />

                {/* Primary coil (green wire) — runs from the upright into the secondary coil */}
                <InteractiveObject label="Primary Coil" onHoverChange={onHoverChange}>
                    <Cylinder args={[0.075, 0.075, 0.72, 28]} position={[-0.09, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color="#166534" roughness={0.45} metalness={0.2} />
                    </Cylinder>
                    {[-0.44, 0.26].map(x => (
                        <Cylinder key={x} args={[0.085, 0.085, 0.025, 28]} position={[x, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
                            <meshStandardMaterial color="#1c1917" roughness={0.5} />
                        </Cylinder>
                    ))}
                </InteractiveObject>

                {/* Secondary coil on its sliding carriage — moving it away from the primary weakens the stimulus */}
                <InteractiveObject label="Secondary Coil (slides to vary stimulus strength)" onHoverChange={onHoverChange}>
                    {/* Carriage top sits just below the flanges, and two saddles cradle the coil with a hairline gap,
                        so no surfaces coincide or cross at a shallow angle (which shows as z-fighting flicker) */}
                    <Box args={[0.44, 0.05, 0.3]} position={[0.42, 0.06, 0]}>
                        <meshStandardMaterial color={WOOD} roughness={0.6} />
                    </Box>
                    {[0.32, 0.52].map(x => (
                        <Box key={x} args={[0.06, 0.02, 0.18]} position={[x, 0.095, 0]}>
                            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
                        </Box>
                    ))}
                    <Cylinder args={[0.15, 0.15, 0.4, 32]} position={[0.42, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color="#292524" roughness={0.6} />
                    </Cylinder>
                    {[0.22, 0.62].map(x => (
                        <Cylinder key={x} args={[0.17, 0.17, 0.04, 32]} position={[x, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
                            <meshStandardMaterial color="#1c1917" roughness={0.55} />
                        </Cylinder>
                    ))}
                    {/* Hollow bore the primary slides into */}
                    <Cylinder args={[0.09, 0.09, 0.445, 24]} position={[0.42, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
                    </Cylinder>
                </InteractiveObject>
                {/* Secondary terminals (stimulating electrodes are connected here) */}
                <Box args={[0.1, 0.008, 0.32]} position={[0.78, 0.04, 0]}>
                    <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
                </Box>
                <BindingPost position={[0.78, 0.04, -0.12]} />
                <BindingPost position={[0.78, 0.04, 0.12]} />

                {/* Neef's hammer: electromagnet, spring strip with iron armature, and contact screw */}
                <InteractiveObject label="Neef's Hammer (automatic interrupter)" onHoverChange={onHoverChange}>
                    <group position={[-0.7, 0, 0.12]}>
                        {/* Electromagnet: two vertical coils side by side along the base, on an iron yoke */}
                        <Box args={[0.21, 0.02, 0.11]} position={[0, 0.045, 0]}>
                            <meshStandardMaterial color="#1c1917" roughness={0.5} />
                        </Box>
                        {[-0.05, 0.05].map(x => (
                            <group key={x} position={[x, 0, 0]}>
                                <Cylinder args={[0.04, 0.04, 0.15, 20]} position={[0, 0.13, 0]}>
                                    <meshStandardMaterial color="#166534" roughness={0.45} metalness={0.2} />
                                </Cylinder>
                                <Cylinder args={[0.043, 0.043, 0.012, 20]} position={[0, 0.21, 0]}>
                                    <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
                                </Cylinder>
                            </group>
                        ))}
                        {/* Tapered brass pillar standing on the board behind the coils */}
                        <group position={[0, 0, -0.22]}>
                            <Cylinder args={[0.045, 0.05, 0.015, 24]} position={[0, 0.043, 0]}>
                                <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} />
                            </Cylinder>
                            <Cylinder args={[0.018, 0.03, 0.195, 16]} position={[0, 0.148, 0]}>
                                <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.25} />
                            </Cylinder>
                            <Cylinder args={[0.022, 0.022, 0.012, 16]} position={[0, 0.25, 0]}>
                                <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} />
                            </Cylinder>
                            <Cylinder args={[0.012, 0.012, 0.01, 12]} position={[0, 0.26, 0]}>
                                <meshStandardMaterial color="#a8a29e" metalness={0.9} roughness={0.25} />
                            </Cylinder>
                        </group>
                        {/* Spring bar from the pillar top forward to the flat iron armature lying on both coils */}
                        <group position={[0, 0.248, -0.22]}>
                            <group ref={hammerRef}>
                                <Box args={[0.035, 0.008, 0.23]} position={[0, 0, 0.115]}>
                                    <meshStandardMaterial color="#d6d3d1" metalness={0.85} roughness={0.2} />
                                </Box>
                                <Box args={[0.19, 0.022, 0.1]} position={[0, -0.016, 0.22]}>
                                    <meshStandardMaterial color="#3f3a36" metalness={0.55} roughness={0.45} />
                                </Box>
                                <Cylinder args={[0.014, 0.014, 0.01, 14]} position={[0, 0.006, 0.22]}>
                                    <meshStandardMaterial color="#a8a29e" metalness={0.9} roughness={0.25} />
                                </Cylinder>
                            </group>
                        </group>
                        {/* Brass bracket on top of the upright, reaching out over the middle of the spring */}
                        <Box args={[0.21, 0.022, 0.07]} position={[0.065, 0.366, -0.11]}>
                            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.25} />
                        </Box>
                        {/* Contact screw through the bracket, with its black knurled head on top */}
                        <Cylinder args={[0.03, 0.03, 0.012, 20]} position={[0, 0.383, -0.11]}>
                            <meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} />
                        </Cylinder>
                        <Cylinder args={[0.042, 0.042, 0.035, 24]} position={[0, 0.406, -0.11]}>
                            <meshStandardMaterial color="#0c0a09" roughness={0.4} />
                        </Cylinder>
                        <Cylinder args={[0.01, 0.01, 0.099, 12]} position={[0, 0.3055, -0.11]}>
                            <meshStandardMaterial color="#e7e5e4" metalness={0.9} roughness={0.2} />
                        </Cylinder>
                        {/* Terminals c (electromagnet) and d (pillar) on the board at the hammer end */}
                        <BindingPost position={[-0.18, 0.035, 0]} />
                        <BindingPost position={[-0.18, 0.035, -0.22]} />
                        {/* Spark at the contact point while the hammer is vibrating */}
                        <Sphere ref={sparkRef} args={[0.015, 8, 8]} position={[0, 0.254, -0.11]} visible={false}>
                            <meshBasicMaterial color="#fde68a" />
                        </Sphere>
                    </group>
                </InteractiveObject>
            </group>
        </InteractiveObject>
    );
};

// Dropper used to pour drugs / Ringer solution over the heart
const DrugDropper = ({ drug }: { drug: Drug | null }) => {
    const dropRef = useRef<THREE.Mesh>(null);
    const color = drug ? DRUG_INFO[drug].color : '#ffffff';

    useFrame((_, delta) => {
        if (dropRef.current) {
            dropRef.current.position.y -= delta * 1.5;
            if (dropRef.current.position.y < -0.9) dropRef.current.position.y = -0.4;
        }
    });

    if (!drug) return null;

    return (
        <group position={[heartToScene([0, -0.3, 0])[0] + 0.25, 0.75, heartToScene([0, 0, 0])[2]]}>
            <Cylinder args={[0.04, 0.04, 0.6]}>
                <meshPhysicalMaterial color="#f0f0f0" transmission={0.7} roughness={0} thickness={0.5} />
            </Cylinder>
            <Sphere args={[0.06, 16, 16]} position={[0, 0.35, 0]}>
                <meshStandardMaterial color="#333333" roughness={0.8} />
            </Sphere>
            <Cylinder args={[0.015, 0.035, 0.15]} position={[0, -0.35, 0]}>
                <meshPhysicalMaterial color="#f0f0f0" transmission={0.6} roughness={0} thickness={0.3} />
            </Cylinder>
            <Cylinder args={[0.03, 0.03, 0.4]} position={[0, -0.05, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.8} />
            </Cylinder>
            <Sphere ref={dropRef} args={[0.025, 8, 8]} position={[0, -0.45, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.9} />
            </Sphere>
        </group>
    );
};

// Kymograph drum — writes the cardiogram and the signal marker line
const VagalKymograph = ({
    simTime,
    waveformValue,
    stimulating,
    isRecording,
    resetKey,
    drumSpeed,
    onHoverChange,
}: {
    simTime: number,
    waveformValue: number,
    stimulating: boolean,
    isRecording: boolean,
    resetKey: number,
    drumSpeed: number,
    onHoverChange?: (l: string | null) => void,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const lastDrawState = useRef<{ x: number, y: number } | null>(null);
    const drumRef = useRef<THREE.Group>(null);
    const SPEED_SCALE = 15.0;
    const SIGNAL_Y = 400;

    const paintSoot = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 2048, 512);
        ctx.fillStyle = '#0d0d0d';
        for (let i = 0; i < 200; i++) {
            ctx.fillRect(Math.random() * 2048, Math.random() * 512, Math.random() * 4, Math.random() * 4);
        }
    };

    const texture = useMemo(() => {
        const canvas = canvasRef.current;
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) paintSoot(ctx);
        return new THREE.CanvasTexture(canvas);
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            paintSoot(ctx);
            texture.needsUpdate = true;
        }
        lastDrawState.current = null;
    }, [resetKey, texture]);

    useFrame(() => {
        if (!isRecording) { lastDrawState.current = null; return; }
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const x = 80 + ((simTime / 1000) * drumSpeed * SPEED_SCALE);
        const y = (512 * 0.40) - (waveformValue * 30);

        if (lastDrawState.current) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(lastDrawState.current.x, lastDrawState.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Signal marker: flat line, vibrates while Neef's hammer is running
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(lastDrawState.current.x, SIGNAL_Y);
            ctx.lineTo(x, SIGNAL_Y);
            ctx.stroke();
            if (stimulating) {
                ctx.beginPath();
                ctx.moveTo(x, SIGNAL_Y - 14);
                ctx.lineTo(x, SIGNAL_Y + 14);
                ctx.stroke();
            }
            texture.needsUpdate = true;
        }
        lastDrawState.current = { x, y };

        if (drumRef.current) {
            const angle = ((x - 80) / 2048) * (2 * Math.PI);
            drumRef.current.rotation.y = 1.8 + Math.PI - angle;
        }
    });

    return (
        <InteractiveObject label="Kymograph Drum (Cardiogram + Signal Marker)" onHoverChange={onHoverChange}>
            <group ref={drumRef} rotation={[0, 1.8 + Math.PI, 0]}>
                <Cylinder args={[1.0, 1.0, 2.5, 64]}>
                    <meshBasicMaterial attach="material-0" map={texture} />
                    <meshStandardMaterial attach="material-1" color="#111" />
                    <meshStandardMaterial attach="material-2" color="#111" />
                </Cylinder>
            </group>
            <Cylinder args={[0.06, 0.06, 3.5]} position={[0, -0.15, 0]}>
                <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </Cylinder>
            <Box args={[1.2, 0.45, 1.5]} position={[0, -1.75, 0]}>
                <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.6} />
            </Box>
        </InteractiveObject>
    );
};

// --- Camera controls helper ---
// OrbitControls pans and zooms in proportion to the camera's distance from its target. With a fixed
// target, zooming in on small parts (e.g. the Neef's hammer) makes panning crawl. On every press or
// scroll, move the target along the current view direction to the depth of whatever is under the
// cursor: the view does not jump, but pan/zoom speed now matches the object being looked at.
const CursorDepthTarget = () => {
    const { camera, scene, gl, controls, raycaster } = useThree();

    useEffect(() => {
        const el = gl.domElement;
        const ndc = new THREE.Vector2();
        const viewDir = new THREE.Vector3();
        const retarget = (e: PointerEvent | WheelEvent) => {
            const orbit = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
            if (!orbit) return;
            const rect = el.getBoundingClientRect();
            ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            const hit = raycaster.intersectObjects(scene.children, true).find(h => h.object.visible);
            if (!hit) return;
            camera.getWorldDirection(viewDir);
            const depth = hit.point.clone().sub(camera.position).dot(viewDir);
            if (depth < 0.05) return;
            orbit.target.copy(camera.position).addScaledVector(viewDir, depth);
            orbit.update();
        };
        el.addEventListener('pointerdown', retarget, { capture: true });
        el.addEventListener('wheel', retarget, { capture: true, passive: true });
        return () => {
            el.removeEventListener('pointerdown', retarget, { capture: true });
            el.removeEventListener('wheel', retarget, { capture: true });
        };
    }, [camera, scene, gl, controls, raycaster]);

    return null;
};

// --- Cardiogram Graph (Oscilloscope style, whole protocol on one sweep) ---
const VagalCardiogramGraph = ({
    protocol,
    data,
    latestT,
    isRecording,
    heartRate,
}: {
    protocol: Protocol;
    data: { t: number; y: number }[];
    latestT: number;
    isRecording: boolean;
    heartRate: number;
}) => {
    const traceColor = "#4ade80";
    const gridColor = "#14532d";
    const gridColorMajor = "#166534";
    const bgColor = "#020617";
    const markerColor = "#ef4444";

    const svgWidth = 900;
    const svgHeight = 380;
    const margin = { top: 92, right: 20, bottom: 100, left: 40 };
    const plotW = svgWidth - margin.left - margin.right;
    const plotH = svgHeight - margin.top - margin.bottom;
    const signalY = svgHeight - margin.bottom + 28;
    const drugRowY = svgHeight - 18;

    const yMin = -0.3;
    const yMax = 3.3;
    const yScale = (y: number) => margin.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
    const xScale = (t: number) => margin.left + (t / protocol.duration) * plotW;

    const shown = (t: number) => !isRecording || t <= latestT;
    const hasData = data.length > 0;

    const pathD = data.length > 1 ? `M ${data.map(d => `${xScale(d.t).toFixed(1)},${yScale(d.y).toFixed(1)}`).join(' L ')}` : '';

    // Signal marker: flat line with Neef's hammer vibration during stimulation
    const signalEnd = isRecording ? latestT : (hasData ? protocol.duration : 0);
    const signalPath = (() => {
        if (signalEnd <= 0) return '';
        let d = `M ${xScale(0)} ${signalY}`;
        protocol.stims.forEach(s => {
            if (s.t0 >= signalEnd) return;
            const end = Math.min(s.t1, signalEnd);
            d += ` L ${xScale(s.t0)} ${signalY}`;
            let up = true;
            for (let t = s.t0; t < end; t += 90) {
                d += ` L ${xScale(t)} ${signalY + (up ? -9 : 9)}`;
                up = !up;
            }
            d += ` L ${xScale(end)} ${signalY}`;
        });
        d += ` L ${xScale(signalEnd)} ${signalY}`;
        return d;
    })();

    const timeMarkers: number[] = [];
    for (let t = 0; t <= protocol.duration; t += 5000) timeMarkers.push(t);

    return (
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill={bgColor} rx={8} />
            <pattern id="vagalScanlines" patternUnits="userSpaceOnUse" width="4" height="4">
                <line x1="0" y1="0" x2="4" y2="0" stroke="#000" strokeOpacity="0.2" strokeWidth="1" />
            </pattern>
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="url(#vagalScanlines)" pointerEvents="none" />

            {/* Graticule */}
            {[0, 1, 2, 3].map(val => (
                <line key={`h-${val}`} x1={margin.left} y1={yScale(val)} x2={svgWidth - margin.right} y2={yScale(val)}
                    stroke={val === 3 ? gridColorMajor : gridColor} strokeWidth={1} />
            ))}
            {timeMarkers.map(t => (
                <g key={`t-${t}`}>
                    <line x1={xScale(t)} y1={margin.top} x2={xScale(t)} y2={margin.top + plotH} stroke={gridColor} strokeWidth={1} />
                    <text x={xScale(t)} y={margin.top + plotH + 14} textAnchor="middle" fill={gridColorMajor} fontSize={11} fontFamily="monospace">{t / 1000}s</text>
                </g>
            ))}

            {/* Stimulation bands behind the trace */}
            {protocol.stims.filter(s => hasData && shown(s.t0)).map((s, i) => (
                <rect key={`band-${i}`} x={xScale(s.t0)} y={margin.top} width={xScale(isRecording ? Math.min(s.t1, latestT) : s.t1) - xScale(s.t0)} height={plotH}
                    fill={s.site === 'wcl' ? '#ffffff' : '#ef4444'} opacity={0.06} />
            ))}

            <defs>
                <filter id="vagalGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <path d={pathD} fill="none" stroke={traceColor} strokeWidth={2} filter="url(#vagalGlow)" />

            {/* Signal marker */}
            <text x={margin.left} y={signalY + 26} fill={markerColor} fontSize={11} fontFamily="monospace">Signal marker</text>
            <path d={signalPath} fill="none" stroke={markerColor} strokeWidth={2} strokeLinejoin="round" />
            {protocol.stims.filter(s => hasData && shown(s.t0)).map((s, i) => (
                <text key={`site-${i}`} x={(xScale(s.t0) + xScale(s.t1)) / 2} y={signalY + 26} textAnchor="middle" fill={s.site === 'wcl' ? '#e2e8f0' : '#fca5a5'} fontSize={13} fontFamily="monospace" fontWeight="bold">
                    {SITE_LABELS[s.site]}{s.strength === 'low' ? ' (low)' : ''}
                </text>
            ))}

            {/* Drug events */}
            {protocol.drugs.filter(d => hasData && shown(d.t)).map((d, i) => (
                <g key={`drug-${i}`}>
                    <line x1={xScale(d.t)} y1={drugRowY - 12} x2={xScale(d.t)} y2={signalY + 34} stroke={DRUG_INFO[d.drug].color} strokeWidth={2} />
                    <path d={`M ${xScale(d.t) - 5} ${signalY + 42} L ${xScale(d.t)} ${signalY + 34} L ${xScale(d.t) + 5} ${signalY + 42}`} fill="none" stroke={DRUG_INFO[d.drug].color} strokeWidth={2} />
                    <text x={xScale(d.t) + 6} y={drugRowY} fill={DRUG_INFO[d.drug].color} fontSize={14} fontFamily="monospace" fontWeight="bold">{DRUG_INFO[d.drug].label}</text>
                </g>
            ))}

            {/* Observation labels with arrows down to the trace */}
            {protocol.annotations.filter(a => hasData && shown(a.t)).map((a, i) => {
                const x = xScale(a.t);
                const textY = a.row === 0 ? 28 : 56;
                const anchor = x < 120 ? 'start' : x > svgWidth - 140 ? 'end' : 'middle';
                return (
                    <g key={`annot-${i}`}>
                        <text x={x} y={textY} textAnchor={anchor} fill={a.color} fontSize={17} fontFamily="monospace" fontWeight="bold" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>
                            {a.text}
                        </text>
                        <line x1={x} y1={textY + 6} x2={x} y2={margin.top - 4} stroke={a.color} strokeWidth={2} strokeDasharray="4 3" />
                    </g>
                );
            })}

            {/* Rate info */}
            <text x={svgWidth - margin.right - 10} y={margin.top + plotH - 8} textAnchor="end" fill={heartRate > 0 ? traceColor : '#f87171'} fontSize={14} fontFamily="monospace" fontWeight="bold">
                {heartRate > 0 ? `HR: ${heartRate} BPM` : hasData ? 'ARREST' : ''}
            </text>
            {isRecording && (
                <text x={margin.left + 10} y={margin.top + plotH - 8} fill="#ef4444" fontSize={14} fontFamily="monospace" fontWeight="bold">● REC</text>
            )}
        </svg>
    );
};

// --- Main Component ---
export const VagusAndWCL: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [experimentId, setExperimentId] = useState<ExperimentId>('graded');
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const draggingRef = useRef(false);
    const handleHover = useCallback((label: string | null) => {
        if (!draggingRef.current) setHoveredLabel(label);
    }, []);
    const [resetKey, setResetKey] = useState(0);
    const [quizOpen, setQuizOpen] = useState(false);
    const questionSet = questionSetFor('vagus-wcl');
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d');
    const [soundMuted, setSoundMuted] = useState(false);
    const [sceneBgColor, setSceneBgColor] = useState('#CBD5E1');

    const [isRecording, setIsRecording] = useState(false);
    const [simTime, setSimTime] = useState(0);
    const [data, setData] = useState<{ t: number; y: number }[]>([]);

    const animationFrameRef = useRef<number>();
    const dataRef = useRef<{ t: number; y: number }[]>([]);
    const lastSampleTimeRef = useRef(0);

    const protocol = useMemo(() => PROTOCOLS.find(p => p.id === experimentId)!, [experimentId]);
    const drumSpeed = drumSpeedFor(protocol);

    const sample = sampleProtocol(protocol, simTime);
    const hasRun = data.length > 0;
    const contraction = isRecording ? Math.max(0, sample.y) : 3.0;
    const lastBeat = protocol.beats[protocol.beats.length - 1];
    const heartRate = !isRecording && !hasRun
        ? Math.round(60000 / NORMAL_PERIOD)
        : sample.hr || (simTime >= protocol.duration ? Math.round(60000 / lastBeat.dur) : 0);
    const activeStim = isRecording ? activeStimAt(protocol, simTime) : null;
    // Electrode sits at the current stimulation site, or the next one coming up
    const targetSite: Site = activeStim?.site
        || protocol.stims.find(s => s.t0 > simTime)?.site
        || protocol.stims[0].site;
    const recentDrug = isRecording ? protocol.drugs.find(d => simTime >= d.t && simTime < d.t + 2500)?.drug ?? null : null;
    const appliedDrugs = protocol.drugs.filter(d => d.drug !== 'ringer' && simTime >= d.t && (hasRun || isRecording));
    const lastWash = protocol.drugs.filter(d => d.drug === 'ringer' && simTime >= d.t).pop();
    const drugOnHeart = appliedDrugs.filter(d => !lastWash || d.t > lastWash.t).pop();

    const { ensureAudioContext } = useHeartbeatSound({
        isRecording,
        phase: sample.phase,
        volume: 1.0,
        muted: soundMuted,
        silent: sample.phase < 0,
    });

    const resetRun = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        dataRef.current = [];
        lastSampleTimeRef.current = 0;
        setIsRecording(false);
        setSimTime(0);
        setData([]);
        setResetKey(prev => prev + 1);
    };

    const handleStartRecording = () => {
        if (isRecording) return;
        ensureAudioContext();
        resetRun();
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    const handleExperimentChange = (id: ExperimentId) => {
        setExperimentId(id);
        resetRun();
    };

    // Simulation loop
    useEffect(() => {
        if (!isRecording) return;

        let lastTime = Date.now();
        let time = 0;

        const loop = () => {
            const now = Date.now();
            time += now - lastTime;
            lastTime = now;

            // Backfill every sample since the last frame so the trace stays exact even at low frame rates
            const sampleUntil = Math.min(time, protocol.duration);
            while (lastSampleTimeRef.current + SAMPLE_INTERVAL <= sampleUntil) {
                lastSampleTimeRef.current += SAMPLE_INTERVAL;
                const t = lastSampleTimeRef.current;
                dataRef.current.push({ t, y: sampleProtocol(protocol, t).y });
            }
            setData([...dataRef.current]);

            if (time >= protocol.duration) {
                setSimTime(protocol.duration);
                setIsRecording(false);
                return;
            }

            setSimTime(time);
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [isRecording, protocol]);

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans relative">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-red-400 bg-clip-text text-transparent">Vagus & White Crescentic Line</h1>
                        <p className="text-slate-400 text-xs">Amphibian / Frog Heart — Stimulation of Vagosympathetic Trunk & WCL</p>
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
                    <button
                        onClick={() => setMobileView('3d')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === '3d'
                            ? 'bg-slate-900 text-red-400 border-b-2 border-red-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        <span>3D View</span>
                    </button>
                    <button
                        onClick={() => setMobileView('graph')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === 'graph'
                            ? 'bg-slate-900 text-red-400 border-b-2 border-red-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <LineChart className="w-4 h-4" />
                        <span>Cardiogram</span>
                    </button>
                </div>

                {/* 3D View */}
                <div className={`flex-1 relative bg-black ${mobileView === 'graph' ? 'hidden lg:flex' : 'flex'}`}
                    onPointerDown={() => { draggingRef.current = true; setHoveredLabel(null); }}
                    onPointerUp={() => { draggingRef.current = false; }}
                    onPointerLeave={() => { draggingRef.current = false; }}>
                    <Canvas shadows camera={{ position: [-3.7, 1.9, -4.0], fov: 38 }}>
                        <color attach="background" args={[sceneBgColor]} />
                        <LabEnvironment />
                        <ambientLight intensity={0.6} color="#ffffff" />
                        <spotLight position={[10, 10, 5]} angle={0.3} penumbra={0.5} intensity={2} castShadow />
                        <pointLight position={[-5, 5, -3]} intensity={0.5} color="#ffeedd" />

                        <group position={[0, -1.2, 0]}>
                            <group position={[-0.5, 0, 0]}>
                                {/* Board, frog and heart — same layout as the Normal Cardiogram module */}
                                <group rotation={[0, -Math.PI * 0.5, 0]} position={[-0.01, -0.84, 0.25]}>
                                    <MyographBoard onHoverChange={handleHover} />
                                    <group position={[-0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                                        <FrogBody onHoverChange={handleHover} />
                                    </group>
                                    <group position={[0.3, 0.48, 0]} rotation={[0, -Math.PI / 2, 0]}>
                                        <FrogHeart contraction={contraction} temperature={25} onHoverChange={handleHover} />
                                    </group>
                                </group>

                                <VagosympatheticTrunk side="right-vagus" active={activeStim?.site === 'right-vagus'} onHoverChange={handleHover} />
                                <VagosympatheticTrunk side="left-vagus" active={activeStim?.site === 'left-vagus'} onHoverChange={handleHover} />
                                <WhiteCrescenticLine active={activeStim?.site === 'wcl'} onHoverChange={handleHover} />
                                <StimulatingElectrode site={targetSite} active={!!activeStim} onHoverChange={handleHover} />
                                <InductionCoil active={!!activeStim} onHoverChange={handleHover} />
                                <DrugDropper drug={recentDrug} />

                                <HeartThread contraction={contraction} />
                                <SpringLoadedLever angle={(3.0 - contraction) * 0.036} onHoverChange={handleHover} />

                                <group position={[4.395, 0.75, 0.05]}>
                                    <VagalKymograph
                                        simTime={simTime}
                                        waveformValue={contraction}
                                        stimulating={!!activeStim}
                                        isRecording={isRecording}
                                        resetKey={resetKey}
                                        drumSpeed={drumSpeed}
                                        onHoverChange={handleHover}
                                    />
                                </group>
                            </group>
                        </group>

                        <OrbitControls makeDefault target={[0.5, -1.6, 0.5]} minPolarAngle={0} zoomToCursor />
                        <CursorDepthTarget />
                    </Canvas>

                    {/* Hover Label */}
                    {hoveredLabel && (
                        <div className="absolute top-4 left-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
                            {hoveredLabel}
                        </div>
                    )}

                    {/* Stimulation / drug status badges */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
                        {activeStim && (
                            <div className="bg-amber-500/90 text-slate-950 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                                <Zap className="w-4 h-4" /> Stimulating {SITE_LABELS[activeStim.site]}{activeStim.strength === 'low' ? ' (low)' : ''}
                            </div>
                        )}
                        {drugOnHeart && (
                            <div className="px-3 py-1.5 rounded-full text-sm font-bold border bg-slate-900/90" style={{ color: DRUG_INFO[drugOnHeart.drug].color, borderColor: DRUG_INFO[drugOnHeart.drug].color }}>
                                {DRUG_INFO[drugOnHeart.drug].label} on heart
                            </div>
                        )}
                    </div>

                </div>

                {/* Right Panel: Graph + Controls */}
                <div className="w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col flex-1 lg:flex-none min-h-0">
                    <div className={`flex-1 p-4 min-h-0 flex flex-col border-b border-slate-800 ${mobileView === '3d' ? 'hidden lg:flex' : 'flex'}`}>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Oscilloscope View</h3>
                        <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative min-h-[180px]">
                            <VagalCardiogramGraph
                                protocol={protocol}
                                data={data}
                                latestT={simTime}
                                isRecording={isRecording}
                                heartRate={heartRate}
                            />
                        </div>
                    </div>

                    <div className="p-4 lg:p-6 bg-slate-900 z-10 space-y-4 overflow-y-auto lg:max-h-[60%]">
                        {/* Experiment Selection */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                <Activity className="w-4 h-4 text-emerald-400" /> Select Experiment
                            </label>
                            <select
                                value={experimentId}
                                onChange={(e) => handleExperimentChange(e.target.value as ExperimentId)}
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none"
                            >
                                {PROTOCOLS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>

                        {/* Heart Rate & Sound Toggle */}
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${heartRate > 0 ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-sm text-slate-300">Heart Rate</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-lg font-mono font-bold ${heartRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {heartRate > 0 ? `${heartRate} bpm` : (isRecording ? 'Arrest' : '—')}
                                </span>
                                <button
                                    onClick={() => { ensureAudioContext(); setSoundMuted(m => !m); }}
                                    className={`p-1.5 rounded-lg transition-all border ${soundMuted
                                        ? 'bg-slate-700 border-slate-600 text-slate-500'
                                        : 'bg-red-900/40 border-red-700/50 text-red-400 hover:bg-red-900/60'
                                        }`}
                                    title={soundMuted ? 'Unmute heartbeat sound' : 'Mute heartbeat sound'}
                                >
                                    {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-500 flex justify-between px-1">
                            <span>Stimulus: Neef's hammer (repeated)</span>
                            <span>Drum speed: {drumSpeed} mm/s</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {!isRecording ? (
                                <button
                                    onClick={handleStartRecording}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Play className="w-5 h-5" /> Start Recording
                                </button>
                            ) : (
                                <button
                                    onClick={handleStopRecording}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Square className="w-5 h-5" /> Stop
                                </button>
                            )}
                            <button
                                onClick={resetRun}
                                className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>
                        {questionSet && (
                            <button onClick={() => setQuizOpen(true)}
                                className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl transition-all border border-indigo-500/40 flex items-center justify-center gap-2">
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
