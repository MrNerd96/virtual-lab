import { useState, useEffect } from 'react';

// Pieces shared by the finger-prick practicals (bleeding & clotting time, platelet and eosinophil counts): the finger
// that is cleaned and pricked, the lancet, easing helpers, and the phone layout switch.

export interface Pt { x: number; y: number }

export const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);
export const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// Phones (up to 640 px wide) get the taller layout
export function useNarrowScreen() {
    const query = '(max-width: 640px)';
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const m = window.matchMedia(query);
        const onChange = () => setNarrow(m.matches);
        m.addEventListener('change', onChange);
        return () => m.removeEventListener('change', onChange);
    }, []);
    return narrow;
}

// The caption under the drawing, wrapped into lines that fit the layout
export function wrapCaption(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
        else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
}

// Index finger seen from the side, pointing right, its tip at (x, y), held palm up as for a finger prick: the pulp
// (ball) of the finger on top, the nail underneath at the tip. The prick is made on the ball, a little back from the
// tip (CL Ghai p. 21), and the drop wells up there on top. While being cleaned a spirit swab rubs the ball and the skin
// stays wet until it dries.
export const pulpSite = (x: number, y: number): Pt => ({ x: x - 38, y: y - 52 });
export const Finger = ({ x, y, wet, swab, hoverProps }: { x: number; y: number; wet: number; swab: Pt | null; hoverProps: object }) => (
    <g {...hoverProps}>
        <path d={`M ${x - 420} ${y - 54} L ${x - 130} ${y - 54} C ${x - 60} ${y - 58} ${x} ${y - 42} ${x} ${y - 6} C ${x} ${y + 26} ${x - 24} ${y + 50} ${x - 66} ${y + 50} L ${x - 420} ${y + 50} Z`}
            fill="#e8b48f" stroke="#c48a63" strokeWidth={2} />
        {/* Nail, on the underside */}
        <path d={`M ${x - 120} ${y + 50} L ${x - 56} ${y + 50} Q ${x - 24} ${y + 46} ${x - 16} ${y + 32} Q ${x - 60} ${y + 38} ${x - 120} ${y + 38} Z`} fill="#f5d0c0" stroke="#c48a63" strokeWidth={1.5} />
        {/* Skin creases over the last joint */}
        <path d={`M ${x - 175} ${y - 50} Q ${x - 170} ${y} ${x - 178} ${y + 46}`} fill="none" stroke="#c48a63" strokeWidth={1.5} opacity={0.6} />
        <path d={`M ${x - 186} ${y - 44} Q ${x - 181} ${y} ${x - 188} ${y + 40}`} fill="none" stroke="#c48a63" strokeWidth={1.2} opacity={0.45} />
        {wet > 0 && <ellipse cx={x - 40} cy={y - 46} rx={42} ry={14} fill="rgba(186, 230, 253, 0.55)" opacity={wet} />}
        {swab && (
            <g pointerEvents="none">
                <circle cx={swab.x} cy={swab.y} r={22} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.5} />
                <circle cx={swab.x - 7} cy={swab.y - 6} r={9} fill="#f8fafc" />
                <circle cx={swab.x + 8} cy={swab.y + 5} r={8} fill="#f1f5f9" />
            </g>
        )}
    </g>
);

// Sterile disposable lancet, its point at (x, y), held upright for a quick vertical stab
export const Lancet = ({ x, y }: Pt) => (
    <g transform={`translate(${x} ${y}) rotate(-90)`} pointerEvents="none">
        <path d="M 0 0 L 6 -3 L 30 -3 L 30 3 L 6 3 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
        <rect x={30} y={-9} width={70} height={18} rx={4} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1} />
    </g>
);
