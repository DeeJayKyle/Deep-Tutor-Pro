import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Layers,
  FileText,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { CitationSource } from '../../types';

export const DeepResearchCapability: React.FC = () => {
  const [researchTopic, setResearchTopic] = useState('Diffusion Models and Stochastic Differential Equations in Generative Learning');
  const [isResearching, setIsResearching] = useState(false);
  const [stage, setStage] = useState<'rephrasing' | 'decomposing' | 'researching' | 'reporting'>('reporting');

  const [topicQueue, setTopicQueue] = useState([
    { id: 1, title: 'Forward SDE vs Reverse-Time SDE Formulation (Song et al.)', status: 'completed' },
    { id: 2, title: 'Score-Based Generative Modeling & Tweedie Formula', status: 'completed' },
    { id: 3, title: 'Classifier-Free Guidance and Latent Scaling Factors', status: 'completed' },
    { id: 4, title: 'Empirical Sample Quality vs Sampling Steps Trade-off', status: 'completed' },
  ]);

  const [citations, setCitations] = useState<CitationSource[]>([
    {
      id: 'cit-1',
      title: 'Score-Based Generative Modeling through Stochastic Differential Equations',
      url: 'https://arxiv.org/abs/2011.13456',
      provider: 'arXiv:2011.13456',
      year: '2021',
      authors: ['Yang Song', 'Jascha Sohl-Dickstein', 'Diederik P. Kingma']
    },
    {
      id: 'cit-2',
      title: 'Denoising Diffusion Probabilistic Models (DDPM)',
      url: 'https://arxiv.org/abs/2006.11239',
      provider: 'arXiv:2006.11239',
      year: '2020',
      authors: ['Jonathan Ho', 'Ajay Jain', 'Pieter Abbeel']
    },
    {
      id: 'cit-3',
      title: 'Classifier-Free Diffusion Guidance',
      url: 'https://arxiv.org/abs/2207.12598',
      provider: 'OpenAlex',
      year: '2022',
      authors: ['Jonathan Ho', 'Tim Salimans']
    }
  ]);

  const handleStartResearch = () => {
    setIsResearching(true);
    setStage('rephrasing');
    setTimeout(() => setStage('decomposing'), 600);
    setTimeout(() => setStage('researching'), 1200);
    setTimeout(() => {
      setStage('reporting');
      setIsResearching(false);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-teal-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white tracking-tight">Deep Research Engine</h2>
          </div>
          <p className="text-xs text-slate-400">
            Multi-stage autonomous literature review, Dynamic Topic Queue scheduling, and evidence synthesis.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-teal-900/40 px-3 py-1.5 rounded-lg border border-teal-700/50 text-teal-300">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Dynamic Queue Active</span>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Literature Review / Research Query:</span>
          <span>Crawls arXiv, OpenAlex, and connected knowledge bases</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
            className="flex-1 bg-[#0d131f] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            placeholder="Enter research topic or research question..."
          />
          <button
            onClick={handleStartResearch}
            disabled={isResearching || !researchTopic.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors shrink-0"
          >
            {isResearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isResearching ? `Running: ${stage}...` : 'Start Research'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Topic Queue Visualization */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>Dynamic Topic Queue (Decomposed Sub-inquiries)</span>
          </div>
          <span className="font-mono text-[10px] text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
            {topicQueue.filter((q) => q.status === 'completed').length} / {topicQueue.length} Analyzed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {topicQueue.map((t) => (
            <div
              key={t.id}
              className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-slate-300 truncate text-[11px] font-medium">{t.title}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Done
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Synthesized Research Report */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Synthesized Research Report</h3>
          </div>
          <button
            onClick={() => {
              const text = `# DeepTutor Research Report: ${researchTopic}\n\nGenerated automatically via DeepTutor Agent-Native Research Engine.`;
              const blob = new Blob([text], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'deeptutor_research_report.md';
              a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-xs text-slate-300 leading-relaxed space-y-3 font-sans">
          <h4 className="text-sm font-bold text-white">Executive Synthesis</h4>
          <p>
            Diffusion generative models reframe density estimation as learning to invert a continuous noise-injection forward process governed by Ito Stochastic Differential Equations (SDEs).
          </p>
          <div className="bg-[#0b0e17] p-3 rounded-lg border border-slate-800 font-mono text-xs text-teal-300">
            <div>{"$$d\\mathbf{x} = \\mathbf{f}(\\mathbf{x}, t)dt + g(t)d\\mathbf{w}$$"}</div>
            <div>{"$$\\text{Reverse SDE: } d\\mathbf{x} = \\left[ \\mathbf{f}(\\mathbf{x}, t) - g(t)^2 \\nabla_\\mathbf{x} \\log p_t(\\mathbf{x}) \\right] dt + g(t)d\\bar{\\mathbf{w}}$$"}</div>
          </div>
          <p>
            The critical bridge shown by Song et al. (2021) established that discrete score matching and DDPM are continuous-time limits of Variance Preserving (VP) and Variance Exploding (VE) SDEs.
          </p>

          <h4 className="text-sm font-bold text-white mt-4">Key Verified Findings</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li><strong>Score Estimation:</strong> The neural network directly parameterizes the score function {'$\\mathbf{s}_\\theta(\\mathbf{x}, t) \\approx \\nabla_\\mathbf{x} \\log p_t(\\mathbf{x})$'} via denoising score matching.</li>
            <li><strong>Probability Flow ODE:</strong> Every continuous SDE shares the exact same marginal probability trajectories {'$p_t(\\mathbf{x})$'} with a deterministic ODE, allowing exact likelihood computation via continuous normalizing flows.</li>
            <li><strong>Guidance Trade-Off:</strong> Classifier-Free Guidance trades sample diversity for conditional fidelity by extrapolating unconditional and conditional score estimations.</li>
          </ul>
        </div>

        {/* Citations section */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-300">Grounding Citations & Verified Preprints ({citations.length})</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {citations.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800 hover:border-teal-500/50 block text-xs space-y-1 transition-colors group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-teal-300 truncate">
                  {c.title}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{c.authors?.[0]} et al. ({c.year})</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-teal-400" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
