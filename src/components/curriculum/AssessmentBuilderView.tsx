import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Upload,
  Download,
  Copy,
  Clock,
  Printer,
  Edit2,
  Trash2,
  Plus,
  BookOpen,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AssessmentPaper, AssessmentQuestion, CourseUnit, ReferenceDocument } from '../../types';

interface AssessmentBuilderViewProps {
  assessments: AssessmentPaper[];
  courseUnits: CourseUnit[];
  referenceDocs: ReferenceDocument[];
  onUpdateAssessments: (papers: AssessmentPaper[]) => void;
  selectedUnitId?: string;
  onSaveToQuestionBank?: (question: any) => void;
}

export const AssessmentBuilderView: React.FC<AssessmentBuilderViewProps> = ({
  assessments,
  courseUnits,
  referenceDocs,
  onUpdateAssessments,
  selectedUnitId,
  onSaveToQuestionBank
}) => {
  const [activeUnitId, setActiveUnitId] = useState<string>(
    selectedUnitId || courseUnits[0]?.id || ''
  );
  const currentUnit = courseUnits.find((u) => u.id === activeUnitId) || courseUnits[0];

  // Assessment generator configuration
  const [assessmentType, setAssessmentType] = useState<'standard_exam' | 'coursework' | 'assignment'>('standard_exam');
  const [examTitle, setExamTitle] = useState('Final Semester Examination Paper');
  const [selectedTopicTitles, setSelectedTopicTitles] = useState<string[]>(
    currentUnit?.topics.map((t) => t.title) || []
  );
  const [uploadedExamTemplate, setUploadedExamTemplate] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePaperId, setActivePaperId] = useState<string>(
    assessments.find((a) => a.courseUnitId === activeUnitId)?.id || assessments[0]?.id || ''
  );

  const activePaper = assessments.find((a) => a.id === activePaperId && a.courseUnitId === currentUnit?.id) || assessments.find(a => a.courseUnitId === currentUnit?.id);

  // Toggle topics
  const toggleTopic = (title: string) => {
    setSelectedTopicTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleGenerateExam = () => {
    if (!currentUnit) return;
    setIsGenerating(true);

    setTimeout(() => {
      const isStandard = assessmentType === 'standard_exam';

      const questions: AssessmentQuestion[] = [
        {
          id: `q-${Date.now()}-1`,
          section: 'A',
          questionNumber: 1,
          prompt: 'Which pharmacokinetic parameter represents the volume of biological fluid cleared of unchanged drug per unit time?',
          marks: 1,
          topicTested: selectedTopicTitles[0] || 'Pharmacokinetics',
          options: [
            'Clearance (Cl)',
            'Apparent Volume of Distribution (Vd)',
            'Elimination Half-Life (t1/2)',
            'Absorption Rate Constant (Ka)'
          ],
          correctOptionIndex: 0,
          modelAnswer: 'Option A: Clearance (Cl = Dose / AUC)',
          markingGuideAllocation: '1 mark for Option A. 0 marks for incorrect options.',
          assessedOutcome: 'Recalls clearance definitions.'
        },
        {
          id: `q-${Date.now()}-2`,
          section: 'A',
          questionNumber: 2,
          prompt: 'A drug with an elimination half-life of 6 hours following first-order kinetics will reach over 90% steady-state concentration in approximately:',
          marks: 1,
          topicTested: selectedTopicTitles[0] || 'Elimination Kinetics',
          options: ['6 Hours', '12 Hours', '20 - 24 Hours (3.3 - 4 half-lives)', '48 Hours'],
          correctOptionIndex: 2,
          modelAnswer: 'Option C: 20 - 24 Hours (requires 3.32 half-lives to achieve 90% steady state).',
          markingGuideAllocation: '1 mark for Option C.',
          assessedOutcome: 'Applies steady-state principles.'
        },
        {
          id: `q-${Date.now()}-3`,
          section: 'B',
          questionNumber: 21,
          prompt: 'Differentiate Phase I (functionalization) from Phase II (conjugation) drug metabolism reactions with TWO specific enzyme examples for each phase.',
          marks: 8,
          topicTested: selectedTopicTitles[1] || 'Biotransformation',
          modelAnswer: 'Phase I reactions introduce or expose functional polar groups (-OH, -NH2, -SH) via oxidation, reduction, or hydrolysis, predominantly catalyzed by Cytochrome P450 monooxygenases (CYP3A4, CYP2D6) and esterases.\nPhase II reactions conjugate endogenous polar substrates (glucuronic acid, sulfate, glutathione) to produce hydrophilic water-soluble conjugates for renal excretion, catalyzed by UDP-glucuronosyltransferases (UGT) and Sulfotransferases (SULT).',
          markingGuideAllocation: 'Phase I characteristics & 2 enzymes (4 marks) + Phase II characteristics & 2 enzymes (4 marks). Total = 8 Marks.',
          assessedOutcome: 'Contrasts hepatic metabolic phases.'
        },
        {
          id: `q-${Date.now()}-4`,
          section: 'C',
          questionNumber: 26,
          prompt: 'A 58-year-old female is prescribed Warfarin 5 mg daily for deep vein thrombosis.\n(a) Explain the mechanism of action of Warfarin on vitamin K epoxide reductase.\n(b) The patient begins taking Phenytoin for seizures. Predict the effect on her INR and explain the underlying metabolic enzyme interaction.\n(c) What counseling advice and monitoring frequency should the clinical pharmacist provide?',
          marks: 20,
          topicTested: selectedTopicTitles[0] || 'Clinical Pharmacology',
          modelAnswer: '(a) Inhibits VKORC1, halting gamma-carboxylation of clotting factors II, VII, IX, and X (6 marks).\n(b) Phenytoin is a potent CYP2C9 and CYP3A4 inducer, accelerating Warfarin clearance, decreasing serum concentration, lowering INR, and increasing thromboembolic risk (8 marks).\n(c) Counsel on signs of clotting or bleeding; monitor INR every 2-3 days until restabilized; adjust Warfarin dosage upward (6 marks).',
          markingGuideAllocation: 'Part (a) 6 marks + Part (b) 8 marks + Part (c) 6 marks = 20 Marks.',
          assessedOutcome: 'Formulates clinical dosage intervention for drug-drug interactions.'
        }
      ];

      const newPaper: AssessmentPaper = {
        id: `exam-${Date.now()}`,
        courseUnitId: currentUnit.id,
        courseUnitCode: currentUnit.code,
        courseUnitTitle: currentUnit.title,
        title: `${examTitle} — ${currentUnit.code}`,
        assessmentType,
        academicYear: '2025/2026',
        termSemester: `Year ${currentUnit.yearOfStudy}, Semester ${currentUnit.semester}`,
        duration: isStandard ? '3 Hours' : '1.5 Hours',
        totalMarks: questions.reduce((sum, question) => sum + question.marks, 0),
        instructions: 'Sample paper: answer all four questions. Section A: 2 marks; Section B: 8 marks; Section C: 20 marks. Review model answers before use.',
        testedTopics: selectedTopicTitles,
        questions,
        markingSchemeNotes: 'Graders must strictly adhere to the model solutions and mark allocations provided in the marking scheme.',
        createdAt: new Date().toISOString().slice(0, 10)
      };

      const updated = [newPaper, ...assessments];
      onUpdateAssessments(updated);
      setActivePaperId(newPaper.id);
      setIsGenerating(false);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    if (!activePaper) return;
    const text = `# ${activePaper.title}\nCourse: ${activePaper.courseUnitCode} — ${activePaper.courseUnitTitle}\nDuration: ${activePaper.duration} | Total Marks: ${activePaper.totalMarks}\nInstructions: ${activePaper.instructions}\n\n---\n## Questions\n` +
      activePaper.questions.map(q => `### Section ${q.section} - Question ${q.questionNumber} (${q.marks} Marks)\n${q.prompt}\n${q.options ? q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : ''}\n\n**Marking Scheme / Model Answer:**\n${q.modelAnswer}\n*Allocation: ${q.markingGuideAllocation}*\n`).join('\n---\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePaper.title.replace(/\s+/g, '_')}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0e1422] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-purple-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Assessment, Exam & Question Bank Engine</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono border border-purple-500/20">
                3-Tier Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Generate Standard 3-tier exams (MCQs, Short Answer, Long Essay), assignments, and marking rubrics with topic filters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeUnitId}
            onChange={(e) => {
              setActiveUnitId(e.target.value);
              const unit = courseUnits.find(u => u.id === e.target.value);
              if (unit) setSelectedTopicTitles(unit.topics.map(t => t.title));
            }}
            className="bg-[#121826] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
          >
            {courseUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}: {u.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Exam Paper</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Builder on Left, Paper & Marking Scheme on Right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
        {/* Left: Generator Form & Topic Selector */}
        <div className="p-5 bg-[#0d121e] overflow-y-auto space-y-4 text-xs">
          <span className="font-semibold text-white uppercase tracking-wider text-xs block">
            Assessment Specification
          </span>

          <div className="space-y-1">
            <label className="text-slate-400 block mb-1">Assessment Format:</label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value as any)}
              className="w-full bg-[#121826] border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="standard_exam">Standard 3-Tier Exam (MCQ + Short Answer + Essay)</option>
              <option value="coursework">Continuous Assessment Test (CAT) / Coursework</option>
              <option value="assignment">Clinical Assignment & Home Task</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block mb-1">Paper Title:</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full bg-[#121826] border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Topic Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">Select Topics to Include:</span>
              <span className="text-[10px] font-mono text-purple-400">
                {selectedTopicTitles.length} of {currentUnit?.topics.length} Selected
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {currentUnit?.topics.map((t) => {
                const isSelected = selectedTopicTitles.includes(t.title);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.title)}
                    className={`w-full text-left p-2 rounded-lg border flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                        : 'bg-[#121826] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{t.title}</span>
                    <span className="font-mono text-[10px] shrink-0 text-slate-500">
                      {isSelected ? '✓ In' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Exam Standard Upload */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-300 block">Optional: Upload Past Exam Standard:</span>
            <div className="border border-dashed border-slate-700 rounded-lg p-3 text-center space-y-1 bg-[#121826] cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setUploadedExamTemplate(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-4 h-4 text-purple-400 mx-auto" />
              <span className="text-[11px] text-slate-300 block">
                {uploadedExamTemplate ? uploadedExamTemplate.name : 'Upload sample exam paper to mirror mark ratios'}
              </span>
            </div>
          </div>

          <button
            onClick={handleGenerateExam}
            disabled={isGenerating || selectedTopicTitles.length === 0}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGenerating ? 'Generating Assessment & Scheme...' : 'Generate Exam & Marking Guide'}</span>
          </button>
        </div>

        {/* Right: Exam Paper Viewer & Marking Scheme Accordion */}
        <div className="md:col-span-2 flex flex-col h-full bg-[#0b0f19] overflow-hidden">
          {activePaper ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full text-slate-200">
              {/* Paper Header / Institutional rubric */}
              <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 text-center space-y-2 shadow">
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                  National Allied Health Sciences Examination Board
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{activePaper.title}</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300 font-mono">
                  <span>Course Unit: {activePaper.courseUnitCode}</span>
                  <span>•</span>
                  <span>Duration: {activePaper.duration}</span>
                  <span>•</span>
                  <span>Total Marks: {activePaper.totalMarks}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                  {activePaper.instructions}
                </div>
              </div>

              {/* Questions by Section */}
              <div className="space-y-5">
                {['A', 'B', 'C'].map((sec) => {
                  const secQuestions = activePaper.questions.filter((q) => q.section === sec);
                  if (secQuestions.length === 0) return null;

                  const secTitle =
                    sec === 'A'
                      ? 'SECTION A: MULTIPLE CHOICE QUESTIONS (1 Mark Each)'
                      : sec === 'B'
                      ? 'SECTION B: SHORT STRUCTURED ANSWER QUESTIONS (8 Marks Each)'
                      : 'SECTION C: LONG CLINICAL ESSAYS & CASE SCENARIOS (20 Marks Each)';

                  return (
                    <div key={sec} className="space-y-3">
                      <div className="p-2.5 rounded-lg bg-[#141b2e] border border-slate-800 text-xs font-bold text-purple-300 flex items-center justify-between">
                        <span>{secTitle}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {secQuestions.reduce((a, b) => a + b.marks, 0)} Marks Total
                        </span>
                      </div>

                      <div className="space-y-3">
                        {secQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-4 rounded-xl bg-[#121826] border border-slate-800/80 space-y-3 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-white">
                                Question {q.questionNumber}: {q.prompt}
                              </span>
                              <span className="font-mono text-[11px] text-purple-400 font-bold shrink-0">
                                ({q.marks} {q.marks === 1 ? 'Mark' : 'Marks'})
                              </span>
                            </div>

                            {/* Section A Options */}
                            {q.options && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                                {q.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className={`p-2 rounded-lg border ${
                                      i === q.correctOptionIndex
                                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 font-bold'
                                        : 'bg-[#0d131f] border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Integrated Marking Scheme Drawer */}
                            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 bg-[#090d16] p-3 rounded-lg border border-slate-800">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-amber-400">Official Marking Guide & Model Answer:</span>
                                <span className="text-[10px] font-mono text-slate-400">Outcome: {q.assessedOutcome}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                                {q.modelAnswer}
                              </p>
                              <div className="text-[10px] text-slate-400 font-mono pt-1">
                                <span className="text-amber-300 font-semibold">Allocation: </span>
                                <span>{q.markingGuideAllocation}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              No examination paper generated yet. Use the configuration form on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
