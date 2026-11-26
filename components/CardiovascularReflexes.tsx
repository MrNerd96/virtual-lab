import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
    ArrowLeft, Activity, ListChecks, RefreshCw, Play, Pause, Syringe, Scissors, Gauge, Wind, Droplet, HeartPulse,
    CircleDot, Info,
} from 'lucide-react';
import { useHoverLabel, HoverLabel } from './HoverLabel';
import { ZoomableSvg } from './ZoomableSvg';
import { Quiz } from './Quiz';
import { questionSetFor } from '../questions';

// Cardiovascular and respiratory reflexes: the record of blood pressure and respiration, and the effect of
// variables on it, worked out from the reflex arcs instead of from an animal. The numbers are the dog's, as in
// AK Jain Ch 69 (printed pp. 329–341) and CL Ghai Expt 4-18 (pp. 345–348), whose records this follows:
// mean BP 130–140 mmHg, heart rate about 120/min, respiration 18–20/min.
// Nothing here is a protocol: the student changes one variable at a time and reads the reflex off the arc and the
// record. The sizes of the changes are our own, chosen to match the direction and the rough magnitude of the
// tracings in the two books.

// --- Resting values (Jain, p. 341) ---
const HR_REST = 120;          // beats a minute
const SV_REST = 60;           // mL
const MAP_REST = 130;         // mmHg
const RR_REST = 18;           // breaths a minute
const PCO2_REST = 40, PO2_REST = 95;
const K_MAP = MAP_REST / (HR_REST * SV_REST);   // CO x TPR -> mean pressure
// The heart's own rhythm, and how far the sympathetic and vagal outflows move it. At rest both outflows sit at
// half their range, which lands the rate on 120: the vagal restraint is the vagal tone.
const HR_INTRINSIC = 168, SYM_HR = 60, VAG_HR = 150;

const STEP = 20;              // ms of simulated time per step
const WINDOW_MS = 60000;      // the last minute of the record
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
// Saturating curve for receptor firing: 0 below the threshold, 1 when fully loaded
const sigm = (x: number) => 1 / (1 + Math.exp(-x));

// --- The state of the preparation ---

interface Sim {
    t: number;
    // Slow variables
    map: number;            // mean arterial pressure, mmHg
    hr: number;             // beats a minute
    contract: number;       // contractility, 1 = normal
    tpr: number;            // total peripheral resistance, 1 = normal
    volume: number;         // blood volume, 1 = normal
    pco2: number;
    po2: number;
    rr: number;             // breaths a minute
    depth: number;          // tidal volume, 1 = normal
    // Phases
    beat: number;           // cardiac cycle, in cycles
    breath: number;         // respiratory cycle, in cycles
    mayer: number;          // vasomotor (Mayer) wave, in cycles
    // Reflex traffic, 0..1, kept for the diagram
    baroCarotid: number;
    baroAortic: number;
    chemo: number;
    sym: number;            // sympathetic outflow
    vagal: number;          // vagal outflow to the heart
    respDrive: number;      // drive to the respiratory muscles
    // What is written on the paper
    bp: number;             // instantaneous arterial pressure
    resp: number;           // respiration trace, expiration upward (Jain)
    // Readings as a student takes them off the record: the middle of the respiratory swings
    mapAvg: number; hrAvg: number; rrAvg: number;
    // Standing conditions
    occludeL: boolean; occludeR: boolean;
    distend: number;        // seconds left of carotid sinus distension
    vagiCut: boolean;
    stimPeriph: number;     // seconds left of stimulating the peripheral end
    stimCentral: number;    // seconds left of stimulating the central end
    atropine: number;       // minutes of atropine left
    adrenaline: number; noradrenaline: number; ach: number;   // seconds of drug action left
    asphyxia: boolean; asphyxiaT: number;
    thoracic: number;       // seconds left of raised intrathoracic pressure
    lostFraction: number;   // of the blood volume
    irreversible: boolean;
    pooled: number;         // blood dammed up while the heart is held still
}

export const newSim = (): Sim => ({
    t: 0,
    map: MAP_REST, hr: HR_REST, contract: 1, tpr: 1, volume: 1, pco2: PCO2_REST, po2: PO2_REST, rr: RR_REST, depth: 1,
    beat: 0, breath: 0, mayer: 0,
    baroCarotid: 0.5, baroAortic: 0.5, chemo: 0, sym: 0.5, vagal: 0.5, respDrive: 0.5,
    bp: MAP_REST, resp: 0, mapAvg: MAP_REST, hrAvg: HR_REST, rrAvg: RR_REST,
    occludeL: false, occludeR: false, distend: 0, vagiCut: false, stimPeriph: 0, stimCentral: 0,
    atropine: 0, adrenaline: 0, noradrenaline: 0, ach: 0,
    asphyxia: false, asphyxiaT: 0, thoracic: 0, lostFraction: 0, irreversible: false, pooled: 0,
});

const isResting = (s: Sim) =>
    !s.occludeL && !s.occludeR && !s.vagiCut && !s.asphyxia && s.distend <= 0 && s.stimPeriph <= 0 && s.stimCentral <= 0 &&
    s.atropine <= 0 && s.adrenaline <= 0 && s.noradrenaline <= 0 && s.ach <= 0 && s.thoracic <= 0 && s.lostFraction < 0.01 &&
    Math.abs(s.map - MAP_REST) < 6 && Math.abs(s.hr - HR_REST) < 6;

// One step of the reflex loop
export function stepSim(s: Sim, dt: number) {
    const sec = dt / 1000;
    s.t += dt;

    // --- Timers ---
    const run = (v: number) => Math.max(0, v - sec);
    s.distend = run(s.distend); s.stimPeriph = run(s.stimPeriph); s.stimCentral = run(s.stimCentral);
    s.adrenaline = run(s.adrenaline); s.noradrenaline = run(s.noradrenaline); s.ach = run(s.ach);
    s.thoracic = run(s.thoracic); s.atropine = run(s.atropine);

    // --- Blood gases ---
    if (s.asphyxia) {
        // With the airway closed the carbon dioxide climbs and the oxygen falls over a minute or two
        s.asphyxiaT += sec;
        s.pco2 = Math.min(85, s.pco2 + 0.33 * sec);
        s.po2 = Math.max(25, s.po2 - 0.75 * sec);
    } else {
        s.asphyxiaT = 0;
        // Washed out by breathing: the more air moved, the faster, and hyperventilation blows the PCO₂ down
        const vent = (s.rr / RR_REST) * s.depth;
        s.pco2 += (PCO2_REST - 12 * (vent - 1) - s.pco2) * clamp01(sec * 0.35 * vent);
        s.po2 += (PO2_REST - s.po2) * clamp01(sec * 0.6 * vent);
    }

    // --- Receptors ---
    // The carotid sinus senses the pressure reaching it. A clamp on the artery drops that pressure; distending the
    // sinus from inside makes it read high.
    // Each sinus is taken on its own and the two are averaged, so clamping one artery silences only that one.
    // The receptors sit at half their range at the resting pressure, so they can signal a rise or a fall alike.
    const sinusP = (occluded: boolean) => (s.distend > 0 ? 190 : occluded ? 38 : s.map);
    s.baroCarotid = 0.5 * (sigm((sinusP(s.occludeL) - MAP_REST) / 34) + sigm((sinusP(s.occludeR) - MAP_REST) / 34));
    // The aortic baroreceptors send their fibres in the vagus (the aortic depressor nerve), so cutting the vagi
    // takes them out of the loop as well (Ghai, p. 346). A cut nerve carries nothing, which is the same as no
    // deviation from the resting discharge: 0.5.
    s.baroAortic = s.vagiCut ? 0.5 : sigm((s.map - MAP_REST) / 34);
    const baro = 0.62 * s.baroCarotid + 0.38 * s.baroAortic;
    s.chemo = clamp01((s.pco2 - 42) / 26) + clamp01((72 - s.po2) / 40);

    // --- Medullary centres ---
    // Mayer waves: when the pressure is so low that the baroreceptors fall silent, the vasomotor centre swings
    // rhythmically every 20–40 s (Jain, p. 340)
    s.mayer += sec / 26;
    const mayerGain = clamp01((60 - s.map) / 25) * 0.35;
    const mayerTerm = mayerGain * Math.sin(2 * Math.PI * s.mayer);

    // Late in asphyxia carbon dioxide depresses the vasomotor centre and excites the cardiac vagal centre
    const late = s.asphyxia ? clamp01((s.asphyxiaT - 150) / 70) : 0;
    // While the vagi are intact, the aortic and cardiac receptors put a brake on any large rise: this is why
    // carotid occlusion lifts the pressure only moderately, and why the same occlusion after vagotomy can send it
    // above 300 mmHg, which Jain calls neurogenic hypertension (Jain, p. 335; Ghai, p. 347).
    const brake = s.vagiCut ? 0 : clamp01((s.map - 150) / 55);
    let sym = clamp01(0.5 + 0.7 * (0.5 - baro) + 0.3 * s.chemo * (1 - late) - 0.45 * late - 0.3 * brake + mayerTerm);
    let vagal = clamp01(0.5 + 0.8 * (baro - 0.5) - 0.25 * s.chemo * (1 - late) + 0.4 * late);
    if (s.stimCentral > 0) sym = clamp01(sym + 0.06);      // afferents: a slight pressor effect (Jain, p. 338)
    // What actually reaches the SA node. Atropine holds the muscarinic receptors; a cut vagus carries nothing
    // unless its cardiac end is being stimulated.
    const vagalEff = s.atropine > 0 ? 0 : s.vagiCut ? (s.stimPeriph > 0 ? 1 : 0) : vagal;
    s.sym = sym; s.vagal = vagal;

    // The respiratory centre. Carbon dioxide is its main drive; a high arterial pressure depresses it reflexly
    // through the aortic (vagal) afferents, which is why adrenaline causes apnoea and why that apnoea goes after
    // the vagi are cut (Jain, p. 333).
    let respDrive = clamp01(0.5 + 1.5 * s.chemo - 1.5 * (s.baroAortic - 0.5) - 0.35 * (s.baroCarotid - 0.5));
    if (s.stimCentral > 0) respDrive = 0;                  // Hering–Breuer afferents: respiration stops (Ghai, p. 348)
    respDrive *= 1 - late;                                 // the late, depressant effect of a very high PCO₂
    s.respDrive = respDrive;

    // --- Heart and vessels ---
    // The vagus holds the rate well below the heart's own rhythm, so cutting it, or blocking it with atropine,
    // lets the rate go up: that resting restraint is the vagal tone (Ghai, p. 347).
    let hrT = HR_INTRINSIC + SYM_HR * sym - VAG_HR * vagalEff;
    let tprT = 0.25 + 1.5 * sym;
    let contractT = 0.75 + 0.5 * sym;
    if (s.distend > 0) { hrT = 60; tprT = 0.72; contractT = 0.85; }   // the sinus stretched hard: a strong reflex

    // Drugs, from the two books
    if (s.adrenaline > 0) {
        // The first seconds show the small dip, from β₂ dilatation, before the rise from the larger output
        const dip = s.adrenaline > 11.5;
        const p = clamp01(s.adrenaline / 12);
        hrT += (dip ? 25 : 70) * p; contractT += (dip ? 0.2 : 0.5) * p;
        tprT += (dip ? -0.55 : 0.32) * p;
    }
    if (s.noradrenaline > 0) { const p = clamp01(s.noradrenaline / 16); tprT += 1.25 * p; contractT += 0.2 * p; }
    // Acetylcholine acts straight on the node and the vessels, and overrides what the reflexes are asking for
    if (s.ach > 0 && s.atropine <= 0) {
        const p = clamp01(s.ach / 8);
        hrT = Math.min(hrT, HR_INTRINSIC - 125 * p); tprT -= 0.5 * p; contractT -= 0.35 * p;
    }

    // Irreversible shock: the heart and vessels stop responding (Jain, pp. 338–340)
    if (s.irreversible) { contractT *= 0.32; tprT = 1 + (tprT - 1) * 0.25; }

    const k = 1 - Math.exp(-sec / 1.5);
    s.hr += (clamp(hrT, 20, 300) - s.hr) * k;
    s.tpr += (clamp(tprT, 0.3, 2.6) - s.tpr) * k;
    s.contract += (clamp(contractT, 0.2, 2.2) - s.contract) * k;
    if (s.stimPeriph > 0) s.hr = Math.max(0, s.hr - 260 * sec);   // the heart is held, and may stop

    // --- Breathing ---
    // After the vagi are cut the lung stretch afferents are gone with them, so the breaths become fewer and
    // deeper (Ghai, p. 347)
    const rrT = RR_REST * (0.34 + 1.4 * respDrive) * (s.vagiCut ? 0.62 : 1);
    const depthT = (0.34 + 1.4 * respDrive) * (s.vagiCut ? 1.55 : 1);
    s.rr += (clamp(rrT, 0, 70) - s.rr) * (1 - Math.exp(-sec / 1.2));
    s.depth += (clamp(depthT, 0.05, 2.6) - s.depth) * (1 - Math.exp(-sec / 1.2));

    // --- The cycles ---
    s.beat += (dt / 60000) * s.hr;
    s.breath += (dt / 60000) * s.rr;
    const bPhase = s.beat % 1;
    const rPhase = s.breath % 1;
    // Inspiration is the first 40% of the cycle; the record is drawn with expiration upward (Jain, p. 332)
    const inspiring = rPhase < 0.4 ? Math.sin(Math.PI * (rPhase / 0.4)) : 0;

    // Venous return: it rises as the chest expands in inspiration, and falls when the intrathoracic pressure is
    // raised. This is what puts the Traube–Hering waves on the record.
    // While the heart is held still the blood dams up in the veins; when it is let go that extra filling gives a
    // few large beats, which is the reactionary rise (Jain, p. 338)
    if (s.stimPeriph > 0) s.pooled = Math.min(0.4, s.pooled + 0.07 * sec);
    else s.pooled = Math.max(0, s.pooled - 0.055 * sec);
    const venous = s.volume * (1 + 0.14 * inspiring + (s.stimPeriph > 0 ? 0 : s.pooled)) * (s.thoracic > 0 ? 0.55 : 1);
    // A fast heart has little time to fill, so each beat throws out less: this is what keeps the output, and the
    // pressure, nearly steady when the rate alone changes, as after cutting the vagi (Jain, p. 338)
    const filling = clamp(1 - (s.hr - HR_REST) / 260, 0.45, 1.3);
    const sv = SV_REST * s.contract * filling * clamp(venous, 0.1, 1.4);
    const co = s.hr * sv;
    const mapT = co * s.tpr * K_MAP;
    s.map += (clamp(mapT, 0, 320) - s.map) * (1 - Math.exp(-sec / 0.6));

    // Blood volume creeps back as fluid shifts in from the tissues, unless the loss was too great
    const volT = s.irreversible ? 1 - s.lostFraction : 1 - s.lostFraction * 0.7;
    if (s.volume < volT) s.volume = Math.min(volT, s.volume + 0.0018 * sec);

    // --- What the writing point draws ---
    // Pulse pressure from the stroke volume; mercury's inertia damps it to 15–20 mmHg (Jain, p. 332)
    const pp = 42 * (sv / SV_REST) * (0.6 + 0.4 * s.tpr);
    const wave = Math.pow(Math.sin(Math.PI * clamp01(bPhase / 0.75)), 1.6) - 0.12 * Math.sin(2 * Math.PI * bPhase);
    s.bp = s.map + pp * 0.5 * wave;
    s.resp = s.depth * (rPhase < 0.4 ? -Math.sin(Math.PI * (rPhase / 0.4)) : Math.sin(Math.PI * ((rPhase - 0.4) / 0.6)));

    // The steady readings, smoothed over several breaths so the Traube-Hering swings do not count as a change
    const ka = 1 - Math.exp(-sec / 4);
    s.mapAvg += (s.map - s.mapAvg) * ka;
    s.hrAvg += (s.hr - s.hrAvg) * ka;
    s.rrAvg += (s.rr - s.rrAvg) * ka;
}

// --- Interventions ---

type Group = 'carotid' | 'vagus' | 'drug' | 'other';
interface Action {
    id: string;
    label: string;
    sub: string;
    group: Group;
    color: string;
    needsVagotomy?: boolean;
    toggle?: (s: Sim) => boolean;     // for the standing conditions: true while it is on
    watch?: number;                   // seconds to follow the response before writing the row down
    apply: (s: Sim) => void;
    seen: string;
    why: string;
    source: string;
}

const JAIN_P = (p: string) => `AK Jain, Essentials of MD/DNB Physiology Practical Examination, p. ${p}`;
const GHAI_P = (p: string) => `CL Ghai, A Textbook of Practical Physiology, 8th ed., p. ${p}`;

export const ACTIONS: Action[] = [
    {
        id: 'occlude-one', label: 'Occlude one carotid', sub: 'Clamp the right common carotid', group: 'carotid', color: '#fbbf24',
        toggle: s => s.occludeR && !s.occludeL,
        apply: s => { s.occludeR = !s.occludeR; s.occludeL = false; },
        seen: 'A slight rise in blood pressure and heart rate, with little change in breathing.',
        why: 'Less pressure reaches that carotid sinus, so its baroreceptors fire less and the medulla is released from some of its inhibition. The other sinus and the aortic receptors are still loaded, so they hold the rise down.',
        source: `${JAIN_P('335')}; ${GHAI_P('347')}`,
    },
    {
        id: 'occlude-both', label: 'Occlude both carotids', sub: 'Clamp both common carotids', group: 'carotid', color: '#f59e0b',
        toggle: s => s.occludeL && s.occludeR,
        apply: s => { const on = s.occludeL && s.occludeR; s.occludeL = !on; s.occludeR = !on; },
        seen: 'A clear rise in blood pressure and heart rate. Breathing is slightly depressed as the pressure climbs.',
        why: 'Both carotid sinuses are now unloaded, so almost all of their inhibitory discharge stops and the medullary cardiovascular neurons escape. Sympathetic outflow rises, constricting the vessels and driving the heart.',
        source: `${JAIN_P('335')}; ${GHAI_P('347')}`,
    },
    {
        id: 'distend', label: 'Distend the carotid sinus', sub: 'Stretch its wall from inside, 12 s', group: 'carotid', color: '#38bdf8',
        apply: s => { s.distend = 12; },
        seen: 'The heart slows and the blood pressure falls steeply; it recovers as soon as the stretch is let go.',
        why: 'Stretching the wall mimics a high pressure, so the baroreceptors fire hard. The reflex inhibits the vasomotor centre and excites the cardiac vagal centre: the opposite of occlusion.',
        source: JAIN_P('335'),
    },
    {
        id: 'vagotomy', label: 'Cut both vagi', sub: 'Bilateral vagotomy', group: 'vagus', color: '#a3e635',
        toggle: s => s.vagiCut, watch: 22,
        apply: s => { s.vagiCut = !s.vagiCut; if (!s.vagiCut) { s.stimPeriph = 0; s.stimCentral = 0; } },
        seen: 'The heart rate rises at once; the blood pressure hardly changes. Breathing becomes slower and deeper.',
        why: 'The resting vagal discharge that restrains the SA node is gone, so the rate climbs. Each beat fills less, so the output and the pressure stay much the same. The aortic baroreceptors and the lung stretch afferents are lost with the nerve, which is why later responses are bigger.',
        source: `${GHAI_P('347')}; ${JAIN_P('338')}`,
    },
    {
        id: 'stim-periph', label: 'Stimulate the peripheral end', sub: 'The cardiac end of the cut vagus, 8 s', group: 'vagus', color: '#4ade80', needsVagotomy: true,
        apply: s => { s.stimPeriph = 8; },
        seen: 'The heart slows or stops and the pressure falls, sometimes to nearly zero. When the stimulus stops, the pressure returns and may overshoot its old level.',
        why: 'These are the efferent fibres to the nodes and atria. The overshoot (the reactionary rise) comes from the blood that pooled during the arrest, which gives a large venous return and output, helped by the vasomotor centre roused by the low pressure.',
        source: JAIN_P('338'),
    },
    {
        id: 'stim-central', label: 'Stimulate the central end', sub: 'The brain end of the cut vagus, 8 s', group: 'vagus', color: '#22d3ee', needsVagotomy: true,
        apply: s => { s.stimCentral = 8; },
        seen: 'Breathing stops for as long as the stimulus lasts. The blood pressure changes little, usually rising slightly.',
        why: 'The afferents of the Hering–Breuer reflex run in the vagus, and firing them inhibits inspiration. The pressure response is inconstant because the nerve carries afferents from several reflexogenic areas at once.',
        source: `${GHAI_P('348')}; ${JAIN_P('338')}`,
    },
    {
        id: 'adrenaline', label: 'Adrenaline', sub: '1 in 10,000, intravenously', group: 'drug', color: '#f87171',
        apply: s => { s.adrenaline = 14; s.noradrenaline = 0; s.ach = 0; },
        seen: 'A brief small dip, then a marked rise in pressure with a faster heart. Breathing stops for a few seconds at the height of the rise.',
        why: 'Through β receptors it drives the heart and at first dilates some vessels, which gives the dip; the rise is from the larger cardiac output. The pause in breathing is adrenaline apnoea: the baroreceptor discharge set off by the high pressure also depresses the respiratory centre nearby.',
        source: `${JAIN_P('333')}; ${GHAI_P('348')}`,
    },
    {
        id: 'noradrenaline', label: 'Noradrenaline', sub: '1 in 10,000, intravenously', group: 'drug', color: '#fb7185',
        apply: s => { s.noradrenaline = 18; s.adrenaline = 0; s.ach = 0; },
        seen: 'No initial dip: the pressure rises higher and stays up longer than with adrenaline, and the heart slows a little.',
        why: 'It constricts nearly all the systemic arterioles through α₁ receptors. The slowing is the baroreceptor reflex answering the high pressure, and the mean pressure stays up in spite of it.',
        source: `${GHAI_P('348')}; ${JAIN_P('333')}`,
    },
    {
        id: 'ach', label: 'Acetylcholine', sub: '1 in 100,000, intravenously', group: 'drug', color: '#fbbf24',
        apply: s => { s.ach = 10; s.adrenaline = 0; s.noradrenaline = 0; },
        seen: 'A deep fall in pressure with marked slowing of the heart. After atropine the same dose does nothing.',
        why: 'It slows the heart and weakens its beat through muscarinic receptors, and dilates the vessels. Atropine occupies those receptors, so the response is abolished.',
        source: `${JAIN_P('334')}; ${GHAI_P('348')}`,
    },
    {
        id: 'atropine', label: 'Atropine', sub: '1 in 1,000, intravenously', group: 'drug', color: '#c084fc',
        toggle: s => s.atropine > 0,
        apply: s => { s.atropine = s.atropine > 0 ? 0 : 150; },
        seen: 'The heart rate rises and the pressure lifts a little. Acetylcholine and vagal stimulation now have no effect.',
        why: 'It blocks the muscarinic receptors, so the resting vagal tone no longer reaches the node. How much the rate rises therefore shows how much vagal tone the animal had.',
        source: `${JAIN_P('334')}; ${GHAI_P('347')}`,
    },
    {
        id: 'asphyxia', label: 'Asphyxia', sub: 'Close the airway', group: 'other', color: '#94a3b8',
        toggle: s => s.asphyxia, watch: 75,
        apply: s => { s.asphyxia = !s.asphyxia; },
        seen: 'Breathing becomes rapid and deep and the pressure and rate climb. After two or three minutes all of them fall again.',
        why: 'Hypoxia with hypercapnia: the high PCO₂ drives the vasomotor and respiratory centres, and the low PO₂ acts reflexly through the carotid and aortic bodies. Later, carbon dioxide itself depresses the centres and the heart, so the pressure falls.',
        source: `${JAIN_P('334')}; ${GHAI_P('348')}`,
    },
    {
        id: 'thoracic', label: 'Raise the intrathoracic pressure', sub: 'Hold it raised, 10 s', group: 'other', color: '#60a5fa',
        apply: s => { s.thoracic = 10; },
        seen: 'The blood pressure falls while it is held, and returns as soon as it is released.',
        why: 'A positive pressure in the chest opposes the filling of the great veins, so the venous return and the cardiac output fall. It is the mirror image of the inspiratory rise.',
        source: GHAI_P('348'),
    },
    {
        id: 'bleed-10', watch: 30, label: 'Blood loss 10%', sub: 'Mild haemorrhage', group: 'other', color: '#fca5a5',
        apply: s => { s.lostFraction = Math.min(1, s.lostFraction + 0.10); s.volume = Math.max(0.05, s.volume - 0.10); },
        seen: 'A slight fall in pressure, made up again within a minute or two. Breathing hardly changes.',
        why: 'A loss of this size is met by the baroreceptor reflex: the heart speeds up, the vessels constrict and fluid moves in from the tissues, so the pressure comes back without any transfusion.',
        source: JAIN_P('338'),
    },
    {
        id: 'bleed-25', watch: 30, label: 'Blood loss 25%', sub: 'Moderate haemorrhage', group: 'other', color: '#f87171',
        apply: s => { s.lostFraction = Math.min(1, s.lostFraction + 0.25); s.volume = Math.max(0.05, s.volume - 0.25); },
        seen: 'A clear fall in pressure with a fast heart and stimulated breathing. It recovers slowly, over many minutes.',
        why: 'The output falls with the venous return. The reflexes compensate as far as they can, and the poorly perfused carotid bodies drive the breathing. Given time, or a transfusion, the pressure returns: reversible shock.',
        source: `${JAIN_P('338')}; ${GHAI_P('348')}`,
    },
    {
        id: 'bleed-40', watch: 30, label: 'Blood loss 40%', sub: 'Severe haemorrhage', group: 'other', color: '#dc2626',
        apply: s => {
            s.lostFraction = Math.min(1, s.lostFraction + 0.40); s.volume = Math.max(0.05, s.volume - 0.40);
            if (s.lostFraction >= 0.4) s.irreversible = true;
        },
        seen: 'The pressure falls below 40 mmHg, slow waves appear on the record, and breathing is driven hard. Transfusion no longer brings it back.',
        why: 'Below about 60 mmHg the baroreceptors fall silent, so the vasomotor centre swings rhythmically and Mayer waves appear. Past this much loss, positive feedback takes over and the state is irreversible.',
        source: JAIN_P('340'),
    },
    {
        id: 'transfuse', watch: 30, label: 'Transfuse', sub: 'Replace the lost volume', group: 'other', color: '#4ade80',
        apply: s => { if (!s.irreversible) { s.lostFraction = 0; s.volume = 1; } },
        seen: 'In reversible shock the pressure and breathing come back to normal. After a loss of more than 40% nothing changes.',
        why: 'Whole blood restores the circulating volume and keeps it there. Saline alone would lift the pressure only briefly, having no cells or plasma proteins to hold it in the vessels.',
        source: JAIN_P('339'),
    },
];
const GROUP_TITLE: Record<Group, string> = {
    carotid: 'Carotid sinus', vagus: 'Vagus nerve', drug: 'Drugs, intravenously', other: 'Other variables',
};
const GROUP_ICON: Record<Group, React.ReactNode> = {
    carotid: <CircleDot className="w-4 h-4 text-amber-300" />,
    vagus: <Scissors className="w-4 h-4 text-lime-300" />,
    drug: <Syringe className="w-4 h-4 text-rose-300" />,
    other: <Wind className="w-4 h-4 text-sky-300" />,
};

// --- The reflex arc, drawn and animated ---

const W = 1000, H = 720;

interface Motion {
    hr: number; map: number; sym: number; vagal: number; respDrive: number;
    baroCarotid: number; baroAortic: number; chemo: number;
    beat: number; breath: number; tpr: number; volume: number;
    occludeL: boolean; occludeR: boolean; vagiCut: boolean; distend: boolean; stimPeriph: boolean; stimCentral: boolean;
    atropine: boolean; asphyxia: boolean;
}

// Each pathway: the drawn nerve, and the dots that run along it to show its traffic
interface Pathway { id: string; d: string; color: string; dots: number; label: string; dash?: boolean }
const PATHWAYS: Pathway[] = [
    { id: 'sinus', d: 'M 500,216 C 410,220 332,196 286,178', color: '#38bdf8', dots: 7, label: 'Carotid sinus nerve (of Hering, IX): afferent from the sinus and the body' },
    { id: 'aortic', d: 'M 556,372 C 450,345 330,268 288,214', color: '#22d3ee', dots: 7, label: 'Aortic depressor nerve: afferent from the arch, running in the vagus' },
    { id: 'vagus', d: 'M 286,236 C 360,318 440,420 548,468', color: '#4ade80', dots: 6, label: 'Vagus (X): efferent to the SA node and the atria' },
    { id: 'symHeart', d: 'M 214,468 C 320,492 440,506 536,504', color: '#f87171', dots: 6, label: 'Sympathetic fibres to the heart: rate and force' },
    { id: 'symVessel', d: 'M 214,436 C 430,596 700,586 822,520', color: '#fb7185', dots: 8, label: 'Sympathetic fibres to the arterioles: resistance' },
    { id: 'resp', d: 'M 286,262 C 460,276 640,240 772,232', color: '#a78bfa', dots: 6, label: 'Outflow to the respiratory muscles' },
];

const CENTRES = [
    { id: 'vmc', y: 96, name: 'Vasomotor centre', note: 'Vasomotor centre (VMC): sets the sympathetic outflow' },
    { id: 'vagal', y: 152, name: 'Cardiac vagal centre', note: 'Cardiac inhibitory (vagal) centre: the origin of the vagal tone' },
    { id: 'resp', y: 208, name: 'Respiratory centre', note: 'Respiratory centre: driven mainly by the arterial PCO₂' },
];

type DiagramHandle = { apply: (m: Motion) => void };

type HoverProps = { onPointerEnter: () => void; onPointerLeave: () => void };

const ReflexDiagram = forwardRef<DiagramHandle, { hover: (name: string) => HoverProps }>(({ hover }, ref) => {
    const paths = useRef<Record<string, SVGPathElement | null>>({});
    const dots = useRef<Record<string, (SVGCircleElement | null)[]>>({});
    const centres = useRef<Record<string, SVGRectElement | null>>({});
    const heart = useRef<SVGGElement>(null);
    const lungs = useRef<SVGGElement>(null);
    const sinusL = useRef<SVGEllipseElement>(null);
    const sinusR = useRef<SVGEllipseElement>(null);
    const vesselTop = useRef<SVGPathElement>(null);
    const vesselBot = useRef<SVGPathElement>(null);
    const clampL = useRef<SVGGElement>(null);
    const clampR = useRef<SVGGElement>(null);
    const cutMark = useRef<SVGGElement>(null);
    const lens = useRef<Record<string, number>>({});

    useImperativeHandle(ref, () => ({
        apply(m) {
            const t = performance.now() / 1000;
            // Traffic in each pathway: how fast the dots run, and how clearly they show
            const rate: Record<string, number> = {
                sinus: m.occludeL && m.occludeR ? 0.05 : m.distend ? 1 : m.baroCarotid,
                aortic: m.vagiCut ? 0 : m.baroAortic,
                vagus: m.vagiCut ? (m.stimPeriph ? 1 : 0) : m.atropine ? 0.08 : m.vagal,
                symHeart: m.sym, symVessel: m.sym, resp: m.respDrive,
            };
            for (const p of PATHWAYS) {
                const el = paths.current[p.id];
                if (!el) continue;
                if (lens.current[p.id] === undefined) lens.current[p.id] = el.getTotalLength();
                const len = lens.current[p.id];
                const r = clamp01(rate[p.id] ?? 0);
                el.setAttribute('opacity', String(0.32 + 0.5 * r));
                el.setAttribute('stroke-width', String(2.4 + 2.2 * r));
                const list = dots.current[p.id] ?? [];
                list.forEach((c, i) => {
                    if (!c) return;
                    if (r < 0.06) { c.setAttribute('opacity', '0'); return; }
                    const q = ((t * (0.12 + 0.55 * r) + i / list.length) % 1);
                    const pt = el.getPointAtLength(len * q);
                    c.setAttribute('cx', pt.x.toFixed(1));
                    c.setAttribute('cy', pt.y.toFixed(1));
                    c.setAttribute('opacity', String(0.35 + 0.65 * r));
                    c.setAttribute('r', String(3 + 2.2 * r));
                });
            }
            // The centres glow with their activity
            const act: Record<string, number> = { vmc: m.sym, vagal: m.atropine ? 0.1 : m.vagal, resp: m.respDrive };
            for (const c of CENTRES) {
                const el = centres.current[c.id];
                if (el) el.setAttribute('fill-opacity', String(0.12 + 0.6 * clamp01(act[c.id] ?? 0)));
            }
            // The heart beats at the live rate, the lungs fill with each breath
            if (heart.current) {
                const beat = 1 + 0.085 * Math.pow(Math.sin(Math.PI * clamp01((m.beat % 1) / 0.6)), 2);
                heart.current.setAttribute('transform', `translate(576 506) scale(${(1 / beat).toFixed(3)} ${beat.toFixed(3)}) translate(-576 -506)`);
            }
            if (lungs.current) {
                const ph = m.breath % 1;
                const fill = ph < 0.4 ? Math.sin((Math.PI / 2) * (ph / 0.4)) : Math.cos((Math.PI / 2) * ((ph - 0.4) / 0.6));
                const s = 1 + 0.1 * fill;
                lungs.current.setAttribute('transform', `translate(862 230) scale(${s.toFixed(3)}) translate(-862 -230)`);
            }
            // The sinus wall: stretched by the pressure it feels
            const stretch = (el: SVGEllipseElement | null, occluded: boolean) => {
                if (!el) return;
                const p = m.distend ? 1 : occluded ? 0.1 : clamp01((m.map - 40) / 150);
                el.setAttribute('rx', (13 + 9 * p).toFixed(1));
            };
            stretch(sinusL.current, m.occludeL);
            stretch(sinusR.current, m.occludeR);
            // The arteriole narrows as the resistance rises
            const bore = clamp(26 - 13 * (m.tpr - 1), 7, 34);
            vesselTop.current?.setAttribute('d', `M 820,520 C 860,${(500 - bore / 2).toFixed(0)} 900,${(470 - bore / 2).toFixed(0)} 952,${(462 - bore / 2).toFixed(0)}`);
            vesselBot.current?.setAttribute('d', `M 826,536 C 866,${(500 + bore / 2).toFixed(0)} 902,${(470 + bore / 2).toFixed(0)} 952,${(462 + bore / 2).toFixed(0)}`);
            clampL.current?.setAttribute('opacity', m.occludeL ? '1' : '0');
            clampR.current?.setAttribute('opacity', m.occludeR ? '1' : '0');
            cutMark.current?.setAttribute('opacity', m.vagiCut ? '1' : '0');
        },
    }), []);

    const label = (name: string) => hover(name);

    return (
        <ZoomableSvg w={W} h={H} className="w-full h-full">
            <rect x={0} y={0} width={W} height={H} fill="#0b1220" />
            <text x={W / 2} y={38} textAnchor="middle" fill="#64748b" fontSize={19} fontWeight="bold">The reflex arc: how the medulla holds the blood pressure</text>

            {/* --- Brainstem and cord --- */}
            <g {...label('Medulla oblongata: the cardiovascular and respiratory centres')}>
                <path d="M 62,70 Q 56,170 70,250 L 70,268 Q 150,286 262,276 L 276,276 Q 292,170 272,78 Q 160,58 62,70 Z"
                    fill="#1e293b" stroke="#475569" strokeWidth={2} />
                <text x={168} y={62} textAnchor="middle" fill="#94a3b8" fontSize={15} fontWeight="bold">Medulla</text>
            </g>
            {CENTRES.map(c => (
                <g key={c.id} {...label(c.note)}>
                    <rect ref={el => { centres.current[c.id] = el; }} x={82} y={c.y} width={176} height={44} rx={9}
                        fill="#38bdf8" fillOpacity={0.3} stroke="#7dd3fc" strokeWidth={1.4} />
                    <text x={170} y={c.y + 27} textAnchor="middle" fill="#e2e8f0" fontSize={13.5} fontWeight="bold">{c.name}</text>
                </g>
            ))}
            <g {...label('Spinal cord and the sympathetic chain, with its ganglia')}>
                <path d="M 142,268 L 196,268 L 188,520 L 152,520 Z" fill="#1e293b" stroke="#475569" strokeWidth={1.6} />
                <path d="M 214,300 L 214,500" stroke="#64748b" strokeWidth={2.4} fill="none" />
                {[330, 380, 430, 480].map(y => <circle key={y} cx={214} cy={y} r={7} fill="#334155" stroke="#94a3b8" strokeWidth={1.4} />)}
                <text x={222} y={312} fill="#64748b" fontSize={12}>sympathetic chain</text>
            </g>

            {/* --- Nerve pathways (drawn under the organs) --- */}
            {PATHWAYS.map(p => (
                <g key={p.id} {...label(p.label)}>
                    <path ref={el => { paths.current[p.id] = el; }} d={p.d} fill="none" stroke={p.color} strokeWidth={3}
                        strokeLinecap="round" opacity={0.6} />
                    {Array.from({ length: p.dots }, (_, i) => (
                        <circle key={i} ref={el => { if (!dots.current[p.id]) dots.current[p.id] = []; dots.current[p.id][i] = el; }} r={4} fill={p.color} opacity={0} />
                    ))}
                </g>
            ))}
            {/* Where the vagi are cut */}
            <g ref={cutMark} opacity={0}>
                <line x1={352} y1={296} x2={386} y2={326} stroke="#f8fafc" strokeWidth={3} strokeLinecap="round" />
                <line x1={386} y1={296} x2={352} y2={326} stroke="#f8fafc" strokeWidth={3} strokeLinecap="round" />
                <text x={398} y={318} fill="#f8fafc" fontSize={13} fontWeight="bold">vagi cut</text>
            </g>

            {/* --- Carotid arteries, sinus and body --- */}
            {([[500, sinusL, clampL, 'Left', 'M 566,398 C 536,372 504,362 500,330'],
               [620, sinusR, clampR, 'Right', 'M 612,356 C 618,344 620,340 620,330']] as const).map(([x, sinusRef, clampRef, side, stem]) => (
                <g key={side}>
                    <g {...label(`${side} common carotid artery, rising from the arch of the aorta`)}>
                        <path d={stem} stroke="#b91c1c" strokeWidth={12} fill="none" strokeLinecap="round" />
                        <path d={`M ${x},332 L ${x},150`} stroke="#b91c1c" strokeWidth={13} fill="none" strokeLinecap="round" />
                    </g>
                    {/* The bifurcation, with the sinus as a dilation of its first part */}
                    <path d={`M ${x},152 L ${x - 24},104`} stroke="#b91c1c" strokeWidth={9} fill="none" strokeLinecap="round" />
                    <path d={`M ${x},152 L ${x + 24},104`} stroke="#b91c1c" strokeWidth={9} fill="none" strokeLinecap="round" />
                    <g {...label('Carotid sinus: baroreceptors in its wall, which fire when it is stretched')}>
                        <ellipse ref={sinusRef} cx={x} cy={186} rx={18} ry={26} fill="#dc2626" stroke="#fca5a5" strokeWidth={1.6} />
                    </g>
                    <g {...label('Carotid body: chemoreceptors, sensing a low PO₂ and a high PCO₂')}>
                        <ellipse cx={x + 26} cy={158} rx={9} ry={12} fill="#fb923c" stroke="#fed7aa" strokeWidth={1.3} />
                    </g>
                    <g ref={clampRef} opacity={0}>
                        <rect x={x - 19} y={288} width={38} height={13} rx={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.4} />
                        <rect x={x - 19} y={306} width={38} height={13} rx={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.4} />
                        <text x={x + 26} y={306} fill="#e2e8f0" fontSize={12} fontWeight="bold">clamp</text>
                    </g>
                    <text x={x} y={94} textAnchor="middle" fill="#64748b" fontSize={11.5}>{side === 'Left' ? 'int. / ext.' : 'int. / ext.'}</text>
                </g>
            ))}

            {/* --- Heart, aorta and arch --- */}
            <g {...label('Aortic arch: baroreceptors in its wall send their fibres in the vagus')}>
                <path d="M 556,440 C 556,380 580,352 642,352 C 676,352 690,374 690,420 L 690,610"
                    stroke="#b91c1c" strokeWidth={16} fill="none" strokeLinecap="round" />
                <ellipse cx={600} cy={352} rx={26} ry={10} fill="#dc2626" stroke="#fca5a5" strokeWidth={1.4} />
                <text x={600} y={336} textAnchor="middle" fill="#64748b" fontSize={11.5}>arch</text>
            </g>
            <g ref={heart} {...label('Heart: the SA node answers the vagus and the sympathetic fibres')}>
                <path d="M 576,566 C 512,528 516,468 552,462 C 566,460 574,468 578,478 C 584,468 592,460 606,462 C 642,468 642,528 576,566 Z"
                    fill="#dc2626" stroke="#fca5a5" strokeWidth={2} />
                <circle cx={556} cy={478} r={7} fill="#fde68a" stroke="#fbbf24" strokeWidth={1.4} />
                <text x={540} y={470} textAnchor="end" fill="#fbbf24" fontSize={11.5} fontWeight="bold">SA node</text>
            </g>

            {/* --- Lungs --- */}
            <g ref={lungs} {...label('Lungs: their stretch receptors send the Hering–Breuer afferents up the vagus')}>
                <path d="M 856,166 L 856,196" stroke="#94a3b8" strokeWidth={7} strokeLinecap="round" />
                <path d="M 856,196 C 812,200 796,232 802,282 C 806,306 836,300 844,276 C 850,252 850,218 856,196 Z"
                    fill="#1e3a5f" stroke="#60a5fa" strokeWidth={1.8} />
                <path d="M 866,196 C 912,200 928,232 922,282 C 918,306 888,300 880,276 C 874,252 872,218 866,196 Z"
                    fill="#1e3a5f" stroke="#60a5fa" strokeWidth={1.8} />
                <text x={862} y={152} textAnchor="middle" fill="#64748b" fontSize={12}>lungs</text>
            </g>

            {/* --- A systemic arteriole --- */}
            <g {...label('Systemic arterioles: the sympathetic fibres set their calibre, and so the resistance')}>
                <path ref={vesselTop} d="M 820,520 C 860,487 900,457 952,449" stroke="#b91c1c" strokeWidth={9} fill="none" strokeLinecap="round" />
                <path ref={vesselBot} d="M 826,536 C 866,513 902,483 952,475" stroke="#b91c1c" strokeWidth={9} fill="none" strokeLinecap="round" />
                <text x={904} y={524} textAnchor="middle" fill="#64748b" fontSize={12}>arterioles</text>
            </g>

            <text x={30} y={H - 22} fill="#475569" fontSize={12.5}>
                The moving dots show the traffic in each nerve; the centres brighten as they become more active.
            </text>
        </ZoomableSvg>
    );
});
ReflexDiagram.displayName = 'ReflexDiagram';

// --- The record: blood pressure above, respiration below, on one sheet of paper ---

interface Sample { x: number; bp: number; resp: number }
interface Mark { x: number; text: string; color: string }

const Chart = ({ data, marks, paperT, damped }: { data: Sample[]; marks: Mark[]; paperT: number; damped: boolean }) => {
    const CW = 920, CH = 430;
    const left = 52, right = 16, top = 64;
    const bpH = 190, gap = 26, respH = 86;
    const plotW = CW - left - right;
    const x0 = Math.max(0, paperT - WINDOW_MS);
    const xs = (x: number) => left + ((x - x0) / WINDOW_MS) * plotW;
    const bpY = (v: number) => top + bpH - (clamp(v, 0, 220) / 220) * bpH;
    const respY0 = top + bpH + gap + respH / 2;
    const respYs = (v: number) => respY0 - clamp(v, -2.6, 2.6) * (respH / 5.4);

    let lo = 0, hi = data.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (data[mid].x < x0) lo = mid + 1; else hi = mid; }
    const shown = data.slice(Math.max(0, lo - 1));
    const line = (sel: (s: Sample) => number, ys: (v: number) => number) =>
        shown.length > 1 ? `M ${shown.map(p => `${xs(p.x).toFixed(1)},${ys(sel(p)).toFixed(1)}`).join(' L ')}` : '';

    const seconds: number[] = [];
    for (let t = Math.ceil(x0 / 5000) * 5000; t <= Math.min(paperT, x0 + WINDOW_MS); t += 5000) seconds.push(t);
    const timeY = top + bpH + gap + respH + 30;
    const seen = marks.filter(mk => mk.x >= x0);

    return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={CW} height={CH} fill="#020617" rx={8} />
            {[0, 40, 80, 120, 160, 200].map(v => (
                <g key={v}>
                    <line x1={left} y1={bpY(v)} x2={CW - right} y2={bpY(v)} stroke={v === 0 ? '#166534' : '#14532d'} />
                    <text x={left - 6} y={bpY(v) + 4} textAnchor="end" fill="#166534" fontSize={12} fontFamily="monospace">{v}</text>
                </g>
            ))}
            <text x={16} y={top + bpH / 2} fill="#166534" fontSize={11} fontFamily="monospace" textAnchor="middle"
                transform={`rotate(-90 16 ${top + bpH / 2})`}>mmHg</text>
            <path d={line(s => s.bp, bpY)} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinejoin="round" />
            <text x={left + 6} y={top + 16} fill="#4ade80" fontSize={13} fontFamily="monospace" fontWeight="bold">
                BP {damped ? '(mercury manometer)' : '(electronic transducer)'}
            </text>

            <line x1={left} y1={respY0} x2={CW - right} y2={respY0} stroke="#14532d" />
            <path d={line(s => s.resp, respYs)} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeLinejoin="round" />
            <text x={left + 6} y={top + bpH + gap + 14} fill="#38bdf8" fontSize={13} fontFamily="monospace" fontWeight="bold">Respiration (expiration ↑)</text>

            {/* Time marker, as on the smoked paper: one mark every 5 s */}
            <line x1={left} y1={timeY} x2={xs(Math.min(paperT, x0 + WINDOW_MS))} y2={timeY} stroke="#4b5563" strokeWidth={1.5} />
            {seconds.map(t => (
                <g key={t}>
                    <line x1={xs(t)} y1={timeY - 7} x2={xs(t)} y2={timeY} stroke="#6b7280" strokeWidth={1.5} />
                    <text x={xs(t)} y={timeY + 16} textAnchor="middle" fill="#4b5563" fontSize={11} fontFamily="monospace">{Math.round(t / 1000)}s</text>
                </g>
            ))}
            <text x={CW - right} y={timeY + 16} textAnchor="end" fill="#4b5563" fontSize={11} fontFamily="monospace">time marker, 1 per 5 s</text>

            {seen.map((mk, i) => {
                const x = xs(mk.x);
                const textY = i % 2 === 0 ? 24 : 46;
                const anchor = x < 120 ? 'start' : x > CW - 140 ? 'end' : 'middle';
                return (
                    <g key={`${mk.x}-${i}`}>
                        <text x={x} y={textY} textAnchor={anchor} fill={mk.color} fontSize={14} fontFamily="monospace" fontWeight="bold">{mk.text}</text>
                        <line x1={x} y1={textY + 5} x2={x} y2={top + bpH + gap + respH} stroke={mk.color} strokeWidth={1.4} strokeDasharray="4 3" opacity={0.75} />
                    </g>
                );
            })}
        </svg>
    );
};

// --- Main component ---

interface Values { map: number; hr: number; rr: number }
interface Row { label: string; before: Values; after: Values; color: string }
// A change counts when it is more than a twenty-fifth of the reading, and at least 3 units
const arrow = (a: number, b: number) => {
    const d = Math.max(0.04 * a, 3);
    return b > a + d ? '↑' : b < a - d ? '↓' : '–';
};

export const CardiovascularReflexes: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { label, hover } = useHoverLabel();
    const [quizOpen, setQuizOpen] = useState(false);
    const questionSet = questionSetFor('bp-respiration');
    const [mobileView, setMobileView] = useState<'arc' | 'record'>('record');
    const [running, setRunning] = useState(true);
    const [damped, setDamped] = useState(true);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [last, setLast] = useState<Action | null>(null);
    const [readout, setReadout] = useState({ map: MAP_REST, hr: HR_REST, rr: RR_REST, pco2: PCO2_REST, po2: PO2_REST, lost: 0 });
    const [flags, setFlags] = useState({ vagiCut: false, occludeL: false, occludeR: false, atropine: false, asphyxia: false, irreversible: false });

    const simRef = useRef<Sim>(newSim());
    const dataRef = useRef<Sample[]>([]);
    const paperRef = useRef(0);
    const runRef = useRef(running);
    runRef.current = running;
    const dampedRef = useRef(damped);
    dampedRef.current = damped;
    const diagram = useRef<DiagramHandle>(null);
    // A row of the table is filled in from the furthest the record moved in the twelve seconds after the change,
    // which is what a student reads off the tracing, not the value at some fixed moment
    const pending = useRef<{ label: string; before: Values; color: string; at: number; until: number; lo: Values; hi: Values } | null>(null);

    const valuesOf = (s: Sim): Values => ({ map: Math.round(s.mapAvg), hr: Math.round(s.hrAvg), rr: Math.round(s.rrAvg) });
    const peakOf = (before: Values, lo: Values, hi: Values): Values => {
        const pick = (b: number, l: number, h: number) => (b - l >= h - b ? l : h);
        return { map: pick(before.map, lo.map, hi.map), hr: pick(before.hr, lo.hr, hi.hr), rr: pick(before.rr, lo.rr, hi.rr) };
    };

    // The loop: the reflexes are worked out in fixed steps, the paper moves while it is running
    useEffect(() => {
        let raf = 0, last = Date.now(), carry = 0, uiAt = 0, nth = 0;
        const loop = () => {
            const now = Date.now();
            carry += Math.min(400, now - last);
            last = now;
            const s = simRef.current;
            while (carry >= STEP) {
                carry -= STEP;
                stepSim(s, STEP);
                if (runRef.current) {
                    paperRef.current += STEP;
                    // Every other step is written down: enough to draw the pulse, and light enough to redraw
                    if (++nth % 2 === 0) {
                        // Mercury damps the pulse; an electronic transducer shows it in full (Jain, p. 332)
                        const bp = dampedRef.current ? s.map + (s.bp - s.map) * 0.38 : s.bp;
                        dataRef.current.push({ x: paperRef.current, bp, resp: s.resp });
                        if (dataRef.current.length > 3200) dataRef.current.splice(0, 800);
                    }
                }
            }
            diagram.current?.apply({
                hr: s.hr, map: s.map, sym: s.sym, vagal: s.vagal, respDrive: s.respDrive,
                baroCarotid: s.baroCarotid, baroAortic: s.baroAortic, chemo: s.chemo,
                beat: s.beat, breath: s.breath, tpr: s.tpr, volume: s.volume,
                occludeL: s.occludeL, occludeR: s.occludeR, vagiCut: s.vagiCut, distend: s.distend > 0,
                stimPeriph: s.stimPeriph > 0, stimCentral: s.stimCentral > 0, atropine: s.atropine > 0, asphyxia: s.asphyxia,
            });
            // Follow the response, then write down how far it went
            const p = pending.current;
            if (p) {
                const v = valuesOf(s);
                p.lo = { map: Math.min(p.lo.map, v.map), hr: Math.min(p.lo.hr, v.hr), rr: Math.min(p.lo.rr, v.rr) };
                p.hi = { map: Math.max(p.hi.map, v.map), hr: Math.max(p.hi.hr, v.hr), rr: Math.max(p.hi.rr, v.rr) };
                if (s.t - p.at > p.until) {
                    setRows(prev => [...prev, { label: p.label, before: p.before, after: peakOf(p.before, p.lo, p.hi), color: p.color }]);
                    pending.current = null;
                }
            }
            if (now - uiAt > 70) {
                uiAt = now;
                setReadout({ map: Math.round(s.mapAvg), hr: Math.round(s.hrAvg), rr: Math.round(s.rrAvg), pco2: Math.round(s.pco2), po2: Math.round(s.po2), lost: Math.round(s.lostFraction * 100) });
                setFlags({ vagiCut: s.vagiCut, occludeL: s.occludeL, occludeR: s.occludeR, atropine: s.atropine > 0, asphyxia: s.asphyxia, irreversible: s.irreversible });
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const doAction = useCallback((a: Action) => {
        const s = simRef.current;
        if (a.needsVagotomy && !s.vagiCut) return;
        const before = valuesOf(s);
        const wasOn = a.toggle?.(s) ?? false;
        a.apply(s);
        const nowOn = a.toggle?.(s) ?? false;
        const text = a.toggle ? (nowOn ? a.label : `Release: ${a.label.replace(/^Cut |^Occlude /, '')}`) : a.label;
        setMarks(prev => [...prev, { x: paperRef.current, text, color: a.color }]);
        setLast(a);
        // A row only for turning something on, or for a one-off
        if (!a.toggle || (!wasOn && nowOn)) pending.current = { label: a.label, before, color: a.color, at: s.t, until: (a.watch ?? 12) * 1000, lo: before, hi: before };
    }, []);

    const resetAll = () => {
        simRef.current = newSim();
        dataRef.current = []; paperRef.current = 0;
        pending.current = null;
        setMarks([]); setLast(null);
    };
    const freshPaper = () => { dataRef.current = []; paperRef.current = 0; setMarks([]); };

    const resting = isResting(simRef.current);
    const guidance = flags.irreversible
        ? 'More than 40% of the blood volume has been lost: this is irreversible shock, and no transfusion will restore the pressure.'
        : flags.asphyxia ? 'The airway is closed. Watch the early rise, then the fall after two or three minutes.'
            : flags.vagiCut ? 'The vagi are cut: the rate is up and the aortic baroreceptors are out of the loop. The two stimulation buttons are now open.'
                : flags.occludeL || flags.occludeR ? 'A carotid is clamped. Note how far the pressure rises, then release it.'
                    : last ? 'Watch the record settle, then release what is held or try the next variable.'
                        : 'The resting record: cardiac waves riding on the slower Traube–Hering waves. Change one variable at a time.';

    const statPill = (text: string, tone: string) => (
        <span key={text} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tone}`}>{text}</span>
    );

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 font-sans relative">
            <header className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-slate-900 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} aria-label="Back" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="min-w-0">
                        <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent truncate">BP &amp; Respiration: the Reflexes</h1>
                        <p className="text-slate-400 text-xs truncate">Mammalian / The record and the effect of variables on it</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setRunning(r => !r)} title={running ? 'Stop the paper' : 'Start the paper'}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700">
                        {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="lg:hidden flex bg-slate-800 border-b border-slate-700">
                    {([['record', 'Record', Activity], ['arc', 'Reflex arc', HeartPulse] ] as const).map(([id, text, Icon]) => (
                        <button key={id} onClick={() => setMobileView(id)}
                            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-medium transition-all ${mobileView === id
                                ? 'bg-slate-900 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <Icon className="w-4 h-4" /><span>{text}</span>
                        </button>
                    ))}
                </div>

                {/* Record and reflex arc */}
                <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
                    <div className={`p-3 lg:p-4 ${mobileView === 'arc' ? 'hidden lg:block' : 'block'}`}>
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">The record</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setDamped(d => !d)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5">
                                    <Gauge className="w-3.5 h-3.5" /> {damped ? 'Mercury manometer' : 'Electronic transducer'}
                                </button>
                                <button onClick={freshPaper} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5" /> New sheet
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden min-h-[240px] lg:min-h-[320px]">
                            <Chart data={dataRef.current} marks={marks} paperT={paperRef.current} damped={damped} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                            {damped
                                ? 'With mercury the pulse looks only 15–20 mmHg high, although the real pulse pressure is 30–50: its inertia damps the swings, so the tracing really follows the mean pressure.'
                                : 'An electronic transducer has little inertia, so the full pulse pressure is written.'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {statPill(`Mean BP ${readout.map} mmHg`, 'bg-emerald-950/50 text-emerald-300 border-emerald-600/50')}
                            {statPill(`HR ${readout.hr}/min`, 'bg-rose-950/50 text-rose-300 border-rose-600/50')}
                            {statPill(`Respiration ${readout.rr}/min`, 'bg-sky-950/50 text-sky-300 border-sky-600/50')}
                            {(flags.asphyxia || readout.pco2 > 44 || readout.po2 < 88) &&
                                statPill(`PCO₂ ${readout.pco2} · PO₂ ${readout.po2}`, 'bg-slate-800 text-slate-300 border-slate-600')}
                            {readout.lost > 0 && statPill(`Blood lost ${readout.lost}%`, 'bg-red-950/50 text-red-300 border-red-600/50')}
                            {resting && statPill('Resting record', 'bg-slate-800 text-slate-400 border-slate-600')}
                        </div>
                    </div>

                    <div className={`relative p-3 lg:p-4 pt-0 ${mobileView === 'record' ? 'hidden lg:block' : 'block'}`}>
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">The reflex arc</h3>
                        <div className="relative bg-[#0b1220] rounded-lg border border-slate-800 overflow-hidden">
                            <HoverLabel label={label} />
                            <ReflexDiagram ref={diagram} hover={hover} />
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full lg:w-[430px] bg-slate-900 border-l border-slate-800 flex flex-col lg:flex-none">
                    <div className="p-4 lg:p-5 space-y-3 overflow-y-auto">
                        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-200 flex gap-2" aria-live="polite">
                            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" /><span>{guidance}</span>
                        </div>

                        {(['carotid', 'vagus', 'drug', 'other'] as Group[]).map(g => (
                            <div key={g}>
                                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                    {GROUP_ICON[g]} {GROUP_TITLE[g]}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ACTIONS.filter(a => a.group === g).map(a => {
                                        const on = a.toggle?.(simRef.current) ?? false;
                                        const blocked = a.needsVagotomy && !flags.vagiCut;
                                        return (
                                            <button key={a.id} onClick={() => doAction(a)} aria-disabled={blocked}
                                                title={blocked ? 'Cut the vagi first' : a.sub}
                                                className={`text-left rounded-lg border px-3 py-2 transition-all ${on ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'} ${blocked ? 'opacity-40' : ''}`}
                                                style={{ borderColor: on ? a.color : '#334155' }}>
                                                <span className="block text-[13px] font-bold leading-tight" style={{ color: a.color }}>
                                                    {on ? `Release: ${a.label}` : a.label}
                                                </span>
                                                <span className="block text-[11px] text-slate-400 leading-tight">{a.sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {last && (
                            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-sm space-y-1.5">
                                <p className="font-bold text-slate-100">{last.label}</p>
                                <p className="text-slate-200"><span className="text-slate-400">Seen: </span>{last.seen}</p>
                                <p className="text-slate-200"><span className="text-slate-400">Why: </span>{last.why}</p>
                                <p className="text-[11px] text-slate-500">{last.source}</p>
                            </div>
                        )}

                        {rows.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Droplet className="w-4 h-4 text-emerald-400" /> Results</label>
                                    <button onClick={() => setRows([])} className="text-xs text-slate-400 hover:text-slate-200 underline">Clear</button>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-700">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-800 text-slate-400">
                                            <tr>
                                                <th className="text-left font-semibold px-2 py-1.5">Variable</th>
                                                <th className="text-right font-semibold px-2 py-1.5">BP (mmHg)</th>
                                                <th className="text-right font-semibold px-2 py-1.5">HR (/min)</th>
                                                <th className="text-right font-semibold px-2 py-1.5">Resp (/min)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((r, i) => (
                                                <tr key={`${r.label}-${i}`} className="border-t border-slate-800">
                                                    <td className="px-2 py-1.5" style={{ color: r.color }}>{r.label}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{r.before.map} → {r.after.map} {arrow(r.before.map, r.after.map)}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{r.before.hr} → {r.after.hr} {arrow(r.before.hr, r.after.hr)}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-200 whitespace-nowrap">{r.before.rr} → {r.after.rr} {arrow(r.before.rr, r.after.rr)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <button onClick={resetAll}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Back to the resting state
                        </button>

                        {questionSet && (
                            <button onClick={() => setQuizOpen(true)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl transition-all border border-indigo-500/40 flex items-center justify-center gap-2">
                                <ListChecks className="w-4 h-4" /> Test yourself (MCQs)
                            </button>
                        )}

                        <p className="text-[11px] text-slate-500 leading-snug">
                            Resting values are the dog&apos;s, as in Jain&apos;s records: mean BP 130–140 mmHg, heart rate about 120/min,
                            respiration 18–20/min. The reflexes are worked out from the arc; no animal is used.
                        </p>
                    </div>
                </div>
            </main>
            {quizOpen && questionSet && <Quiz set={questionSet} onClose={() => setQuizOpen(false)} />}
        </div>
    );
};
