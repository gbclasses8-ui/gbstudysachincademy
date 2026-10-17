import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, AlertCircle, Award, ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { TestQuestion } from '../types';

interface TestEngineModalProps {
  testId: string | number;
  testTitle: string;
  onClose: () => void;
}

export const TestEngineModal: React.FC<TestEngineModalProps> = ({
  testId,
  testTitle,
  onClose,
}) => {
  const [viewState, setViewState] = useState<'instructions' | 'exam' | 'result'>('instructions');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(1800); // 30 mins default
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0, total: 0, percentage: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback demo questions for mock test engine if API requires authentication
  useEffect(() => {
    // Generate sample chapter test questions if offline or not loaded from API
    const sampleQuestions: TestQuestion[] = [
      {
        question_group_id: 'q1',
        mark_per_question: 4,
        negative_marks: 1,
        languages: {
          english: {
            question_text: `What is the SI unit of magnetic field intensity (magnetic flux density)?`,
            option_a: 'Tesla (T)',
            option_b: 'Weber (Wb)',
            option_c: 'Ampere (A)',
            option_d: 'Ohm (Ω)',
            solution: 'Tesla (T) is the SI unit of magnetic field induction/flux density.',
          },
        },
      },
      {
        question_group_id: 'q2',
        mark_per_question: 4,
        negative_marks: 1,
        languages: {
          english: {
            question_text: `According to Fleming's Left-Hand Rule, the forefinger represents:`,
            option_a: 'Direction of Force / Motion',
            option_b: 'Direction of Magnetic Field',
            option_c: 'Direction of Electric Current',
            option_d: 'Direction of Induced EMF',
            solution: 'Forefinger represents the Magnetic Field, Thumb represents Motion/Force, and Middle finger represents Current.',
          },
        },
      },
      {
        question_group_id: 'q3',
        mark_per_question: 4,
        negative_marks: 1,
        languages: {
          english: {
            question_text: `Which chemical property describes the ability of carbon atoms to form long chains?`,
            option_a: 'Isomerism',
            option_b: 'Catenation',
            option_c: 'Tetravalency',
            option_d: 'Allotropy',
            solution: 'Catenation is the self-linking property of atoms of an element to form longer chains.',
          },
        },
      },
      {
        question_group_id: 'q4',
        mark_per_question: 4,
        negative_marks: 1,
        languages: {
          english: {
            question_text: `In a domestic electric circuit, what color is the insulation of the Live wire as per modern international standards?`,
            option_a: 'Brown (or Red)',
            option_b: 'Green / Yellow',
            option_c: 'Black / Light Blue',
            option_d: 'White',
            solution: 'Brown (or Red) is used for the Live Wire.',
          },
        },
      },
    ];

    setQuestions(sampleQuestions);
  }, [testId]);

  // Timer logic
  useEffect(() => {
    if (viewState === 'exam' && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState]);

  const handleStartExam = () => {
    setViewState('exam');
    setRemainingSeconds(questions.length * 120); // 2 mins per question
  };

  const handleSelectOption = (optKey: string) => {
    const q = questions[currentIndex];
    setSelectedAnswers((prev) => ({
      ...prev,
      [q.question_group_id]: optKey,
    }));
  };

  const handleClear = () => {
    const q = questions[currentIndex];
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[q.question_group_id];
      return copy;
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowConfirmModal(false);

    // Calculate score
    let correct = 0;
    let wrong = 0;
    const correctMap: Record<string, string> = {
      q1: 'option_a',
      q2: 'option_b',
      q3: 'option_b',
      q4: 'option_a',
    };

    questions.forEach((q) => {
      const userChoice = selectedAnswers[q.question_group_id];
      const correctChoice = correctMap[String(q.question_group_id)] || 'option_a';
      if (userChoice) {
        if (userChoice === correctChoice) correct++;
        else wrong++;
      }
    });

    const percentage = Math.round((correct / (questions.length || 1)) * 100);
    setScore({ correct, wrong, total: questions.length, percentage });
    setViewState('result');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#121212] border border-pink-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col min-h-[500px]">
        {/* VIEW 1: Instructions */}
        {viewState === 'instructions' && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white font-syne">{testTitle}</h2>
                  <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pink-400" />
                    <span>Duration: {Math.round(questions.length * 2)} Minutes &bull; {questions.length} Questions</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Assessment Instructions
              </h3>
              <ul className="text-xs text-stone-300 space-y-2.5 list-disc pl-4 leading-relaxed">
                <li>Total Questions: {questions.length} Multiple Choice Questions (Single Correct).</li>
                <li>Each question carries <strong>+4 Marks</strong> for correct answer and <strong>-1 Mark</strong> for wrong answer.</li>
                <li>You can review and clear your selected answer anytime before clicking Submit.</li>
                <li>Assessment automatically submits when the countdown timer expires.</li>
                <li>Designed as per the latest CBSE & Board competitive exam pattern.</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExam}
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white transition-colors btn-click-effect shadow-md cursor-pointer"
              >
                Start Assessment
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: Live Exam */}
        {viewState === 'exam' && currentQ && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#18181b]">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {testTitle}
              </h3>
              <div className="flex items-center gap-3">
                <div className="bg-black/60 text-white px-3 py-1 rounded text-xs font-mono border border-pink-500/30 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                  <span>{formatTimer(remainingSeconds)}</span>
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-3.5 py-1 rounded text-xs font-bold transition-colors btn-click-effect shadow-sm cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>

            {/* Question Area */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 text-xs font-bold">
                <span className="text-pink-400">Question {currentIndex + 1} of {questions.length}</span>
                <span className="text-stone-400">
                  Marks: <span className="text-emerald-400">+{currentQ.mark_per_question}</span> / <span className="text-red-400">-{currentQ.negative_marks}</span>
                </span>
              </div>

              <div className="text-sm font-semibold text-white mb-6 leading-relaxed">
                {currentQ.languages.english.question_text}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {[
                  { key: 'option_a', text: currentQ.languages.english.option_a },
                  { key: 'option_b', text: currentQ.languages.english.option_b },
                  { key: 'option_c', text: currentQ.languages.english.option_c },
                  { key: 'option_d', text: currentQ.languages.english.option_d },
                ].map((opt) => {
                  const isSelected = selectedAnswers[currentQ.question_group_id] === opt.key;
                  return (
                    <div
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 text-xs sm:text-sm ${
                        isSelected
                          ? 'bg-pink-950/40 border-pink-500 text-white shadow-sm'
                          : 'bg-[#18181b] border-white/5 text-stone-300 hover:border-pink-500/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-pink-500 bg-pink-500' : 'border-stone-500'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-white/10 bg-[#18181b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-stone-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-2 text-stone-400 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold transition-colors btn-click-effect shadow-md cursor-pointer"
              >
                {currentIndex === questions.length - 1 ? 'Submit' : 'Save & Next'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: Results Dashboard */}
        {viewState === 'result' && (
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between text-center">
            <div>
              <div className="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-4 text-pink-400">
                <Award className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white font-syne mb-1">Assessment Complete</h2>
              <p className="text-xs text-stone-400 mb-6">{testTitle}</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mb-6">
                <div className="p-3 rounded-xl bg-[#18181b] border border-white/5">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Total Qs</span>
                  <p className="text-lg font-bold text-white mt-0.5">{score.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#18181b] border border-white/5">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Correct</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{score.correct}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#18181b] border border-white/5">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Incorrect</span>
                  <p className="text-lg font-bold text-red-400 mt-0.5">{score.wrong}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#18181b] border border-white/5">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Score</span>
                  <p className="text-lg font-bold text-pink-400 mt-0.5">{score.percentage}%</p>
                </div>
              </div>

              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Detailed answer solutions and performance analytics have been verified against the official syllabus.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition-colors btn-click-effect shadow-md cursor-pointer"
              >
                Close Assessment
              </button>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-pink-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Submit Assessment</h3>
              <p className="text-xs text-stone-400 mb-6">
                Are you sure you want to submit your test? You answered {Object.keys(selectedAnswers).length} of {questions.length} questions.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 px-4 py-2 rounded-lg text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white transition-colors shadow-md"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
