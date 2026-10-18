import React, { useState } from 'react';
import {
  Terminal,
  Bookmark,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Search,
  Filter
} from 'lucide-react';
import { QuestionItem } from '../../types';

interface QuestionBankViewProps {
  questions: QuestionItem[];
  onToggleBookmark: (id: string) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  onToggleBookmark
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  const filtered = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBookmark = onlyBookmarked ? q.bookmarked : true;
    return matchesSearch && matchesBookmark;
  });

  const handleSelectOption = (qId: string, option: string) => {
    if (testSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const calculateScore = () => {
    let correct = 0;
    const testList = filtered.filter((q) => q.type === 'multiple_choice');
    testList.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) correct++;
    });
    return {
      correct,
      total: testList.length,
      percentage: testList.length ? Math.round((correct / testList.length) * 100) : 0
    };
  };

  const score = testSubmitted ? calculateScore() : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Question Bank & Notebook</span>
          </h2>
          <p className="text-xs text-slate-400">
            Curated repository of academic questions generated from Deep Question, Socratic turns, and practice cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsTestMode(!isTestMode);
              setTestSubmitted(false);
              setUserAnswers({});
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors ${
              isTestMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isTestMode ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTestMode ? 'Exit Test Mode' : 'Start Practice Test'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] border border-[#1e293b] p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#0d121e] border border-slate-700 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions by topic, prompt, or formula..."
            className="w-full bg-transparent text-slate-200 focus:outline-none placeholder-slate-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              onlyBookmarked
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarked Only</span>
          </button>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
            {filtered.length} questions
          </span>
        </div>
      </div>

      {/* Test Score Alert */}
      {isTestMode && testSubmitted && score && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/40 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Practice Test Completed</span>
            </div>
            <p className="text-slate-300">
              You scored <span className="text-emerald-400 font-bold">{score.correct}</span> out of{' '}
              <span className="font-bold">{score.total}</span> questions ({score.percentage}%).
            </p>
          </div>
          <button
            onClick={() => {
              setTestSubmitted(false);
              setUserAnswers({});
            }}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Retake Test
          </button>
        </div>
      )}

      {/* Question Cards */}
      <div className="space-y-4">
        {filtered.map((q, idx) => {
          const userAnswer = userAnswers[q.id];
          const isCorrect = userAnswer === q.correctAnswer;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border transition-all ${
                testSubmitted && q.type === 'multiple_choice'
                  ? isCorrect
                    ? 'bg-[#101925] border-emerald-500/40'
                    : 'bg-[#191216] border-rose-500/40'
                  : 'bg-[#121826] border-[#1e293b]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {q.bloomLevel}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                    {q.subject}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded text-slate-400">
                    {q.difficulty}
                  </span>
                </div>

                <button
                  onClick={() => onToggleBookmark(q.id)}
                  className={`p-1 rounded transition-colors ${
                    q.bookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-white'
                  }`}
                  title={q.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1.5">{q.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{q.prompt}</p>

              {/* Options */}
              {q.options && (
                <div className="space-y-1.5 pt-1">
                  {q.options.map((opt, i) => {
                    const isSelected = userAnswer === opt;
                    const isTheCorrectOne = opt === q.correctAnswer;

                    let optionStyle = 'bg-[#0d131f] border-slate-800 text-slate-300 hover:border-slate-700';

                    if (isTestMode && !testSubmitted && isSelected) {
                      optionStyle = 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-semibold';
                    }

                    if (testSubmitted) {
                      if (isTheCorrectOne) {
                        optionStyle = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold';
                      } else if (isSelected && !isTheCorrectOne) {
                        optionStyle = 'bg-rose-950/40 border-rose-500/60 text-rose-200 line-through';
                      }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(q.id, opt)}
                        disabled={testSubmitted}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
                          <span>{opt}</span>
                        </div>
                        {testSubmitted && isTheCorrectOne && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {testSubmitted && isSelected && !isTheCorrectOne && (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Explanation (always shown in standard mode, or after test submit) */}
              {(!isTestMode || testSubmitted) && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300">Explanation:</span>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Submit Floating Button */}
      {isTestMode && !testSubmitted && (
        <div className="sticky bottom-4 flex justify-center">
          <button
            onClick={() => setTestSubmitted(true)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 transition-transform hover:scale-105"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Test & Review Explanations</span>
          </button>
        </div>
      )}
    </div>
  );
};
