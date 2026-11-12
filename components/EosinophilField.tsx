import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eyepiece, NeubauerRuling } from './CountingMicroscope';
import type { FieldSample, ScopeProps, Subject } from './HemocytometerCount';
import {
  FIELD_MIN, FIELD_MAX, SQUARES, W_SQUARES, rnd, circlePath, flake, placeCell, makeDebris, makeDust,
  wbcLook, bubbleLook, FloorDebris, CoverSlipDust, GrainShine, BubbleSharp, BubbleUp, BubbleDown, CellLayer, FocusKnob,
  COVER_SLIP_PLANE, RULING_BLUE, type Debris, type Dust, type Thing,
} from './WBCField';

// What is seen in the chamber in the absolute eosinophil count, on the same bright-line chamber and with the same fine
// focus as the WBC count. Pilot's fluid has lysed the red cells (propylene glycol) and the other white cells (sodium
// carbonate) and stained the granules of the eosinophils with phloxine (GK Pal p. 90; CL Ghai p. 87), so the field
// holds a few eosinophils, "pink cells with nuclei" (AK Jain p. 58), among ghosts of red cells, the pale unstained
// remains of other white cells, debris, and the odd crystal of phloxine, which is red too but angular and has no
// granules. Everything is in ruling units (900 = 3 mm).
//
// An eosinophil is 10-14 µm across (about 2 units in radius) with a two-lobed nucleus and coarse granules that fill
// the cell. Through the fine focus it behaves as the white cells of the WBC count do: its granules are refractile, so
// they shine on one side of focus and the cell goes dark on the other, which stain precipitate and debris never do.

// The field has a faint pink cast from the phloxine in the fluid
export const AEC_FIELD_BG = '#bdb4ba';
const PHLOXINE_CRYSTAL = '#a3123f';

export interface Eos { id: number; x: number; y: number; r: number; lobes: string; granules: string; shine: string }
interface Remnant { pts: string; o: number }
export interface EosSample extends FieldSample {
  cells: Eos[];
  places: Map<number, { square: number; note: string }>;
  remnants: Remnant[];
  things: Thing[];          // everything that is not an eosinophil but can be tapped
  debris: Debris;
  dust: Dust;
}

const makeEos = (id: number, x: number, y: number): Eos => {
  const r = rnd(1.8, 2.2);
  // Two lobes, side by side like a pair of spectacles
  const a = rnd(0, Math.PI * 2), d = r * rnd(0.36, 0.42), lr = r * rnd(0.36, 0.41);
  const lobes = circlePath(x + Math.cos(a) * d, y + Math.sin(a) * d, lr) + circlePath(x - Math.cos(a) * d, y - Math.sin(a) * d, lr);
  // Coarse granules packed through the cell; a few of them, drawn larger, are what shines above focus
  let granules = '', shine = '';
  for (let i = 0; i < 40; i++) {
    const ga = rnd(0, Math.PI * 2), gr = r * 0.86 * Math.sqrt(Math.random());
    const gx = x + Math.cos(ga) * gr, gy = y + Math.sin(ga) * gr;
    granules += circlePath(gx, gy, r * rnd(0.085, 0.13));
    if (i % 4 === 0) shine += circlePath(gx, gy, r * 0.15);
  }
  return { id, x, y, r, lobes, granules, shine };
};

// A new field for a subject whose four W squares hold a count in the range subject.n. That many eosinophils are put
// inside the W squares (some on a top or left line, which are counted), a few on bottom or right lines (not counted),
// and the same suspension is spread at the same density over the rest of the chamber floor.
export const makeEosSample = (subject: Subject): EosSample => {
  const n = Math.round(rnd(subject.n[0], subject.n[1] + 0.99) - 0.5);
  const cells: Eos[] = [];
  const clear = (x: number, y: number) => cells.every(c => Math.hypot(c.x - x, c.y - y) > 7);
  const add = (pos: () => [number, number]) => {
    for (let tries = 0; tries < 40; tries++) {
      const [x, y] = pos();
      if (clear(x, y)) { cells.push(makeEos(cells.length, x, y)); return; }
    }
  };
  const inside = () => rnd(5, 295);
  for (let i = 0; i < n; i++) {
    const [x0, y0] = W_SQUARES[Math.floor(Math.random() * 4)];
    // About one in five lies on the square's top or left line; with three or more, the first one always does
    const u = i === 0 && n >= 3 ? rnd(0, 0.2) : Math.random();
    add(() => (u < 0.1 ? [x0 + rnd(-1, 1), y0 + inside()] : u < 0.2 ? [x0 + inside(), y0 + rnd(-1, 1)] : [x0 + inside(), y0 + inside()]));
  }
  // On the bottom and right lines of a W square: seen, but left out of the count
  for (let i = 0; i < (n >= 12 ? 3 : n >= 2 ? 1 : 0); i++) {
    const [x0, y0] = W_SQUARES[Math.floor(Math.random() * 4)];
    const side = Math.random() < 0.5;
    add(() => (side ? [x0 + 300 + rnd(-1, 1), y0 + inside()] : [x0 + inside(), y0 + 300 + rnd(-1, 1)]));
  }
  // The rest of the chamber floor, clear of the W squares and their lines
  const nearW = (x: number, y: number) => W_SQUARES.some(([x0, y0]) => x > x0 - 4 && x < x0 + 304 && y > y0 - 4 && y < y0 + 304);
  for (let i = 0; i < Math.round((n / 4) * (SQUARES - 4)); i++) {
    add(() => { let x = 0, y = 0; do { x = rnd(FIELD_MIN, FIELD_MAX); y = rnd(FIELD_MIN, FIELD_MAX); } while (nearW(x, y)); return [x, y]; });
  }
  const places = new Map(cells.map(c => [c.id, placeCell(c, 'Eosinophil')]));
  const valid = cells.filter(c => places.get(c.id)!.square >= 0).map(c => ({ id: c.id, sq: places.get(c.id)!.square }));

  // What is left of the other white cells: pale, unstained, with no granules
  const remnants: Remnant[] = [], things: Thing[] = [];
  for (let i = 0; i < Math.round(5 * SQUARES); i++) {
    const x = rnd(FIELD_MIN, FIELD_MAX), y = rnd(FIELD_MIN, FIELD_MAX), r = rnd(1.1, 1.7);
    remnants.push({ pts: flake(x, y, r, 8, 0.3, rnd(0.7, 1)), o: rnd(0.45, 0.8) });
    things.push({ x, y, r: r + 0.4, what: 'Lysed white cell: no red granules' });
  }
  // Pilot's fluid is filtered, so crystals of the stain are few
  const debris = makeDebris({ precipitate: 0.015 });
  const dust = makeDust();
  for (const t of debris.things) if (t.what.startsWith('Stain precipitate')) t.what = 'Phloxine precipitate, not a cell';
  things.push(...debris.things, ...dust.things);
  return { valid, cells, places, remnants, things, debris, dust };
};

// Explanations shown in the panel for the things most easily taken for an eosinophil
const WHY: Record<string, string> = {
  'Phloxine precipitate, not a cell': 'A crystal of phloxine that has come out of the fluid. It is red like an eosinophil, but angular, with no granules and no nucleus, and it does not shine when the fine focus is turned.',
  'Lysed white cell: no red granules': 'Sodium carbonate in Pilot\'s fluid lyses the white cells other than eosinophils. What is left of one is pale and unstained: no red granules, so it is not counted.',
  'Ghost of a lysed red cell': 'Propylene glycol in Pilot\'s fluid lyses the red cells, leaving only faint ghosts.',
};

const Remnants = React.memo(({ remnants }: { remnants: Remnant[] }) => (
  <g pointerEvents="none">
    {remnants.map((m, i) => <path key={i} d={m.pts} fill="#98a0aa" fillOpacity={0.3 * m.o} stroke="#6a7280" strokeWidth={0.12} strokeOpacity={0.55 * m.o} />)}
  </g>
));

// The looks of an eosinophil through the fine focus, each drawn once as a layer and cross-faded by wbcLook.
// In focus: red granules crowding a pink cell, the two pale lobes of the nucleus showing between them
const EosSharp = React.memo(({ cells }: { cells: Eos[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r} fill="#e796a6" fillOpacity={0.6} stroke="#8a2540" strokeWidth={0.14} strokeOpacity={0.75} />
        <path d={c.lobes} fill="#d3c6d0" fillOpacity={0.9} stroke="#7d5a6b" strokeWidth={0.12} />
        <path d={c.granules} fill="#c1143c" fillOpacity={0.9} />
      </React.Fragment>
    ))}
  </g>
));
// One side of focus: the refractile granules shine as bright points in a pale pink cell
const EosBright = React.memo(({ cells }: { cells: Eos[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r * 1.05} fill="#f6d5dc" fillOpacity={0.75} stroke="#b04d68" strokeWidth={0.34} strokeOpacity={0.8} />
        <path d={c.shine} fill="#ffffff" />
      </React.Fragment>
    ))}
  </g>
));
// The other side, close to focus: the granules run together into a dark red mass
const EosDark = React.memo(({ cells }: { cells: Eos[] }) => (
  <g pointerEvents="none">
    {cells.map(c => (
      <React.Fragment key={c.id}>
        <circle cx={c.x} cy={c.y} r={c.r * 1.03} fill="#8f2440" />
        <path d={c.granules} fill="#5f1128" />
      </React.Fragment>
    ))}
  </g>
));
// ...and further out: one dark round blob, still reddish
const EosBlob = React.memo(({ cells }: { cells: Eos[] }) => (
  <g pointerEvents="none">
    {cells.map(c => <circle key={c.id} cx={c.x} cy={c.y} r={c.r * 1.1} fill="#74303f" />)}
  </g>
));

// Desktop layout (lg and wider), where the fine focus sits in the side panel instead of under the eyepiece
function useWideScreen() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setWide(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);
  return wide;
}

// The chamber under the microscope: the eyepiece with its layers, the fine focus, and the taps. A tap on an eosinophil
// in a W square counts it (again to undo); a tap on anything else says what it is. Counting needs the high power.
export const EosinophilScope: React.FC<ScopeProps<EosSample>> = ({ sample, stage, counted, setCounted, active, showMissed, setMessage, visible, controlsSlot }) => {
  const [focus, setFocus] = useState(0);   // fine focus: 0 = cells sharp
  const [tapLabel, setTapLabel] = useState<{ x: number; y: number; text: string; color: string; k: number; t: number; wrong?: number } | null>(null);
  const wide = useWideScreen();
  const look = wbcLook(focus), bubble = bubbleLook(focus);
  const { cells, places, debris, dust } = sample;

  const tapAt = (gx: number, gy: number) => {
    if (!active) return;
    const k = 1 / (stage.scale * (800 / 900));   // one screen pixel in ruling units
    const say = (x: number, y: number, text: string, color: string, wrong?: number) => {
      const t = performance.now();
      setTapLabel({ x, y, text, color, k, t, wrong });
      window.setTimeout(() => setTapLabel(l => (l && l.t === t ? null : l)), 2200);
    };
    const reach = Math.max(2, 16 * k);
    let cell: Eos | null = null, cellD = reach;
    for (const c of cells) { const d = Math.hypot(c.x - gx, c.y - gy); if (d < cellD) { cell = c; cellD = d; } }
    let thing: Thing | null = null, thingD = Infinity;
    if (!cell) for (const th of sample.things) {
      const d = Math.hypot(th.x - gx, th.y - gy);
      if (d < Math.max(reach, th.r) && d < thingD) { thing = th; thingD = d; }
    }
    if (!cell && !thing) { setMessage(null); return; }
    if (stage.zoom < 40) {
      say(gx, gy, 'Switch to 40x', '#fbbf24');
      setMessage('At this power an eosinophil is only a red dot, and so is a crystal of stain. Bring it to the centre and switch to the 40x (high power) objective to see what it is.');
      return;
    }
    if (cell) {
      const c = cell, place = places.get(c.id)!;
      if (place.square < 0) {
        say(c.x, c.y, place.note, '#fbbf24', c.r + 1.6);
        setMessage(place.note.includes('line')
          ? 'An eosinophil, but it lies on the bottom or right line of its square: leave it. Count the cells on the top and left lines only.'
          : 'An eosinophil, but outside the four corner (W) squares. Count only in the corner squares, 16 small squares each.');
        return;
      }
      const had = counted.has(c.id);
      setCounted(s => { const next = new Set(s); if (had) next.delete(c.id); else next.add(c.id); return next; });
      say(c.x, c.y, had ? 'Removed from the count' : place.note, had ? '#cbd5e1' : '#34d399');
      setMessage(null);
      return;
    }
    const th = thing!;
    say(th.x, th.y, th.what, '#fca5a5', Math.max(th.r + 1.2, 6 * k));
    setMessage(WHY[th.what] ?? null);
  };

  const knob = <FocusKnob value={focus} onChange={setFocus} />;
  return (
    <>
      <Eyepiece
        stage={stage}
        chamberMap
        className="rounded-xl min-h-[360px] md:min-h-[560px]"
        focus={focus}
        slideDefocus={look.slideDefocus}
        onTap={tapAt}
        background={AEC_FIELD_BG}
        renderSlide={() => (
          <div className="relative w-full h-full" style={{ backgroundColor: AEC_FIELD_BG }}>
            <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible">
              {/* Debris and the remains of lysed cells on the chamber floor, under the ruling */}
              <FloorDebris debris={debris} stain={PHLOXINE_CRYSTAL} />
              <Remnants remnants={sample.remnants} />
              {/* The ruling of a bright-line chamber: white lines, fainter as the fine focus widens them */}
              <g className="bright-line" style={{ opacity: look.lineOpacity, ['--ruling' as any]: look.lineColor, ['--ruling-width' as any]: `${look.lineWidth}px` }}><NeubauerRuling /></g>
            </svg>
          </div>
        )}
        layers={[
          // The blue core of the ruling on the bright side of focus: the ruling again, less blurred than the slide's
          { defocus: look.blueCoreDefocus, render: () => (
            <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible"
              style={{ opacity: look.blueCore, visibility: look.blueCore < 0.01 ? 'hidden' : 'visible' }}>
              <g className="bright-line" style={{ ['--ruling' as any]: RULING_BLUE, ['--ruling-width' as any]: `${look.blueCoreWidth}px` }}><NeubauerRuling /></g>
            </svg>
          ) },
          // Eosinophils: each look is its own layer, cross-faded by the fine focus
          { defocus: look.cellDefocus, render: () => (
            <div className="relative w-full h-full">
              <CellLayer opacity={look.grainShine}><GrainShine debris={debris} /></CellLayer>
              <CellLayer opacity={look.blob}><EosBlob cells={cells} /></CellLayer>
              <CellLayer opacity={look.darkLobes}><EosDark cells={cells} /></CellLayer>
              <CellLayer opacity={look.sharp}><EosSharp cells={cells} /></CellLayer>
              <CellLayer opacity={look.bright}><EosBright cells={cells} /></CellLayer>
            </div>
          ) },
          // Air bubbles in the fluid
          { defocus: bubble.defocus, render: () => (
            <div className="relative w-full h-full">
              <CellLayer opacity={bubble.down}><BubbleDown debris={debris} /></CellLayer>
              <CellLayer opacity={bubble.sharp}><BubbleSharp debris={debris} /></CellLayer>
              <CellLayer opacity={bubble.up}><BubbleUp debris={debris} /></CellLayer>
            </div>
          ) },
          // Dust on the cover slip, sharp in a higher plane
          { defocus: Math.abs(focus - COVER_SLIP_PLANE), render: () => (
            <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible">
              <CoverSlipDust dust={dust} />
            </svg>
          ) },
          // Marks of the count, always sharp: a ring on each counted cell, a dashed ring on each one missed once they
          // are shown, and the note of the last tap
          { defocus: 0, render: () => (
            <svg width="100%" height="100%" viewBox="0 0 900 900" overflow="visible" pointerEvents="none">
              {cells.map(c => {
                const mine = counted.has(c.id), missed = showMissed && !mine && places.get(c.id)!.square >= 0;
                if (!mine && !missed) return null;
                return <circle key={c.id} cx={c.x} cy={c.y} r={c.r + 1.6} fill="none" stroke={mine ? '#10b981' : '#f59e0b'}
                  strokeWidth={0.45} strokeDasharray={missed ? '1 0.7' : undefined} />;
              })}
              {tapLabel && (() => {
                const k = tapLabel.k, fs = 13 * k, w = tapLabel.text.length * 7.1 * k + 14 * k, h = 22 * k;
                const lx = tapLabel.x, ly = tapLabel.y - 14 * k;
                return (
                  <g>
                    {tapLabel.wrong && <circle key={tapLabel.t} className="wrong-tap-ring" cx={tapLabel.x} cy={tapLabel.y} r={tapLabel.wrong}
                      fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth={Math.max(0.45, 2 * k)} />}
                    <rect x={lx - w / 2} y={ly - h} width={w} height={h} rx={5 * k} fill="#0f172a" opacity={0.9} />
                    <text x={lx} y={ly - h / 2 + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="bold" fill={tapLabel.color}>{tapLabel.text}</text>
                  </g>
                );
              })()}
            </svg>
          ) },
        ]}
      />
      {/* Fine focus: in the side panel on a desktop, under the eyepiece on a phone or tablet */}
      {wide ? (visible && controlsSlot ? createPortal(knob, controlsSlot) : null) : <div className="mt-2 w-full max-w-lg mx-auto">{knob}</div>}
    </>
  );
};
