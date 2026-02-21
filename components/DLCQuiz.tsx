import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Trophy, Flame, RotateCcw, ChevronRight, Target, Zap, Star, X, Clock, Timer, AlertTriangle } from 'lucide-react';
import { trackExperiment } from '../App';

// --- CELL DATA ---
// Maps cell type names to their folder and image filenames
const CELL_DATABASE: Record<string, { folder: string; images: string[] }> = {
    'Band Neutrophil': {
        folder: 'band neutrophil',
        images: ['Neutrophil band_001.jpg', 'Neutrophil band_003.jpg', 'Neutrophil band_004.jpg', 'Neutrophil band_008.jpg'],
    },
    'Segmented Neutrophil': {
        folder: 'segmented neutrophil',
        images: ['Neutrophil segment_003.jpg', 'Neutrophil segment_005.jpg', 'Neutrophil segment_010.jpg', 'Neutrophil segment_012.jpg', 'Neutrophil segment_014.jpg'],
    },
    'Basophil': {
        folder: 'basophils',
        images: ['Basophilic segment_001.jpg', 'Basophilic segment_002.jpg', 'Basophilic segment_003.jpg', 'Basophilic segment_005.jpg', 'Basophilic segment_009.jpg'],
    },
    'Eosinophil': {
        folder: 'eosinophils',
        images: ['Eosinophilic band_001.jpg', 'Eosinophilic band_008.jpg', 'Eosinophilic segment_002.jpg', 'Eosinophilic segment_003.jpg', 'Eosinophilic segment_011.jpg', 'Eosinophilic segment_012.jpg'],
    },
    'Large Lymphocyte': {
        folder: 'large lymphocytes',
        images: ['Large Granular Lymphocyte_001.jpg', 'Large Granular Lymphocyte_002.jpg', 'Large Granular Lymphocyte_003.jpg', 'Large Granular Lymphocyte_004.jpg', 'Large Granular Lymphocyte_005.jpg'],
    },
    'Small Lymphocyte': {
        folder: 'small lymphocyte',
        images: ['Lymphocyte_001.jpg', 'Lymphocyte_002.jpg', 'Lymphocyte_003.jpg', 'Lymphocyte_007.jpg', 'Lymphocyte_008.jpg'],
    },
    'Monocyte': {
        folder: 'monocyte',
        images: ['Monocyte_003.jpg', 'Monocyte_007.jpg', 'Monocyte_010.jpg', 'Monocyte_011.jpg', 'Monocyte_012.jpg'],
    },
};

const CELL_TYPES = Object.keys(CELL_DATABASE);
const QUESTIONS_PER_ROUND = 20;
const AUTO_ADVANCE_MS = 1200;
const TOTAL_TIME_LIMIT = 60; // 1 minute total for the quiz

// --- HELPERS ---
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getImageUrl(cellType: string, imageFile: string): string {
    const entry = CELL_DATABASE[cellType];
    // encodeURIComponent for spaces in folder/file names
    return `${import.meta.env.BASE_URL}cells/${encodeURIComponent(entry.folder)}/${encodeURIComponent(imageFile)}`;
}

interface QuizOption {
    cellType: string;
    imageFile: string;
    imageUrl: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    targetCell: string;
    options: QuizOption[];
}

// Store the full question for review, with its number
interface MissedQuestion extends QuizQuestion {
    questionNumber: number;
}

function generateQuestion(previousTarget?: string): QuizQuestion {
    // Pick a target cell type (avoid repeating the previous one)
    let availableTypes = CELL_TYPES.filter(t => t !== previousTarget);
    if (availableTypes.length === 0) availableTypes = CELL_TYPES;
    const targetCell = pickRandom(availableTypes);

    // Pick correct image
    const correctImage = pickRandom(CELL_DATABASE[targetCell].images);

    // Pick 3 distractor cell types (all different from target and each other)
    const distractorTypes = shuffle(CELL_TYPES.filter(t => t !== targetCell)).slice(0, 3);

    const options: QuizOption[] = [
        {
            cellType: targetCell,
            imageFile: correctImage,
            imageUrl: getImageUrl(targetCell, correctImage),
            isCorrect: true,
        },
        ...distractorTypes.map(dt => {
            const img = pickRandom(CELL_DATABASE[dt].images);
            return {
                cellType: dt,
                imageFile: img,
                imageUrl: getImageUrl(dt, img),
                isCorrect: false,
            };
        }),
    ];

    return { targetCell, options: shuffle(options) };
}

// --- STYLES (injected) ---
const quizStyles = `
@keyframes dlc-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes dlc-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes dlc-streak-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}
@keyframes dlc-fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dlc-slide-up {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dlc-confetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-120px) rotate(720deg); opacity: 0; }
}
@keyframes dlc-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.4); }
  50% { box-shadow: 0 0 24px rgba(34,197,94,0.8); }
}
@keyframes dlc-wrong-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.4); }
  50% { box-shadow: 0 0 24px rgba(239,68,68,0.8); }
}
@keyframes dlc-timer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.dlc-shake { animation: dlc-shake 0.4s ease-in-out; }
.dlc-pop { animation: dlc-pop 0.3s ease-out; }
.dlc-streak-pulse { animation: dlc-streak-pulse 0.6s ease-in-out; }
.dlc-fade-in { animation: dlc-fade-in 0.4s ease-out; }
.dlc-slide-up { animation: dlc-slide-up 0.5s cubic-bezier(0.34,1.56,0.64,1); }
.dlc-glow { animation: dlc-glow 1s ease-in-out infinite; }
.dlc-wrong-glow { animation: dlc-wrong-glow 0.6s ease-in-out; }
.dlc-timer-pulse { animation: dlc-timer-pulse 0.8s ease-in-out infinite; }
`;

// --- COMPONENT ---
export const DLCQuiz: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [wrongOptions, setWrongOptions] = useState<Set<number>>(new Set());
    const [correctFound, setCorrectFound] = useState(false);
    const [gotItFirstTry, setGotItFirstTry] = useState(true);
    const [highScore, setHighScore] = useState(0);
    const [cellStats, setCellStats] = useState<Record<string, { correct: number; total: number }>>({});
    const [missedQuestions, setMissedQuestions] = useState<MissedQuestion[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const styleRef = useRef<HTMLStyleElement | null>(null);

    // --- TIMER STATE ---
    const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_LIMIT);
    const totalTimerRef = useRef<ReturnType<typeof setInterval>>();
    const gameStartRef = useRef<number>(Date.now());

    // Inject CSS
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = quizStyles;
        document.head.appendChild(style);
        styleRef.current = style;

        // Load high score
        const saved = localStorage.getItem('dlc-quiz-high-score');
        if (saved) setHighScore(parseInt(saved, 10));

        return () => {
            if (styleRef.current) document.head.removeChild(styleRef.current);
        };
    }, []);

    // Handle overall time running out
    useEffect(() => {
        if (gameState !== 'playing' || timeRemaining > 0) return;

        // Time's up — end the game
        if (totalTimerRef.current) clearInterval(totalTimerRef.current);

        // Record unanswered questions as missed
        setMissedQuestions(prev => {
            const missed = [...prev];
            // The current question (if not yet correctly found) counts as missed
            const q = questions[currentIndex];
            if (q && !correctFound) {
                if (!missed.some(m => m.questionNumber === currentIndex + 1)) {
                    missed.push({ ...q, questionNumber: currentIndex + 1 });
                }
            }
            // All questions after currentIndex are unanswered
            for (let i = currentIndex + 1; i < questions.length; i++) {
                missed.push({ ...questions[i], questionNumber: i + 1 });
            }
            return missed;
        });

        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dlc-quiz-high-score', score.toString());
        }
        // Track quiz complete (time ran out)
        const answered = currentIndex + (correctFound ? 1 : 0);
        trackExperiment('quiz_complete', {
            quiz: 'DLC Quiz',
            score,
            total_questions: QUESTIONS_PER_ROUND,
            questions_answered: answered,
            percentage: answered > 0 ? Math.round((score / answered) * 100) : 0,
            reason: 'time_up',
        });
        setGameState('result');
    }, [timeRemaining, gameState, score, highScore]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        };
    }, []);

    const startGame = useCallback(() => {
        const qs: QuizQuestion[] = [];
        let prev: string | undefined;
        for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
            const q = generateQuestion(prev);
            qs.push(q);
            prev = q.targetCell;
        }
        setQuestions(qs);
        setCurrentIndex(0);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setWrongOptions(new Set());
        setCorrectFound(false);
        setGotItFirstTry(true);
        setCellStats({});
        setMissedQuestions([]);
        setGameState('playing');

        // Track quiz start
        trackExperiment('quiz_start', { quiz: 'DLC Quiz', total_questions: QUESTIONS_PER_ROUND });

        // Start overall countdown timer
        setTimeRemaining(TOTAL_TIME_LIMIT);
        if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        gameStartRef.current = Date.now();
        totalTimerRef.current = setInterval(() => {
            const elapsed = (Date.now() - gameStartRef.current) / 1000;
            const remaining = Math.max(0, TOTAL_TIME_LIMIT - elapsed);
            setTimeRemaining(Math.ceil(remaining));
            if (remaining <= 0) {
                clearInterval(totalTimerRef.current!);
            }
        }, 200);
    }, []);

    const handleSelect = useCallback((optionIndex: number) => {
        if (correctFound) return; // Already got correct answer, waiting for advance
        if (wrongOptions.has(optionIndex)) return; // Already tried this wrong option

        const question = questions[currentIndex];
        const option = question.options[optionIndex];
        const correct = option.isCorrect;

        if (correct) {
            // CORRECT — mark as found, update stats, auto-advance
            setCorrectFound(true);

            const firstTry = wrongOptions.size === 0;

            // Update stats (only count once per question)
            setCellStats(prev => {
                const key = question.targetCell;
                const existing = prev[key] || { correct: 0, total: 0 };
                return {
                    ...prev,
                    [key]: {
                        correct: existing.correct + (firstTry ? 1 : 0),
                        total: existing.total + 1,
                    },
                };
            });

            if (firstTry) {
                setScore(s => s + 1);
                setStreak(s => {
                    const newStreak = s + 1;
                    setBestStreak(b => Math.max(b, newStreak));
                    return newStreak;
                });
            }
            // If not first try, streak was already broken on the first wrong answer


            // Auto-advance after brief delay
            timerRef.current = setTimeout(() => {
                if (currentIndex + 1 >= QUESTIONS_PER_ROUND) {
                    // Game over — stop total timer
                    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
                    const finalScore = firstTry ? score + 1 : score;
                    if (finalScore > highScore) {
                        setHighScore(finalScore);
                        localStorage.setItem('dlc-quiz-high-score', finalScore.toString());
                    }
                    setGameState('result');
                    // Track quiz complete (all answered)
                    trackExperiment('quiz_complete', {
                        quiz: 'DLC Quiz',
                        score: finalScore,
                        total_questions: QUESTIONS_PER_ROUND,
                        questions_answered: QUESTIONS_PER_ROUND,
                        percentage: Math.round((finalScore / QUESTIONS_PER_ROUND) * 100),
                        reason: 'completed',
                    });
                } else {
                    setCurrentIndex(i => i + 1);
                    setWrongOptions(new Set());
                    setCorrectFound(false);
                    setGotItFirstTry(true);

                }
            }, AUTO_ADVANCE_MS);
        } else {
            // WRONG — just disable this option, break streak on first wrong
            setWrongOptions(prev => {
                const next = new Set(prev);
                next.add(optionIndex);
                return next;
            });

            if (wrongOptions.size === 0) {
                // First wrong attempt on this question — break streak & count as missed
                setStreak(0);
                setGotItFirstTry(false);
                // Record as missed
                setMissedQuestions(prev => [...prev, { ...question, questionNumber: currentIndex + 1 }]);
            }
        }
    }, [correctFound, wrongOptions, questions, currentIndex, score, highScore]);

    // --- START SCREEN ---
    if (gameState === 'start') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
                {/* Header */}
                <header className="flex items-center px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="ml-3">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                            DLC Quiz
                        </h1>
                        <p className="text-slate-500 text-xs">Identify the Cell</p>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center dlc-fade-in">
                        {/* Icon */}
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 flex items-center justify-center">
                            <Target className="w-12 h-12 text-fuchsia-400" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-3">Identify the Cell</h2>

                        {/* High Score */}
                        {highScore > 0 && (
                            <div className="mb-6 flex items-center justify-center gap-2 text-yellow-400">
                                <Trophy className="w-5 h-5" />
                                <span className="font-bold">Best: {highScore}/{QUESTIONS_PER_ROUND}</span>
                            </div>
                        )}

                        <button
                            onClick={startGame}
                            className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 transition-all active:scale-95"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Zap className="w-6 h-6" /> Start Quiz
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RESULT SCREEN ---
    if (gameState === 'result') {
        const percentage = Math.round((score / QUESTIONS_PER_ROUND) * 100);

        const getGrade = () => {
            if (percentage === 100) return { label: 'PERFECT!', color: 'text-yellow-400', emoji: '🏆' };
            if (percentage >= 80) return { label: 'Excellent!', color: 'text-green-400', emoji: '🌟' };
            if (percentage >= 60) return { label: 'Good Job!', color: 'text-blue-400', emoji: '👍' };
            if (percentage >= 40) return { label: 'Keep Practicing', color: 'text-orange-400', emoji: '💪' };
            return { label: 'Needs Work', color: 'text-red-400', emoji: '📚' };
        };
        const grade = getGrade();

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
                <header className="flex items-center px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="ml-3">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                            DLC Quiz — Results
                        </h1>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="max-w-md w-full text-center dlc-slide-up">
                        {/* Grade */}
                        <div className="text-6xl mb-4">{grade.emoji}</div>
                        <h2 className={`text-3xl font-bold mb-2 ${grade.color}`}>{grade.label}</h2>

                        {/* Score circle */}
                        <div className="w-36 h-36 mx-auto my-8 rounded-full border-4 border-slate-700 flex flex-col items-center justify-center bg-slate-900">
                            <span className="text-5xl font-bold text-white">{score}</span>
                            <span className="text-slate-500 text-sm">/ {QUESTIONS_PER_ROUND}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={onBack}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all"
                            >
                                <X className="w-5 h-5 inline mr-1" /> Exit
                            </button>
                            <button
                                onClick={startGame}
                                className="flex-[2] py-3 rounded-xl font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5 inline mr-1" /> Play Again
                            </button>
                        </div>

                        {/* Review Wrong Answers */}
                        {missedQuestions.length > 0 && (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6 text-left">
                                <h3 className="text-sm font-bold text-red-400 uppercase mb-4">Review Wrong Answers ({missedQuestions.length})</h3>
                                <div className="space-y-5">
                                    {missedQuestions.map((mq, i) => (
                                        <div key={i} className="border border-slate-700 rounded-xl p-3">
                                            {/* Question prompt */}
                                            <p className="text-center mb-2">
                                                <span className="text-slate-500 text-xs">Q{mq.questionNumber} — Identify the </span>
                                                <span className="text-white font-bold text-sm">{mq.targetCell}</span>
                                            </p>
                                            {/* 2x2 options grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {mq.options.map((opt, j) => (
                                                    <div
                                                        key={j}
                                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 ${opt.isCorrect
                                                            ? 'border-green-500'
                                                            : 'border-slate-700 opacity-40'
                                                            }`}
                                                    >
                                                        <img
                                                            src={opt.imageUrl}
                                                            alt={opt.cellType}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Label on every option */}
                                                        <div className={`absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] font-bold text-center ${opt.isCorrect ? 'bg-green-500/90 text-white' : 'bg-slate-900/80 text-slate-400'
                                                            }`}>
                                                            {opt.cellType}
                                                        </div>
                                                        {/* Checkmark for correct */}
                                                        {opt.isCorrect && (
                                                            <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                                <span className="text-white text-xs">✓</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // --- PLAYING SCREEN ---
    const question = questions[currentIndex];
    if (!question) return null;

    const progress = ((currentIndex + 1) / QUESTIONS_PER_ROUND) * 100;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Countdown timer */}
                        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${timeRemaining <= 30 ? 'text-red-400' : timeRemaining <= 60 ? 'text-yellow-400' : 'text-cyan-400'} ${timeRemaining <= 15 ? 'dlc-timer-pulse' : ''}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        {/* Streak */}
                        {streak >= 2 && (
                            <div className="flex items-center gap-1 text-orange-400 font-bold text-sm dlc-streak-pulse">
                                <Flame className="w-4 h-4" /> {streak}
                            </div>
                        )}
                        {/* Score */}
                        <div className="flex items-center gap-1 text-green-400 font-bold text-sm">
                            <Star className="w-4 h-4" /> {score}
                        </div>
                        {/* Question number */}
                        <span className="text-slate-500 text-sm font-mono">
                            {currentIndex + 1}/{QUESTIONS_PER_ROUND}
                        </span>
                    </div>
                </div>



                {/* Overall countdown timer bar */}
                {(() => {
                    const fraction = timeRemaining / TOTAL_TIME_LIMIT;
                    const isLow = timeRemaining <= 30;
                    const isCritical = timeRemaining <= 15;
                    const barColor = isCritical
                        ? 'bg-red-500'
                        : isLow
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500';
                    return (
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-[width] duration-200 ${barColor} ${isLow ? 'dlc-timer-pulse' : ''}`}
                                style={{ width: `${fraction * 100}%` }}
                            />
                        </div>
                    );
                })()}
            </header>

            {/* Question Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6" key={currentIndex}>
                {/* Prompt */}
                <div className="dlc-fade-in text-center">
                    <p className="text-slate-500 text-sm mb-1">Identify the</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        {question.targetCell}
                    </h2>
                </div>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-md dlc-fade-in">
                    {question.options.map((opt, idx) => {
                        const isWrong = wrongOptions.has(idx);
                        let borderClass = 'border-slate-700 hover:border-slate-500';
                        let extraClass = '';

                        if (correctFound && opt.isCorrect) {
                            // Correct answer found — highlight it
                            borderClass = 'border-green-500';
                            extraClass = 'dlc-glow';
                        } else if (isWrong) {
                            // This was a wrong guess — dim it out
                            borderClass = 'border-red-500/50';
                            extraClass = 'opacity-30 pointer-events-none';
                        } else if (correctFound) {
                            // Correct found, but this is a non-selected option — dim
                            borderClass = 'border-slate-800';
                            extraClass = 'opacity-40';
                        }

                        const isDisabled = correctFound || isWrong;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(idx)}
                                disabled={isDisabled}
                                className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 ${borderClass} ${extraClass} ${!isDisabled ? 'active:scale-95 cursor-pointer' : 'cursor-default'
                                    }`}
                            >
                                <img
                                    src={opt.imageUrl}
                                    alt={`Cell option ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />

                                {/* Correct label — only when correct is found */}
                                {correctFound && opt.isCorrect && (
                                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-xs font-bold text-center bg-green-500/90 text-white">
                                        {opt.cellType}
                                    </div>
                                )}

                                {/* Correct checkmark */}
                                {correctFound && opt.isCorrect && (
                                    <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center dlc-pop">
                                        <span className="text-white text-lg">✓</span>
                                    </div>
                                )}

                                {/* Wrong X — on wrong guesses */}
                                {isWrong && (
                                    <div className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-lg">✗</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback text */}
                {correctFound && (
                    <div className="text-center dlc-pop text-green-400">
                        <p className="text-lg font-bold">
                            {wrongOptions.size === 0 ? (
                                streak >= 3 ? `🔥 ${streak} in a row!` : '✅ Correct!'
                            ) : (
                                '✅ Got it!'
                            )}
                        </p>
                    </div>
                )}
                {!correctFound && wrongOptions.size > 0 && (
                    <div className="text-center dlc-pop text-red-400">
                        <p className="text-lg font-bold">❌ Try again!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
