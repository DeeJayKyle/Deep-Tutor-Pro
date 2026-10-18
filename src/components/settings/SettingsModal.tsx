import React, { useState } from 'react';
import {
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Database,
  Trash2,
  FolderGit2,
  Activity,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { ProviderConfig } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderConfig[];
  activeModel: string;
  onSelectModel: (model: string) => void;
  currentWorkspace: string;
  onSelectWorkspace: (ws: string) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
  activeModel,
  onSelectModel,
  currentWorkspace,
  onSelectWorkspace,
  onResetData
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'capabilities' | 'doctor' | 'workspaces'>('providers');
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('high');

  if (!isOpen) return null;

  const doctorChecks = [
    { title: 'Local Runtime Home', status: 'pass', detail: 'data/user/settings directory writable' },
    { title: 'Model Provider Readiness', status: 'pass', detail: 'Google Gemini & OpenAI SDK initialized' },
    { title: 'Vector Retrieval Adapters', status: 'pass', detail: 'LightRAG, LlamaIndex, PageIndex endpoints reachable' },
    { title: 'Turn Bus Stream Broker', status: 'pass', detail: 'In-memory StreamBus active (0 lost packets)' },
    { title: 'Document Parsing Engines', status: 'pass', detail: 'PyMuPDF, python-docx, openpyxl, pptx ready' },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#101625] border border-slate-700 rounded-2xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white text-sm">DeepTutor Settings & Doctor Readiness</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0d121e] px-4 gap-2 pt-2">
          {[
            { id: 'providers', label: 'Model Providers' },
            { id: 'capabilities', label: 'Capabilities & Gating' },
            { id: 'doctor', label: 'DeepTutor Doctor' },
            { id: 'workspaces', label: 'Workspaces' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Tab 1: Providers */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <span className="font-semibold text-slate-300 block">Configured LLM & Reasoning Engines:</span>
              <div className="space-y-3">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-[#141b2e] border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white text-xs">{p.name}</div>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Connected</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-400 font-mono">
                        Base: {p.baseUrl}
                      </div>
                      <select
                        value={activeModel}
                        onChange={(e) => onSelectModel(e.target.value)}
                        className="bg-[#0b0f19] border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {p.availableModels.map((m) => (
                          <option key={m} value={m}>
                            {m} {m === activeModel ? '★ (Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Capabilities & Gating */}
          {activeTab === 'capabilities' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">Reasoning Effort (Thinking Models):</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setReasoningEffort(lvl)}
                      className={`p-2.5 rounded-xl border text-center font-medium capitalize transition-all ${
                        reasoningEffort === lvl
                          ? 'bg-indigo-950/50 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-[#141b2e] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Allocates more token budget to internal chain-of-thought exploration before synthesizing answers.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Capability Flags:</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b2e] border border-slate-800">
                    <span className="text-slate-300">Tool Calling & DSML Support</span>
                    <span className="text-emerald-400 font-mono font-semibold">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b2e] border border-slate-800">
                    <span className="text-slate-300">Multimodal Diagram & Formula Vision</span>
                    <span className="text-emerald-400 font-mono font-semibold">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b2e] border border-slate-800">
                    <span className="text-slate-300">Context Window Dynamic Sizing</span>
                    <span className="text-sky-400 font-mono">1,048,576 tokens</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: DeepTutor Doctor */}
          {activeTab === 'doctor' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Readiness Health Check (deeptutor doctor):</span>
                <span className="text-emerald-400 font-mono font-semibold">5 / 5 Healthy</span>
              </div>
              <div className="space-y-2">
                {doctorChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#141b2e] border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{check.title}</div>
                      <div className="text-[11px] text-slate-400">{check.detail}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Workspaces */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <span className="font-semibold text-slate-300 block">Learning Workspaces:</span>
              <div className="space-y-2">
                {[
                  'Default Learning Workspace',
                  'Fall 2026 CS301 Teaching Workspace',
                  'Autonomous Research Lab Space'
                ].map((ws) => (
                  <button
                    key={ws}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between ${
                      currentWorkspace === ws
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-semibold'
                        : 'bg-[#141b2e] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-sky-400" />
                      <span>{ws}</span>
                    </div>
                    {currentWorkspace === ws && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    if (confirm('Reset all localStorage data and reload defaults?')) {
                      onResetData();
                      window.location.reload();
                    }
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset All Workspace Data to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0e1320] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
