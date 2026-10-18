export type CapabilityType =
  | 'curriculum'
  | 'lecture_notes'
  | 'assessments'
  | 'students'
  | 'references'
  | 'deep_solve'
  | 'chat'
  | 'deep_question'
  | 'deep_research'
  | 'visualize'
  | 'math_animator'
  | 'mastery_path'
  | 'reading'
  | 'co_writer'
  | 'task_board'
  | 'question_bank'
  | 'memory_graph'
  | 'knowledge_bases'
  | 'partners'
  | 'companion';

export type BuiltinTool =
  | 'brainstorm'
  | 'web_search'
  | 'paper_search'
  | 'reason'
  | 'geogebra_analysis'
  | 'imagegen'
  | 'videogen'
  | 'rag';

export interface ToolCall {
  id: string;
  tool: BuiltinTool;
  status: 'running' | 'completed' | 'failed';
  input: string;
  output?: string;
  timestamp: string;
}

export interface CitationSource {
  id: string;
  title: string;
  url: string;
  provider: string;
  snippet?: string;
  year?: string;
  authors?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  sources?: CitationSource[];
  capability: CapabilityType;
  timestamp: string;
  audioVoiceUrl?: string;
  attachedImage?: string;
  attachedDocName?: string;
}

// -------------------------------------------------------------
// Institutional Curriculum & Course Engineering Data Models
// -------------------------------------------------------------

export interface UnitTopic {
  id: string;
  topicNumber: number;
  title: string;
  allocatedHours: number;
  learningObjectives: string[];
  subtopics: string[];
  suggestedPracticals?: string;
}

export interface LectureNoteBlock {
  id: string;
  courseUnitId: string;
  topicId: string;
  contactHoursLabel: string; // e.g. "Contact Hours 1 - 3 (3 Hours)"
  title: string;
  learningOutcomes: string[];
  theoreticalContent: string;
  workedExamplesOrCases: string;
  clinicalOrLabPracticum: string;
  summaryKeyPoints: string[];
  referencesCited: { refId: string; title: string; excerpt: string }[];
  slideDeckOutline: { slideNumber: number; title: string; bullets: string[]; notes?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseUnit {
  id: string;
  curriculumId: string;
  code: string; // e.g. "PHA 1101"
  title: string; // e.g. "Basic Pharmacology & Pharmacokinetics"
  yearOfStudy: number; // e.g. 1, 2, 3
  semester: number; // 1 or 2
  creditUnits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  totalContactHours: number;
  courseOverview: string;
  generalObjectives: string[];
  topics: UnitTopic[];
  assignedTeacher?: string;
}

export interface CurriculumPackage {
  id: string;
  title: string; // e.g. "Diploma in Pharmacy" or "Certificate in Pharmacy"
  institution: string;
  level: string; // e.g. "Diploma / Certificate"
  durationYears: number;
  totalCourseUnits: number;
  totalCurriculumHours: number;
  overviewSummary: string;
  analyzedAt: string;
  courseUnits: CourseUnit[];
}

// -------------------------------------------------------------
// Reference Materials & Documents
// -------------------------------------------------------------

export interface ReferenceDocument {
  id: string;
  name: string;
  category: 'textbook' | 'clinical_guideline' | 'pharmacopoeia' | 'curriculum_doc' | 'exam_standard' | 'image_diagram';
  fileFormat: string; // PDF, DOCX, PNG, JPG, TXT
  fileSize: string;
  extractedText: string;
  sourceUrl?: string;
  attachedUnitCodes: string[];
  uploadedAt: string;
  previewUrl?: string;
}

// -------------------------------------------------------------
// Assessment, 3-Tier Exams & Question Banks
// -------------------------------------------------------------

export interface AssessmentQuestion {
  id: string;
  section: 'A' | 'B' | 'C'; // A = MCQ, B = Short Answer, C = Long Essay
  questionNumber: number;
  prompt: string;
  marks: number;
  topicTested: string;
  options?: string[]; // For Section A
  correctOptionIndex?: number;
  modelAnswer: string;
  markingGuideAllocation: string; // Point-by-point marks breakdown
  assessedOutcome: string;
}

export interface AssessmentPaper {
  id: string;
  courseUnitId: string;
  courseUnitCode: string;
  courseUnitTitle: string;
  title: string; // e.g. "Standard Final Examination Paper"
  assessmentType: 'standard_exam' | 'coursework' | 'assignment' | 'continuous_assessment';
  academicYear: string;
  termSemester: string;
  duration: string; // e.g. "3 Hours"
  totalMarks: number;
  instructions: string;
  testedTopics: string[];
  questions: AssessmentQuestion[];
  markingSchemeNotes: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Student Biodata & Multi-Year Marks Ledger
// -------------------------------------------------------------

export interface StudentBiodata {
  id: string;
  regNumber: string; // e.g. "DIP/PHA/2026/042"
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  yearOfStudy: number; // 1, 2, 3
  classCohort: string; // e.g. "Diploma Pharmacy Class 2026 - Year 1"
  contactPhone: string;
  email: string;
  homeDistrictAddress: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  enrollmentStatus: 'Active' | 'On Leave' | 'Completed' | 'Deferred';
  attendancePercentage: number;
}

export interface StudentMarkRecord {
  id: string;
  studentId: string;
  courseUnitId: string;
  academicYear: string; // e.g. "2025/2026"
  cat1Score: number; // max 15
  cat2Score: number; // max 15
  assignmentScore: number; // max 10
  practicalScore: number; // max 20
  finalExamScore: number; // max 100 scaled or 40
  totalPercentage: number; // 0 - 100
  letterGrade: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  gradePoint: number; // 5.0, 4.0, etc.
  remarks: string; // e.g. "Excellent Clinical Knowledge"
}

// -------------------------------------------------------------
// Standard DeepTutor Supporting Types
// -------------------------------------------------------------

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate?: string;
  createdAt: string;
}

export interface QuestionItem {
  id: string;
  title: string;
  prompt: string;
  type: 'multiple_choice' | 'open_ended' | 'proof' | 'calculation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  subject: string;
  bloomLevel: 'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation';
  bookmarked: boolean;
  createdAt: string;
}

export interface MemoryTrace {
  id: string;
  layer: 1 | 2 | 3;
  category: string;
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
  connectedIds?: string[];
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  chunks: number;
  uploadedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  engine: 'LlamaIndex' | 'LightRAG' | 'PageIndex' | 'GraphRAG' | 'Obsidian';
  status: 'ready' | 'indexing' | 'error';
  documentCount: number;
  chunkCount: number;
  lastUpdated: string;
  documents: KnowledgeDocument[];
}

export interface PartnerAgent {
  id: string;
  name: string;
  channel: 'Discord' | 'Slack' | 'Telegram' | 'Feishu' | 'WeCom' | 'CLI';
  systemPrompt: string;
  status: 'active' | 'idle' | 'stopped';
  assignedKB?: string;
  model: string;
  avatarColor: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  level: string;
  code: string;
  term: string;
  studentCount: number;
  color: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  availableModels: string[];
  status: 'connected' | 'checking' | 'error';
  supportsReasoning: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  contextWindow: number;
}

export interface TeachingDraft {
  id: string;
  kind: 'lecture_notes' | 'topic_summary' | 'exam' | 'quiz' | 'assignment' | 'presentation' | 'marking_guide' | 'case_study';
  className: string;
  unitTitle: string;
  detail: 'brief' | 'standard' | 'comprehensive';
  difficulty: 'introductory' | 'intermediate' | 'advanced' | 'mixed';
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface ResearchArticle {
  id: string;
  title: string;
  authors: string[];
  date: string;
  source: string;
  url: string;
  summary: string;
  provider: string;
}

