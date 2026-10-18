import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ListOrdered,
  FileCode,
  ShieldCheck,
  Send,
  RefreshCw,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  X,
  Volume2,
  FileText
} from 'lucide-react';

export const DeepSolveCapability: React.FC = () => {
  const [problemText, setProblemText] = useState('Solve dosage calculation: A child weighing 18 kg is prescribed Amoxicillin 40 mg/kg/day divided into 3 equal doses for 7 days. The available suspension is 125 mg / 5 mL. Calculate: (1) Total daily dose in mg, (2) Single dose in mg, (3) Volume in mL per single dose, (4) Total volume in mL required for the full 7-day course.');
  const [isSolving, setIsSolving] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(4);
  const [scratchpad, setScratchpad] = useState('Step 1: Total mg/day = 18 kg * 40 mg/kg/day = 720 mg/day.\nStep 2: Single dose (TID) = 720 mg / 3 = 240 mg.\nStep 3: Concentration = 125 mg per 5 mL -> Volume per dose = (240 / 125) * 5 mL = 9.6 mL.\nStep 4: Total volume = 9.6 mL * 3 doses/day * 7 days = 201.6 mL (sample arithmetic only; not dispensing guidance).');

  // Multimodal Attachment States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

  // Timer for voice recording
  useEffect(() => {
    let interval: any = null;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const toggleVoiceRecording = () => {
    alert('Voice recording and transcription are not connected in this demo. Type your text instead.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttachedImage(url);
      setProblemText(`[Image Attached: ${file.name}] Analyze the prescription and chemical pathway shown in the attached image. Determine therapeutic compatibility and potential drug-drug interactions.`);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedDocName(file.name);
      setProblemText(`[Document Attached: ${file.name}] Solve Assignment Task 3 from the attached laboratory protocol.`);
    }
  };

  const handleSolve = () => {
    setIsSolving(true);
    setCurrentStep(1);
    setTimeout(() => setCurrentStep(2), 500);
    setTimeout(() => setCurrentStep(3), 1000);
    setTimeout(() => {
      setCurrentStep(4);
      setIsSolving(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/40 p-5 rounded-2xl border border-indigo-500/20 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <h2 className="text-base font-semibold text-white tracking-tight">Multimodal Deep Solve Engine</h2>
          </div>
          <p className="text-xs text-slate-400">
            Worked example only. Changing the input does not compute a new solution. Do not use for clinical decisions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-700/50 text-indigo-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Multimodal Solver</span>
        </div>
      </div>

      {/* Multimodal Input Panel */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Problem, Task, or Assignment Query:</span>
          <span className="font-mono text-[11px] text-indigo-400">Audio • Image • Document • Text</span>
        </div>

        {/* Text Input */}
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          rows={3}
          className="w-full bg-[#0d131f] border border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
          placeholder="Type mathematical problem, clinical dosage calculation, or attach materials below..."
        />

        {/* Attachment Previews */}
        {(recordedVoiceUrl || attachedImage || attachedDocName) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {recordedVoiceUrl && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-300">
                <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] truncate max-w-xs">{recordedVoiceUrl}</span>
                <button onClick={() => setRecordedVoiceUrl(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {attachedImage && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300">
                <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-[11px]">Prescription/Formula Image Attached</span>
                <button onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {attachedDocName && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-300">
                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-[11px] truncate max-w-xs">{attachedDocName}</span>
                <button onClick={() => setAttachedDocName(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {/* Voice Record Button */}
            <button
              onClick={toggleVoiceRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isRecordingVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-400" />}
              <span>{isRecordingVoice ? `Recording (0:0${recordingSeconds})... Click to Finish` : 'Record Voice Note'}</span>
            </button>

            {/* Image Attachment Button */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer transition-colors">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Attach Image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {/* Document Attachment Button */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer transition-colors">
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>Attach Document</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleDocUpload} className="hidden" />
            </label>
          </div>

          <button
            onClick={handleSolve}
            disabled={isSolving || !problemText.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            {isSolving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isSolving ? 'Solving Multimodal Problem...' : 'Run Deep Solve'}</span>
          </button>
        </div>
      </div>

      {/* Stage Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        {[
          { num: 1, title: '1. Invariant & Units', desc: 'Weights & concentrations' },
          { num: 2, title: '2. Clinical Formula', desc: 'Step-by-step model' },
          { num: 3, title: '3. Derivation', desc: 'Arithmetic calculation' },
          { num: 4, title: '4. Verification', desc: 'Max dose & safety check' },
        ].map((st) => (
          <div
            key={st.num}
            className={`p-3 rounded-xl border transition-all ${
              currentStep >= st.num
                ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-200'
                : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300 mb-0.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${currentStep >= st.num ? 'text-indigo-400' : 'text-slate-600'}`} />
              <span>{st.title}</span>
            </div>
            <p className="text-[11px] text-slate-400">{st.desc}</p>
          </div>
        ))}
      </div>

      {/* Full Derivation & Solution */}
      <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <ListOrdered className="w-4 h-4" />
          <span>Step-by-Step Formal Mathematical & Clinical Solution</span>
        </div>

        <div className="space-y-4 text-xs text-slate-200 leading-relaxed font-sans">
          <div className="space-y-1">
            <h4 className="font-bold text-white text-xs">Part 1: Total Daily Dose Calculation</h4>
            <div className="bg-[#0b0e17] p-3 rounded-lg border border-slate-800 font-mono text-sky-300">
              {`Daily Dose (mg) = Patient Weight (kg) × Daily Dose Rate (mg/kg/day)`}
              <br />
              {`Daily Dose = 18 kg × 40 mg/kg/day = 720 mg/day`}
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white text-xs">Part 2: Single Dose Determination (Divided Doses)</h4>
            <div className="bg-[#0b0e17] p-3 rounded-lg border border-slate-800 font-mono text-emerald-300">
              {`Single Dose (TID - 3 times daily) = 720 mg / 3 = 240 mg per dose`}
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white text-xs">Part 3: Liquid Volume per Single Dose</h4>
            <p className="text-slate-300">Using the stock concentration of 125 mg per 5 mL:</p>
            <div className="bg-[#0b0e17] p-3 rounded-lg border border-slate-800 font-mono text-purple-300">
              {`Volume (mL) = (240 mg / 125 mg) × 5 mL = 1.92 × 5 mL = 9.6 mL`}
            </div>
            <p className="text-[11px] text-slate-400">Practical Dispensing Note: Advise parent to measure 9.6 mL using a calibrated oral dosing syringe (or round to nearest safe graduated calibration).</p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white text-xs">Part 4: Total Volume for Complete 7-Day Treatment</h4>
            <div className="bg-[#0b0e17] p-3 rounded-lg border border-indigo-500/30 font-mono text-indigo-200 font-bold p-3">
              {`Total Volume = 9.6 mL/dose × 3 doses/day × 7 days = 201.6 mL`}
              <div className="text-xs text-slate-300 font-normal mt-1">
                Clinical Recommendation: Dispense two 100 mL bottles (200 mL) or three 100 mL bottles to ensure full therapeutic completion without under-dosing.
              </div>
            </div>
          </div>
        </div>

        {/* Scratchpad & Verification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive Calculator Scratchpad</span>
            </div>
            <textarea
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              rows={4}
              className="w-full bg-[#0b0e17] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safety & Invariant Audit</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Maximum daily pediatric ceiling (90 mg/kg/day) respected (40 mg/kg &lt; 90 mg/kg)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Unit conversion verified: mg to mL matches stock 125mg/5mL ratio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Course duration accounts for full 7-day antimicrobial coverage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
