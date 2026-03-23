// ── Question Types ────────────────────────────────────────────────────────────

export type QuestionType =
  | 'mcq'
  | 'assertion_reason'
  | 'matching'
  | 'statement_based'
  | 'image_based';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type BatchStatus = 'pending' | 'processing' | 'complete' | 'failed';

// ── Content shapes (one per question type) ────────────────────────────────────

export interface McqOption {
  label: string; // "1" | "2" | "3" | "4"
  text: string;
}

export interface McqContent {
  options: McqOption[];
}

export interface AssertionReasonContent {
  assertion: string;
  reason: string;
  options: McqOption[]; // 4 fixed NEET-standard options
}

export interface MatchingItem {
  label: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface MatchingContent {
  column_a: MatchingItem[];
  column_b: MatchingItem[];
  options: McqOption[]; // MCQ-style options showing complete matching
}

export interface StatementItem {
  label: string; // "I" | "II" | "III" | "IV"
  text: string;
}

export interface StatementContent {
  statements: StatementItem[];
  options: McqOption[];
}

export interface ImageOption {
  label: string;
  image?: string; // local path or storage URL
  alt_text: string;
}

export interface ImageBasedContent {
  options: ImageOption[];
}

export type QuestionContent =
  | McqContent
  | AssertionReasonContent
  | MatchingContent
  | StatementContent
  | ImageBasedContent;

// ── Media ────────────────────────────────────────────────────────────────────

export interface QuestionMedia {
  id: string;
  question_id: string;
  role: string; // 'question_image' | 'option_1' | 'option_2' | etc.
  storage_url: string;
  alt_text: string | null;
  mime_type: string | null;
  created_at: string;
}

// ── Core question row ────────────────────────────────────────────────────────

export interface Question {
  id: string;
  question_type: QuestionType;
  topic_id: string | null;
  chapter_id: string | null;
  textbook_id: string | null;
  question_text: string;
  question_image_url: string | null;
  content: QuestionContent;
  correct_answer: string;
  correct_answer_detail: Record<string, string> | null; // matching only: {A:"4", B:"1", ...}
  solution: string | null;
  solution_image_url: string | null;
  scaffolding: {
    hint?: string;
    concept_pointer?: string;
    worked_example?: string;
  } | null;
  // Denormalized taxonomy
  subject: string | null;
  class: string | null;
  chapter_name: string | null;
  topic_name: string | null;
  // PYQ source
  exam_name: string | null;
  exam_year: number | null;
  exam_shift: string | null;
  // Metadata
  difficulty_level: DifficultyLevel;
  keywords: string[];
  concept_tags: string[];
  has_image: boolean;
  // Housekeeping
  uploaded_by: string | null;
  batch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined media (optional, from listQuestions)
  media?: QuestionMedia[];
}

// ── Parsed question (client-side ingestion state) ────────────────────────────

export interface ParsedQuestion {
  question_type?: QuestionType;
  question_text?: string;
  question_image?: string | null;
  content?: QuestionContent;
  correct_answer?: string;
  correct_answer_detail?: Record<string, string> | null;
  solution?: string | null;
  solution_image?: string | null;
  scaffolding?: Question['scaffolding'];
  taxonomy?: {
    subject?: string;
    class?: string;
    chapter?: string;
    topic?: string;
  };
  source?: {
    exam_name?: string;
    year?: number;
    shift?: string;
  };
  metadata?: {
    difficulty_level?: DifficultyLevel;
    keywords?: string[];
    concept_tags?: string[];
  };
  media?: Array<{
    role: string;
    local_path?: string;
    storage_path?: string | null;
    mime_type?: string;
  }>;
  // Validation state (added by parseQuestionsJson)
  _valid: boolean;
  _errors: string[];
  _imageSlots?: Record<string, File>;
}

// ── Batch ────────────────────────────────────────────────────────────────────

export interface QuestionBatch {
  id: string;
  topic_id: string | null;
  uploaded_by: string | null;
  status: BatchStatus;
  total_questions: number;
  inserted_count: number;
  error_count: number;
  errors: Array<{ index: number; message: string }>;
  created_at: string;
  finalized_at: string | null;
  // Joined fields
  topic_name?: string;
  chapter_name?: string;
}

// ── Taxonomy ─────────────────────────────────────────────────────────────────

export interface TaxonomyTopic {
  id: string;
  title: string;
  order_index: number;
}

export interface TaxonomyChapter {
  id: string;
  title: string;
  chapter_number: number;
  topics: TaxonomyTopic[];
}

export interface TaxonomyTextbook {
  id: string;
  title: string;
  subject: string;
  grade: string;
  part: string | null;
  chapters: TaxonomyChapter[];
}

export interface TaxonomySelection {
  textbookId: string;
  chapterId: string;
  topicId: string;
  label: string; // e.g. "Physics Pt.1 › Ch.2 › Motion in a Straight Line"
}

// ── Filters ──────────────────────────────────────────────────────────────────

export interface QuestionListFilter {
  search?: string;
  type?: QuestionType | 'all';
  difficulty?: DifficultyLevel | 'all';
  topic_id?: string;
  chapter_id?: string;
  textbook_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}
