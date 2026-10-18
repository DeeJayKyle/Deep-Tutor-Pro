import React, { useState } from 'react';
import {
  Brain,
  Layers,
  Sparkles,
  Link2,
  Plus,
  CheckCircle2,
  Trash2,
  Info
} from 'lucide-react';
import { MemoryTrace } from '../../types';

interface MemoryGraphViewProps {
  memoryTraces: MemoryTrace[];
  onAddTrace: (trace: MemoryTrace) => void;
  onDeleteTrace: (id: string) => void;
}

export const MemoryGraphView: React.FC<MemoryGraphViewProps> = ({
  memoryTraces,
  onAddTrace,
  onDeleteTrace
}) => {
  const [selectedId, setSelectedId] = useState<string | null>('mem-3');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLayer, setNewLayer] = useState<1 | 2 | 3>(2);
  const [newCategory, setNewCategory] = useState('Learner Trait');

  const selectedTrace = memoryTraces.find((m) => m.id === selectedId);

  const l1Traces = memoryTraces.filter((m) => m.layer === 1);
  const l2Traces = memoryTraces.filter((m) => m.layer === 2);
  const l3Traces = memoryTraces.filter((m) => m.layer === 3);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: MemoryTrace = {
      id: `mem-${Date.now()}`,
      layer: newLayer,
      category: newCategory,
      title: newTitle,
      content: newContent,
      confidence: 0.95,
      timestamp: 'Just now'
    };
    onAddTrace(item);
    setNewTitle('');
    setNewContent('');
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-sky-950/40 p-5 rounded-2xl border border-indigo-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Three-Layer Memory Workbench</h2>
          </div>
          <p className="text-xs text-slate-400">
            Persistent personalization hierarchy: L1 Interaction Traces → L2 Surface Facts & Traits → L3 High-Level Synthesis.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Observation</span>
        </button>
      </div>

      {/* Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-[#121826] border border-slate-700 rounded-xl p-4 space-y-3 text-xs">
          <div className="font-semibold text-white">Record Learner Observation or Memory Fact</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Layer:</label>
              <select
                value={newLayer}
                onChange={(e) => setNewLayer(Number(e.target.value) as any)}
                className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
              >
                <option value={1}>Layer 1 (Episodic Event)</option>
                <option value={2}>Layer 2 (Semantic Trait)</option>
                <option value={3}>Layer 3 (Cognitive Synthesis)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Category:</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Title:</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Mastered KKT Dual Optimization"
                className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Detail / Evidence:</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2 text-slate-200"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-slate-800 rounded text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-indigo-600 text-white rounded font-medium"
            >
              Save Memory
            </button>
          </div>
        </form>
      )}

      {/* 3-Layer Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Layer 1 */}
        <div className="space-y-3">
          <div className="bg-[#101625] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Layer 1: Episodic Traces</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
              Raw Evidence
            </span>
          </div>

          <div className="space-y-2.5">
            {l1Traces.map((trace) => {
              const isSelected = selectedId === trace.id;
              return (
                <button
                  key={trace.id}
                  onClick={() => setSelectedId(trace.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/60 shadow-lg'
                      : 'bg-[#121826] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-sky-300">{trace.category}</span>
                    <span>{trace.timestamp}</span>
                  </div>
                  <div className="font-semibold text-slate-100">{trace.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{trace.content}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer 2 */}
        <div className="space-y-3">
          <div className="bg-[#101625] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Layer 2: Semantic Traits</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
              User Profile
            </span>
          </div>

          <div className="space-y-2.5">
            {l2Traces.map((trace) => {
              const isSelected = selectedId === trace.id;
              return (
                <button
                  key={trace.id}
                  onClick={() => setSelectedId(trace.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg'
                      : 'bg-[#121826] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-indigo-300">{trace.category}</span>
                    <span className="text-emerald-400 font-mono">{(trace.confidence * 100).toFixed(0)}% conf</span>
                  </div>
                  <div className="font-semibold text-slate-100">{trace.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{trace.content}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer 3 */}
        <div className="space-y-3">
          <div className="bg-[#101625] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Layer 3: Cognitive Synthesis</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
              Mental Model
            </span>
          </div>

          <div className="space-y-2.5">
            {l3Traces.map((trace) => {
              const isSelected = selectedId === trace.id;
              return (
                <button
                  key={trace.id}
                  onClick={() => setSelectedId(trace.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/60 shadow-lg'
                      : 'bg-[#121826] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-purple-300">{trace.category}</span>
                    <span className="text-emerald-400 font-mono">{(trace.confidence * 100).toFixed(0)}% conf</span>
                  </div>
                  <div className="font-semibold text-slate-100">{trace.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-3">{trace.content}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Trace Detail Inspector */}
      {selectedTrace && (
        <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white text-sm">{selectedTrace.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                Layer {selectedTrace.layer}
              </span>
            </div>
            <button
              onClick={() => onDeleteTrace(selectedTrace.id)}
              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
              title="Delete memory node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedTrace.content}</p>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Observed: {selectedTrace.timestamp}</span>
            <span>Confidence: {(selectedTrace.confidence * 100).toFixed(0)}% (Verified across turns)</span>
          </div>
        </div>
      )}
    </div>
  );
};
