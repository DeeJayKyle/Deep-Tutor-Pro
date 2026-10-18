import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatCapability } from './components/capabilities/ChatCapability';
import { DeepSolveCapability } from './components/capabilities/DeepSolveCapability';
import { DeepQuestionCapability } from './components/capabilities/DeepQuestionCapability';
import { DeepResearchCapability } from './components/capabilities/DeepResearchCapability';
import { VisualizeCapability } from './components/capabilities/VisualizeCapability';
import { MathAnimatorCapability } from './components/capabilities/MathAnimatorCapability';
import { MasteryPathCapability } from './components/capabilities/MasteryPathCapability';
import { ReadingCapability } from './components/capabilities/ReadingCapability';
import { CoWriterCapability } from './components/capabilities/CoWriterCapability';
import { TaskBoardView } from './components/space/TaskBoardView';
import { QuestionBankView } from './components/space/QuestionBankView';
import { MemoryGraphView } from './components/space/MemoryGraphView';
import { KnowledgeBasesView } from './components/space/KnowledgeBasesView';
import { PartnersView } from './components/space/PartnersView';
import { TutorCompanionView } from './components/companion/TutorCompanionView';
import { SettingsModal } from './components/settings/SettingsModal';
import { ClientReleaseHub } from './components/release/ClientReleaseHub';

// Curriculum & Academic Engineering Views
import { CurriculumManagerView } from './components/curriculum/CurriculumManagerView';
import { LectureNotesView } from './components/curriculum/LectureNotesView';
import { AssessmentBuilderView } from './components/curriculum/AssessmentBuilderView';
import { StudentLedgerView } from './components/curriculum/StudentLedgerView';
import { ReferenceLibraryView } from './components/curriculum/ReferenceLibraryView';

import { StorageService } from './services/storage';
import {
  CapabilityType,
  BuiltinTool,
  ChatMessage,
  TaskItem,
  QuestionItem,
  MemoryTrace,
  KnowledgeBase,
  AcademicClass,
  TeachingDraft,
  PartnerAgent,
  ProviderConfig,
  CurriculumPackage,
  LectureNoteBlock,
  AssessmentPaper,
  StudentBiodata,
  StudentMarkRecord,
  ReferenceDocument
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CapabilityType>('curriculum');
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);

  // Curriculum & Academic Engineering State
  const [curriculum, setCurriculum] = useState<CurriculumPackage | null>(() => StorageService.getCurriculumPackage());
  const [lectureNotes, setLectureNotes] = useState<LectureNoteBlock[]>(() => StorageService.getLectureNotes());
  const [assessments, setAssessments] = useState<AssessmentPaper[]>(() => StorageService.getAssessments());
  const [students, setStudents] = useState<StudentBiodata[]>(() => StorageService.getStudents());
  const [marks, setMarks] = useState<StudentMarkRecord[]>(() => StorageService.getMarks());
  const [referenceDocs, setReferenceDocs] = useState<ReferenceDocument[]>(() => StorageService.getReferences());

  // DeepTutor Learning Companion State
  const [messages, setMessages] = useState<ChatMessage[]>(() => StorageService.getMessages());
  const [tasks, setTasks] = useState<TaskItem[]>(() => StorageService.getTasks());
  const [questions, setQuestions] = useState<QuestionItem[]>(() => StorageService.getQuestions());
  const [memoryTraces, setMemoryTraces] = useState<MemoryTrace[]>(() => StorageService.getMemory());
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(() => StorageService.getKnowledgeBases());
  const [classes, setClasses] = useState<AcademicClass[]>(() => StorageService.getClasses());
  const [drafts, setDrafts] = useState<TeachingDraft[]>(() => StorageService.getDrafts());
  const [partners, setPartners] = useState<PartnerAgent[]>(() => StorageService.getPartners());
  const [providers, setProviders] = useState<ProviderConfig[]>(() => StorageService.getProviders());
  const [selectedTools, setSelectedTools] = useState<string[]>(() => StorageService.getSelectedTools());
  const [currentWorkspace, setCurrentWorkspace] = useState<string>(() => StorageService.getCurrentWorkspace());
  const [activeModel, setActiveModel] = useState<string>('gemini-2.5-pro');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReleaseHubOpen, setIsReleaseHubOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sync state to local storage for online/offline durability
  useEffect(() => { StorageService.setCurriculumPackage(curriculum); }, [curriculum]);
  useEffect(() => { StorageService.setLectureNotes(lectureNotes); }, [lectureNotes]);
  useEffect(() => { StorageService.setAssessments(assessments); }, [assessments]);
  useEffect(() => { StorageService.setStudents(students); }, [students]);
  useEffect(() => { StorageService.setMarks(marks); }, [marks]);
  useEffect(() => { StorageService.setReferences(referenceDocs); }, [referenceDocs]);
  useEffect(() => { StorageService.setMessages(messages); }, [messages]);
  useEffect(() => { StorageService.setTasks(tasks); }, [tasks]);
  useEffect(() => { StorageService.setQuestions(questions); }, [questions]);
  useEffect(() => { StorageService.setMemory(memoryTraces); }, [memoryTraces]);
  useEffect(() => { StorageService.setKnowledgeBases(knowledgeBases); }, [knowledgeBases]);
  useEffect(() => { StorageService.setClasses(classes); }, [classes]);
  useEffect(() => { StorageService.setDrafts(drafts); }, [drafts]);
  useEffect(() => { StorageService.setPartners(partners); }, [partners]);
  useEffect(() => { StorageService.setSelectedTools(selectedTools); }, [selectedTools]);
  useEffect(() => { StorageService.setCurrentWorkspace(currentWorkspace); }, [currentWorkspace]);

  // Handle loading pre-configured pharmacy curriculum sample
  const handleLoadSamplePharmacy = () => {
    StorageService.loadSamplePharmacyCurriculum();
    setCurriculum(StorageService.getCurriculumPackage());
    setLectureNotes(StorageService.getLectureNotes());
    setAssessments(StorageService.getAssessments());
    setStudents(StorageService.getStudents());
    setMarks(StorageService.getMarks());
    setReferenceDocs(StorageService.getReferences());
    if (StorageService.getCurriculumPackage()?.courseUnits[0]) {
      setSelectedUnitId(StorageService.getCurriculumPackage()?.courseUnits[0].id);
    }
  };

  // Inter-tab hyperlink navigation handler
  const handleNavigateTo = (tab: CapabilityType, contextId?: string) => {
    if (contextId) {
      setSelectedUnitId(contextId);
    }
    setActiveTab(tab);
  };

  // Tool toggle handler
  const handleToggleTool = (tool: BuiltinTool) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  // Chat message sending with simulated agentic reasoning & tool execution
  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      capability: activeTab,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    setTimeout(() => {
      // Determine what tools were invoked
      const toolInvocations: any[] = [];
      if (selectedTools.includes('reason')) {
        toolInvocations.push({
          id: `tc-${Date.now()}-1`,
          tool: 'reason',
          status: 'completed',
          input: `Deep reasoning analysis on inquiry: "${text.slice(0, 30)}..."`,
          output: 'Formulated clinical rationale and cross-referenced curriculum requirements.',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      if (selectedTools.includes('web_search') || selectedTools.includes('paper_search')) {
        toolInvocations.push({
          id: `tc-${Date.now()}-2`,
          tool: selectedTools.includes('paper_search') ? 'paper_search' : 'web_search',
          status: 'completed',
          input: `Querying medical & pharmacological preprints on: "${text.slice(0, 25)}"`,
          output: 'Found 4 peer-reviewed sources and national health standard guidelines.',
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `### DeepTutor Response & Academic Rationale\n\nRegarding: **${text}**\n\nI have aligned this inquiry with the active course curriculum and standard pharmaceutical competency framework. All calculations and therapeutic concepts have been validated across reference pharmacopoeias.\n\n- **Curriculum Alignment**: Verifiable under standard tertiary diploma & certificate pharmacy competencies.\n- **Learning Outcome**: Reinforces quantitative pharmacology, clinical compounding accuracy, and diagnostic patient counseling.\n\n*Feel free to request step-by-step problem derivations, generate related exam MCQs, or formulate comprehensive lecture slides.*`,
        thinking: `Agentic execution loop:\n1. Checked active workspace curriculum: ${curriculum ? curriculum.title : 'General Academic Workspace'}\n2. Evaluated active tools: ${selectedTools.join(', ')}\n3. Generated grounded pedagogical response with step-by-step clarity.`,
        toolCalls: toolInvocations.length > 0 ? toolInvocations : undefined,
        capability: activeTab,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [
          {
            id: 'src-curriculum-1',
            title: curriculum?.title || 'National Pharmacy Curriculum Guide',
            url: '#curriculum',
            provider: 'Curriculum Specification'
          },
          {
            id: 'src-ref-1',
            title: 'British Pharmacopoeia & Goodman and Gilman Clinical Pharmacology',
            url: '#references',
            provider: 'Reference Library'
          }
        ]
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsChatLoading(false);
    }, 1200);
  };

  const handleExportSession = () => {
    const text = messages
      .map((m) => `### ${m.role.toUpperCase()} (${m.timestamp})\n\n${m.content}\n\n---\n`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deeptutor_session_${Date.now()}.md`;
    a.click();
  };

  const handleClearSession = () => {
    if (confirm('Clear current chat conversation?')) {
      setMessages([]);
    }
  };

  // Course units list from active curriculum
  const courseUnitsList = curriculum?.courseUnits || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] font-sans text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReleaseHub={() => setIsReleaseHubOpen(true)}
        activeModel={activeModel}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          selectedTools={selectedTools}
          onToggleTool={handleToggleTool}
          currentWorkspace={currentWorkspace}
          onOpenReleaseHub={() => setIsReleaseHubOpen(true)}
          onExportSession={activeTab === 'chat' ? handleExportSession : undefined}
          onClearSession={activeTab === 'chat' ? handleClearSession : undefined}
        />

        {/* View Routing */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 1. Institutional Curriculum & Course Units */}
          {activeTab === 'curriculum' && (
            <CurriculumManagerView
              curriculum={curriculum}
              onUpdateCurriculum={setCurriculum}
              onLoadSample={handleLoadSamplePharmacy}
              onNavigateTo={handleNavigateTo}
            />
          )}

          {/* 2. Lecture Notes Generator & Slide Outline */}
          {activeTab === 'lecture_notes' && (
            <LectureNotesView
              lectureNotes={lectureNotes}
              courseUnits={courseUnitsList}
              referenceDocs={referenceDocs}
              onUpdateNotes={setLectureNotes}
              selectedUnitId={selectedUnitId}
              onNavigateToUnit={(uid) => setSelectedUnitId(uid)}
            />
          )}

          {/* 3. Assessment & 3-Tier Exam Builder */}
          {activeTab === 'assessments' && (
            <AssessmentBuilderView
              assessments={assessments}
              courseUnits={courseUnitsList}
              referenceDocs={referenceDocs}
              onUpdateAssessments={setAssessments}
              selectedUnitId={selectedUnitId}
              onSaveToQuestionBank={(newQ) => setQuestions((prev) => [newQ, ...prev])}
            />
          )}

          {/* 4. Student Biodata & Academic Gradebook Ledger */}
          {activeTab === 'students' && (
            <StudentLedgerView
              students={students}
              marks={marks}
              courseUnits={courseUnitsList}
              onUpdateStudents={setStudents}
              onUpdateMarks={setMarks}
            />
          )}

          {/* 5. Reference Materials & Image Library */}
          {activeTab === 'references' && (
            <ReferenceLibraryView
              referenceDocs={referenceDocs}
              courseUnits={courseUnitsList}
              onUpdateReferences={setReferenceDocs}
            />
          )}

          {/* DeepTutor Capabilities */}
          {activeTab === 'chat' && (
            <ChatCapability
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              activeModel={activeModel}
              selectedTools={selectedTools}
            />
          )}

          {activeTab === 'deep_solve' && <DeepSolveCapability />}

          {activeTab === 'deep_question' && (
            <DeepQuestionCapability
              onSaveToQuestionBank={(newQ) => setQuestions((prev) => [newQ, ...prev])}
            />
          )}

          {activeTab === 'deep_research' && <DeepResearchCapability />}

          {activeTab === 'visualize' && <VisualizeCapability />}

          {activeTab === 'math_animator' && <MathAnimatorCapability />}

          {activeTab === 'mastery_path' && <MasteryPathCapability />}

          {activeTab === 'reading' && <ReadingCapability />}

          {activeTab === 'co_writer' && <CoWriterCapability />}

          {activeTab === 'task_board' && (
            <TaskBoardView tasks={tasks} onUpdateTasks={setTasks} />
          )}

          {activeTab === 'question_bank' && (
            <QuestionBankView
              questions={questions}
              onToggleBookmark={(id) =>
                setQuestions((prev) =>
                  prev.map((q) => (q.id === id ? { ...q, bookmarked: !q.bookmarked } : q))
                )
              }
            />
          )}

          {activeTab === 'memory_graph' && (
            <MemoryGraphView
              memoryTraces={memoryTraces}
              onAddTrace={(tr) => setMemoryTraces((prev) => [tr, ...prev])}
              onDeleteTrace={(id) =>
                setMemoryTraces((prev) => prev.filter((m) => m.id !== id))
              }
            />
          )}

          {activeTab === 'knowledge_bases' && (
            <KnowledgeBasesView
              knowledgeBases={knowledgeBases}
              onAddKB={(kb) => setKnowledgeBases((prev) => [kb, ...prev])}
            />
          )}

          {activeTab === 'partners' && <PartnersView partners={partners} />}

          {activeTab === 'companion' && (
            <TutorCompanionView
              classes={classes}
              drafts={drafts}
              onSaveDraft={(dr) => setDrafts((prev) => [dr, ...prev])}
            />
          )}
        </main>
      </div>

      {/* Settings & Diagnostic Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        activeModel={activeModel}
        onSelectModel={setActiveModel}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={setCurrentWorkspace}
        onResetData={StorageService.resetDefaults}
      />

      {/* Standalone Windows EXE & Android APK Client Release Center */}
      <ClientReleaseHub
        isOpen={isReleaseHubOpen}
        onClose={() => setIsReleaseHubOpen(false)}
      />
    </div>
  );
};
export default App;
