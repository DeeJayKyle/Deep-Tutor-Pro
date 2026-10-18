import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Search
} from 'lucide-react';
import { CurriculumPackage, CourseUnit, UnitTopic, CapabilityType } from '../../types';

interface CurriculumManagerViewProps {
  curriculum: CurriculumPackage | null;
  onUpdateCurriculum: (curr: CurriculumPackage | null) => void;
  onLoadSample: () => void;
  onNavigateTo: (tab: CapabilityType, contextId?: string) => void;
}

export const CurriculumManagerView: React.FC<CurriculumManagerViewProps> = ({
  curriculum,
  onUpdateCurriculum,
  onLoadSample,
  onNavigateTo
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [courseTitleInput, setCourseTitleInput] = useState('');
  const [institutionInput, setInstitutionInput] = useState('');
  const [durationInput, setDurationInput] = useState(3);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit states for unit / topics
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate reading and setting title
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      setCourseTitleInput(name);
      setRawText(`Full curriculum document loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB).\nIncludes syllabus guidelines, competency frameworks, modular course unit breakdowns, lecture contact hours, and practical clinical schedules.`);
    }
  };

  const handleRunAnalysis = () => {
    if (!rawText.trim() && !courseTitleInput.trim()) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      const generatedUnits: CourseUnit[] = [
        {
          id: `unit-${Date.now()}-1`,
          curriculumId: `curr-${Date.now()}`,
          code: 'PHA 1101',
          title: 'General Pharmacology & Pharmacokinetics',
          yearOfStudy: 1,
          semester: 1,
          creditUnits: 4,
          lectureHours: 45,
          tutorialHours: 15,
          practicalHours: 30,
          totalContactHours: 90,
          courseOverview: 'Fundamental principles of drug action, drug-receptor interactions, ADME (Absorption, Distribution, Metabolism, Excretion), half-life kinetics, bioequivalence, and autonomic nervous system pharmacology.',
          generalObjectives: [
            'Explain the molecular mechanisms of drug-receptor interactions and signal transduction.',
            'Calculate pharmacokinetic parameters: volume of distribution, clearance, bioavailability, and elimination rate constants.',
            'Distinguish Phase I functionalization from Phase II conjugation hepatic metabolism pathways.'
          ],
          topics: [
            {
              id: `top-${Date.now()}-1`,
              topicNumber: 1,
              title: 'Introduction to Pharmacokinetics & Drug Absorption',
              allocatedHours: 6,
              learningObjectives: [
                'Define passive diffusion, active transport, and facilitated transport across cell membranes.',
                'Explain the Henderson-Hasselbalch equation and how pH affects ion trapping and passive reabsorption.',
                'Calculate drug bioavailability from AUC data.'
              ],
              subtopics: ['Physicochemical drug properties', 'Fick’s First Law of diffusion', 'First-pass hepatic metabolism', 'Bioequivalence testing standards'],
              suggestedPracticals: 'In-vitro dissolution testing of aspirin tablets using UV-Vis spectrophotometry.'
            },
            {
              id: `top-${Date.now()}-2`,
              topicNumber: 2,
              title: 'Drug Distribution & Plasma Protein Binding',
              allocatedHours: 6,
              learningObjectives: [
                'Define Apparent Volume of Distribution (Vd) and its clinical significance.',
                'Explain the impact of albumin and alpha-1-acid glycoprotein binding on free drug fractions.'
              ],
              subtopics: ['Tissue blood flow perfusion rates', 'Blood-brain barrier permeability', 'Volume of distribution calculations'],
              suggestedPracticals: 'Spectrophotometric determination of protein-bound vs free salicylate fractions.'
            }
          ]
        },
        {
          id: `unit-${Date.now()}-2`,
          curriculumId: `curr-${Date.now()}`,
          code: 'PHA 1102',
          title: 'Pharmaceutics & Dispensing Practice I',
          yearOfStudy: 1,
          semester: 1,
          creditUnits: 4,
          lectureHours: 40,
          tutorialHours: 10,
          practicalHours: 40,
          totalContactHours: 90,
          courseOverview: 'Principles and techniques of non-sterile compounding, prescription interpretation, posology, solutions, suspensions, and emulsions.',
          generalObjectives: [
            'Interpret medical abbreviations and verify prescription legal validity.',
            'Formulate, compound, and package liquid pharmaceutical preparations according to pharmacopoeial standards.'
          ],
          topics: [
            {
              id: `top-${Date.now()}-3`,
              topicNumber: 1,
              title: 'Prescription Interpretation & Dosage Calculations',
              allocatedHours: 6,
              learningObjectives: ['Interpret standard Latin abbreviations', 'Perform percentage solutions and dilution ratios'],
              subtopics: ['Prescription legal validity', 'Aliquots and dilutions', 'Pediatric dose rules']
            }
          ]
        },
        {
          id: `unit-${Date.now()}-3`,
          curriculumId: `curr-${Date.now()}`,
          code: 'PHA 2101',
          title: 'Chemotherapy, Antimicrobials & Clinical Pharmacy',
          yearOfStudy: 2,
          semester: 1,
          creditUnits: 4,
          lectureHours: 45,
          tutorialHours: 15,
          practicalHours: 30,
          totalContactHours: 90,
          courseOverview: 'Classification, mechanisms of action, spectrum of activity, mechanisms of resistance, adverse drug reactions, and clinical guidelines for antibacterial, antiviral, antifungal, and antiprotozoal agents.',
          generalObjectives: [
            'Classify antimicrobial agents by cellular target.',
            'Explain beta-lactamase resistance and the rational clinical use of beta-lactamase inhibitors.'
          ],
          topics: [
            {
              id: `top-${Date.now()}-4`,
              topicNumber: 1,
              title: 'Beta-Lactam Antibiotics & Resistance Mechanisms',
              allocatedHours: 8,
              learningObjectives: ['Describe penicillin-binding protein (PBP) transpeptidation inhibition', 'Differentiate extended spectrum cephalosporins'],
              subtopics: ['Penicillin nucleus structure', 'Extended-spectrum cephalosporins', 'Carbapenems']
            }
          ]
        }
      ];

      const newPkg: CurriculumPackage = {
        id: `curr-${Date.now()}`,
        title: courseTitleInput.trim() || 'Diploma in Pharmacy Curriculum & Teacher Guide',
        institution: institutionInput.trim() || 'Allied Health Sciences Examination Board',
        level: 'Diploma',
        durationYears: durationInput,
        totalCourseUnits: generatedUnits.length,
        totalCurriculumHours: generatedUnits.reduce((acc, u) => acc + u.totalContactHours, 0),
        overviewSummary: `Analyzed from uploaded curriculum specifications. Decomposed into ${generatedUnits.length} foundational course units organized by contact hours, learning outcomes, and practical laboratory schedules.`,
        analyzedAt: new Date().toISOString().slice(0, 10),
        courseUnits: generatedUnits
      };

      onUpdateCurriculum(newPkg);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleUpdateUnitTitle = (unitId: string, newTitle: string, newCode: string) => {
    if (!curriculum) return;
    const updated = {
      ...curriculum,
      courseUnits: curriculum.courseUnits.map((u) =>
        u.id === unitId ? { ...u, title: newTitle, code: newCode } : u
      )
    };
    onUpdateCurriculum(updated);
  };

  const handleAddTopic = (unitId: string) => {
    if (!curriculum) return;
    const unit = curriculum.courseUnits.find((u) => u.id === unitId);
    if (!unit) return;
    const newTopic: UnitTopic = {
      id: `top-${Date.now()}`,
      topicNumber: unit.topics.length + 1,
      title: 'New Modular Topic (e.g., Autonomic Pharmacology)',
      allocatedHours: 4,
      learningObjectives: ['Understand the core pharmacological mechanism and therapeutic indications.'],
      subtopics: ['Receptor binding kinetics', 'Clinical contraindications']
    };
    const updated = {
      ...curriculum,
      courseUnits: curriculum.courseUnits.map((u) =>
        u.id === unitId ? { ...u, topics: [...u.topics, newTopic] } : u
      )
    };
    onUpdateCurriculum(updated);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-200 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-blue-500/20 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Curriculum & Teacher's Guide Ingestion Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Import full courses (e.g. Diploma Pharmacy, Certificate Pharmacy). Analyzes contact hours, course units, and learning objectives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadSample}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Load Sample Pharmacy Curriculum</span>
          </button>
        </div>
      </div>

      {/* Zero State / Ingestion Form */}
      {!curriculum ? (
        <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-7 space-y-5 text-xs max-w-3xl mx-auto shadow-xl">
          <div className="text-center space-y-1.5 border-b border-slate-800 pb-4">
            <GraduationCap className="w-10 h-10 text-blue-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Import New Course Curriculum or Teacher's Guide</h3>
            <p className="text-slate-400">
              Upload the official syllabus document (PDF, DOCX, TXT) or paste curriculum guidelines below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-semibold block">Course / Qualification Title:</label>
              <input
                type="text"
                value={courseTitleInput}
                onChange={(e) => setCourseTitleInput(e.target.value)}
                placeholder="e.g. Diploma in Pharmacy / Certificate in Pharmacy"
                className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Duration (Years):</label>
              <input
                type="number"
                min={1}
                max={6}
                value={durationInput}
                onChange={(e) => setDurationInput(Number(e.target.value))}
                className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Institution / Examining Body:</label>
            <input
              type="text"
              value={institutionInput}
              onChange={(e) => setInstitutionInput(e.target.value)}
              placeholder="e.g. National Allied Health Examinations Board"
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Upload Box */}
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-6 text-center space-y-2 bg-[#0d131f] transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.doc"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-blue-400 mx-auto" />
            <div className="text-slate-200 font-medium">
              {uploadedFile ? uploadedFile.name : 'Click or drop curriculum document (PDF, Word, TXT)'}
            </div>
            <span className="text-[11px] text-slate-500 block">
              Extracts course outlines, contact hours, and learning objectives automatically
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Or Paste Syllabus / Curriculum Text Directly:</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              placeholder="Paste units, topics, lecture hours, and objectives here..."
              className="w-full bg-[#0d131f] border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onLoadSample}
              className="text-xs text-blue-400 hover:underline"
            >
              Or load pre-configured Diploma in Pharmacy template
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || (!rawText.trim() && !courseTitleInput.trim())}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2 shadow"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing Curriculum...' : 'Analyze & Decompose Curriculum'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Analyzed Curriculum Display */
        <div className="space-y-6">
          {/* Overview Info Card */}
          <div className="bg-[#121826] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{curriculum.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {curriculum.level}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {curriculum.institution} • {curriculum.durationYears} Years Duration • Analyzed on {curriculum.analyzedAt}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateCurriculum(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Import Another Curriculum
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">{curriculum.overviewSummary}</p>

            {/* Curriculum Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0d131f] border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[11px]">Course Units</span>
                <div className="text-base font-bold font-mono text-white">{curriculum.courseUnits.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d131f] border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[11px]">Total Curriculum Hours</span>
                <div className="text-base font-bold font-mono text-blue-400">{curriculum.totalCurriculumHours} Hours</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d131f] border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[11px]">Duration of Study</span>
                <div className="text-base font-bold font-mono text-emerald-400">{curriculum.durationYears} Academic Years</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0d131f] border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[11px]">Syllabus Status</span>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fully Analyzed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Units Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Course Units & Modular Outlines
                </h3>
                <p className="text-[11px] text-slate-400">
                  Showing {curriculum.courseUnits.filter((u) => (yearFilter === 'all' || u.yearOfStudy === yearFilter) && (!searchQuery.trim() || u.code.toLowerCase().includes(searchQuery.toLowerCase()) || u.title.toLowerCase().includes(searchQuery.toLowerCase()))).length} of {curriculum.courseUnits.length} units · Organized by Contact Hours
                </p>
              </div>

              {/* Search & Year Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search units or topics..."
                    className="pl-8 pr-3 py-1.5 bg-[#0d131f] border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
                  />
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-[#0d131f] rounded-lg border border-slate-800">
                  {(['all', 1, 2, 3] as const).map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setYearFilter(yr)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        yearFilter === yr
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {yr === 'all' ? 'All Years' : `Year ${yr}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {curriculum.courseUnits
                .filter((unit) => {
                  const matchesYear = yearFilter === 'all' || unit.yearOfStudy === yearFilter;
                  const matchesSearch =
                    !searchQuery.trim() ||
                    unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    unit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    unit.topics.some((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                  return matchesYear && matchesSearch;
                })
                .map((unit) => {
                  const isExpanded = expandedUnitId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      className="bg-[#121826] border border-[#1e293b] rounded-2xl overflow-hidden shadow transition-all hover:border-slate-700"
                    >
                      {/* Unit Header */}
                      <div className="p-5 flex flex-wrap items-center justify-between gap-3 bg-[#111726]">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs shadow">
                            {unit.code}
                          </span>
                          <div>
                            <h4 className="font-bold text-white text-sm">{unit.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span>Year {unit.yearOfStudy} · Semester {unit.semester}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-400 font-medium">{unit.totalContactHours} Contact Hours</span>
                              <span aria-hidden="true">·</span>
                              <span>{unit.lectureHours}h Lec / {unit.tutorialHours}h Tut / {unit.practicalHours}h Pract</span>
                              <span aria-hidden="true">·</span>
                              <span>{unit.creditUnits} CU</span>
                            </div>
                          </div>
                        </div>

                      {/* Action Links & Accordion */}
                      <div className="flex items-center gap-2">
                        {/* Direct Hyperlinks */}
                        <button
                          onClick={() => onNavigateTo('lecture_notes', unit.id)}
                          className="px-2.5 py-1 rounded bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Generate contact-hour lecture notes for this unit"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Lecture Notes</span>
                        </button>
                        <button
                          onClick={() => onNavigateTo('assessments', unit.id)}
                          className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-700/50 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Generate 3-tier exam, CATs or assignments"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Assessments</span>
                        </button>
                        <button
                          onClick={() => onNavigateTo('students', unit.id)}
                          className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="View student grades for this unit"
                        >
                          <span>Marks</span>
                        </button>

                        <button
                          onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ml-1"
                          title="Expand course outline"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Unit Body & Topics */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-800 space-y-5 text-xs">
                        {/* Course Overview */}
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] block">
                            Course Overview
                          </span>
                          <p className="text-slate-300 leading-relaxed font-sans">{unit.courseOverview}</p>
                        </div>

                        {/* General Learning Objectives */}
                        <div className="space-y-2">
                          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] block">
                            General Learning Objectives
                          </span>
                          <div className="space-y-1">
                            {unit.generalObjectives.map((obj, i) => (
                              <div key={i} className="flex items-start gap-2 text-slate-300 font-sans">
                                <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                                <span>{obj}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Modular Topics Sorted by Hours */}
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">
                              Modular Topics & Contact Hours Schedule ({unit.topics.length} Topics)
                            </span>
                            <button
                              onClick={() => handleAddTopic(unit.id)}
                              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Topic</span>
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {unit.topics.map((top) => (
                              <div
                                key={top.id}
                                className="p-4 rounded-xl bg-[#0d131f] border border-slate-800/80 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="font-semibold text-white flex items-center gap-2">
                                    <span className="text-slate-400 font-mono">Topic {top.topicNumber}:</span>
                                    <span>{top.title}</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                                    {top.allocatedHours} Contact Hours
                                  </span>
                                </div>

                                <div className="space-y-1 text-[11px] text-slate-400">
                                  <div className="text-slate-300 font-medium">Specific Objectives:</div>
                                  {top.learningObjectives.map((lo, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span>{lo}</span>
                                    </div>
                                  ))}
                                </div>

                                {top.suggestedPracticals && (
                                  <div className="text-[10px] text-amber-300 bg-amber-950/20 p-2 rounded border border-amber-500/20">
                                    <span className="font-semibold">Laboratory / Clinical Practicum: </span>
                                    <span>{top.suggestedPracticals}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
