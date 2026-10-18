import React from 'react';
import {
  MessageSquare,
  Sparkles,
  HelpCircle,
  Search,
  PieChart,
  Activity,
  Compass,
  BookOpen,
  Edit3,
  CheckSquare,
  Database,
  Brain,
  Share2,
  GraduationCap,
  Settings,
  ChevronRight,
  Terminal,
  Cpu,
  FolderDown
} from 'lucide-react';
import { CapabilityType } from '../types';

interface SidebarProps {
  activeTab: CapabilityType;
  onSelectTab: (tab: CapabilityType) => void;
  onOpenSettings: () => void;
  onOpenReleaseHub?: () => void;
  activeModel: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenReleaseHub,
  activeModel
}) => {
  const curriculumEngineering = [
    { id: 'curriculum' as CapabilityType, name: 'Curriculum & Units', icon: BookOpen, badge: 'Core' },
    { id: 'lecture_notes' as CapabilityType, name: 'Lecture Notes', icon: Edit3, badge: 'Hours' },
    { id: 'assessments' as CapabilityType, name: 'Exams & Coursework', icon: Sparkles, badge: '3-Tier' },
    { id: 'students' as CapabilityType, name: 'Students & Gradebook', icon: GraduationCap, badge: 'Cohorts' },
    { id: 'references' as CapabilityType, name: 'Reference Library', icon: Database, badge: 'Docs/Img' },
  ];

  const capabilities = [
    { id: 'chat' as CapabilityType, name: 'Tutor Chat', icon: MessageSquare, badge: 'Agentic' },
    { id: 'deep_solve' as CapabilityType, name: 'Deep Solve', icon: Sparkles, badge: 'Stages' },
    { id: 'deep_question' as CapabilityType, name: 'Deep Question', icon: HelpCircle },
    { id: 'deep_research' as CapabilityType, name: 'Deep Research', icon: Search, badge: 'Demo' },
    { id: 'visualize' as CapabilityType, name: 'Visualize', icon: PieChart },
    { id: 'math_animator' as CapabilityType, name: 'Math Animator', icon: Activity },
    { id: 'mastery_path' as CapabilityType, name: 'Mastery Path', icon: Compass },
    { id: 'reading' as CapabilityType, name: 'Immersive Reading', icon: BookOpen },
    { id: 'co_writer' as CapabilityType, name: 'Co-Writer', icon: Edit3 },
  ];

  const learningSpaces = [
    { id: 'task_board' as CapabilityType, name: 'Task Board', icon: CheckSquare },
    { id: 'question_bank' as CapabilityType, name: 'Question Bank', icon: Terminal },
    { id: 'memory_graph' as CapabilityType, name: 'Memory Graph (3-Layer)', icon: Brain },
    { id: 'knowledge_bases' as CapabilityType, name: 'Knowledge Bases', icon: Database },
    { id: 'partners' as CapabilityType, name: 'Partners & Subagents', icon: Share2 },
    { id: 'companion' as CapabilityType, name: 'Tutor Companion', icon: GraduationCap, badge: 'Host' },
  ];

  return (
    <aside aria-label="Application navigation" className="w-64 shrink-0 flex flex-col h-screen bg-[#0e1320] border-r border-[#1e293b] select-none text-slate-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-sky-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 text-sm">
            DT
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-tight text-sm">DeepTutor</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.6.14
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Agent-Native Learning</p>
          </div>
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Academic & Curriculum Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Curriculum & Academics</span>
            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-1 py-0.5 rounded">Core</span>
          </div>
          <div className="space-y-0.5">
            {curriculumEngineering.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Capabilities Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Capabilities</span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">Level 2</span>
          </div>
          <div className="space-y-0.5">
            {capabilities.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Learning Space Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Learning Space & Hub</span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">Workbench</span>
          </div>
          <div className="space-y-0.5">
            {learningSpaces.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-300 font-semibold border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info & Settings */}
      <div className="p-3 border-t border-[#1e293b] bg-[#0b0e17] space-y-2">
        <button
          onClick={onOpenReleaseHub}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 text-xs font-semibold text-blue-200 hover:text-white hover:border-blue-400 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-blue-400" />
            <span>EXE & APK Release Hub</span>
          </div>
          <span className="text-[10px] text-blue-300 font-mono bg-blue-500/20 px-1.5 py-0.5 rounded">v1.6.14</span>
        </button>

        <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-1.5 truncate">
            <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 truncate">Model:</span>
            <span className="text-slate-200 font-mono font-medium truncate">{activeModel}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" title="Local demo" />
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings & Diagnostic</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </button>
      </div>
    </aside>
  );
};
