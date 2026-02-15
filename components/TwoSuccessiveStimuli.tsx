import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Cylinder, Box, Sphere, Circle, RoundedBox, Text, Environment } from '@react-three/drei';
import { ArrowLeft, Play, RotateCcw, Activity, Info, HelpCircle, Eye, LineChart } from 'lucide-react';
import * as THREE from 'three';

// --- Types & Constants ---

// Physiology Parameters (ms)
const LATENT_DURATION = 10;
const CONTRACTION_DURATION = 40;
const RELAXATION_DURATION = 50;

// Simulation
const TOTAL_WINDOW_MS = 200; // Total X-axis time

interface SimulationState {
    time: number;
    isRunning: boolean;
    data: { t: number; y: number; s1Y: number }[];
    currentTension: number;
    s2Applied: boolean;
    phase: 'Rest' | 'Latent' | 'Contraction' | 'Relaxation' | 'Beneficial' | 'Refractory';
    message: string;
}

// --- Helper Physics ---

const calculateTwitch = (t: number): number => {
    if (t < 0) return 0;
    if (t < LATENT_DURATION) return 0;

    const activeTime = t - LATENT_DURATION;

    if (activeTime < CONTRACTION_DURATION) {
        const progress = activeTime / CONTRACTION_DURATION;
        return Math.sin(progress * (Math.PI / 2));
    } else if (activeTime < CONTRACTION_DURATION + RELAXATION_DURATION) {
        const relaxTime = activeTime - CONTRACTION_DURATION;
        const progress = relaxTime / RELAXATION_DURATION; // 0 to 1
        return (1 + Math.cos(progress * Math.PI)) / 2;
    }

    return 0;
};

// --- Hover Label Helper ---

const InteractiveObject = ({
    label,
    children,
    onHoverChange
}: {
    label: string,
    children: React.ReactNode,
    onHoverChange: (label: string | null) => void
}) => {
    return (
        <group
            onPointerOver={(e) => { e.stopPropagation(); onHoverChange(label); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { onHoverChange(null); document.body.style.cursor = 'auto'; }}
        >
            {children}
        </group>
    );
};


// --- 3D Components ---

// 1. Lucas Chamber
const LucasChamber = ({ muscleShortening, onHoverChange }: { muscleShortening: number, onHoverChange: (l: string | null) => void }) => {
    return (
        <InteractiveObject label="Lucas Chamber & Muscle" onHoverChange={onHoverChange}>
            <group position={[-2, 0, 0]}>
                {/* Glass Trough Chamber */}
                <group position={[0, -0.5, 0]}>
                    <Box args={[3.2, 0.2, 1.5]} position={[0, -0.1, 0]}>
                        <meshPhysicalMaterial color="#cbd5e1" roughness={0.1} transmission={0.2} thickness={0.5} />
                    </Box>
                    {/* Walls */}
                    <Box args={[3.2, 1, 0.1]} position={[0, 0.5, 0.7]}>
                        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                    </Box>
                    <Box args={[3.2, 1, 0.1]} position={[0, 0.5, -0.7]}>
                        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                    </Box>
                    <Box args={[0.1, 1, 1.3]} position={[1.55, 0.5, 0]}>
                        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                    </Box>
                    <Box args={[0.1, 1, 1.3]} position={[-1.55, 0.5, 0]}>
                        <meshPhysicalMaterial color="#ffffff" transmission={0.95} opacity={1} roughness={0} thickness={0.1} clearcoat={1} />
                    </Box>

                    {/* Fluid */}
                    <Box args={[3.0, 0.8, 1.3]} position={[0, 0.4, 0]}>
                        <meshPhysicalMaterial color="#a5f3fc" transmission={0.9} opacity={0.6} transparent roughness={0.1} ior={1.33} />
                    </Box>
                </group>

                {/* Muscle */}
                <group position={[0, 0.2, 0]}>
                    <Cylinder args={[0.05, 0.05, 0.8]} rotation={[0, 0, 1.57]} position={[-1.2, 0, 0]}>
                        <meshStandardMaterial color="#94a3b8" />
                    </Cylinder>
                    <group position={[-1.2, 0, 0]}>
                        <group scale={[1 - (muscleShortening * 0.15), 1 + (muscleShortening * 0.3), 1 + (muscleShortening * 0.3)]} position={[1, 0, 0]}>
                            <Sphere args={[0.3, 16, 16]} scale={[3, 1, 1]} position={[0, 0, 0]}>
                                <meshStandardMaterial color="#be123c" roughness={0.6} />
                            </Sphere>
                            <Box args={[1.2, 0.05, 0.05]} position={[1.4, 0, 0]}>
                                <meshStandardMaterial color="#f1f5f9" />
                            </Box>
                        </group>
                    </group>
                </group>

                {/* Electrodes */}
                <group position={[-0.5, -0.2, 0]}>
                    <Cylinder args={[0.02, 0.02, 0.5]} position={[0, 0, 0.2]}>
                        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
                    </Cylinder>
                    <Cylinder args={[0.02, 0.02, 0.5]} position={[0.2, 0, 0.2]}>
                        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
                    </Cylinder>
                </group>
            </group>
        </InteractiveObject>
    );
};

// 2. Isotonic Lever System (Muscle Lever)
const StarlingLever = ({ angle, onHoverChange }: { angle: number, onHoverChange: (l: string | null) => void }) => {
    const brassColor = "#b8860b"; // Dark goldenrod - brass color
    const darkBrassColor = "#8b6914";
    const metalColor = "#c0c0c0"; // Silver metal

    return (
        <group position={[-0.3, 1.5, 0.1]}>
            {/* Stand and Adjustment Screw Group - move together by changing this position */}
            <group position={[0, -1.9, 0]}>
                {/* Upright Stand with base */}
                <InteractiveObject label="Stand (Upright Post)" onHoverChange={onHoverChange}>
                    <group position={[0, -1.5, 0]}>
                        {/* Base plate */}
                        <Box args={[0.6, 0.1, 0.4]} position={[0, -0.05, 0]}>
                            <meshStandardMaterial color={darkBrassColor} metalness={0.7} roughness={0.3} />
                        </Box>
                        {/* Upright post */}
                        <Cylinder args={[0.08, 0.1, 2.8]} position={[0, 1.35, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
                        </Cylinder>
                    </group>
                </InteractiveObject>

                {/* Threaded adjustment screw at top */}
                <InteractiveObject label="Adjustment Screw (Height Control)" onHoverChange={onHoverChange}>
                    <group position={[0, 1.35, 0]}>
                        {/* Screw threads */}
                        <Cylinder args={[0.06, 0.06, 0.3]}>
                            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
                        </Cylinder>
                        {/* Knurled knob */}
                        <Cylinder args={[0.1, 0.1, 0.15]} position={[0, 0.22, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.3} />
                        </Cylinder>
                    </group>
                </InteractiveObject>
            </group>

            {/* Square U-shaped Fulcrum/Support Bracket (brass) - rotates with stimulation */}
            <group position={[-0.4, -0.8, 0]} rotation={[0, 0, -Math.PI / 2 - angle]}>
                {/* Left vertical arm of U */}
                <InteractiveObject label="Left Limb (U-shaped Support)" onHoverChange={onHoverChange}>
                    <Box args={[0.12, 0.3, 0.08]} position={[0, 0.05, -1.11]}>
                        <meshStandardMaterial color={brassColor} metalness={0.7} roughness={0.3} />
                    </Box>
                </InteractiveObject>
                {/* Right vertical arm of U - matches left limb */}
                <InteractiveObject label="Right Limb (U-shaped Support)" onHoverChange={onHoverChange}>
                    <Box args={[0.12, 0.3, 0.08]} position={[0, 0.05, 0.11]}>
                        <meshStandardMaterial color={brassColor} metalness={0.7} roughness={0.3} />
                    </Box>
                </InteractiveObject>
                {/* Horizontal top piece connecting the two arms */}
                <InteractiveObject label="Connecting Bar (U-shaped Support)" onHoverChange={onHoverChange}>
                    <Box args={[0.12, 0.1, 1.3]} position={[0, 0.15, -0.5]}>
                        <meshStandardMaterial color={brassColor} metalness={0.7} roughness={0.3} />
                    </Box>
                </InteractiveObject>
                {/* Thumb Screw on top of connecting bar for lever arm attachment */}
                <InteractiveObject label="Thumb Screw (Lever Clamp)" onHoverChange={onHoverChange}>
                    <group position={[0.1, 0, -0.15]} rotation={[0, 0, Math.PI / 4]}>
                        {/* Threaded shaft - longer */}
                        <Cylinder args={[0.025, 0.025, 0.25]} position={[0, 0.125, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.15} />
                        </Cylinder>
                        {/* Knurled head */}
                        <Cylinder args={[0.05, 0.05, 0.06]} position={[0, 0.28, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.25} />
                        </Cylinder>
                        {/* Slot on top of screw head */}
                        <Box args={[0.07, 0.01, 0.015]} position={[0, 0.311, 0]}>
                            <meshStandardMaterial color="#1a1a1a" />
                        </Box>
                    </group>
                </InteractiveObject>
                {/* Pivot bolt going through both arms */}
                <InteractiveObject label="Pivot Bolt (Fulcrum Axis)" onHoverChange={onHoverChange}>
                    <group>
                        <Cylinder args={[0.04, 0.04, 1.4]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
                            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
                        </Cylinder>
                        {/* Bolt head (front) */}
                        <Cylinder args={[0.06, 0.06, 0.03]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.21]}>
                            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
                        </Cylinder>
                    </group>
                </InteractiveObject>
                {/* Bolt nut (back) */}
                <InteractiveObject label="Nut (Pivot Bolt)" onHoverChange={onHoverChange}>
                    <Cylinder args={[0.06, 0.06, 0.03]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1.21]}>
                        <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
                    </Cylinder>
                </InteractiveObject>

                {/* Lever Arm components - now inside the same rotating group */}
                {/* Main lever arm - Long Arm */}
                <InteractiveObject label="Long Arm (Writing Lever)" onHoverChange={onHoverChange}>
                    <group rotation={[0, Math.PI, -Math.PI / 2]}>
                        {/* Position this group to move both arm and holes together */}
                        <group position={[0.55, 0, 1]}>
                            <Box args={[1.125, 0.08, 0.05]} position={[0, 0, 0]}>
                                <meshStandardMaterial color={brassColor} metalness={0.6} roughness={0.4} />
                            </Box>
                            {/* Holes along the lever arm - positions relative to arm center */}
                            {[-0.3, -0.05, 0.2, 0.45].map((x, i) => (
                                <Cylinder key={i} args={[0.02, 0.02, 0.052]} rotation={[Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
                                    <meshStandardMaterial color="#1a1a1a" />
                                </Cylinder>
                            ))}
                        </group>
                    </group>
                </InteractiveObject>



                {/* Muscle Hook - curved wire going down */}
                <InteractiveObject label="Muscle Hook (S-shaped)" onHoverChange={onHoverChange}>
                    <group position={[0, 0, 0]} rotation={[0, 0, 1.7]}> {/* Adjust rotation here [x, y, z] */}
                        {/* Vertical part of hook */}
                        <Cylinder args={[0.015, 0.015, 0.6]} position={[0, -0.3, 0]}>
                            <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
                        </Cylinder>
                        {/* Curved hook end */}
                        <Cylinder args={[0.015, 0.015, 0.15]} position={[0.05, -0.6, 0]} rotation={[0, 0, 0.8]}>
                            <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
                        </Cylinder>
                    </group>
                </InteractiveObject>

                {/* Writing stylus/pointer tip */}
                <InteractiveObject label="Writing Point (Stylus)" onHoverChange={onHoverChange}>
                    <group position={[0, -1.1, -1]}>
                        {/* Thin writing arm extends downward (vertical) */}
                        <Cylinder args={[0.012, 0.005, 2.8]} rotation={[0, 0, 0]} position={[0, -0.6, 0]}>
                            <meshStandardMaterial color="#1a1a1a" />
                        </Cylinder>
                    </group>
                </InteractiveObject>
            </group>
        </group>
    );
};

// 3. Kymograph
const Kymograph = ({
    rotating,
    simTime,
    tension,
    isRunning,
    onHoverChange,
    resetKey
}: {
    rotating: boolean,
    simTime: number,
    tension: number,
    isRunning: boolean,
    onHoverChange: (l: string | null) => void,
    resetKey: number
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const lastDrawState = useRef<{ x: number, y: number } | null>(null);

    // Position Update:
    // Lever Tip is now pointing in a different direction after rotation changes.
    // Moving kymograph to align with the new writing lever position.
    // Moving kymograph to align with the new writing lever position.
    // Position is now hardcoded in the group below to match SimpleMuscleTwitch
    // const DRUM_X = -2.5;
    // const DRUM_Z = 2;

    const WIDTH = 1024;
    const HEIGHT = 512;

    // Create texture using useMemo to ensure it persists
    const texture = useMemo(() => {
        const canvas = canvasRef.current;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            for (let i = 0; i < 3000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#0a0a0a' : '#050505';
                ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 1, 1);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, []);

    const WIDTH_CONST = 1024;

    // Initialize canvas on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Pure black smoked paper background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            // Very subtle noise for texture (barely visible)
            for (let i = 0; i < 3000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#0a0a0a' : '#050505';
                ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 1, 1);
            }
        }
        // Trigger texture update after canvas is initialized
        if (texture) {
            texture.needsUpdate = true;
        }
    }, [texture]);

    // Clear canvas when simulation STARTS (new stimulation)
    useEffect(() => {
        if (isRunning && canvasRef.current && texture) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                // Clear and redraw black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                // Add subtle noise
                for (let i = 0; i < 3000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? '#0a0a0a' : '#050505';
                    ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 1, 1);
                }
                texture.needsUpdate = true;
            }
        }
    }, [isRunning, texture]);

    // Clear canvas when reset button is clicked (resetKey changes)
    useEffect(() => {
        if (resetKey > 0 && canvasRef.current && texture) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                // Clear and redraw black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                // Add subtle noise
                for (let i = 0; i < 3000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? '#0a0a0a' : '#050505';
                    ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 1, 1);
                }
                texture.needsUpdate = true;
            }
        }
    }, [resetKey, texture]);

    useFrame(() => {
        if (!isRunning || !canvasRef.current || !texture) {
            if (!isRunning) lastDrawState.current = null;
            return;
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Physics Sync:
        // Total Rotation ideally should be small for a single twitch (e.g., 45 deg).
        // Texture Width = 1024.
        // Full Turn (360 deg) = 1024 pixels.
        // 45 deg = 1024 / 8 = 128 pixels.

        const MAX_ROTATION = Math.PI / 4; // 45 degrees
        const PIXELS_TO_DRAW = WIDTH * (MAX_ROTATION / (2 * Math.PI)); // ~128px

        // Start drawing from x=50, extend only by PIXELS_TO_DRAW
        const x = 50 + (simTime / TOTAL_WINDOW_MS) * PIXELS_TO_DRAW;

        // Tension 0 -> Y = HEIGHT * 0.5 (Centered on drum)
        const y = (HEIGHT * 0.5) - (tension * 80);

        if (lastDrawState.current) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3; // Finer line
            ctx.lineCap = 'square'; // Sharp edges
            ctx.lineJoin = 'miter'; // Sharp corners
            ctx.beginPath();
            ctx.moveTo(lastDrawState.current.x, lastDrawState.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();

            texture.needsUpdate = true;
        }

        lastDrawState.current = { x, y };
    });

    const drumMesh = useRef<THREE.Group>(null);

    // INITIAL_ROTATION: Adjust this value (in radians) to align trace with lever tip
    // The drum has been moved, so adjust rotation to make graph visible
    // Try values: 0, 1.57, 3.14, 4.71 (0°, 90°, 180°, 270°)
    const INITIAL_ROTATION = 1.5; // Adjusted for new drum position

    useFrame(() => {
        if (drumMesh.current && isRunning) {
            const MAX_ROTATION = Math.PI / 4; // 45 degrees
            const angle = (simTime / TOTAL_WINDOW_MS) * MAX_ROTATION;
            drumMesh.current.rotation.y = INITIAL_ROTATION - angle;
        }
        // When simulation stops, drum stays at its current position (no reset)
    });

    return (
        <InteractiveObject label="Sherrington Kymograph Drum" onHoverChange={onHoverChange}>
            {/* 
               Kymograph positioned to align with writing lever tip.
            */}
            <group position={[-2.07, 1.7, 4.1]}>
                <group ref={drumMesh} rotation={[0, INITIAL_ROTATION, 0]}>
                    <Cylinder args={[1.2, 1.2, 3, 64]}>
                        {/* Material 0: Side (with texture) - BasicMaterial shows texture at full brightness, no lighting */}
                        <meshBasicMaterial attach="material-0" map={texture} />
                        {/* Material 1: Top Cap */}
                        <meshStandardMaterial attach="material-1" color="#111111" />
                        {/* Material 2: Bottom Cap */}
                        <meshStandardMaterial attach="material-2" color="#111111" />
                    </Cylinder>
                    {/* Plus/Cross marking on top of cylinder */}
                    <group position={[0, 1.51, 0]}>
                        {/* Horizontal bar of plus */}
                        <Box args={[1.8, 0.02, 0.08]}>
                            <meshStandardMaterial color="#000000" />
                        </Box>
                        {/* Vertical bar of plus */}
                        <Box args={[0.08, 0.02, 1.8]}>
                            <meshStandardMaterial color="#000000" />
                        </Box>
                    </group>
                </group>
                {/* Spindle needs to go down to the base which is on Floor (Y=-2.5 relative to here) */}
                <Cylinder args={[0.1, 0.1, 4.5]} position={[0, -0.25, 0]}> {/* Spindle */}
                    <meshStandardMaterial color="#1e293b" />
                </Cylinder>
                <Box args={[1.5, 0.5, 2]} position={[0, -2.25, 0]}> {/* Base on floor (relative Y: 1.5 - 2.25 = -0.75? Wait. World Y=-1. KymoY=1.5 (Rel Main). Main Y=-1. World KymoY=0.5. Floor=-2. Base should be at -2.5 from KymoY(0.5) = -2. Correct.) */}
                    <meshStandardMaterial color="#0f172a" />
                </Box>
            </group>
        </InteractiveObject>
    );
};


// Preset Phase Options for S₂ timing
interface PhasePreset {
    id: string;
    label: string;
    description: string;
    isi: number;
}

const PHASE_PRESETS: PhasePreset[] = [
    {
        id: 'A',
        label: 'Latent Period',
        description: 'S₂ in second half of latent period',
        isi: 8 // Second half of latent: ~5-10ms after S1
    },
    {
        id: 'B',
        label: 'Contraction Period',
        description: 'S₂ in second half of contraction period',
        isi: 35 // Second half of contraction: latent(10) + half contraction(20-40)
    },
    {
        id: 'C',
        label: 'Early Relaxation Period',
        description: 'S₂ in early relaxation period',
        isi: 60 // Early relaxation: latent(10) + contraction(40) + early relax(10)
    },
    {
        id: 'D',
        label: 'Late Relaxation Period',
        description: 'S₂ in late relaxation period',
        isi: 85 // Late relaxation: latent(10) + contraction(40) + late relax(35)
    }
];

export const TwoSuccessiveStimuli: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // --- State ---
    const [isi, setIsi] = useState<number>(30);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'3d' | 'graph'>('3d'); // Toggle for mobile view

    // Handler for preset selection
    const handlePresetSelect = (preset: PhasePreset) => {
        setSelectedPreset(preset.id);
        setIsi(preset.isi);
    };

    // Handler for manual slider change - clears preset selection
    const handleSliderChange = (value: number) => {
        setSelectedPreset(null);
        setIsi(value);
    };

    const [simState, setSimState] = useState<SimulationState>({
        time: 0,
        isRunning: false,
        data: [],
        currentTension: 0,
        s2Applied: false,
        phase: 'Rest',
        message: 'Ready to stimulate.'
    });

    // Key to trigger kymograph canvas reset
    const [kymographResetKey, setKymographResetKey] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    const resetSimulation = () => {
        setSimState({
            time: 0,
            isRunning: false,
            data: [],
            currentTension: 0,
            s2Applied: false,
            phase: 'Rest',
            message: 'Experiment reset. Adjust ISI and start.'
        });
        // Increment key to trigger kymograph canvas reset
        setKymographResetKey(prev => prev + 1);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const startSimulation = () => {
        resetSimulation();
        setSimState(prev => ({
            ...prev,
            isRunning: true,
            message: 'Stimulus 1 applied...',
            startTime: Date.now()
        }));
    };

    // The Run Loop
    useEffect(() => {
        if (!simState.isRunning) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        let lastTime = Date.now();
        let simTime = simState.time;

        const loop = () => {
            const now = Date.now();
            const dt = now - lastTime;
            lastTime = now;

            const safeDt = Math.min(dt, 50);
            const speedFactor = 0.2;
            simTime += safeDt * speedFactor;

            if (simTime > TOTAL_WINDOW_MS) {
                setSimState(prev => ({ ...prev, isRunning: false, message: 'Recording complete.' }));
                return;
            }

            // --- PHYSIOLOGY CALCULATION ---
            const S1_TIME = 20;
            const t1 = simTime - S1_TIME;
            let tension1 = calculateTwitch(t1);

            const S2_TIME = S1_TIME + isi;
            const t2 = simTime - S2_TIME;
            let tension2 = 0;
            let currentPhase: SimulationState['phase'] = 'Rest';
            let statusMsg = '';

            const timeOfS2RelativeToS1 = isi;
            const isRefractory = timeOfS2RelativeToS1 < (LATENT_DURATION / 2);

            if (t1 < 0) currentPhase = 'Rest';
            else if (t1 < LATENT_DURATION) currentPhase = 'Latent';
            else if (t1 < LATENT_DURATION + CONTRACTION_DURATION) currentPhase = 'Contraction';
            else if (t1 < LATENT_DURATION + CONTRACTION_DURATION + RELAXATION_DURATION) currentPhase = 'Relaxation';
            else currentPhase = 'Rest';

            if (simTime >= S2_TIME) {
                if (isRefractory) {
                    tension2 = 0;
                    if (simTime < S2_TIME + 50) statusMsg = 'S2 in Refractory Period (Ignored)';
                } else {
                    const BENEFICIAL_FACTOR = 1.3;
                    tension2 = calculateTwitch(t2) * BENEFICIAL_FACTOR;
                    if (simTime < S2_TIME + 50) statusMsg = 'S2 Effective (Summation)';
                }
            } else {
                statusMsg = simState.message;
            }

            const totalTension = tension1 + tension2;

            setSimState(prev => ({
                ...prev,
                time: simTime,
                currentTension: totalTension,
                phase: currentPhase,
                message: statusMsg || prev.message,
                data: [...prev.data, {
                    t: simTime,
                    y: totalTension,
                    s1Y: prev.time < S1_TIME ? 0 : calculateTwitch(prev.time - S1_TIME)
                }]
            }));

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [simState.isRunning, isi]);


    // --- Canvas Rendering (2D Graph) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 20; // Reduced top/side padding
        const bottomMargin = 60; // Increased bottom space for stacking
        const plotWidth = width - padding * 2;
        const plotHeight = height - padding - bottomMargin;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);

        const getX = (t: number) => padding + (Math.max(0, Math.min(TOTAL_WINDOW_MS, t)) / TOTAL_WINDOW_MS) * plotWidth;
        const getY = (v: number) => (height - bottomMargin) - (v / 2.5) * plotHeight;

        // --- Reference Curve (Normal S1) Text-Book Style ---
        ctx.beginPath();
        ctx.strokeStyle = '#475569'; // Slate-600
        ctx.lineWidth = 1.5;
        // ctx.setLineDash([5, 5]); // Solid line for textbook look? Or dashed? Image shows solid but user said reference. Let's keep dashed for "background" feel to distinguish from live data.
        ctx.setLineDash([4, 4]);

        const S1_REF_TIME = 20;

        // Draw normal twitch curve
        for (let t = 0; t <= TOTAL_WINDOW_MS; t += 2) {
            const timeSinceStim = t - S1_REF_TIME;
            let val = 0;
            if (timeSinceStim > 0) {
                if (timeSinceStim < LATENT_DURATION) val = 0;
                else {
                    const activeTime = timeSinceStim - LATENT_DURATION;
                    if (activeTime < CONTRACTION_DURATION) {
                        val = Math.sin((activeTime / CONTRACTION_DURATION) * (Math.PI / 2));
                    } else if (activeTime < CONTRACTION_DURATION + RELAXATION_DURATION) {
                        const relaxTime = activeTime - CONTRACTION_DURATION;
                        val = (1 + Math.cos((relaxTime / RELAXATION_DURATION) * Math.PI)) / 2;
                    }
                }
            }
            if (t === 0) ctx.moveTo(getX(t), getY(val));
            else ctx.lineTo(getX(t), getY(val));
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // -- Textbook Annotations (Vertical Lines & Bottom Arrows) --
        const axisY = height - bottomMargin; // Axis is at bottom of plot area
        const markerY = axisY + 14; // S1/S2 dots just below axis
        const arrowY = axisY + 35; // Dimensions further down

        const t0 = S1_REF_TIME;
        const t1 = t0 + LATENT_DURATION;
        const t2 = t1 + CONTRACTION_DURATION;
        const t3 = t2 + RELAXATION_DURATION;

        const x0 = getX(t0);
        const x1 = getX(t1);
        const x2 = getX(t2);
        const x3 = getX(t3);

        ctx.strokeStyle = '#64748b'; // Slate-500
        ctx.lineWidth = 1;
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Helper for vertical line
        const drawVert = (x: number, topY: number) => {
            const bottomY = arrowY + 20; // Extend down past the labels
            ctx.beginPath();
            ctx.moveTo(x, bottomY);
            ctx.lineTo(x, topY);
            ctx.stroke();
        };

        // Draw Vertical dividers (up to curve height roughly)
        drawVert(x0, axisY - 10); // Start
        drawVert(x1, axisY - 10); // End Latent
        drawVert(x2, getY(1.0)); // Peak
        drawVert(x3, axisY - 10); // End Relaxation

        // Helper for dimension arrow
        const drawDimension = (xStart: number, xEnd: number, label: string) => {
            const mid = (xStart + xEnd) / 2;
            const lineY = arrowY;

            // Line
            ctx.beginPath();
            ctx.moveTo(xStart, lineY);
            ctx.lineTo(xEnd, lineY);
            ctx.stroke();

            // Arrowheads (simple)
            ctx.beginPath();
            // Left
            ctx.moveTo(xStart + 3, lineY - 3); ctx.lineTo(xStart, lineY); ctx.lineTo(xStart + 3, lineY + 3);
            // Right
            ctx.moveTo(xEnd - 3, lineY - 3); ctx.lineTo(xEnd, lineY); ctx.lineTo(xEnd - 3, lineY + 3);
            ctx.stroke();

            // Label
            ctx.fillText(label, mid, lineY + 10); // Text below arrow
        };

        drawDimension(x0, x1, 'LP');
        drawDimension(x1, x2, 'CP');
        drawDimension(x2, x3, 'RP');


        // Grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let t = 0; t <= TOTAL_WINDOW_MS; t += 25) {
            const x = padding + (t / TOTAL_WINDOW_MS) * plotWidth;
            ctx.moveTo(x, padding);
            ctx.lineTo(x, axisY);
        }
        for (let y = 0; y <= 2.5; y += 0.5) {
            const vy = axisY - (y / 2.5) * plotHeight;
            ctx.moveTo(padding, vy);
            ctx.lineTo(width - padding, vy);
        }
        ctx.stroke();



        if (simState.data.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.moveTo(getX(simState.data[0].t), getY(simState.data[0].y));
            for (let i = 1; i < simState.data.length; i++) {
                ctx.lineTo(getX(simState.data[i].t), getY(simState.data[i].y));
            }
            ctx.stroke();
        }

        const S1_TIME = 20;
        const S2_TIME = S1_TIME + isi;

        // S1 marker dot and label
        // Use axisY defined above
        const markerBaseY = axisY + 14;

        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(getX(S1_TIME), markerBaseY, 6, 0, Math.PI * 2); ctx.fill();
        // Glow effect for S1
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(getX(S1_TIME), markerBaseY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // S1 label 
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('S₁', getX(S1_TIME), markerBaseY + 8); // Below dot

        // S2 marker dot and label
        ctx.fillStyle = '#f472b6';
        ctx.beginPath(); ctx.arc(getX(S2_TIME), markerBaseY, 6, 0, Math.PI * 2); ctx.fill();
        // Glow effect for S2
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(getX(S2_TIME), markerBaseY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // S2 label
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#fbcfe8';
        ctx.fillText('S₂', getX(S2_TIME), markerBaseY + 8);

        ctx.textAlign = 'left'; // Reset
        ctx.textBaseline = 'alphabetic';

    }, [simState.data, isi]);


    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-slate-950 text-slate-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 md:py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Effect of Two Successive Stimuli</h1>

                    </div>
                </div>

            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Mobile View Toggle - Only visible on small screens */}
                <div className="lg:hidden flex bg-slate-800 border-b border-slate-700">
                    <button
                        onClick={() => setMobileView('3d')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === '3d'
                            ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        <span>3D View</span>
                    </button>
                    <button
                        onClick={() => setMobileView('graph')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === 'graph'
                            ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <LineChart className="w-4 h-4" />
                        <span>Graph View</span>
                    </button>
                </div>

                {/* 3D Visualization Area - Hidden on mobile when graph is selected */}
                <div className={`relative bg-[#09090b] shrink-0 ${mobileView === 'graph' ? 'hidden lg:flex lg:flex-1' : 'h-[40vh] lg:h-auto lg:flex-1 flex'}`}>
                    <Canvas shadows camera={{ position: [1, 2, 8], fov: 35 }}>
                        <color attach="background" args={['#09090b']} />

                        <Environment preset="city" />
                        <ambientLight intensity={0.6} color="#ffffff" />
                        <spotLight position={[10, 10, 5]} angle={0.3} penumbra={0.5} intensity={2} castShadow shadow-bias={-0.0001} />
                        <pointLight position={[-5, 5, -5]} intensity={1} color="#38bdf8" />
                        <pointLight position={[5, 2, -5]} intensity={0.8} color="#fbbf24" />

                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                            <planeGeometry args={[100, 100]} />
                            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.2} />
                        </mesh>

                        <group position={[0, -1, 0]}>
                            {/* Muscle Experiment Setup Group - adjust SETUP_ROTATION to rotate whole setup */}
                            <group
                                position={[0, 1, 0]}
                                rotation={[0, Math.PI / 2, 0]}  // Rotate 90° around Y to face kymograph
                            >
                                <LucasChamber muscleShortening={simState.currentTension} onHoverChange={setHoveredLabel} />
                                <StarlingLever angle={simState.currentTension * 0.15} onHoverChange={setHoveredLabel} />
                            </group>

                            {/* Kymograph - separate so it can be positioned independently */}
                            <Kymograph
                                rotating={simState.isRunning}
                                simTime={simState.time}
                                tension={simState.currentTension}
                                isRunning={simState.isRunning}
                                onHoverChange={setHoveredLabel}
                                resetKey={kymographResetKey}
                            />
                        </group>

                        <OrbitControls
                            target={[1.5, 0, 0]} /* Shift focus slightly right to encompass new drum pos */
                            minDistance={1}
                            maxDistance={15}
                        />
                    </Canvas>

                    {/* Hover Label HUD */}
                    {hoveredLabel && (
                        <div className="absolute top-4 left-4 pointer-events-none z-50">
                            <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/20 shadow-xl text-sm font-bold animate-in fade-in zoom-in duration-200">
                                {hoveredLabel}
                            </div>
                        </div>
                    )}


                </div>

                {/* Right Panel: Controls & 2D Graph */}
                <div className="w-full lg:w-[400px] lg:flex-none flex flex-col bg-slate-900 border-l border-slate-800 z-10 shadow-2xl lg:min-h-0 flex-1 lg:flex-none">
                    {/* Graph (Top) - Hidden in Mobile 3D View */}
                    <div className={`p-3 bg-slate-950 border-b border-slate-800 shrink-0 ${mobileView === '3d' ? 'hidden lg:block' : 'block'}`}>
                        <canvas
                            ref={canvasRef}
                            width={360}
                            height={220}
                            className="w-full h-[180px] bg-slate-900 rounded border border-slate-800"
                        />
                    </div>

                    {/* Controls (Bottom) - Always visible, scrollable */}
                    <div className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-6">


                        {/* ISI Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-sm font-medium text-slate-200">Stimulus Interval</label>
                                <span className="text-lg font-bold text-cyan-400 font-mono">{isi} ms</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="150" step="1"
                                value={isi}
                                onChange={(e) => handleSliderChange(Number(e.target.value))}
                                disabled={simState.isRunning}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
                            />

                        </div>

                        {/* Phase Presets Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-200">
                                S₂ falls on the following periods of S₁:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PHASE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePresetSelect(preset)}
                                        disabled={simState.isRunning}
                                        className={`
                                            p-3 rounded-lg border text-left transition-all
                                            ${selectedPreset === preset.id
                                                ? 'bg-cyan-900/40 border-cyan-500 text-cyan-200'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                                            }
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold
                                                ${selectedPreset === preset.id
                                                    ? 'border-cyan-400 bg-cyan-500 text-white'
                                                    : 'border-slate-500 text-slate-400'
                                                }
                                            `}>
                                                {preset.id}
                                            </span>
                                            <span className="text-xs font-semibold">{preset.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={startSimulation}
                                disabled={simState.isRunning}
                                className="col-span-2 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Play className={`w-4 h-4 ${simState.isRunning ? 'animate-pulse' : ''}`} />
                                {simState.isRunning ? 'Recording...' : 'Stimulate'}
                            </button>
                            <button
                                onClick={resetSimulation}
                                disabled={simState.isRunning}
                                className="col-span-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                        </div>


                    </div>
                </div >
            </main >
        </div >
    );
};
