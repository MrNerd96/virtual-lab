import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { LabEnvironment } from './LabEnvironment';
import { DilutingPipette } from './DilutingPipette';
import { NeubauerChamber } from './NeubauerChamber';
import { instrumentById, type InstrumentId } from '../instruments';

// One screen for every instrument: a 3D model to turn and explore on the left (top on phones), and the
// instrument card on the right with its parts. Hover or tap a part, in the
// model or in the list, to highlight it and show its note.

const Model: React.FC<{ id: InstrumentId; active: string | null; onHover: (p: string | null) => void; onSelect: (p: string) => void }> = ({ id, ...rest }) => {
    switch (id) {
        case 'rbc-pipette': return <DilutingPipette kind="rbc" {...rest} />;
        case 'wbc-pipette': return <DilutingPipette kind="wbc" {...rest} />;
        case 'neubauer-chamber': return <NeubauerChamber {...rest} />;
    }
};

// A camera view: what to frame (centre, half-width, half-height) and the direction the camera looks from, so it
// can frame it on any screen shape
type View = { center: [number, number, number]; halfW: number; halfH: number; from: [number, number, number] };

// The whole model for each instrument (pipettes from the front, the chamber from above), plus close-up views of
// parts too small to see from there, which the camera flies to when that part is selected
const VIEWS: Record<InstrumentId, { all: View; closeUp?: Record<string, View> }> = {
    'rbc-pipette': { all: { center: [0.25, -1.0, 0], halfW: 5.9, halfH: 1.6, from: [0.2, 0.3, 1] } },
    'wbc-pipette': { all: { center: [0.25, -1.0, 0], halfW: 5.7, halfH: 1.6, from: [0.2, 0.3, 1] } },
    'neubauer-chamber': {
        all: { center: [0, -1, 0], halfW: 44, halfH: 21, from: [0.15, 1.3, 0.9] },
        closeUp: { grid: { center: [0, -0.1, 7.6], halfW: 1.7, halfH: 1.7, from: [0, 1, 0.3] } },
    },
};

// Moves the camera to frame the current view: at once for the first view and when the canvas changes shape
// (e.g. a phone is turned), smoothly when flying to or from a close-up
const FitCamera: React.FC<{ id: InstrumentId; part: string | null }> = ({ id, part }) => {
    const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
    const aspect = useThree(s => s.size.width / s.size.height);
    const controls = useThree(s => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
    const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const placed = useRef(false);
    const closeUp = (part && VIEWS[id].closeUp?.[part]) || null;
    const view = closeUp ?? VIEWS[id].all;

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
    }, [view, aspect, camera, controls]);

    useFrame(() => {
        const g = goal.current;
        if (!g || !controls) return;
        camera.position.lerp(g.pos, 0.12);
        controls.target.lerp(g.target, 0.12);
        controls.update();
        if (camera.position.distanceTo(g.pos) < g.pos.distanceTo(g.target) * 0.002) goal.current = null;
    });
    return null;
};

const LIGHT_BG = '#CBD5E1';
const DARK_BG = '#2F3E46';

export const InstrumentViewer: React.FC<{ id: InstrumentId; onBack: () => void; onOpen: (view: string) => void }> = ({ id, onBack, onOpen }) => {
    const instrument = instrumentById(id);
    const [hovered, setHovered] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [sceneBg, setSceneBg] = useState(LIGHT_BG);
    const active = hovered ?? selected;
    const activePart = instrument.parts.find(p => p.id === active);
    const compare = instrument.compareWith && instrumentById(instrument.compareWith);

    return (
        <div className="w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans">
            <header className="z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700">
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div>
                        <h1 className="text-base sm:text-xl font-bold tracking-tight leading-tight">{instrument.name}</h1>
                        <p className="text-xs text-slate-400">{instrument.alsoCalled}</p>
                    </div>
                </div>
                <button
                    onClick={() => setSceneBg(bg => bg === LIGHT_BG ? DARK_BG : LIGHT_BG)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors"
                    title="Toggle Canvas Background"
                >
                    {sceneBg === LIGHT_BG ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </header>

            <main className="flex-1 min-h-0 flex flex-col md:flex-row">
                {/* 3D model */}
                <div className="relative h-[42%] md:h-auto md:flex-1 flex-none">
                    {/* The style background shows while the model and its fonts are still loading */}
                    <Canvas camera={{ position: [3, 4, 14], fov: 35 }} style={{ background: sceneBg }} onPointerMissed={() => setSelected(null)}>
                        <color key={sceneBg} attach="background" args={[sceneBg]} />
                        <LabEnvironment variant="studio" />
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 8, 6]} intensity={1} />
                        <Model id={id} active={active} onHover={setHovered} onSelect={setSelected} />
                        <OrbitControls makeDefault enablePan={false} zoomToCursor />
                        <FitCamera id={id} part={selected} />
                    </Canvas>

                    {activePart ? (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-lg">
                            <div className="text-blue-300 font-bold text-[11px] uppercase tracking-wider">{activePart.name}</div>
                            <div className="text-slate-200 text-xs leading-snug mt-0.5">{activePart.note}</div>
                        </div>
                    ) : (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none">
                            Drag to turn · tap a part to name it
                        </div>
                    )}
                </div>

                {/* Instrument card */}
                <aside className="flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm">
                    <p className="text-slate-300">{instrument.summary}</p>

                    <section>
                        <h2 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Parts</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {instrument.parts.map(p => (
                                <button key={p.id}
                                    onClick={() => setSelected(s => s === p.id ? null : p.id)}
                                    onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                                    className={`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${active === p.id ? 'bg-blue-600/20 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                >{p.name}</button>
                            ))}
                        </div>
                    </section>

                    <div className="flex flex-col gap-2">
                        {compare && (
                            <button onClick={() => onOpen(`instrument-${compare.id}`)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors">
                                Compare with the {compare.name}
                            </button>
                        )}
                        <button onClick={() => onOpen(instrument.experiment.view)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors">
                            Open the {instrument.experiment.label} experiment
                        </button>
                    </div>
                </aside>
            </main>
        </div>
    );
};
