import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';

// Dale's apparatus (organ bath) for isolated smooth muscle, drawn from AK Jain Fig. 67.1 and GK Pal Fig. 73.1:
// a large rectangular perspex bath of water on a stand, kept at 37 °C by a heating element with a thermostat and
// mixed by a stirrer; a central glass organ bath of about 20 mL with an outlet below; a hollow bent glass tube,
// curved at its lower end, that carries air (or oxygen) into the organ bath and holds the tissue; and a frontal
// writing lever on a rod, to which the tissue is tied by a thread. Units are centimetres; the bench top is y = 0,
// x runs left to right and +z is the front.
// Not from the books: the exact sizes, which are our own.

const HIGHLIGHT = '#3b82f6';
type V3 = [number, number, number];

// --- Layout (exported for the practical that uses the apparatus) ---
export const DALE_BATH = { x: 15, z: 10, y0: 20, y1: 38, water: 35.5 };   // half-widths, floor, rim, water level
export const DALE_ORGAN = { x: 0, z: 0, r: 1.15, y0: 28.5, y1: 38.6, fluidTop: 37.2 };
const AIR_X = -0.55, AIR_TOP = 50, AIR_END = 30.2;                        // the bent glass tube
export const DALE_HOOK_TIP: V3 = [0.3, 30.0, 0];                          // the curved end of the air tube
export const DALE_HOOK: V3 = [0.35, 30.75, 0];                            // lower end of the tissue, tied by a thread loop to the curved end
export const DALE_PIVOT: V3 = [-0.65, 42.5, 0];                           // fulcrum of the frontal lever
export const DALE_SHORT_ARM = 1.0, DALE_LONG_ARM = 24;                    // thread tied 1 cm right of the fulcrum; writing point 24 cm left
export const DALE_TIP_X = DALE_PIVOT[0] - DALE_LONG_ARM;

// What the practical drives: the lever (tilt, rad; positive raises the writing point), the level of Tyrode's
// solution in the organ bath (0..1), whether air is bubbling and whether the heater and stirrer are on
export interface DalesMotion { tilt: number; level: number }
export interface DalesLive { air: boolean; heaterOn: boolean; motion: React.MutableRefObject<DalesMotion> }

// --- Materials and shapes ---
const glow = (lit: boolean) => (lit ? { emissive: HIGHLIGHT, emissiveIntensity: 0.5 } : {});
const Steel = ({ lit }: { lit: boolean }) => <meshStandardMaterial color={lit ? HIGHLIGHT : '#c9ced3'} metalness={0.9} roughness={0.28} {...glow(lit)} />;
const Paint = ({ lit, color }: { lit: boolean; color: string }) => <meshStandardMaterial color={lit ? HIGHLIGHT : color} roughness={0.55} {...glow(lit)} />;
const Glass = ({ lit, opacity = 0.3 }: { lit: boolean; opacity?: number }) => (
    <meshPhysicalMaterial color={lit ? HIGHLIGHT : '#eef6fa'} transparent opacity={lit ? 0.6 : opacity} roughness={0.05} clearcoat={1}
        depthWrite={false} side={THREE.DoubleSide} {...glow(lit)} />
);
const Bar = ({ a, b, r, children, seg = 12 }: { a: V3; b: V3; r: number; children: React.ReactNode; seg?: number }) => {
    const { pos, quat, len } = useMemo(() => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
        return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() };
    }, [a, b]);
    return <mesh position={pos} quaternion={quat}><cylinderGeometry args={[r, r, len, seg, 1]} />{children}</mesh>;
};
const Pipe = ({ pts, r, children, seg = 40 }: { pts: V3[]; r: number; children: React.ReactNode; seg?: number }) => {
    const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 10, false), [pts, r, seg]);
    return <mesh geometry={geo}>{children}</mesh>;
};
const Box = ({ at, size, children }: { at: V3; size: V3; children: React.ReactNode }) => <mesh position={at}><boxGeometry args={size} />{children}</mesh>;

// Parts are tagged with userData.part; a solid part wins over glass, so what is inside the bath can be picked
const partOf = (obj: THREE.Object3D | null): { part: string; glass?: boolean } | null => {
    for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData as { part: string; glass?: boolean };
    return null;
};
const pick = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const tagged = e.intersections.map(i => partOf(i.object)).filter((p): p is { part: string; glass?: boolean } => !!p);
    return (tagged.find(p => !p.glass) ?? tagged[0])?.part ?? null;
};

const B = DALE_BATH, O = DALE_ORGAN;
const ORGAN_FLUID_H = O.fluidTop - O.y0;

// Tyrode's solution in the organ bath, drawn as its back wall and its surface so the tissue in it shows clearly,
// and the air bubbles rising from the curved end of the tube (2–3 a second)
const OrganFluid = ({ level, air }: { level: () => number; air: boolean }) => {
    const fluid = useRef<THREE.Group>(null);
    const bubbles = useRef<THREE.Group>(null);
    const seeds = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ off: i / 5, wob: Math.random() * 6 })), []);
    useFrame(() => {
        const l = level();
        if (fluid.current) { fluid.current.visible = l > 0.01; fluid.current.scale.y = Math.max(0.01, l); }
        if (bubbles.current) {
            const top = O.y0 + ORGAN_FLUID_H * l;
            const now = performance.now() / 1000;
            bubbles.current.visible = air && l > 0.3;
            bubbles.current.children.forEach((c, i) => {
                const s = seeds[i], p = (now * 0.5 + s.off) % 1;
                // Out of the curved end of the tube, then up the far side of the organ bath (Jain's figure)
                c.position.set(DALE_HOOK_TIP[0] + 0.55 * Math.min(1, p * 5) + Math.sin(p * 8 + s.wob) * 0.08, AIR_END - 0.3 + p * (top - AIR_END + 0.3), O.z + 0.1);
                c.visible = c.position.y < top;
            });
        }
    });
    return (
        <group>
            <group ref={fluid} position={[O.x, O.y0, O.z]}>
                <mesh position={[0, ORGAN_FLUID_H / 2, 0]}><cylinderGeometry args={[O.r - 0.05, O.r - 0.05, ORGAN_FLUID_H, 24, 1, true]} /><meshStandardMaterial color="#2f8fe0" transparent opacity={0.75} side={THREE.BackSide} depthWrite={false} /></mesh>
                <mesh position={[0, ORGAN_FLUID_H, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[O.r - 0.05, 24]} /><meshStandardMaterial color="#5aaef0" transparent opacity={0.55} depthWrite={false} /></mesh>
            </group>
            <group ref={bubbles}>
                {seeds.map((_, i) => <mesh key={i}><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} transparent opacity={0.9} /></mesh>)}
            </group>
        </group>
    );
};

// Frontal writing lever: a light arm on a fulcrum, the thread tied 1 cm to the right of it so that as the tissue
// contracts and pulls the thread down, the long arm on the left rises
const LeverArm = ({ tilt, lit }: { tilt: () => number; lit: boolean }) => {
    const arm = useRef<THREE.Group>(null);
    useFrame(() => { if (arm.current) arm.current.rotation.z = -tilt(); });
    return (
        <group ref={arm} position={DALE_PIVOT}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 1.1, 10]} /><Steel lit={lit} /></mesh>
            <mesh position={[DALE_SHORT_ARM / 2 + 0.2, 0, 0]}><boxGeometry args={[DALE_SHORT_ARM + 0.8, 0.35, 0.12]} /><Paint lit={lit} color="#b8923a" /></mesh>
            <mesh position={[-DALE_LONG_ARM / 2, 0, 0]}><boxGeometry args={[DALE_LONG_ARM, 0.22, 0.1]} /><Paint lit={lit} color="#64748b" /></mesh>
            <mesh position={[-DALE_LONG_ARM + 0.3, 0, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.9, 0.35, 0.03]} /><Paint lit={lit} color="#e8dfc8" /></mesh>
            {/* Small weight hanging from the long arm, as in Jain's figure */}
            <Bar a={[-3, 0, 0]} b={[-3, -1.2, 0]} r={0.03}><meshBasicMaterial color="#e2e8f0" /></Bar>
            <mesh position={[-3, -1.6, 0]}><coneGeometry args={[0.45, 0.8, 3]} /><Paint lit={lit} color="#475569" /></mesh>
        </group>
    );
};

const Stirrer = ({ lit, on }: { lit: boolean; on: boolean }) => {
    const prop = useRef<THREE.Group>(null);
    useFrame((_, dt) => { if (prop.current && on) prop.current.rotation.y += dt * 12; });
    return (
        <group position={[-10.5, 0, 5]}>
            <Bar a={[0, 22, 0]} b={[0, 42, 0]} r={0.18}><Paint lit={lit} color="#c0392b" /></Bar>
            <group ref={prop} position={[0, 22.5, 0]}>
                {[0, 1].map(k => <mesh key={k} rotation={[0.4, k * Math.PI, 0]} position={[k ? -0.8 : 0.8, 0, 0]}><boxGeometry args={[1.5, 0.08, 0.6]} /><Paint lit={lit} color="#c0392b" /></mesh>)}
            </group>
            {/* Motor above the water, on a bracket from the rim */}
            <mesh position={[0, 43.2, 0]}><cylinderGeometry args={[1.1, 1.1, 2.4, 20]} /><Paint lit={lit} color="#1f2937" /></mesh>
            <Box at={[-2.2, 41.8, 0]} size={[4, 0.5, 1]}><Steel lit={lit} /></Box>
        </group>
    );
};

export const DalesApparatus = React.memo(({ active, onHover, onSelect, live }: {
    active: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
    live?: DalesLive;
}) => {
    const lit = (id: string) => active === id;
    const motion = live?.motion;
    const level = () => motion?.current.level ?? 1;
    const tilt = () => motion?.current.tilt ?? 0;
    const sides = [-1, 1];
    const heaterOn = live ? live.heaterOn : true;

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* ---------- Stand: four legs and a frame under the bath, and a back bar for the two rods ---------- */}
            <group userData={{ part: 'stand' }}>
                {sides.map(sx => sides.map(sz => (
                    <React.Fragment key={`${sx}${sz}`}>
                        <Bar a={[sx * (B.x - 1.5), 0, sz * (B.z - 1.5)]} b={[sx * (B.x - 1.5), B.y0, sz * (B.z - 1.5)]} r={0.55}><Paint lit={lit('stand')} color="#5b4a8a" /></Bar>
                        <mesh position={[sx * (B.x - 1.5), 0.3, sz * (B.z - 1.5)]}><cylinderGeometry args={[1, 1.2, 0.6, 16]} /><Paint lit={lit('stand')} color="#3f3466" /></mesh>
                    </React.Fragment>
                )))}
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Box at={[0, B.y0 - 0.3, s * (B.z - 1.5)]} size={[2 * B.x - 2, 0.6, 0.8]}><Paint lit={lit('stand')} color="#5b4a8a" /></Box>
                        <Box at={[s * (B.x - 1.5), B.y0 - 0.3, 0]} size={[0.8, 0.6, 2 * B.z - 2]}><Paint lit={lit('stand')} color="#5b4a8a" /></Box>
                    </React.Fragment>
                ))}
                <Box at={[0, B.y0 - 0.3, -B.z - 1]} size={[2 * B.x - 2, 0.6, 1.6]}><Paint lit={lit('stand')} color="#5b4a8a" /></Box>
            </group>

            {/* ---------- Large rectangular perspex bath of water ---------- */}
            <group userData={{ part: 'bath', glass: true }}>
                {sides.map(s => (
                    <React.Fragment key={s}>
                        <Box at={[0, (B.y0 + B.y1) / 2, s * B.z]} size={[2 * B.x, B.y1 - B.y0, 0.4]}><Glass lit={lit('bath')} opacity={0.14} /><Edges color={lit('bath') ? HIGHLIGHT : '#9fb0c2'} /></Box>
                        <Box at={[s * B.x, (B.y0 + B.y1) / 2, 0]} size={[0.4, B.y1 - B.y0, 2 * B.z]}><Glass lit={lit('bath')} opacity={0.14} /><Edges color={lit('bath') ? HIGHLIGHT : '#9fb0c2'} /></Box>
                    </React.Fragment>
                ))}
                <Box at={[0, B.y0 + 0.2, 0]} size={[2 * B.x, 0.4, 2 * B.z]}><Glass lit={lit('bath')} opacity={0.22} /></Box>
                {/* Water, drawn as its far walls and its surface */}
                <mesh position={[0, (B.y0 + 0.4 + B.water) / 2, 0]}><boxGeometry args={[2 * B.x - 0.5, B.water - B.y0 - 0.4, 2 * B.z - 0.5]} /><meshStandardMaterial color="#3b9eea" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} /></mesh>
                <mesh position={[0, B.water, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * B.x - 0.5, 2 * B.z - 0.5]} /><meshStandardMaterial color="#5aaef0" transparent opacity={0.18} depthWrite={false} /></mesh>
            </group>

            {/* ---------- Central glass organ bath (about 20 mL), with its outlet through the floor of the bath ---------- */}
            <group userData={{ part: 'organ', glass: true }}>
                <mesh position={[O.x, (O.y0 + O.y1) / 2, O.z]}><cylinderGeometry args={[O.r, O.r, O.y1 - O.y0, 28, 1, true]} /><Glass lit={lit('organ')} opacity={0.2} /></mesh>
                <mesh position={[O.x, O.y0 - 0.6, O.z]}><cylinderGeometry args={[O.r, 0.3, 1.2, 28, 1, true]} /><Glass lit={lit('organ')} opacity={0.32} /></mesh>
                <mesh position={[O.x, O.y1, O.z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[O.r, 0.08, 8, 28]} /><Glass lit={lit('organ')} opacity={0.5} /></mesh>
                <Bar a={[O.x, 15, O.z]} b={[O.x, O.y0 - 1.2, O.z]} r={0.3}><Glass lit={lit('organ')} opacity={0.4} /></Bar>
            </group>
            {motion ? <OrganFluid level={level} air={live!.air} /> : <OrganFluid level={() => 1} air />}

            {/* Outlet for Tyrode's solution: a rubber tube with a clip, into a beaker on the bench */}
            <group userData={{ part: 'outlet' }}>
                <Pipe pts={[[O.x, 15.5, O.z], [O.x, 12, O.z], [O.x + 0.6, 9, O.z + 0.4], [O.x + 1, 7.5, O.z + 0.6]]} r={0.42}><Paint lit={lit('outlet')} color="#c27a5c" /></Pipe>
                <Box at={[O.x, 11.5, O.z]} size={[1.6, 0.5, 1.2]}><Steel lit={lit('outlet')} /></Box>
                <mesh position={[O.x + 1, 3.5, O.z + 0.6]}><cylinderGeometry args={[2.6, 2.4, 7, 28, 1, true]} /><Glass lit={lit('outlet')} opacity={0.28} /></mesh>
                <mesh position={[O.x + 1, 0.05, O.z + 0.6]}><cylinderGeometry args={[2.4, 2.4, 0.1, 28]} /><Glass lit={lit('outlet')} opacity={0.35} /></mesh>
            </group>

            {/* ---------- Hollow bent glass tube: air (or oxygen) inlet, curved at its lower end to hold the tissue ---------- */}
            <group userData={{ part: 'airtube' }}>
                <group userData={{ part: 'airtube', glass: true }}>
                    <Pipe pts={[[-9, AIR_TOP, O.z], [-1.6, AIR_TOP, O.z], [AIR_X, AIR_TOP - 1, O.z], [AIR_X, AIR_TOP - 3, O.z], [AIR_X, AIR_END + 0.6, O.z]]} r={0.22}><Glass lit={lit('airtube')} opacity={0.55} /></Pipe>
                    <Pipe pts={[[AIR_X, AIR_END + 0.7, O.z], [AIR_X, AIR_END, O.z], [AIR_X + 0.3, AIR_END - 0.35, O.z], [DALE_HOOK_TIP[0], DALE_HOOK_TIP[1], O.z]]} r={0.2}><Glass lit={lit('airtube')} opacity={0.55} /></Pipe>
                </group>
                {/* Rubber tube from the aerator on the bench */}
                <Pipe pts={[[-9, AIR_TOP, O.z], [-11.5, AIR_TOP - 0.5, O.z], [-15, 40, 6], [-17, 15, 11], [-18, 4, 12]]} r={0.35} seg={60}><Paint lit={lit('airtube')} color="#2f855a" /></Pipe>
                <Box at={[-18, 1.6, 12]} size={[5, 3.2, 3.5]}><Paint lit={lit('airtube')} color="#334155" /></Box>
            </group>

            {/* ---------- Two rods behind the bath, with clamps: one holds the air tube, the other the lever ---------- */}
            <group userData={{ part: 'rods' }}>
                {([[-4, AIR_TOP + 4], [4, DALE_PIVOT[1] + 3]] as [number, number][]).map(([x, top]) => (
                    <React.Fragment key={x}>
                        <Bar a={[x, B.y0 - 0.6, -B.z - 1]} b={[x, top, -B.z - 1]} r={0.4}><Steel lit={lit('rods')} /></Bar>
                        <Box at={[x, B.y0, -B.z - 1]} size={[1.6, 1.2, 1.6]}><Steel lit={lit('rods')} /></Box>
                    </React.Fragment>
                ))}
                {/* Clamp arm reaching forward to the air tube */}
                <Bar a={[-4, AIR_TOP, -B.z - 1]} b={[-4, AIR_TOP, O.z]} r={0.25}><Steel lit={lit('rods')} /></Bar>
                <Box at={[-4, AIR_TOP, O.z]} size={[0.9, 0.9, 0.9]}><Paint lit={lit('rods')} color="#b8923a" /></Box>
                {/* Arm reaching forward and across to the fulcrum of the lever */}
                <Bar a={[4, DALE_PIVOT[1] + 1.2, -B.z - 1]} b={[4, DALE_PIVOT[1] + 1.2, O.z]} r={0.25}><Steel lit={lit('rods')} /></Bar>
                <Bar a={[4, DALE_PIVOT[1] + 1.2, O.z]} b={[DALE_PIVOT[0], DALE_PIVOT[1] + 1.2, O.z]} r={0.25}><Steel lit={lit('rods')} /></Bar>
                <Box at={[DALE_PIVOT[0], DALE_PIVOT[1] + 0.6, O.z]} size={[0.8, 1.4, 0.9]}><Paint lit={lit('rods')} color="#b8923a" /></Box>
            </group>

            {/* ---------- Frontal writing lever ---------- */}
            <group userData={{ part: 'lever' }}><LeverArm tilt={tilt} lit={lit('lever')} /></group>

            {/* ---------- Heating element with thermostat, through the right wall ---------- */}
            <group userData={{ part: 'heater' }}>
                <Bar a={[B.x - 0.2, 24.5, 4]} b={[4, 24.5, 4]} r={0.32}><Paint lit={lit('heater')} color={heaterOn ? '#c2410c' : '#9a6a4f'} /></Bar>
                <mesh position={[B.x + 2.2, 24.5, 4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.9, 0.9, 4.4, 18]} /><Paint lit={lit('heater')} color="#2f855a" /></mesh>
                <mesh position={[B.x + 2.6, 25.6, 4]}><cylinderGeometry args={[0.45, 0.45, 0.5, 14]} /><Paint lit={lit('heater')} color="#1f2937" /></mesh>
                <mesh position={[B.x + 1.2, 25.5, 4]}><sphereGeometry args={[0.25, 10, 8]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={heaterOn ? 1.4 : 0.1} /></mesh>
                <Pipe pts={[[B.x + 4.4, 24.5, 4], [B.x + 6, 22, 5], [B.x + 6.5, 10, 7], [B.x + 8, 0.4, 9]]} r={0.25}><Paint lit={lit('heater')} color="#1f2937" /></Pipe>
            </group>

            {/* ---------- Stirrer ---------- */}
            <group userData={{ part: 'stirrer' }}><Stirrer lit={lit('stirrer')} on={heaterOn} /></group>

            {/* ---------- Thermometer dipping into the water ---------- */}
            <group userData={{ part: 'thermometer' }}>
                <Bar a={[9, 27, -5]} b={[9, 46, -5]} r={0.22}><Glass lit={lit('thermometer')} opacity={0.5} /></Bar>
                <Bar a={[9, 27.3, -5]} b={[9, 36.5, -5]} r={0.08}><meshStandardMaterial color={lit('thermometer') ? HIGHLIGHT : '#dc2626'} /></Bar>
                <mesh position={[9, 27, -5]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#dc2626" /></mesh>
            </group>
        </group>
    );
});
