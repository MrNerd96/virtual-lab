import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

// An SVG scene that can be zoomed with the fingers, for the 2D experiments (a "Reset zoom" button appears only while
// zoomed in):
//   • pinch with two fingers (phones), or pinch on a trackpad / Ctrl + mouse wheel (computers)
//   • double-tap or double-click an empty spot to zoom in there, and again to go back to the full view
//   • when zoomed in, drag with one finger or the mouse to move around; at full view a drag scrolls the page
// Taps on the parts of the drawing still work, and a drag or pinch is never taken as a tap.
// The scene's container must be `relative` (for the one-time hint).

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const HINT_KEY = 'zoom-hint-seen';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// overflowVisible: let the drawing spill past its edges at the full view, as some scenes do; it is clipped once zoomed
export const ZoomableSvg: React.FC<{ w: number; h: number; className?: string; overflowVisible?: boolean; children: React.ReactNode }> = ({ w, h, className, overflowVisible, children }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [view, setView] = useState({ zoom: 1, cx: w / 2, cy: h / 2 });
    const viewRef = useRef(view);
    viewRef.current = view;
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{ dist: number; zoom: number; world: { x: number; y: number } } | null>(null);
    const moved = useRef(0);
    const swallowClick = useRef(false);
    const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
    const [hint, setHint] = useState(() => { try { return !localStorage.getItem(HINT_KEY); } catch { return true; } });
    const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

    // A new layout (e.g. the phone is turned) starts from the full view
    useEffect(() => setView({ zoom: 1, cx: w / 2, cy: h / 2 }), [w, h]);

    // Keep the visible window inside the drawing
    const fit = (zoom: number, cx: number, cy: number) => {
        const z = clamp(zoom, 1, MAX_ZOOM);
        const vw = w / z, vh = h / z;
        return { zoom: z, cx: clamp(cx, vw / 2, w - vw / 2), cy: clamp(cy, vh / 2, h - vh / 2) };
    };
    const apply = (next: { zoom: number; cx: number; cy: number }) => {
        const v = fit(next.zoom, next.cx, next.cy);
        viewRef.current = v;
        setView(v);
        if (v.zoom > 1 && hint) {
            setHint(false);
            try { localStorage.setItem(HINT_KEY, '1'); } catch { /* private mode: the hint just shows again next time */ }
        }
    };

    // Screen point → drawing coordinates for the current view (the svg keeps its aspect ratio, so it may be letterboxed)
    const toWorld = (x: number, y: number) => {
        const r = svgRef.current!.getBoundingClientRect();
        const { zoom, cx, cy } = viewRef.current;
        const vw = w / zoom, vh = h / zoom;
        const upp = Math.max(vw / r.width, vh / r.height);
        const offX = (r.width - vw / upp) / 2, offY = (r.height - vh / upp) / 2;
        return { x: cx - vw / 2 + (x - r.left - offX) * upp, y: cy - vh / 2 + (y - r.top - offY) * upp, upp, r, offX, offY };
    };
    // Zoom to `zoom` keeping the drawing point `world` under the screen point (x, y)
    const zoomAt = (zoom: number, world: { x: number; y: number }, x: number, y: number) => {
        const z = clamp(zoom, 1, MAX_ZOOM);
        const r = svgRef.current!.getBoundingClientRect();
        const vw = w / z, vh = h / z;
        const upp = Math.max(vw / r.width, vh / r.height);
        const offX = (r.width - vw / upp) / 2, offY = (r.height - vh / upp) / 2;
        const x0 = world.x - (x - r.left - offX) * upp, y0 = world.y - (y - r.top - offY) * upp;
        apply({ zoom: z, cx: x0 + vw / 2, cy: y0 + vh / 2 });
    };

    const pinchState = () => {
        const [a, b] = [...pointers.current.values()];
        return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 1) moved.current = 0;
        if (pointers.current.size === 2) {
            const { dist, mid } = pinchState();
            const p = toWorld(mid.x, mid.y);
            gesture.current = { dist, zoom: viewRef.current.zoom, world: { x: p.x, y: p.y } };
        }
    };

    useEffect(() => {
        const move = (e: PointerEvent) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            moved.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
            if (pointers.current.size === 2 && gesture.current) {
                const { dist, mid } = pinchState();
                zoomAt(gesture.current.zoom * dist / gesture.current.dist, gesture.current.world, mid.x, mid.y);
            } else if (pointers.current.size === 1 && viewRef.current.zoom > 1) {
                const { upp } = toWorld(e.clientX, e.clientY);
                const v = viewRef.current;
                apply({ zoom: v.zoom, cx: v.cx - (e.clientX - prev.x) * upp, cy: v.cy - (e.clientY - prev.y) * upp });
            }
        };
        const up = (e: PointerEvent) => {
            if (!pointers.current.has(e.pointerId)) return;
            const wasPinch = pointers.current.size === 2 || gesture.current !== null;
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) gesture.current = null;
            if (moved.current > 6 || wasPinch) swallowClick.current = true;
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
    }, [w, h]);

    // Trackpad pinch and Ctrl + wheel arrive as wheel events with ctrlKey; plain scrolling is left to the page
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const wheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const p = toWorld(e.clientX, e.clientY);
            // A mouse-wheel notch (deltaY ≈ 100) is capped to about 1.6×; trackpad pinches send many small deltas
            zoomAt(viewRef.current.zoom * Math.exp(-clamp(e.deltaY, -50, 50) * 0.01), p, e.clientX, e.clientY);
        };
        svg.addEventListener('wheel', wheel, { passive: false });
        return () => svg.removeEventListener('wheel', wheel);
    }, [w, h]);

    // After a drag or pinch, swallow the click it would otherwise produce; a double tap on an empty spot (not on a
    // part that does something) zooms in there, or back out
    const onClickCapture = (e: React.MouseEvent) => {
        if (swallowClick.current) {
            swallowClick.current = false;
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        let el = e.target as Element | null;
        while (el && el !== svgRef.current) {
            if ((el as HTMLElement).style?.cursor === 'pointer') { lastTap.current = null; return; }
            el = el.parentElement;
        }
        const now = performance.now();
        const t = lastTap.current;
        if (t && now - t.t < 350 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 30) {
            lastTap.current = null;
            if (viewRef.current.zoom > 1.05) apply({ zoom: 1, cx: w / 2, cy: h / 2 });
            else zoomAt(DOUBLE_TAP_ZOOM, toWorld(e.clientX, e.clientY), e.clientX, e.clientY);
        } else lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    };

    const vw = w / view.zoom, vh = h / view.zoom;
    return (
        <>
            <svg ref={svgRef} viewBox={`${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`} className={className}
                preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown} onClickCapture={onClickCapture}
                // Zoomed in, every touch belongs to the scene; at full view a one-finger drag still scrolls the page
                style={{ touchAction: view.zoom > 1 ? 'none' : 'pan-y', cursor: view.zoom > 1 ? 'grab' : undefined, overflow: overflowVisible && view.zoom === 1 ? 'visible' : 'hidden' }}>
                {children}
            </svg>
            {/* Back to the full view; shown only while the scene is zoomed in */}
            {view.zoom > 1.01 && (
                <button onClick={() => apply({ zoom: 1, cx: w / 2, cy: h / 2 })}
                    className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/85 hover:bg-slate-800 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-full border border-slate-600 shadow-lg">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset zoom
                </button>
            )}
            {hint && (
                <div className="absolute bottom-2 right-2 z-10 bg-slate-900/80 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-700 pointer-events-none">
                    {coarse ? 'Pinch to zoom' : 'Ctrl + scroll or pinch to zoom'}
                </div>
            )}
        </>
    );
};
