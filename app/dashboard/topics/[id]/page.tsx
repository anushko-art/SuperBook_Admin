import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import TopicReader from './TopicReader';

interface TopicRow {
  id: string; title: string; slug: string; difficulty_level: string;
  is_key_concept: boolean; is_formula: boolean; source_markdown: string;
  chapter_id: string; chapter_title: string; chapter_number: number;
  textbook_id: string; textbook_title: string; subject: string;
}
interface Insight { title: string; content: string; summary: string; keywords: string[] }
interface KeyPoint { point: string; importance: number; explanation: string }
interface Formula { latex: string; explanation: string; applications: string[] }
interface ContentRow {
  id: string; insight: Insight | null; key_points: KeyPoint[] | null; formulas: Formula[] | null;
  generation_model: string; updated_at: string;
}
interface ProgressRow {
  status: string; completion_percentage: number;
  insight_read: boolean; key_points_read: boolean; formulas_read: boolean;
  quiz_attempted: boolean; quiz_score: number; time_spent_seconds: number;
}
interface Flashcard { id: string; question: string; answer: string; category: string; difficulty_level: string; order_index: number }
interface QuizOption { id: number; text: string; is_correct: boolean }
interface QuizQuestion {
  id: string; question_text: string; options: QuizOption[];
  correct_answer_id: number; explanation: string; difficulty_level: string;
}
interface RelatedImage { id: string; file_name: string; file_path: string; alt_text: string; caption: string; image_type: string }
interface RelatedVideo { id: string; title: string; youtube_id: string; youtube_url: string; description: string; channel_name: string; duration_seconds: number }

async function getTopicData(id: string, userId?: string) {
  const [topic] = await query<TopicRow>(
    `SELECT t.id, t.title, t.slug, t.difficulty_level, t.is_key_concept, t.is_formula, t.source_markdown,
            t.chapter_id, c.title AS chapter_title, c.chapter_number,
            c.textbook_id, tb.title AS textbook_title, tb.subject
     FROM topics t
     JOIN chapters c ON t.chapter_id = c.id
     JOIN textbooks tb ON c.textbook_id = tb.id
     WHERE t.id = $1`,
    [id]
  );
  if (!topic) return null;

  const [content] = await query<ContentRow>(
    `SELECT id, insight, key_points, formulas, generation_model, updated_at
     FROM global_generated_content WHERE topic_id = $1 AND is_latest = true`,
    [id]
  );

  let flashcards: Flashcard[] = [];
  let quizQuestions: QuizQuestion[] = [];
  let relatedImages: RelatedImage[] = [];
  let relatedVideos: RelatedVideo[] = [];

  if (content) {
    [flashcards, quizQuestions] = await Promise.all([
      query<Flashcard>(`SELECT id, question, answer, category, difficulty_level, order_index
             FROM global_generated_flashcards WHERE global_content_id = $1 ORDER BY order_index`, [content.id]),
      query<QuizQuestion>(`SELECT id, question_text, options, correct_answer_id, explanation, difficulty_level
             FROM global_generated_quiz_questions WHERE global_content_id = $1 ORDER BY order_index`, [content.id]),
    ]);
  }

  // Related media
  [relatedImages, relatedVideos] = await Promise.all([
    query<RelatedImage>(`SELECT id, file_name, file_path, alt_text, caption, image_type
           FROM learning_images WHERE topic_id = $1 OR chapter_id = $2 LIMIT 6`,
      [id, topic.chapter_id]),
    query<RelatedVideo>(`SELECT id, title, youtube_id, youtube_url, description, channel_name, duration_seconds
           FROM learning_videos WHERE topic_id = $1 LIMIT 4`, [id]),
  ]);

  let progress: ProgressRow | null = null;
  if (userId) {
    const [p] = await query<ProgressRow>(
      `SELECT status, completion_percentage, insight_read, key_points_read, formulas_read,
              quiz_attempted, quiz_score, time_spent_seconds
       FROM user_topic_progress WHERE user_id = $1 AND topic_id = $2`,
      [userId, id]
    );
    progress = p ?? null;
  }

  // Adjacent topics in same chapter
  const adjacentTopics = await query<{ id: string; title: string; order_index: number }>(
    `SELECT id, title, order_index FROM topics WHERE chapter_id = $1 ORDER BY order_index`,
    [topic.chapter_id]
  );

  return { topic, content: content ?? null, flashcards, quizQuestions, relatedImages, relatedVideos, progress, adjacentTopics };
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getTopicData(id, session?.userId);
  if (!data) notFound();

  return (
    <TopicReader
      {...data}
      userId={session?.userId ?? null}
    />
  );
}
