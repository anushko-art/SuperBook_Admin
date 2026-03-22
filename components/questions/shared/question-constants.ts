import type { QuestionType, DifficultyLevel } from '@/lib/questions/types';

// ── Question type config ──────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<
  QuestionType,
  { label: string; shortLabel: string; color: string; bg: string; border: string }
> = {
  mcq: {
    label: 'Multiple Choice',
    shortLabel: 'MCQ',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  assertion_reason: {
    label: 'Assertion-Reason',
    shortLabel: 'A-R',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  matching: {
    label: 'Column Matching',
    shortLabel: 'Match',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  statement_based: {
    label: 'Statement Based',
    shortLabel: 'Stmt',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  image_based: {
    label: 'Image Based',
    shortLabel: 'Image',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
};

// ── Difficulty config ─────────────────────────────────────────────────────────

export const DIFF_CONFIG: Record<
  DifficultyLevel,
  { color: string; bg: string; border: string }
> = {
  Easy: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  Medium: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  Hard: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

// ── Select options ────────────────────────────────────────────────────────────

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'assertion_reason', label: 'Assertion-Reason' },
  { value: 'matching', label: 'Column Matching' },
  { value: 'statement_based', label: 'Statement Based' },
  { value: 'image_based', label: 'Image Based' },
];

export const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];
