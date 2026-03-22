/**
 * Question Bank — server-side database operations.
 * Uses lib/db.ts query() — never imported by client components.
 */
import { query, withClient } from '@/lib/db';
import type {
  Question,
  QuestionBatch,
  QuestionListFilter,
  TaxonomyTextbook,
  TaxonomyChapter,
  TaxonomyTopic,
  DifficultyLevel,
  QuestionType,
} from './types';

// ── Taxonomy ──────────────────────────────────────────────────────────────────

export async function getTaxonomyTree(): Promise<TaxonomyTextbook[]> {
  const rows = await query<{
    tb_id: string;
    tb_title: string;
    tb_subject: string;
    tb_grade: string;
    tb_part: string | null;
    ch_id: string;
    ch_title: string;
    ch_number: number;
    t_id: string;
    t_title: string;
    t_order: number;
  }>(`
    SELECT
      tb.id          AS tb_id,
      tb.title       AS tb_title,
      tb.subject     AS tb_subject,
      tb.grade       AS tb_grade,
      tb.part        AS tb_part,
      ch.id          AS ch_id,
      ch.title       AS ch_title,
      ch.chapter_number AS ch_number,
      t.id           AS t_id,
      t.title        AS t_title,
      t.order_index  AS t_order
    FROM textbooks tb
    JOIN chapters ch ON ch.textbook_id = tb.id
    JOIN topics   t  ON t.chapter_id   = ch.id
    ORDER BY tb.grade, tb.part NULLS LAST, ch.chapter_number, t.order_index
  `);

  // Build nested tree
  const textbookMap = new Map<string, TaxonomyTextbook>();
  const chapterMap = new Map<string, TaxonomyChapter>();

  for (const row of rows) {
    if (!textbookMap.has(row.tb_id)) {
      textbookMap.set(row.tb_id, {
        id: row.tb_id,
        title: row.tb_title,
        subject: row.tb_subject,
        grade: row.tb_grade,
        part: row.tb_part,
        chapters: [],
      });
    }

    const tb = textbookMap.get(row.tb_id)!;

    if (!chapterMap.has(row.ch_id)) {
      const chapter: TaxonomyChapter = {
        id: row.ch_id,
        title: row.ch_title,
        chapter_number: row.ch_number,
        topics: [],
      };
      chapterMap.set(row.ch_id, chapter);
      tb.chapters.push(chapter);
    }

    const chapter = chapterMap.get(row.ch_id)!;
    const topic: TaxonomyTopic = {
      id: row.t_id,
      title: row.t_title,
      order_index: row.t_order,
    };
    chapter.topics.push(topic);
  }

  return Array.from(textbookMap.values());
}

export async function getTopicById(topicId: string): Promise<{
  topic_id: string;
  topic_name: string;
  chapter_id: string;
  chapter_name: string;
  textbook_id: string;
  subject: string;
  class: string;
} | null> {
  const rows = await query<{
    topic_id: string;
    topic_name: string;
    chapter_id: string;
    chapter_name: string;
    textbook_id: string;
    subject: string;
    grade: string;
  }>(
    `
    SELECT
      t.id          AS topic_id,
      t.title       AS topic_name,
      ch.id         AS chapter_id,
      ch.title      AS chapter_name,
      tb.id         AS textbook_id,
      tb.subject    AS subject,
      tb.grade      AS grade
    FROM topics t
    JOIN chapters  ch ON ch.id = t.chapter_id
    JOIN textbooks tb ON tb.id = ch.textbook_id
    WHERE t.id = $1
  `,
    [topicId]
  );

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    topic_id: r.topic_id,
    topic_name: r.topic_name,
    chapter_id: r.chapter_id,
    chapter_name: r.chapter_name,
    textbook_id: r.textbook_id,
    subject: r.subject,
    class: r.grade,
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function listQuestions(filter: QuestionListFilter): Promise<{
  questions: Question[];
  total: number;
}> {
  const conditions: string[] = ['q.is_active = $1'];
  const params: unknown[] = [filter.is_active ?? true];
  let paramIndex = 2;

  if (filter.search) {
    conditions.push(
      `to_tsvector('english', q.question_text) @@ plainto_tsquery('english', $${paramIndex})`
    );
    params.push(filter.search);
    paramIndex++;
  }

  if (filter.type && filter.type !== 'all') {
    conditions.push(`q.question_type = $${paramIndex}`);
    params.push(filter.type);
    paramIndex++;
  }

  if (filter.difficulty && filter.difficulty !== 'all') {
    conditions.push(`q.difficulty_level = $${paramIndex}`);
    params.push(filter.difficulty);
    paramIndex++;
  }

  if (filter.topic_id) {
    conditions.push(`q.topic_id = $${paramIndex}`);
    params.push(filter.topic_id);
    paramIndex++;
  }

  if (filter.chapter_id) {
    conditions.push(`q.chapter_id = $${paramIndex}`);
    params.push(filter.chapter_id);
    paramIndex++;
  }

  if (filter.textbook_id) {
    conditions.push(`q.textbook_id = $${paramIndex}`);
    params.push(filter.textbook_id);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;

  params.push(limit, offset);

  const rows = await query<Question & { total_count: string }>(
    `
    SELECT
      q.*,
      COUNT(*) OVER() AS total_count
    FROM questions q
    WHERE ${whereClause}
    ORDER BY q.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `,
    params
  );

  const total = rows.length > 0 ? parseInt(rows[0].total_count as unknown as string, 10) : 0;
  // Remove total_count from returned rows
  const questions = rows.map(({ total_count, ...q }) => q as Question);

  return { questions, total };
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const rows = await query<Question>('SELECT * FROM questions WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getQuestionStats(): Promise<{
  total: number;
  byType: Record<QuestionType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
}> {
  const [typeRows, diffRows, totalRows] = await Promise.all([
    query<{ question_type: QuestionType; count: string }>(
      `SELECT question_type, COUNT(*) AS count
       FROM questions WHERE is_active = true
       GROUP BY question_type`
    ),
    query<{ difficulty_level: DifficultyLevel; count: string }>(
      `SELECT difficulty_level, COUNT(*) AS count
       FROM questions WHERE is_active = true
       GROUP BY difficulty_level`
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM questions WHERE is_active = true'
    ),
  ]);

  const byType = {} as Record<QuestionType, number>;
  for (const r of typeRows) {
    byType[r.question_type] = parseInt(r.count, 10);
  }

  const byDifficulty = {} as Record<DifficultyLevel, number>;
  for (const r of diffRows) {
    byDifficulty[r.difficulty_level] = parseInt(r.count, 10);
  }

  return {
    total: parseInt(totalRows[0]?.count ?? '0', 10),
    byType,
    byDifficulty,
  };
}

// ── Batches ───────────────────────────────────────────────────────────────────

export async function createBatch(
  topicId: string,
  uploadedBy: string | null,
  totalQuestions: number
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO question_upload_batches
       (topic_id, uploaded_by, status, total_questions)
     VALUES ($1, $2, 'processing', $3)
     RETURNING id`,
    [topicId, uploadedBy, totalQuestions]
  );
  return rows[0].id;
}

export async function finalizeBatch(
  batchId: string,
  insertedCount: number,
  errorCount: number,
  errors: Array<{ index: number; message: string }>
): Promise<void> {
  const status = errorCount === 0 ? 'complete' : insertedCount === 0 ? 'failed' : 'complete';
  await query(
    `UPDATE question_upload_batches
     SET status = $1,
         inserted_count = $2,
         error_count = $3,
         errors = $4,
         finalized_at = now()
     WHERE id = $5`,
    [status, insertedCount, errorCount, JSON.stringify(errors), batchId]
  );
}

export async function getBatch(batchId: string): Promise<QuestionBatch | null> {
  const rows = await query<QuestionBatch & { topic_name: string; chapter_name: string }>(
    `SELECT
       qub.*,
       t.title  AS topic_name,
       ch.title AS chapter_name
     FROM question_upload_batches qub
     LEFT JOIN topics   t  ON t.id  = qub.topic_id
     LEFT JOIN chapters ch ON ch.id = t.chapter_id
     WHERE qub.id = $1`,
    [batchId]
  );
  return rows[0] ?? null;
}

export async function listBatches(
  uploadedBy: string,
  limit = 20
): Promise<QuestionBatch[]> {
  return query<QuestionBatch>(
    `SELECT
       qub.*,
       t.title  AS topic_name,
       ch.title AS chapter_name
     FROM question_upload_batches qub
     LEFT JOIN topics   t  ON t.id  = qub.topic_id
     LEFT JOIN chapters ch ON ch.id = t.chapter_id
     WHERE qub.uploaded_by = $1
     ORDER BY qub.created_at DESC
     LIMIT $2`,
    [uploadedBy, limit]
  );
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function insertQuestion(
  q: Omit<Question, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO questions (
       question_type, topic_id, chapter_id, textbook_id,
       question_text, question_image_url, content, correct_answer, correct_answer_detail,
       solution, scaffolding,
       subject, class, chapter_name, topic_name,
       exam_name, exam_year, exam_shift,
       difficulty_level, keywords, concept_tags, has_image,
       uploaded_by, batch_id, is_active
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18,
       $19, $20, $21, $22,
       $23, $24, $25
     ) RETURNING id`,
    [
      q.question_type,
      q.topic_id,
      q.chapter_id,
      q.textbook_id,
      q.question_text,
      q.question_image_url,
      JSON.stringify(q.content),
      q.correct_answer,
      q.correct_answer_detail ? JSON.stringify(q.correct_answer_detail) : null,
      q.solution,
      q.scaffolding ? JSON.stringify(q.scaffolding) : null,
      q.subject,
      q.class,
      q.chapter_name,
      q.topic_name,
      q.exam_name,
      q.exam_year,
      q.exam_shift,
      q.difficulty_level,
      q.keywords,
      q.concept_tags,
      q.has_image,
      q.uploaded_by,
      q.batch_id,
      q.is_active,
    ]
  );
  return rows[0].id;
}

export async function insertQuestionMedia(
  questionId: string,
  role: string,
  storageUrl: string,
  altText: string | null,
  mimeType: string
): Promise<void> {
  await query(
    `INSERT INTO question_media (question_id, role, storage_url, alt_text, mime_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [questionId, role, storageUrl, altText, mimeType]
  );
}

export async function updateQuestion(
  id: string,
  updates: Partial<
    Pick<
      Question,
      | 'question_text'
      | 'content'
      | 'correct_answer'
      | 'solution'
      | 'difficulty_level'
      | 'keywords'
      | 'concept_tags'
      | 'is_active'
    >
  >
): Promise<void> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const dbKey = key === 'content' ? `content = $${i}::jsonb` : `${key} = $${i}`;
      setClauses.push(key === 'content' ? dbKey : `${key} = $${i}`);
      params.push(key === 'content' ? JSON.stringify(value) : value);
      i++;
    }
  }

  if (setClauses.length === 0) return;
  params.push(id);

  await query(
    `UPDATE questions SET ${setClauses.join(', ')} WHERE id = $${i}`,
    params
  );
}

export async function setQuestionActive(id: string, isActive: boolean): Promise<void> {
  await query('UPDATE questions SET is_active = $1 WHERE id = $2', [isActive, id]);
}
