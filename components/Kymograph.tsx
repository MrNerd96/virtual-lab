import React, { useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT, LABEL_FONT_BOLD } from './labelFonts';

// Electrically driven student kymograph (E-8 type recording drum, as made in India for physiology and pharmacology
// laboratories), with a simple writing lever and a frog muscle to record from. Modelled on makers' photographs.
// Units are centimetres; the bench top is y = 0 and the viewer looks from +z.
//
// The instrument: a white cabinet on rubber feet holding a constant-speed motor and gear box. The speed lever on the
// front slides in a gated slot to one of eight paper speeds (0.12 to 640 mm/s with the 6 inch drum) or neutral (N).
// A neutralising clutch on the side frees the drum from the drive. A chrome spindle rises from the top; the 6 inch
// (15 cm) drum is clamped on it, raised or lowered by the screw lift at its top. A contact arm on the spindle meets a
// spring contact in a clear block once each turn, closing a circuit through its two terminals.
// Glazed paper wrapped round the drum is blackened with soot; a writing point resting lightly on it scratches the soot
// away, leaving a white line. The drum turns so the paper under the writing point moves to the left, and the record
// reads from left to right in time.

export const SPEEDS = [0.12, 0.25, 1.25, 2.5, 12.5, 25, 320, 640];   // paper speed, mm/s; index 8 is neutral
export const NEUTRAL = 8;
const DRUM_R = 7.5, DRUM_H = 15, PAPER_R = 7.56;
const CIRC_MM = 2 * Math.PI * DRUM_R * 10;
const BASE = { w: 19, h: 19, d: 19, y0: 1.2 };       // cabinet, on rubber feet
const BODY_TOP = BASE.y0 + BASE.h;
const BASE_TOP = BODY_TOP + 0.6;                     // top plate
const FRONT = BASE.d / 2;
const DRUM_Y_LOW = BASE_TOP + 3;                     // drum bottom with the screw lift right down, clear of the contact
export const LIFT_MAX = 9;
const SPINDLE_TOP = DRUM_Y_LOW + LIFT_MAX + DRUM_H + 2.5;
// Writing lever: pivot on the stand to the right, long arm running left in a plane just in front of the drum so the
// writing point rests on its front
const PIVOT = new THREE.Vector3(21, 34.5, PAPER_R + 0.32);
const LONG_ARM = PIVOT.x;                            // 21 cm to the writing point on the drum's axis line
const SHORT_ARM = 2.2;                               // pivot to the hook the muscle is tied to
const TWITCH_CM = 3;                                 // rise of the writing point in a full twitch
const HIGHLIGHT = '#3b82f6';
// The spring contact sits at the back left of the top plate. The arm is set on the spindle so that it meets the
// contact when the paper 0.6 rad past the seam is under the writing point: curves started by it fall on clean paper.
const CONTACT_AT = -2.35;                            // direction of the spring contact from the spindle (about y)
const ARM_ANGLE = 0.6 + CONTACT_AT;

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
export interface KymoState { on: boolean; speed: number; clutch: boolean; lift: number; leverOn: boolean; contactStim: boolean }
export const useKymograph = () => {
    const [state, setState] = useState<KymoState>({ on: false, speed: 6, clutch: true, lift: 3.5, leverOn: true, contactStim: false });
    const stimuli = useRef<number[]>([]);
    const clock = useRef(0);
    const [paperKey, setPaperKey] = useState(0);
    const set = useCallback((p: Partial<KymoState>) => setState(s => ({ ...s, ...p })), []);
    const stimulate = useCallback(() => { stimuli.current.push(clock.current); }, []);
    return { state, set, stimulate, stimuli, clock, paperKey, newPaper: () => setPaperKey(k => k + 1) };
};
export type Kymo = ReturnType<typeof useKymograph>;
const drumDriven = (s: KymoState) => s.on && s.clutch && s.speed !== NEUTRAL;

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
const Chrome = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#dfe3e7" metal={1} rough={0.15} />;
const Alu = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#c9cdd1" metal={0.85} rough={0.35} />;
const Brass = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#c9a24a" metal={0.9} rough={0.3} />;
const Black = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#1d1f22" metal={0.2} rough={0.45} />;
const Enamel = ({ lit }: { lit: boolean }) => <Paint lit={lit} color="#ecebe5" metal={0.05} rough={0.45} />;

const Cyl = ({ r, h, pos, rot, seg = 32, r2, children }: { r: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; seg?: number; r2?: number; children: React.ReactNode }) => (
    <mesh position={pos} rotation={rot}><cylinderGeometry args={[r2 ?? r, r, h, seg]} />{children}</mesh>
);
const BoxM = ({ size, pos, rot, children }: { size: [number, number, number]; pos: [number, number, number]; rot?: [number, number, number]; children: React.ReactNode }) => (
    <mesh position={pos} rotation={rot}><boxGeometry args={size} />{children}</mesh>
);
// A knurled knob: a cylinder with fine ridges round it
const Knurled = ({ r, h, pos, rot, lit, color = '#dfe3e7' }: { r: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; lit: boolean; color?: string }) => {
    const geo = useMemo(() => {
        const pts: THREE.Vector2[] = [];
        const n = 40;
        for (let i = 0; i <= n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 0.92;
            pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
        }
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: true, bevelSize: r * 0.04, bevelThickness: r * 0.04, bevelSegments: 1 });
        g.translate(0, 0, -h / 2); g.rotateX(Math.PI / 2);
        return g;
    }, [r, h]);
    return <mesh geometry={geo} position={pos} rotation={rot}><Paint lit={lit} color={color} metal={0.9} rough={0.3} /></mesh>;
};
// Round-headed screws holding a panel, at its four corners (in the panel's own plane, facing +z)
const PanelScrews = ({ w, h, lit }: { w: number; h: number; lit: boolean }) => (
    <>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
            <mesh key={i} position={[sx * (w / 2 - 0.9), sy * (h / 2 - 0.9), 0.02]} scale={[1, 1, 0.45]}>
                <sphereGeometry args={[0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Paint lit={lit} color="#9aa0a6" metal={0.9} rough={0.3} />
            </mesh>
        ))}
    </>
);

// Speed lever slot positions, top (0.12) to bottom (N)
const SLOT_TOP = 16.9, SLOT_STEP = 0.72;
const slotY = (i: number) => SLOT_TOP - i * SLOT_STEP;

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

    const spin = useRef<THREE.Group>(null);      // spindle, drum and contact arm: they turn together
    const drum = useRef<THREE.Group>(null);      // raised and lowered by the screw lift
    const lever = useRef<THREE.Group>(null);     // tilts about the pivot
    const swing = useRef<THREE.Group>(null);     // swings the lever off the drum
    const muscle = useRef<THREE.Group>(null);
    const thread = useRef<THREE.Mesh>(null);
    const speedLever = useRef<THREE.Group>(null);
    const clutchLever = useRef<THREE.Group>(null);
    const rocker = useRef<THREE.Group>(null);
    const lamp = useRef<THREE.MeshStandardMaterial>(null);
    const spark = useRef<THREE.MeshStandardMaterial>(null);
    const sim = useRef({ phi: 0, rate: 0, lift: state.lift, swing: 0, slot: slotY(state.speed), clutch: 1, t: performance.now() / 1000, flash: 0, dirty: 0 });

    useFrame(() => {
        const s = sim.current, st = live.current, g = canvas.getContext('2d')!;
        const real = performance.now() / 1000;
        const dt = Math.min(0.1, real - s.t); s.t = real;
        const now = clock.current + dt;
        // Motor and gear box bring the drum up to speed in a fraction of a second; its angular speed is paper speed / radius
        const target = drumDriven(st) ? (SPEEDS[st.speed] / 10) / DRUM_R : 0;
        // Hand-moved things move smoothly: screw lift, lever swing, speed lever, clutch lever
        const ease = (k: number) => Math.min(1, dt * k);
        s.lift += (st.lift - s.lift) * ease(6);
        s.swing += ((st.leverOn ? 0 : 1) - s.swing) * ease(5);
        s.slot += (slotY(st.speed) - s.slot) * ease(12);
        s.clutch += ((st.clutch ? 1 : 0) - s.clutch) * ease(10);

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
            if (s.rate < 1e-5) s.rate = 0;
            const before = s.phi;
            s.phi -= s.rate * h;             // clockwise seen from above: the front of the drum moves left
            // The contact arm meets the spring contact once a turn
            if (s.rate > 0 && Math.floor((-before - ARM_ANGLE + CONTACT_AT) / (2 * Math.PI)) !== Math.floor((-s.phi - ARM_ANGLE + CONTACT_AT) / (2 * Math.PI))) {
                s.flash = 1;
                if (st.contactStim) stimuli.current.push(tt);
            }
            rise = Math.min(stimuli.current.reduce((sum, t0) => sum + twitch(tt - t0), 0), TWITCH_CM * 1.6);
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
        if (speedLever.current) speedLever.current.position.y = s.slot;
        if (clutchLever.current) clutchLever.current.rotation.z = 0.7 - 1.4 * (1 - s.clutch);
        if (rocker.current) rocker.current.rotation.x = st.on ? -0.22 : 0.22;
        // The muscle shortens by the hook's travel; the thread follows the hook
        const hookDrop = rise * SHORT_ARM / LONG_ARM;
        const hookY = PIVOT.y - 0.3 - hookDrop;
        if (thread.current) { const len = hookY - MUSCLE_TOP; thread.current.scale.y = len; thread.current.position.y = MUSCLE_TOP + len / 2; }
        if (muscle.current) { const c = hookDrop / MUSCLE_LEN; muscle.current.scale.set(1 + c * 2.5, 1 - c, 1 + c * 2.5); }
        if (lamp.current) lamp.current.emissiveIntensity = st.on ? 1.6 : 0;
        s.flash = Math.max(0, s.flash - dt * 8);
        if (spark.current) spark.current.emissiveIntensity = s.flash * 3;
    });

    const contactDir: [number, number] = [Math.sin(CONTACT_AT), Math.cos(CONTACT_AT)];

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* Bench top */}
            <mesh position={[7, -0.5, 2]}>
                <boxGeometry args={[60, 1, 38]} />
                <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
            </mesh>

            {/* Cabinet: white enamelled steel panels screwed to a frame, on rubber feet; the motor and gear box inside */}
            <group userData={{ part: 'base' }}>
                <BoxM size={[BASE.w, BASE.h, BASE.d]} pos={[0, BASE.y0 + BASE.h / 2, 0]}><Enamel lit={lit('base')} /></BoxM>
                <BoxM size={[BASE.w + 0.6, 0.6, BASE.d + 0.6]} pos={[0, BODY_TOP + 0.3, 0]}><Enamel lit={lit('base')} /></BoxM>
                <BoxM size={[BASE.w + 0.3, 0.5, BASE.d + 0.3]} pos={[0, BASE.y0 + 0.25, 0]}><Enamel lit={lit('base')} /></BoxM>
                {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
                    <Cyl key={i} r={1.1} r2={1.2} h={1.2} pos={[sx * (BASE.w / 2 - 1.8), 0.6, sz * (BASE.d / 2 - 1.8)]}><Black lit={lit('base')} /></Cyl>
                ))}
                {/* Panel screws on the front and sides, and on the top plate */}
                <group position={[0, BASE.y0 + BASE.h / 2, FRONT + 0.01]}><PanelScrews w={BASE.w} h={BASE.h} lit={lit('base')} /></group>
                <group position={[BASE.w / 2 + 0.01, BASE.y0 + BASE.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}><PanelScrews w={BASE.d} h={BASE.h} lit={lit('base')} /></group>
                <group position={[-BASE.w / 2 - 0.01, BASE.y0 + BASE.h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}><PanelScrews w={BASE.d} h={BASE.h} lit={lit('base')} /></group>
                <group position={[0, BASE_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><PanelScrews w={BASE.w + 0.6} h={BASE.d + 0.6} lit={lit('base')} /></group>
                {/* Ventilation louvres for the motor, on the left side */}
                {[-1, 1].map(col => [0, 1, 2, 3, 4, 5].map(i => (
                    <BoxM key={`${col}${i}`} size={[0.35, 0.45, 4.2]} pos={[-BASE.w / 2 - 0.12, BASE.y0 + 5 + i * 1.3, col * 3.2]} rot={[0, 0, 0.5]}><Enamel lit={lit('base')} /></BoxM>
                )))}
                {/* A small knurled screw on the top plate */}
                <Knurled r={0.6} h={0.7} pos={[6.5, BASE_TOP + 0.35, 6]} lit={lit('base')} />
            </group>

            {/* Speed lever in its gated slot, on a black plate: eight gear steps and neutral */}
            <group userData={{ part: 'speed' }}>
                <group position={[0, 14, FRONT + 0.06]}>
                    <BoxM size={[5.8, 10.4, 0.12]} pos={[0, 0, 0]}><Paint lit={lit('speed')} color="#141517" metal={0.3} rough={0.5} /></BoxM>
                    <PanelScrews w={5.8} h={10.4} lit={lit('speed')} />
                    <Text font={LABEL_FONT_BOLD} position={[0, 4.5, 0.08]} fontSize={0.36} color="#f2d84b" anchorX="center" anchorY="middle">SPEED MM PER SEC.</Text>
                    <Text font={LABEL_FONT_BOLD} position={[0, 3.95, 0.08]} fontSize={0.3} color="#f2d84b" anchorX="center" anchorY="middle">WITH 6" DIA CYLINDER</Text>
                    <Text font={LABEL_FONT_BOLD} position={[0, -4.25, 0.08]} fontSize={0.32} color="#f2d84b" anchorX="center" anchorY="middle">E-8 RECORDING DRUM</Text>
                    <Text font={LABEL_FONT} position={[0, -4.75, 0.08]} fontSize={0.28} color="#f2d84b" anchorX="center" anchorY="middle">220 V AC</Text>
                    {/* The slot, with a notch for each step */}
                    <BoxM size={[0.75, 7.3, 0.05]} pos={[-1, slotY(4) - 14, 0.07]}><meshStandardMaterial color="#000000" /></BoxM>
                    {[...SPEEDS.map(String), 'N'].map((label, i) => (
                        <group key={label} position={[0, slotY(i) - 14, 0.08]}>
                            <BoxM size={[0.5, 0.12, 0.02]} pos={[-0.38, 0, 0]}><meshStandardMaterial color="#000000" /></BoxM>
                            <Text font={LABEL_FONT_BOLD} position={[1.3, 0, 0]} fontSize={0.4} color="#f2d84b" anchorX="center" anchorY="middle">{label.replace(/^0\./, '.')}</Text>
                        </group>
                    ))}
                </group>
                {/* The lever's chrome handle, standing out of the slot */}
                <group ref={speedLever} position={[0, slotY(state.speed), FRONT + 0.15]}>
                    <BoxM size={[1.3, 0.45, 0.9]} pos={[-1, 0, 0.45]}><Chrome lit={lit('speed')} /></BoxM>
                    <BoxM size={[1.3, 0.25, 0.4]} pos={[-1, 0.3, 0.75]}><Chrome lit={lit('speed')} /></BoxM>
                </group>
            </group>

            {/* Red illuminated rocker switch and the mains socket with its cable, low on the front */}
            <group userData={{ part: 'switch' }}>
                <BoxM size={[1.7, 2.5, 0.25]} pos={[-5.6, 5.6, FRONT + 0.12]}><Black lit={lit('switch')} /></BoxM>
                <group ref={rocker} position={[-5.6, 5.6, FRONT + 0.3]}>
                    <mesh><boxGeometry args={[1.2, 1.95, 0.35]} />
                        <meshStandardMaterial ref={lamp} color={lit('switch') ? HIGHLIGHT : '#c4161c'} emissive="#ff2a1f" emissiveIntensity={0} roughness={0.25} /></mesh>
                </group>
                <Text font={LABEL_FONT_BOLD} position={[-5.6, 3.95, FRONT + 0.02]} fontSize={0.35} color="#3a3a3a" anchorX="center" anchorY="middle">ON</Text>
                <BoxM size={[2.2, 1.6, 0.25]} pos={[-5.6, 2.6, FRONT + 0.12]}><Black lit={lit('switch')} /></BoxM>
                {/* Cable from the socket, out over the front and down to the bench */}
                <mesh position={[-5.6, 2.6, FRONT + 1.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 2.5, 12]} /><Paint lit={lit('switch')} color="#f4f4f2" metal={0} rough={0.6} /></mesh>
                <mesh position={[-5.6, 1.5, FRONT + 3]} rotation={[0.9, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 3, 12]} /><Paint lit={lit('switch')} color="#f4f4f2" metal={0} rough={0.6} /></mesh>
                <mesh position={[-5.6, 0.32, FRONT + 7.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 7, 12]} /><Paint lit={lit('switch')} color="#f4f4f2" metal={0} rough={0.6} /></mesh>
            </group>

            {/* Neutralising clutch on the right side: a lever over a ringed dial, ENG(aged) or DIS ENG(aged) */}
            <group userData={{ part: 'clutch' }} position={[BASE.w / 2 + 0.01, 13, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 0, 0.02]}><circleGeometry args={[3.3, 48]} /><Paint lit={lit('clutch')} color="#f6f5f0" metal={0} rough={0.6} /></mesh>
                <mesh position={[0, 0, 0.03]}><ringGeometry args={[2.85, 3.05, 64]} /><Paint lit={lit('clutch')} color="#d0202a" metal={0} rough={0.5} /></mesh>
                <Text font={LABEL_FONT_BOLD} position={[0, 2.25, 0.05]} fontSize={0.36} color="#c81e28" anchorX="center" anchorY="middle">NEUTRALISING CLUTCH</Text>
                <Text font={LABEL_FONT_BOLD} position={[-1.7, -2.1, 0.05]} fontSize={0.36} color="#c81e28" anchorX="center" anchorY="middle">ENG</Text>
                <Text font={LABEL_FONT_BOLD} position={[1.6, -2.1, 0.05]} fontSize={0.36} color="#c81e28" anchorX="center" anchorY="middle">DIS ENG</Text>
                <Cyl r={0.55} h={0.5} pos={[0, 0, 0.25]} rot={[Math.PI / 2, 0, 0]}><Chrome lit={lit('clutch')} /></Cyl>
                <group ref={clutchLever} position={[0, 0, 0.55]}>
                    <Cyl r={0.28} h={2.4} pos={[0, 1.2, 0.2]}><Chrome lit={lit('clutch')} /></Cyl>
                    <Cyl r={0.33} h={1.2} pos={[0, 2.5, 0.75]} rot={[Math.PI / 2, 0, 0]}><Chrome lit={lit('clutch')} /></Cyl>
                </group>
            </group>

            {/* Spring contact in a clear acrylic block with two terminals (red and black), at the back left of the top */}
            <group userData={{ part: 'contact' }} position={[contactDir[0] * 8.5, BASE_TOP, contactDir[1] * 8.5]} rotation={[0, CONTACT_AT, 0]}>
                <mesh position={[0, 1.1, 0]}>
                    <boxGeometry args={[5, 2.2, 2.4]} />
                    <meshPhysicalMaterial color={lit('contact') ? HIGHLIGHT : '#e8f3f6'} transparent opacity={0.45} roughness={0.08} clearcoat={1} depthWrite={false} />
                </mesh>
                {[-1, 1].map(sx => (
                    <group key={sx} position={[sx * 1.4, 2.2, 0]}>
                        <Knurled r={0.5} h={1.1} pos={[0, 0.55, 0]} lit={lit('contact')} color={sx < 0 ? '#c0161c' : '#1d1f22'} />
                        <Cyl r={0.18} h={0.5} pos={[0, 1.3, 0]}><Brass lit={lit('contact')} /></Cyl>
                    </group>
                ))}
                {/* The spring leaf, reaching in towards the spindle */}
                <BoxM size={[0.08, 1, 3.8]} pos={[0, 1.6, -3.1]}><Brass lit={lit('contact')} /></BoxM>
                <mesh position={[0, 1.6, -5]}>
                    <sphereGeometry args={[0.16, 10, 8]} />
                    <meshStandardMaterial ref={spark} color="#fde68a" emissive="#fff3b0" emissiveIntensity={0} />
                </mesh>
            </group>

            {/* Fixed collar where the spindle comes out of the top plate */}
            <group userData={{ part: 'spindle' }}>
                <Cyl r={2.6} h={0.35} pos={[0, BASE_TOP + 0.17, 0]} seg={40}><Chrome lit={lit('spindle')} /></Cyl>
            </group>

            {/* Everything that turns: spindle, contact arm, screw lift and drum */}
            <group ref={spin}>
                <group userData={{ part: 'spindle' }}>
                    <Cyl r={1.5} r2={1.3} h={1.2} pos={[0, BASE_TOP + 0.9, 0]} seg={32}><Chrome lit={lit('spindle')} /></Cyl>
                    <Cyl r={0.75} h={SPINDLE_TOP - BASE_TOP} pos={[0, (SPINDLE_TOP + BASE_TOP) / 2, 0]} seg={24}><Chrome lit={lit('spindle')} /></Cyl>
                </group>
                {/* Contact arm: a black clamp on the spindle with a pointed arm */}
                <group userData={{ part: 'contact' }} rotation={[0, ARM_ANGLE, 0]}>
                    <Cyl r={1.2} h={1} pos={[0, BASE_TOP + 2, 0]}><Black lit={lit('contact')} /></Cyl>
                    <BoxM size={[0.6, 0.5, 3.2]} pos={[0, BASE_TOP + 2.1, 2.1]}><Black lit={lit('contact')} /></BoxM>
                    <mesh position={[0, BASE_TOP + 2.1, 3.9]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.32, 0.9, 12]} /><Black lit={lit('contact')} /></mesh>
                    <Cyl r={0.25} h={0.7} pos={[0.85, BASE_TOP + 2, 0]} rot={[0, 0, Math.PI / 2]}><Chrome lit={lit('contact')} /></Cyl>
                </group>
                {/* Screw lift: stepped, knurled head on top of the spindle */}
                <group userData={{ part: 'lift' }}>
                    <Cyl r={1} h={1.2} pos={[0, SPINDLE_TOP - 0.2, 0]}><Chrome lit={lit('lift')} /></Cyl>
                    <Knurled r={0.85} h={1.8} pos={[0, SPINDLE_TOP + 1.3, 0]} lit={lit('lift')} />
                    <Cyl r={0.5} h={0.5} pos={[0, SPINDLE_TOP + 2.45, 0]}><Chrome lit={lit('lift')} /></Cyl>
                </group>

                <group ref={drum} position={[0, DRUM_Y_LOW + state.lift, 0]}>
                    {/* Drum: a 6 inch black cylinder with cross-spoked ends, clamped on the spindle by a lever at its top hub */}
                    <group userData={{ part: 'drum' }}>
                        <mesh position={[0, DRUM_H / 2, 0]}><cylinderGeometry args={[DRUM_R, DRUM_R, DRUM_H, 96, 1, true]} />
                            <meshStandardMaterial color={lit('drum') ? HIGHLIGHT : '#16171a'} metalness={0.3} roughness={0.6} side={THREE.DoubleSide} /></mesh>
                        {[0.15, DRUM_H - 0.4].map(y => (
                            <group key={y} position={[0, y, 0]}>
                                <BoxM size={[DRUM_R * 2 - 0.2, 0.5, 0.9]} pos={[0, 0, 0]}><Black lit={lit('drum')} /></BoxM>
                                <BoxM size={[0.9, 0.5, DRUM_R * 2 - 0.2]} pos={[0, 0, 0]}><Black lit={lit('drum')} /></BoxM>
                                <Cyl r={1.6} h={1} pos={[0, 0, 0]}><Black lit={lit('drum')} /></Cyl>
                            </group>
                        ))}
                        {/* Clamp sleeve above the top hub, with its lever */}
                        <Cyl r={1.25} h={2} pos={[0, DRUM_H + 0.9, 0]}><Chrome lit={lit('drum')} /></Cyl>
                        <BoxM size={[0.5, 0.5, 1.6]} pos={[0, DRUM_H + 0.6, 1.9]}><Chrome lit={lit('drum')} /></BoxM>
                        <Cyl r={0.32} h={2.8} pos={[1.2, DRUM_H + 1.1, 2.6]} rot={[0, 0, -1.1]}><Chrome lit={lit('drum')} /></Cyl>
                    </group>
                    {/* Smoked glazed paper round the drum */}
                    <mesh position={[0, DRUM_H / 2, 0]} userData={{ part: 'paper' }}>
                        <cylinderGeometry args={[PAPER_R, PAPER_R, DRUM_H, 128, 1, true]} />
                        <meshStandardMaterial map={tex} color={lit('paper') ? '#9ec5ff' : '#ffffff'} roughness={0.85} metalness={0} />
                    </mesh>
                </group>
            </group>

            {/* Lever stand: triangular cast foot and upright rod, with boss heads clamping the lever's pivot frame and,
                lower down, the femur of the muscle */}
            <group userData={{ part: 'stand' }}>
                <TriangleFoot pos={[STAND.x + 1.5, 0, STAND.z - 1]} lit={lit('stand')} />
                <Cyl r={0.55} h={44} pos={[STAND.x, 22.6, STAND.z]} seg={20}><Chrome lit={lit('stand')} /></Cyl>
                <BoxM size={[2, 2, 2]} pos={[STAND.x, PIVOT.y, STAND.z]}><Alu lit={lit('stand')} /></BoxM>
                <Knurled r={0.5} h={1} pos={[STAND.x, PIVOT.y, STAND.z - 1.4]} rot={[Math.PI / 2, 0, 0]} lit={lit('stand')} color="#1d1f22" />
                <Cyl r={0.4} h={STAND.x - PIVOT.x} pos={[(STAND.x + PIVOT.x) / 2, PIVOT.y, STAND.z]} rot={[0, 0, Math.PI / 2]}><Chrome lit={lit('stand')} /></Cyl>
                <BoxM size={[2, 2, 2]} pos={[STAND.x, MUSCLE_BOTTOM - 1, STAND.z]}><Alu lit={lit('stand')} /></BoxM>
                <Knurled r={0.5} h={1} pos={[STAND.x, MUSCLE_BOTTOM - 1, STAND.z - 1.4]} rot={[Math.PI / 2, 0, 0]} lit={lit('stand')} color="#1d1f22" />
                <Cyl r={0.35} h={STAND.x - MUSCLE_X} pos={[(STAND.x + MUSCLE_X) / 2, MUSCLE_BOTTOM - 1, STAND.z]} rot={[0, 0, Math.PI / 2]}><Chrome lit={lit('stand')} /></Cyl>
                <BoxM size={[1.2, 1.2, 1.8]} pos={[MUSCLE_X, MUSCLE_BOTTOM - 1, (STAND.z + PIVOT.z) / 2]}><Alu lit={lit('stand')} /></BoxM>
            </group>

            {/* Writing lever: pivots in a frame on the stand, swings off the drum when not recording */}
            <group ref={swing} position={[PIVOT.x, PIVOT.y, PIVOT.z]}>
                <group userData={{ part: 'lever' }}>
                    <BoxM size={[1.2, 2.2, 0.25]} pos={[0.6, 0, -0.9]}><Brass lit={lit('lever')} /></BoxM>
                    <BoxM size={[1.2, 2.2, 0.25]} pos={[0.6, 0, 0.9]}><Brass lit={lit('lever')} /></BoxM>
                    <BoxM size={[1.2, 0.3, 2.05]} pos={[0.6, 1.1, 0]}><Brass lit={lit('lever')} /></BoxM>
                    <Cyl r={0.12} h={2.2} pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]}><Chrome lit={lit('lever')} /></Cyl>
                </group>
                <group ref={lever}>
                    <group userData={{ part: 'lever' }}>
                        {/* Long arm (light aluminium strip) and short arm with the hook for the thread */}
                        <BoxM size={[LONG_ARM - 0.3, 0.5, 0.08]} pos={[-(LONG_ARM - 0.3) / 2, 0, 0]}><Alu lit={lit('lever')} /></BoxM>
                        <BoxM size={[SHORT_ARM + 0.6, 0.6, 0.12]} pos={[(SHORT_ARM + 0.6) / 2 - 0.2, 0, 0]}><Alu lit={lit('lever')} /></BoxM>
                        <mesh position={[SHORT_ARM, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.05, 8, 16]} /><Chrome lit={lit('lever')} /></mesh>
                    </group>
                    {/* Writing point: a thin flexible strip at the tip, bent to rest lightly on the paper */}
                    <group userData={{ part: 'stylus' }} position={[-LONG_ARM, 0, 0]}>
                        <BoxM size={[0.9, 0.35, 0.04]} pos={[0.3, 0, 0]}><Paint lit={lit('stylus')} color="#e8dfc8" metal={0} rough={0.6} /></BoxM>
                        <BoxM size={[0.06, 0.12, 0.34]} pos={[0, 0, -0.16]} rot={[0, 0.35, 0]}><Paint lit={lit('stylus')} color="#e8dfc8" metal={0} rough={0.6} /></BoxM>
                    </group>
                </group>
            </group>

            {/* Thread from the hook down to the muscle's tendon */}
            <mesh ref={thread} position={[MUSCLE_X, MUSCLE_TOP + 2, PIVOT.z]} userData={{ part: 'muscle' }}>
                <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
                <meshStandardMaterial color="#f5f0e1" roughness={0.9} />
            </mesh>
            {/* Frog gastrocnemius, its femur held in the clamp below and its tendon tied to the lever */}
            <group userData={{ part: 'muscle' }} position={[MUSCLE_X, MUSCLE_BOTTOM, PIVOT.z]}>
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
const MUSCLE_BOTTOM = PIVOT.y - 13;
const MUSCLE_TOP = MUSCLE_BOTTOM + MUSCLE_LEN;
const MUSCLE_X = PIVOT.x + SHORT_ARM;
const STAND = { x: 26, z: PIVOT.z + 1.3 };

// Heavy triangular cast-iron foot of the lever stand
const TriangleFoot = ({ pos, lit }: { pos: [number, number, number]; lit: boolean }) => {
    const geo = useMemo(() => {
        const s = new THREE.Shape();
        const r = 7;
        [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3].forEach((a, i) => {
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
        });
        s.closePath();
        const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.3, bevelSegments: 3 });
        g.rotateX(-Math.PI / 2);
        return g;
    }, []);
    return (
        <group position={pos} rotation={[0, 0.3, 0]}>
            <mesh geometry={geo} position={[0, 0.3, 0]}><Paint lit={lit} color="#1f2a3a" metal={0.4} rough={0.5} /></mesh>
        </group>
    );
};

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
    const turn = !drumDriven(state) ? (state.on ? 'drum not driven' : 'motor off') : `one turn: ${fmtTurn(SPEEDS[state.speed])}`;
    return (
        <section className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => set({ on: !state.on })} className={`flex-1 ${btn(state.on)}`}>{state.on ? 'Motor ON' : 'Motor OFF'}</button>
                <button onClick={() => set({ clutch: !state.clutch })} className={`flex-1 ${btn(state.clutch)}`}>{state.clutch ? 'Clutch engaged' : 'Clutch disengaged'}</button>
            </div>

            <div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
                    <span>Speed lever (mm/s)</span><span className="normal-case tracking-normal text-slate-400 font-semibold">{turn}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {[...SPEEDS.map(String), 'N'].map((v, i) => (
                        <button key={v} onClick={() => set({ speed: i })} className={btn(state.speed === i)}>{v === 'N' ? 'N (neutral)' : v}</button>
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
            <div className="flex gap-2">
                <button onClick={() => set({ leverOn: !state.leverOn })} className={`flex-1 ${btn(state.leverOn)}`}>{state.leverOn ? 'Lever on drum' : 'Lever off drum'}</button>
                <button onClick={newPaper} className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold">Fresh smoked paper</button>
            </div>
        </section>
    );
};
