import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT_BOLD } from './labelFonts';

// RBC and WBC diluting pipettes, built from one profile and modelled on the photographs in GK Pal (Figs 6.1, 6.2):
// clear glass with a milk-white stripe along the back of the stem, thin navy graduations and numbers printed across
// the stem, a slim spindle-shaped bulb, and a translucent rubber tube ending in a coloured mouthpiece.
// The pipette lies along X with its tip on the left; u is the distance from the tip.

type Kind = 'rbc' | 'wbc';

const SPEC: Record<Kind, { bulbLen: number; bulbR: number; bore: number; bead: [number, number]; beadColor: string; topMark: string; mouth: string }> = {
    // Bulb of 100 parts, finer bore (slow-speed), dark red bead, red mouthpiece
    rbc: { bulbLen: 2.2, bulbR: 0.4, bore: 0.03, bead: [0.2, 0.1], beadColor: '#8b1a1a', topMark: '101', mouth: '#e11d27' },
    // Bulb of 10 parts, wider bore (fast-speed), white bead, white mouthpiece
    wbc: { bulbLen: 1.8, bulbR: 0.33, bore: 0.06, bead: [0.15, 0.095], beadColor: '#f8fafc', topMark: '11', mouth: '#f4f4f5' },
};

const STEM_R = 0.2;
const TIP_LEN = 0.5;
const STEM_END = 6.0;   // mark 1, where the stem widens into the bulb
const NECK_LEN = 1.7;   // short stem above the bulb; the rubber tube is pushed over its last part
const SLEEVE = 0.7;     // length of neck covered by the tube
const TUBE_R = 0.25;
const INK = '#1e3a8a';  // navy print of the graduations
const HIGHLIGHT = '#3b82f6';

type Pts = [number, number][];

// A lathe (turned) shape along X from [radius, u] points
const Turned = ({ points, x0, children, userData }: { points: Pts; x0: number; children: React.ReactNode; userData?: Record<string, unknown> }) => {
    const geometry = useMemo(() => new THREE.LatheGeometry(points.map(([r, u]) => new THREE.Vector2(r, u)), 48), [points]);
    return (
        <mesh geometry={geometry} position={[x0, 0, 0]} rotation={[0, 0, -Math.PI / 2]} userData={userData}>
            {children}
        </mesh>
    );
};

// Parts are tagged with userData.part (on the mesh or a parent group). The part under the pointer is the nearest
// solid one; glass counts only when nothing solid is behind it, so the bead can be picked through the bulb.
const partOf = (obj: THREE.Object3D | null): { part: string; glass?: boolean } | null => {
    for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData as { part: string; glass?: boolean };
    return null;
};
const pick = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const tagged = e.intersections.map(i => partOf(i.object)).filter((p): p is { part: string; glass?: boolean } => !!p);
    return (tagged.find(p => !p.glass) ?? tagged[0])?.part ?? null;
};

const Glass = ({ lit }: { lit: boolean }) => (
    <meshPhysicalMaterial
        color={lit ? HIGHLIGHT : '#ffffff'} transparent opacity={lit ? 0.6 : 0.22} roughness={0.03} metalness={0} clearcoat={1} envMapIntensity={1.6}
        side={THREE.DoubleSide} depthWrite={false}
        emissive={lit ? HIGHLIGHT : '#000000'} emissiveIntensity={lit ? 0.7 : 0}
    />
);

// Numbers printed across the stem, reading from top to bottom as in the photographs
const Print = ({ at, children, lit }: { at: number; children: string; lit: boolean }) => (
    <Text font={LABEL_FONT_BOLD} position={[at, 0, STEM_R + 0.012]} rotation={[0, 0, -Math.PI / 2]}
        fontSize={0.22} color={lit ? HIGHLIGHT : INK} anchorX="center" anchorY="middle">
        {children}
    </Text>
);

export const DilutingPipette: React.FC<{
    kind: Kind;
    active: string | null;   // part shown highlighted (hovered or selected)
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
}> = ({ kind, active, onHover, onSelect }) => {
    const s = SPEC[kind];
    const bulbEnd = STEM_END + s.bulbLen;
    const topMarkU = bulbEnd + 0.3;
    const topEnd = bulbEnd + NECK_LEN;
    const x0 = -topEnd / 2 - 0.6; // centre the pipette, leaving room for the tube loop on the right
    const x = (u: number) => x0 + u;
    const lit = (id: string) => active === id;

    const profiles = useMemo(() => {
        // Spindle-shaped bulb: long gentle shoulders, widest in the middle
        const bulb: Pts = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            bulb.push([STEM_R + (s.bulbR - STEM_R) * Math.pow(Math.sin(Math.PI * t), 1.6), STEM_END + s.bulbLen * t]);
        }
        return {
            tip: [[0.05, 0], [0.12, TIP_LEN * 0.6], [STEM_R, TIP_LEN]] as Pts,
            stem: [[STEM_R, TIP_LEN], [STEM_R, STEM_END]] as Pts,
            bulb,
            neck: [[STEM_R, bulbEnd], [STEM_R, topEnd]] as Pts,
            // Rubber pushed over the end of the neck, flaring slightly where it grips the glass
            sleeve: [[TUBE_R + 0.03, topEnd - SLEEVE], [TUBE_R, topEnd - SLEEVE + 0.12], [TUBE_R, topEnd + 0.05]] as Pts,
        };
    }, [s.bulbLen, s.bulbR, bulbEnd, topEnd]);

    // The rubber tube loops round and back under the pipette to the mouthpiece
    const tube = useMemo(() => {
        const e = x(topEnd);
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(e, 0, 0), new THREE.Vector3(e + 0.9, 0, -0.05), new THREE.Vector3(e + 1.7, -0.5, -0.1),
            new THREE.Vector3(e + 1.75, -1.5, 0), new THREE.Vector3(e + 0.8, -2.1, 0.15), new THREE.Vector3(e - 1.6, -2.25, 0.15),
            new THREE.Vector3(e - 4.2, -2.05, 0),
        ]);
        const end = curve.getPoint(1);
        const dir = curve.getTangent(1);
        return { geometry: new THREE.TubeGeometry(curve, 120, TUBE_R * 0.76, 16, false), end, angle: Math.atan2(dir.y, dir.x) };
    }, [topEnd, x0]);

    const ticks = Array.from({ length: 10 }, (_, i) => (i + 1) * (STEM_END / 10));
    const stripe = (from: number, to: number) => (
        <mesh position={[x((from + to) / 2), 0, -0.07]}>
            <boxGeometry args={[to - from, 0.3, 0.05]} />
            <meshStandardMaterial color="#ffffff" roughness={0.55} />
        </mesh>
    );

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* Glass */}
            <Turned points={profiles.tip} x0={x0} userData={{ part: 'tip', glass: true }}><Glass lit={lit('tip')} /></Turned>
            <Turned points={profiles.stem} x0={x0} userData={{ part: 'stem', glass: true }}><Glass lit={lit('stem')} /></Turned>
            <Turned points={profiles.bulb} x0={x0} userData={{ part: 'bulb', glass: true }}><Glass lit={lit('bulb')} /></Turned>
            <Turned points={profiles.neck} x0={x0} userData={{ part: 'top-mark', glass: true }}><Glass lit={lit('top-mark')} /></Turned>

            {/* Milk-white stripe along the back of the stem and the neck, behind the graduations */}
            {stripe(TIP_LEN * 0.8, STEM_END)}
            {stripe(bulbEnd, topEnd - SLEEVE)}

            {/* Capillary bore: fine in the RBC pipette, wider in the WBC pipette */}
            <mesh position={[x(STEM_END / 2 + 0.1), 0, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ part: 'stem' }}>
                <cylinderGeometry args={[s.bore, s.bore, STEM_END - 0.2, 12]} />
                <meshStandardMaterial color={lit('stem') ? HIGHLIGHT : '#9aa9b8'} />
            </mesh>

            {/* Graduations: 10 equal parts, printed as thin lines across the front, numbered at 0.5 and 1 */}
            <group userData={{ part: 'marks' }}>
                {ticks.map(u => (
                    <group key={u} position={[x(u), 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <mesh rotation={[0, 0, Math.PI / 2]}>
                            <torusGeometry args={[STEM_R + 0.004, 0.009, 4, 24, Math.PI]} />
                            <meshBasicMaterial color={lit('marks') ? HIGHLIGHT : INK} />
                        </mesh>
                    </group>
                ))}
                <Print at={x(STEM_END / 2 - 0.22)} lit={lit('marks')}>0.5</Print>
                <Print at={x(STEM_END - 0.2)} lit={lit('marks')}>1</Print>
            </group>

            {/* Top mark just above the bulb */}
            <group userData={{ part: 'top-mark' }}>
                <group position={[x(topMarkU), 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <torusGeometry args={[STEM_R + 0.004, 0.009, 4, 24, Math.PI]} />
                        <meshBasicMaterial color={lit('top-mark') ? HIGHLIGHT : INK} />
                    </mesh>
                </group>
                <Print at={x(topMarkU + 0.26)} lit={lit('top-mark')}>{s.topMark}</Print>
            </group>

            {/* Elongated bead lying at the bottom of the bulb */}
            <mesh position={[x(STEM_END + s.bulbLen * 0.5), -(s.bulbR - s.bead[1] - 0.06), 0]} scale={[s.bead[0], s.bead[1], s.bead[1]]} userData={{ part: 'bead' }}>
                <sphereGeometry args={[1, 32, 24]} />
                <meshStandardMaterial color={s.beadColor} roughness={0.3}
                    emissive={lit('bead') ? HIGHLIGHT : '#000000'} emissiveIntensity={lit('bead') ? 0.6 : 0} />
            </mesh>

            {/* Translucent rubber tube */}
            <group userData={{ part: 'tube' }}>
                <Turned points={profiles.sleeve} x0={x0}><Rubber lit={lit('tube')} /></Turned>
                <mesh geometry={tube.geometry}><Rubber lit={lit('tube')} /></mesh>
            </group>

            {/* Mouthpiece: collar into the tube, then a short tapered body */}
            <group position={[tube.end.x, tube.end.y, tube.end.z]} rotation={[0, 0, tube.angle - Math.PI / 2]} userData={{ part: 'mouthpiece' }}>
                <mesh position={[0, 0.08, 0]}>
                    <cylinderGeometry args={[TUBE_R * 1.15, TUBE_R * 1.15, 0.16, 24]} />
                    <meshStandardMaterial color={lit('mouthpiece') ? HIGHLIGHT : s.mouth} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0.42, 0]}>
                    <cylinderGeometry args={[TUBE_R * 0.95, TUBE_R * 0.8, 0.55, 24]} />
                    <meshStandardMaterial color={lit('mouthpiece') ? HIGHLIGHT : s.mouth} roughness={0.35} />
                </mesh>
            </group>
        </group>
    );
};

const Rubber = ({ lit }: { lit: boolean }) => (
    <meshPhysicalMaterial color={lit ? HIGHLIGHT : '#e3d6b4'} roughness={0.4} transparent opacity={0.82} clearcoat={0.4} />
);
