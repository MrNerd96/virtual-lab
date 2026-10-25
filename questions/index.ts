import type { QuestionSet } from './types';

// Every practical with a question set. Add a line here when a new set is written.
export const QUESTION_SETS: QuestionSet[] = [
    { id: 'esr', title: 'Erythrocyte Sedimentation Rate', section: 'Hematology', load: () => import('./esr').then(m => m.ESR_QUESTIONS) },
    { id: 'hb-estimation', title: 'Haemoglobin Estimation', section: 'Hematology', load: () => import('./haemoglobin').then(m => m.HB_QUESTIONS) },
    { id: 'specific-gravity', title: 'Specific Gravity of Blood', section: 'Hematology', load: () => import('./specific-gravity').then(m => m.SG_QUESTIONS) },
    { id: 'osmotic-fragility', title: 'Osmotic Fragility of RBCs', section: 'Hematology', load: () => import('./osmotic-fragility').then(m => m.OF_QUESTIONS) },
    { id: 'wbc-count', title: 'Total Leucocyte Count (TLC)', section: 'Hematology', load: () => import('./wbc-count').then(m => m.WBC_QUESTIONS) },
    { id: 'rbc-count', title: 'Total RBC Count', section: 'Hematology', load: () => import('./rbc-count').then(m => m.RBC_QUESTIONS) },
    { id: 'dlc-count', title: 'Differential Leucocyte Count (DLC)', section: 'Hematology', load: () => import('./dlc').then(m => m.DLC_QUESTIONS) },
    { id: 'twitch', title: 'Simple Muscle Twitch', section: 'Amphibian', load: () => import('./twitch').then(m => m.TWITCH_QUESTIONS) },
    { id: 'load', title: 'Effect of Load', section: 'Amphibian', load: () => import('./effect-of-load').then(m => m.LOAD_QUESTIONS) },
    { id: 'effect-of-temperature', title: 'Effect of Temperature', section: 'Amphibian', load: () => import('./effect-of-temperature').then(m => m.TEMP_QUESTIONS) },
    { id: 'fatigue', title: 'Genesis of Fatigue', section: 'Amphibian', load: () => import('./fatigue').then(m => m.FATIGUE_QUESTIONS) },
];

export const questionSetFor = (id: string) => QUESTION_SETS.find(s => s.id === id);
