import React, { useState } from 'react';
import {
  PieChart,
  BarChart3,
  Network,
  Code2,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const VisualizeCapability: React.FC = () => {
  const [visualType, setVisualType] = useState<'architecture' | 'scree' | 'loss_contour'>('architecture');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[visualType]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippets: Record<string, string> = {
    architecture: `// Mermaid Architecture Definition
graph TD
    Input[Input Tokens: x] --> Embedding[Embedding + Positional Encoding]
    Embedding --> RMSNorm1[RMSNorm]
    RMSNorm1 --> MHA[Multi-Head Self Attention (Q, K, V)]
    MHA --> Add1((+ Residual))
    Embedding --> Add1
    Add1 --> RMSNorm2[RMSNorm]
    RMSNorm2 --> SwiGLU[SwiGLU Feed-Forward Network]
    SwiGLU --> Add2((+ Residual))
    Add1 --> Add2
    Add2 --> Output[Next Layer Token Representations]`,
    scree: `// Singular Value Decay Scree Plot
const singularValues = [45.2, 28.6, 18.1, 11.4, 7.2, 4.8, 3.1, 2.0, 1.4, 0.9];
const varianceExplained = singularValues.map(s => (s**2 / totalSum) * 100);`,
    loss_contour: `// Optimization Surface & Gradient Descent Trajectory
f(x, y) = 0.5 * (x^2 + 10 * y^2) // Anisotropic quadratic bowl
alpha = 0.18 // Learning rate causing oscillations along y-axis`
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-purple-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Visualize Engine</h2>
          </div>
          <p className="text-xs text-slate-400">
            Render mathematical concepts, architecture diagrams, loss landscapes, and eigenvalue spectra.
          </p>
        </div>
        <div className="flex gap-1.5 bg-[#0e1422] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setVisualType('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              visualType === 'architecture' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setVisualType('scree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              visualType === 'scree' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Scree Plot
          </button>
          <button
            onClick={() => setVisualType('loss_contour')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              visualType === 'loss_contour' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Loss Contour
          </button>
        </div>
      </div>

      {/* Main Canvas Visualizer */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
        {visualType === 'architecture' && (
          <div className="w-full max-w-lg space-y-3 py-4">
            <div className="text-center font-semibold text-xs text-purple-300 uppercase tracking-wider mb-2">
              Transformer Block with Residual Highway
            </div>
            <div className="flex flex-col items-center space-y-2.5 text-xs font-mono">
              <div className="w-64 py-2 text-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                Input Tokens: x_t
              </div>
              <div className="text-slate-500">↓</div>
              <div className="w-64 py-2 text-center rounded-lg bg-sky-950/60 border border-sky-600/40 text-sky-200">
                RMSNorm (Pre-LayerNorm)
              </div>
              <div className="text-slate-500">↓</div>
              <div className="w-72 py-3 text-center rounded-xl bg-purple-950/80 border border-purple-500/60 text-purple-200 shadow-md">
                Multi-Head Attention (RoPE + QKV Projections)
              </div>
              <div className="w-64 py-1.5 text-center rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                ⊕ Residual Addition Highway
              </div>
              <div className="text-slate-500">↓</div>
              <div className="w-72 py-3 text-center rounded-xl bg-indigo-950/80 border border-indigo-500/60 text-indigo-200 shadow-md">
                SwiGLU Feed-Forward Network (Gated MLP)
              </div>
              <div className="w-64 py-1.5 text-center rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                ⊕ Residual Addition Highway
              </div>
              <div className="text-slate-500">↓</div>
              <div className="w-64 py-2 text-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                Next Layer Representation: x^(l+1)
              </div>
            </div>
          </div>
        )}

        {visualType === 'scree' && (
          <div className="w-full max-w-xl space-y-4 py-4">
            <div className="text-center font-semibold text-xs text-purple-300 uppercase tracking-wider">
              Singular Value Spectrum (PCA Variance Scree Plot)
            </div>
            <div className="h-48 flex items-end justify-between gap-3 px-6 pt-6 border-b border-l border-slate-700">
              {[
                { label: 'σ1', val: 92, pct: '48%' },
                { label: 'σ2', val: 64, pct: '24%' },
                { label: 'σ3', val: 38, pct: '12%' },
                { label: 'σ4', val: 24, pct: '7%' },
                { label: 'σ5', val: 16, pct: '4%' },
                { label: 'σ6', val: 10, pct: '2%' },
                { label: 'σ7', val: 6, pct: '1.2%' },
                { label: 'σ8', val: 3, pct: '0.8%' },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.pct}
                  </span>
                  <div
                    style={{ height: `${bar.val}%` }}
                    className="w-full bg-gradient-to-t from-purple-600 to-sky-400 rounded-t-md hover:brightness-125 transition-all shadow"
                  />
                  <span className="text-[11px] text-slate-400 font-mono mt-1">{bar.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400">
              Elbow cutoff occurs at <code className="text-purple-300 font-mono">k = 3</code>, capturing 84% of cumulative variance.
            </p>
          </div>
        )}

        {visualType === 'loss_contour' && (
          <div className="w-full max-w-lg space-y-4 py-4 flex flex-col items-center">
            <div className="text-center font-semibold text-xs text-purple-300 uppercase tracking-wider">
              Gradient Descent Oscillation in Ill-Conditioned Ravine
            </div>
            <div className="w-72 h-48 border border-slate-700 rounded-xl relative flex items-center justify-center bg-[#090e17] overflow-hidden">
              {/* Elliptical contours */}
              <div className="absolute w-60 h-40 border border-purple-500/30 rounded-[100px]" />
              <div className="absolute w-44 h-28 border border-purple-500/40 rounded-[100px]" />
              <div className="absolute w-28 h-16 border border-purple-500/60 rounded-[100px]" />
              <div className="absolute w-12 h-6 border border-purple-400 rounded-[100px]" />
              {/* Optimum dot */}
              <div className="w-2 h-2 rounded-full bg-emerald-400 z-10" title="Global Optimum (0, 0)" />
              {/* Gradient oscillation zig zag line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polyline
                  points="30,30 90,130 110,60 130,105 140,88 144,96"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              </svg>
            </div>
            <p className="text-center text-xs text-slate-400 max-w-md">
              High condition number <code className="text-sky-300 font-mono">κ = λ_max / λ_min = 10</code> induces orthogonal zig-zag oscillations under standard SGD.
            </p>
          </div>
        )}
      </div>

      {/* Code / Spec Drawer */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span>Specification & Render Code</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Spec'}</span>
          </button>
        </div>
        <pre className="bg-[#090d16] p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {codeSnippets[visualType]}
        </pre>
      </div>
    </div>
  );
};
