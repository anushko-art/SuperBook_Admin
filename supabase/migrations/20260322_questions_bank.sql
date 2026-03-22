-- ============================================================
-- SuperBook Phase 3: Question Bank
-- Migration: 20260322_questions_bank.sql
-- Idempotent — safe to run multiple times
-- ============================================================

-- 1. question_type enum
DO $$ BEGIN
  CREATE TYPE question_type_enum AS ENUM (
    'mcq', 'assertion_reason', 'matching', 'statement_based', 'image_based'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. batch_status enum
DO $$ BEGIN
  CREATE TYPE batch_status_enum AS ENUM (
    'pending', 'processing', 'complete', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE: questions
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type         question_type_enum NOT NULL,

  -- FK to existing hierarchy
  topic_id              UUID REFERENCES topics(id) ON DELETE SET NULL,
  chapter_id            UUID REFERENCES chapters(id) ON DELETE SET NULL,
  textbook_id           UUID REFERENCES textbooks(id) ON DELETE SET NULL,

  -- Content
  question_text         TEXT NOT NULL,
  question_image_url    TEXT,
  content               JSONB NOT NULL DEFAULT '{}',
  correct_answer        TEXT NOT NULL,
  correct_answer_detail JSONB,
  solution              TEXT,
  scaffolding           JSONB,

  -- Denormalized taxonomy (overwritten at ingest from DB, not from JSON)
  subject               TEXT,
  class                 TEXT,
  chapter_name          TEXT,
  topic_name            TEXT,

  -- Exam source (nullable — for PYQs only)
  exam_name             TEXT,
  exam_year             INTEGER,
  exam_shift            TEXT,

  -- Metadata
  difficulty_level      TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
  keywords              TEXT[]  DEFAULT '{}',
  concept_tags          TEXT[]  DEFAULT '{}',
  has_image             BOOLEAN DEFAULT false,

  -- Housekeeping
  uploaded_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  batch_id              UUID,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: question_media
-- ============================================================
CREATE TABLE IF NOT EXISTS question_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,   -- 'question_image' | 'option_1' | 'option_2' | etc.
  storage_url  TEXT NOT NULL,
  alt_text     TEXT,
  mime_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: question_upload_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS question_upload_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id         UUID REFERENCES topics(id) ON DELETE SET NULL,
  uploaded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  status           batch_status_enum DEFAULT 'pending',
  total_questions  INTEGER DEFAULT 0,
  inserted_count   INTEGER DEFAULT 0,
  error_count      INTEGER DEFAULT 0,
  errors           JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT now(),
  finalized_at     TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_q_topic        ON questions (topic_id);
CREATE INDEX IF NOT EXISTS idx_q_chapter      ON questions (chapter_id);
CREATE INDEX IF NOT EXISTS idx_q_textbook     ON questions (textbook_id);
CREATE INDEX IF NOT EXISTS idx_q_type         ON questions (question_type);
CREATE INDEX IF NOT EXISTS idx_q_difficulty   ON questions (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_q_batch        ON questions (batch_id);
CREATE INDEX IF NOT EXISTS idx_q_active       ON questions (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_q_content_gin  ON questions USING GIN (content);
CREATE INDEX IF NOT EXISTS idx_q_tags_gin     ON questions USING GIN (concept_tags);
CREATE INDEX IF NOT EXISTS idx_q_fts          ON questions USING GIN (
  to_tsvector('english', question_text)
);
CREATE INDEX IF NOT EXISTS idx_qm_question    ON question_media (question_id);
CREATE INDEX IF NOT EXISTS idx_qub_topic      ON question_upload_batches (topic_id);
CREATE INDEX IF NOT EXISTS idx_qub_user       ON question_upload_batches (uploaded_by, created_at DESC);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE questions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_upload_batches ENABLE ROW LEVEL SECURITY;

-- Admins: full access on questions
DO $$ BEGIN
  CREATE POLICY "Admin full access on questions"
    ON questions FOR ALL
    USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users: read active questions only
DO $$ BEGIN
  CREATE POLICY "Authenticated read active questions"
    ON questions FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins: full access on question_media
DO $$ BEGIN
  CREATE POLICY "Admin full access on question_media"
    ON question_media FOR ALL
    USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users: read media for active questions
DO $$ BEGIN
  CREATE POLICY "Authenticated read question_media"
    ON question_media FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM questions q
        WHERE q.id = question_id AND q.is_active = true
      )
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins: full access on batches
DO $$ BEGIN
  CREATE POLICY "Admin full access on question_upload_batches"
    ON question_upload_batches FOR ALL
    USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
