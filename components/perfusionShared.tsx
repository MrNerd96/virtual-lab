import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CheckCircle2 } from 'lucide-react';

// Pieces shared by the isolated-organ practicals of the Mammalian section (Langendorff perfused heart, isolated
// rabbit intestine): easing, the timed animations of the set-up steps, the camera that flies to preset views, the
// record on the slow drum, the clickable list of set-up steps, and a few props (forceps, petri dish, thread).

// --- Easing ---
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (p: number) => (1 - Math.cos(clamp01(p) * Math.PI)) / 2;
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));   // 0..1 across [a, b] of the progress

// --- Timed animations of the set-up steps ---
// Each step plays for a few seconds; its progress (0..1) is read every frame from a ref, so the 3D parts move
// smoothly without waiting for React.
export interface Anim { id: string; t0: number; dur: number }
export type AnimRef = React.MutableRefObject<Anim | null>;
export const progressOf = (a: AnimRef, id: string): number | null => {
    const x = a.current;
    return x && x.id === id ? clamp01((performance.now() - x.t0) / x.dur) : null;
};

// --- Hover labels ---
export type Hover = (label: string | null) => void;
export const hoverProps = (onHover: Hover, label: string) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onHover(label); },
    onPointerOut: () => onHover(null),
});

// --- A choice at a step of the set-up: a wrong one is explained and the step is done again ---
export interface Choice { label: string; ok: boolean; say: string }

// --- Camera ---
// A camera view: what to frame (centre, half-width, half-height) and the direction the camera looks from, so it
// can frame it on any screen shape
export type View = { center: [number, number, number]; halfW: number; halfH: number; from: [number, number, number] };

// Flies the camera to a view. As soon as the student drags or zooms, the flight stops and onUserMove is called, so
// the student keeps the camera instead of being pulled back to the preset view.
type Controls = THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3; update: () => void };
export const FitCamera = ({ view, nonce, onUserMove }: { view: View; nonce: number; onUserMove: () => void }) => {
    const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
    const aspect = useThree(s => s.size.width / s.size.height);
    const controls = useThree(s => s.controls) as unknown as Controls | null;
    const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const placed = useRef(false);
    useEffect(() => {
        if (!controls) return;
        const take = () => { goal.current = null; onUserMove(); };
        controls.addEventListener('start', take);
        return () => controls.removeEventListener('start', take);
    }, [controls, onUserMove]);
    useEffect(() => {
        const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const dist = 1.15 * Math.max(view.halfH / t, view.halfW / (t * aspect));
        const target = new THREE.Vector3(...view.center);
        const pos = target.clone().add(new THREE.Vector3(...view.from).normalize().multiplyScalar(dist));
        if (!placed.current) {
            camera.position.copy(pos);
            camera.lookAt(target);
            if (controls) { controls.target.copy(target); controls.update(); placed.current = true; }
        } else {
            goal.current = { pos, target };
        }
    }, [view, nonce, aspect, camera, controls]);
    useFrame(() => {
        const g = goal.current;
        if (!g || !controls) return;
        camera.position.lerp(g.pos, 0.08);
        controls.target.lerp(g.target, 0.08);
        controls.update();
        if (camera.position.distanceTo(g.pos) < g.pos.distanceTo(g.target) * 0.002) goal.current = null;
    });
    return null;
};

// --- Props ---

// Fine forceps, the tips at the origin, the handles rising up and to the right
export const Forceps = () => (
    <group rotation={[0.35, 0, -0.5]}>
        {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.18, 5.2, 0]} rotation={[0, 0, -s * 0.035]}>
                <boxGeometry args={[0.14, 10.4, 0.06]} /><meshStandardMaterial color="#d4d9de" metalness={0.9} roughness={0.25} />
            </mesh>
        ))}
        <mesh position={[0, 10.4, 0]}><boxGeometry args={[0.6, 0.4, 0.1]} /><meshStandardMaterial color="#b8bec4" metalness={0.9} roughness={0.3} /></mesh>
    </group>
);

// Petri dish of cold physiological fluid, where the tissue lies before it is mounted
export const PetriDish = ({ at, label, onHover }: { at: [number, number, number]; label: string; onHover: Hover }) => (
    <group position={at} {...hoverProps(onHover, label)}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[4.2, 4.2, 1.2, 40, 1, true]} /><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[4.2, 4.2, 0.1, 40]} /><meshPhysicalMaterial color="#eef6fa" transparent opacity={0.35} roughness={0.05} /></mesh>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[4.12, 4.12, 0.7, 40]} /><meshStandardMaterial color="#3b9eea" transparent opacity={0.45} depthWrite={false} /></mesh>
    </group>
);

// A straight piece of thread whose ends are worked out every frame (hidden when ends() returns null)
type V3 = [number, number, number];
export const LiveThread = ({ ends, color = '#f8fafc', r = 0.035 }: { ends: () => [V3, V3] | null; color?: string; r?: number }) => {
    const ref = useRef<THREE.Mesh>(null);
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    useFrame(() => {
        const m = ref.current;
        if (!m) return;
        const e = ends();
        m.visible = !!e;
        if (!e) return;
        const va = new THREE.Vector3(...e[0]), vb = new THREE.Vector3(...e[1]), d = vb.clone().sub(va);
        m.position.copy(va.add(vb).multiplyScalar(0.5));
        m.quaternion.setFromUnitVectors(up, d.clone().normalize());
        m.scale.set(1, Math.max(0.001, d.length()), 1);
    });
    return <mesh ref={ref}><cylinderGeometry args={[r, r, 1, 5, 1]} /><meshBasicMaterial color={color} /></mesh>;
};

// --- The record on the slow drum, as a scrolling graph of the last stretch of paper ---

export interface Sample { x: number; y: number }   // paper time (ms), height of the writing point (cm)
export interface Mark { x: number; text: string; color: string }

export const RecordGraph = ({ data, marks, paperT, running, windowMs, yMin, yMax, yTicks, yLabel, status, speed }: {
    data: Sample[]; marks: Mark[]; paperT: number; running: boolean; windowMs: number;
    yMin: number; yMax: number; yTicks: number[]; yLabel: string;
    status: { text: string; color: string } | null;   // shown at the bottom right
    speed: string;                                    // shown at the bottom left while the drum turns
}) => {
    const W = 900, H = 380;
    const m = { top: 92, right: 20, bottom: 56, left: 44 };
    const plotW = W - m.left - m.right, plotH = H - m.top - m.bottom;
    const x0 = Math.max(0, paperT - windowMs);
    const ys = (y: number) => m.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
    const xs = (x: number) => m.left + ((x - x0) / windowMs) * plotW;
    // Only the part of the paper in view
    let lo = 0, hi = data.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (data[mid].x < x0) lo = mid + 1; else hi = mid; }
    const shown = data.slice(Math.max(0, lo - 1));
    const path = shown.length > 1 ? `M ${shown.map(p => `${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' L ')}` : '';
    const tickStep = windowMs >= 40000 ? 10000 : 5000;
    const ticks: number[] = [];
    for (let t = Math.ceil(x0 / tickStep) * tickStep; t <= x0 + windowMs; t += tickStep) ticks.push(t);
    const seconds: number[] = [];
    for (let t = Math.ceil(x0 / 1000) * 1000; t <= Math.min(paperT, x0 + windowMs); t += 1000) seconds.push(t);
    const timeY = m.top + plotH + 30;
    const seen = marks.filter(mk => mk.x >= x0);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={W} height={H} fill="#020617" rx={8} />
            {yTicks.map(v => (
                <g key={v}>
                    <line x1={m.left} y1={ys(v)} x2={W - m.right} y2={ys(v)} stroke={v === 0 ? '#166534' : '#14532d'} strokeWidth={1} />
                    <text x={m.left - 6} y={ys(v) + 4} textAnchor="end" fill="#166534" fontSize={12} fontFamily="monospace">{v}</text>
                </g>
            ))}
            <text x={m.left - 30} y={m.top + plotH / 2} fill="#166534" fontSize={11} fontFamily="monospace" transform={`rotate(-90 ${m.left - 30} ${m.top + plotH / 2})`} textAnchor="middle">{yLabel}</text>
            {ticks.map(t => (
                <g key={t}>
                    <line x1={xs(t)} y1={m.top} x2={xs(t)} y2={m.top + plotH} stroke="#14532d" strokeWidth={1} />
                    <text x={xs(t)} y={m.top + plotH + 16} textAnchor="middle" fill="#166534" fontSize={12} fontFamily="monospace">{t / 1000}s</text>
                </g>
            ))}
            {/* Time marker: one mark a second */}
            <line x1={m.left} y1={timeY} x2={xs(Math.min(paperT, x0 + windowMs))} y2={timeY} stroke="#4b5563" strokeWidth={1.5} />
            {seconds.map(t => <line key={t} x1={xs(t)} y1={timeY - 6} x2={xs(t)} y2={timeY} stroke="#6b7280" strokeWidth={1.5} />)}
            <text x={W - m.right} y={timeY + 16} textAnchor="end" fill="#4b5563" fontSize={11} fontFamily="monospace">time marker, 1 s</text>

            <path d={path} fill="none" stroke="#4ade80" strokeWidth={1.6} strokeLinejoin="round" />

            {seen.map((mk, i) => {
                const x = xs(mk.x);
                const textY = i % 2 === 0 ? 28 : 56;
                const anchor = x < 110 ? 'start' : x > W - 130 ? 'end' : 'middle';
                return (
                    <g key={`${mk.x}-${i}`}>
                        <text x={x} y={textY} textAnchor={anchor} fill={mk.color} fontSize={16} fontFamily="monospace" fontWeight="bold">{mk.text}</text>
                        <line x1={x} y1={textY + 6} x2={x} y2={m.top + plotH} stroke={mk.color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
                    </g>
                );
            })}
            {!data.length && <text x={W / 2} y={m.top + plotH / 2} textAnchor="middle" fill="#166534" fontSize={15} fontFamily="monospace">Drum stopped</text>}
            {data.length > 0 && status && (
                <text x={W - m.right - 10} y={m.top + plotH - 8} textAnchor="end" fill={status.color} fontSize={14} fontFamily="monospace" fontWeight="bold">{status.text}</text>
            )}
            {running && <text x={m.left + 10} y={m.top + plotH - 8} fill="#ef4444" fontSize={14} fontFamily="monospace" fontWeight="bold">● {speed}</text>}
        </svg>
    );
};

// --- The steps of the set-up, as a grid of chips: a done step takes you back to it, a later one jumps ahead to it
// with the steps before it done, and the last chip (recording) skips the rest of the set-up ---
export const StepList = ({ steps, step, onBack, onAhead, onRecord, recordLabel = 'Record' }: {
    steps: { id: string; name: string; title: string }[];
    step: number;                 // steps.length = the set-up is done
    onBack: (i: number) => void;
    onAhead: (i: number) => void;
    onRecord: () => void;
    recordLabel?: string;
}) => {
    const done = step >= steps.length;
    const n = steps.length + 1;
    return (
        <ol className="grid grid-cols-5 gap-x-1.5 gap-y-1 text-[11px] font-bold" aria-label="Set-up steps">
            {steps.map((st, i) => {
                const state = i < step ? 'done' : i === step ? 'current' : 'later';
                const look = `flex items-center gap-1 px-1 py-1 rounded-md ${state === 'done' ? 'text-emerald-400' : state === 'current' ? 'text-white bg-slate-800 ring-1 ring-rose-400' : 'text-slate-500'}`;
                const inner = <>
                    {state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 text-center shrink-0">{i + 1}</span>}
                    <span className="truncate">{st.name}</span>
                </>;
                return (
                    <li key={st.id}>
                        {state === 'done' ? (
                            <button onClick={() => onBack(i)} title={`Go back to step ${i + 1} (${st.title})`}
                                className={`w-full text-left hover:bg-slate-800 hover:text-emerald-300 cursor-pointer transition-colors ${look}`}>
                                {inner}
                            </button>
                        ) : state === 'later' ? (
                            <button onClick={() => onAhead(i)} title={`Skip ahead to step ${i + 1} (${st.title})`}
                                className={`w-full text-left hover:bg-slate-800 hover:text-slate-300 cursor-pointer transition-colors ${look}`}>
                                {inner}
                            </button>
                        ) : <div className={look}>{inner}</div>}
                    </li>
                );
            })}
            <li>
                {done ? (
                    <div className="flex items-center gap-1 px-1 py-1 rounded-md text-white bg-slate-800 ring-1 ring-rose-400">
                        <span className="w-3.5 text-center shrink-0">{n}</span><span className="truncate">{recordLabel}</span>
                    </div>
                ) : (
                    <button onClick={onRecord} title="Skip ahead to recording, with the set-up done"
                        className="w-full text-left flex items-center gap-1 px-1 py-1 rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-300 cursor-pointer transition-colors">
                        <span className="w-3.5 text-center shrink-0">{n}</span><span className="truncate">{recordLabel}</span>
                    </button>
                )}
            </li>
        </ol>
    );
};
