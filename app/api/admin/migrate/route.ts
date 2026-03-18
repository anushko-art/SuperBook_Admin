export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Helper: run a single DDL statement and return a result string without throwing.
// This makes the migration fully idempotent — one failure doesn't abort the rest.
async function run(label: string, sql: string, params?: unknown[]): Promise<string> {
  try {
    await query(sql, params);
    return `${label}: ok`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `${label}: skipped (${msg.split('\n')[0]})`;
  }
}

// Idempotent migration: every statement is isolated so a single failure
// never aborts the rest of the schema upgrades.
export async function POST() {
  const results: string[] = [];

  // ── Base column additions ──────────────────────────────────────────────────
  results.push(await run(
    'uploaded_files.meta_json',
    `ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS meta_json JSONB DEFAULT '{}'`
  ));
  results.push(await run(
    'uploaded_files.meta_json backfill',
    `UPDATE uploaded_files SET meta_json = '{}' WHERE meta_json IS NULL`
  ));

  // ── Users table extras ─────────────────────────────────────────────────────
  results.push(await run(
    'users.phone',
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`
  ));
  results.push(await run(
    'users.updated_at',
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`
  ));

  // ── uploader_id columns (plain UUID, no FK — app enforces permissions) ─────
  results.push(await run(
    'textbooks.uploader_id',
    `ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS uploader_id UUID`
  ));
  results.push(await run(
    'chapters.uploader_id',
    `ALTER TABLE chapters ADD COLUMN IF NOT EXISTS uploader_id UUID`
  ));
  results.push(await run(
    'uploaded_files.uploader_id',
    `ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS uploader_id UUID`
  ));

  // ── textbooks.total_chapters (may be missing in some deployments) ──────────
  results.push(await run(
    'textbooks.total_chapters',
    `ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS total_chapters INT DEFAULT 0`
  ));

  // ── pgvector (optional) ────────────────────────────────────────────────────
  results.push(await run(
    'pgvector extension',
    `CREATE EXTENSION IF NOT EXISTS vector`
  ));

  // ── topics ────────────────────────────────────────────────────────────────
  results.push(await run(
    'topics table',
    `CREATE TABLE IF NOT EXISTS topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(255),
      source_markdown TEXT,
      order_index INT NOT NULL DEFAULT 0,
      difficulty_level VARCHAR(20) DEFAULT 'medium',
      is_key_concept BOOLEAN DEFAULT false,
      is_formula BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(chapter_id, order_index)
    )`
  ));
  results.push(await run(
    'idx_topics_chapter',
    `CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id, order_index)`
  ));

  // ── global_generated_content ───────────────────────────────────────────────
  results.push(await run(
    'global_generated_content table',
    `CREATE TABLE IF NOT EXISTS global_generated_content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID NOT NULL UNIQUE REFERENCES topics(id) ON DELETE CASCADE,
      generation_model VARCHAR(100),
      version INT DEFAULT 1,
      is_latest BOOLEAN DEFAULT true,
      insight JSONB,
      key_points JSONB,
      formulas JSONB,
      related_topics JSONB,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run(
    'idx_ggc_topic',
    `CREATE INDEX IF NOT EXISTS idx_ggc_topic ON global_generated_content(topic_id)`
  ));

  // ── global_generated_flashcards ────────────────────────────────────────────
  results.push(await run(
    'global_generated_flashcards table',
    `CREATE TABLE IF NOT EXISTS global_generated_flashcards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      global_content_id UUID NOT NULL REFERENCES global_generated_content(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(100),
      difficulty_level VARCHAR(20),
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run(
    'idx_ggf_content',
    `CREATE INDEX IF NOT EXISTS idx_ggf_content ON global_generated_flashcards(global_content_id)`
  ));

  // ── global_generated_quiz_questions ───────────────────────────────────────
  results.push(await run(
    'global_generated_quiz_questions table',
    `CREATE TABLE IF NOT EXISTS global_generated_quiz_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      global_content_id UUID NOT NULL REFERENCES global_generated_content(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(50) DEFAULT 'mcq',
      options JSONB NOT NULL,
      correct_answer_id INT,
      explanation TEXT,
      difficulty_level VARCHAR(20),
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run(
    'idx_ggqq_content',
    `CREATE INDEX IF NOT EXISTS idx_ggqq_content ON global_generated_quiz_questions(global_content_id)`
  ));

  // ── user_topic_progress ───────────────────────────────────────────────────
  results.push(await run(
    'user_topic_progress table',
    `CREATE TABLE IF NOT EXISTS user_topic_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'not_started',
      completion_percentage INT DEFAULT 0,
      insight_read BOOLEAN DEFAULT false,
      key_points_read BOOLEAN DEFAULT false,
      formulas_read BOOLEAN DEFAULT false,
      quiz_attempted BOOLEAN DEFAULT false,
      quiz_score DECIMAL(5,2),
      time_spent_seconds INT DEFAULT 0,
      last_accessed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, topic_id)
    )`
  ));
  results.push(await run(
    'idx_utp_user',
    `CREATE INDEX IF NOT EXISTS idx_utp_user ON user_topic_progress(user_id)`
  ));

  // ── user_quiz_attempts ────────────────────────────────────────────────────
  results.push(await run(
    'user_quiz_attempts table',
    `CREATE TABLE IF NOT EXISTS user_quiz_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_question_id UUID NOT NULL REFERENCES global_generated_quiz_questions(id) ON DELETE CASCADE,
      topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      attempt_number INT DEFAULT 1,
      user_answer_id INT,
      is_correct BOOLEAN,
      score DECIMAL(3,2),
      explanation_viewed BOOLEAN DEFAULT false,
      time_taken_seconds INT,
      attempted_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('idx_uqa_user_topic', `CREATE INDEX IF NOT EXISTS idx_uqa_user_topic ON user_quiz_attempts(user_id, topic_id)`));
  results.push(await run('idx_uqa_attempted', `CREATE INDEX IF NOT EXISTS idx_uqa_attempted ON user_quiz_attempts(attempted_at DESC)`));

  // ── user_flashcard_progress ───────────────────────────────────────────────
  results.push(await run(
    'user_flashcard_progress table',
    `CREATE TABLE IF NOT EXISTS user_flashcard_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flashcard_id UUID NOT NULL REFERENCES global_generated_flashcards(id) ON DELETE CASCADE,
      review_count INT DEFAULT 0,
      correct_count INT DEFAULT 0,
      incorrect_count INT DEFAULT 0,
      easiness_factor DECIMAL(4,2) DEFAULT 2.5,
      interval_days INT DEFAULT 1,
      last_reviewed_at TIMESTAMP,
      next_review_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, flashcard_id)
    )`
  ));
  results.push(await run('idx_ufp_user', `CREATE INDEX IF NOT EXISTS idx_ufp_user ON user_flashcard_progress(user_id)`));
  results.push(await run('idx_ufp_next_review', `CREATE INDEX IF NOT EXISTS idx_ufp_next_review ON user_flashcard_progress(user_id, next_review_at)`));

  // ── user_learning_activity ────────────────────────────────────────────────
  results.push(await run(
    'user_learning_activity table',
    `CREATE TABLE IF NOT EXISTS user_learning_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      duration_seconds INT,
      metadata JSONB,
      activity_timestamp TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('idx_ula_user', `CREATE INDEX IF NOT EXISTS idx_ula_user ON user_learning_activity(user_id, activity_timestamp DESC)`));

  // ── content_generation_logs ───────────────────────────────────────────────
  results.push(await run(
    'content_generation_logs table',
    `CREATE TABLE IF NOT EXISTS content_generation_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      global_content_id UUID REFERENCES global_generated_content(id) ON DELETE SET NULL,
      generation_model VARCHAR(100),
      generation_type VARCHAR(50),
      tokens_used INT,
      generation_time_ms INT,
      status VARCHAR(50),
      error_message TEXT,
      generated_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('idx_cgl_topic', `CREATE INDEX IF NOT EXISTS idx_cgl_topic ON content_generation_logs(topic_id, generated_at DESC)`));

  // ── learning_images ───────────────────────────────────────────────────────
  results.push(await run(
    'learning_images table',
    `CREATE TABLE IF NOT EXISTS learning_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
      chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
      file_name VARCHAR(255),
      file_path VARCHAR(500),
      source_url TEXT,
      alt_text TEXT,
      description TEXT,
      caption TEXT,
      image_type VARCHAR(50) DEFAULT 'diagram',
      quality_score DECIMAL(3,2),
      is_from_textbook BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('learning_images.updated_at', `ALTER TABLE learning_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`));
  results.push(await run('idx_li_topic', `CREATE INDEX IF NOT EXISTS idx_li_topic ON learning_images(topic_id)`));
  results.push(await run('idx_li_chapter', `CREATE INDEX IF NOT EXISTS idx_li_chapter ON learning_images(chapter_id)`));

  // ── learning_videos ───────────────────────────────────────────────────────
  results.push(await run(
    'learning_videos table',
    `CREATE TABLE IF NOT EXISTS learning_videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      youtube_id VARCHAR(20),
      youtube_url TEXT,
      duration_seconds INT,
      channel_name VARCHAR(255),
      transcript TEXT,
      added_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('idx_lv_topic', `CREATE INDEX IF NOT EXISTS idx_lv_topic ON learning_videos(topic_id)`));
  results.push(await run('idx_lv_youtube', `CREATE INDEX IF NOT EXISTS idx_lv_youtube ON learning_videos(youtube_id)`));

  // ── user_learning_insights ────────────────────────────────────────────────
  results.push(await run(
    'user_learning_insights table',
    `CREATE TABLE IF NOT EXISTS user_learning_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      total_topics_completed INT DEFAULT 0,
      average_quiz_score DECIMAL(5,2),
      total_time_spent_hours DECIMAL(10,2) DEFAULT 0,
      weak_topics JSONB,
      strong_topics JSONB,
      recommended_next_topics JSONB,
      topics_completed_this_week INT DEFAULT 0,
      computed_at TIMESTAMP DEFAULT NOW()
    )`
  ));
  results.push(await run('idx_uli_user', `CREATE INDEX IF NOT EXISTS idx_uli_user ON user_learning_insights(user_id)`));

  const failed = results.filter((r) => r.includes(': skipped'));
  return NextResponse.json({ ok: true, results, failed_count: failed.length });
}
