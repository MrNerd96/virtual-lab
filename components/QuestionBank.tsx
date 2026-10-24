import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, ListChecks } from 'lucide-react';
import { QUESTION_SETS } from '../questions';
import type { QuestionSet } from '../questions/types';
import { Quiz, readBestScore } from './Quiz';

// Question bank: every practical that has a question set, grouped by section
export const QuestionBank: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [open, setOpen] = useState<QuestionSet | null>(null);
    const sections = [...new Set(QUESTION_SETS.map(s => s.section))];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            <header className="flex items-center gap-4 px-6 py-4 bg-slate-900 border-b border-slate-800">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Question Bank</h1>
                    <p className="text-slate-400 text-xs">MCQs for each practical, with explanations</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 space-y-6">
                {sections.map(section => (
                    <div key={section} className="space-y-2">
                        <h2 className="text-xs font-bold text-slate-400 uppercase">{section}</h2>
                        {QUESTION_SETS.filter(s => s.section === section).map(set => {
                            const best = readBestScore(set.id);
                            return (
                                <button key={set.id} onClick={() => setOpen(set)}
                                    className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition-colors">
                                    <ListChecks className="w-5 h-5 text-indigo-300 shrink-0" />
                                    <span className="flex-1">
                                        <span className="block font-semibold">{set.title}</span>
                                        {best !== null && <span className="block text-xs text-slate-400">Best score: {best}%</span>}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                </button>
                            );
                        })}
                    </div>
                ))}
                <p className="text-xs text-slate-500 text-center">More practicals are being added.</p>
            </main>

            {open && <Quiz set={open} onClose={() => setOpen(null)} />}
        </div>
    );
};
