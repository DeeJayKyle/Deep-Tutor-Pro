import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wrench,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { ChatMessage, CitationSource, ToolCall } from '../../types';

interface ChatCapabilityProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  activeModel: string;
  selectedTools: string[];
}

export const ChatCapability: React.FC<ChatCapabilityProps> = ({
  messages,
  onSendMessage,
  isLoading,
  activeModel,
  selectedTools
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({ 'msg-2': true });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [
    'Explain the multivariable chain rule in backpropagation',
    'Prove Eckart-Young-Mirsky low-rank SVD theorem',
    'Compare Multi-Head Attention vs RoPE positional embeddings',
    'How does LightRAG dual-level graph retrieval work?'
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* User bubble */}
                {isUser ? (
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-md">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[10px] text-indigo-200 block text-right mt-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div className="space-y-3">
                    {/* Collapsible Thinking Trace */}
                    {msg.thinking && (
                      <div className="border border-slate-800 rounded-lg bg-[#0e1422] overflow-hidden text-xs">
                        <button
                          onClick={() => toggleThinking(msg.id)}
                          className="w-full px-3 py-1.5 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-mono font-medium text-[11px] text-slate-300">
                              Reasoning Thought Trace
                            </span>
                          </div>
                          {expandedThinking[msg.id] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {expandedThinking[msg.id] && (
                          <div className="px-3 py-2 border-t border-slate-800/60 bg-[#090d16] font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {msg.thinking}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tool Invocations if any */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.toolCalls.map((tc) => (
                          <div
                            key={tc.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131b2c] border border-slate-700/60 text-[11px] text-slate-300 font-mono"
                          >
                            <Wrench className="w-3 h-3 text-sky-400" />
                            <span>tool:</span>
                            <span className="text-sky-300 font-semibold">{tc.tool}</span>
                            <span className="text-[10px] text-emerald-400">✓ executed</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Main content body */}
                    <div className="bg-[#121826] border border-[#1e293b] rounded-2xl rounded-tl-sm p-4 text-sm text-slate-200 leading-relaxed shadow-sm">
                      <div className="prose prose-invert prose-sm max-w-none space-y-3 font-normal whitespace-pre-line">
                        {msg.content}
                      </div>

                      {/* Source citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Grounding Sources & Citations
                          </span>
                          <div className="space-y-1">
                            {msg.sources.map((s) => (
                              <a
                                key={s.id}
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-indigo-300 transition-colors group"
                              >
                                <span className="truncate max-w-md">{s.title}</span>
                                <div className="flex items-center gap-1 shrink-0 text-slate-300 group-hover:text-indigo-400">
                                  <span className="text-[10px] font-mono text-slate-400">{s.provider}</span>
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{activeModel}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white mt-0.5 shadow">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Turn State */}
        {isLoading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-400">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-[#121826] border border-[#1e293b] rounded-2xl rounded-tl-sm p-4 text-xs font-mono space-y-2 text-slate-300 w-80">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Running Agentic Loop...</span>
              </div>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <p>• Exploring inquiry and checking tools</p>
                <p>• Consulting attached knowledge context</p>
                <p>• Synthesizing Socratic response</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Starter Chips */}
      {messages.length <= 2 && (
        <div className="max-w-4xl w-full mx-auto px-4 pb-2">
          <div className="text-[11px] text-slate-400 mb-1.5 font-medium">Starter Explorations:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(s)}
                className="text-left p-2 rounded-lg bg-[#111726] border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 text-xs text-slate-300 transition-colors truncate"
              >
                💡 {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div className="p-4 border-t border-[#1e293b] bg-[#0e1320]">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative bg-[#161f30] border border-slate-700/70 rounded-xl focus-within:border-indigo-500 transition-colors shadow-inner">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask anything, request mathematical proof, or explore academic concepts..."
              rows={2}
              className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-mono text-[10px] bg-slate-850 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
                  {selectedTools.length} tools mounted
                </span>
                <span className="hidden sm:inline text-[11px]">Shift+Enter for newline</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
