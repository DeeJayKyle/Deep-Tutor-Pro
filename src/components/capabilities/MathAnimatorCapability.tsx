import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export const MathAnimatorCapability: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [harmonics, setHarmonics] = useState(3);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw coordinate grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Fourier Series Sum
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      for (let x = 0; x < width; x++) {
        let y = 0;
        // Fourier series of square wave: sum_{n=1,3,5,...}^N (4 / (n * pi)) * sin(n * omega * x - t)
        for (let i = 0; i < harmonics; i++) {
          const n = 2 * i + 1;
          const amp = (70 * (4 / (n * Math.PI)));
          y += amp * Math.sin((n * (x / 40)) - time);
        }

        const plotY = centerY - y;
        if (x === 0) ctx.moveTo(x, plotY);
        else ctx.lineTo(x, plotY);
      }
      ctx.stroke();

      // If playing, update time
      if (isPlaying) {
        time += 0.03 * speed;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, harmonics, speed]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-rose-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Math Animator (Manim & Canvas Engine)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive mathematical animation: Fourier series decomposition, harmonic resonance, and geometric transformations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-rose-900/40 px-3 py-1.5 rounded-lg border border-rose-700/50 text-rose-300">
          <Activity className="w-4 h-4 text-rose-400" />
          <span>Real-time Dynamics</span>
        </div>
      </div>

      {/* Animation Canvas */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span>Fourier Series Synthesis: Square Wave from Sine Harmonics</span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono">
              N = {harmonics} Harmonics
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>f(x) = ∑ (4/nπ) sin(nx - ωt)</span>
          </div>
        </div>

        <div className="w-full flex justify-center bg-[#090e17] rounded-xl border border-slate-800 p-2 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={720}
            height={260}
            className="w-full max-w-2xl rounded-lg"
          />
        </div>

        {/* Playback & Parameter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
          {/* Play / Pause / Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => {
                setHarmonics(1);
                setIsPlaying(true);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Harmonic Count Slider */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Harmonics:</span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 5, 8, 12].map((h) => (
                <button
                  key={h}
                  onClick={() => setHarmonics(h)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    harmonics === h
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  N={h}
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Speed:</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={2}>2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stage Breakdown for Math Animator Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-1">
          <div className="font-semibold text-rose-300">1. Concept Analysis</div>
          <p className="text-slate-400 text-[11px]">
            Deconstructs frequency domain into odd harmonic basis functions with amplitude decay factor 1/n.
          </p>
        </div>
        <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-1">
          <div className="font-semibold text-rose-300">2. Gibbs Phenomenon</div>
          <p className="text-slate-400 text-[11px]">
            Notice the ~9% overshoot near jump discontinuities as N increases, illustrating fundamental Fourier limits.
          </p>
        </div>
        <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-1">
          <div className="font-semibold text-rose-300">3. Manim Export</div>
          <p className="text-slate-400 text-[11px]">
            Ready for headless Python Manim video rendering via <code className="text-rose-200">deeptutor run math_animator</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
