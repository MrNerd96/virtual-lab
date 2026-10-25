import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, ListChecks, Trophy, BookOpen, Sun, Moon } from 'lucide-react';
import type { MCQ, QuestionSet } from '../questions/types';

// Full-screen MCQ quiz for one question set: questions and options shuffled, instant feedback with the
// explanation and source, score at the end, review of wrong answers. The best score is kept on the device.

interface Shown {
    mcq: MCQ;
    options: string[];
    correct: number; // index into `options`
}

const shuffle = <T,>(items: T[]): T[] => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const prepare = (questions: MCQ[]): Shown[] => shuffle(questions).map(mcq => {
    const order = shuffle([0, 1, 2, 3]);
    return { mcq, options: order.map(i => mcq.options[i]), correct: order.indexOf(mcq.answer) };
});

const bestKey = (id: string) => `quiz-best-${id}`;
export const readBestScore = (id: string): number | null => {
    try {
        const v = localStorage.getItem(bestKey(id));
        return v === null ? null : Number(v);
    } catch {
        return null;
    }
};
const saveBestScore = (id: string, percent: number) => {
    try {
        const best = readBestScore(id);
        if (best === null || percent > best) localStorage.setItem(bestKey(id), String(percent));
    } catch {
        // storage unavailable (private window): the score simply is not remembered
    }
};

// Light or dark: follows the device setting until the student taps the switch; the choice is kept on the
// device (and dropped again if it matches the device setting, so the quiz goes back to following it)
type Theme = 'light' | 'dark';
const THEME_KEY = 'quiz-theme';
const readTheme = (): Theme | null => {
    try {
        const v = localStorage.getItem(THEME_KEY);
        return v === 'light' || v === 'dark' ? v : null;
    } catch {
        return null;
    }
};
const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

// Google Analytics (GA4) events for quiz use; does nothing if analytics is not loaded
const track = (event: string, params: Record<string, string | number>) => {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', event, params);
};

const LETTERS = ['A', 'B', 'C', 'D'];
const PRIMARY = 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all';

export const Quiz: React.FC<{ set: QuestionSet; onClose: () => void }> = ({ set, onClose }) => {
    const [questions, setQuestions] = useState<Shown[] | null>(null);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [finished, setFinished] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [previousBest, setPreviousBest] = useState<number | null>(null);
    const [themeChoice, setThemeChoice] = useState<Theme | null>(readTheme);
    const [systemDark, setSystemDark] = useState(systemPrefersDark);

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return;
        const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const dark = (themeChoice ?? (systemDark ? 'dark' : 'light')) === 'dark';
    const toggleTheme = () => {
        const next: Theme = dark ? 'light' : 'dark';
        const followsDevice = (next === 'dark') === systemDark;
        setThemeChoice(followsDevice ? null : next);
        try {
            if (followsDevice) localStorage.removeItem(THEME_KEY);
            else localStorage.setItem(THEME_KEY, next);
        } catch {
            // storage unavailable: the choice lasts for this visit only
        }
    };

    const start = (all: MCQ[]) => {
        const prepared = prepare(all);
        setQuestions(prepared);
        setAnswers(prepared.map(() => null));
        setIndex(0);
        setFinished(false);
        setReviewing(false);
        setPreviousBest(readBestScore(set.id));
        track('quiz_start', { quiz_id: set.id, quiz_name: set.title, quiz_section: set.section, question_count: prepared.length });
    };

    useEffect(() => {
        let cancelled = false;
        set.load().then(all => { if (!cancelled) start(all); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [set]);

    const total = questions?.length ?? 0;
    const score = questions ? answers.filter((a, i) => a === questions[i].correct).length : 0;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const skipped = finished ? answers.filter(a => a === null).length : 0;

    const choose = (option: number) => {
        if (answers[index] !== null) return;
        setAnswers(prev => prev.map((a, i) => (i === index ? option : a)));
    };

    const next = () => {
        if (index < total - 1) {
            setIndex(index + 1);
        } else {
            saveBestScore(set.id, percent);
            track('quiz_complete', {
                quiz_id: set.id,
                quiz_name: set.title,
                quiz_section: set.section,
                score_percent: percent,
                correct: score,
                skipped: answers.filter(a => a === null).length,
                total,
                value: percent, // GA4 aggregates 'value'
            });
            setFinished(true);
        }
    };

    const retry = () => questions && start(questions.map(s => s.mcq));

    const current = questions?.[index];
    const chosen = answers[index];
    const wrong = questions ? questions.map((s, i) => ({ s, a: answers[i] })).filter(({ s, a }) => a !== s.correct) : [];

    // Keys 1 to 4 (or A to D) answer; Enter goes to the next question
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!questions || finished) return;
            const k = e.key.toLowerCase();
            const n = '1234'.includes(k) ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
            if (n >= 0 && answers[index] === null) choose(n);
            else if (e.key === 'Enter' && answers[index] !== null) next();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className={`${dark ? 'dark ' : ''}fixed inset-0 z-50 flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-gradient-to-b from-slate-100 dark:from-slate-950 via-slate-50 dark:via-slate-950 to-indigo-100 dark:to-indigo-950`}>
            {/* Header like the experiment screens: back, title, light/dark switch (Feedback sits to its right) */}
            <header className="flex items-center justify-between gap-3 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 shrink-0" title="Back"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-purple-600 dark:to-purple-500 bg-clip-text text-transparent">{set.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Question bank</p>
                    </div>
                </div>
                <button onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
                <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-300/60 dark:shadow-black/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 sm:px-7 pt-4 text-xs text-slate-500 dark:text-slate-400">
                        {questions && !finished && <span>Question {index + 1} of {total}</span>}
                        {questions && !finished && <span className="ml-auto">Score {score}</span>}
                    </div>
                    {questions && !finished && (
                        <div className="mx-4 sm:mx-7 mt-2.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${((index + (chosen !== null ? 1 : 0)) / total) * 100}%` }} />
                        </div>
                    )}

                    <div className="p-4 sm:p-7">
                        {!questions && <p className="text-slate-500 dark:text-slate-400 text-center py-16">Loading questions…</p>}

                        {questions && !finished && current && (
                            <div className="space-y-5">
                                <p className="text-lg sm:text-xl font-semibold leading-snug text-slate-900 dark:text-slate-50">{current.mcq.q}</p>

                                <div className="space-y-2.5">
                                    {current.options.map((option, i) => {
                                        const answered = chosen !== null;
                                        const isCorrect = i === current.correct;
                                        const isChosen = i === chosen;
                                        const tile = !answered
                                            ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            : isCorrect
                                                ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-50'
                                                : isChosen
                                                    ? 'bg-red-50 dark:bg-red-500/15 border-red-500 text-red-900 dark:text-red-50'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500';
                                        const badge = !answered
                                            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-300 dark:ring-indigo-400/40'
                                            : isCorrect
                                                ? 'bg-emerald-500 text-white'
                                                : isChosen
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500';
                                        return (
                                            <button key={i} onClick={() => choose(i)} disabled={answered}
                                                className={`w-full text-left flex items-center gap-3 px-3.5 py-3 sm:py-3.5 rounded-xl border transition-colors ${tile}`}>
                                                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${badge}`}>{LETTERS[i]}</span>
                                                <span className="flex-1 text-sm sm:text-base leading-snug">{option}</span>
                                                {answered && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                                {answered && isChosen && !isCorrect && <XCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {chosen !== null && (
                                    <div className={`rounded-xl bg-slate-50 dark:bg-slate-800/60 border-l-4 px-4 py-3 space-y-1.5 ${chosen === current.correct ? 'border-emerald-500' : 'border-red-500'}`}>
                                        <p className={`text-sm font-bold ${chosen === current.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {chosen === current.correct ? 'Correct' : `Not quite. The answer is ${LETTERS[current.correct]}.`}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{current.mcq.explain}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {current.mcq.source}</p>
                                    </div>
                                )}

                                {chosen !== null ? (
                                    <button onClick={next} className={`w-full ${PRIMARY}`}>
                                        {index < total - 1 ? 'Next question' : 'See my score'}
                                    </button>
                                ) : (
                                    // Skipping leaves the question unanswered; it counts as not scored and shows in the review
                                    <button onClick={next}
                                        className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors">
                                        {index < total - 1 ? 'Skip this question' : 'Skip and see my score'}
                                    </button>
                                )}
                            </div>
                        )}

                        {questions && finished && !reviewing && (
                            <div className="space-y-4 text-center py-4">
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${percent >= 80 ? 'bg-yellow-400/15 ring-2 ring-yellow-400/60' : percent >= 50 ? 'bg-indigo-500/15 ring-2 ring-indigo-400/50' : 'bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-300 dark:ring-slate-700'}`}>
                                    <Trophy className={`w-10 h-10 ${percent >= 80 ? 'text-yellow-500 dark:text-yellow-400' : percent >= 50 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`} />
                                </div>
                                <p className="text-4xl font-bold">{score} <span className="text-slate-400 dark:text-slate-500 text-2xl">/ {total}</span></p>
                                <p className="text-slate-600 dark:text-slate-300">{percent}% · {percent >= 80 ? 'Excellent' : percent >= 50 ? 'Good, review the ones you missed' : 'Revise this practical and try again'}</p>
                                {skipped > 0 && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{score} correct · {total - score - skipped} wrong · {skipped} skipped</p>
                                )}
                                {previousBest !== null && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500">{percent > previousBest ? `New best score (previous best ${previousBest}%)` : `Your best score: ${previousBest}%`}</p>
                                )}
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    {wrong.length > 0 && (
                                        <button onClick={() => setReviewing(true)}
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2">
                                            <ListChecks className="w-4 h-4" /> {skipped > 0 ? 'Review wrong and skipped' : 'Review wrong answers'} ({wrong.length})
                                        </button>
                                    )}
                                    <button onClick={retry} className={`flex-1 flex items-center justify-center gap-2 ${PRIMARY}`}>
                                        <RefreshCw className="w-4 h-4" /> Try again
                                    </button>
                                </div>
                                <button onClick={onClose} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Back</button>
                            </div>
                        )}

                        {questions && finished && reviewing && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Questions to revise</p>
                                    <button onClick={() => setReviewing(false)} className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-500 dark:hover:text-indigo-200">Back to score</button>
                                </div>
                                {wrong.map(({ s, a }, i) => (
                                    <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-l-4 border-red-500 px-4 py-3 space-y-1.5">
                                        <p className="text-sm font-semibold">{s.mcq.q}</p>
                                        {a !== null
                                            ? <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-1.5"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {s.options[a]}</p>
                                            : <p className="text-sm text-slate-500 dark:text-slate-400 italic">Skipped</p>}
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {s.options[s.correct]}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{s.mcq.explain}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {s.mcq.source}</p>
                                    </div>
                                ))}
                                <button onClick={retry} className={`w-full flex items-center justify-center gap-2 ${PRIMARY}`}>
                                    <RefreshCw className="w-4 h-4" /> Try again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};
