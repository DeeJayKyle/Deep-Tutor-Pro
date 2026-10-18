import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  Download,
  Presentation,
  FileDown,
  Printer,
  Copy,
  Check,
  Edit2,
  Bookmark,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus
} from 'lucide-react';
import { LectureNoteBlock, CourseUnit, ReferenceDocument } from '../../types';

interface LectureNotesViewProps {
  lectureNotes: LectureNoteBlock[];
  courseUnits: CourseUnit[];
  referenceDocs: ReferenceDocument[];
  onUpdateNotes: (notes: LectureNoteBlock[]) => void;
  selectedUnitId?: string;
  onNavigateToUnit?: (unitId: string) => void;
}

export const LectureNotesView: React.FC<LectureNotesViewProps> = ({
  lectureNotes,
  courseUnits,
  referenceDocs,
  onUpdateNotes,
  selectedUnitId,
  onNavigateToUnit
}) => {
  const [activeUnitId, setActiveUnitId] = useState<string>(
    selectedUnitId || courseUnits[0]?.id || ''
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    lectureNotes.find((n) => n.courseUnitId === activeUnitId)?.id || lectureNotes[0]?.id || ''
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Active unit & current note
  const currentUnit = courseUnits.find((u) => u.id === activeUnitId) || courseUnits[0];
  const unitNotes = lectureNotes.filter((n) => n.courseUnitId === currentUnit?.id);
  const activeNote = lectureNotes.find((n) => n.id === selectedNoteId) || unitNotes[0] || lectureNotes[0];

  // Editable note content state
  const [editTheoretical, setEditTheoretical] = useState(activeNote?.theoreticalContent || '');
  const [editTitle, setEditTitle] = useState(activeNote?.title || '');

  // Export Format Modals
  const [showExportModal, setShowExportModal] = useState<null | 'ppt' | 'word' | 'pdf'>(null);

  const handleGenerateNotesForTopic = () => {
    if (!currentUnit) return;
    setIsGenerating(true);

    setTimeout(() => {
      const topicIndex = unitNotes.length + 1;
      const hoursStart = (topicIndex - 1) * 3 + 1;
      const hoursEnd = topicIndex * 3;

      const newNote: LectureNoteBlock = {
        id: `note-${Date.now()}`,
        courseUnitId: currentUnit.id,
        topicId: `topic-${Date.now()}`,
        contactHoursLabel: `Contact Hours ${hoursStart} - ${hoursEnd} (3 Hours)`,
        title: `Comprehensive Lecture: Drug Distribution & Plasma Protein Binding`,
        learningOutcomes: [
          'Differentiate free vs bound pharmacological fractions.',
          'State the mathematical definition of Apparent Volume of Distribution (Vd).',
          'Evaluate clinical displacement drug-drug interactions (e.g. Warfarin and Sulfonamides).'
        ],
        theoreticalContent: `### 1. Apparent Volume of Distribution (Vd)
The apparent volume of distribution relates the amount of drug in the body to the measured concentration in plasma:
$$V_d = \\frac{Dose_{IV}}{C_0}$$

### 2. Plasma Protein Binding
Drugs in the bloodstream exist in dynamic equilibrium between unbound (pharmacologically active) and protein-bound fractions.
- **Albumin**: Principal binder for acidic drugs (e.g. Warfarin, Salicylates, Penicillins).
- **$\\alpha_1$-Acid Glycoprotein**: Binds basic drugs (e.g. Propranolol, Lidocaine, Quinidine).

### 3. Clinical Implications of Displacement
When two highly protein-bound drugs are co-administered, the drug with higher affinity can displace the other, precipitating transient toxicity:
$$\\text{Free Fraction } f_u = \\frac{C_{free}}{C_{total}}$$
[Source Reference: Goodman & Gilman Pharmacological Basis of Therapeutics, 14th Ed., Section 1.3]`,
        workedExamplesOrCases: `**Clinical Case**: A patient maintained on Warfarin (99% bound) is prescribed Co-trimoxazole. Sulfonamide molecules displace Warfarin from albumin binding sites, temporarily doubling free Warfarin from 1% to 2% and substantially elevating INR and bleeding risk.`,
        clinicalOrLabPracticum: `Lab Task: Measure equilibrium dialysis kinetics of bovine serum albumin (BSA) with Evans Blue dye under physiological pH 7.4.`,
        summaryKeyPoints: [
          'Only unbound drug can diffuse into tissues and interact with pharmacological receptors.',
          'Drugs with large Vd (> 42 L) concentrate heavily in extravascular tissues.',
          'Hypoalbuminemia increases toxicity risk for highly bound therapeutics.'
        ],
        referencesCited: [
          {
            refId: 'ref-1',
            title: referenceDocs[0]?.name || 'Goodman & Gilman Pharmacological Basis of Therapeutics',
            excerpt: 'Section on plasma protein binding, displacement drug interactions, and volume of distribution.'
          }
        ],
        slideDeckOutline: [
          { slideNumber: 1, title: 'Drug Distribution & Vd', bullets: ['Concept of apparent volume', 'Vd formula and units', 'Clinical interpretation of Vd values'] },
          { slideNumber: 2, title: 'Plasma Protein Binding Equilibria', bullets: ['Albumin vs Alpha-1-acid glycoprotein', 'Free fraction concept', 'Equilibrium dissociation constant Kd'] },
          { slideNumber: 3, title: 'Displacement Interactions: Warfarin Case Study', bullets: ['Mechanism of displacement', 'Transient elevation in free drug fraction', 'Clinical monitoring recommendations'] }
        ],
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10)
      };

      const updated = [newNote, ...lectureNotes];
      onUpdateNotes(updated);
      setSelectedNoteId(newNote.id);
      setEditTheoretical(newNote.theoreticalContent);
      setEditTitle(newNote.title);
      setIsGenerating(false);
    }, 1200);
  };

  const handleSaveEdit = () => {
    if (!activeNote) return;
    const updated = lectureNotes.map((n) =>
      n.id === activeNote.id
        ? { ...n, title: editTitle, theoreticalContent: editTheoretical, updatedAt: new Date().toISOString().slice(0, 10) }
        : n
    );
    onUpdateNotes(updated);
    setIsEditing(false);
  };

  // Download export handlers
  const handleDownloadWord = () => {
    if (!activeNote) return;
    const content = `Title: ${activeNote.title}\nContact Hours: ${activeNote.contactHoursLabel}\nUnit: ${currentUnit?.code} - ${currentUnit?.title}\n\n${activeNote.theoreticalContent}\n\nCase Studies:\n${activeNote.workedExamplesOrCases}\n\nReferences:\n${activeNote.referencesCited.map(r => r.title).join('\n')}`;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.slice(0, 30).replace(/\s+/g, '_')}_Lecture_Notes.doc`;
    a.click();
    setShowExportModal(null);
  };

  const handleDownloadPPT = () => {
    if (!activeNote) return;
    const slidesText = activeNote.slideDeckOutline.map(s => `SLIDE ${s.slideNumber}: ${s.title}\n${s.bullets.map(b => `• ${b}`).join('\n')}\n`).join('\n---\n');
    const blob = new Blob([slidesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.slice(0, 30).replace(/\s+/g, '_')}_Slides.txt`;
    a.click();
    setShowExportModal(null);
  };

  const handlePrintPDF = () => {
    window.print();
    setShowExportModal(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Top Bar with Unit Switcher & Export */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0e1422] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Lecture Notes & Curriculum Compendia</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                Contact-Hour Sorted
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Grounded in uploaded textbooks and clinical reference guidelines. Formatted for Word, PPT, and PDF.
            </p>
          </div>
        </div>

        {/* Unit Select Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={activeUnitId}
            onChange={(e) => {
              setActiveUnitId(e.target.value);
              const first = lectureNotes.find((n) => n.courseUnitId === e.target.value);
              if (first) {
                setSelectedNoteId(first.id);
                setEditTheoretical(first.theoreticalContent);
                setEditTitle(first.title);
              }
            }}
            className="bg-[#121826] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            {courseUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}: {u.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateNotesForTopic}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate Next Contact-Hour Notes'}</span>
          </button>
        </div>
      </div>

      {/* Main Split: Lecture Index on Left, Full Formatted Note on Right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
        {/* Left Sidebar: Contact Hour Blocks */}
        <div className="p-4 bg-[#0d121e] overflow-y-auto space-y-3 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Contact Hour Lecture Blocks</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              {unitNotes.length} Blocks
            </span>
          </div>

          <div className="space-y-2">
            {unitNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              return (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setEditTheoretical(note.theoreticalContent);
                    setEditTitle(note.title);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/50 text-blue-200 shadow'
                      : 'bg-[#121826] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span>{note.contactHoursLabel}</span>
                  </div>
                  <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2">
                    {note.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>{note.referencesCited.length} Reference(s)</span>
                    <span>{note.slideDeckOutline.length} Slides</span>
                  </div>
                </button>
              );
            })}
          </div>

          {unitNotes.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No lecture notes generated yet for this unit. Click "Generate Next Contact-Hour Notes" above.
            </div>
          )}
        </div>

        {/* Right Area: Formatted Note Viewer & Editor */}
        <div className="md:col-span-3 flex flex-col h-full bg-[#0b0f19] overflow-hidden">
          {activeNote ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Note Action Toolbar */}
              <div className="p-4 border-b border-slate-800 bg-[#111726] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                    {activeNote.contactHoursLabel}
                  </span>
                  <span className="text-slate-400">Course: {currentUnit?.code}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit Toggle */}
                  <button
                    onClick={() => {
                      if (isEditing) handleSaveEdit();
                      else setIsEditing(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      isEditing
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                    <span>{isEditing ? 'Save Changes' : 'Edit Notes'}</span>
                  </button>

                  {/* Export Options */}
                  <button
                    onClick={() => setShowExportModal('word')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs transition-colors"
                    title="Export as Microsoft Word Document"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    onClick={() => setShowExportModal('ppt')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs transition-colors"
                    title="Export PowerPoint Slide Deck outline"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>PPT Slides</span>
                  </button>

                  <button
                    onClick={() => setShowExportModal('pdf')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                    title="Print or Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Note Content View / Edit Area */}
              <div className="flex-1 overflow-y-auto p-7 space-y-6 max-w-4xl mx-auto w-full text-slate-200">
                {/* Note Title */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#0d131f] border border-blue-500 rounded-lg p-2.5 text-base font-bold text-white"
                  />
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{activeNote.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{currentUnit?.title}</span>
                      <span>•</span>
                      <span>Allocated: {activeNote.contactHoursLabel}</span>
                    </div>
                  </div>
                )}

                {/* Specific Learning Outcomes Checklist */}
                <div className="bg-[#121826] border border-[#1e293b] rounded-xl p-4 space-y-2">
                  <span className="font-semibold text-slate-300 text-xs uppercase tracking-wider block">
                    Learning Outcomes Assessed
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                    {activeNote.learningOutcomes.map((lo, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{lo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core Theoretical Body */}
                <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 shadow-sm">
                  {isEditing ? (
                    <textarea
                      value={editTheoretical}
                      onChange={(e) => setEditTheoretical(e.target.value)}
                      rows={18}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
                    />
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none text-xs text-slate-200 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                      {activeNote.theoreticalContent}
                    </div>
                  )}
                </div>

                {/* Clinical Worked Case / Examples */}
                {activeNote.workedExamplesOrCases && (
                  <div className="bg-[#121826] border border-amber-500/20 rounded-2xl p-6 space-y-2">
                    <span className="font-bold text-amber-400 text-xs uppercase tracking-wider block">
                      Worked Clinical Examples & Case Studies
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {activeNote.workedExamplesOrCases}
                    </p>
                  </div>
                )}

                {/* Lab Practicum */}
                {activeNote.clinicalOrLabPracticum && (
                  <div className="bg-[#121826] border border-blue-500/20 rounded-2xl p-6 space-y-2">
                    <span className="font-bold text-blue-400 text-xs uppercase tracking-wider block">
                      Laboratory & Compounding Practicum
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {activeNote.clinicalOrLabPracticum}
                    </p>
                  </div>
                )}

                {/* Slide Deck Outline Cards */}
                <div className="space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider block">
                    Teaching Slide Deck Outline ({activeNote.slideDeckOutline.length} Slides)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeNote.slideDeckOutline.map((slide) => (
                      <div
                        key={slide.slideNumber}
                        className="bg-[#121826] border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-blue-400 font-mono text-[11px] font-bold">
                          <span>Slide {slide.slideNumber}</span>
                          <Presentation className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-semibold text-white text-xs">{slide.title}</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                          {slide.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reference Grounding Citations */}
                <div className="bg-[#121826] border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="font-semibold text-slate-300 text-xs uppercase tracking-wider block">
                    Grounded Reference Sources
                  </span>
                  <div className="space-y-1.5">
                    {activeNote.referencesCited.map((ref, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#0d131f] border border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-semibold text-blue-300">{ref.title}</div>
                        <p className="text-[11px] text-slate-400 italic">"{ref.excerpt}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a lecture block on the left to view notes.
            </div>
          )}
        </div>
      </div>

      {/* Export Format Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121826] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              <span>
                Export: {showExportModal === 'word' ? 'Word Document (.doc)' : showExportModal === 'ppt' ? 'PowerPoint Presentation' : 'Printable PDF'}
              </span>
            </h3>

            <p className="text-slate-300 text-xs leading-relaxed">
              {showExportModal === 'word'
                ? 'Generates formatted academic document with syllabus headers, contact-hour breakdowns, and reference citations.'
                : showExportModal === 'ppt'
                ? 'Exports slide deck cards with level-2 headings and bullet points ready for clinical lecturing.'
                : 'Opens clean print preview ready to save as PDF without interface clutter.'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExportModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showExportModal === 'word') handleDownloadWord();
                  else if (showExportModal === 'ppt') handleDownloadPPT();
                  else handlePrintPDF();
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow"
              >
                Download Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
