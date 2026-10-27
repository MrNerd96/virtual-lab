import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { LABEL_FONT } from './labelFonts';

// Improved Neubauer (Bright-Line) counting chamber, modelled on the photograph in GK Pal (Fig 6.10) and the
// descriptions in CL Ghai and AK Jain. Units are millimetres: a 75 × 33 mm slide, 4 mm thick, lying flat with its
// top surface at y = 0. Across the middle: a moat on each side of the central platform, which is 0.1 mm lower than
// the lateral platforms and split by a transverse trench into two silvered floor pieces, each ruled with a grid.

const LEN = 75, WIDTH = 33, THICK = 4;
const CENTRAL_HALF = 6;      // central platform spans x = ±6
const MOAT_W = 3;            // moats from x = ±6 to ±9
const TRENCH_HALF = 1;       // transverse trench spans z = ±1
const TRENCH_DEPTH = 1;
const DEPTH = 0.1;           // central platform below the lateral platforms
const GRID_Z = 7.6;          // centre of each counting grid
const INK = '#2f3f9e';       // blue print on the glass
// Surfaces laid on a face (silvered floor, grid, frosted moat floors) sit a hair above it and are drawn with a depth
// offset, so they always win over the glass face below. Without both, the depth buffer cannot separate them at
// the full-chamber viewing distance and they flicker (z-fighting).
const LIFT = 0.02;
const inFront = (level: number) => ({ polygonOffset: true, polygonOffsetFactor: -level, polygonOffsetUnits: -4 * level });
const HIGHLIGHT = '#3b82f6';

// The ruled 3 mm × 3 mm grid, drawn once onto a canvas (2048 px, so the smallest 1/20 mm squares stay sharp
// when zoomed in). Corner squares: 16 squares of 1/4 mm. Central square: 25 medium squares in triple lines, each
// of 16 smallest squares. The edge squares carry the triple lines on through, crossed by single 1/4 mm lines.
const gridTexture = (() => {
    let cached: THREE.CanvasTexture | null = null;
    return () => {
        if (cached) return cached;
        const S = 2048, mm = S / 3;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d')!;
        g.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        const line = (x0: number, y0: number, x1: number, y1: number, w: number) => {
            g.lineWidth = w; g.beginPath(); g.moveTo(x0 * mm, y0 * mm); g.lineTo(x1 * mm, y1 * mm); g.stroke();
        };
        const triple = (pos: number, vertical: boolean, from: number, to: number) => {
            for (const d of [-0.0125, 0, 0.0125]) {
                if (vertical) line(pos + d, from, pos + d, to, 3); else line(from, pos + d, to, pos + d, 3);
            }
        };
        // Large squares, bounded by triple lines
        for (let i = 0; i <= 3; i++) { triple(i, true, 0, 3); triple(i, false, 0, 3); }
        for (const [cx, cy] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
            // Corner (WBC) squares: 4 × 4 squares of 1/4 mm
            for (let k = 1; k < 4; k++) { line(cx + k / 4, cy, cx + k / 4, cy + 1, 2.5); line(cx, cy + k / 4, cx + 1, cy + k / 4, 2.5); }
        }
        // Central (RBC) square: 5 × 5 medium squares of 1/5 mm in triple lines, each split into 4 × 4 smallest squares
        for (let k = 1; k < 5; k++) { triple(1 + k / 5, true, 0, 3); triple(1 + k / 5, false, 0, 3); }
        for (let k = 1; k < 20; k++) {
            if (k % 4 === 0) continue;
            line(1 + k / 20, 1, 1 + k / 20, 2, 1.5); line(1, 1 + k / 20, 2, 1 + k / 20, 1.5);
        }
        // Edge squares: single 1/4 mm lines across the triple lines carried on from the centre
        for (let k = 1; k < 4; k++) {
            line(1, k / 4, 2, k / 4, 2.5); line(1, 2 + k / 4, 2, 2 + k / 4, 2.5);
            line(k / 4, 1, k / 4, 2, 2.5); line(2 + k / 4, 1, 2 + k / 4, 2, 2.5);
        }
        cached = new THREE.CanvasTexture(c);
        cached.anisotropy = 8;
        cached.colorSpace = THREE.SRGBColorSpace;
        return cached;
    };
})();

// Parts are tagged with userData.part; the nearest solid part wins over glass, so the grid and the floor pieces can
// be picked through the coverslip and the slide
const partOf = (obj: THREE.Object3D | null): { part: string; glass?: boolean } | null => {
    for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData as { part: string; glass?: boolean };
    return null;
};
const pick = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const tagged = e.intersections.map(i => partOf(i.object)).filter((p): p is { part: string; glass?: boolean } => !!p);
    return (tagged.find(p => !p.glass) ?? tagged[0])?.part ?? null;
};

// Highlighted glass turns solid enough to read as blue; at its normal faintness the tint would hardly show
const Glass = ({ lit, opacity = 0.38 }: { lit: boolean; opacity?: number }) => (
    <meshPhysicalMaterial
        color={lit ? HIGHLIGHT : '#fbf1f7'} transparent opacity={lit ? 0.6 : opacity} roughness={0.06} metalness={0} clearcoat={1}
        envMapIntensity={1.4} depthWrite={false}
        emissive={lit ? HIGHLIGHT : '#000000'} emissiveIntensity={lit ? 0.6 : 0}
    />
);

// A box given by its x, y, z ranges
const Block = ({ x, y, z, children, part }: { x: [number, number]; y: [number, number]; z: [number, number]; children: React.ReactNode; part?: Record<string, unknown> }) => (
    <mesh position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]} userData={part}>
        <boxGeometry args={[x[1] - x[0], y[1] - y[0], z[1] - z[0]]} />
        {children}
    </mesh>
);

const Print = ({ x, z, size, lit, children }: { x: number; z: number; size: number; lit: boolean; children: string }) => (
    <Text font={LABEL_FONT} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={size}
        color={lit ? HIGHLIGHT : INK} anchorX="center" anchorY="middle" textAlign="center" lineHeight={1.15}>
        {children}
    </Text>
);

export const NeubauerChamber: React.FC<{
    active: string | null;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
}> = ({ active, onHover, onSelect }) => {
    const lit = (id: string) => active === id;
    const grid = useMemo(gridTexture, []);
    const outer = CENTRAL_HALF + MOAT_W;
    const halfW = WIDTH / 2;
    const floorTop = -DEPTH;
    const moatFloor = -TRENCH_DEPTH;

    return (
        <group
            onPointerMove={e => { e.stopPropagation(); onHover(pick(e)); }}
            onPointerOut={() => onHover(null)}
            onClick={e => { e.stopPropagation(); const p = pick(e); if (p) onSelect(p); }}
        >
            {/* Base of the slide, below the trenches */}
            <Block x={[-LEN / 2, LEN / 2]} y={[-THICK, moatFloor]} z={[-halfW, halfW]} part={{ part: 'slide', glass: true }}>
                <Glass lit={lit('slide')} />
            </Block>

            {/* Lateral platforms (the outer parts of the slide, on which the coverslip rests) */}
            {[-1, 1].map(side => (
                <Block key={side} x={side < 0 ? [-LEN / 2, -outer] : [outer, LEN / 2]} y={[moatFloor, 0]} z={[-halfW, halfW]} part={{ part: 'platforms', glass: true }}>
                    <Glass lit={lit('platforms')} />
                </Block>
            ))}

            {/* Central platform: two floor pieces, 0.1 mm lower, either side of the transverse trench */}
            {[-1, 1].map(side => (
                <Block key={side} x={[-CENTRAL_HALF, CENTRAL_HALF]} y={[moatFloor, floorTop]} z={side < 0 ? [-halfW, -TRENCH_HALF] : [TRENCH_HALF, halfW]} part={{ part: 'central', glass: true }}>
                    <Glass lit={lit('central')} />
                </Block>
            ))}
            {/* Silvered floor of each floor piece (Bright-Line) */}
            {[-1, 1].map(side => (
                <mesh key={side} position={[0, floorTop + LIFT, side * (TRENCH_HALF + 6.5)]} rotation={[-Math.PI / 2, 0, 0]} userData={{ part: 'central' }}>
                    <planeGeometry args={[7, 12.6]} />
                    <meshStandardMaterial color={lit('central') ? HIGHLIGHT : '#a7afb4'} metalness={0.85} roughness={0.28} {...inFront(1)} />
                </mesh>
            ))}

            {/* Counting grids, at the centre of each floor piece */}
            {[-1, 1].map(side => (
                <mesh key={side} position={[0, floorTop + 2 * LIFT, side * GRID_Z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ part: 'grid' }}>
                    <planeGeometry args={[3, 3]} />
                    <meshBasicMaterial map={grid} transparent color={lit('grid') ? HIGHLIGHT : '#ffffff'} {...inFront(2)} />
                </mesh>
            ))}

            {/* Moats and the transverse trench: ground (frosted) glass floors */}
            <group userData={{ part: 'moats' }}>
                {[-1, 1].map(side => (
                    <mesh key={side} position={[side * (CENTRAL_HALF + MOAT_W / 2), moatFloor + LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[MOAT_W, WIDTH]} />
                        <meshStandardMaterial color={lit('moats') ? HIGHLIGHT : '#ece6ea'} roughness={0.95} transparent opacity={0.65} {...inFront(1)} />
                    </mesh>
                ))}
                <mesh position={[0, moatFloor + LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[CENTRAL_HALF * 2, TRENCH_HALF * 2]} />
                    <meshStandardMaterial color={lit('moats') ? HIGHLIGHT : '#ece6ea'} roughness={0.95} transparent opacity={0.65} {...inFront(1)} />
                </mesh>
            </group>

            {/* Etched print, as on the Bright-Line chamber in the photograph */}
            <group userData={{ part: 'print' }}>
                <Print x={-23} z={-6} size={2.4} lit={lit('print')}>{'Tiefe\nDepth\nProfondeur\n0.100mm'}</Print>
                <Print x={-23} z={11} size={2.4} lit={lit('print')}>0.0025mm²</Print>
                <Print x={23} z={-7} size={2.2} lit={lit('print')}>{'NEUBAUER\nIMPROVED\nBRIGHT-LINE'}</Print>
            </group>

            {/* Coverslip, resting on the lateral platforms across the central platform */}
            <Block x={[-11, 11]} y={[0, 0.4]} z={[-11, 11]} part={{ part: 'coverslip', glass: true }}>
                <Glass lit={lit('coverslip')} opacity={0.18} />
                {/* Its bright edges are what make a real coverslip visible */}
                <Edges color={lit('coverslip') ? HIGHLIGHT : '#8fa0b4'} lineWidth={lit('coverslip') ? 2.5 : 1.5} />
            </Block>
        </group>
    );
};
