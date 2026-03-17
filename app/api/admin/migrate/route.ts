export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Idempotent migration: runs all schema upgrades safely
export async function POST() {
  const results: string[] = [];

  try {
    // ── Original migration ──────────────────────────────────────────────────
    await query(`ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS meta_json JSONB DEFAULT '{}'`);
    await query(`UPDATE uploaded_files SET meta_json = '{}' WHERE meta_json IS NULL`);
    results.push('uploaded_files.meta_json: ok');

    // ── Phase 1: pgvector (optional — skip silently if unavailable) ─────────
    try {
      await query(`CREATE EXTENSION IF NOT EXISTS vector`);
      results.push('pgvector extension: ok');
    } catch {
      results.push('pgvector extension: skipped (not installed)');
    }

    // ── Phase 1: topics ─────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS topics (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id, order_index)`);
    results.push('topics table: ok');

    // ── Phase 2: global_generated_content ───────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS global_generated_content (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ggc_topic ON global_generated_content(topic_id)`);
    results.push('global_generated_content table: ok');

    // ── Phase 2: global_generated_flashcards ────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS global_generated_flashcards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        global_content_id UUID NOT NULL REFERENCES global_generated_content(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100),
        difficulty_level VARCHAR(20),
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ggf_content ON global_generated_flashcards(global_content_id)`);
    results.push('global_generated_flashcards table: ok');

    // ── Phase 2: global_generated_quiz_questions ─────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS global_generated_quiz_questions (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ggqq_content ON global_generated_quiz_questions(global_content_id)`);
    results.push('global_generated_quiz_questions table: ok');

    // ── Phase 1: user_topic_progress ────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS user_topic_progress (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_utp_user ON user_topic_progress(user_id)`);
    results.push('user_topic_progress table: ok');

    // ── Phase 3: user_quiz_attempts ─────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS user_quiz_attempts (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_uqa_user_topic ON user_quiz_attempts(user_id, topic_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_uqa_attempted ON user_quiz_attempts(attempted_at DESC)`);
    results.push('user_quiz_attempts table: ok');

    // ── Phase 3: user_flashcard_progress ────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS user_flashcard_progress (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ufp_user ON user_flashcard_progress(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ufp_next_review ON user_flashcard_progress(user_id, next_review_at)`);
    results.push('user_flashcard_progress table: ok');

    // ── Phase 3: user_learning_activity ─────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS user_learning_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        duration_seconds INT,
        metadata JSONB,
        activity_timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ula_user ON user_learning_activity(user_id, activity_timestamp DESC)`);
    results.push('user_learning_activity table: ok');

    // ── Phase 3: content_generation_logs ────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS content_generation_logs (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_cgl_topic ON content_generation_logs(topic_id, generated_at DESC)`);
    results.push('content_generation_logs table: ok');

    // ── Phase 4: learning_images ─────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS learning_images (
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
      )
    `);
    // Add updated_at to existing tables that may be missing it
    await query(`ALTER TABLE learning_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    await query(`CREATE INDEX IF NOT EXISTS idx_li_topic ON learning_images(topic_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_li_chapter ON learning_images(chapter_id)`);
    results.push('learning_images table: ok');

    // ── Phase 4: learning_videos ─────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS learning_videos (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_lv_topic ON learning_videos(topic_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_lv_youtube ON learning_videos(youtube_id)`);
    results.push('learning_videos table: ok');

    // ── Phase 5: user_learning_insights ─────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS user_learning_insights (
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
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_uli_user ON user_learning_insights(user_id)`);
    results.push('user_learning_insights table: ok');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed', results },
      { status: 500 }
    );
  }
}
