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
    { id: 'stimulus-strength', title: 'Effect of Stimulus Strength', section: 'Amphibian', load: () => import('./stimulus-strength').then(m => m.STRENGTH_QUESTIONS) },
    { id: 'two-stimuli', title: 'Effect of Two Successive Stimuli', section: 'Amphibian', load: () => import('./two-stimuli').then(m => m.TWO_STIMULI_QUESTIONS) },
    { id: 'genesis-tetanus', title: 'Genesis of Tetanus', section: 'Amphibian', load: () => import('./tetanus').then(m => m.TETANUS_QUESTIONS) },
    { id: 'conduction-velocity', title: 'Conduction Velocity', section: 'Amphibian', load: () => import('./conduction-velocity').then(m => m.CV_QUESTIONS) },
    { id: 'normal-cardiogram', title: 'Normal Cardiogram', section: 'Amphibian', load: () => import('./normal-cardiogram').then(m => m.CARDIOGRAM_QUESTIONS) },
    { id: 'properties-cardiac-muscle', title: 'Properties of Cardiac Muscle', section: 'Amphibian', load: () => import('./cardiac-properties').then(m => m.PROPERTIES_QUESTIONS) },
    { id: 'vagus-wcl', title: 'Vagus & White Crescentic Line', section: 'Amphibian', load: () => import('./vagus-wcl').then(m => m.VAGUS_QUESTIONS) },
    { id: 'microscope', title: 'Compound Microscope', section: 'Microscope', load: () => import('./microscope').then(m => m.MICROSCOPE_QUESTIONS) },
];

export const questionSetFor = (id: string) => QUESTION_SETS.find(s => s.id === id);
