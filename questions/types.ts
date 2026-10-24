// One multiple-choice question. Options are shuffled when shown, so never write "all of the above".
export interface MCQ {
    q: string;
    options: [string, string, string, string];
    answer: 0 | 1 | 2 | 3; // index of the correct option, as written
    explain: string;       // one or two sentences shown after answering
    source: string;        // book and chapter the fact comes from
}

export interface QuestionSet {
    id: string;    // matches the module's view id in App.tsx
    title: string;
    section: 'Hematology' | 'Amphibian' | 'Microscope';
    load: () => Promise<MCQ[]>; // loaded only when the quiz is opened
}
