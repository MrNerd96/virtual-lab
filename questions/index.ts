import type { QuestionSet } from './types';

// Every practical with a question set. Add a line here when a new set is written.
export const QUESTION_SETS: QuestionSet[] = [
    { id: 'esr', title: 'Erythrocyte Sedimentation Rate', section: 'Hematology', load: () => import('./esr').then(m => m.ESR_QUESTIONS) },
    { id: 'wbc-count', title: 'Total Leucocyte Count (TLC)', section: 'Hematology', load: () => import('./wbc-count').then(m => m.WBC_QUESTIONS) },
    { id: 'rbc-count', title: 'Total RBC Count', section: 'Hematology', load: () => import('./rbc-count').then(m => m.RBC_QUESTIONS) },
    { id: 'dlc-count', title: 'Differential Leucocyte Count (DLC)', section: 'Hematology', load: () => import('./dlc').then(m => m.DLC_QUESTIONS) },
];

export const questionSetFor = (id: string) => QUESTION_SETS.find(s => s.id === id);
