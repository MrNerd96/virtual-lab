import React, { useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT, LABEL_FONT_BOLD } from './labelFonts';

// Electrically driven student kymograph (Sherrington–Starling type recording drum), with a simple writing lever and a
// frog muscle to record from. Units are centimetres; the bench top is y = 0 and the viewer looks from +z.
//
// The real instrument: a heavy base holding a constant-speed motor and a gear box, which turns a vertical stainless
// steel spindle. A 15 cm × 15 cm drum sits on the spindle and is raised or lowered on it by a screw lift. Eight gear
// steps give paper speeds from 0.12 to 640 mm/s. Contact arms clamped on the spindle close a circuit once each turn.
// Glazed paper wrapped round the drum is blackened with soot; a stylus resting lightly on it scratches the soot away,
// leaving a white line. The drum turns so the paper under the stylus moves to the left, and the record reads left to
// right in time.

export const SPEEDS = [0.12, 0.25, 1.2, 2.5, 12.5, 25, 320, 640];   // paper speed, mm/s
const DRUM_R = 7.5, DRUM_H = 15, PAPER_R = 7.56;
const CIRC_MM = 2 * Math.PI * DRUM_R * 10;
const BASE = { w: 30, h: 10, d: 20, y0: 1.2 };       // base box, standing on its levelling screws
const BASE_TOP = BASE.y0 + BASE.h;
const AXIS_X = -6.5;                                 // spindle, near the left end of the base
const SPINDLE_TOP = 47;
const DRUM_Y_LOW = 15;                               // drum bottom with the screw lift right down
export const LIFT_MAX = 12;
// Writing lever: pivot on the stand to the right, long arm running left in a plane just in front of the drum so the
// writing point rests on its front
const PIVOT = new THREE.Vector3(13.5, 30, PAPER_R + 0.32);
const LONG_ARM = PIVOT.x - AXIS_X;                    // 20 cm to the writing point
const SHORT_ARM = 2.2;                               // pivot to the hook the muscle is tied to
const TWITCH_CM = 3;                                 // rise of the writing point in a full twitch
const HIGHLIGHT = '#3b82f6';
const CONTACT_ANGLE = 0.6;                           // contact arm, radians round the spindle from the paper's seam

// Paper as a canvas: 1536 px round the drum, so 32.6 px per cm
const TEX_W = 1536, PX_CM = TEX_W / (2 * Math.PI * PAPER_R), TEX_H = Math.round(DRUM_H * PX_CM);
const SEAM_PX = Math.round(1.2 * PX_CM);              // the overlapped, glued end of the sheet

const smokePaper = (g: CanvasRenderingContext2D) => {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#17150f'; g.fillRect(0, 0, TEX_W, TEX_H);
    // Soot is never quite even: faint blotches and grain
    for (let i = 0; i < 260; i++) {
        const x = Math.random() * TEX_W, y = Math.random() * TEX_H, r = 8 + Math.random() * 60;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const shade = Math.random() < 0.5 ? '40,36,28' : '6,6,5';
        grd.addColorStop(0, `rgba(${shade},${0.08 + Math.random() * 0.1})`); grd.addColorStop(1, `rgba(${shade},0)`);
        g.fillStyle = grd; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    for (let i = 0; i < 9000; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(60,55,45,0.25)' : 'rgba(0,0,0,0.3)';
        g.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1.2, 1.2);
    }
    // The glued overlap where the sheet's two ends meet: a band, with the raised edge of the upper end catching light
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, SEAM_PX, TEX_H);
    g.fillStyle = 'rgba(120,112,95,0.55)'; g.fillRect(SEAM_PX - 2, 0, 2, TEX_H);
};

// Lever-tip rise (cm) in a twitch, t seconds after the stimulus: latent period 10 ms, contraction 40 ms, relaxation
// 50 ms (frog gastrocnemius)
const twitch = (t: number) => {
    const a = t - 0.01;
    if (a <= 0 || a >= 0.09) return 0;
    if (a < 0.04) return TWITCH_CM * Math.sin((Math.PI / 2) * (a / 0.04)) ** 2;
    return TWITCH_CM * Math.cos((Math.PI / 2) * ((a - 0.04) / 0.05)) ** 2;
};

// The controls and the state the 3D model reads every frame. Stimuli are kept in a ref so a tap does not wait for
// React. Their times are on the drum's own clock, which the model advances frame by frame (and holds back when frames
// are dropped), so a curve lies where it should on the paper however unevenly the frames come.
export interface KymoState { on: boolean; speed: number; lift: number; leverOn: boolean; contactStim: boolean }
export const useKymograph = () => {
    const [state, setState] = useState<KymoState>({ on: false, speed: 6, lift: 4, leverOn: true, contactStim: false });
    const stimuli = useRef<number[]>([]);
    const clock = useRef(0);
    const [paperKey, setPaperKey] = useState(0);
    const set = useCallback((p: Partial<KymoState>) => setState(s => ({ ...s, ...p })), []);
    const stimulate = useCallback(() => { stimuli.current.push(clock.current); }, []);
    return { state, set, stimulate, stimuli, clock, paperKey, newPaper: () => setPaperKey(k => k + 1) };
};
export type Kymo = ReturnType<typeof useKymograph>;

// --- picking parts -------------------------------------------------------------------------------------------
const partOf = (obj: THREE.Object3D | null): string | null => {
    for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData.part as string;
    return null;
};
const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    for (const i of e.intersections) { const p = partOf(i.object); if (p) return p; }
    return null;
};

// Materials: highlighted parts turn blue
const Paint = ({ lit, color, metal = 0.3, rough = 0.55 }: { lit: boolean; color: string; metal?: number; rough?: number }) => (
    <meshStandardMaterial color={lit ? HIGHLIGHT : color} metalness={lit ? 0.1 : metal} roughness={rough}
        emissive={lit ? HIGHLIGHT : '#000000'} emissiveIntensity={lit ? 0.35 : 0} />
);
const Steel = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#d4d8dc" metal={0.95} rough={0.22} />;
const Alu = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#c9cdd1" metal={0.85} rough={0.35} />;
const Brass = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#c9a24a" metal={0.9} rough={0.3} />;
const Black = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#1d1f22" metal={0.2} rough={0.45} />;

const Cyl = ({ r, h, pos, rot, seg = 32, r2, children }: { r: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; seg?: number; r2?: number; children: React.ReactNode }) => (
    <mesh position={pos} rotation={rot}><cylinderGeometry args={[r2 ?? r, r, h, seg]} />{children}</mesh>
);
const BoxM = ({ size, pos, rot, children }: { size: [number, number, number]; pos: [number, number, number]; rot?: [number, number, number]; children: React.ReactNode }) => (
    <mesh position={pos} rotation={rot}><boxGeometry args={size} />{children}</mesh>
);
// A knurled knob: a cylinder with fine ridges round it
const Knurled = ({ r, h, pos, rot, lit, color = '#d4d8dc' }: { r: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; lit: boolean; color?: string }) => {
    const geo = useMemo(() => {
        const pts: THREE.Vector2[] = [];
        const n = 48;
        const shape = new THREE.Shape();
        for (let i = 0; i <= n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 0.93;
            pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
        }
        shape.setFromPoints(pts);
        const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSize: r * 0.04, bevelThickness: r * 0.04, bevelSegments: 1 });
        g.translate(0, 0, -h / 2); g.rotateX(Math.PI / 2);
        return g;
    }, [r, h]);
    return <mesh geometry={geo} position={pos} rotation={rot}><Paint lit={lit} color={color} metal={0.9} rough={0.3} /></mesh>;
};

// --- the instrument -------------------------------------------------------------------------------------------
export const KymographModel: React.FC<{ active: string | null; onHover: (id: string | null) => void; onSelect: (id: string) => void; kymo: Kymo }> = ({ active, onHover, onSelect, kymo }) => {
    const lit = (id: string) => active === id;
    const { state, stimuli, clock, paperKey } = kymo;
    const live = useRef(state); live.current = state;

    // Smoked paper
    const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H; return c; }, []);
    const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, [canvas]);
    const lastPt = useRef<{ u: number; v: number } | null>(null);
    useMemo(() => { smokePaper(canvas.getContext('2d')!); tex.needsUpdate = true; lastPt.current = null; }, [paperKey, canvas, tex]);   // eslint-disable-line react-hooks/exhaustive-deps

    const spin = useRef<THREE.Group>(null);      // spindle, drum and contact arms: they turn together
    const drum = useRef<THREE.Group>(null);      // raised and lowered by the screw lift
    const lever = useRef<THREE.Group>(null);     // tilts about the pivot
    const swing = useRef<THREE.Group>(null);     // swings the lever off the drum
    const muscle = useRef<THREE.Group>(null);
    const thread = useRef<THREE.Mesh>(null);
    const knob = useRef<THREE.Group>(null);
    const lamp = useRef<THREE.MeshStandardMaterial>(null);
    const contactLamp = useRef<THREE.MeshStandardMaterial>(null);
    const sim = useRef({ phi: 0, rate: 0, lift: state.lift, swing: 0, knob: 0, t: performance.now() / 1000, flash: 0, dirty: 0 });

    useFrame(() => {
        const s = sim.current, st = live.current, g = canvas.getContext('2d')!;
        const real = performance.now() / 1000;
        const dt = Math.min(0.1, real - s.t); s.t = real;
        const now = clock.current + dt;
        // Motor: comes up to speed in a fraction of a second; the drum's angular speed is paper speed / radius
        const target = st.on ? (SPEEDS[st.speed] / 10) / DRUM_R : 0;
        // The screw lift and the lever swing move smoothly, as turned by hand
        s.lift += (st.lift - s.lift) * Math.min(1, dt * 6);
        s.swing += ((st.leverOn ? 0 : 1) - s.swing) * Math.min(1, dt * 5);
        const knobGoal = (45 - (st.speed / 7) * 270) * Math.PI / 180;   // the pointer starts straight up
        s.knob += (knobGoal - s.knob) * Math.min(1, dt * 10);

        g.strokeStyle = 'rgba(236,230,214,0.92)'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        let drew = false;
        // Step in 2 ms slices, so a twitch is drawn smoothly even at 640 mm/s
        const steps = Math.max(1, Math.ceil(dt / 0.002));
        const h = dt / steps;
        let rise = 0;
        for (let k = 1; k <= steps; k++) {
            const tt = now - dt + k * h;
            s.rate += (target - s.rate) * Math.min(1, h * 8);
            const before = s.phi;
            s.phi -= s.rate * h;             // clockwise seen from above: the front of the drum moves left
            // The contact arm meets the fixed contact at the front once a turn
            if (s.rate > 0 && Math.floor((-before - CONTACT_ANGLE) / (2 * Math.PI)) !== Math.floor((-s.phi - CONTACT_ANGLE) / (2 * Math.PI))) {
                s.flash = 1;
                if (st.contactStim) stimuli.current.push(tt);
            }
            rise = stimuli.current.reduce((sum, t0) => sum + twitch(tt - t0), 0);
            rise = Math.min(rise, TWITCH_CM * 1.6);
            if (s.swing > 0.04) { lastPt.current = null; continue; }
            // Where the writing point is on the paper
            const y = PIVOT.y + rise;
            const paperTop = DRUM_Y_LOW + s.lift + DRUM_H;
            const v = (paperTop - y) * PX_CM;
            const theta = ((-s.phi) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
            const u = (theta / (2 * Math.PI)) * TEX_W;
            if (v < 2 || v > TEX_H - 2) { lastPt.current = null; continue; }
            const p = lastPt.current;
            if (p && Math.abs(u - p.u) < TEX_W / 2 && Math.abs(v - p.v) < 1.5 * PX_CM) {
                if (Math.abs(u - p.u) > 0.05 || Math.abs(v - p.v) > 0.05) { g.moveTo(p.u, p.v); g.lineTo(u, v); drew = true; }
            }
            lastPt.current = { u, v };
        }
        if (drew) { g.stroke(); s.dirty++; }
        // Upload the paper at most every other frame: it is the costliest thing here
        if (s.dirty && (s.dirty > 1 || !drew)) { tex.needsUpdate = true; s.dirty = 0; }
        stimuli.current = stimuli.current.filter(t0 => now - t0 < 0.2);
        clock.current = now;

        if (spin.current) spin.current.rotation.y = s.phi;
        if (drum.current) drum.current.position.y = DRUM_Y_LOW + s.lift;
        if (swing.current) swing.current.rotation.y = s.swing * 0.07;
        if (lever.current) lever.current.rotation.z = -Math.asin(rise / LONG_ARM);
        if (knob.current) knob.current.rotation.z = s.knob;
        // The muscle shortens by the hook's travel; the thread follows the hook
        const hookDrop = rise * SHORT_ARM / LONG_ARM;
        const hookY = PIVOT.y - 0.3 - hookDrop, muscleTop = MUSCLE_TOP;
        if (thread.current) { const len = hookY - muscleTop; thread.current.scale.y = len; thread.current.position.y = muscleTop + len / 2; }
        if (muscle.current) { const c = hookDrop / MUSCLE_LEN; muscle.current.scale.set(1 + c * 2.5, 1 - c, 1 + c * 2.5); }
        if (lamp.current) lamp.current.emissiveIntensity = st.on ? 2.2 : 0;
        s.flash = Math.max(0, s.flash - dt * 8);
        if (contactLamp.current) contactLamp.current.emissiveIntensity = s.flash * 3;
    });

    const speedLabels = useMemo(() => SPEEDS.map((v, i) => {
        const a = (135 - (i / 7) * 270) * Math.PI / 180;
        return { text: String(v), x: Math.cos(a) * 3.1, y: Math.sin(a) * 3.1 };
    }), []);
    const frontZ = BASE.d / 2;
    const knobPos: [number, number, number] = [5, BASE.y0 + 5.2, frontZ];

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* Bench top */}
            <mesh position={[3, -0.5, 1]} receiveShadow>
                <boxGeometry args={[64, 1, 40]} />
                <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
            </mesh>

            {/* Base: motor and gear box inside a cast, hammer-finish case */}
            <group userData={{ part: 'base' }}>
                <BoxM size={[BASE.w, BASE.h, BASE.d]} pos={[0, BASE.y0 + BASE.h / 2, 0]}><Paint lit={lit('base')} color="#5e6f68" metal={0.45} rough={0.6} /></BoxM>
                <BoxM size={[BASE.w - 1, 0.6, BASE.d - 1]} pos={[0, BASE_TOP + 0.3, 0]}><Paint lit={lit('base')} color="#56665f" metal={0.45} rough={0.55} /></BoxM>
                {/* Ventilation louvres for the motor, on the right end */}
                {[0, 1, 2, 3, 4].map(i => (
                    <BoxM key={i} size={[0.1, 0.35, 10]} pos={[BASE.w / 2 + 0.05, BASE.y0 + 3 + i * 1.3, 0]}><Black lit={lit('base')} /></BoxM>
                ))}
                {/* Name plate */}
                <BoxM size={[9, 2.2, 0.12]} pos={[-8, BASE.y0 + 6, frontZ + 0.06]}><Brass lit={lit('base')} /></BoxM>
                <Text font={LABEL_FONT_BOLD} position={[-8, BASE.y0 + 6.35, frontZ + 0.14]} fontSize={0.75} color="#2b2214" anchorX="center" anchorY="middle">KYMOGRAPH</Text>
                <Text font={LABEL_FONT} position={[-8, BASE.y0 + 5.45, frontZ + 0.14]} fontSize={0.42} color="#2b2214" anchorX="center" anchorY="middle">Recording drum · 230 V AC</Text>
                {/* Mains cable out of the back */}
                <mesh position={[10, BASE.y0 + 2, -BASE.d / 2 - 3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 6, 12]} /><Black lit={lit('base')} /></mesh>
            </group>

            {/* Levelling screws at the corners */}
            <group userData={{ part: 'feet' }}>
                {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
                    <group key={i} position={[sx * (BASE.w / 2 - 2), 0, sz * (BASE.d / 2 - 2)]}>
                        <Knurled r={1.1} h={0.7} pos={[0, 0.35, 0]} lit={lit('feet')} color="#2a2c2f" />
                        <Cyl r={0.35} h={1} pos={[0, 0.9, 0]}><Steel lit={lit('feet')} /></Cyl>
                    </group>
                ))}
            </group>

            {/* Speed selector: eight gear steps, marked in mm of paper per second */}
            <group userData={{ part: 'speed' }} position={knobPos}>
                <mesh position={[0, 0, 0.05]}><circleGeometry args={[4.2, 48]} /><Paint lit={lit('speed')} color="#e9e4d6" metal={0} rough={0.7} /></mesh>
                {speedLabels.map(l => (
                    <Text key={l.text} font={LABEL_FONT_BOLD} position={[l.x, l.y, 0.12]} fontSize={0.55} color="#1d1f22" anchorX="center" anchorY="middle">{l.text}</Text>
                ))}
                {/* In the gap between the slowest and fastest steps */}
                <Text font={LABEL_FONT} position={[-3.2, 0, 0.12]} fontSize={0.42} color="#1d1f22" anchorX="center" anchorY="middle">mm/s</Text>
                <group ref={knob} position={[0, 0, 0.8]}>
                    <Cyl r={1.6} r2={1.35} h={1.4} pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} seg={40}><Black lit={lit('speed')} /></Cyl>
                    <BoxM size={[0.25, 1.3, 0.1]} pos={[0, 0.85, 0.72]}><meshStandardMaterial color="#f5f5f5" /></BoxM>
                </group>
            </group>

            {/* Mains switch and pilot lamp */}
            <group userData={{ part: 'switch' }}>
                <BoxM size={[2.2, 3.2, 0.3]} pos={[11.5, BASE.y0 + 6.2, frontZ + 0.15]}><Black lit={lit('switch')} /></BoxM>
                <BoxM size={[0.6, 1.4, 0.7]} pos={[11.5, BASE.y0 + 6.2 + (state.on ? 0.4 : -0.4), frontZ + 0.6]} rot={[state.on ? -0.35 : 0.35, 0, 0]}><Steel lit={lit('switch')} /></BoxM>
                <Text font={LABEL_FONT_BOLD} position={[11.5, BASE.y0 + 8.4, frontZ + 0.02]} fontSize={0.45} color="#f1f1f1" anchorX="center">ON</Text>
                <Text font={LABEL_FONT_BOLD} position={[11.5, BASE.y0 + 3.5, frontZ + 0.02]} fontSize={0.45} color="#f1f1f1" anchorX="center">OFF</Text>
                <mesh position={[11.5, BASE.y0 + 2.2, frontZ + 0.2]}>
                    <sphereGeometry args={[0.45, 20, 12]} />
                    <meshStandardMaterial ref={lamp} color={lit('switch') ? HIGHLIGHT : '#7f1d1d'} emissive="#ff3b2f" emissiveIntensity={0} roughness={0.2} />
                </mesh>
            </group>

            {/* Fixed spring contact and its two terminals, met by the contact arm once every turn */}
            <group userData={{ part: 'contact' }}>
                <BoxM size={[1.2, 1.4, 1.2]} pos={[AXIS_X, BASE_TOP + 1.3, 4.6]}><Black lit={lit('contact')} /></BoxM>
                <BoxM size={[0.12, 1.6, 0.4]} pos={[AXIS_X, BASE_TOP + 2.6, 4.6]}><Brass lit={lit('contact')} /></BoxM>
                {[-1, 1].map(sx => (
                    <group key={sx} position={[AXIS_X + 5 + sx * 1.2, BASE_TOP + 0.6, 6.5]}>
                        <Knurled r={0.5} h={0.9} pos={[0, 0.45, 0]} lit={lit('contact')} color={sx < 0 ? '#b91c1c' : '#1d1f22'} />
                        <Cyl r={0.2} h={0.6} pos={[0, 1.1, 0]}><Brass lit={lit('contact')} /></Cyl>
                    </group>
                ))}
                <mesh position={[AXIS_X, BASE_TOP + 3.5, 4.6]}>
                    <sphereGeometry args={[0.18, 12, 8]} />
                    <meshStandardMaterial ref={contactLamp} color="#fde68a" emissive="#fff3b0" emissiveIntensity={0} transparent opacity={0.9} />
                </mesh>
            </group>

            {/* Everything that turns: spindle, contact arms and drum */}
            <group ref={spin} position={[AXIS_X, 0, 0]}>
                {/* Spindle, with the screw lift's thread along it */}
                <group userData={{ part: 'spindle' }}>
                    <Cyl r={1.6} r2={1.4} h={1.2} pos={[0, BASE_TOP + 1.2, 0]}><Steel lit={lit('spindle')} /></Cyl>
                    <Cyl r={0.6} h={SPINDLE_TOP - BASE_TOP} pos={[0, (SPINDLE_TOP + BASE_TOP) / 2, 0]} seg={24}><Steel lit={lit('spindle')} /></Cyl>
                </group>
                {/* Contact arm clamped on the spindle, set round from the paper's seam so the curves it starts fall on
                    clean paper */}
                <group userData={{ part: 'contact' }} rotation={[0, CONTACT_ANGLE, 0]}>
                    <Cyl r={1.1} h={1} pos={[0, BASE_TOP + 2.6, 0]}><Brass lit={lit('contact')} /></Cyl>
                    <BoxM size={[0.4, 0.4, 4.3]} pos={[0, BASE_TOP + 2.6, 2.4]}><Brass lit={lit('contact')} /></BoxM>
                    <Cyl r={0.3} h={0.8} pos={[0, BASE_TOP + 2.6, 0.9]} rot={[0, 0, Math.PI / 2]}><Steel lit={lit('contact')} /></Cyl>
                </group>
                {/* Screw lift: the knurled head on top of the spindle raises or lowers the drum */}
                <group userData={{ part: 'lift' }}>
                    <Knurled r={1.3} h={1.6} pos={[0, SPINDLE_TOP + 0.6, 0]} lit={lit('lift')} />
                </group>

                <group ref={drum} position={[0, DRUM_Y_LOW + state.lift, 0]}>
                    {/* Drum: a light aluminium cylinder with spoked ends and a hub clamped on the spindle */}
                    <group userData={{ part: 'drum' }}>
                        <mesh position={[0, DRUM_H / 2, 0]}><cylinderGeometry args={[DRUM_R, DRUM_R, DRUM_H, 96, 1, true]} /><meshStandardMaterial color={lit('drum') ? HIGHLIGHT : '#c9cdd1'} metalness={0.85} roughness={0.35} side={THREE.DoubleSide} /></mesh>
                        {[0, DRUM_H].map(y => (
                            <group key={y} position={[0, y, 0]}>
                                <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[DRUM_R - 0.1, 0.22, 10, 96]} /><Alu lit={lit('drum')} /></mesh>
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <BoxM key={i} size={[DRUM_R * 2 - 0.4, 0.35, 0.7]} pos={[0, 0, 0]} rot={[0, (i * Math.PI) / 6, 0]}><Alu lit={lit('drum')} /></BoxM>
                                ))}
                                <Cyl r={1.4} h={1.2} pos={[0, 0, 0]}><Alu lit={lit('drum')} /></Cyl>
                            </group>
                        ))}
                        {/* Clamp screw on the lower hub */}
                        <Cyl r={0.35} h={1.3} pos={[1.9, -0.2, 0]} rot={[0, 0, Math.PI / 2]}><Steel lit={lit('drum')} /></Cyl>
                    </group>
                    {/* Smoked glazed paper round the drum */}
                    <mesh position={[0, DRUM_H / 2, 0]} userData={{ part: 'paper' }}>
                        <cylinderGeometry args={[PAPER_R, PAPER_R, DRUM_H, 128, 1, true]} />
                        <meshStandardMaterial map={tex} color={lit('paper') ? '#9ec5ff' : '#ffffff'} roughness={0.85} metalness={0} />
                    </mesh>
                </group>
            </group>

            {/* Lever stand: heavy base and upright rod, with boss heads clamping the lever's pivot frame and, lower down,
                the femur of the muscle */}
            <group userData={{ part: 'stand' }}>
                <BoxM size={[9, 1.2, 12]} pos={[STAND.x, 0.6, 7.5]}><Paint lit={lit('stand')} color="#2f3336" metal={0.5} rough={0.5} /></BoxM>
                <Cyl r={0.55} h={40} pos={[STAND.x, 20.6, STAND.z]} seg={20}><Steel lit={lit('stand')} /></Cyl>
                <BoxM size={[2, 2, 2]} pos={[STAND.x, PIVOT.y, STAND.z]}><Brass lit={lit('stand')} /></BoxM>
                <Cyl r={0.4} h={STAND.x - PIVOT.x} pos={[(STAND.x + PIVOT.x) / 2, PIVOT.y, STAND.z]} rot={[0, 0, Math.PI / 2]}><Steel lit={lit('stand')} /></Cyl>
                <BoxM size={[2, 2, 2]} pos={[STAND.x, MUSCLE_BOTTOM - 1, STAND.z]}><Brass lit={lit('stand')} /></BoxM>
                <Cyl r={0.35} h={STAND.x - MUSCLE_X} pos={[(STAND.x + MUSCLE_X) / 2, MUSCLE_BOTTOM - 1, STAND.z]} rot={[0, 0, Math.PI / 2]}><Steel lit={lit('stand')} /></Cyl>
                <BoxM size={[1.2, 1.2, 1.8]} pos={[MUSCLE_X, MUSCLE_BOTTOM - 1, (STAND.z + PIVOT.z) / 2]}><Brass lit={lit('stand')} /></BoxM>
            </group>

            {/* Writing lever: pivots in a frame on the stand, swings off the drum when not recording */}
            <group ref={swing} position={[PIVOT.x, PIVOT.y, PIVOT.z]}>
                <group userData={{ part: 'lever' }}>
                    {/* Pivot frame and its axle */}
                    <BoxM size={[1.2, 2.2, 0.25]} pos={[0.6, 0, -0.9]}><Brass lit={lit('lever')} /></BoxM>
                    <BoxM size={[1.2, 2.2, 0.25]} pos={[0.6, 0, 0.9]}><Brass lit={lit('lever')} /></BoxM>
                    <BoxM size={[1.2, 0.3, 2.05]} pos={[0.6, 1.1, 0]}><Brass lit={lit('lever')} /></BoxM>
                    <Cyl r={0.12} h={2.2} pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]}><Steel lit={lit('lever')} /></Cyl>
                </group>
                <group ref={lever}>
                    <group userData={{ part: 'lever' }}>
                        {/* Long arm (light aluminium strip) and short arm with the hook for the thread */}
                        <BoxM size={[LONG_ARM - 0.3, 0.5, 0.08]} pos={[-(LONG_ARM - 0.3) / 2, 0, 0]}><Alu lit={lit('lever')} /></BoxM>
                        <BoxM size={[SHORT_ARM + 0.6, 0.6, 0.12]} pos={[(SHORT_ARM + 0.6) / 2 - 0.2, 0, 0]}><Alu lit={lit('lever')} /></BoxM>
                        <mesh position={[SHORT_ARM, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.05, 8, 16]} /><Steel lit={lit('lever')} /></mesh>
                    </group>
                    {/* Writing point: a thin flexible strip at the tip, bent to rest lightly on the paper */}
                    <group userData={{ part: 'stylus' }} position={[-LONG_ARM, 0, 0]}>
                        <BoxM size={[0.9, 0.35, 0.04]} pos={[0.3, 0, 0]}><Paint lit={lit('stylus')} color="#e8dfc8" metal={0} rough={0.6} /></BoxM>
                        <BoxM size={[0.06, 0.12, 0.34]} pos={[0, 0, -0.16]} rot={[0, 0.35, 0]}><Paint lit={lit('stylus')} color="#e8dfc8" metal={0} rough={0.6} /></BoxM>
                    </group>
                </group>
            </group>

            {/* Thread from the hook down to the muscle's tendon */}
            <mesh ref={thread} position={[PIVOT.x + SHORT_ARM, MUSCLE_TOP + 2, PIVOT.z]} userData={{ part: 'muscle' }}>
                <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
                <meshStandardMaterial color="#f5f0e1" roughness={0.9} />
            </mesh>
            {/* Frog gastrocnemius, its femur held in the clamp below and its tendon tied to the lever */}
            <group userData={{ part: 'muscle' }} position={[PIVOT.x + SHORT_ARM, MUSCLE_BOTTOM, PIVOT.z]}>
                <Cyl r={0.25} h={2.2} pos={[0, -0.6, 0]}><Paint lit={lit('muscle')} color="#efe7d6" metal={0} rough={0.6} /></Cyl>
                <group ref={muscle}>
                    <mesh position={[0, MUSCLE_LEN * 0.42, 0]} scale={[1, 2.6, 0.9]}>
                        <sphereGeometry args={[MUSCLE_LEN * 0.19, 24, 16]} />
                        <Paint lit={lit('muscle')} color="#b4485a" metal={0} rough={0.55} />
                    </mesh>
                    <Cyl r={0.08} r2={0.05} h={MUSCLE_LEN * 0.32} pos={[0, MUSCLE_LEN * 0.84, 0]} seg={8}><Paint lit={lit('muscle')} color="#efe9df" metal={0} rough={0.4} /></Cyl>
                </group>
            </group>
        </group>
    );
};

const MUSCLE_LEN = 4.5;
const MUSCLE_X = PIVOT.x + SHORT_ARM;
const STAND = { x: 19.5, z: PIVOT.z + 1.3 };
const MUSCLE_BOTTOM = PIVOT.y - 13;
const MUSCLE_TOP = MUSCLE_BOTTOM + MUSCLE_LEN;

// --- controls, shown in the instrument card --------------------------------------------------------------------
const fmtTurn = (mmPerS: number) => {
    const s = CIRC_MM / mmPerS;
    if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    return `${(s / 3600).toFixed(1)} h`;
};

export const KymographControls: React.FC<{ kymo: Kymo }> = ({ kymo }) => {
    const { state, set, stimulate, newPaper } = kymo;
    const btn = (on: boolean) => `px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${on ? 'bg-amber-500/20 border-amber-400 text-amber-100' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`;
    return (
        <section className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => set({ on: !state.on })} className={`flex-1 ${btn(state.on)}`}>{state.on ? 'Motor ON' : 'Motor OFF'}</button>
                <button onClick={() => set({ leverOn: !state.leverOn })} className={`flex-1 ${btn(state.leverOn)}`}>{state.leverOn ? 'Lever on drum' : 'Lever off drum'}</button>
            </div>

            <div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
                    <span>Paper speed (mm/s)</span><span className="normal-case tracking-normal text-slate-400 font-semibold">one turn: {fmtTurn(SPEEDS[state.speed])}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {SPEEDS.map((v, i) => (
                        <button key={v} onClick={() => set({ speed: i })} className={btn(state.speed === i)}>{v}</button>
                    ))}
                </div>
            </div>

            <label className="block">
                <span className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">
                    <span>Drum height (screw lift)</span><span className="normal-case tracking-normal text-slate-400 font-semibold">{state.lift.toFixed(1)} cm</span>
                </span>
                <input type="range" min={0} max={LIFT_MAX} step={0.1} value={state.lift} onChange={e => set({ lift: +e.target.value })}
                    className="w-full accent-amber-400" aria-label="Drum height" />
            </label>

            <div className="flex gap-2">
                <button onClick={stimulate} className="flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold">Stimulate</button>
                <button onClick={() => set({ contactStim: !state.contactStim })} className={`flex-1 ${btn(state.contactStim)}`}>{state.contactStim ? 'Contact stimulates every turn' : 'Stimulate from contact'}</button>
            </div>
            <button onClick={newPaper} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold">Fresh smoked paper</button>
        </section>
    );
};
