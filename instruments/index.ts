import { GHAI, PAL } from '../questions/books';

// The Instruments module: one entry per instrument. This file is text only (no 3D code), so the instruments
// menu stays light; the 3D viewer and the models load only when an instrument is opened.
// Facts from CL Ghai and GK Pal, written in our own words; page numbers are the printed pages of the user's copies.

export type InstrumentId = 'rbc-pipette' | 'wbc-pipette';

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
];

export const instrumentById = (id: InstrumentId) => INSTRUMENTS.find(i => i.id === id)!;
