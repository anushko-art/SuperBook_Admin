import type {
  QuestionType,
  DifficultyLevel,
  ParsedQuestion,
  McqContent,
  AssertionReasonContent,
  MatchingContent,
  StatementContent,
  ImageBasedContent,
} from './types';

const VALID_TYPES: QuestionType[] = [
  'mcq',
  'assertion_reason',
  'matching',
  'statement_based',
  'image_based',
];

const VALID_DIFFICULTIES: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];

// ── Type-specific content validators ─────────────────────────────────────────

function validateMcqContent(content: unknown, correctAnswer: string): string[] {
  const errors: string[] = [];
  const c = content as McqContent;
  if (!Array.isArray(c?.options) || c.options.length < 2) {
    errors.push('content.options must be an array with at least 2 items');
    return errors;
  }
  for (const opt of c.options) {
    if (!opt.label || !opt.text) {
      errors.push('Each option must have label and text');
      break;
    }
  }
  const labels = c.options.map((o) => o.label);
  if (correctAnswer && !labels.includes(correctAnswer)) {
    errors.push(`correct_answer "${correctAnswer}" does not match any option label`);
  }
  return errors;
}

function validateAssertionReasonContent(content: unknown, correctAnswer: string): string[] {
  const errors: string[] = [];
  const c = content as AssertionReasonContent;
  if (!c?.assertion) errors.push('content.assertion is required');
  if (!c?.reason) errors.push('content.reason is required');
  if (!Array.isArray(c?.options) || c.options.length !== 4) {
    errors.push('content.options must be an array with exactly 4 items');
    return errors;
  }
  const labels = c.options.map((o) => o.label);
  if (correctAnswer && !labels.includes(correctAnswer)) {
    errors.push(`correct_answer "${correctAnswer}" does not match any option label`);
  }
  return errors;
}

function validateMatchingContent(content: unknown, correctAnswer: string): string[] {
  const errors: string[] = [];
  const c = content as MatchingContent;
  if (!Array.isArray(c?.column_a) || c.column_a.length < 2) {
    errors.push('content.column_a must be an array with at least 2 items');
  }
  if (!Array.isArray(c?.column_b) || c.column_b.length < 2) {
    errors.push('content.column_b must be an array with at least 2 items');
  }
  if (!Array.isArray(c?.options) || c.options.length < 2) {
    errors.push('content.options must be an array with at least 2 items');
    return errors;
  }
  const labels = c.options.map((o) => o.label);
  if (correctAnswer && !labels.includes(correctAnswer)) {
    errors.push(`correct_answer "${correctAnswer}" does not match any option label`);
  }
  return errors;
}

function validateStatementContent(content: unknown, correctAnswer: string): string[] {
  const errors: string[] = [];
  const c = content as StatementContent;
  if (!Array.isArray(c?.statements) || c.statements.length < 2) {
    errors.push('content.statements must be an array with at least 2 items');
  }
  if (!Array.isArray(c?.options) || c.options.length < 2) {
    errors.push('content.options must be an array with at least 2 items');
    return errors;
  }
  const labels = c.options.map((o) => o.label);
  if (correctAnswer && !labels.includes(correctAnswer)) {
    errors.push(`correct_answer "${correctAnswer}" does not match any option label`);
  }
  return errors;
}

function validateImageBasedContent(content: unknown, correctAnswer: string): string[] {
  const errors: string[] = [];
  const c = content as ImageBasedContent;
  if (!Array.isArray(c?.options) || c.options.length < 2) {
    errors.push('content.options must be an array with at least 2 items');
    return errors;
  }
  for (const opt of c.options) {
    if (!opt.label) {
      errors.push('Each image option must have a label');
      break;
    }
    if (!opt.alt_text) {
      errors.push(`Option "${opt.label}" is missing alt_text`);
    }
  }
  const labels = c.options.map((o) => o.label);
  if (correctAnswer && !labels.includes(correctAnswer)) {
    errors.push(`correct_answer "${correctAnswer}" does not match any option label`);
  }
  return errors;
}

// ── Single question validator ─────────────────────────────────────────────────

export function validateQuestion(
  q: unknown,
  index: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const question = q as Record<string, unknown>;

  if (!question || typeof question !== 'object') {
    return { valid: false, errors: [`Question ${index + 1}: must be an object`] };
  }

  // Required fields
  if (!question.question_type) {
    errors.push('question_type is required');
  } else if (!VALID_TYPES.includes(question.question_type as QuestionType)) {
    errors.push(
      `question_type "${question.question_type}" is invalid. Must be one of: ${VALID_TYPES.join(', ')}`
    );
  }

  if (!question.question_text || typeof question.question_text !== 'string') {
    errors.push('question_text is required and must be a string');
  }

  if (!question.correct_answer || typeof question.correct_answer !== 'string') {
    errors.push('correct_answer is required and must be a string');
  }

  if (!question.content || typeof question.content !== 'object') {
    errors.push('content block is required');
  }

  // Difficulty (optional but must be valid if present)
  const meta = question.metadata as Record<string, unknown> | undefined;
  const difficulty = meta?.difficulty_level;
  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty as DifficultyLevel)) {
    errors.push(
      `metadata.difficulty_level "${difficulty}" must be one of: ${VALID_DIFFICULTIES.join(', ')}`
    );
  }

  // Type-specific content validation (only if base fields are present)
  if (
    errors.length === 0 &&
    question.content &&
    question.question_type &&
    question.correct_answer
  ) {
    const correctAnswer = question.correct_answer as string;
    const contentErrors: string[] = (() => {
      switch (question.question_type as QuestionType) {
        case 'mcq':
          return validateMcqContent(question.content, correctAnswer);
        case 'assertion_reason':
          return validateAssertionReasonContent(question.content, correctAnswer);
        case 'matching':
          return validateMatchingContent(question.content, correctAnswer);
        case 'statement_based':
          return validateStatementContent(question.content, correctAnswer);
        case 'image_based':
          return validateImageBasedContent(question.content, correctAnswer);
        default:
          return [];
      }
    })();
    errors.push(...contentErrors);
  }

  return { valid: errors.length === 0, errors };
}

// ── Batch JSON parser ─────────────────────────────────────────────────────────

export function parseQuestionsJson(raw: string): {
  questions: ParsedQuestion[];
  fatalError: string | null;
} {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { questions: [], fatalError: 'Invalid JSON: could not parse the input' };
  }

  // Accept either an array or { questions: [...] }
  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>).questions)
  ) {
    items = (parsed as Record<string, unknown>).questions as unknown[];
  } else {
    return {
      questions: [],
      fatalError: 'JSON must be an array of questions or an object with a "questions" array',
    };
  }

  if (items.length === 0) {
    return { questions: [], fatalError: 'No questions found in the JSON' };
  }

  const questions: ParsedQuestion[] = items.map((item, index) => {
    const { valid, errors } = validateQuestion(item, index);
    return {
      ...(item as object),
      _valid: valid,
      _errors: errors,
    } as ParsedQuestion;
  });

  return { questions, fatalError: null };
}

// ── Check if a parsed question needs image uploads ───────────────────────────

export function questionNeedsImages(q: ParsedQuestion): boolean {
  if (q.question_type === 'image_based') return true;
  if (q.question_image) return true;
  return false;
}

// ── Get expected image slot keys for a question ──────────────────────────────

export function getImageSlotKeys(q: ParsedQuestion, questionIndex: number): string[] {
  const keys: string[] = [];

  if (q.question_image) {
    keys.push(`${questionIndex}_question_image`);
  }

  if (q.question_type === 'image_based') {
    const content = q.content as ImageBasedContent | undefined;
    if (content?.options) {
      for (const opt of content.options) {
        keys.push(`${questionIndex}_option_${opt.label}`);
      }
    } else {
      // fallback: 4 options
      keys.push(
        `${questionIndex}_option_1`,
        `${questionIndex}_option_2`,
        `${questionIndex}_option_3`,
        `${questionIndex}_option_4`
      );
    }
  }

  return keys;
}
