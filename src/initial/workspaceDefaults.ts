import type { ChatMessage, TaskItem, QuestionItem, MemoryTrace, KnowledgeBase, AcademicClass, TeachingDraft, PartnerAgent, ProviderConfig } from '../types';

// Fresh installs start with an empty personal workspace. Existing saved data is preserved.
export const INITIAL_MESSAGES: ChatMessage[] = [];
export const INITIAL_TASKS: TaskItem[] = [];
export const INITIAL_QUESTIONS: QuestionItem[] = [];
export const INITIAL_MEMORY_TRACES: MemoryTrace[] = [];
export const INITIAL_KNOWLEDGE_BASES: KnowledgeBase[] = [];
export const INITIAL_CLASSES: AcademicClass[] = [];
export const INITIAL_DRAFTS: TeachingDraft[] = [];
export const INITIAL_PARTNERS: PartnerAgent[] = [];
export const DEFAULT_PROVIDERS: ProviderConfig[] = [];
