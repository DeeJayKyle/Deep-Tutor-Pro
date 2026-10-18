import React, { useState } from 'react';
import {
  BookOpen,
  Video,
  FileText,
  Clock,
  Sparkles,
  MessageSquare,
  Send,
  Bookmark,
  ExternalLink
} from 'lucide-react';

export const ReadingCapability: React.FC = () => {
  const [activeMedia, setActiveMedia] = useState<'document' | 'video'>('document');
  const [readerNotes, setReaderNotes] = useState([
    { id: 1, time: '04:15', title: 'Equivariance vs Invariance', text: 'Convolution is translation equivariant; max pooling imparts translation invariance.' },
    { id: 2, time: '11:40', title: '1x1 Convolutions (Network-in-Network)', text: 'Used as cross-channel pooling to compress dimensional depth before expensive 3x3 or 5x5 filters.' }
  ]);
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([
    {
      q: 'How does parameter sharing differ from a standard MLP?',
      a: 'In a standard MLP, every connection between neuron pairs has a unique weight. In a convolutional layer, the same kernel weights are swept across all spatial locations, drastically cutting parameter complexity and enforcing location-invariant pattern detection.'
    }
  ]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAnswers((prev) => [
      ...prev,
      {
        q: question,
        a: `[Grounding Citation: Section 3.2, p. 118] Responding to "${question}": The textbook establishes that weight sharing preserves spatial topological properties while maintaining $O(K^2)$ parameter count irrespective of input resolution.`
      }
    ]);
    setQuestion('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Top Media Tab Switcher */}
      <div className="h-12 border-b border-[#1e293b] px-5 flex items-center justify-between bg-[#0e1422]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMedia('document')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMedia === 'document' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Reader (PDF/EPUB)</span>
          </button>
          <button
            onClick={() => setActiveMedia('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMedia === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Immersive Video & Transcripts</span>
          </button>
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span>CS301_Deep_Learning_Core.pdf — Page 118</span>
        </div>
      </div>

      {/* Split Pane View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
        {/* Left: Document or Video Content */}
        <div className="p-6 overflow-y-auto bg-[#0d121e] space-y-4 text-xs text-slate-300 leading-relaxed font-serif">
          {activeMedia === 'document' ? (
            <div className="space-y-4 max-w-xl mx-auto bg-[#111726] p-6 rounded-xl border border-slate-800 shadow-sm font-sans">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="font-bold text-white text-sm">Chapter 9: Convolutional Networks</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Page 118 / 420</span>
              </div>
              <h4 className="text-white font-semibold text-xs">9.1 The Convolution Operation</h4>
              <p>
                In its most general form, convolution is an operation on two functions of a real-valued argument.
                To motivate the operation, we suppose that we are tracking the location of a spaceship with a laser sensor.
                Our laser sensor provides a single output $x(t)$, the position of the spaceship at time $t$.
                Both $x$ and $t$ are real-valued, and we want to compute a smoothed estimate by weighting recent measurements more heavily.
              </p>
              <div className="bg-[#090d16] p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300">
                $$s(t) = (x * w)(t) = \int x(a) w(t - a) da$$
              </div>
              <p>
                In deep learning applications, the first argument (in this example, the function $x$) is often referred to as the input,
                and the second argument (the function $w$) as the kernel. The output is sometimes referred to as the feature map.
              </p>
              <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Highlighted: "Parameter sharing reduces storage requirements from $O(m \times n)$ to $O(k \times k)$."</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-xl mx-auto bg-[#111726] p-5 rounded-xl border border-slate-800 font-sans">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-800">
                <div className="text-center space-y-2">
                  <Video className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
                  <span className="text-xs text-slate-300 block font-mono">Stanford CS231n: Lecture 5 — Convolutional Neural Networks</span>
                  <span className="text-[10px] text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded">04:15 / 1:12:40</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Timestamped Grounded Notes:</span>
                {readerNotes.map((note) => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-[#0d121e] border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>[{note.time}] {note.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tutor Q&A and Citations */}
        <div className="p-6 overflow-y-auto flex flex-col bg-[#0b0f19]">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">
            <MessageSquare className="w-4 h-4" />
            <span>Document-Grounded Tutor Copilot</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {answers.map((item, idx) => (
              <div key={idx} className="space-y-2 text-xs">
                <div className="bg-slate-800/80 p-2.5 rounded-xl text-slate-200 font-medium">
                  Q: {item.q}
                </div>
                <div className="bg-[#121826] p-3 rounded-xl border border-indigo-500/20 text-slate-300 leading-relaxed">
                  {item.a}
                </div>
              </div>
            ))}
          </div>

          {/* Question input */}
          <form onSubmit={handleAsk} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this page or timestamp..."
              className="flex-1 bg-[#121826] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
