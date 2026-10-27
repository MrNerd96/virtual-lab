import { GHAI, PAL, JAIN } from '../questions/books';

// The Instruments module: one entry per instrument. This file is text only (no 3D code), so the instruments
// menu stays light; the 3D viewer and the models load only when an instrument is opened.
// Facts from CL Ghai and GK Pal, written in our own words; page numbers are the printed pages of the user's copies.

export type InstrumentId = 'rbc-pipette' | 'wbc-pipette' | 'neubauer-chamber';

export interface InstrumentPart {
    id: string;   // matches the part's mesh in the 3D model
    name: string;
    note: string;
}

export interface Instrument {
    id: InstrumentId;
    name: string;
    alsoCalled: string;
    summary: string;                            // one line under the name
    usedFor: string[];
    parts: InstrumentPart[];
    facts: string[];                            // how it works
    viva: { q: string; a: string }[];
    source: string;
    experiment: { view: string; label: string }; // the practical it is used in
    compareWith?: InstrumentId;
}

export const INSTRUMENTS: Instrument[] = [
    {
        id: 'rbc-pipette',
        name: 'RBC Pipette',
        alsoCalled: 'Red cell diluting pipette · slow-speed pipette',
        summary: 'Dilutes blood 1 in 200 for the red cell count.',
        usedFor: [
            'Diluting blood for the total RBC count, usually 1 in 200 with Hayem\'s fluid.',
            'Also for platelet and sperm counts, and for WBC counts when they are very high, as in some leukaemias.',
        ],
        parts: [
            { id: 'tip', name: 'Conical tip', note: 'Finely ground tip that is dipped into the blood drop and then into the diluting fluid.' },
            { id: 'stem', name: 'Stem', note: 'Long stem with a narrow capillary bore. From the tip to mark 1 it holds 1 part. Its bore is finer than the WBC pipette\'s.' },
            { id: 'marks', name: 'Graduations 0.5 and 1', note: 'The stem is divided into 10 equal parts, numbered only at 0.5 (middle) and 1 (where the stem meets the bulb). A white strip behind them makes them easy to read.' },
            { id: 'bulb', name: 'Bulb', note: 'Holds 100 parts, from mark 1 to mark 101. The blood is diluted only in the bulb.' },
            { id: 'bead', name: 'Red bead', note: 'Rolls freely to mix blood with the fluid, identifies the pipette at a glance, and shows it is dry when it rolls freely.' },
            { id: 'top-mark', name: 'Mark 101', note: 'Etched just above the bulb. The diluting fluid is drawn up to this mark.' },
            { id: 'tube', name: 'Rubber tube', note: 'Soft tube, 25–30 cm long, for gentle suction while you hold the pipette level and watch the column.' },
            { id: 'mouthpiece', name: 'Mouthpiece', note: 'Red on the RBC pipette.' },
        ],
        facts: [
            'The marks are relative volumes (parts), not cubic millimetres.',
            'Blood to 0.5 and fluid to 101: 0.5 part of blood in the 100 parts of the bulb gives 1 in 200 (dilution factor 200).',
            'Blood to 1 and fluid to 101 gives 1 in 100.',
            'The fluid left in the stem never mixes with the blood, so the first two drops are discarded before charging the chamber.',
            'It dilutes ten times more than the WBC pipette, yet its bulb is not ten times bigger, because its bore is much finer.',
        ],
        viva: [
            { q: 'How do you tell the RBC pipette from the WBC pipette?', a: 'Red bead and red mouthpiece, a larger bulb, mark 101 above the bulb and a narrower bore. The WBC pipette has a white bead and mark 11.' },
            { q: 'What does the bead do?', a: 'It mixes the blood with the diluting fluid, shows whether the pipette is dry (it rolls freely), and identifies the pipette at a glance.' },
            { q: 'Why is it called a slow-speed pipette?', a: 'Its narrow bore lets a drop form only slowly at the tip, so it is held at a steeper angle (about 60–70°) while charging the chamber.' },
            { q: 'Why is the pipette rolled to mix, and never shaken end to end?', a: 'End-to-end shaking forces cells out of the bulb into the stem, which spoils the dilution.' },
            { q: 'How is a pipette with blood clotted in the stem cleaned?', a: 'It is soaked in strong nitric acid for 24 hours, washed, and the bore is cleared with a fine wire.' },
        ],
        source: `${GHAI}, pp. 24–27, 30; ${PAL}, pp. 39–41`,
        experiment: { view: 'rbc-count', label: 'RBC Count' },
        compareWith: 'wbc-pipette',
    },
    {
        id: 'wbc-pipette',
        name: 'WBC Pipette',
        alsoCalled: 'White cell diluting pipette · fast-speed pipette',
        summary: 'Dilutes blood 1 in 20 for the total leucocyte count.',
        usedFor: [
            'Diluting blood for the total leucocyte count (TLC), usually 1 in 20 with Türk\'s fluid.',
        ],
        parts: [
            { id: 'tip', name: 'Conical tip', note: 'Finely ground tip that is dipped into the blood drop and then into the diluting fluid.' },
            { id: 'stem', name: 'Stem', note: 'From the tip to mark 1 it holds 1 part. Its bore is wider than the RBC pipette\'s, so it holds more blood.' },
            { id: 'marks', name: 'Graduations 0.5 and 1', note: 'The stem is divided into 10 equal parts, numbered only at 0.5 (middle) and 1 (where the stem meets the bulb). A white strip behind them makes them easy to read.' },
            { id: 'bulb', name: 'Bulb', note: 'Holds 10 parts, from mark 1 to mark 11. The blood is diluted only in the bulb.' },
            { id: 'bead', name: 'White bead', note: 'Rolls freely to mix blood with the fluid, identifies the pipette at a glance, and shows it is dry when it rolls freely.' },
            { id: 'top-mark', name: 'Mark 11', note: 'Etched just above the bulb. The diluting fluid is drawn up to this mark.' },
            { id: 'tube', name: 'Rubber tube', note: 'Soft tube, 25–30 cm long, for gentle suction while you hold the pipette level and watch the column.' },
            { id: 'mouthpiece', name: 'Mouthpiece', note: 'White on the WBC pipette.' },
        ],
        facts: [
            'The marks are relative volumes (parts), not cubic millimetres.',
            'Blood to 0.5 and fluid to 11: 0.5 part of blood in the 10 parts of the bulb gives 1 in 20 (dilution factor 20).',
            'Blood to 1 and fluid to 11 gives 1 in 10.',
            'The fluid left in the stem never mixes with the blood, so the first two drops are discarded before charging the chamber.',
            'The bulb holds 10 times the volume of the stem (100 times in the RBC pipette).',
        ],
        viva: [
            { q: 'How do you tell the WBC pipette from the RBC pipette?', a: 'White bead and white mouthpiece, a smaller bulb, mark 11 above the bulb and a wider bore. The RBC pipette has a red bead and mark 101.' },
            { q: 'Why is it called a fast-speed pipette?', a: 'Its wider bore makes a drop form quickly, and a larger one, so it is held flatter (about 10–20°) and for a shorter time while charging.' },
            { q: 'What units are the marks on the pipette in?', a: 'None. They show only relative volumes (parts) compared with one another.' },
            { q: 'Why should the diluting fluid be drawn up without delay, but slowly?', a: 'Any delay lets the blood clot in the stem; drawing too fast leaves a film of viscous blood stuck to the bore.' },
            { q: 'What is the function of the bulb?', a: 'The blood is diluted only in the bulb, and since its volume is known, the dilution is in exactly known proportions.' },
        ],
        source: `${GHAI}, pp. 24–27, 30; ${PAL}, pp. 39–41`,
        experiment: { view: 'wbc-count', label: 'WBC Count (TLC)' },
        compareWith: 'rbc-pipette',
    },
    {
        id: 'neubauer-chamber',
        name: 'Neubauer Chamber',
        alsoCalled: 'Improved Neubauer counting chamber · haemocytometer',
        summary: 'Holds a film of diluted blood exactly 0.1 mm deep over a ruled grid, for counting cells.',
        usedFor: [
            'Counting red cells, white cells and platelets in diluted blood: a known volume is spread under the coverslip and the cells over the grid are counted.',
        ],
        parts: [
            { id: 'slide', name: 'Thick glass slide', note: 'A single solid, heavy glass slide. Its middle third carries the platforms and trenches.' },
            { id: 'platforms', name: 'Lateral platforms', note: 'The raised platforms on either side. The coverslip rests on them and bridges the moats.' },
            { id: 'central', name: 'Central platform', note: 'Exactly 0.1 mm lower than the lateral platforms, and split in two by a short transverse trench. Each half (floor piece) carries a counting grid; the silvered floor of a Bright-Line chamber shows the grid clearly.' },
            { id: 'moats', name: 'Moats (H-shaped trench)', note: 'Trenches on both sides of the central platform which, with the transverse trench, form an H. Fluid running into them means the chamber is overcharged.' },
            { id: 'grid', name: 'Counting grid', note: '3 mm × 3 mm, in nine 1 mm squares. The 4 corner squares (16 squares each) are for WBCs; the central square (25 medium squares in triple lines, each of 16 smallest squares) is for RBCs. Choosing it zooms in on the rulings.' },
            { id: 'coverslip', name: 'Coverslip', note: 'An optically plane coverslip laid on the lateral platforms. It leaves a capillary space exactly 0.1 mm deep over the floor pieces.' },
            { id: 'print', name: 'Etched specifications', note: 'The depth (0.100 mm) and the area of the smallest square (0.0025 mm², i.e. 1/400 mm²) are etched on the chamber.' },
        ],
        facts: [
            'Depth between the floor piece and the coverslip: 0.1 mm.',
            'Each large square is 1 mm², so it holds 0.1 mm³ of diluted blood.',
            'RBCs are counted in 80 smallest squares (5 groups of 16), each 1/4000 mm³, in all 1/50 mm³.',
            'Fluid in the moats is overcharging; a bare patch or air bubbles is undercharging. Either way, wash and recharge.',
        ],
        viva: [
            { q: 'What is the depth of the counting chamber?', a: '0.1 mm, between the floor piece and the underside of the coverslip.' },
            { q: 'Which squares are used for the RBC count?', a: 'The four corner medium squares and the central one of the central large square: 80 smallest squares in all.' },
            { q: 'What is overcharging?', a: 'Diluted blood running into the moats. The chamber is washed, dried and charged again.' },
            { q: 'Why wait 2–3 minutes after charging before counting?', a: 'So the cells settle on the grid and stop moving with the currents in the fluid.' },
        ],
        source: `${GHAI}, pp. 24, 28–30; ${PAL}, pp. 42–43; ${JAIN}, p. 10`,
        experiment: { view: 'rbc-count', label: 'RBC Count' },
    },
];

export const instrumentById = (id: InstrumentId) => INSTRUMENTS.find(i => i.id === id)!;
