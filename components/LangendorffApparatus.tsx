import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text, Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT, LABEL_FONT_BOLD } from './labelFonts';

// The practical (LangendorffPerfusion) drives the model through `live`; without it the model stands still, as in
// the Instruments viewer. What moves every frame (the apex of the heart and the lever) is read from a ref inside
// useFrame, so the model itself is not re-rendered while the heart beats.
export interface LangendorffMotion {
    lift: number;     // cm the apex of the heart has risen
    tilt: number;     // angle of the lever (rad, down)
    fill: number;     // 0..1, how full the reservoirs and pressure-head tubes are
    thread: number;   // 0..1, how much of the thread from the apex to the lever has been laid
    hg: number;       // perfusion pressure shown by the manometer, mmHg (follows the pressure smoothly)
    perfuse: number;  // 0..1, how far the Ringer-Locke has run down the side tube into the cannula
}
export interface LangendorffLive {
    oxygen: boolean;          // oxygen bubbling through the columns
    heaterOn: boolean;        // heater and stirrer switched on
    pv: string; sv: string;   // controller display
    heart: boolean;           // a heart hangs on the cannula: the clip grips its apex
    motion: React.MutableRefObject<LangendorffMotion>;
}

// Langendorff apparatus for the isolated mammalian heart, modelled on photographs of the department's own set
// (a "two unit bath" with digital temperature control). Units are centimetres; the top of the base plate is y = 0,
// x runs left to right and +z is the front. From the top down: two reservoir bottles, each feeding a tall glass
// pressure-head tube; a Y-piece joining them; the thermostatic bath with its warming coil, heater, stirrer pump and
// probe; and under the bath the heart cannula with its thermometer and side arm to the mercury manometer. The
// heart's pull is carried by a thread round two pulleys to the heart lever on the right.

const HIGHLIGHT = '#3b82f6';
type V3 = [number, number, number];

// Materials. A highlighted part turns blue and glows a little.
const glow = (lit: boolean) => (lit ? { emissive: HIGHLIGHT, emissiveIntensity: 0.55 } : {});
const Steel = ({ lit }: { lit: boolean }) => <meshStandardMaterial color={lit ? HIGHLIGHT : '#c9ced3'} metalness={0.9} roughness={0.28} {...glow(lit)} />;
const Brass = ({ lit }: { lit: boolean }) => <meshStandardMaterial color={lit ? HIGHLIGHT : '#b8923a'} metalness={0.85} roughness={0.35} {...glow(lit)} />;
const Paint = ({ lit, color = '#f4f5f6' }: { lit: boolean; color?: string }) => <meshStandardMaterial color={lit ? HIGHLIGHT : color} roughness={0.55} {...glow(lit)} />;
const Rubber = ({ lit }: { lit: boolean }) => <meshStandardMaterial color={lit ? HIGHLIGHT : '#a8405f'} roughness={0.8} {...glow(lit)} />;
const Black = ({ lit }: { lit: boolean }) => <meshStandardMaterial color={lit ? HIGHLIGHT : '#1c1d20'} roughness={0.6} {...glow(lit)} />;
const Glass = ({ lit, opacity = 0.3 }: { lit: boolean; opacity?: number }) => (
    <meshPhysicalMaterial color={lit ? HIGHLIGHT : '#eef6fa'} transparent opacity={lit ? 0.6 : opacity} roughness={0.05} clearcoat={1}
        envMapIntensity={1.5} depthWrite={false} side={THREE.DoubleSide} {...glow(lit)} />
);

// A straight round bar from a to b
const Bar = ({ a, b, r, children, seg = 14 }: { a: V3; b: V3; r: number; children: React.ReactNode; seg?: number }) => {
    const { pos, quat, len } = useMemo(() => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
        return {
            pos: va.clone().add(vb).multiplyScalar(0.5),
            quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()),
            len: d.length(),
        };
    }, [a, b]);
    return <mesh position={pos} quaternion={quat}><cylinderGeometry args={[r, r, len, seg, 1]} />{children}</mesh>;
};
// A bent tube or wire through the given points
const Pipe = ({ pts, r, children, seg = 48 }: { pts: V3[]; r: number; children: React.ReactNode; seg?: number }) => {
    const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5), seg, r, 10, false), [pts, r, seg]);
    return <mesh geometry={geo}>{children}</mesh>;
};
const Box = ({ at, size, children, rot }: { at: V3; size: V3; children: React.ReactNode; rot?: V3 }) => (
    <mesh position={at} rotation={rot}><boxGeometry args={size} />{children}</mesh>
);
const Label = ({ at, size, children, color = '#111827', bold, rot }: { at: V3; size: number; children: string; color?: string; bold?: boolean; rot?: V3 }) => (
    <Text font={bold ? LABEL_FONT_BOLD : LABEL_FONT} position={at} rotation={rot} fontSize={size} color={color} anchorX="center" anchorY="middle">{children}</Text>
);

// Parts are tagged with userData.part; the nearest solid part wins over glass, so what is inside the bath can be
// picked through its walls
const partOf = (obj: THREE.Object3D | null): { part: string; glass?: boolean } | null => {
    for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData as { part: string; glass?: boolean };
    return null;
};
const pick = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const tagged = e.intersections.map(i => partOf(i.object)).filter((p): p is { part: string; glass?: boolean } => !!p);
    return (tagged.find(p => !p.glass) ?? tagged[0])?.part ?? null;
};

// Layout
const TANK = { x: 11, z: 9, y0: 38, y1: 60 };        // half-widths and floor / rim heights of the bath
const BOTTLE_X = 11, UPPER_Z = -4, TRAP_X = 1.8;     // reservoirs and the tall tubes between them
const TUBE_X = 5, TUBE_Z = 1;                        // the two inner glass tubes of the bath
const CAN: V3 = [-1, 23.5, 7];                       // centre of the bulb of the heart cannula
const FRONT_Z = 7;                                   // plane of the thread, pulleys and lever
// In the photographs the left pulley sits near the end of the left lower bar, just left of the cannula, and the right
// one at the far end of the right lower bar, beyond the upright welded on it that carries the lever
const LEFT_PULLEY_X = -5.6, RIGHT_PULLEY_X = 25.8;
const CLIP_BOTTOM: V3 = [CAN[0] + 0.45, 16.9, FRONT_Z];
// Where the nozzle of the cannula ends, and where the apex of a heart tied on it hangs at rest
export const CANNULA_AT = CAN;
export const NOZZLE_TIP_Y = 20.1;
export const APEX_REST_Y = 16.8;
export const PLANE_Z = FRONT_Z;
// The heart lever turns about its fulcrum; the thread from the pulley is tied 4 cm along it, the writing point
// is 15.6 cm along, so the record magnifies the movement of the apex about 3.9 times
const LEVER_PIVOT: V3 = [22.8, 20.95, FRONT_Z];
const LEVER_TIE: [number, number] = [4.0, -0.35];   // tie point of the thread, from the fulcrum
const rotAbout = (p: [number, number], tilt: number): [number, number] => {
    const c = Math.cos(-tilt), s = Math.sin(-tilt);
    return [LEVER_PIVOT[0] + p[0] * c - p[1] * s, LEVER_PIVOT[1] + p[0] * s + p[1] * c];
};
// The writing point of the lever (its tip, 16.2 cm along and 0.7 cm above the fulcrum), for a drum set against it
export const LEVER_TIP_X = 39.0;
export const leverTipY = (tilt: number) => rotAbout([16.2, 0.7], tilt)[1];
// Mercury manometer: level of both limbs at zero pressure. The scale beside the open limb reads mmHg directly:
// as the open limb rises the other falls as much, so each centimetre of rise is 20 mmHg.
const HG_ZERO = 21;
const RINGER = '#bfe3f5';

// A straight piece of thread whose ends are worked out every frame; drawn (0..1) lays it out from its first end
const LiveThread = ({ ends, color, drawn }: { ends: () => [V3, V3]; color: string; drawn?: () => number }) => {
    const ref = useRef<THREE.Mesh>(null);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    useFrame(() => {
        const m = ref.current;
        if (!m) return;
        const [a, b] = ends();
        const f = drawn ? Math.max(0, Math.min(1, drawn())) : 1;
        m.visible = f > 0.01;
        const va = new THREE.Vector3(...a), vb = va.clone().lerp(new THREE.Vector3(...b), f), d = vb.clone().sub(va);
        m.position.copy(va.add(vb).multiplyScalar(0.5));
        m.quaternion.setFromUnitVectors(up, d.clone().normalize());
        m.scale.set(1, d.length(), 1);
    });
    return <mesh ref={ref}><cylinderGeometry args={[0.035, 0.035, 1, 5, 1]} /><meshBasicMaterial color={color} /></mesh>;
};

// Mercury of the manometer: the bend at the bottom of the U, and a column in each limb. The open (left) limb rises
// and the limb joined to the cannula falls by the same amount; a red pointer on the scale follows the open limb.
const HG_BEND: V3[] = [[-23, 15.5, 7.4], [-22.6, 14.4, 7.4], [-21.2, 14, 7.4], [-19.8, 14.4, 7.4], [-19.4, 15.5, 7.4]];
const Mercury = () => <meshStandardMaterial color="#9aa1a8" metalness={1} roughness={0.15} />;
const MercuryColumns = ({ motion }: { motion?: React.MutableRefObject<LangendorffMotion> }) => {
    const left = useRef<THREE.Mesh>(null), right = useRef<THREE.Mesh>(null), pointer = useRef<THREE.Group>(null);
    useFrame(() => {
        const rise = (motion?.current.hg ?? 0) / 20;
        const yL = HG_ZERO + rise, yR = Math.max(15.55, HG_ZERO - rise);
        if (left.current) { left.current.scale.y = yL - 15.5; left.current.position.y = (yL + 15.5) / 2; }
        if (right.current) { right.current.scale.y = yR - 15.5; right.current.position.y = (yR + 15.5) / 2; }
        if (pointer.current) { pointer.current.position.y = yL; pointer.current.visible = !!motion && rise > 0.05; }
    });
    return (
        <>
            <mesh ref={left} position={[-23, 18, 7.4]}><cylinderGeometry args={[0.2, 0.2, 1, 12]} /><Mercury /></mesh>
            <mesh ref={right} position={[-19.4, 18, 7.4]}><cylinderGeometry args={[0.2, 0.2, 1, 12]} /><Mercury /></mesh>
            <group ref={pointer} position={[-22.6, HG_ZERO, 7.05]} visible={false}>
                <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.22, 0.5, 3]} /><meshBasicMaterial color="#dc2626" /></mesh>
            </group>
        </>
    );
};

// Ringer-Locke running from the bath down the side tube into the cannula as the screw clip is opened: the tube
// turns blue as the fluid advances (drops run along it while it fills), then the bulb and the nozzle fill
const SIDE_TUBE: V3[] = [[0, 37.8, 3], [0, 33, 3.6], [-0.7, 29, 6.2], [-1, 27, 7]];
const LiveFlow = ({ motion }: { motion: React.MutableRefObject<LangendorffMotion> }) => {
    const curve = useMemo(() => new THREE.CatmullRomCurve3(SIDE_TUBE.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5), []);
    const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.53, 10, false), [curve]);
    const sleeve = useRef<THREE.Mesh>(null), bulb = useRef<THREE.Mesh>(null), nozzle = useRef<THREE.Mesh>(null), drops = useRef<THREE.Group>(null);
    useFrame(() => {
        const now = performance.now() / 1000;
        const f = motion.current.perfuse;
        const tube = Math.max(0, Math.min(1, f / 0.7)), fill = Math.max(0, Math.min(1, (f - 0.7) / 0.3));
        const n = geo.index ? geo.index.count : 0;
        geo.setDrawRange(0, Math.floor((n * tube) / 6) * 6);
        if (sleeve.current) sleeve.current.visible = tube > 0.01;
        if (bulb.current) { bulb.current.visible = fill > 0.01; bulb.current.scale.set(fill, 1.15 * fill, fill); }
        if (nozzle.current) nozzle.current.visible = fill > 0.95;
        if (drops.current) {
            drops.current.visible = f > 0.01 && f < 0.99;
            drops.current.children.forEach((c, i) => {
                const t = ((now * 0.9 + i / 4) % 1) * Math.max(tube, 0.02);
                if (Number.isFinite(t)) c.position.copy(curve.getPointAt(Math.max(0, Math.min(1, t))));
            });
        }
    });
    return (
        <group>
            <mesh ref={sleeve} geometry={geo} visible={false}><meshStandardMaterial color="#7dd3fc" transparent opacity={0.8} roughness={0.25} /></mesh>
            <group ref={drops} visible={false}>
                {[0, 1, 2, 3].map(i => <mesh key={i}><sphereGeometry args={[0.6, 12, 10]} /><meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.6} transparent opacity={0.9} /></mesh>)}
            </group>
            <mesh ref={bulb} position={CAN} visible={false}><sphereGeometry args={[1.2, 22, 16]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} depthWrite={false} /></mesh>
            <mesh ref={nozzle} position={[CAN[0], 21.25, CAN[2]]} visible={false}><cylinderGeometry args={[0.4, 0.12, 2.0, 12]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} depthWrite={false} /></mesh>
        </group>
    );
};

// Fluid that rises as the reservoirs are filled: scaled upward from its own base
const LiveFluid = ({ motion, at, children }: { motion: React.MutableRefObject<LangendorffMotion>; at: V3; children: React.ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        const g = ref.current;
        if (!g) return;
        const f = motion.current.fill;
        g.visible = f > 0.01;
        g.scale.set(1, Math.max(0.01, f), 1);
    });
    return <group ref={ref} position={at}>{children}</group>;
};

// Oxygen bubbles rising up a pressure-head tube from the end of its fine glass tube
const Bubbles = ({ x }: { x: number }) => {
    const group = useRef<THREE.Group>(null);
    const seeds = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ off: i / 7, wob: Math.random() * 6 })), []);
    useFrame(({ clock }) => {
        const g = group.current;
        if (!g) return;
        g.children.forEach((c, i) => {
            const s = seeds[i], p = (clock.elapsedTime * 0.55 + s.off) % 1;
            c.position.set(x + Math.sin(p * 9 + s.wob) * 0.25, 97.4 + p * 6.2, UPPER_Z + Math.cos(p * 7 + s.wob) * 0.2);
            c.scale.setScalar(0.6 + p * 0.6);
        });
    });
    return (
        <group ref={group}>
            {seeds.map((_, i) => <mesh key={i}><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.7} roughness={0.1} /></mesh>)}
        </group>
    );
};

// Clip that grips the apex of a heart on the cannula, following the apex as it rises and falls
const ApexClip = ({ motion, lit }: { motion: React.MutableRefObject<LangendorffMotion>; lit: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if (!ref.current) return;
        ref.current.position.y = APEX_REST_Y + motion.current.lift + 0.15;
        ref.current.visible = motion.current.thread > 0.001;
    });
    return (
        <group ref={ref} position={[CAN[0] + 0.05, APEX_REST_Y, FRONT_Z]}>
            <Bar a={[-0.18, 0, 0]} b={[-0.18, -1.75, 0]} r={0.05} seg={6}><Steel lit={lit} /></Bar>
            <Bar a={[0.2, -0.15, 0]} b={[0.2, -1.75, 0]} r={0.05} seg={6}><Steel lit={lit} /></Bar>
            <Box at={[0.01, -0.1, 0]} size={[0.55, 0.3, 0.14]}><Steel lit={lit} /></Box>
            <mesh position={[0.01, -1.95, 0]}><torusGeometry args={[0.24, 0.05, 6, 16]} /><Steel lit={lit} /></mesh>
        </group>
    );
};

// Moving arm of the heart lever, turned about its fulcrum
const LeverArm = ({ motion, children }: { motion?: React.MutableRefObject<LangendorffMotion>; children: React.ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => { if (ref.current && motion) ref.current.rotation.z = -motion.current.tilt; });
    return (
        <group ref={ref} position={LEVER_PIVOT}>
            <group position={[-LEVER_PIVOT[0], -LEVER_PIVOT[1], -LEVER_PIVOT[2]]}>{children}</group>
        </group>
    );
};

// Profile of a reservoir bottle (radius, height), turned into a solid of revolution
const bottleGeo = (() => {
    let cached: THREE.LatheGeometry | null = null;
    return () => cached ?? (cached = new THREE.LatheGeometry(
        [[0, 0], [4.8, 0], [5, 0.4], [5, 10.5], [4.4, 12.2], [2.2, 14.2], [1.8, 14.8], [1.8, 16.6], [2.3, 17], [2.3, 17.4], [1.7, 17.4]].map(([r, y]) => new THREE.Vector2(r, y)), 40));
})();
const coilPts = (() => {
    const pts: V3[] = [];
    for (let i = 0; i <= 140; i++) { const t = i / 140, a = t * Math.PI * 2 * 7; pts.push([-2.6 + t * 5.2, 45.5 + Math.sin(a) * 1.8, -4 + Math.cos(a) * 1.8]); }
    return pts;
})();

interface ApparatusProps {
    active: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
    live?: LangendorffLive;
}
export const LangendorffApparatus = React.memo(({ active, onHover, onSelect, live }: ApparatusProps) => {
    const lit = (id: string) => active === id;
    const bottle = useMemo(bottleGeo, []);
    const fluidGeo = useMemo(() => new THREE.LatheGeometry(
        [[0, 0.45], [4.75, 0.45], [4.75, 9.2], [0, 9.2]].map(([r, y]) => new THREE.Vector2(r, y)), 36), []);
    const sides = [-1, 1];
    const motion = live?.motion;
    const threadColor = lit('pulleys') ? HIGHLIGHT : '#f8fafc';
    const laid = () => motion?.current.thread ?? 1;
    // Ends of the threads: from the clip (on the apex of the heart, or hanging empty) and up to the lever
    const clipBottom = (): V3 => live?.heart && motion
        ? [CAN[0] + 0.06, APEX_REST_Y + motion.current.lift + 0.15 - 2.19, FRONT_Z] : CLIP_BOTTOM;
    const leverTie = (): V3 => { const [x, y] = rotAbout(LEVER_TIE, motion?.current.tilt ?? 0); return [x, y, FRONT_Z]; };

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* ---------- Stand: base plate, uprights and the frame that carries the bath ---------- */}
            <group userData={{ part: 'stand' }}>
                <Box at={[0, -1, 2]} size={[46, 2, 32]}><Paint lit={lit('stand')} /></Box>
                {/* Tall uprights for the reservoirs, and the short ones for the cross bars, each in a white foot */}
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Bar a={[s * 17, 0, UPPER_Z]} b={[s * 17, 112, UPPER_Z]} r={0.6}><Steel lit={lit('stand')} /></Bar>
                        <mesh position={[s * 17, 2.2, UPPER_Z]}><cylinderGeometry args={[1.1, 1.8, 4.4, 20]} /><Paint lit={lit('stand')} /></mesh>
                        <Bar a={[s * 17, 0, 6]} b={[s * 17, s < 0 ? 35 : 30, 6]} r={0.55}><Steel lit={lit('stand')} /></Bar>
                        <mesh position={[s * 17, 2.2, 6]}><cylinderGeometry args={[1.1, 1.8, 4.4, 20]} /><Paint lit={lit('stand')} /></mesh>
                    </React.Fragment>
                ))}
                {/* Frame of the bath: steel legs, white square posts, the shelf the tank sits on and the aluminium rim */}
                {sides.map(sx => sides.map(sz => (
                    <React.Fragment key={`${sx}${sz}`}>
                        <Bar a={[sx * TANK.x, 0, sz * TANK.z]} b={[sx * TANK.x, 27, sz * TANK.z]} r={0.7}><Steel lit={lit('stand')} /></Bar>
                        <Box at={[sx * (TANK.x + 0.6), 44.5, sz * (TANK.z + 0.6)]} size={[2, 35, 2]}><Paint lit={lit('stand')} /></Box>
                    </React.Fragment>
                )))}
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Box at={[0, 37.3, s * (TANK.z + 0.6)]} size={[2 * TANK.x + 1.2, 1.4, 2]}><Paint lit={lit('stand')} /></Box>
                        <Box at={[s * (TANK.x + 0.6), 37.3, 0]} size={[2, 1.4, 2 * TANK.z + 1.2]}><Paint lit={lit('stand')} /></Box>
                        <Box at={[0, 61, s * (TANK.z + 0.9)]} size={[2 * TANK.x + 3.4, 2, 0.9]}><Steel lit={lit('stand')} /></Box>
                        <Box at={[s * (TANK.x + 1.25), 61, 0]} size={[0.9, 2, 2 * TANK.z + 1.8]}><Steel lit={lit('stand')} /></Box>
                    </React.Fragment>
                ))}
                <Box at={[0, 61, TANK.z + 1.4]} size={[13, 1.5, 0.08]}><meshBasicMaterial color="#ffffff" /></Box>
                <Label at={[0, 61, TANK.z + 1.46]} size={0.82} bold>LANGENDORFF APPARATUS</Label>
                {/* Cross bars: one at the level of the cannula, and a lower pair that carries the pulleys and the lever */}
                <Bar a={[-18.5, 23.4, 6]} b={[18.5, 23.4, 6]} r={0.45}><Steel lit={lit('stand')} /></Bar>
                <Bar a={[-23, 13, 6]} b={[LEFT_PULLEY_X + 1, 13, 6]} r={0.45}><Steel lit={lit('stand')} /></Bar>
                <Bar a={[6.5, 13, 6]} b={[RIGHT_PULLEY_X + 0.9, 13, 6]} r={0.45}><Steel lit={lit('stand')} /></Bar>
                {([[-17, 23.4], [17, 23.4], [-17, 13], [17, 13]] as [number, number][]).map(([x, y]) => (
                    <Box key={`${x}${y}`} at={[x, y, 6]} size={[1.9, 1.9, 1.9]}><Steel lit={lit('stand')} /></Box>
                ))}
            </group>

            {/* ---------- Reservoir bottles, in white ring holders on the tall uprights ---------- */}
            <group userData={{ part: 'reservoirs' }}>
                {sides.map(s => (
                    <group key={s} position={[s * BOTTLE_X, 102, UPPER_Z]}>
                        <group userData={{ part: 'reservoirs', glass: true }}>
                            <mesh geometry={bottle}><Glass lit={lit('reservoirs')} opacity={0.28} /></mesh>
                            {motion && <LiveFluid motion={motion} at={[0, 0, 0]}><mesh geometry={fluidGeo}><meshStandardMaterial color={RINGER} transparent opacity={0.55} roughness={0.2} depthWrite={false} /></mesh></LiveFluid>}
                            {/* Outlet at the foot of the bottle, facing the middle */}
                            <Bar a={[-s * 4.8, 1.7, 0]} b={[-s * 6.6, 1.7, 0]} r={1.05}><Glass lit={lit('reservoirs')} /></Bar>
                        </group>
                        <mesh position={[-s * 6.9, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.95, 0.75, 1.5, 18]} /><meshStandardMaterial color={lit('reservoirs') ? HIGHLIGHT : '#c0392b'} roughness={0.7} /></mesh>
                        {/* Ring plate, its collar on the upright and the straps that steady the bottle */}
                        <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[5.7, 5.7, 0.4, 36]} /><Paint lit={lit('reservoirs')} /></mesh>
                        <Box at={[s * 5.6, -0.3, 0]} size={[2.4, 1.4, 2.2]}><Paint lit={lit('reservoirs')} /></Box>
                        {[0, 1, 2].map(k => {
                            // Front, back and the side next to the upright
                            const ang = k === 0 ? Math.PI / 2 : k === 1 ? -Math.PI / 2 : (s > 0 ? 0 : Math.PI);
                            return <Box key={k} at={[Math.cos(ang) * 5.25, 6, Math.sin(ang) * 5.25]} size={[0.25, 12.5, 1.6]} rot={[0, -ang, 0]}><Paint lit={lit('reservoirs')} /></Box>;
                        })}
                    </group>
                ))}
            </group>

            {/* ---------- Pressure-head tubes: tall open glass tubes, each with a fine glass tube down its middle ---------- */}
            <group userData={{ part: 'head-tubes' }}>
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <group userData={{ part: 'head-tubes', glass: true }}>
                            <mesh position={[s * TRAP_X, 102, UPPER_Z]}><cylinderGeometry args={[0.9, 0.9, 22, 20, 1, true]} /><Glass lit={lit('head-tubes')} /></mesh>
                            <mesh position={[s * TRAP_X, 90.2, UPPER_Z]}><cylinderGeometry args={[0.9, 0.35, 1.6, 20, 1, true]} /><Glass lit={lit('head-tubes')} /></mesh>
                            <Bar a={[s * TRAP_X, 86.5, UPPER_Z]} b={[s * TRAP_X, 89.4, UPPER_Z]} r={0.35}><Glass lit={lit('head-tubes')} /></Bar>
                            {/* Side arm to the bottle's outlet */}
                            <Bar a={[s * (TRAP_X + 0.8), 103.7, UPPER_Z]} b={[s * 4.4, 103.7, UPPER_Z]} r={0.3}><Glass lit={lit('head-tubes')} /></Bar>
                            {/* Fine tube that lets gas into the column */}
                            <Bar a={[s * TRAP_X, 97, UPPER_Z]} b={[-s * 1.6, 121 - (s > 0 ? 2 : 0), UPPER_Z + s * 0.6]} r={0.22}><Glass lit={lit('head-tubes')} opacity={0.45} /></Bar>
                            {/* Ringer-Locke standing in the column, up to the level of the bottle's outlet */}
                            {motion && (
                                <LiveFluid motion={motion} at={[s * TRAP_X, 90.2, UPPER_Z]}>
                                    <mesh position={[0, 6.8, 0]}><cylinderGeometry args={[0.8, 0.8, 13.6, 16]} /><meshStandardMaterial color={RINGER} transparent opacity={0.5} depthWrite={false} /></mesh>
                                </LiveFluid>
                            )}
                        </group>
                        {live?.oxygen && <Bubbles x={s * TRAP_X} />}
                        {/* Clamp holding the tube, on a pin under the ring plate */}
                        <Bar a={[s * 6.5, 93, UPPER_Z]} b={[s * 6.5, 101.5, UPPER_Z]} r={0.35}><Steel lit={lit('head-tubes')} /></Bar>
                        <Bar a={[s * 7.6, 95.5, UPPER_Z]} b={[s * 3.6, 95.5, UPPER_Z]} r={0.3}><Steel lit={lit('head-tubes')} /></Bar>
                        <Box at={[s * 2.3, 95.5, UPPER_Z]} size={[2.6, 1.3, 0.25]}><Steel lit={lit('head-tubes')} /></Box>
                        <Box at={[s * 6.5, 95.5, UPPER_Z]} size={[0.9, 0.9, 0.9]}><Brass lit={lit('head-tubes')} /></Box>
                    </React.Fragment>
                ))}
            </group>

            {/* ---------- Y-piece joining the two columns, and the tube that carries the fluid down into the bath ---------- */}
            <group userData={{ part: 'y-piece' }}>
                <group userData={{ part: 'y-piece', glass: true }}>
                    <Bar a={[1.5, 73.5, -1]} b={[1.5, 77, -1]} r={0.38}><Glass lit={lit('y-piece')} opacity={0.4} /></Bar>
                    <Bar a={[1.5, 77, -1]} b={[0.1, 81, -1.4]} r={0.36}><Glass lit={lit('y-piece')} opacity={0.4} /></Bar>
                    <Bar a={[1.5, 77, -1]} b={[2.9, 81, -1.4]} r={0.36}><Glass lit={lit('y-piece')} opacity={0.4} /></Bar>
                </group>
                <Pipe pts={[[-TRAP_X, 87.2, UPPER_Z], [-1.9, 84.5, -3], [0.1, 80.4, -1.4]]} r={0.5}><Rubber lit={lit('y-piece')} /></Pipe>
                <Pipe pts={[[TRAP_X, 87.2, UPPER_Z], [2.6, 84.5, -3], [2.9, 80.4, -1.4]]} r={0.5}><Rubber lit={lit('y-piece')} /></Pipe>
                <Pipe pts={[[1.5, 74.2, -1], [2.2, 69, -0.6], [4.6, 62, 1.2], [5.7, 56, 1.5], [5.6, 46, 1.4]]} r={0.5}><Rubber lit={lit('y-piece')} /></Pipe>
            </group>

            {/* ---------- Thermostatic bath: a clear tank of water ---------- */}
            <group userData={{ part: 'bath', glass: true }}>
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Box at={[0, (TANK.y0 + TANK.y1) / 2, s * TANK.z]} size={[2 * TANK.x, TANK.y1 - TANK.y0, 0.4]}><Glass lit={lit('bath')} opacity={0.14} /><Edges color={lit('bath') ? HIGHLIGHT : '#9fb0c2'} /></Box>
                        <Box at={[s * TANK.x, (TANK.y0 + TANK.y1) / 2, 0]} size={[0.4, TANK.y1 - TANK.y0, 2 * TANK.z]}><Glass lit={lit('bath')} opacity={0.14} /><Edges color={lit('bath') ? HIGHLIGHT : '#9fb0c2'} /></Box>
                    </React.Fragment>
                ))}
                <Box at={[0, TANK.y0 + 0.2, 0]} size={[2 * TANK.x, 0.4, 2 * TANK.z]}><Glass lit={lit('bath')} opacity={0.22} /></Box>
            </group>

            {/* The two inner glass tubes standing in the bath (it is a "two unit" bath), each on a rubber stopper, with
                a bent glass tube clamped above it */}
            <group userData={{ part: 'inner-tubes' }}>
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <group userData={{ part: 'inner-tubes', glass: true }}>
                            <mesh position={[s * TUBE_X, 48.5, TUBE_Z]}><cylinderGeometry args={[1.7, 1.7, 13, 22, 1, true]} /><Glass lit={lit('inner-tubes')} opacity={0.35} /></mesh>
                            <mesh position={[s * TUBE_X, 41.3, TUBE_Z]}><cylinderGeometry args={[1.7, 0.45, 1.4, 22, 1, true]} /><Glass lit={lit('inner-tubes')} opacity={0.35} /></mesh>
                            <Bar a={[s * TUBE_X, 39.4, TUBE_Z]} b={[s * TUBE_X, 40.7, TUBE_Z]} r={0.45}><Glass lit={lit('inner-tubes')} /></Bar>
                            <Pipe pts={[[s * 10.5, 66.5, 0.4], [s * 6, 66.5, 0.4], [s * 4.5, 65.6, 0.5], [s * 4.3, 62, 0.6], [s * 4.3, 44, 0.6]]} r={0.33}><Glass lit={lit('inner-tubes')} opacity={0.45} /></Pipe>
                        </group>
                        <mesh position={[s * TUBE_X, 39, TUBE_Z]}><cylinderGeometry args={[0.9, 1.15, 1.2, 18]} /><Rubber lit={lit('inner-tubes')} /></mesh>
                        {/* Post on the rim and the clamp that holds the bent tube */}
                        <Box at={[s * (TANK.x + 1.25), 62.6, 0.4]} size={[1.4, 1.2, 1.4]}><Steel lit={lit('inner-tubes')} /></Box>
                        <Bar a={[s * (TANK.x + 1.25), 63, 0.4]} b={[s * (TANK.x + 1.25), 69, 0.4]} r={0.45}><Steel lit={lit('inner-tubes')} /></Bar>
                        <Box at={[s * 10.4, 66.5, 0.4]} size={[2.6, 1.1, 0.3]}><Steel lit={lit('inner-tubes')} /></Box>
                    </React.Fragment>
                ))}
                {/* Drains of the two tubes: they run under the bath and hang down at the back on the right, behind the
                    control panel, their ends lying on the base with wire clips (as in the photographs) */}
                <Pipe pts={[[-TUBE_X, 38.4, TUBE_Z], [-3, 37, -1], [6.5, 36.6, -2.6], [8.2, 30, -3.6], [8.6, 10, -4.4], [10, 1.6, -6], [14.5, 0.55, -7.5]]} r={0.48} seg={80}><Rubber lit={lit('inner-tubes')} /></Pipe>
                <Pipe pts={[[TUBE_X, 38.4, TUBE_Z], [7.5, 36.8, -1.2], [9.6, 30, -2.8], [10.2, 10, -3.6], [11.8, 1.6, -4.8], [16.5, 0.55, -5.4]]} r={0.48} seg={80}><Rubber lit={lit('inner-tubes')} /></Pipe>
                {([[14.5, -7.5], [16.5, -5.4]] as [number, number][]).map(([x, z]) => (
                    <Pipe key={x} pts={[[x, 0.6, z], [x + 0.9, 0.9, z], [x + 1.5, 0.6, z + 0.25], [x + 1.1, 0.35, z + 0.5], [x + 0.4, 0.6, z + 0.35], [x + 1.8, 0.6, z - 0.1]]} r={0.06} seg={30}><Steel lit={lit('inner-tubes')} /></Pipe>
                ))}
            </group>

            {/* Warming coil: the fluid runs through it on its way to the heart and takes up the heat of the bath */}
            <group userData={{ part: 'coil' }}>
                <group userData={{ part: 'coil', glass: true }}>
                    <Pipe pts={coilPts} r={0.33} seg={420}><Glass lit={lit('coil')} opacity={0.5} /></Pipe>
                </group>
                <Pipe pts={[[TUBE_X - 0.7, 40.3, TUBE_Z - 0.4], [4.2, 40.6, -1.5], [3.3, 43, -3.2], [2.6, 45.5, -2.2]]} r={0.42}><Rubber lit={lit('coil')} /></Pipe>
                <Pipe pts={[[-2.6, 45.5, -2.2], [-3, 42, -2.4], [-1.6, 39.8, 0.6], [0, 38.6, 3]]} r={0.42}><Rubber lit={lit('coil')} /></Pipe>
                <mesh position={[0, 38.3, 3]}><cylinderGeometry args={[0.85, 1, 1, 18]} /><Rubber lit={lit('coil')} /></mesh>
            </group>

            {/* Immersion heater: a U-shaped element lying in the water, its black cap outside the tank */}
            <group userData={{ part: 'heater' }}>
                <Pipe pts={[[2.2, 43.2, 9.4], [2.2, 43.2, 2.2], [2.5, 43.2, 1.2], [3.3, 43.2, 0.8], [4.1, 43.2, 1.2], [4.4, 43.2, 2.2], [4.4, 43.2, 9.4]]} r={0.42}><Steel lit={lit('heater')} /></Pipe>
                <mesh position={[3.3, 43.2, 11.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2, 2.1, 3.6, 24]} /><Black lit={lit('heater')} /></mesh>
                <Pipe pts={[[3.3, 43.2, 13], [4, 41.5, 14.5], [6.5, 37.5, 14.2], [8, 36.2, 13]]} r={0.3}><Black lit={lit('heater')} /></Pipe>
            </group>

            {/* Stirrer: a small pump that keeps the water moving so the bath is at one temperature throughout */}
            <group userData={{ part: 'stirrer' }}>
                <Box at={[-9, 49, -2.5]} size={[2.8, 4.2, 3.4]}><Black lit={lit('stirrer')} /></Box>
                <Bar a={[-7.6, 47.6, -2.5]} b={[-6.2, 47.6, -2.5]} r={0.45}><Black lit={lit('stirrer')} /></Bar>
                <Pipe pts={[[-9, 51, -2.5], [-10.4, 58, -3], [-12.2, 62.6, -1], [-13.2, 58, 4], [-13, 44, 8.5], [-9, 34, 9.2], [-5, 31.5, 10]]} r={0.28}><Black lit={lit('stirrer')} /></Pipe>
            </group>

            {/* Temperature probe of the controller, dipping into the water */}
            <group userData={{ part: 'probe' }}>
                <Bar a={[-9.6, 43.5, 4]} b={[-9.6, 62.5, 4]} r={0.28}><Steel lit={lit('probe')} /></Bar>
                <Box at={[-9.6, 50.5, 4]} size={[2.6, 0.5, 1.4]}><meshStandardMaterial color={lit('probe') ? HIGHLIGHT : '#d9dde2'} transparent opacity={0.7} /></Box>
                <Pipe pts={[[-9.6, 62.5, 4], [-11.6, 63.4, 5], [-13.4, 56, 7], [-12.6, 42, 9.4], [-8, 32, 9.6], [-5, 29.5, 10]]} r={0.24}><meshStandardMaterial color={lit('probe') ? HIGHLIGHT : '#6b7280'} roughness={0.7} /></Pipe>
            </group>

            {/* ---------- Control panel: mains switch, heater and stirrer switch, and the digital temperature controller ---------- */}
            <group userData={{ part: 'control' }} position={[3, 31, 12]}>
                <Box at={[0, 0, 0]} size={[16, 10.5, 8]}><Paint lit={lit('control')} /></Box>
                <Box at={[0, 0, 4.03]} size={[15.4, 9.9, 0.06]}><meshStandardMaterial color={lit('control') ? HIGHLIGHT : '#a9aeb4'} roughness={0.5} metalness={0.3} /></Box>
                {[-5.2, 5.2].map(x => (
                    <React.Fragment key={x}>
                        <mesh position={[x * 0.75, 3.6, 4.3]}><sphereGeometry args={[0.62, 18, 12]} /><meshStandardMaterial color="#d92626" emissive={live && !live.heaterOn ? '#2a0606' : '#7a0c0c'} emissiveIntensity={live ? (live.heaterOn ? 1.4 : 0.2) : 0.6} roughness={0.3} /></mesh>
                        <Box at={[x, -0.4, 4.25]} size={[2.6, 4.6, 0.4]}><Paint lit={false} color="#fafafa" /></Box>
                        <Box at={[x, -0.4, 4.5]} size={[1.5, 2.8, 0.25]} rot={[live && !live.heaterOn ? -0.12 : 0.12, 0, 0]}><Paint lit={false} color="#ffffff" /></Box>
                        <Label at={[x, -3.5, 4.1]} size={0.5} color="#9b1c1c" bold>ON</Label>
                    </React.Fragment>
                ))}
                <Label at={[-5.2, 2.5, 4.1]} size={0.5} color="#9b1c1c" bold>MAIN</Label>
                <Label at={[5.2, 2.8, 4.1]} size={0.46} color="#9b1c1c" bold>{'HEATER\nSTIRRER'}</Label>
                <Label at={[0, 3.1, 4.1]} size={0.62} color="#9b1c1c" bold>TWO UNIT BATH</Label>
                <Label at={[0, -3.9, 4.1]} size={0.5} color="#9b1c1c" bold>DIGITAL PID CONTROL</Label>
                {/* Controller: measured temperature above, set temperature below */}
                <Box at={[0, -0.4, 4.3]} size={[5.2, 5.2, 0.6]}><Black lit={false} /></Box>
                <Label at={[0.3, 0.9, 4.62]} size={1.05} color="#ff3b30" bold>{live?.pv ?? '37.0'}</Label>
                <Label at={[0.3, -0.5, 4.62]} size={0.85} color="#35d07f" bold>{live?.sv ?? '37.0'}</Label>
                <Label at={[-2, 0.9, 4.62]} size={0.34} color="#d1d5db">PV</Label>
                <Label at={[-2, -0.5, 4.62]} size={0.34} color="#d1d5db">SV</Label>
                <Box at={[0, -2.1, 4.62]} size={[4.4, 0.9, 0.05]}><meshStandardMaterial color="#cfd3d8" /></Box>
            </group>

            {/* ---------- Heart cannula: the glass piece under the bath on which the heart is tied by its aorta ---------- */}
            <group userData={{ part: 'cannula' }}>
                <Pipe pts={[[0, 37.8, 3], [0, 33, 3.6], [-0.7, 29, 6.2], [CAN[0], 27, CAN[2]]]} r={0.45}><Rubber lit={lit('cannula')} /></Pipe>
                <group userData={{ part: 'cannula', glass: true }}>
                    <Bar a={[CAN[0], 24.4, CAN[2]]} b={[CAN[0], 27.6, CAN[2]]} r={0.36}><Glass lit={lit('cannula')} opacity={0.45} /></Bar>
                    <mesh position={CAN} scale={[1, 1.15, 1]}><sphereGeometry args={[1.35, 24, 18]} /><Glass lit={lit('cannula')} opacity={0.4} /></mesh>
                    <mesh position={[CAN[0], 21.2, CAN[2]]}><cylinderGeometry args={[0.5, 0.16, 2.2, 16, 1, true]} /><Glass lit={lit('cannula')} opacity={0.5} /></mesh>
                    {/* Side arm, to the manometer */}
                    <Bar a={[CAN[0] - 0.2, 26, CAN[2]]} b={[CAN[0] - 2.2, 27.2, CAN[2]]} r={0.3}><Glass lit={lit('cannula')} opacity={0.45} /></Bar>
                    {/* Socket for the thermometer */}
                    <Bar a={[CAN[0] + 0.9, 23.4, CAN[2]]} b={[CAN[0] + 3.6, 22.7, CAN[2]]} r={0.62}><Glass lit={lit('cannula')} opacity={0.4} /></Bar>
                </group>
                {/* Screw clip that grips it on the cross bar */}
                <Box at={[CAN[0] + 1.1, 23.6, CAN[2] - 0.6]} size={[1.3, 1.9, 1.1]}><Steel lit={lit('cannula')} /></Box>
                <mesh position={[CAN[0] + 1.1, 24.9, CAN[2] - 0.4]}><cylinderGeometry args={[0.55, 0.55, 0.5, 14]} /><Steel lit={lit('cannula')} /></mesh>
            </group>

            {motion && <LiveFlow motion={motion} />}

            {/* Thermometer, in the stream just before it reaches the heart */}
            <group userData={{ part: 'thermometer' }}>
                <mesh position={[CAN[0] + 3.8, 22.65, CAN[2]]} rotation={[0, 0, Math.PI / 2 - 0.25]}><cylinderGeometry args={[0.7, 0.55, 1.1, 16]} /><Rubber lit={lit('thermometer')} /></mesh>
                <Bar a={[CAN[0] + 1.6, 23.2, CAN[2]]} b={[CAN[0] + 13, 20.3, CAN[2]]} r={0.2}><meshStandardMaterial color={lit('thermometer') ? HIGHLIGHT : '#f2d43d'} roughness={0.25} {...glow(lit('thermometer'))} /></Bar>
            </group>

            {/* ---------- Mercury manometer: a U-tube with a scale, on the left upright ---------- */}
            <group userData={{ part: 'manometer' }}>
                <Box at={[-21.2, 23, 6.6]} size={[7, 21, 0.3]}><Steel lit={lit('manometer')} /></Box>
                {sides.map(s => <Box key={s} at={[-21.2 + s * 3.5, 23, 7.1]} size={[0.3, 21, 1.3]}><Steel lit={lit('manometer')} /></Box>)}
                {/* Scale beside the open limb, in mmHg: a long mark every 20 mmHg (1 cm of rise), a short one between */}
                <Box at={[-21.2, 25.2, 6.85]} size={[2.5, 10.6, 0.2]}><meshStandardMaterial color="#ffffff" roughness={0.4} /></Box>
                {Array.from({ length: 17 }, (_, k) => k).map(k => (
                    <React.Fragment key={k}>
                        <Box at={[k % 2 ? -22.05 : -21.9, HG_ZERO + k * 0.5, 6.97]} size={[k % 2 ? 0.6 : 0.9, 0.05, 0.02]}><meshBasicMaterial color="#111827" /></Box>
                        {k % 2 === 0 && <Label at={[-20.65, HG_ZERO + k * 0.5, 6.98]} size={0.42}>{String(k * 10)}</Label>}
                    </React.Fragment>
                ))}
                <Label at={[-21.2, 29.95, 6.98]} size={0.4} bold>mmHg</Label>
                <group userData={{ part: 'manometer', glass: true }}>
                    <Pipe pts={[[-23, 32.5, 7.4], [-23, 15.5, 7.4], [-22.6, 14.4, 7.4], [-21.2, 14, 7.4], [-19.8, 14.4, 7.4], [-19.4, 15.5, 7.4], [-19.4, 30.6, 7.4], [-19, 31.6, 7.4], [-17.6, 31.8, 7.4]]} r={0.34} seg={90}><Glass lit={lit('manometer')} opacity={0.4} /></Pipe>
                    <Bar a={[-19.4, 28, 7.4]} b={[-17.6, 28, 7.4]} r={0.3}><Glass lit={lit('manometer')} opacity={0.4} /></Bar>
                </group>
                {/* Mercury in the bend */}
                <Pipe pts={HG_BEND} r={0.2} seg={50}><Mercury /></Pipe>
                <MercuryColumns motion={motion} />
                <Box at={[-17.6, 27, 6.4]} size={[1.9, 1.9, 1.5]}><Steel lit={lit('manometer')} /></Box>
                {/* Its tubes: one to the side arm of the cannula, the other left free */}
                <Pipe pts={[[-17.9, 31.8, 7.4], [-13, 32.4, 8], [-7, 29.6, 8], [CAN[0] - 2, 27.1, CAN[2]]]} r={0.45}><Rubber lit={lit('manometer')} /></Pipe>
                <Pipe pts={[[-17.9, 28, 7.4], [-13.5, 27.6, 9], [-10, 18, 12], [-8, 5, 14.5], [-5, 0.6, 16.4], [2, 0.5, 17]]} r={0.45}><Rubber lit={lit('manometer')} /></Pipe>
            </group>

            {/* ---------- Heart clip: a small spring clip on an S-hook under the tip of the cannula ---------- */}
            <group userData={{ part: 'clip' }}>
                {live?.heart && motion ? <ApexClip motion={motion} lit={lit('clip')} /> : (
                    <>
                        <Pipe pts={[[CAN[0], 20.2, FRONT_Z], [CAN[0] + 0.25, 19.9, FRONT_Z], [CAN[0], 19.6, FRONT_Z], [CAN[0] - 0.2, 19.3, FRONT_Z], [CAN[0], 19.0, FRONT_Z], [CAN[0] + 0.2, 19.2, FRONT_Z]]} r={0.045} seg={30}><Steel lit={lit('clip')} /></Pipe>
                        {/* The clip: two arms joined by a coil at the lower end, like a small safety pin, hanging a little askew */}
                        <group position={[CAN[0] + 0.05, 19.05, FRONT_Z]} rotation={[0, 0, 0.32]}>
                            <Bar a={[-0.18, 0, 0]} b={[-0.18, -1.75, 0]} r={0.05} seg={6}><Steel lit={lit('clip')} /></Bar>
                            <Bar a={[0.2, -0.15, 0]} b={[0.2, -1.75, 0]} r={0.05} seg={6}><Steel lit={lit('clip')} /></Bar>
                            <Box at={[0.01, -0.1, 0]} size={[0.55, 0.3, 0.14]}><Steel lit={lit('clip')} /></Box>
                            <mesh position={[0.01, -1.95, 0]}><torusGeometry args={[0.24, 0.05, 6, 16]} /><Steel lit={lit('clip')} /></mesh>
                        </group>
                    </>
                )}
            </group>

            {/* ---------- Pulleys and thread ----------
                Each pulley is a tapered brass clamp gripping a lower cross bar, with its black screw on top and a clear
                wheel at the bottom. Threads run from the heart clip down to both pulleys: on the right, under the
                wheel and up to the lever; on the left, under the wheel and along the bar to be wound on its end. */}
            <group userData={{ part: 'pulleys' }}>
                {[LEFT_PULLEY_X, RIGHT_PULLEY_X].map(x => (
                    <React.Fragment key={x}>
                        <mesh position={[x, 13.9, 6]}><cylinderGeometry args={[0.42, 0.42, 0.75, 16]} /><Black lit={lit('pulleys')} /></mesh>
                        <mesh position={[x, 13.6, 6]}><cylinderGeometry args={[0.1, 0.1, 0.5, 8]} /><Steel lit={lit('pulleys')} /></mesh>
                        <mesh position={[x, 12.1, 6.25]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.62, 0.38, 2.6, 4]} /><meshStandardMaterial color={lit('pulleys') ? HIGHLIGHT : '#c49a3a'} metalness={0.85} roughness={0.3} {...glow(lit('pulleys'))} /></mesh>
                        <mesh position={[x, 10.4, FRONT_Z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1, 1, 0.22, 32]} /><meshPhysicalMaterial color={lit('pulleys') ? HIGHLIGHT : '#eef3f7'} transparent opacity={0.6} roughness={0.1} clearcoat={1} /></mesh>
                        <mesh position={[x, 10.4, FRONT_Z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.5, 10]} /><Steel lit={lit('pulleys')} /></mesh>
                        <Bar a={[x, 10.6, 6.3]} b={[x, 10.4, FRONT_Z]} r={0.12} seg={8}><Steel lit={lit('pulleys')} /></Bar>
                    </React.Fragment>
                ))}
                {!live ? ([
                    [CLIP_BOTTOM, [RIGHT_PULLEY_X - 0.6, 9.45, FRONT_Z]],
                    [[RIGHT_PULLEY_X + 1, 10.4, FRONT_Z], [RIGHT_PULLEY_X + 1, 20.6, FRONT_Z]],
                    [CLIP_BOTTOM, [LEFT_PULLEY_X + 0.6, 9.45, FRONT_Z]],
                    [[LEFT_PULLEY_X - 1, 10.4, FRONT_Z], [-22.6, 12.5, 6.2]],
                ] as [V3, V3][]).map(([a, b], i) => (
                    <Bar key={i} a={a} b={b} r={0.035} seg={5}><meshBasicMaterial color={threadColor} /></Bar>
                )) : (
                    // In the practical the thread is laid once the heart is on, and then moves with every beat
                    <>
                        <LiveThread color={threadColor} ends={() => [clipBottom(), [RIGHT_PULLEY_X - 0.6, 9.45, FRONT_Z]]} drawn={() => laid() * 2} />
                        <LiveThread color={threadColor} ends={() => [[RIGHT_PULLEY_X + 1, 10.4, FRONT_Z], leverTie()]} drawn={() => laid() * 2 - 1} />
                        <LiveThread color={threadColor} ends={() => [clipBottom(), [LEFT_PULLEY_X + 0.6, 9.45, FRONT_Z]]} drawn={() => laid() * 2} />
                        <LiveThread color={threadColor} ends={() => [[LEFT_PULLEY_X - 1, 10.4, FRONT_Z], [-22.6, 12.5, 6.2]]} drawn={() => laid() * 2 - 1} />
                    </>
                )}
                {/* Thread wound round the end of the left bar */}
                {(!live || live.heart) && [0, 1, 2].map(k => <mesh key={k} position={[-22.4 + k * 0.18, 13, 6]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.47, 0.03, 4, 16]} /><meshBasicMaterial color={lit('pulleys') ? HIGHLIGHT : '#f8fafc'} /></mesh>)}
            </group>

            {/* ---------- Heart lever: brass arm, notched strip, light spring and the writing point ---------- */}
            <group userData={{ part: 'lever' }}>
                {/* Short upright welded on the right lower bar */}
                <Bar a={[20, 13, 6]} b={[20, 28.5, 6]} r={0.4}><Steel lit={lit('lever')} /></Bar>
                <mesh position={[20, 13.3, 6]}><sphereGeometry args={[0.6, 12, 8]} /><Steel lit={lit('lever')} /></mesh>
                <Box at={[20.6, 21, FRONT_Z]} size={[4.6, 0.9, 0.9]}><Brass lit={lit('lever')} /></Box>
                <mesh position={[18, 21, FRONT_Z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.9, 12]} /><Brass lit={lit('lever')} /></mesh>
                {/* The arm that moves: notched strip, counterweight and the writing point */}
                <LeverArm motion={motion}>
                    <Box at={[25.6, 20.95, FRONT_Z]} size={[5.6, 0.75, 0.16]}><Brass lit={lit('lever')} /></Box>
                    {[0, 1, 2, 3, 4, 5, 6].map(k => <Box key={k} at={[23.3 + k * 0.7, 21.4, FRONT_Z]} size={[0.35, 0.25, 0.16]}><Brass lit={lit('lever')} /></Box>)}
                    <mesh position={[28.7, 20.98, FRONT_Z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.8, 12]} /><Black lit={lit('lever')} /></mesh>
                    <Bar a={[29, 21, FRONT_Z]} b={[38, 21.6, FRONT_Z]} r={0.06} seg={6}><Steel lit={lit('lever')} /></Bar>
                    <Box at={[38.4, 21.65, FRONT_Z]} size={[1.3, 0.7, 0.03]} rot={[0, 0, 0.3]}><meshStandardMaterial color={lit('lever') ? HIGHLIGHT : '#f1f5f9'} transparent opacity={0.85} /></Box>
                </LeverArm>
                {/* Adjusting arm above, and the spring that returns the lever */}
                <Bar a={[21, 21.4, FRONT_Z]} b={[21, 25.4, FRONT_Z]} r={0.22}><Brass lit={lit('lever')} /></Bar>
                <Bar a={[19.6, 24.4, FRONT_Z]} b={[24.2, 24.4, FRONT_Z]} r={0.22}><Brass lit={lit('lever')} /></Bar>
                <mesh position={[19.4, 24.4, FRONT_Z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.42, 0.42, 0.8, 12]} /><Brass lit={lit('lever')} /></mesh>
                <Pipe pts={Array.from({ length: 41 }, (_, i): V3 => [24.2 + Math.sin(i * 1.6) * 0.3, 24.2 - i * 0.07, FRONT_Z + Math.cos(i * 1.6) * 0.3])} r={0.035} seg={120}><Steel lit={lit('lever')} /></Pipe>
            </group>

            {/* ---------- Brass holders on the rim, with their spring wires ---------- */}
            <group userData={{ part: 'holders' }}>
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Box at={[s * (TANK.x + 1.25), 62.6, -4]} size={[1.4, 1.2, 1.4]}><Steel lit={lit('holders')} /></Box>
                        <Bar a={[s * (TANK.x + 1.25), 63, -4]} b={[s * (TANK.x + 1.25), 71, -4]} r={0.45}><Steel lit={lit('holders')} /></Bar>
                        <Box at={[s * (TANK.x + 1.25), 69, -4]} size={[1.5, 1.5, 1.5]}><Brass lit={lit('holders')} /></Box>
                        <Bar a={[s * 16.5, 69, -4]} b={[s * 7, 69, -4]} r={0.34}><Brass lit={lit('holders')} /></Bar>
                        <Box at={[s * 6.8, 69.2, -4]} size={[1.3, 1.1, 1.1]}><Brass lit={lit('holders')} /></Box>
                        <mesh position={[s * (TANK.x + 1.25), 69, -2.9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.6, 12]} /><Black lit={lit('holders')} /></mesh>
                        <Pipe pts={[[s * 6.8, 69.6, -4], [s * 6.2, 77.5, -4], [s * 5.6, 78, -4], [s * 5, 77.5, -4], [s * 4.4, 71.5, -4], [s * 3.8, 71.3, -4]]} r={0.07} seg={40}><Steel lit={lit('holders')} /></Pipe>
                        <Bar a={[s * 6.2, 77.6, -4]} b={[s * 7.4, 48, -3.4]} r={0.07} seg={6}><Steel lit={lit('holders')} /></Bar>
                    </React.Fragment>
                ))}
            </group>
        </group>
    );
});
