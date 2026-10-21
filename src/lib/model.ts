// Deep Tutor Pro workspace model. Everything the tutor creates lives in one
// Workspace object that is saved on the device (IndexedDB) and, when signed
// in, synced to the tutor's private cloud copy on the DeepTutor server.

export const SCHEMA_VERSION = 3;

export type ID = string;

export interface Programme {
  id: ID;
  title: string; // e.g. "Diploma in Pharmacy"
  institution: string;
  awardLevel: string; // Certificate / Diploma / Degree
  durationYears: number;
  totalHours: number;
  overview: string;
  entryRequirements: string;
  assessmentPolicy: string;
  sourceReferenceId?: ID; // the curriculum document it was analysed from
  createdAt: string;
  updatedAt: string;
}

export interface ClassGroup {
  id: ID;
  programmeId?: ID;
  name: string; // e.g. "Diploma in Pharmacy — Year 1 (2026 intake)"
  year: number; // year of study
  intake: string; // e.g. "2026"
  academicYear: string; // e.g. "2026/2027"
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Topic {
  id: ID;
  title: string;
  hours: number; // contact hours from the curriculum
  objectives: string[];
  subtopics: string[];
  practicals: string;
}

export interface UnitHours {
  lecture: number;
  tutorial: number;
  practical: number;
  clinical: number;
  total: number;
}

export interface Unit {
  id: ID;
  programmeId?: ID;
  code: string;
  title: string;
  year: number;
  semester: number;
  creditUnits: number;
  hours: UnitHours;
  overview: string;
  aims: string[];
  outcomes: string[];
  topics: Topic[];
  teachingMethods: string[];
  assessment: string;
  references: string[];
  hoursEstimated: boolean;
  referenceIds: ID[]; // library documents linked to this unit
  analysed: boolean; // detailed outline extracted
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: ID;
  unitId: ID;
  topicId?: ID;
  title: string;
  markdown: string;
  hourStart: number; // first contact hour this note covers (unit numbering)
  hourEnd: number;
  status: 'draft' | 'final';
  sourceIds: ID[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferenceCategory =
  | 'curriculum'
  | 'textbook'
  | 'guideline'
  | 'past_paper'
  | 'notes'
  | 'image'
  | 'other';

export interface Reference {
  id: ID;
  name: string;
  category: ReferenceCategory;
  mime: string;
  size: number;
  text: string;
  pages: number;
  ocrPages: number;
  unitIds: ID[];
  addedAt: string;
  updatedAt?: string;
}

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'short'
  | 'structured'
  | 'essay'
  | 'case'
  | 'fill'
  | 'matching'
  | 'calculation'
  | 'practical';

export interface MarkingPoint {
  point: string;
  marks: number;
}

export interface Question {
  id: ID;
  type: QuestionType;
  prompt: string;
  options: string[];
  answerIndex: number | null;
  answer: string;
  solution: string;
  markingPoints: MarkingPoint[];
  marks: number;
  topic: string;
  difficulty: string;
  outcome: string;
}

export interface PaperSection {
  id: ID;
  title: string;
  type: QuestionType;
  instructions: string;
  choose: number; // answer any N (0 = all)
  questions: Question[];
}

export type PaperKind = 'exam' | 'coursework' | 'assignment' | 'test' | 'quiz' | 'practical';

export interface Paper {
  id: ID;
  unitId: ID;
  kind: PaperKind;
  title: string;
  instructions: string;
  duration: string;
  academicYear: string;
  sections: PaperSection[];
  topicIds: ID[];
  formatId?: ID;
  status: 'draft' | 'final';
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormatSection {
  title: string;
  type: QuestionType;
  count: number;
  marksEach: number;
  choose: number;
  instructions: string;
}

export interface ExamFormat {
  id: ID;
  name: string;
  duration: string;
  instructions: string;
  styleNotes: string;
  sections: FormatSection[];
  builtIn?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BankQuestion extends Question {
  unitId: ID;
  topicId?: ID;
  source: 'ai' | 'paper' | 'manual';
  createdAt: string;
  updatedAt?: string;
}

export type Gender = 'Female' | 'Male' | 'Other' | '';
export type StudentStatus = 'Active' | 'Suspended' | 'Deferred' | 'Discontinued' | 'Completed' | 'Graduated';

export interface Student {
  id: ID;
  regNo: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: Gender;
  dateOfBirth: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  nationality: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  classId: ID;
  admissionDate: string;
  sponsorship: string;
  status: StudentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeComponent {
  id: ID;
  name: string; // e.g. "CAT 1"
  kind: 'coursework' | 'assignment' | 'practical' | 'exam' | 'other';
  weight: number; // percentage of the final mark
  maxScore: number; // marks are entered out of this
}

export interface GradeBand {
  min: number; // inclusive lower bound (percent)
  grade: string;
  points: number;
  remark: string;
}

export interface MarkEntry {
  id: ID;
  studentId: ID;
  unitId: ID;
  componentId: ID;
  score: number | null;
  paperId?: ID;
  remark: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: ID;
  role: 'user' | 'assistant';
  content: string;
  attachments: { kind: 'image' | 'document' | 'voice'; name: string }[];
  model?: string;
  sources?: { title: string; url: string; provider?: string }[];
  error?: boolean;
  createdAt: string;
}

export interface Chat {
  id: ID;
  kind: 'solve' | 'tutor' | 'research';
  title: string;
  unitId?: ID;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type ProviderChoice = 'auto' | 'gemini' | 'openai';

export interface Settings {
  institution: string;
  tutorName: string;
  department: string;
  academicYear: string;
  provider: ProviderChoice;
  noteDetail: 'brief' | 'standard' | 'comprehensive';
  components: GradeComponent[];
  bands: GradeBand[];
  passMark: number;
  autoSync: boolean;
  theme: 'dark' | 'light' | 'system';
  updatedAt?: string; // when settings last changed (used when combining devices)
}

export interface Workspace {
  schema: number;
  programmes: Programme[];
  classes: ClassGroup[];
  units: Unit[];
  notes: Note[];
  references: Reference[];
  papers: Paper[];
  formats: ExamFormat[];
  bank: BankQuestion[];
  students: Student[];
  marks: MarkEntry[];
  chats: Chat[];
  settings: Settings;
  /** Deleted item ids → when, so a deletion is not undone when two devices are combined. */
  deleted: Record<ID, string>;
  updatedAt: string;
}

export type Collection = Exclude<keyof Workspace, 'schema' | 'settings' | 'updatedAt' | 'deleted'>;

export const COLLECTIONS: Collection[] = ['programmes', 'classes', 'units', 'notes', 'references', 'papers', 'formats', 'bank', 'students', 'marks', 'chats'];
