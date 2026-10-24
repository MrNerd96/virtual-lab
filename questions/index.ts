import type { QuestionSet } from './types';

// Every practical with a question set. Add a line here when a new set is written.
export const QUESTION_SETS: QuestionSet[] = [
    { id: 'esr', title: 'Erythrocyte Sedimentation Rate', section: 'Hematology', load: () => import('./esr').then(m => m.ESR_QUESTIONS) },
];

export const questionSetFor = (id: string) => QUESTION_SETS.find(s => s.id === id);
