import React from 'react';
import { Minus, Plus } from 'lucide-react';

// What is seen in the charged chamber of the WBC count, on a bright-line chamber (white lines on a grey field): white
// cells, the debris that settles with them, and dust on the cover slip, which lies in a higher plane of focus.
// Everything is in ruling units (900 = 3 mm) and is scattered over the ruled area and the chamber floor around it.
//
// How a white cell changes as the fine focus is racked through it is copied from a recording of a real chamber:
//   in focus          the lobes of the nucleus are grey with a dark outline, the cell outline faint
//   one side of focus the lobes shine as bright white dots in a pale cell (the cell is refractile)
//   the other side    each lobe a solid dark disc; further out they run together into one dark round blob, and
//                     then a wide faint shadow (four lobes round a gap can look like a ring on the way: that is
//                     the gap, not a stage of its own)
// Debris only goes soft and stays dull grey on both sides, which is how the two are told apart.

export const WBC_FIELD_BG = '#b4bac0';

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

export interface WBC { id: number; x: number; y: number; r: number; nucleus: string; dots: string }

// White cells at the density of a normal count (about 50 to a 1 mm square), now and then two lying together
// 38 to a 1 mm square is a count of about 7,600 per cubic mm at the usual 1 in 20 dilution: mid-normal
export const makeWBCs = (perSquare = 38): WBC[] => {
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
    let nucleus = '', dots = '';   // the lobes, and a dot at the centre of each for when they shine
    const lobe = (lx: number, ly: number, lr: number) => { nucleus += circlePath(lx, ly, lr); dots += circlePath(lx, ly, lr * 0.62); };
    if (kind < 0.62) {
      // Neutrophil: 3 or 4 lobes (now and then 2) in a curve
      const lobes = Math.random() < 0.12 ? 2 : 3 + Math.floor(Math.random() * 2), a0 = rnd(0, Math.PI * 2);
      for (let i = 0; i < lobes; i++) {
        const a = a0 + i * rnd(1.25, 1.6);
        lobe(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * rnd(0.27, 0.32));
      }
    } else if (kind < 0.92) {
      // Lymphocyte: one round nucleus filling most of the cell
      const a = rnd(0, Math.PI * 2);
      lobe(x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, r * 0.7);
    } else {
      // Monocyte: a kidney-shaped nucleus
      const a = rnd(0, Math.PI * 2), dx = Math.cos(a) * r * 0.3, dy = Math.sin(a) * r * 0.3;
      lobe(x + dx, y + dy, r * 0.42); lobe(x - dx, y - dy, r * 0.42);
      nucleus += circlePath(x - dy * 0.7, y + dx * 0.7, r * 0.36);
    }
    cells.push({ id, x, y, r, nucleus, dots });
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
    {debris.smudges.map((s, i) => <path key={`m${i}`} d={s.pts} fill="#6f7882" opacity={s.o * 1.6} />)}
    {debris.grains.map((g, i) => <path key={`n${i}`} d={g.d} fill={g.fill} opacity={g.o} />)}
    {debris.ghosts.map((g, i) => <circle key={`g${i}`} cx={g.x} cy={g.y} r={g.r} fill="none" stroke="#7d8690" strokeWidth={0.14} opacity={0.35} />)}
    {debris.clumps.map((c, i) => (
      <g key={`c${i}`}>
        {c.flakes.map((p, k) => <path key={k} d={p} fill="#9aa2ab" fillOpacity={0.3} stroke="#6f7882" strokeWidth={0.14} strokeOpacity={0.6} />)}
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

// The looks of a white cell as the fine focus is racked through it. Each is drawn once, as a layer, and wbcLook
// cross-fades the layers, so moving the focus does not redraw a thousand cells.
// In focus: grey lobes with a dark outline in a faintly outlined cell
export const WBCSharp = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r} fill="#8d959e" fillOpacity={0.25} stroke="#5f6770" strokeWidth={0.12} strokeOpacity={0.45} />
        <path d={c.nucleus} fill="#6d6c8c" fillOpacity={0.85} stroke="#38364e" strokeWidth={0.24} />
      </React.Fragment>
    ))}
  </g>
));
// One side of focus: the lobes shine as bright dots in a pale cell with a grey rim (at low power this reads as a
// faint ring with a light centre). Debris never does this.
export const WBCBright = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r * 1.05} fill="#c9cfd5" fillOpacity={0.6} stroke="#737b85" strokeWidth={0.34} strokeOpacity={0.75} />
        <path d={c.dots} fill="#ffffff" />
      </React.Fragment>
    ))}
  </g>
));
// The other side, close to focus: each lobe a solid dark disc, a little swollen, in a faintly darkened cell
export const WBCDarkLobes = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r * 1.05} fill="#7b838d" fillOpacity={0.3} />
        <path d={c.nucleus} fill="#595a70" stroke="#595a70" strokeWidth={0.34} strokeLinejoin="round" />
      </React.Fragment>
    ))}
  </g>
));
// ...and further out: one solid dark round blob
export const WBCBlob = React.memo(({ cells }: { cells: WBC[] }) => (
  <g pointerEvents="none">
    {cells.map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r * 1.1} fill="#62637a" />)}
  </g>
));

// The finest grains again, in white: faded in above focus, where refractile specks shine too
export const GrainShine = React.memo(({ debris }: { debris: Debris }) => (
  <g pointerEvents="none">
    {debris.grains.slice(0, 1).map((g, i) => <path key={i} d={g.d} fill="#f4f6f8" />)}
  </g>
));

// One look as its own layer over the slide: fading a layer is then done by the compositor, with no repainting
export const CellLayer: React.FC<{ opacity: number; children: React.ReactNode }> = ({ opacity, children }) => (
  <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible" className="absolute inset-0"
    style={{ opacity, visibility: opacity < 0.01 ? 'hidden' : 'visible', willChange: 'opacity' }}>
    {children}
  </svg>
);

const mix = (c1: number[], c2: number[], t: number) => `rgb(${c1.map((v, i) => Math.round(v + (c2[i] - v) * t)).join(',')})`;
const step = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// What shows at a fine-focus setting (-100 to 100, 0 = cells and ruling in focus; above 0 is the side on which the
// lobes shine): how much of each look of the cells and how blurred the cell layer is, and for the ruling, which is
// crisp white in focus, how faint it gets as it widens and, on the bright side, how strong the blue core of the band is
// (drawn as a second, less blurred copy of the ruling, so the band keeps pale edges as in the recording)
export const wbcLook = (focus: number) => {
  const up = Math.max(0, focus), down = Math.max(0, -focus);
  return {
    sharp: Math.max(0, 1 - Math.abs(focus) / 10),
    bright: step(2, 13, up) * (1 - 0.9 * step(40, 95, up)),   // far out the cells all but vanish
    darkLobes: step(2, 8, down) * (1 - step(16, 30, down)),
    blob: step(12, 28, down) * (1 - 0.7 * step(35, 95, down)),
    cellDefocus: up * 0.3 + down * 0.9,
    // The ruling stays fairly thin on the dark side while the cells are already blobs; on the bright side it spreads
    // into a wide band
    slideDefocus: up + down * 0.5,
    lineOpacity: 1 - 0.4 * step(25, 95, down) - 0.15 * step(50, 100, up),
    lineWidth: 1 + up * 0.05,
    // Colour fringes of an achromatic objective: the bright lines turn greenish below focus, and above it a
    // yellow-green band with the blue core. (A real effect of the lens, opposite in sign either side of focus.)
    lineColor: down > 0 ? mix([245, 249, 255], [176, 236, 206], step(5, 40, down)) : mix([245, 249, 255], [226, 240, 200], step(8, 45, up)),
    // Small refractile grains of debris also turn pale above focus, as the cells do
    grainShine: step(4, 16, up) * (1 - step(40, 80, up)) * 0.7,
    blueCore: step(4, 26, up) * 0.6,
    blueCoreDefocus: up * 0.4,
    blueCoreWidth: 1 + up * 0.022,
  };
};
export const RULING_BLUE = '#8794ee';

// The plane of the cover-slip dust on the same scale
export const COVER_SLIP_PLANE = 62;

// Fine-focus control: a slider with nudge buttons either side. It says nothing about where focus is or what to
// look for: finding the focus is the student's job, as on a real microscope.
export const FocusKnob: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const set = (v: number) => onChange(Math.max(-100, Math.min(100, v)));
  const nudge = 'shrink-0 w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-100 flex items-center justify-center border border-slate-600';
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-3">
      <label htmlFor="fine-focus" className="block text-sm font-semibold text-slate-200 mb-2">Fine focus</label>
      <div className="flex items-center gap-3">
        <button type="button" className={nudge} onClick={() => set(value - 2)} aria-label="Focus down"><Minus className="w-4 h-4" /></button>
        <input id="fine-focus" type="range" min={-100} max={100} step={1} value={value}
          onChange={e => set(Number(e.target.value))}
          className="flex-1 min-w-0 h-10 accent-indigo-500 cursor-pointer" />
        <button type="button" className={nudge} onClick={() => set(value + 2)} aria-label="Focus up"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
