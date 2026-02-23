import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Cylinder, Box, Sphere, Environment, Tube, Torus, Circle, Cone } from '@react-three/drei';
import { ArrowLeft, Eye, LineChart, Thermometer, Zap, RefreshCw, Play, Square, Droplets, Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';
import { useHeartbeatSound } from './useHeartbeatSound';

// --- Types & Constants ---

interface CardiogramState {
    time: number;
    isRecording: boolean;
    data: { t: number; y: number }[];
    currentContraction: number; // 0–1 normalized heart contraction
    heartRate: number; // bpm
    temperature: number; // °C
}

// Temperature presets matching textbook values
const TEMPERATURE_PRESETS = [
    { label: 'Cold (15°C)', value: 15, hr: 18, amplitude: 1.3, color: '#3b82f6', bgColor: 'bg-blue-600', borderColor: 'border-blue-400' },
    { label: 'Normal (25°C)', value: 25, hr: 24, amplitude: 1.0, color: '#22c55e', bgColor: 'bg-green-600', borderColor: 'border-green-400' },
    { label: 'Warm (35°C)', value: 35, hr: 36, amplitude: 0.7, color: '#ef4444', bgColor: 'bg-red-600', borderColor: 'border-red-400' },
];

function getTemperatureParams(temp: number) {
    const preset = TEMPERATURE_PRESETS.find(p => p.value === temp) || TEMPERATURE_PRESETS[1];
    const periodMs = (60 / preset.hr) * 1000; // ms per beat
    return { hr: preset.hr, amplitude: preset.amplitude, periodMs, color: preset.color };
}

// Cardiogram waveform — one full cardiac cycle mapped to phase 0..1
// Atrial Systole:      3 → 1  (contraction, downward deflection)
// Atrial Diastole:     1 → 2  (relaxation, partial recovery)
// AV Delay:            2      (flat pause)
// Ventricular Systole: 2 → 0  (contraction, deep downward deflection)
// Ventricular Diastole:0 → 3  (relaxation, full recovery to baseline)
function cardiogramWaveform(phase: number, amplitude: number): number {
    const smooth = (p: number) => (1 - Math.cos(p * Math.PI)) / 2; // 0→1 smooth
    let y: number;

    if (phase < 0.16) {
        // Atrial Systole: 3 → 1
        y = 3.0 - 2.0 * smooth(phase / 0.16);
    } else if (phase < 0.32) {
        // Atrial Diastole: 1 → 2
        y = 1.0 + 1.0 * smooth((phase - 0.16) / 0.16);
    } else if (phase < 0.40) {
        // AV Delay: hold at 2
        y = 2.0;
    } else if (phase < 0.56) {
        // Ventricular Systole: 2 → 0
        y = 2.0 - 2.0 * smooth((phase - 0.40) / 0.16);
    } else {
        // Ventricular Diastole: 0 → 3
        y = 3.0 * smooth((phase - 0.56) / 0.44);
    }

    return y * amplitude;
}

// --- 3D Components ---

const InteractiveObject = ({
    label,
    children,
    onHoverChange
}: {
    label: string,
    children: React.ReactNode,
    onHoverChange?: (label: string | null) => void
}) => {
    return (
        <group
            onPointerOver={(e) => {
                if (onHoverChange) { e.stopPropagation(); onHoverChange(label); document.body.style.cursor = 'pointer'; }
            }}
            onPointerOut={() => {
                if (onHoverChange) { onHoverChange(null); document.body.style.cursor = 'auto'; }
            }}
        >
            {children}
        </group>
    );
};

// --- Myograph Board ---
const MyographBoard = ({ onHoverChange }: { onHoverChange?: (l: string | null) => void }) => {
    return (
        <InteractiveObject label="Myograph Board" onHoverChange={onHoverChange}>
            <group position={[0, -0.9, 0]}>
                {/* Main wooden board */}
                <Box args={[4, 0.15, 2.5]} position={[0, 0, 0]}>
                    <meshStandardMaterial color="#8B7355" roughness={0.8} />
                </Box>
                {/* Cork surface layer */}
                <Box args={[3.6, 0.05, 2.1]} position={[0, 0.1, 0]}>
                    <meshStandardMaterial color="#D2B48C" roughness={0.9} />
                </Box>
                {/* Board legs */}
                {[[-1.7, -0.2, -1], [1.7, -0.2, -1], [-1.7, -0.2, 1], [1.7, -0.2, 1]].map((pos, i) => (
                    <Cylinder key={`leg-${i}`} args={[0.06, 0.08, 0.3]} position={pos as [number, number, number]}>
                        <meshStandardMaterial color="#5C4033" roughness={0.7} />
                    </Cylinder>
                ))}
                {/* Pins on the board for holding the frog */}
                {[[-1.2, 0.15, -0.6], [-1.2, 0.15, 0.6], [1.2, 0.15, -0.6], [1.2, 0.15, 0.6],
                [-0.6, 0.15, -0.8], [-0.6, 0.15, 0.8], [0.6, 0.15, -0.8], [0.6, 0.15, 0.8]].map((pos, i) => (
                    <group key={`pin-${i}`} position={pos as [number, number, number]}>
                        <Cylinder args={[0.015, 0.015, 0.15]} position={[0, 0.075, 0]}>
                            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
                        </Cylinder>
                        <Sphere args={[0.02, 8, 8]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} />
                        </Sphere>
                    </group>
                ))}
            </group>
        </InteractiveObject>
    );
};

// --- Frog Heart (3-chambered: 2 atria + 1 ventricle) ---
// Procedural model: Lathe geometry for ventricle, deformed spheres for atria
const FrogHeart = ({ contraction, temperature, onHoverChange }: {
    contraction: number,
    temperature: number,
    onHoverChange?: (l: string | null) => void
}) => {
    const heartRef = useRef<THREE.Group>(null);
    const ventricleRef = useRef<THREE.Group>(null);
    const leftAtriumRef = useRef<THREE.Group>(null);
    const rightAtriumRef = useRef<THREE.Group>(null);
    const truncusRef = useRef<THREE.Group>(null);

    // Heart color changes with temperature - wet tissue look
    const heartColor = useMemo(() => {
        if (temperature <= 15) return '#8B0000'; // Darker red when cold
        if (temperature >= 35) return '#FF4444'; // Brighter red when warm
        return '#be123c'; // Normal red
    }, [temperature]);

    const atrialColor = useMemo(() => {
        // Atria are usually darker/thinner walled
        return new THREE.Color(heartColor).multiplyScalar(0.8).getHexString();
    }, [heartColor]);

    useFrame(() => {
        if (ventricleRef.current) {
            const deflection = 3.0 - contraction; // 0 at baseline, 3 at max systole
            const squeeze = Math.max(0.4, 1 - deflection * 0.05);
            const shorten = Math.max(0.5, 1 - deflection * 0.05);
            ventricleRef.current.scale.set(squeeze, shorten, squeeze);
        }
        if (leftAtriumRef.current && rightAtriumRef.current) {
            leftAtriumRef.current.scale.set(1, 1, 1);
            rightAtriumRef.current.scale.set(1, 1, 1);
        }
        if (truncusRef.current) {
            const deflection = 3.0 - contraction;
            const pulse = 1 + deflection * 0.05;
            truncusRef.current.scale.set(pulse, 1, pulse);
        }
    });

    const ventricleGeometry = useMemo(() => {
        const curve = new THREE.SplineCurve([
            new THREE.Vector2(0, -0.6),
            new THREE.Vector2(0.15, -0.4),
            new THREE.Vector2(0.28, -0.1),
            new THREE.Vector2(0.32, 0.2),
            new THREE.Vector2(0.25, 0.5),
            new THREE.Vector2(0.15, 0.6),
            new THREE.Vector2(0, 0.65),
        ]);
        const geom = new THREE.LatheGeometry(curve.getPoints(20), 32);
        geom.computeVertexNormals();
        return geom;
    }, []);

    const truncusMainPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.6, 0.1), new THREE.Vector3(0, 0.85, 0.15),
    ]), []);
    const leftArchPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.85, 0.15), new THREE.Vector3(-0.25, 1.0, 0.05), new THREE.Vector3(-0.4, 1.05, -0.1),
    ]), []);
    const rightArchPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.85, 0.15), new THREE.Vector3(0.25, 1.0, 0.05), new THREE.Vector3(0.4, 1.05, -0.1),
    ]), []);
    const superiorVenaCavaPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.25, 0.4, -0.1), new THREE.Vector3(0.4, 0.6, -0.15), new THREE.Vector3(0.45, 0.8, -0.1),
    ]), []);
    const inferiorVenaCavaPath = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 0.35, 0.1), new THREE.Vector3(0.3, 0.2, 0.15), new THREE.Vector3(0.35, -0.05, 0.1),
    ]), []);

    return (
        <InteractiveObject label="Frog Heart (Sinus Venosus → Atria → Ventricle)" onHoverChange={onHoverChange}>
            <group ref={heartRef} position={[0, -0.2, 0]} rotation={[0, 0, Math.PI]}>

                {/* Atria - Sitting on top */}
                <group position={[0, 0.55, 0]}>
                    {/* Right Atrium (Larger) */}
                    <group ref={rightAtriumRef} position={[0.18, 0, -0.05]} rotation={[0, 0, -0.2]}>
                        <InteractiveObject label="Right Atrium" onHoverChange={onHoverChange}>
                            <Sphere args={[0.22, 32, 32]} scale={[1, 1.1, 0.9]}>
                                <meshPhysicalMaterial
                                    color={'#' + atrialColor}
                                    roughness={0.4}
                                    metalness={0.1}
                                    clearcoat={1}
                                    clearcoatRoughness={0.2}
                                />
                            </Sphere>
                        </InteractiveObject>
                    </group>

                    {/* Left Atrium (Smaller) */}
                    <group ref={leftAtriumRef} position={[-0.18, 0.05, -0.05]} rotation={[0, 0, 0.2]}>
                        <InteractiveObject label="Left Atrium" onHoverChange={onHoverChange}>
                            <Sphere args={[0.16, 32, 32]} scale={[1, 1.1, 0.9]}>
                                <meshPhysicalMaterial
                                    color={'#' + atrialColor}
                                    roughness={0.4}
                                    metalness={0.1}
                                    clearcoat={1}
                                    clearcoatRoughness={0.2}
                                />
                            </Sphere>
                        </InteractiveObject>
                    </group>
                </group>

                {/* Ventricle - Procedural Organic Shape */}
                <group ref={ventricleRef} position={[0, 0, 0.05]}>
                    <InteractiveObject label="Ventricle" onHoverChange={onHoverChange}>
                        <mesh geometry={ventricleGeometry}>
                            <meshPhysicalMaterial
                                color={heartColor}
                                roughness={0.5}
                                metalness={0.1}
                                clearcoat={1}
                                clearcoatRoughness={0.3}
                            />
                        </mesh>
                    </InteractiveObject>
                </group>

                {/* Truncus Arteriosus - Branching */}
                <group ref={truncusRef}>
                    <InteractiveObject label="Truncus Arteriosus (Branching)" onHoverChange={onHoverChange}>
                        {/* Main Trunk */}
                        <Tube args={[truncusMainPath, 16, 0.06, 12, false]}>
                            <meshPhysicalMaterial color="#d64949" roughness={0.4} clearcoat={1} />
                        </Tube>
                        {/* Left Arch */}
                        <Tube args={[leftArchPath, 16, 0.045, 8, false]}>
                            <meshPhysicalMaterial color="#d64949" roughness={0.4} clearcoat={1} />
                        </Tube>
                        {/* Right Arch */}
                        <Tube args={[rightArchPath, 16, 0.045, 8, false]}>
                            <meshPhysicalMaterial color="#d64949" roughness={0.4} clearcoat={1} />
                        </Tube>
                    </InteractiveObject>
                </group>

                {/* Major Veins */}
                <InteractiveObject label="Vena Cavae" onHoverChange={onHoverChange}>
                    <Tube args={[superiorVenaCavaPath, 12, 0.035, 8, false]}>
                        <meshPhysicalMaterial color="#5e4b8b" roughness={0.6} />
                    </Tube>
                    <Tube args={[inferiorVenaCavaPath, 12, 0.035, 8, false]}>
                        <meshPhysicalMaterial color="#5e4b8b" roughness={0.6} />
                    </Tube>
                </InteractiveObject>

                {/* Sinus Venosus (Simulated posterior dark mass) */}
                <InteractiveObject label="Sinus Venosus (Posterior)" onHoverChange={onHoverChange}>
                    <Sphere args={[0.2, 16, 16]} position={[0, 0.4, -0.2]} scale={[1.2, 0.8, 0.5]}>
                        <meshPhysicalMaterial color="#4a2c2c" roughness={0.8} />
                    </Sphere>
                </InteractiveObject>

            </group>
        </InteractiveObject>
    );
};

// --- Ringer's Solution Dropper ---
const RingerDropper = ({ temperature, isActive, onHoverChange }: {
    temperature: number,
    isActive: boolean,
    onHoverChange?: (l: string | null) => void
}) => {
    const dropRef = useRef<THREE.Mesh>(null);
    const [dropVisible, setDropVisible] = useState(false);

    const dropperColor = useMemo(() => {
        if (temperature <= 15) return '#6699FF';
        if (temperature >= 35) return '#FF6644';
        return '#88CCAA';
    }, [temperature]);

    useFrame((_, delta) => {
        if (isActive && dropRef.current) {
            dropRef.current.position.y -= delta * 2;
            if (dropRef.current.position.y < -0.5) {
                dropRef.current.position.y = 0.3;
            }
            setDropVisible(true);
        } else {
            setDropVisible(false);
        }
    });

    return (
        <InteractiveObject label={`Ringer's Solution Dropper (${temperature}°C)`} onHoverChange={onHoverChange}>
            <group position={[0.5, 1.8, 0.3]}>
                {/* Dropper body */}
                <Cylinder args={[0.04, 0.04, 0.6]} position={[0, 0, 0]}>
                    <meshPhysicalMaterial color="#f0f0f0" transmission={0.7} roughness={0} thickness={0.5} />
                </Cylinder>
                {/* Rubber bulb */}
                <Sphere args={[0.06, 16, 16]} position={[0, 0.35, 0]}>
                    <meshStandardMaterial color="#333333" roughness={0.8} />
                </Sphere>
                {/* Dropper tip */}
                <Cylinder args={[0.015, 0.035, 0.15]} position={[0, -0.35, 0]}>
                    <meshPhysicalMaterial color="#f0f0f0" transmission={0.6} roughness={0} thickness={0.3} />
                </Cylinder>
                {/* Liquid inside dropper */}
                <Cylinder args={[0.03, 0.03, 0.4]} position={[0, -0.05, 0]}>
                    <meshPhysicalMaterial color={dropperColor} transmission={0.5} roughness={0} opacity={0.7} transparent />
                </Cylinder>
                {/* Falling drop */}
                {dropVisible && (
                    <Sphere ref={dropRef} args={[0.02, 8, 8]} position={[0, -0.45, 0]}>
                        <meshPhysicalMaterial color={dropperColor} transmission={0.4} roughness={0} />
                    </Sphere>
                )}
            </group>
        </InteractiveObject>
    );
};

// --- Frog Body (Procedural) ---
const FrogBody = ({ onHoverChange }: { onHoverChange?: (l: string | null) => void }) => {
    return (
        <InteractiveObject label="Frog (Pithed)" onHoverChange={onHoverChange}>
            <group position={[0, -0.4, 0.2]} rotation={[-0.1, 0, 0]}>
                {/* Main Torso - Flatter and wider */}
                <Sphere args={[0.5, 32, 32]} scale={[2.2, 1.0, 3.0]} position={[0, 0, 0]}>
                    <meshStandardMaterial color="#556b2f" roughness={0.6} />
                </Sphere>

                {/* Chest Cavity - Open Incision */}
                {/* Moved up to Y=0.46 to sit on surface, and Z=0.6 to align with Heart X position */}
                <group position={[0, 0.45, -0.5]} rotation={[0.1, 0, 0]}>

                    {/* Rough tissue/muscle edges around the hole (Reddish ring) */}
                    <Torus args={[0.28, 0.05, 16, 24]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.2]} position={[0, 0.02, 0]}>
                        <meshStandardMaterial color="#661111" roughness={0.5} />
                    </Torus>

                    {/* Skin Flaps (pulled back) */}
                    {/* Left Flap */}
                    <group position={[-0.4, 0.02, 0]} rotation={[0, 0, 0.3]}>
                        <Box args={[0.3, 0.03, 0.6]}>
                            <meshStandardMaterial color="#556b2f" roughness={0.6} />
                        </Box>
                        <Box args={[0.28, 0.031, 0.58]} position={[0.05, -0.005, 0]}>
                            <meshStandardMaterial color="#4a1c1c" roughness={0.7} />
                        </Box>
                    </group>

                    {/* Right Flap */}
                    <group position={[0.4, 0.02, 0]} rotation={[0, 0, -0.3]}>
                        <Box args={[0.3, 0.03, 0.6]}>
                            <meshStandardMaterial color="#556b2f" roughness={0.6} />
                        </Box>
                        <Box args={[0.28, 0.031, 0.58]} position={[-0.05, -0.005, 0]}>
                            <meshStandardMaterial color="#4a1c1c" roughness={0.7} />
                        </Box>
                    </group>

                    {/* Top Flap */}
                    <group position={[0, 0.05, -0.4]} rotation={[0.4, 0, 0]}>
                        <Box args={[0.5, 0.03, 0.25]}>
                            <meshStandardMaterial color="#556b2f" roughness={0.6} />
                        </Box>
                        <Box args={[0.48, 0.031, 0.23]} position={[0, -0.005, 0.05]}>
                            <meshStandardMaterial color="#4a1c1c" roughness={0.7} />
                        </Box>
                    </group>
                    {/* Bottom Flap */}
                    <group position={[0, 0.05, 0.4]} rotation={[-0.4, 0, 0]}>
                        <Box args={[0.5, 0.03, 0.25]}>
                            <meshStandardMaterial color="#556b2f" roughness={0.6} />
                        </Box>
                        <Box args={[0.48, 0.031, 0.23]} position={[0, -0.005, -0.05]}>
                            <meshStandardMaterial color="#4a1c1c" roughness={0.7} />
                        </Box>
                    </group>
                </group>

                {/* Head */}
                <group position={[0, 0.1, -1.6]}>
                    <Sphere args={[0.4, 32, 32]} scale={[1.5, 0.8, 1.2]}>
                        <meshStandardMaterial color="#556b2f" roughness={0.6} />
                    </Sphere>
                    {/* Eyes */}
                    <Sphere args={[0.1, 16, 16]} position={[0.3, 0.2, -0.1]}>
                        <meshStandardMaterial color="#111" roughness={0.2} />
                    </Sphere>
                    <Sphere args={[0.1, 16, 16]} position={[-0.3, 0.2, -0.1]}>
                        <meshStandardMaterial color="#111" roughness={0.2} />
                    </Sphere>
                </group>

                {/* Legs (Thighs) */}
                <group position={[0.9, -0.1, 1.0]} rotation={[0, 0.5, 0]}>
                    <Cylinder args={[0.2, 0.15, 1.2]} rotation={[0, 0, 1.2]}>
                        <meshStandardMaterial color="#556b2f" roughness={0.6} />
                    </Cylinder>
                </group>
                <group position={[-0.9, -0.1, 1.0]} rotation={[0, -0.5, 0]}>
                    <Cylinder args={[0.2, 0.15, 1.2]} rotation={[0, 0, -1.2]}>
                        <meshStandardMaterial color="#556b2f" roughness={0.6} />
                    </Cylinder>
                </group>

                {/* Arms */}
                <group position={[0.8, -0.1, -0.8]} rotation={[0, -0.3, 0]}>
                    <Cylinder args={[0.12, 0.1, 1.0]} rotation={[0, 0, 1.3]}>
                        <meshStandardMaterial color="#8da399" roughness={0.8} />
                    </Cylinder>
                </group>
                <group position={[-0.8, -0.1, -0.8]} rotation={[0, 0.3, 0]}>
                    <Cylinder args={[0.12, 0.1, 1.0]} rotation={[0, 0, -1.3]}>
                        <meshStandardMaterial color="#8da399" roughness={0.8} />
                    </Cylinder>
                </group>
            </group>
        </InteractiveObject>
    );
};

// --- Procedural Spring Component ---
// --- Optimized Helical Spring ---
const HelicalSpring = ({ length, radius, coils, color, thickness }: { length: number, radius: number, coils: number, color: string, thickness: number }) => {
    // Create geometry ONCE based on a default length of 1.0
    // We will scale the mesh in Y to match the desired length.
    const baseLength = 1.0;

    // Check if we can reuse geometry or if props changed (except length)
    const geometry = useMemo(() => {
        const points = [];
        // High resolution for smooth curve
        const segments = coils * 12;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * Math.PI * 2 * coils;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            const y = -t * baseLength; // Hangs down to -1.0
            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, segments, thickness, 8, false);
    }, [radius, coils, thickness]); // removed length from dependencies

    return (
        <group scale={[1, length / baseLength, 1]}>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
            </mesh>
        </group>
    );
};

// --- Spring Loaded Lever (Starling Heart Lever) ---
const SpringLoadedLever = ({ angle, onHoverChange }: { angle: number, onHoverChange?: (l: string | null) => void }) => {
    const metalColor = "#e2e8f0";
    const standColor = "#94a3b8";
    const knobColor = "#475569";
    const leverColor = "#f1f5f9";
    const standX = -1.5;
    const pivotY = 0.7;
    const pivotPosition = [standX, pivotY, 0.15];
    const rotation = -angle;
    const baseSpringLen = 0.75;
    const currentSpringLength = baseSpringLen + angle * 0.9;
    const leverPivotOffset: [number, number, number] = [0.6, 0, 0];

    return (
        <group position={[0, 0.5, 0.5]}>
            <InteractiveObject label="Starling Lever (Stand Post)" onHoverChange={onHoverChange}>
                <Cylinder args={[0.06, 0.06, 4.5]} position={[standX, 0, 0]}>
                    <meshStandardMaterial color={standColor} metalness={0.6} roughness={0.4} />
                </Cylinder>
            </InteractiveObject>

            <InteractiveObject label="Starling Lever (Tension Adjuster)" onHoverChange={onHoverChange}>
                <group position={[-0.75, 0.4, 0]} rotation={[0, 0, 1.57]}>
                    <Cylinder args={[0.025, 0.025, 1]} position={[0.8, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <meshStandardMaterial color={metalColor} metalness={0.6} />
                    </Cylinder>
                    <group position={[1.1, 0.05, 0]}>
                        <Box args={[0.1, 0.15, 0.1]}><meshStandardMaterial color={metalColor} /></Box>
                        <Cylinder args={[0.015, 0.015, 0.6]} position={[0, -0.17, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.5} />
                        </Cylinder>
                        <Cylinder args={[0.05, 0.05, 0.04]} position={[0, 0.13, 0]}>
                            <meshStandardMaterial color={knobColor} roughness={0.8} />
                        </Cylinder>
                        <Torus args={[0.025, 0.005, 8, 16]} position={[0, -0.47, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <meshStandardMaterial color={metalColor} />
                        </Torus>
                    </group>
                </group>
            </InteractiveObject>

            <group position={pivotPosition as [number, number, number]}>
                <group position={[0.3, 0, -0.14]}>
                    <InteractiveObject label="Starling Lever (Mounting Clamp)" onHoverChange={onHoverChange}>
                        <group>
                            <Box args={[0.85, 0.13, 0.4]}>
                                <meshStandardMaterial color={metalColor} metalness={0.7} />
                            </Box>
                            <group position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                <Cylinder args={[0.03, 0.03, 0.1]}><meshStandardMaterial color={knobColor} /></Cylinder>
                                <Cylinder args={[0.07, 0.07, 0.02]} position={[0, 0.05, 0]}><meshStandardMaterial color={knobColor} /></Cylinder>
                            </group>
                        </group>
                    </InteractiveObject>

                    <group position={[0.55, 0, 0]}>
                        <Box args={[0.05, 0.13, 0.35]} position={[-0.1, 0, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.7} />
                        </Box>
                        <Box args={[0.25, 0.13, 0.04]} position={[0, 0, 0.18]}>
                            <meshStandardMaterial color={metalColor} metalness={0.7} />
                        </Box>
                        <Box args={[0.25, 0.13, 0.04]} position={[0, 0, -0.18]}>
                            <meshStandardMaterial color={metalColor} metalness={0.7} />
                        </Box>
                    </group>

                    <group rotation={[0, 0, rotation]} position={leverPivotOffset}>
                        <Cylinder args={[0.02, 0.02, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                            <meshStandardMaterial color={knobColor} />
                        </Cylinder>

                        <InteractiveObject label="Starling Lever (Lever Arm)" onHoverChange={onHoverChange}>
                            <group position={[0.5, 0, 0]}>
                                <Box args={[1.2, 0.12, 0.03]}>
                                    <meshStandardMaterial color={leverColor} roughness={0.3} metalness={0.2} />
                                </Box>
                                {[-0.4, -0.2, 0.0, 0.2, 0.4].map((x, i) => (
                                    <group key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                                        <Cylinder args={[0.025, 0.025, 0.032]}>
                                            <meshBasicMaterial color="#1e293b" />
                                        </Cylinder>
                                    </group>
                                ))}
                            </group>
                        </InteractiveObject>

                        <InteractiveObject label="Starling Lever (Writing Stylus)" onHoverChange={onHoverChange}>
                            <group position={[1.18, 0, 0]}>
                                <Box args={[0.08, 0.08, 0.08]} position={[-0.04, 0, 0]}>
                                    <meshStandardMaterial color={metalColor} />
                                </Box>
                                <Cylinder args={[0.012, 0.012, 2.9]} position={[1.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                    <meshStandardMaterial color="#222" roughness={0.6} />
                                </Cylinder>
                                <Cone args={[0.012, 0.06, 8]} position={[2.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                    <meshStandardMaterial color="#111" />
                                </Cone>
                            </group>
                        </InteractiveObject>
                    </group>
                </group>

                {/* Spring Element */}
                {/* Positioned to connect top hook (at x=1.1 relative to stand) to lever hole */}
                {/* Lever hole at x = 1.1 + offset_from_pivot ~ 0.85 = (1.1 - 0.25). 
                    Let's align it visually. 
                    Top Hook X relative to Pivot Group = (standX + 1.1) - standX = 1.1.
                    Spring x position = 1.1. 
                 */}
                <InteractiveObject label="Starling Lever (Spring)" onHoverChange={onHoverChange}>
                    <group position={[1.15, 0.8, -0.15]}>
                        <HelicalSpring
                            length={currentSpringLength}
                            radius={0.04}
                            coils={14}
                            color="#cbd5e1"
                            thickness={0.01}
                        />
                    </group>
                </InteractiveObject>

            </group>
        </group>
    );
};

// --- Thread connecting heart to lever ---
const HeartThread = ({ contraction }: { contraction: number }) => {
    // Lever angle multiplier — must match the value used in <SpringLoadedLever>
    const LEVER_ANGLE_SCALE = 0.036;

    // Calculate thread start and end points
    const { start, end, len, midpoint, quaternion } = useMemo(() => {
        const localX = 0;
        const localZ = 0;
        // Lever pivot-to-thread distance
        const r = 1.0;
        // Lever deflection relative to baseline (3.0 = horizontal, 0 = max deflection)
        const deflection = (3.0 - contraction) * LEVER_ANGLE_SCALE;
        const theta = -deflection;
        const leverY = 1.16 + Math.sin(theta) * r;

        const startVec = new THREE.Vector3(localX, 0.06 - (3.0 - contraction) * 0.03, localZ);
        const endVec = new THREE.Vector3(localX, leverY, localZ);

        const length = startVec.distanceTo(endVec);
        const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

        // Calculate rotation to align cylinder with start->end vector
        const up = new THREE.Vector3(0, 1, 0);
        const dir = new THREE.Vector3().subVectors(endVec, startVec).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);

        return { start: startVec, end: endVec, len: length, midpoint: mid, quaternion: quat };
    }, [contraction]);

    // Define Hook Shape (J-Curve) - Static geometry
    const hookCurve = useMemo(() => {
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, -0.015, 0),    // Below Eye
            new THREE.Vector3(0, -0.12, 0),     // Shank Bottom
            new THREE.Vector3(-0.01, -0.14, 0), // Curve Start
            new THREE.Vector3(-0.04, -0.14, 0), // Curve Bottom
            new THREE.Vector3(-0.05, -0.10, 0), // Point Tip Base
        ]);
    }, []);

    return (
        /* ADJUST POSITION OF THREAD AND HOOK TOGETHER HERE [X, Y, Z] */
        <group position={[0, 0.1, 0.5]}>
            {/* The Thread - Optimized from Tube to Cylinder */}
            <mesh position={midpoint} quaternion={quaternion} scale={[1, len, 1]}>
                <cylinderGeometry args={[0.003, 0.003, 1, 8]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
            </mesh>

            {/* The Metal Hook (J-Shape) - Attached to start point */}
            <group position={start} rotation={[0, 0, 0.1]}>
                <Torus args={[0.015, 0.003, 8, 16]} rotation={[0, Math.PI / 2, 0]}>
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                </Torus>
                <Tube args={[hookCurve, 32, 0.003, 8, false]}>
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                </Tube>
                <Cylinder args={[0.001, 0.003, 0.02]} position={[-0.052, -0.09, 0]} rotation={[0, 0, -0.2]}>
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                </Cylinder>
                <Cone args={[0.002, 0.01, 8]} position={[-0.052, -0.10, 0]} rotation={[0, 0, 2.8]}>
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                </Cone>
            </group>
        </group>
    );
};

// --- Kymograph Drum ---
const CardiogramKymograph = ({
    simTime,
    waveformValue,
    isRecording,
    onHoverChange,
    resetKey,
    drumSpeed,
}: {
    simTime: number,
    waveformValue: number,
    isRecording: boolean,
    onHoverChange?: (l: string | null) => void,
    resetKey: number,
    drumSpeed: number,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const lastDrawState = useRef<{ x: number, y: number } | null>(null);
    const texture = useMemo(() => {
        const canvas = canvasRef.current;
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 2048, 512);
            // Soot coating effect
            ctx.fillStyle = '#0d0d0d';
            for (let i = 0; i < 200; i++) {
                ctx.fillRect(Math.random() * 2048, Math.random() * 512, Math.random() * 4, Math.random() * 4);
            }
        }
        return new THREE.CanvasTexture(canvas);
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 2048, 512);
            ctx.fillStyle = '#0d0d0d';
            for (let i = 0; i < 200; i++) {
                ctx.fillRect(Math.random() * 2048, Math.random() * 512, Math.random() * 4, Math.random() * 4);
            }
            texture.needsUpdate = true;
        }
        lastDrawState.current = null;
    }, [resetKey, texture]);

    useFrame(() => {
        if (!isRecording) { lastDrawState.current = null; return; }
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const SPEED_SCALE = 15.0;
        const x = 80 + ((simTime / 1000) * drumSpeed * SPEED_SCALE);
        const y = (512 * 0.50) - (waveformValue * 30); // Baseline centered on drum

        if (lastDrawState.current) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 1;
            ctx.beginPath();
            ctx.moveTo(lastDrawState.current.x, lastDrawState.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            texture.needsUpdate = true;
        }
        lastDrawState.current = { x, y };
    });

    const drumRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (drumRef.current && isRecording) {
            // Calculate current X position again to sync rotation exactly
            const SPEED_SCALE = 15.0;
            const x = 80 + ((simTime / 1000) * drumSpeed * SPEED_SCALE);

            // Map X position (0 to 2048) to Angle (0 to 2*PI)
            const angle = ((x - 80) / 2048) * (2 * Math.PI);

            const baseRotation = 1.8 + Math.PI;
            drumRef.current.rotation.y = baseRotation - angle;
        }
    });

    return (
        <InteractiveObject label="Kymograph Drum" onHoverChange={onHoverChange}>
            <group position={[0, 0, 0]}>
                {/* Drum */}
                <group ref={drumRef} rotation={[0, 1.8 + Math.PI, 0]}>
                    <Cylinder args={[1.0, 1.0, 2.5, 64]}>
                        <meshBasicMaterial attach="material-0" map={texture} />
                        <meshStandardMaterial attach="material-1" color="#111" />
                        <meshStandardMaterial attach="material-2" color="#111" />
                    </Cylinder>
                </group>
                {/* Central shaft */}
                <Cylinder args={[0.06, 0.06, 3.5]} position={[0, -0.15, 0]}>
                    <meshStandardMaterial color="#1e293b" metalness={0.8} />
                </Cylinder>
                {/* Motor base */}
                <Box args={[1.2, 0.45, 1.5]} position={[0, -1.75, 0]}>
                    <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.6} />
                </Box>

            </group>
        </InteractiveObject>
    );
};

// --- Ringer's Solution Tray ---
const SolutionTray = ({ temperature, onHoverChange }: { temperature: number, onHoverChange?: (l: string | null) => void }) => {
    const liquidColor = useMemo(() => {
        if (temperature <= 15) return '#a5d8ff';
        if (temperature >= 35) return '#ffb3b3';
        return '#a5f3fc';
    }, [temperature]);

    return (
        <InteractiveObject label={`Ringer's Solution Tray (${temperature}°C)`} onHoverChange={onHoverChange}>
            <group position={[0, -0.42, 0]}>
                {/* Tray */}
                <Box args={[1.0, 0.08, 0.8]} position={[0, 0, 0]}>
                    <meshPhysicalMaterial color="#cbd5e1" roughness={0.1} transmission={0.2} thickness={0.3} />
                </Box>
                {/* Walls */}
                <Box args={[1.0, 0.15, 0.05]} position={[0, 0.07, 0.375]}>
                    <meshPhysicalMaterial color="#ffffff" transmission={0.85} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                </Box>
                <Box args={[1.0, 0.15, 0.05]} position={[0, 0.07, -0.375]}>
                    <meshPhysicalMaterial color="#ffffff" transmission={0.85} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                </Box>
                <Box args={[0.05, 0.15, 0.7]} position={[0.475, 0.07, 0]}>
                    <meshPhysicalMaterial color="#ffffff" transmission={0.85} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                </Box>
                <Box args={[0.05, 0.15, 0.7]} position={[-0.475, 0.07, 0]}>
                    <meshPhysicalMaterial color="#ffffff" transmission={0.85} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                </Box>
                {/* Liquid */}
                <Box args={[0.9, 0.06, 0.65]} position={[0, 0.06, 0]}>
                    <meshPhysicalMaterial color={liquidColor} transmission={0.85} opacity={0.6} transparent roughness={0.05} ior={1.33} />
                </Box>
            </group>
        </InteractiveObject>
    );
};

// --- Cardiogram Graph Component (Oscilloscope Style) ---
const CardiogramGraph = ({
    data,
    temperature,
    isRecording
}: {
    data: { t: number; y: number }[];
    temperature: number;
    isRecording: boolean;
}) => {
    const preset = TEMPERATURE_PRESETS.find(p => p.value === temperature) || TEMPERATURE_PRESETS[1];

    // Oscilloscope Colors
    const traceColor = "#4ade80"; // Bright Green (Tailwind green-400)
    const gridColor = "#14532d"; // Dark Green (green-900)
    const gridColorMajor = "#166534"; // Slightly lighter (green-800)
    const bgColor = "#020617"; // Very dark slate/black (slate-950)

    const svgWidth = 900;
    const svgHeight = 320;
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const plotW = svgWidth - margin.left - margin.right;
    const plotH = svgHeight - margin.top - margin.bottom;

    // Y range: -0.5 to 3.5
    const yMin = -0.5;
    const yMax = 3.5;
    const yScale = (y: number) => margin.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // X range: show a scrolling window of ~24 seconds for compressed view (more waves visible)
    const WINDOW_MS = 24000;
    const latestT = data.length > 0 ? data[data.length - 1].t : 0;
    const windowStart = Math.max(0, latestT - WINDOW_MS);
    const windowEnd = Math.max(WINDOW_MS, latestT + 200);
    const xScale = (t: number) => margin.left + ((t - windowStart) / (windowEnd - windowStart)) * plotW;

    // Filter visible data
    const visibleData = data.filter(d => d.t >= windowStart - 500);

    // Create path
    const pathD = visibleData.length > 1
        ? `M ${visibleData.map(d => `${xScale(d.t)},${yScale(d.y)}`).join(' L ')}`
        : '';

    // Graticule (Grid)
    // Vertical: Time (every 0.5s)
    const timeMarkers: number[] = [];
    const startTick = Math.ceil(windowStart / 500) * 500;
    for (let t = startTick; t <= windowEnd; t += 500) {
        timeMarkers.push(t);
    }
    // Horizontal: Voltage
    const hGridValues = [0, 1.0, 2.0, 3.0];

    return (
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Background (Phosphor Screen) */}
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill={bgColor} rx={8} />

            {/* CRT Scanline Effect (subtle overlay) */}
            <pattern id="scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
                <line x1="0" y1="0" x2="4" y2="0" stroke="#000" strokeOpacity="0.2" strokeWidth="1" />
            </pattern>
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="url(#scanlines)" pointerEvents="none" />

            {/* Scale Grid (Graticule) */}
            {/* Horizontal */}
            {hGridValues.map((val, i) => (
                <line key={`hgrid-${i}`} x1={margin.left} y1={yScale(val)} x2={svgWidth - margin.right} y2={yScale(val)}
                    stroke={val === 0 ? gridColorMajor : gridColor} strokeWidth={1} />
            ))}
            {/* Vertical */}
            {timeMarkers.map((t, i) => (
                <line key={`tmark-${i}`} x1={xScale(t)} y1={margin.top} x2={xScale(t)} y2={svgHeight - margin.bottom}
                    stroke={t % 1000 === 0 ? gridColorMajor : gridColor} strokeWidth={1} />
            ))}

            {/* Trace with Glow */}
            <defs>
                <filter id="oscilloscopeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <path d={pathD} fill="none" stroke={traceColor} strokeWidth={2} filter="url(#oscilloscopeGlow)" />

            {/* Rate Info */}
            <text x={svgWidth - margin.right - 10} y={margin.top + 20} textAnchor="end" fill={traceColor} fontSize={14} fontFamily="monospace" fontWeight="bold">
                HR: {getTemperatureParams(temperature).hr} BPM
            </text>
            <text x={svgWidth - margin.right - 10} y={margin.top + 40} textAnchor="end" fill={gridColorMajor} fontSize={12} fontFamily="monospace">
                T: {temperature}°C
            </text>

            {/* Recording Indicator */}
            {isRecording && (
                <text x={margin.left + 10} y={margin.top + 20} fill="#ef4444" fontSize={14} fontFamily="monospace" fontWeight="bold">
                    ● REC
                </text>
            )}
        </svg>
    );
};

// --- Waveform Legend Component ---
const WaveformLegend = () => {
    // Generate path data for the custom waveform
    const width = 300;
    const height = 120;
    const padding = 20;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    // Y scale: Input 0 to 3 -> Output height to padding (inverted Y)
    // Range -0.5 to 3.5 covers 0, 1.5, 3, 1 comfortably
    const yMin = -0.5;
    const yMax = 3.5;
    const yScale = (y: number) => {
        const norm = (y - yMin) / (yMax - yMin);
        return height - padding - norm * plotH;
    };
    const xScale = (t: number) => padding + t * plotW;

    const points = [];
    for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const y = cardiogramWaveform(t, 1.0);
        points.push(`${xScale(t).toFixed(1)},${yScale(y).toFixed(1)}`);
    }
    const pathD = `M ${points.join(' L ')}`;

    // Text labels helper
    const Label = ({ t, y, text, align = "middle", dy = -10, color = "#94a3b8" }: any) => (
        <g transform={`translate(${xScale(t)}, ${yScale(y)})`}>
            <circle r="2" fill="#22c55e" />
            <text x="0" y={dy} textAnchor={align} fill={color} fontSize="9" fontWeight="bold">
                {text}
            </text>
            <text x="0" y={dy > 0 ? dy + 10 : dy + 10} textAnchor={align} fill="#22c55e" fontSize="8" opacity="0.8">
                {y} units
            </text>
        </g>
    );

    return (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 shadow-inner shadow-black">
            <h4 className="text-xs font-bold text-green-400/80 uppercase mb-2 tracking-wider">Reference Waveform</h4>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-lg select-none">
                {/* Background CRT */}
                <rect x="0" y="0" width={width} height={height} fill="#020617" />

                {/* Baseline 0 and 1 (Grid) */}
                <line x1={padding} y1={yScale(0)} x2={width - padding} y2={yScale(0)} stroke="#14532d" strokeWidth={1} />
                <line x1={padding} y1={yScale(1)} x2={width - padding} y2={yScale(1)} stroke="#14532d" strokeWidth={1} />
                <line x1={padding} y1={yScale(3)} x2={width - padding} y2={yScale(3)} stroke="#14532d" strokeWidth={1} />

                {/* Oscilloscope Glow Filter */}
                <defs>
                    <filter id="refGlow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Trace */}
                <path d={pathD} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" filter="url(#refGlow)" />

                {/* Labels */}
                <Label t={0.10} y={1.5} text="Atrial (C1)" dy={-15} color="#4ade80" />
                <Label t={0.22} y={0.0} text="AV Delay (T1)" dy={15} color="#4ade80" />
                <Label t={0.45} y={3.0} text="Ventricular (C2)" dy={-15} color="#4ade80" />
                <Label t={0.98} y={1.0} text="Diastole (T2)" dy={-15} align="end" color="#4ade80" />
            </svg>
        </div>
    );
};

// --- Main Component ---
export const NormalCardiogram: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [temperature, setTemperature] = useState(25);
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [drumSpeed, setDrumSpeed] = useState(2.5); // mm/sec
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d');
    const [isDropperActive, setIsDropperActive] = useState(false);
    const [soundMuted, setSoundMuted] = useState(false);
    const [currentPhase, setCurrentPhase] = useState(0);

    const [simState, setSimState] = useState<CardiogramState>({
        time: 0,
        isRecording: false,
        data: [],
        currentContraction: 3.0,
        heartRate: 24,
        temperature: 25
    });

    const animationFrameRef = useRef<number>();
    const startTimeRef = useRef<number>(0);
    const dataRef = useRef<{ t: number; y: number }[]>([]);
    const RECORDING_DURATION = 15000; // 15 seconds of recording
    const SAMPLE_INTERVAL = 20; // ms between data points (50 samples/sec)
    const lastSampleTimeRef = useRef<number>(0);
    const temperatureRef = useRef(temperature);

    // Heartbeat sound hook
    const { ensureAudioContext } = useHeartbeatSound({
        isRecording: simState.isRecording,
        phase: currentPhase,
        volume: 1.0,
        muted: soundMuted,
    });

    // Keep temperature ref in sync
    useEffect(() => {
        temperatureRef.current = temperature;
    }, [temperature]);

    // Handle temperature change
    const handleTemperatureChange = (newTemp: number) => {
        setTemperature(newTemp);
        // Show dropper animation briefly
        setIsDropperActive(true);
        setTimeout(() => setIsDropperActive(false), 2000);
    };

    const handleStartRecording = () => {
        if (simState.isRecording) return;
        ensureAudioContext(); // Initialize audio on user gesture
        dataRef.current = [];
        lastSampleTimeRef.current = 0;
        setSimState({
            time: 0,
            isRecording: true,
            data: [],
            currentContraction: 3.0,
            heartRate: getTemperatureParams(temperature).hr,
            temperature
        });
        setResetKey(prev => prev + 1);
        startTimeRef.current = 0;
    };

    const handleStopRecording = () => {
        setSimState(prev => ({ ...prev, isRecording: false }));
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    const handleReset = () => {
        dataRef.current = [];
        lastSampleTimeRef.current = 0;
        setSimState({
            time: 0,
            isRecording: false,
            data: [],
            currentContraction: 3.0,
            heartRate: getTemperatureParams(temperature).hr,
            temperature
        });
        setResetKey(prev => prev + 1);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    // Simulation loop
    useEffect(() => {
        if (!simState.isRecording) {
            setSimState(prev => ({
                ...prev,
                heartRate: getTemperatureParams(temperature).hr
            }));
            return;
        }

        let lastTime = Date.now();
        let simTime = 0;
        startTimeRef.current = Date.now();

        const loop = () => {
            const now = Date.now();
            const dt = now - lastTime;
            lastTime = now;
            simTime += dt;

            if (simTime > RECORDING_DURATION) {
                setSimState(prev => ({ ...prev, isRecording: false }));
                return;
            }

            const params = getTemperatureParams(temperatureRef.current);
            const phase = (simTime % params.periodMs) / params.periodMs;
            const waveValue = cardiogramWaveform(phase, params.amplitude);
            const contraction = Math.max(0, waveValue);

            // Update phase for heartbeat sound
            setCurrentPhase(phase);

            // Sample data at fixed intervals to avoid overwhelming the graph
            if (simTime - lastSampleTimeRef.current >= SAMPLE_INTERVAL) {
                lastSampleTimeRef.current = simTime;
                dataRef.current.push({ t: simTime, y: waveValue });
            }

            setSimState(prev => ({
                ...prev,
                time: simTime,
                currentContraction: contraction,
                heartRate: params.hr,
                data: dataRef.current
            }));

            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [simState.isRecording]); // Removed temperature from dependency array

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">Normal Cardiogram</h1>
                        <p className="text-slate-400 text-xs">Amphibian / Frog Heart — Effect of Temperature</p>
                    </div>
                </div>
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
                <div className={`flex-1 relative bg-black ${mobileView === 'graph' ? 'hidden lg:flex' : 'flex'}`}>
                    <Canvas shadows camera={{ position: [2, 2, 7], fov: 38 }}>
                        <color attach="background" args={['#0f172a']} />
                        <Environment preset="city" />
                        <ambientLight intensity={0.6} color="#ffffff" />
                        <spotLight position={[10, 10, 5]} angle={0.3} penumbra={0.5} intensity={2} castShadow />
                        <pointLight position={[-5, 5, -3]} intensity={0.5} color="#ffeedd" />

                        <group position={[0, -1.2, 0]}>
                            {/* Frog & Board Assembly - Moved as a whole */}
                            <group position={[-0.5, 0, 0]}>
                                {/* Rotated Sub-Assembly: Board, Body, Heart */}
                                <group rotation={[0, -Math.PI * 0.5, 0]} position={[-0.01, -0.84, 0.25]}>
                                    {/* Myograph Board */}
                                    <MyographBoard onHoverChange={setHoveredLabel} />

                                    {/* Frog Body - Shifted Left to align with new Spring position (-0.8) */}
                                    <group position={[-0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                                        <FrogBody onHoverChange={setHoveredLabel} />
                                    </group>

                                    {/* Frog Heart - Aligned with Rotated Body Incision */}
                                    <group position={[0.3, 0.48, 0]} rotation={[0, -Math.PI / 2, 0]}>
                                        <FrogHeart
                                            contraction={simState.currentContraction}
                                            temperature={temperature}
                                            onHoverChange={setHoveredLabel}
                                        />
                                    </group>
                                </group>

                                {/* Thread from heart to lever (Aligns with x=-0.8) */}
                                <HeartThread contraction={simState.currentContraction} />

                                {/* Spring Loaded Lever */}
                                <SpringLoadedLever
                                    angle={(3.0 - simState.currentContraction) * 0.036}
                                    onHoverChange={setHoveredLabel}
                                />






                                {/* Kymograph Drum - Moved further back (X=4.2) for better clarity */}
                                <group position={[4.395, 0.75, 0.05]}>
                                    <CardiogramKymograph
                                        simTime={simState.time}
                                        waveformValue={simState.currentContraction}
                                        isRecording={simState.isRecording}
                                        onHoverChange={setHoveredLabel}
                                        resetKey={resetKey}
                                        drumSpeed={drumSpeed}
                                    />
                                </group>
                            </group>
                        </group>

                        <OrbitControls makeDefault minPolarAngle={0} />
                    </Canvas>

                    {/* Hover Label */}
                    {hoveredLabel && (
                        <div className="absolute top-4 left-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
                            {hoveredLabel}
                        </div>
                    )}
                </div>

                {/* Right Panel: Graph + Controls */}
                <div className="w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col flex-1 lg:flex-none">
                    {/* Cardiogram Graph */}
                    <div className={`flex-1 p-4 min-h-0 flex flex-col border-b border-slate-800 ${mobileView === '3d' ? 'hidden lg:flex' : 'flex'}`}>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Oscilloscope View</h3>
                        <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative">
                            <CardiogramGraph
                                data={simState.data}
                                temperature={temperature}
                                isRecording={simState.isRecording}
                            />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-4 lg:p-6 bg-slate-900 z-10 space-y-4 overflow-y-auto">

                        {/* Temperature Presets */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                <Thermometer className="w-4 h-4 text-red-400" /> Ringer's Solution Temperature
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {TEMPERATURE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => handleTemperatureChange(preset.value)}
                                        className={`px-2 py-2.5 rounded-lg text-xs font-bold transition-all border text-center
                                            ${temperature === preset.value
                                                ? `${preset.bgColor} ${preset.borderColor} text-white shadow-lg`
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <div>{preset.value}°C</div>
                                        <div className="text-[10px] opacity-75 mt-0.5">
                                            {preset.value <= 15 ? 'Cold' : preset.value >= 35 ? 'Warm' : 'Normal'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Heart Rate Display + Sound Toggle */}
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: TEMPERATURE_PRESETS.find(p => p.value === temperature)?.color || '#22c55e' }} />
                                <span className="text-sm text-slate-300">Heart Rate</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-mono font-bold" style={{ color: TEMPERATURE_PRESETS.find(p => p.value === temperature)?.color || '#22c55e' }}>
                                    {getTemperatureParams(temperature).hr} bpm
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

                        {/* Drum Speed */}
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Drum Speed
                                </label>
                                <span className="text-cyan-400 font-mono text-sm">{drumSpeed} mm/s</span>
                            </div>
                            <input
                                type="range" min="1" max="10" step="0.5" value={drumSpeed}
                                onChange={(e) => setDrumSpeed(Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                <span>1 mm/s</span>
                                <span>10 mm/s</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {!simState.isRecording ? (
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
                                onClick={handleReset}
                                className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Reset
                            </button>
                        </div>


                    </div>
                </div>
            </main>
        </div>
    );
};
