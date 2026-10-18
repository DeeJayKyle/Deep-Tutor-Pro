import React, { useState } from 'react';
import {
  Edit3,
  FileText,
  Sparkles,
  Download,
  ListTree,
  Check,
  Wand2,
  BookOpen,
  Copy
} from 'lucide-react';

export const CoWriterCapability: React.FC = () => {
  const [docTitle, setDocTitle] = useState('A Mathematical Exposition of Low-Rank Factorization');
  const [content, setContent] = useState(`# A Mathematical Exposition of Low-Rank Factorization

## Abstract
Low-rank matrix approximation constitutes a foundational pillar in computational linear algebra, statistical learning, and model compression. In this paper, we examine the Eckart-Young-Mirsky theorem and evaluate its ramifications on neural network weight factorization.

## 1. Introduction and Invariant Formulation
Let $A \\in \\mathbb{R}^{m \\times n}$ be an arbitrary real matrix with singular value decomposition:
$$A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i u_i v_i^T$$
where $U \\in \\mathbb{R}^{m \\times m}$ and $V \\in \\mathbb{R}^{n \\times n}$ are orthogonal matrices containing the left and right singular vectors, respectively.

## 2. Eckart-Young-Mirsky Theorem
For any integer $k < \\text{rank}(A)$, the optimal rank-$k$ approximation under both the spectral norm and the Frobenius norm is given by truncated SVD:
$$A_k = \\sum_{i=1}^k \\sigma_i u_i v_i^T$$

The approximation error satisfies:
$$\\min_{\\text{rank}(B) \\le k} \\|A - B\\|_2 = \\|A - A_k\\|_2 = \\sigma_{k+1}$$
$$\\min_{\\text{rank}(B) \\le k} \\|A - B\\|_F^2 = \\|A - A_k\\|_F^2 = \\sum_{i=k+1}^r \\sigma_i^2$$

## 3. Practical Implications in Deep Learning (LoRA)
In Low-Rank Adaptation (LoRA), rather than updating full weight matrices $W_0 \\in \\mathbb{R}^{d \\times k}$, the update is decomposed into $\\Delta W = B A$ where $B \\in \\mathbb{R}^{d \\times r}$ and $A \\in \\mathbb{R}^{r \\times k}$ with $r \\ll \\min(d, k)$. This guarantees that gradient rank is bounded by $r$, dramatically diminishing GPU VRAM consumption while preserving downstream fine-tuning capability.`);

  const [activeSection, setActiveSection] = useState('1. Introduction');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAiAction = (action: string) => {
    setIsAiProcessing(true);
    setTimeout(() => {
      if (action === 'expand') {
        setContent((prev) => prev + `\n\n### 3.1 Numerical Stability Considerations\nWhen computing SVD on ill-conditioned matrices, singular values decaying rapidly below machine epsilon $\\epsilon_{\\text{mach}}$ must be regularized using Tikhonov filtering to avoid floating-point catastrophe.`);
      } else if (action === 'formalize') {
        alert('AI Edit Agent: Prose formalized with academic terminology and LaTeX notation.');
      } else if (action === 'cite') {
        setContent((prev) => prev + `\n\n## References\n[1] Eckart, C., & Young, G. (1936). The approximation of one matrix by another of lower rank. Psychometrika, 1(3), 211-218.\n[2] Hu, E. J., et al. (2021). LoRA: Low-Rank Adaptation of Large Language Models. arXiv preprint arXiv:2106.09685.`);
      }
      setIsAiProcessing(false);
    }, 800);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Top Bar */}
      <div className="h-13 border-b border-[#1e293b] px-5 flex items-center justify-between bg-[#0e1422]">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-indigo-400" />
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="bg-transparent font-semibold text-xs text-white focus:outline-none border-b border-transparent focus:border-indigo-500 w-80 truncate"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>

      {/* Editor & AI Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
        {/* Left Outline */}
        <div className="p-4 bg-[#0d121e] overflow-y-auto space-y-2 text-xs">
          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-2">
            Document Outline
          </span>
          {['Abstract', '1. Introduction', '2. Eckart-Young Theorem', '3. LoRA Implications', 'References'].map((sec, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(sec)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                activeSection === sec ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{sec}</span>
            </button>
          ))}
        </div>

        {/* Middle Editor */}
        <div className="md:col-span-2 p-6 bg-[#0b0f19] overflow-y-auto flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={26}
            className="w-full flex-1 bg-transparent text-slate-200 text-xs font-mono leading-relaxed focus:outline-none resize-none"
            placeholder="Start drafting academic prose or notes..."
          />
        </div>

        {/* Right AI Edit Agent */}
        <div className="p-4 bg-[#0e1422] overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs border-b border-slate-800 pb-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            <span>AI Edit Agent</span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] text-slate-400">Transform Selected Section:</span>
            <button
              onClick={() => handleAiAction('expand')}
              disabled={isAiProcessing}
              className="w-full text-left p-2.5 rounded-lg bg-[#141b2c] border border-slate-800 hover:border-indigo-500/50 text-slate-200 space-y-0.5 transition-colors"
            >
              <div className="font-medium flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Expand Mathematical Proof</span>
              </div>
              <p className="text-[10px] text-slate-400">Elaborate intermediate derivation steps and bounds.</p>
            </button>

            <button
              onClick={() => handleAiAction('formalize')}
              disabled={isAiProcessing}
              className="w-full text-left p-2.5 rounded-lg bg-[#141b2c] border border-slate-800 hover:border-indigo-500/50 text-slate-200 space-y-0.5 transition-colors"
            >
              <div className="font-medium flex items-center gap-1.5 text-sky-300">
                <FileText className="w-3.5 h-3.5" />
                <span>Formalize Academic Tone</span>
              </div>
              <p className="text-[10px] text-slate-400">Align terminology with peer-reviewed conventions.</p>
            </button>

            <button
              onClick={() => handleAiAction('cite')}
              disabled={isAiProcessing}
              className="w-full text-left p-2.5 rounded-lg bg-[#141b2c] border border-slate-800 hover:border-indigo-500/50 text-slate-200 space-y-0.5 transition-colors"
            >
              <div className="font-medium flex items-center gap-1.5 text-teal-300">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Append Grounded Citations</span>
              </div>
              <p className="text-[10px] text-slate-400">Extract verified bibliographical references.</p>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-200">
            💡 Tutors can stream continuous draft refinements and save directly into the Question Bank or Course Materials.
          </div>
        </div>
      </div>
    </div>
  );
};
