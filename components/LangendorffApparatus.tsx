import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT, LABEL_FONT_BOLD } from './labelFonts';

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

export const LangendorffApparatus: React.FC<{
    active: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
}> = ({ active, onHover, onSelect }) => {
    const lit = (id: string) => active === id;
    const bottle = useMemo(bottleGeo, []);
    const sides = [-1, 1];

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
                <Bar a={[-23, 13, 6]} b={[-2.5, 13, 6]} r={0.45}><Steel lit={lit('stand')} /></Bar>
                <Bar a={[4, 13, 6]} b={[25, 13, 6]} r={0.45}><Steel lit={lit('stand')} /></Bar>
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
                        </group>
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
                {/* Drain of the left tube, hanging under the bath and closed by a spring clip */}
                <Pipe pts={[[-TUBE_X, 38.4, TUBE_Z], [-5.4, 30, 0.4], [-6, 16, -1], [-5, 7, -2.5]]} r={0.45}><Rubber lit={lit('inner-tubes')} /></Pipe>
                <Box at={[-5.3, 9, -2.2]} size={[1.6, 0.5, 0.7]}><Steel lit={lit('inner-tubes')} /></Box>
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
                        <mesh position={[x * 0.75, 3.6, 4.3]}><sphereGeometry args={[0.62, 18, 12]} /><meshStandardMaterial color="#d92626" emissive="#7a0c0c" emissiveIntensity={0.6} roughness={0.3} /></mesh>
                        <Box at={[x, -0.4, 4.25]} size={[2.6, 4.6, 0.4]}><Paint lit={false} color="#fafafa" /></Box>
                        <Box at={[x, -0.4, 4.5]} size={[1.5, 2.8, 0.25]} rot={[0.12, 0, 0]}><Paint lit={false} color="#ffffff" /></Box>
                        <Label at={[x, -3.5, 4.1]} size={0.5} color="#9b1c1c" bold>ON</Label>
                    </React.Fragment>
                ))}
                <Label at={[-5.2, 2.5, 4.1]} size={0.5} color="#9b1c1c" bold>MAIN</Label>
                <Label at={[5.2, 2.8, 4.1]} size={0.46} color="#9b1c1c" bold>{'HEATER\nSTIRRER'}</Label>
                <Label at={[0, 3.1, 4.1]} size={0.62} color="#9b1c1c" bold>TWO UNIT BATH</Label>
                <Label at={[0, -3.9, 4.1]} size={0.5} color="#9b1c1c" bold>DIGITAL PID CONTROL</Label>
                {/* Controller: measured temperature above, set temperature below */}
                <Box at={[0, -0.4, 4.3]} size={[5.2, 5.2, 0.6]}><Black lit={false} /></Box>
                <Label at={[0.3, 0.9, 4.62]} size={1.05} color="#ff3b30" bold>37.0</Label>
                <Label at={[0.3, -0.5, 4.62]} size={0.85} color="#35d07f" bold>37.0</Label>
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
                {/* Hook that takes the apex of the heart */}
                <Pipe pts={[[CAN[0], 18.6, FRONT_Z], [CAN[0] + 0.25, 18.1, FRONT_Z], [CAN[0], 17.6, FRONT_Z], [CAN[0] - 0.25, 18.1, FRONT_Z], [CAN[0], 18.5, FRONT_Z]]} r={0.06} seg={24}><Steel lit={lit('cannula')} /></Pipe>
            </group>

            {/* Thermometer, in the stream just before it reaches the heart */}
            <group userData={{ part: 'thermometer' }}>
                <mesh position={[CAN[0] + 3.8, 22.65, CAN[2]]} rotation={[0, 0, Math.PI / 2 - 0.25]}><cylinderGeometry args={[0.7, 0.55, 1.1, 16]} /><Rubber lit={lit('thermometer')} /></mesh>
                <Bar a={[CAN[0] + 1.6, 23.2, CAN[2]]} b={[CAN[0] + 13, 20.3, CAN[2]]} r={0.2}><meshStandardMaterial color={lit('thermometer') ? HIGHLIGHT : '#f2d43d'} roughness={0.25} {...glow(lit('thermometer'))} /></Bar>
            </group>

            {/* ---------- Mercury manometer: a U-tube with a scale, on the left upright ---------- */}
            <group userData={{ part: 'manometer' }}>
                <Box at={[-21.2, 23, 6.6]} size={[7, 21, 0.3]}><Steel lit={lit('manometer')} /></Box>
                {sides.map(s => <Box key={s} at={[-21.2 + s * 3.5, 23, 7.1]} size={[0.3, 21, 1.3]}><Steel lit={lit('manometer')} /></Box>)}
                <Box at={[-21.2, 22.5, 6.85]} size={[2.5, 11.5, 0.2]}><meshStandardMaterial color="#ffffff" roughness={0.4} /></Box>
                {[0, 2, 4, 6, 8, 10, 12, 14, 16].map(n => (
                    <React.Fragment key={n}>
                        <Box at={[-21.9, 17.6 + n * 0.62, 6.97]} size={[0.9, 0.05, 0.02]}><meshBasicMaterial color="#111827" /></Box>
                        <Label at={[-20.7, 17.6 + n * 0.62, 6.98]} size={0.48}>{String(n)}</Label>
                    </React.Fragment>
                ))}
                <group userData={{ part: 'manometer', glass: true }}>
                    <Pipe pts={[[-23, 32.5, 7.4], [-23, 15.5, 7.4], [-22.6, 14.4, 7.4], [-21.2, 14, 7.4], [-19.8, 14.4, 7.4], [-19.4, 15.5, 7.4], [-19.4, 30.6, 7.4], [-19, 31.6, 7.4], [-17.6, 31.8, 7.4]]} r={0.34} seg={90}><Glass lit={lit('manometer')} opacity={0.4} /></Pipe>
                    <Bar a={[-19.4, 28, 7.4]} b={[-17.6, 28, 7.4]} r={0.3}><Glass lit={lit('manometer')} opacity={0.4} /></Bar>
                </group>
                {/* Mercury in the bend */}
                <Pipe pts={[[-23, 18, 7.4], [-23, 15.5, 7.4], [-22.6, 14.4, 7.4], [-21.2, 14, 7.4], [-19.8, 14.4, 7.4], [-19.4, 15.5, 7.4], [-19.4, 18, 7.4]]} r={0.2} seg={50}><meshStandardMaterial color="#9aa1a8" metalness={1} roughness={0.15} /></Pipe>
                <Box at={[-17.6, 27, 6.4]} size={[1.9, 1.9, 1.5]}><Steel lit={lit('manometer')} /></Box>
                {/* Its tubes: one to the side arm of the cannula, the other left free */}
                <Pipe pts={[[-17.9, 31.8, 7.4], [-13, 32.4, 8], [-7, 29.6, 8], [CAN[0] - 2, 27.1, CAN[2]]]} r={0.45}><Rubber lit={lit('manometer')} /></Pipe>
                <Pipe pts={[[-17.9, 28, 7.4], [-13.5, 27.6, 9], [-10, 18, 12], [-8, 5, 14.5], [-5, 0.6, 16.4], [2, 0.5, 17]]} r={0.45}><Rubber lit={lit('manometer')} /></Pipe>
            </group>

            {/* ---------- Pulleys and thread: carry the pull of the heart to the lever ---------- */}
            <group userData={{ part: 'pulleys' }}>
                {[CAN[0] + 1.1, 23.6].map(x => (
                    <React.Fragment key={x}>
                        <Box at={[x, 11.6, 6.3]} size={[0.9, 3, 0.9]}><Brass lit={lit('pulleys')} /></Box>
                        <mesh position={[x, 13.6, 6.3]}><cylinderGeometry args={[0.5, 0.5, 0.9, 14]} /><Black lit={lit('pulleys')} /></mesh>
                        <mesh position={[x, 10.4, FRONT_Z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.1, 1.1, 0.25, 28]} /><meshStandardMaterial color={lit('pulleys') ? HIGHLIGHT : '#e8edf2'} transparent opacity={0.75} roughness={0.2} /></mesh>
                    </React.Fragment>
                ))}
                <Bar a={[CAN[0], 17.6, FRONT_Z]} b={[CAN[0], 10.4, FRONT_Z]} r={0.05} seg={6}><meshBasicMaterial color={lit('pulleys') ? HIGHLIGHT : '#f8fafc'} /></Bar>
                <Bar a={[CAN[0] + 1.1, 9.3, FRONT_Z]} b={[23.6, 9.3, FRONT_Z]} r={0.05} seg={6}><meshBasicMaterial color={lit('pulleys') ? HIGHLIGHT : '#f8fafc'} /></Bar>
                <Bar a={[24.7, 10.4, FRONT_Z]} b={[24.7, 20.6, FRONT_Z]} r={0.05} seg={6}><meshBasicMaterial color={lit('pulleys') ? HIGHLIGHT : '#f8fafc'} /></Bar>
            </group>

            {/* ---------- Heart lever: brass arm, notched strip, light spring and the writing point ---------- */}
            <group userData={{ part: 'lever' }}>
                <Bar a={[20, 13, 6]} b={[20, 27, 6]} r={0.4}><Steel lit={lit('lever')} /></Bar>
                <Box at={[20.6, 21, FRONT_Z]} size={[4.6, 0.9, 0.9]}><Brass lit={lit('lever')} /></Box>
                <mesh position={[18, 21, FRONT_Z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.9, 12]} /><Brass lit={lit('lever')} /></mesh>
                <Box at={[25.6, 20.95, FRONT_Z]} size={[5.6, 0.75, 0.16]}><Brass lit={lit('lever')} /></Box>
                {[0, 1, 2, 3, 4, 5, 6].map(k => <Box key={k} at={[23.3 + k * 0.7, 21.4, FRONT_Z]} size={[0.35, 0.25, 0.16]}><Brass lit={lit('lever')} /></Box>)}
                <Bar a={[28.4, 20.95, FRONT_Z]} b={[38, 21.6, FRONT_Z]} r={0.08} seg={6}><Steel lit={lit('lever')} /></Bar>
                <Box at={[38.4, 21.65, FRONT_Z]} size={[1.3, 0.7, 0.03]} rot={[0, 0, 0.3]}><meshStandardMaterial color={lit('lever') ? HIGHLIGHT : '#f1f5f9'} transparent opacity={0.85} /></Box>
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
};
