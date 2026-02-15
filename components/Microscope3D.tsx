import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Box, Cylinder, Torus, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, Move, Eye, Ruler, Sun } from 'lucide-react';

// --- Types ---
interface MicroscopeState {
    coarseFocus: number; // 0-100
    fineFocus: number;   // 0-100
    stageX: number;
    stageY: number;
    objective: 4 | 10 | 40 | 100;
    lightIntensity: number; // Mirror light reflection
    condenserHeight: number; // 0-100
    irisOpening: number; // 0.1-1.0
    mirrorSide: 'plane' | 'concave';
}

// --- CONSTANTS ---
const OPTICAL_Z = 0.5;
const COLLISION_LIMITS = {
    4: 63,
    10: 56,
    40: 46,
    100: 40
};

// --- 3D COMPONENTS ---

const KnurledKnob = ({ radius, height, rotation, position }: { radius: number, height: number, rotation: number, position: [number, number, number] }) => {
    // A knob with visible "grooves" for rotation feedback
    const ribs = 12;
    return (
        <group position={position} rotation={[rotation, 0, 0]}>
            {/* Core - Rotated to align with X-axis */}
            <Cylinder args={[radius, radius, height, 16]} rotation={[0, 0, Math.PI / 2]}>
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </Cylinder>
            {/* Ribs (Grooves) - Positioned in YZ plane and oriented along X */}
            {Array.from({ length: ribs }).map((_, i) => (
                <Box
                    key={i}
                    args={[height + 0.02, 0.05, 0.05]}
                    position={[
                        0,
                        Math.cos((i / ribs) * Math.PI * 2) * radius,
                        Math.sin((i / ribs) * Math.PI * 2) * radius
                    ]}
                    rotation={[-(i / ribs) * Math.PI * 2, 0, 0]}
                >
                    <meshStandardMaterial color="#222" />
                </Box>
            ))}
        </group>
    );
};

const HorseshoeBase = ({ onHover }: { onHover: (n: string | null) => void }) => (
    <group
        position={[0, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover("Base / Horseshoe Foot"); }}
        onPointerOut={() => onHover(null)}
    >
        {/* The U-shape Legs */}
        <Box args={[0.8, 0.4, 4]} position={[-1.2, 0.2, 0.5]}>
            <meshStandardMaterial color="#111" roughness={0.6} />
        </Box>
        <Box args={[0.8, 0.4, 4]} position={[1.2, 0.2, 0.5]}>
            <meshStandardMaterial color="#111" roughness={0.6} />
        </Box>
        {/* Back Connector */}
        <Box args={[3.2, 0.4, 1]} position={[0, 0.2, -1.0]}>
            <meshStandardMaterial color="#111" roughness={0.6} />
        </Box>
        {/* Pillar Joint */}
        <mesh position={[0, 0.8, -1.0]}>
            <cylinderGeometry args={[0.4, 0.5, 1.2]} />
            <meshStandardMaterial color="#111" />
        </mesh>
    </group>
);

const MirrorSystem = ({ intensity, onHover }: { intensity: number, onHover: (n: string | null) => void }) => {
    // Mirror tilts based on "intensity". 
    // Slider is 0-150. Mapping this to a full 360 degrees (Math.PI * 2).
    const tilt = (intensity / 150) * (Math.PI * 2);

    // Angle-based logic for glow
    const normalizedTilt = tilt % (Math.PI * 2);
    const distTo135 = Math.abs(normalizedTilt - 3 * Math.PI / 4); // Using 135 as "concave side up"
    const distTo315 = Math.abs(normalizedTilt - 7 * Math.PI / 4);

    // We'll simplify: One side is plane, one is concave.
    // At 315 deg (7PI/4), the "front" side is up.
    // At 135 deg (3PI/4), the "back" side is up.

    return (
        <group
            position={[0, 0.8, OPTICAL_Z]}
        >
            <group rotation={[tilt, 0, 0]}>
                {/* Mirror Frame - Facing Front (coplanar with disc) */}
                <mesh
                    rotation={[0, 0, 0]}
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Mirror Frame"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <torusGeometry args={[0.6, 0.08, 16, 32]} />
                    <meshStandardMaterial color="#666" metalness={0.8} />
                </mesh>
                {/* Mirror Disc (Combined) - Facing Front */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.55, 0.55, 0.16, 32]} />
                    <meshStandardMaterial color="#222" />
                </mesh>

                {/* Plane Side (Front) */}
                <mesh
                    position={[0, 0, 0.081]}
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Plane Mirror"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <circleGeometry args={[0.52, 32]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        metalness={1}
                        roughness={0}
                        emissive="#ffffff"
                        emissiveIntensity={Math.max(0, 1 - distTo315 / 0.5) * (intensity / 100)}
                    />
                </mesh>

                {/* Concave Side (Back) - Perfectly parallel (back-to-back) with Plane side */}
                <mesh
                    position={[0, 0, -2.08]}
                    rotation={[Math.PI / 2, 0, 0]}
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Concave Mirror"); }}
                    onPointerOut={() => onHover(null)}
                >
                    {/* Using larger sphere radius (2.0) for a shallow concave bowl that fills the disc */}
                    <sphereGeometry args={[2.0, 32, 32, 0, Math.PI * 2, 0, 0.265]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        metalness={1}
                        roughness={0}
                        emissive="#ffffff"
                        emissiveIntensity={Math.max(0, 1 - distTo135 / 0.5) * (intensity / 100)}
                        side={2}
                    />
                </mesh>
            </group>
        </group>
    );
};

// --- CONDENSER AND IRIS SYSTEM ---
const CondenserSystem = ({ height, iris, intensity, onHover }: { height: number, iris: number, intensity: number, onHover: (n: string | null) => void }) => {
    // Condenser sits below the stage
    const condenserY = 1.5 + (height / 100) * 0.8;

    return (
        <group position={[0, condenserY, OPTICAL_Z]}>
            {/* Condenser Housing */}
            <mesh
                onPointerOver={(e) => { e.stopPropagation(); onHover("Condenser"); }}
                onPointerOut={() => onHover(null)}
            >
                <cylinderGeometry args={[0.5, 0.6, 0.6, 32]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
            </mesh>

            {/* Iris Diaphragm (Adjustable Opening) */}
            <group
                position={[0, 0.35, 0]}
                onPointerOver={(e) => { e.stopPropagation(); onHover("Iris Diaphragm"); }}
                onPointerOut={() => onHover(null)}
            >
                {/* Outer Ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[iris * 0.4, 0.5, 32]} />
                    <meshStandardMaterial color="#111" side={2} />
                </mesh>
                {/* Inner Opening (Light passes through) */}
                <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[iris * 0.4, 32]} />
                    <meshBasicMaterial color="#ffffcc" opacity={0.3 * (intensity / 100)} transparent />
                </mesh>
            </group>

            {/* Iris Lever */}
            <mesh position={[0.6, 0.35, 0]} rotation={[0, 0, Math.PI / 2 - iris * 0.5]}>
                <boxGeometry args={[0.3, 0.05, 0.05]} />
                <meshStandardMaterial color="#444" metalness={0.8} />
            </mesh>

            {/* Condenser Height Knob (Left side only) */}
            <group position={[-0.5, 0, 0]}>
                <mesh position={[-0.1, 0, 0]}>
                    <boxGeometry args={[0.2, 0.1, 0.1]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <group
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Condenser Adjustment Knob"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <KnurledKnob
                        radius={0.3}
                        height={0.2}
                        rotation={height * 0.1}
                        position={[-0.2, 0, 0]}
                    />
                </group>
            </group>
        </group>
    );
};

// --- LIGHT RAYS VISUALIZATION ---
const LightRays = ({ intensity, mirrorTilt, condenserY, iris, side }: { intensity: number, mirrorTilt: number, condenserY: number, iris: number, side: 'plane' | 'concave' }) => {
    const rayColor = "#ffffec";
    // mirrorTilt mapping: Slider 0-150 maps to 0-360 degrees (PI * 2)
    const tiltAngle = (mirrorTilt / 150) * (Math.PI * 2);

    // Alignment factor: Max visibility when mirror is at an angle that reflects front light UP.
    // Optimal angles are PI/4 (45deg) for the front side, or 5PI/4 (225deg) for the back side. 
    const normalizedTilt = tiltAngle % (Math.PI * 2);
    const distTo135 = Math.abs(normalizedTilt - 3 * Math.PI / 4);
    const distTo315 = Math.abs(normalizedTilt - 7 * Math.PI / 4);

    // Sharper alignment window (0.15 rad ~ 8.5 degrees) for better realism
    const alignment = Math.max(0, 1 - Math.min(distTo135, distTo315) / 0.15);

    // Decouple intensity from slider for ray visibility so it's bright at the "working" angle
    // but still respects the overall intensity setting (for the eyepiece)
    if (alignment <= 0) return null;

    // Fixed bright opacity when aligned, slightly scaled by intensity for overall brightness control
    const rayOpacity = 0.5 * alignment * (0.5 + (intensity / 100) * 0.5);

    // Determine ray shape based on the target angle we are closest to
    const isConcavePos = distTo135 < distTo315;
    const irisRadius = iris * 0.4;
    const mirrorRadius = 0.5;

    // Surface alignment calculation
    const faceOffset = isConcavePos ? -0.081 : 0.081;
    const surfaceY = 0.8 - faceOffset * Math.sin(tiltAngle);
    const surfaceZRel = faceOffset * Math.cos(tiltAngle);

    return (
        <group position={[0, 0, OPTICAL_Z]}>
            {/* 1. Incoming light from the front (Z-axis) - Aesthetic Light Beam */}
            <mesh position={[0, 0.8, 2.5 + surfaceZRel / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 5 - surfaceZRel, 16, 1, true]} />
                <meshStandardMaterial
                    color={rayColor}
                    transparent
                    opacity={rayOpacity * 0.4}
                    emissive={rayColor}
                    emissiveIntensity={2}
                    side={2}
                />
            </mesh>

            {/* 2. Reflected light from mirror to condenser */}
            <group position={[0, surfaceY, surfaceZRel]}>
                {isConcavePos ? (
                    /* Converging rays (mimicking Concave mirror) at 135 degrees */
                    <mesh position={[0, (condenserY - surfaceY) / 2, 0]}>
                        <cylinderGeometry args={[irisRadius, mirrorRadius, condenserY - surfaceY, 16, 1, true]} />
                        <meshStandardMaterial
                            color={rayColor}
                            transparent
                            opacity={rayOpacity}
                            emissive={rayColor}
                            emissiveIntensity={2}
                            side={2}
                        />
                    </mesh>
                ) : (
                    /* Parallel rays (mimicking Plane mirror) at 315 degrees */
                    <mesh position={[0, (condenserY - surfaceY) / 2, 0]}>
                        <cylinderGeometry args={[mirrorRadius * 0.8, mirrorRadius * 0.8, condenserY - surfaceY, 16, 1, true]} />
                        <meshStandardMaterial
                            color={rayColor}
                            transparent
                            opacity={rayOpacity}
                            emissive={rayColor}
                            emissiveIntensity={2}
                            side={2}
                        />
                    </mesh>
                )}
            </group>

            {/* 3. Focused beam from condenser to stage (through iris) */}
            <mesh position={[0, condenserY + (2.8 - condenserY) / 2, 0]}>
                <cylinderGeometry args={[irisRadius * 0.3, irisRadius, 2.8 - condenserY, 16, 1, true]} />
                <meshStandardMaterial
                    color="#ffffcc"
                    transparent
                    opacity={rayOpacity * 1.5}
                    emissive="#ffffcc"
                    emissiveIntensity={3}
                    side={2}
                />
            </mesh>
        </group>
    );
};

const CurvedArm = ({ coarsePos, finePos, onHover }: { coarsePos: number, finePos: number, onHover: (n: string | null) => void }) => {
    // Rotation values for the knobs
    const coarseRot = coarsePos * 0.1;
    const fineRot = finePos * 0.5;

    return (
        <group position={[0, 1.2, -1.0]}>
            {/* The "C" Curve Composition */}
            <group
                onPointerOver={(e) => { e.stopPropagation(); onHover("Limb / Curved Arm"); }}
                onPointerOut={() => onHover(null)}
            >
                <Box args={[0.8, 2, 0.8]} position={[0, 0.5, 0]}>
                    <meshStandardMaterial color="#111" />
                </Box>
                <Box args={[0.8, 3, 0.8]} position={[0, 2.5, -0.2]} rotation={[-0.2, 0, 0]}>
                    <meshStandardMaterial color="#111" />
                </Box>
                <Box args={[0.8, 2, 0.8]} position={[0, 4.2, 0.5]} rotation={[-Math.PI / 3, 0, 0]}>
                    <meshStandardMaterial color="#111" />
                </Box>
            </group>

            {/* Focus Knobs on the Side (Mounted horizontally along X axis) */}
            {/* Right Side Knobs */}
            <group position={[0.4, 2.0, -0.1]}>
                {/* Horizontal Shaft Joint */}
                <Box args={[0.6, 0.2, 0.2]} position={[0.2, 0, 0]}>
                    <meshStandardMaterial color="#333" />
                </Box>
                {/* Coarse (Large) */}
                <group
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Coarse Adjustment Knob"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <KnurledKnob radius={0.6} height={0.3} rotation={coarseRot} position={[0.4, 0, 0]} />
                </group>
                {/* Fine (Small) */}
                <group
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Fine Adjustment Knob"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <KnurledKnob radius={0.35} height={0.25} rotation={fineRot} position={[0.7, 0, 0]} />
                </group>
            </group>

            {/* Left Side Knobs */}
            <group position={[-0.4, 2.0, -0.1]}>
                {/* Horizontal Shaft Joint */}
                <Box args={[0.6, 0.2, 0.2]} position={[-0.2, 0, 0]}>
                    <meshStandardMaterial color="#333" />
                </Box>
                {/* Coarse (Large) */}
                <group
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Coarse Adjustment Knob"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <KnurledKnob radius={0.6} height={0.3} rotation={coarseRot} position={[-0.4, 0, 0]} />
                </group>
                {/* Fine (Small) */}
                <group
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Fine Adjustment Knob"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <KnurledKnob radius={0.35} height={0.25} rotation={fineRot} position={[-0.7, 0, 0]} />
                </group>
            </group>
        </group>
    );
};

const ClassicStage = ({ height, x, y, onHover }: { height: number, x: number, y: number, onHover: (n: string | null) => void }) => {
    return (
        <group position={[0, height, OPTICAL_Z]}>
            <Box
                args={[3, 0.15, 3]}
                onPointerOver={(e) => { e.stopPropagation(); onHover("Mechanical Stage"); }}
                onPointerOut={() => onHover(null)}
            >
                <meshStandardMaterial color="#111" />
            </Box>
            {/* Slide Clips */}
            <Box args={[0.1, 0.05, 1.2]} position={[0.8, 0.1, 0.3]} rotation={[0, 0.3, 0]}>
                <meshStandardMaterial color="#ccc" metalness={0.8} />
            </Box>
            <Box args={[0.1, 0.05, 1.2]} position={[-0.8, 0.1, 0.3]} rotation={[0, -0.3, 0]}>
                <meshStandardMaterial color="#ccc" metalness={0.8} />
            </Box>

            {/* Slide */}
            <group
                position={[x * 0.015, 0.1, y * 0.015]}
                onPointerOver={(e) => { e.stopPropagation(); onHover("Specimen Slide"); }}
                onPointerOut={() => onHover(null)}
            >
                <Box args={[2.5, 0.02, 0.8]}>
                    <meshPhysicalMaterial color="white" transmission={0.9} opacity={0.5} transparent />
                </Box>
                <Box args={[0.8, 0.03, 0.5]} position={[0, 0.01, 0]}>
                    <meshBasicMaterial color="#db2777" opacity={0.6} transparent />
                </Box>
            </group>
        </group>
    );
};

const BodyTubeAndTurret = ({ objective, focus, onHover }: { objective: number, focus: number, onHover: (n: string | null) => void }) => {
    const rotation = useMemo(() => {
        switch (objective) {
            case 4: return 0;
            case 10: return Math.PI / 2;
            case 40: return Math.PI;
            case 100: return -Math.PI / 2;
            default: return 0;
        }
    }, [objective]);

    const turretRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (turretRef.current) {
            turretRef.current.rotation.y = THREE.MathUtils.lerp(turretRef.current.rotation.y, rotation, 0.1);
        }
    });

    const ribs = 120;
    const turretTilt = 0.45;
    const objRadius = 0.7;

    // Determine the vertical offset based on focus.
    // As focus increases (clampedTotalFocus), the tube moves DOWN to get closer to the stage.
    // The range of clampedTotalFocus is roughly 0 to 63.
    // We adjust the Y base position (4.8) by subtracting the focus influence.
    const focusOffset = (focus / 100) * 1.5;
    const bodyTubeY = 5.8 - focusOffset;

    return (
        <group position={[0, bodyTubeY, OPTICAL_Z]}>
            {/* Vertical Body Tube (Thinner, more elegant) */}
            <mesh
                position={[0, 1.2, 0]}
                onPointerOver={(e) => { e.stopPropagation(); onHover("Body Tube"); }}
                onPointerOut={() => onHover(null)}
            >
                <cylinderGeometry args={[0.45, 0.45, 3.8]} />
                <meshStandardMaterial color="#0b1222" roughness={0.3} metalness={0.2} />
            </mesh>

            {/* Eyepiece Holder (Chrome) */}
            <mesh
                position={[0, 3.0, 0]}
                onPointerOver={(e) => { e.stopPropagation(); onHover("Eyepiece Tube"); }}
                onPointerOut={() => onHover(null)}
            >
                <cylinderGeometry args={[0.25, 0.3, 0.8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Black Eyepiece Top */}
            <mesh position={[0, 3.45, 0]}>
                <cylinderGeometry args={[0.32, 0.32, 0.15]} />
                <meshStandardMaterial color="#000" />
            </mesh>

            {/* Rotating Nosepiece Assembly */}
            <group position={[0, -0.65, -0.7]} rotation={[turretTilt, 0, 0]}>
                {/* Stationary Housing */}
                <mesh position={[0, 0.22, 0]}>
                    <cylinderGeometry args={[1.0, 1.3, 0.45, 64]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
                </mesh>

                {/* Rotating Turret Disc */}
                <group
                    ref={turretRef}
                    onPointerOver={(e) => { e.stopPropagation(); onHover("Revolving Nosepiece / Turret"); }}
                    onPointerOut={() => onHover(null)}
                >
                    <mesh>
                        <cylinderGeometry args={[1.1, 1.12, 0.2, 64]} />
                        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
                    </mesh>

                    {/* High-density Knurling */}
                    {Array.from({ length: ribs }).map((_, i) => (
                        <mesh
                            key={i}
                            position={[
                                Math.cos((i / ribs) * Math.PI * 2) * 1.12,
                                0,
                                Math.sin((i / ribs) * Math.PI * 2) * 1.12
                            ]}
                        >
                            <boxGeometry args={[0.02, 0.21, 0.02]} />
                            <meshStandardMaterial color="#333" metalness={0.5} />
                        </mesh>
                    ))}

                    {/* Objectives Assembly (Precisely Tilted Cones) */}

                    {/* 4x (Red) */}
                    <group
                        position={[0, -0.3, objRadius]}
                        rotation={[-turretTilt, 0, 0, 'YXZ']}
                        onPointerOver={(e) => { e.stopPropagation(); onHover("4x Scanning Objective"); }}
                        onPointerOut={() => onHover(null)}
                    >
                        <mesh position={[0, 0.25, 0]}>
                            <cylinderGeometry args={[0.22, 0.22, 0.1]} />
                            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                        </mesh>
                        <mesh>
                            <cylinderGeometry args={[0.18, 0.22, 0.5]} />
                            <meshStandardMaterial color="#ddd" metalness={0.9} />
                        </mesh>
                        <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.18, 0.03, 16, 32]} />
                            <meshBasicMaterial color="red" />
                        </mesh>
                        <Text position={[0.22, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.14} color="red" anchorX="center" anchorY="middle">4x</Text>
                    </group>

                    {/* 10x (Yellow) */}
                    <group
                        position={[-objRadius, -0.3, 0]}
                        rotation={[-turretTilt, -Math.PI / 2, 0, 'YXZ']}
                        onPointerOver={(e) => { e.stopPropagation(); onHover("10x Low Power Objective"); }}
                        onPointerOut={() => onHover(null)}
                    >
                        <mesh position={[0, 0.25, 0]}>
                            <cylinderGeometry args={[0.22, 0.22, 0.1]} />
                            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                        </mesh>
                        <mesh>
                            <cylinderGeometry args={[0.18, 0.25, 0.7]} />
                            <meshStandardMaterial color="#ddd" metalness={0.9} />
                        </mesh>
                        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.18, 0.03, 16, 32]} />
                            <meshBasicMaterial color="#fbbf24" />
                        </mesh>
                        <Text position={[0.25, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.14} color="#fbbf24" anchorX="center" anchorY="middle">10x</Text>
                    </group>

                    {/* 40x (Blue) */}
                    <group
                        position={[0, -0.3, -objRadius]}
                        rotation={[-turretTilt, Math.PI, 0, 'YXZ']}
                        onPointerOver={(e) => { e.stopPropagation(); onHover("40x High Power Objective"); }}
                        onPointerOut={() => onHover(null)}
                    >
                        <mesh position={[0, 0.25, 0]}>
                            <cylinderGeometry args={[0.22, 0.22, 0.1]} />
                            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                        </mesh>
                        <mesh>
                            <cylinderGeometry args={[0.18, 0.25, 1.0]} />
                            <meshStandardMaterial color="#ddd" metalness={0.9} />
                        </mesh>
                        <mesh position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.18, 0.03, 16, 32]} />
                            <meshBasicMaterial color="#3b82f6" />
                        </mesh>
                        <Text position={[0.25, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.14} color="#3b82f6" anchorX="center" anchorY="middle">40x</Text>
                    </group>

                    {/* 100x (White) */}
                    <group
                        position={[objRadius, -0.3, 0]}
                        rotation={[-turretTilt, Math.PI / 2, 0, 'YXZ']}
                        onPointerOver={(e) => { e.stopPropagation(); onHover("100x Oil Immersion Objective"); }}
                        onPointerOut={() => onHover(null)}
                    >
                        <mesh position={[0, 0.25, 0]}>
                            <cylinderGeometry args={[0.22, 0.22, 0.1]} />
                            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                        </mesh>
                        <mesh>
                            <cylinderGeometry args={[0.18, 0.25, 1.2]} />
                            <meshStandardMaterial color="#ddd" metalness={0.9} />
                        </mesh>
                        <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.18, 0.03, 16, 32]} />
                            <meshBasicMaterial color="white" />
                        </mesh>
                        <Text position={[0.25, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.14} color="white" anchorX="center" anchorY="middle">100x</Text>
                    </group>
                </group>
            </group>
        </group>
    );
};

// --- EYEPIECE VIEW ---
const EyepieceSimulation = ({ focus, x, y, zoom, light, iris }: any) => {
    type CellType = 'Neutrophil' | 'Lymphocyte' | 'Monocyte' | 'Eosinophil' | 'Basophil';

    // 1. Generate random RBCs (seeded for stability)
    const rbcs = useMemo(() => {
        const newRbcs = [];
        let seed = 12345;
        const seededRandom = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
        for (let i = 0; i < 3000; i++) {
            newRbcs.push({
                id: i,
                x: seededRandom() * 900 + 50,
                y: seededRandom() * 900 + 50
            });
        }
        return newRbcs;
    }, []);

    // 2. Generate random WBCs (seeded for stability)
    const wbcCells = useMemo(() => {
        const newCells = [];
        const distribution: Record<CellType, number> = {
            Neutrophil: 60, Lymphocyte: 30, Monocyte: 5, Eosinophil: 4, Basophil: 1
        };
        const typesPool: CellType[] = [];
        (Object.keys(distribution) as CellType[]).forEach(type => {
            for (let i = 0; i < distribution[type]; i++) typesPool.push(type);
        });

        // Simple seeded shuffle
        let seed = 54321;
        const seededRandom = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };

        for (let i = typesPool.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [typesPool[i], typesPool[j]] = [typesPool[j], typesPool[i]];
        }

        for (let i = 0; i < 33; i++) {
            newCells.push({
                id: i,
                x: seededRandom() * 800 + 100,
                y: seededRandom() * 800 + 100,
                type: typesPool[i]
            });
        }
        return newCells;
    }, []);

    const renderCell = (type: CellType) => {
        const baseSize = 24; // Fixed base size on the 1000px slide
        const monocyteMultiplier = type === 'Monocyte' ? 1.2 : 1;
        const finalSize = baseSize * monocyteMultiplier;

        const cellColors: Record<CellType, { bg: string; nucleus: string; accent?: string }> = {
            Neutrophil: { bg: '#fce7f3', nucleus: '#581c87' },
            Lymphocyte: { bg: '#fce7f3', nucleus: '#4c1d95' },
            Monocyte: { bg: '#fce7f3', nucleus: '#6b21a8' },
            Eosinophil: { bg: '#fdf2f8', nucleus: '#7c3aed', accent: '#ef4444' },
            Basophil: { bg: '#eff6ff', nucleus: '#1e3a8a', accent: '#1e40af' }
        };
        const colors = cellColors[type];

        return (
            <svg width={finalSize} height={finalSize} viewBox="0 0 40 40" style={{ display: 'block' }}>
                <circle cx="20" cy="20" r="18" fill={colors.bg} stroke="#f9a8d4" strokeWidth="1" />
                {type === 'Neutrophil' && (
                    <>
                        <circle cx="12" cy="14" r="6" fill={colors.nucleus} />
                        <circle cx="24" cy="16" r="5" fill={colors.nucleus} />
                        <circle cx="16" cy="26" r="6" fill={colors.nucleus} />
                        <rect x="12" y="16" width="10" height="3" fill={colors.nucleus} transform="rotate(30 16 18)" />
                    </>
                )}
                {type === 'Lymphocyte' && <circle cx="20" cy="20" r="15" fill={colors.nucleus} />}
                {type === 'Monocyte' && <ellipse cx="20" cy="20" rx="12" ry="10" fill={colors.nucleus} transform="rotate(-20 20 20)" />}
                {type === 'Eosinophil' && (
                    <>
                        <circle cx="12" cy="20" r="6" fill={colors.nucleus} opacity="0.7" />
                        <circle cx="28" cy="20" r="6" fill={colors.nucleus} opacity="0.7" />
                        <rect x="14" y="18" width="12" height="4" fill={colors.nucleus} opacity="0.7" />
                        <circle cx="10" cy="10" r="2" fill={colors.accent} />
                        <circle cx="30" cy="10" r="2" fill={colors.accent} />
                        <circle cx="10" cy="30" r="2" fill={colors.accent} />
                        <circle cx="30" cy="30" r="2" fill={colors.accent} />
                        <circle cx="20" cy="8" r="1.6" fill={colors.accent} />
                        <circle cx="20" cy="32" r="1.6" fill={colors.accent} />
                    </>
                )}
                {type === 'Basophil' && (
                    <>
                        <circle cx="20" cy="20" r="10" fill={colors.nucleus} opacity="0.4" />
                        <circle cx="8" cy="12" r="3" fill={colors.accent} />
                        <circle cx="16" cy="8" r="3" fill={colors.accent} />
                        <circle cx="26" cy="10" r="3" fill={colors.accent} />
                        <circle cx="32" cy="18" r="3" fill={colors.accent} />
                        <circle cx="30" cy="28" r="3" fill={colors.accent} />
                        <circle cx="20" cy="32" r="3" fill={colors.accent} />
                        <circle cx="10" cy="28" r="3" fill={colors.accent} />
                        <circle cx="8" cy="20" r="3" fill={colors.accent} />
                        <circle cx="20" cy="20" r="2.4" fill={colors.accent} />
                    </>
                )}
            </svg>
        );
    };

    // Zoom scales matching MicroscopeStage
    const getScale = (z: number) => {
        switch (z) {
            case 4: return 0.13;
            case 10: return 0.27;
            case 40: return 0.67;
            case 100: return 1.67;
            default: return 1;
        }
    };
    const zoomScale = getScale(zoom);

    // Focus mechanics
    const focusTargets: Record<number, number> = { 4: 55, 10: 48, 40: 38, 100: 32 };
    const focusPlane = focusTargets[zoom] || 50;
    const focusDiff = Math.abs(focus - focusPlane);
    const blur = Math.max(0, focusDiff * 0.15 * (zoom / 10));

    // Iris affects contrast and brightness
    const irisEffect = iris || 0.8;
    const brightness = Math.min(2, (light / 100) * (1.2 + irisEffect * 0.5));
    const contrast = 1.0 + (1 - irisEffect) * 0.3;

    return (
        <div className="w-full h-full relative bg-[#ffeef2] overflow-hidden rounded-full shadow-2xl border-4 border-slate-900 flex items-center justify-center">
            {/* The Slide */}
            <div
                className="absolute w-[1000px] h-[1000px] flex-none pointer-events-none"
                style={{
                    transform: `scale(${zoomScale}) translate(${-x * 10}px, ${-y * 10}px)`,
                    filter: `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`,
                    transition: 'transform 0.1s ease-out'
                }}
            >
                {/* RBC Background */}
                {rbcs.map(rbc => (
                    <div
                        key={`rbc-${rbc.id}`}
                        className="absolute rounded-full bg-red-500/20"
                        style={{
                            left: rbc.x,
                            top: rbc.y,
                            width: 12,
                            height: 12,
                        }}
                    />
                ))}

                {/* WBCs */}
                {wbcCells.map(c => (
                    <div key={`wbc-${c.id}`} className="absolute" style={{ left: c.x, top: c.y, transform: 'translate(-50%, -50%)' }}>
                        {renderCell(c.type)}
                    </div>
                ))}
            </div>

            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.7)]" />

            {/* Focus indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/50 bg-black/40 px-4 py-1.5 rounded-full whitespace-nowrap backdrop-blur-sm border border-white/10">
                {blur < 0.5 ? '✓ IN FOCUS' : blur < 2 ? 'FOCUSING...' : 'OUT OF FOCUS'}
            </div>
        </div>
    );
};

// --- MAIN ---
export const Microscope3D: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [state, setState] = useState<MicroscopeState>({
        coarseFocus: 50, fineFocus: 50, stageX: 0, stageY: 0, objective: 4, lightIntensity: 70,
        condenserHeight: 50, irisOpening: 0.8, mirrorSide: 'plane'
    });
    const [viewMode, setViewMode] = useState<'3d' | 'eyepiece'>('3d');
    const [hoveredPart, setHoveredPart] = useState<string | null>(null);

    const totalFocus = state.coarseFocus + (state.fineFocus - 50) * 0.1;

    // Rigid body constraint: Clamp focus by current objective

    const maxFocus = COLLISION_LIMITS[state.objective];
    const clampedTotalFocus = Math.min(totalFocus, maxFocus);

    // Reverse-calculate coarse/fine states for clamping UI interaction
    const updateFocus = (coarse: number, fine: number) => {
        const potentialFocus = coarse + (fine - 50) * 0.1;
        const limit = COLLISION_LIMITS[state.objective];
        if (potentialFocus > limit) {
            // If we hit the limit, stay at the limit
            setState(s => ({ ...s, coarseFocus: limit - (s.fineFocus - 50) * 0.1 }));
        } else {
            setState(s => ({ ...s, coarseFocus: coarse, fineFocus: fine }));
        }
    };

    const handleObjectiveChange = (newMag: 4 | 10 | 40 | 100) => {
        const targetLimit = COLLISION_LIMITS[newMag];
        if (totalFocus > targetLimit) {
            // Mechanical Interlock: Lower stage automatically to prevent crash
            setState(s => ({
                ...s,
                objective: newMag,
                coarseFocus: targetLimit - (s.fineFocus - 50) * 0.1
            }));
        } else {
            setState(s => ({ ...s, objective: newMag }));
        }
    };

    // --- ANIMATION LOGIC FOR MIRROR ---
    const [targetIntensity, setTargetIntensity] = useState<number | null>(null);
    React.useEffect(() => {
        if (targetIntensity === null) return;

        let frameId: number;
        const animate = () => {
            setState(s => {
                const diff = targetIntensity - s.lightIntensity;
                if (Math.abs(diff) < 1) {
                    setTargetIntensity(null);
                    return { ...s, lightIntensity: targetIntensity };
                }
                return { ...s, lightIntensity: s.lightIntensity + diff * 0.1 };
            });
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [targetIntensity]);

    const stageHeight = 2.8; // Lowered stage height
    const condenserY = 1.5 + (state.condenserHeight / 100) * 0.8;

    return (
        <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans">

            {/* RESPONSIVE HEADER BAR */}
            <header className="z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700">
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div>
                        <h1 className="text-base sm:text-xl font-bold tracking-tight leading-tight">Classic Student Microscope</h1>
                    </div>
                </div>

                {/* VIEW TOGGLE */}
                <div className="flex bg-slate-950 rounded-full shadow-inner p-1 border border-slate-800 w-full sm:w-auto">
                    <button onClick={() => setViewMode('3d')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all ${viewMode === '3d' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>3D VIEW</button>
                    <button onClick={() => setViewMode('eyepiece')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all ${viewMode === 'eyepiece' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>EYEPIECE</button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* 3D VIEW / EYEPIECE STACK */}
                <div className="flex-1 relative bg-[#020617] order-1 min-h-[50vh]">
                    <div className={`absolute inset-0 transition-opacity duration-500 ${viewMode === '3d' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <Canvas shadows camera={{ position: [7, 5, 7], fov: 35 }}>
                            <Environment preset="studio" />
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

                            <group position={[0, -3, 0]}>
                                <HorseshoeBase onHover={setHoveredPart} />
                                <MirrorSystem intensity={state.lightIntensity} onHover={setHoveredPart} />
                                <CurvedArm coarsePos={state.coarseFocus} finePos={state.fineFocus} onHover={setHoveredPart} />
                                <ClassicStage height={stageHeight} x={state.stageX} y={state.stageY} onHover={setHoveredPart} />
                                <CondenserSystem height={state.condenserHeight} iris={state.irisOpening} intensity={state.lightIntensity} onHover={setHoveredPart} />
                                <LightRays intensity={state.lightIntensity} mirrorTilt={state.lightIntensity} condenserY={condenserY} iris={state.irisOpening} side={state.mirrorSide} />
                                <BodyTubeAndTurret objective={state.objective} focus={clampedTotalFocus} onHover={setHoveredPart} />
                            </group>
                            <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} target={[0, 2, 0]} />
                        </Canvas>
                    </div>

                    {/* Eyepiece View */}
                    <div className={`absolute inset-0 bg-black flex items-center justify-center z-20 transition-opacity duration-500 ${viewMode === 'eyepiece' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div className="w-[85vw] h-[85vw] max-w-[500px] max-h-[500px]">
                            <EyepieceSimulation focus={totalFocus} x={state.stageX} y={state.stageY} zoom={state.objective} light={state.lightIntensity} iris={state.irisOpening} />
                        </div>
                    </div>

                    {/* Hover Labels HUD */}
                    {hoveredPart && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in duration-200">
                            <div className="px-5 py-2.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-blue-50 font-bold tracking-wider text-[11px] uppercase">{hoveredPart}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTROLS SIDEBAR */}
                <aside className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col z-10 shadow-2xl order-2 flex-1 md:flex-none overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900/50">
                        <Move className="w-4 h-4 text-blue-500" />
                        <h2 className="font-bold text-sm tracking-wide uppercase text-slate-100">Lab Controls</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                        {/* Objective */}
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-4 block flex items-center gap-1 tracking-widest"><Eye className="w-3 h-3" /> Objective Lens</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[4, 10, 40, 100].map(mag => (
                                    <button key={mag} onClick={() => handleObjectiveChange(mag as any)}
                                        className={`py-3 rounded-lg border font-bold text-sm transition-all ${state.objective === mag ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 font-normal'}`}
                                    >{mag}x</button>
                                ))}
                            </div>
                        </div>

                        {/* Focus */}
                        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-5 block flex items-center gap-1 tracking-widest"><Ruler className="w-3 h-3" /> Focus Mechanics</label>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-3 font-semibold uppercase tracking-tighter">Coarse Adjustment</div>
                                    <input type="range" min="0" max="100" value={state.coarseFocus} onChange={e => updateFocus(+e.target.value, state.fineFocus)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-3 font-semibold uppercase tracking-tighter">Fine Adjustment</div>
                                    <input type="range" min="0" max="100" value={state.fineFocus} onChange={e => updateFocus(state.coarseFocus, +e.target.value)} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                                </div>
                            </div>
                        </div>

                        {/* Stage */}
                        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-5 block flex items-center gap-1 tracking-widest"><Move className="w-3 h-3" /> Specimen Position</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-500 block mb-2 font-bold opacity-80">LATERAL (X)</span>
                                    <input type="range" min="-50" max="50" value={state.stageX} onChange={e => setState(s => ({ ...s, stageX: +e.target.value }))} className="w-full accent-green-600" />
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-500 block mb-2 font-bold opacity-80">LONGITUDINAL (Y)</span>
                                    <input type="range" min="-50" max="50" value={state.stageY} onChange={e => setState(s => ({ ...s, stageY: +e.target.value }))} className="w-full accent-green-600" />
                                </div>
                            </div>
                        </div>

                        {/* Mirror */}
                        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-4 block flex items-center gap-1 tracking-widest"><Sun className="w-3 h-3" /> Illumination Mirror</label>

                            <div className="flex bg-slate-900 rounded-lg p-1 mb-4 border border-slate-700">
                                <button
                                    onClick={() => { setState(s => ({ ...s, mirrorSide: 'plane' })); setTargetIntensity(131); }}
                                    className={`flex-1 py-3 rounded-md text-[10px] font-bold transition-all ${state.mirrorSide === 'plane' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >PLANE</button>
                                <button
                                    onClick={() => { setState(s => ({ ...s, mirrorSide: 'concave' })); setTargetIntensity(56); }}
                                    className={`flex-1 py-3 rounded-md text-[10px] font-bold transition-all ${state.mirrorSide === 'concave' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >CONCAVE</button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Mirror Tilt</div>
                                <input type="range" min="0" max="150" value={state.lightIntensity} onChange={e => setState(s => ({ ...s, lightIntensity: +e.target.value }))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                            </div>
                        </div>

                        {/* Condenser & Iris */}
                        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-5 block flex items-center gap-1 tracking-widest"><Eye className="w-3 h-3" /> Condenser & Iris</label>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-semibold">Condenser Height</div>
                                    <input type="range" min="0" max="100" value={state.condenserHeight} onChange={e => setState(s => ({ ...s, condenserHeight: +e.target.value }))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-semibold">Iris Diaphragm Opening</div>
                                    <input type="range" min="0.1" max="1.0" step="0.05" value={state.irisOpening} onChange={e => setState(s => ({ ...s, irisOpening: +e.target.value }))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};
