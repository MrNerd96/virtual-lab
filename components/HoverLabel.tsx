import React, { useState } from 'react';

// Part names on hover for the 2D (SVG) experiments, styled like the label in the 3D amphibian modules.
// `hover(name)` gives the pointer handlers for an SVG element; <HoverLabel> shows the current name at the
// top left of the scene (its container must be `relative`). On touch screens a tap shows the name.
export const useHoverLabel = () => {
    const [label, setLabel] = useState<string | null>(null);
    const hover = (name: string) => ({
        onPointerEnter: () => setLabel(name),
        onPointerLeave: () => setLabel(current => (current === name ? null : current)),
    });
    return { label, hover };
};

export const HoverLabel = ({ label }: { label: string | null }) => (
    label ? (
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-sm border border-slate-700 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
            {label}
        </div>
    ) : null
);

// Invisible hover area over a part of the drawing
export const HoverZone = ({ x, y, w, h, ...handlers }: { x: number; y: number; w: number; h: number } & React.SVGProps<SVGRectElement>) => (
    <rect x={x} y={y} width={w} height={h} fill="transparent" {...handlers} />
);
