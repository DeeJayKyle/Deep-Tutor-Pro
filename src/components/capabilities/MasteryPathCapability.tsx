import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  ArrowRight
} from 'lucide-react';

export const MasteryPathCapability: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState('Optimization & Convexity');

  const topics = [
    {
      id: 'top-1',
      name: 'Linear Algebra & SVD',
      level: 95,
      status: 'mastered',
      prerequisites: [],
      skills: ['Eckart-Young Theorem', 'Singular Value Decomposition', 'Orthogonal Projections']
    },
    {
      id: 'top-2',
      name: 'Optimization & Convexity',
      level: 82,
      status: 'in_progress',
      prerequisites: ['Linear Algebra & SVD'],
      skills: ['KKT Conditions', 'Gradient Descent Step Size', 'Strong Convexity Bounds']
    },
    {
      id: 'top-3',
      name: 'Neural Network Theory & Backprop',
      level: 78,
      status: 'in_progress',
      prerequisites: ['Optimization & Convexity'],
      skills: ['Jacobian Matrix Flow', 'Cross-Entropy Gradients', 'Vanishing Gradients']
    },
    {
      id: 'top-4',
      name: 'Diffusion & Stochastic Calculus',
      level: 42,
      status: 'exploring',
      prerequisites: ['Neural Network Theory & Backprop'],
      skills: ['Ito SDEs', 'Reverse-Time SDE Integration', 'Score Matching']
    },
    {
      id: 'top-5',
      name: 'RLHF & Preference Alignment',
      level: 0,
      status: 'locked',
      prerequisites: ['Diffusion & Stochastic Calculus'],
      skills: ['DPO Implicit Reward', 'PPO Advantage Actor-Critic', 'KL Divergence Regularization']
    }
  ];

  const activeTopicObj = topics.find((t) => t.name === selectedTopic) || topics[1];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Mastery Path (Guided Learning)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Curriculum progression graph with prerequisite gating, skill radar score, and active mastery challenges.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-900/40 px-3 py-1.5 rounded-lg border border-emerald-700/50 text-emerald-300">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Overall Mastery: 74%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Topic Tree */}
        <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-5 space-y-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Learning Curriculum Tree
          </span>
          <div className="space-y-2">
            {topics.map((t) => {
              const isSelected = selectedTopic === t.name;
              return (
                <button
                  key={t.id}
                  onClick={() => t.status !== 'locked' && setSelectedTopic(t.name)}
                  disabled={t.status === 'locked'}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow'
                      : t.status === 'locked'
                      ? 'bg-[#0b0e17] border-slate-800/80 text-slate-600 opacity-60 cursor-not-allowed'
                      : 'bg-[#0e1422] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                    <div className="flex items-center gap-2 truncate">
                      {t.status === 'mastered' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : t.status === 'locked' ? (
                        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="font-mono text-[11px] shrink-0 font-semibold">{t.level}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${t.level}%` }}
                      className={`h-full rounded-full ${
                        t.level >= 90 ? 'bg-emerald-400' : t.level >= 50 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Topic Detail & Challenge Card */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{activeTopicObj.name}</h3>
                <span className="text-xs text-slate-400">
                  Status: <span className="capitalize font-medium text-emerald-400">{activeTopicObj.status.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">{activeTopicObj.level}%</span>
                <span className="block text-[10px] text-slate-300">Competency Rating</span>
              </div>
            </div>

            {/* Core Skills Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Demonstrated Skills & Objectives:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTopicObj.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800 flex items-center gap-2 text-xs text-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Challenge Prompt */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Next Socratic Milestone Challenge</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {'"Prove why the condition number \\kappa = \\frac{L}{\\mu} dictates that gradient descent achieves an error reduction factor of ((\\kappa - 1) / (\\kappa + 1))^2 per iteration."'}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => alert('Starting Socratic Evaluation Challenge in Chat capability!')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                >
                  <span>Accept Challenge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
