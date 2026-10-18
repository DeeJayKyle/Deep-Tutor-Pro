import React, { useState } from 'react';
import {
  Database,
  Plus,
  Upload,
  Search,
  FileText,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { KnowledgeBase, KnowledgeDocument } from '../../types';

interface KnowledgeBasesViewProps {
  knowledgeBases: KnowledgeBase[];
  onAddKB: (kb: KnowledgeBase) => void;
}

export const KnowledgeBasesView: React.FC<KnowledgeBasesViewProps> = ({
  knowledgeBases,
  onAddKB
}) => {
  const [selectedKbId, setSelectedKbId] = useState<string>(knowledgeBases[0]?.id || 'kb-1');
  const [testQuery, setTestQuery] = useState('How does backpropagation compute derivatives for softmax?');
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbEngine, setNewKbEngine] = useState<'LightRAG' | 'LlamaIndex' | 'PageIndex' | 'Obsidian'>('LightRAG');
  const [newKbDesc, setNewKbDesc] = useState('');

  const [searchResults, setSearchResults] = useState<{ id: string; doc: string; chunk: number; score: number; text: string }[]>([]);

  const activeKb = knowledgeBases.find((k) => k.id === selectedKbId) || knowledgeBases[0];

  const handleTestSearch = () => {
    setSearchResults([]);
    alert('Retrieval is not connected. No document index was searched.');
  };

  const handleCreateKb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) return;
    const newKB: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: newKbName,
      description: newKbDesc || 'Custom user knowledge repository',
      engine: newKbEngine,
      status: 'ready',
      documentCount: 0,
      chunkCount: 0,
      lastUpdated: 'Just now',
      documents: []
    };
    onAddKB(newKB);
    setSelectedKbId(newKB.id);
    setNewKbName('');
    setNewKbDesc('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>Knowledge Center & RAG Hub</span>
          </h2>
          <p className="text-xs text-slate-400">
            Multi-engine knowledge bases across LightRAG, LlamaIndex, PageIndex, and Obsidian with resilient document parsing.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Knowledge Base</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: KB List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Configured Knowledge Bases
          </span>
          <div className="space-y-2">
            {knowledgeBases.map((kb) => {
              const isSelected = selectedKbId === kb.id;
              return (
                <button
                  key={kb.id}
                  onClick={() => setSelectedKbId(kb.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all space-y-2 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow'
                      : 'bg-[#121826] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs truncate max-w-[170px]">{kb.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                      {kb.engine}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{kb.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>{kb.documentCount} documents</span>
                    <span>{kb.chunkCount} chunks</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected KB Details & Document Manager */}
        <div className="md:col-span-2 space-y-5">
          {activeKb && (
            <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeKb.name}</h3>
                  <span className="text-xs text-slate-400">
                    Engine: <span className="font-mono text-sky-400 font-semibold">{activeKb.engine}</span> • Updated {activeKb.lastUpdated}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Local metadata only</span>
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Ingested Documents ({activeKb.documents.length})</span>
                  <button
                    onClick={() => alert('Document indexing is not connected in this build.')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload PDF/DOCX</span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {activeKb.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-200 truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400 font-mono">
                        <span>{doc.size}</span>
                        <span>{doc.chunks} chunks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAG Retrieval Tester */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Interactive RAG Query & Chunk Inspector
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Test vector retrieval query..."
                    className="flex-1 bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleTestSearch}
                    disabled={isSearching}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Search className="w-3 h-3" />
                    <span>{isSearching ? 'Querying...' : 'Test Query'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {searchResults.map((res) => (
                    <div key={res.id} className="p-3 rounded-lg bg-[#0d131f] border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-200">{res.doc} (Chunk #{res.chunk})</span>
                        <span className="text-emerald-400 font-mono">{(res.score * 100).toFixed(0)}% Similarity</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono leading-relaxed">{res.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121826] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white">Create Knowledge Base</h3>
            <form onSubmit={handleCreateKb} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Knowledge Base Name:</label>
                <input
                  type="text"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="e.g. CS201 Algorithms & Data Structures"
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Retrieval Engine:</label>
                <select
                  value={newKbEngine}
                  onChange={(e) => setNewKbEngine(e.target.value as any)}
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LightRAG">LightRAG (Graph + Vector Dual Engine)</option>
                  <option value="LlamaIndex">LlamaIndex (High Performance Vector)</option>
                  <option value="PageIndex">PageIndex (Reasoning Retrieval)</option>
                  <option value="Obsidian">Obsidian Linked Vault</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description:</label>
                <textarea
                  value={newKbDesc}
                  onChange={(e) => setNewKbDesc(e.target.value)}
                  placeholder="Subject scope, targeted courses, or research themes..."
                  rows={2}
                  className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  Create Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
