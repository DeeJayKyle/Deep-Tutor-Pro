import React, { useState } from 'react';
import {
  Share2,
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  Power,
  Cpu,
  Settings,
  Plus
} from 'lucide-react';
import { PartnerAgent } from '../../types';

interface PartnersViewProps {
  partners: PartnerAgent[];
}

export const PartnersView: React.FC<PartnersViewProps> = ({ partners }) => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partners[0]?.id || 'p-1');
  const [messages, setMessages] = useState<Record<string, { role: 'user' | 'assistant'; text: string }[]>>({
    'p-1': [
      { role: 'assistant', text: 'Greetings, scholar. What fundamental question shall we examine together today?' },
      { role: 'user', text: 'Why is linear independence necessary for a basis?' },
      { role: 'assistant', text: 'Consider this: If a set of vectors were linearly dependent, could you express at least one vector as a combination of the others? And what would that imply about the uniqueness of coordinates for any given point in that space?' }
    ],
    'p-2': [
      { role: 'assistant', text: 'Hey there! I am monitoring the CS301 channel. Let me know if you need homework hints or rubric clarifications.' }
    ]
  });
  const [inputText, setInputText] = useState('');

  const activePartner = partners.find((p) => p.id === selectedPartnerId) || partners[0];
  const activeChat = messages[activePartner.id] || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');

    const newHistory = [...activeChat, { role: 'user' as const, text: userText }];
    setMessages((prev) => ({ ...prev, [activePartner.id]: newHistory }));

    setTimeout(() => {
      let reply = `[${activePartner.name} via ${activePartner.channel}]: I have processed your input with system persona '${activePartner.systemPrompt.slice(0, 40)}...' and verified against attached knowledge base ${activePartner.assignedKB}.`;
      setMessages((prev) => ({
        ...prev,
        [activePartner.id]: [...newHistory, { role: 'assistant' as const, text: reply }]
      }));
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0e1422] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-sky-400" />
            <span>Partners & Subagent IM Companions</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Deploy autonomous tutor bots across Slack, Discord, Telegram, and CLI connected to DeepTutor's brain.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-sky-950/40 border border-sky-800 text-sky-300 px-2.5 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Runtime Bus Connected</span>
        </div>
      </div>

      {/* Main Split: Partner List on Left, Live Simulator on Right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
        {/* Left Partner Roster */}
        <div className="p-4 bg-[#0d121e] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Configured Companions ({partners.length})</span>
          </div>

          <div className="space-y-2">
            {partners.map((p) => {
              const isSelected = selectedPartnerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPartnerId(p.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all space-y-2 ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/50 text-sky-200 shadow'
                      : 'bg-[#121826] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${p.avatarColor} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-white text-xs">{p.name}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                      {p.channel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                    "{p.systemPrompt}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Model: {p.model}</span>
                    <span className="text-emerald-400">● Active</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Partner Chat Simulator */}
        <div className="md:col-span-2 flex flex-col h-full bg-[#0b0f19] overflow-hidden">
          {/* Active Partner Info Header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-[#111726] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${activePartner.avatarColor} flex items-center justify-center text-white font-bold text-xs`}>
                {activePartner.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-white">{activePartner.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Channel: {activePartner.channel} • KB: {activePartner.assignedKB}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {activePartner.model}
              </span>
            </div>
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeChat.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-tr-sm'
                        : 'bg-[#121826] border border-slate-800 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-[#0e1422] flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activePartner.name} (${activePartner.channel} bridge)...`}
              className="flex-1 bg-[#141b2e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
