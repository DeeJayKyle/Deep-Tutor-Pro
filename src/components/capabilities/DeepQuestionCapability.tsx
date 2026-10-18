import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  BookMarked,
  CheckCircle,
  Plus,
  Layers,
  Award,
  ArrowRight
} from 'lucide-react';
import { QuestionItem } from '../../types';

interface DeepQuestionCapabilityProps {
  onSaveToQuestionBank: (question: QuestionItem) => void;
}

export const DeepQuestionCapability: React.FC<DeepQuestionCapabilityProps> = ({
  onSaveToQuestionBank
}) => {
  const [topic, setTopic] = useState('Singular Value Decomposition and Low-Rank Approximations');
  const [difficulty, setDifficulty] = useState<'introductory' | 'intermediate' | 'advanced'>('intermediate');
  const [bloomLevel, setBloomLevel] = useState<'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation'>('Analysis');
  const [numQuestions, setNumQuestions] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionItem[]>([
    {
      id: 'gen-1',
      title: 'Eckart-Young Theorem Error Formulation',
      prompt: 'According to the Eckart-Young-Mirsky theorem, if A has singular values sigma_1 >= ... >= sigma_r, what is the minimum Frobenius norm error min_{rank(B) <= k} ||A - B||_F^2?',
      type: 'multiple_choice',
      options: [
        'sum_{i=k+1}^r sigma_i^2',
        'sigma_{k+1}',
        'sum_{i=1}^k sigma_i^2',
        'sigma_1 - sigma_k'
      ],
      correctAnswer: 'sum_{i=k+1}^r sigma_i^2',
      explanation: 'The squared Frobenius norm error equals the sum of the squares of the omitted singular values from k+1 through rank r.',
      difficulty: 'intermediate',
      subject: 'Linear Algebra',
      bloomLevel: 'Analysis',
      bookmarked: false,
      createdAt: 'Just now'
    },
    {
      id: 'gen-2',
      title: 'Spectral Norm vs Frobenius Norm Bounds',
      prompt: 'Explain why the spectral 2-norm truncation error ||A - A_k||_2 is exactly sigma_{k+1}, while the Frobenius norm accounts for all remaining singular values.',
      type: 'open_ended',
      correctAnswer: 'The spectral norm measures the maximum amplification of a unit vector, which is governed solely by the largest singular value of the residual matrix.',
      explanation: 'Because A - A_k has singular values sigma_{k+1}, ..., sigma_r, its spectral norm equals the operator norm sup_{||x||=1} ||(A - A_k)x|| = sigma_{k+1}.',
      difficulty: 'advanced',
      subject: 'Matrix Analysis',
      bloomLevel: 'Evaluation',
      bookmarked: false,
      createdAt: 'Just now'
    }
  ]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newQ: QuestionItem = {
        id: `gen-${Date.now()}`,
        title: `${topic.slice(0, 32)}: ${bloomLevel} Probe`,
        prompt: `Explain the fundamental mathematical trade-off when applying ${topic} in a high-dimensional regime under ${difficulty} assumptions.`,
        type: 'multiple_choice',
        options: [
          'Preserves primary variance while filtering orthogonal noise subspaces',
          'Increases total variance by a factor proportional to matrix dimensions',
          'Forces singular values to assume negative eigenvalues',
          'Eliminates conditioning numbers entirely'
        ],
        correctAnswer: 'Preserves primary variance while filtering orthogonal noise subspaces',
        explanation: 'Low-rank approximations project data onto the dominant subspace spanned by leading singular vectors, effectively attenuating isotropic Gaussian noise in orthogonal directions.',
        difficulty,
        subject: topic,
        bloomLevel,
        bookmarked: false,
        createdAt: 'Just now'
      };
      setGeneratedQuestions((prev) => [newQ, ...prev]);
      setIsGenerating(false);
    }, 1000);
  };

  const handleSave = (q: QuestionItem) => {
    onSaveToQuestionBank(q);
    setSavedIds((prev) => [...prev, q.id]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-sky-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Deep Question Generator</h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate pedagogical quizzes, exam problems, and conceptual probes aligned with Bloom's Taxonomy.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-sky-900/40 px-3 py-1.5 rounded-lg border border-sky-700/50 text-sky-300">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Curriculum Aligned</span>
        </div>
      </div>

      {/* Generator Form */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Topic or Concept Focus:</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            placeholder="e.g. Eigenvalue Decomposition, Softmax Cross-Entropy, Fourier Analysis"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Difficulty */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Difficulty:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="introductory">Introductory</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Bloom's Taxonomy */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Bloom's Taxonomy Level:</label>
            <select
              value={bloomLevel}
              onChange={(e) => setBloomLevel(e.target.value as any)}
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="Knowledge">Knowledge (Recall)</option>
              <option value="Comprehension">Comprehension (Explain)</option>
              <option value="Application">Application (Solve)</option>
              <option value="Analysis">Analysis (Deconstruct)</option>
              <option value="Synthesis">Synthesis (Design)</option>
              <option value="Evaluation">Evaluation (Judge/Critique)</option>
            </select>
          </div>

          {/* Number of Questions */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Quantity:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating Questions...' : 'Generate New Probes'}</span>
          </button>
        </div>
      </div>

      {/* Generated Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Generated Academic Questions ({generatedQuestions.length})</span>
          <span>Click "Add to Question Bank" to sync with practice tests</span>
        </div>

        {generatedQuestions.map((q) => {
          const isSaved = savedIds.includes(q.id);
          return (
            <div
              key={q.id}
              className="bg-[#121826] border border-[#1e293b] rounded-xl p-5 space-y-3.5 transition-all hover:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {q.bloomLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300">
                    {q.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                    {q.type.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() => handleSave(q)}
                  disabled={isSaved}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                    isSaved
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 border border-indigo-500/40'
                  }`}
                >
                  {isSaved ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isSaved ? 'In Question Bank' : 'Save to Bank'}</span>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{q.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{q.prompt}</p>
              </div>

              {q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`text-xs p-2 rounded-lg border font-mono ${
                        opt === q.correctAnswer
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#0d131f] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="mr-2 font-bold text-slate-500">{String.fromCharCode(65 + i)}.</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Model Answer & Explanation:</span>
                <p className="text-[11px] text-slate-400 font-sans">{q.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
