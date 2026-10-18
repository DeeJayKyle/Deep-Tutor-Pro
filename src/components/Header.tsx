import React, { useState } from 'react';
import {
  Wrench,
  FolderGit2,
  Check,
  Download,
  Trash2,
  HelpCircle,
  ExternalLink,
  FolderDown
} from 'lucide-react';
import { CapabilityType, BuiltinTool } from '../types';

interface HeaderProps {
  activeTab: CapabilityType;
  selectedTools: string[];
  onToggleTool: (tool: BuiltinTool) => void;
  currentWorkspace: string;
  onClearSession?: () => void;
  onExportSession?: () => void;
  onOpenReleaseHub?: () => void;
}

const ALL_TOOLS: { id: BuiltinTool; label: string; desc: string }[] = [
  { id: 'web_search', label: 'Web Search', desc: 'Real-time web retrieval with citations' },
  { id: 'paper_search', label: 'Paper Search (arXiv)', desc: 'arXiv preprint search for academic proofs' },
  { id: 'reason', label: 'Deep Reason', desc: 'Dedicated deep-reasoning chain-of-thought' },
  { id: 'brainstorm', label: 'Brainstorm', desc: 'Breadth-first exploration with rationales' },
  { id: 'geogebra_analysis', label: 'GeoGebra', desc: 'Analyze math & geometry into GeoGebra' },
  { id: 'imagegen', label: 'Image Gen', desc: 'Generate concept illustrations & charts' },
  { id: 'rag', label: 'RAG Knowledge', desc: 'Retrieve from attached knowledge bases' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedTools,
  onToggleTool,
  currentWorkspace,
  onClearSession,
  onExportSession,
  onOpenReleaseHub
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const getTitle = (tab: CapabilityType) => {
    switch (tab) {
      case 'curriculum': return { title: 'Curriculum & Course Units', desc: 'Curriculum analyzer, course outlines, contact hours & general objectives' };
      case 'lecture_notes': return { title: 'Lecture Notes Engine', desc: 'Contact-hour organized notes, clinical cases & slide decks with export' };
      case 'assessments': return { title: 'Assessments & 3-Tier Exams', desc: 'Standard 3-tier exams, assignments, coursework & marking schemes' };
      case 'students': return { title: 'Student Biodata & Gradebook', desc: 'Multi-year student records, continuous assessments & final examination ledger' };
      case 'references': return { title: 'Reference Library', desc: 'Multi-format reference documents, pharmacopoeias, guidelines & diagrams' };
      case 'chat': return { title: 'Tutor Chat', desc: 'Agentic exploration & adaptive Socratic dialogue' };
      case 'deep_solve': return { title: 'Deep Solve', desc: 'Multi-stage mathematical & conceptual solver' };
      case 'deep_question': return { title: 'Deep Question', desc: 'Bloom taxonomy-aligned quiz & exam question generator' };
      case 'deep_research': return { title: 'Deep Research', desc: 'Multi-source dynamic topic queue & synthesis' };
      case 'visualize': return { title: 'Visualize', desc: 'Interactive charts, Mermaid diagrams & SVG rendering' };
      case 'math_animator': return { title: 'Math Animator', desc: 'Concept analysis & dynamic Manim-style math animation' };
      case 'mastery_path': return { title: 'Mastery Path', desc: 'Guided learning, skill radar & knowledge tracking' };
      case 'reading': return { title: 'Immersive Reading', desc: 'Document & video reading with cited timestamp Q&A' };
      case 'co_writer': return { title: 'Co-Writer', desc: 'Academic drafting, section editing & paper synthesis' };
      case 'task_board': return { title: 'Task Board', desc: 'Workspace study tasks in To Do, In Progress, and Done' };
      case 'question_bank': return { title: 'Question Bank & Notebook', desc: 'Curated question archive & interactive practice mode' };
      case 'memory_graph': return { title: 'Three-Layer Memory Graph', desc: 'L1 Traces, L2 Learner Traits, and L3 Cognitive Synthesis' };
      case 'knowledge_bases': return { title: 'Knowledge Center', desc: 'Versioned multi-engine RAG libraries & document parsing' };
      case 'partners': return { title: 'Partners & Subagents', desc: 'IM Companions, Claude Code, and Codex connectors' };
      case 'companion': return { title: 'Tutor Companion', desc: 'Curriculum planning, exam drafting & academic research' };
      default: return { title: 'DeepTutor', desc: 'Intelligent Learning Companion' };
    }
  };

  const { title, desc } = getTitle(activeTab);

  return (
    <header className="h-14 border-b border-[#1e293b] bg-[#0b0f19] px-5 flex items-center justify-between select-none">
      {/* Title & Description */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-md">{desc}</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Windows & Android Release Hub Button */}
        <button
          onClick={onOpenReleaseHub}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 text-blue-200 hover:text-white hover:border-blue-400 transition-all shadow-sm"
          title="Download Windows (.exe) and Android (.apk) client releases"
        >
          <FolderDown className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold hidden sm:inline">EXE & APK Hub</span>
          <span className="text-[10px] text-blue-300 font-mono bg-blue-500/20 px-1 py-0.2 rounded">v2.0</span>
        </button>

        {/* Workspace Info */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 bg-[#161f30] px-2.5 py-1 rounded-md border border-[#24334a]">
          <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Workspace:</span>
          <span className="text-slate-200 font-medium">{currentWorkspace}</span>
        </div>

        {/* Level 1 Tools Button */}
        <div className="relative">
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              selectedTools.length > 0
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50 hover:bg-indigo-900/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tools</span>
            <span className="ml-0.5 px-1 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
              {selectedTools.length}
            </span>
          </button>

          {showToolsMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#121826] border border-[#24334a] rounded-lg shadow-xl p-2 z-50 text-xs">
              <div className="px-2 py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">Level 1 Single-Shot Tools</span>
                <span className="text-[10px] text-slate-300">Toggleable</span>
              </div>
              <div className="p-1 space-y-1">
                {ALL_TOOLS.map((t) => {
                  const isChecked = selectedTools.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onToggleTool(t.id)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded text-left transition-colors ${
                        isChecked ? 'bg-indigo-950/40 text-slate-200' : 'hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                          isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-slate-200">{t.label}</div>
                        <div className="text-[10px] text-slate-300 leading-tight">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 px-2 flex justify-between">
                <span>Auto-mounted in capability loops</span>
                <button
                  onClick={() => setShowToolsMenu(false)}
                  className="text-indigo-400 hover:underline"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear / Export actions for capability views */}
        {onExportSession && (
          <button
            onClick={onExportSession}
            title="Export session to Markdown"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
        {onClearSession && (
          <button
            onClick={onClearSession}
            title="Reset conversation"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
