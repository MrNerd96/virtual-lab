import React from 'react';
import { Minus, Plus } from 'lucide-react';

// What is seen in the charged chamber of the WBC count: white cells in Türk's fluid (violet nucleus, pale cytoplasm),
// the debris that settles with them, and dust on the cover slip, which lies in a higher plane of focus. Everything is
// in ruling units (900 = 3 mm) and is scattered over the ruled area and the chamber floor around it.

const FIELD_MIN = -260, FIELD_MAX = 1160;
const SPAN = FIELD_MAX - FIELD_MIN;
const SQUARES = (SPAN * SPAN) / (300 * 300);          // field area in 1 mm squares

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const n2 = (v: number) => v.toFixed(2);
const circlePath = (cx: number, cy: number, r: number) =>
  `M${n2(cx - r)},${n2(cy)}a${n2(r)},${n2(r)} 0 1,0 ${n2(2 * r)},0a${n2(r)},${n2(r)} 0 1,0 ${n2(-2 * r)},0`;
// An irregular rounded outline around a point, as a closed path: a flake of debris, not a cell
const flake = (cx: number, cy: number, r: number, n = 7, jitter = 0.5, squash = 1) => {
  const a0 = rnd(0, Math.PI * 2), tilt = rnd(0, Math.PI);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, rr = r * (1 - jitter + Math.random() * jitter * 1.6);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * squash;
    pts.push([cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy + px * Math.sin(tilt) + py * Math.cos(tilt)]);
  }
  const mid = (i: number) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  let d = `M${n2(mid(0)[0])},${n2(mid(0)[1])}`;
  for (let i = 1; i <= n; i++) { const c = pts[i % n], m = mid(i); d += `Q${n2(c[0])},${n2(c[1])} ${n2(m[0])},${n2(m[1])}`; }
  return d + 'Z';
};

export interface WBC { id: number; x: number; y: number; r: number; nucleus: string }

// White cells at the density of a normal count (about 50 to a 1 mm square), now and then two lying together
export const makeWBCs = (perSquare = 50): WBC[] => {
  const cells: WBC[] = [];
  const total = Math.round(perSquare * SQUARES);
  for (let id = 0; id < total; id++) {
    const kind = Math.random();
    const r = kind < 0.62 ? rnd(1.9, 2.2) : kind < 0.92 ? rnd(1.5, 1.8) : rnd(2.3, 2.6);
    let x = rnd(FIELD_MIN, FIELD_MAX), y = rnd(FIELD_MIN, FIELD_MAX);
    const prev = cells[cells.length - 1];
    if (prev && Math.random() < 0.05) {
      const a = rnd(0, Math.PI * 2), d = (prev.r + r) * 1.05;
      x = prev.x + Math.cos(a) * d; y = prev.y + Math.sin(a) * d;
    }
    let nucleus = '';
    if (kind < 0.62) {
      // Neutrophil: 2 to 4 lobes in a curve
      const lobes = 2 + Math.floor(Math.random() * 3), a0 = rnd(0, Math.PI * 2);
      for (let i = 0; i < lobes; i++) {
        const a = a0 + i * rnd(0.95, 1.3);
        nucleus += circlePath(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * rnd(0.27, 0.33));
      }
    } else if (kind < 0.92) {
      // Lymphocyte: one round nucleus filling most of the cell
      const a = rnd(0, Math.PI * 2);
      nucleus = circlePath(x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, r * 0.74);
    } else {
      // Monocyte: a kidney-shaped nucleus
      const a = rnd(0, Math.PI * 2), dx = Math.cos(a) * r * 0.3, dy = Math.sin(a) * r * 0.3;
      nucleus = circlePath(x + dx, y + dy, r * 0.42) + circlePath(x - dx, y - dy, r * 0.42) + circlePath(x - dy * 0.7, y + dx * 0.7, r * 0.36);
    }
    cells.push({ id, x, y, r, nucleus });
  }
  return cells;
};

export interface Debris {
  grains: { d: string; fill: string; o: number }[];
  specks: { pts: string; fill: string; o: number }[];
  ghosts: { x: number; y: number; r: number }[];
  smudges: { pts: string; o: number }[];
  fibres: { d: string; w: number; o: number }[];
  clumps: { flakes: string[]; grains: string }[];
}

const fibre = (len: [number, number]) => {
  const x = rnd(FIELD_MIN, FIELD_MAX), y = rnd(FIELD_MIN, FIELD_MAX), a = rnd(0, Math.PI * 2), l = rnd(len[0], len[1]);
  const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l, bend = rnd(-0.35, 0.35) * l;
  return `M${n2(x)},${n2(y)}Q${n2((x + ex) / 2 - Math.sin(a) * bend)},${n2((y + ey) / 2 + Math.cos(a) * bend)} ${n2(ex)},${n2(ey)}`;
};

// What lies on the chamber floor with the cells: specks and flakes (a few as big as a cell), the faint ghosts of
// lysed red cells, pale smudges, the odd fibre and a few clumps of squames
export const makeDebris = (): Debris => {
  const at = () => [rnd(FIELD_MIN, FIELD_MAX), rnd(FIELD_MIN, FIELD_MAX)] as const;
  // Fine grain everywhere: thousands of dots, drawn as three paths
  const grains: Debris['grains'] = [['#5b6475', 0.45], ['#7a6a55', 0.4], ['#8a93a6', 0.5]].map(([fill, o]) => {
    let d = '';
    for (let i = 0; i < Math.round(95 * SQUARES); i++) d += circlePath(rnd(FIELD_MIN, FIELD_MAX), rnd(FIELD_MIN, FIELD_MAX), rnd(0.1, 0.26));
    return { d, fill: fill as string, o: o as number };
  });
  const specks: Debris['specks'] = [];
  for (let i = 0; i < Math.round(80 * SQUARES); i++) {
    const [x, y] = at(), kind = Math.random();
    if (kind < 0.13) {
      // A dark roundish speck the size of a small cell: looks like one until the focus is racked
      specks.push({ pts: flake(x, y, rnd(0.9, 1.5), 7, 0.25, rnd(0.75, 1)), fill: pick(['#3f3a5c', '#454a5e', '#4a4038']), o: rnd(0.55, 0.8) });
    } else if (kind < 0.23) {
      specks.push({ pts: flake(x, y, rnd(1.5, 2.6), 8, 0.5, rnd(0.45, 1)), fill: pick(['#6b7280', '#7a6a55', '#8a8f9a']), o: rnd(0.3, 0.5) });
    } else {
      specks.push({ pts: flake(x, y, rnd(0.3, 1.1), 6, 0.55, rnd(0.45, 1)), fill: pick(['#6b7280', '#7a6a55', '#4b5563', '#8a8f9a']), o: rnd(0.3, 0.7) });
    }
  }
  const ghosts: Debris['ghosts'] = [];
  for (let i = 0; i < Math.round(22 * SQUARES); i++) { const [x, y] = at(); ghosts.push({ x, y, r: rnd(0.95, 1.25) }); }
  const smudges: Debris['smudges'] = [];
  for (let i = 0; i < Math.round(4 * SQUARES); i++) { const [x, y] = at(); smudges.push({ pts: flake(x, y, rnd(4, 12), 9, 0.4, rnd(0.5, 1)), o: rnd(0.05, 0.12) }); }
  const fibres: Debris['fibres'] = [];
  for (let i = 0; i < 14; i++) fibres.push({ d: fibre([14, 55]), w: rnd(0.2, 0.45), o: rnd(0.25, 0.45) });
  const clumps: Debris['clumps'] = [];
  for (let i = 0; i < 6; i++) {
    const [x, y] = at(), flakes: string[] = [];
    let grains = '';
    for (let k = 0; k < 7; k++) flakes.push(flake(x + rnd(-6, 6), y + rnd(-5, 5), rnd(2.5, 4.5), 8, 0.35));
    for (let k = 0; k < 22; k++) grains += circlePath(x + rnd(-8, 8), y + rnd(-7, 7), rnd(0.12, 0.3));
    clumps.push({ flakes, grains });
  }
  return { grains, specks, ghosts, smudges, fibres, clumps };
};

export interface Dust { blobs: { pts: string; o: number }[]; fibres: { d: string; w: number; o: number }[] }

// Dust on the cover slip: above the cells, so it is sharp at a different setting of the fine focus
export const makeDust = (): Dust => {
  const blobs: Dust['blobs'] = [];
  for (let i = 0; i < Math.round(2.6 * SQUARES); i++) {
    blobs.push({ pts: flake(rnd(FIELD_MIN, FIELD_MAX), rnd(FIELD_MIN, FIELD_MAX), rnd(1.4, 4.2), 8, 0.5, rnd(0.5, 1)), o: rnd(0.45, 0.8) });
  }
  const fibres: Dust['fibres'] = [];
  for (let i = 0; i < 6; i++) fibres.push({ d: fibre([30, 90]), w: rnd(0.5, 0.9), o: rnd(0.4, 0.6) });
  return { blobs, fibres };
};

export const FloorDebris = React.memo(({ debris }: { debris: Debris }) => (
  <g pointerEvents="none">
    {debris.smudges.map((s, i) => <path key={`m${i}`} d={s.pts} fill="#8792a6" opacity={s.o} />)}
    {debris.grains.map((g, i) => <path key={`n${i}`} d={g.d} fill={g.fill} opacity={g.o} />)}
    {debris.ghosts.map((g, i) => <circle key={`g${i}`} cx={g.x} cy={g.y} r={g.r} fill="none" stroke="#94a3b8" strokeWidth={0.14} opacity={0.3} />)}
    {debris.clumps.map((c, i) => (
      <g key={`c${i}`}>
        {c.flakes.map((p, k) => <path key={k} d={p} fill="#a8b0bf" fillOpacity={0.16} stroke="#7f889b" strokeWidth={0.14} strokeOpacity={0.5} />)}
        <path d={c.grains} fill="#5b6475" opacity={0.5} />
      </g>
    ))}
    {debris.fibres.map((f, i) => <path key={`f${i}`} d={f.d} fill="none" stroke="#5f6877" strokeWidth={f.w} strokeLinecap="round" opacity={f.o} />)}
    {debris.specks.map((s, i) => <path key={`s${i}`} d={s.pts} fill={s.fill} opacity={s.o} />)}
  </g>
));

export const CoverSlipDust = React.memo(({ dust }: { dust: Dust }) => (
  <g pointerEvents="none">
    {dust.blobs.map((b, i) => <path key={i} d={b.pts} fill="#3f4652" opacity={b.o} />)}
    {dust.fibres.map((f, i) => <path key={`f${i}`} d={f.d} fill="none" stroke="#3f4652" strokeWidth={f.w} strokeLinecap="round" opacity={f.o} />)}
  </g>
));

// The three looks of a white cell as the fine focus is racked through it. They are drawn once and cross-faded by
// wbcLook, so moving the focus does not redraw a thousand cells.
// In focus: pale cytoplasm with a fine outline and the violet nucleus
export const WBCSharp = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r} fill="#aab4d7" fillOpacity={0.3} stroke="#5d6585" strokeWidth={0.2} />
        <path d={c.nucleus} fill="#3b2f8f" opacity={0.88} />
      </React.Fragment>
    ))}
  </g>
));
// Just above focus: the cell is refractile, a bright centre in a dark ring. Debris never does this.
export const WBCGlisten = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r * 0.86} fill="#ffffff" stroke="#1e2440" strokeWidth={c.r * 0.4} />)}
  </g>
));
// Further out of focus: a dark round shadow
export const WBCShadow = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r * 1.1} fill="#2a2f55" />)}
  </g>
));

// One look as its own layer over the slide: fading a layer is then done by the compositor, with no repainting
export const CellLayer: React.FC<{ opacity: number; children: React.ReactNode }> = ({ opacity, children }) => (
  <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible" className="absolute inset-0"
    style={{ opacity, visibility: opacity < 0.01 ? 'hidden' : 'visible', willChange: 'opacity' }}>
    {children}
  </svg>
);

// How much of each look shows at a fine-focus setting (-100 to 100, 0 = cells in focus)
export const wbcLook = (focus: number) => {
  const sharp = Math.max(0, 1 - Math.abs(focus) / 14);
  const glisten = focus > 0 ? Math.exp(-(((focus - 18) / 11) ** 2)) : 0;
  const fade = 1 / (1 + (Math.abs(focus) / 55) ** 2);
  const shadow = Math.max(0, 1 - sharp - glisten) * fade * 0.75;
  return { sharp, glisten, shadow };
};

// The plane of the cover-slip dust on the same scale
export const COVER_SLIP_PLANE = 62;

// Fine-focus control: a slider with nudge buttons either side
export const FocusKnob: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const set = (v: number) => onChange(Math.max(-100, Math.min(100, v)));
  const inFocus = Math.abs(value) <= 5;
  const nudge = 'shrink-0 w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-100 flex items-center justify-center border border-slate-600';
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="fine-focus" className="text-sm font-semibold text-slate-200">Fine focus</label>
        <span className={`text-xs font-semibold ${inFocus ? 'text-emerald-400' : 'text-amber-300'}`}>{inFocus ? 'Cells in focus' : 'Out of focus'}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={nudge} onClick={() => set(value - 2)} aria-label="Focus down"><Minus className="w-4 h-4" /></button>
        <input id="fine-focus" type="range" min={-100} max={100} step={1} value={value}
          onChange={e => set(Number(e.target.value))}
          className="flex-1 min-w-0 h-10 accent-indigo-500 cursor-pointer" />
        <button type="button" className={nudge} onClick={() => set(value + 2)} aria-label="Focus up"><Plus className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-slate-400 mt-2 leading-snug">
        Rack the focus slowly up and down. A white cell stays round and glistens just out of focus; debris stays dull and irregular.
      </p>
    </div>
  );
};
