import { query } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, ImageIcon, BookOpen, Hash, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChapterMarkdownView } from './ChapterMarkdownView';
import { ContentGeneratedTab } from './ContentGeneratedTab';
import { GenerateVisualTab } from './GenerateVisualTab';
import { ImagesTabClient } from './ImagesTabClient';

interface Chapter {
  id: string; textbook_id: string; title: string; chapter_number: number;
  content_markdown: string; exercises_markdown: string; source_folder: string;
  is_published: boolean; estimated_read_time_minutes: number; content_length: number;
  created_at: string; updated_at: string;
  textbook_title: string; subject: string; grade: string; part: string;
}

interface Topic {
  id: string; title: string; order_index: number;
  source_markdown: string | null; difficulty_level: string;
  is_key_concept: boolean; is_formula: boolean;
  flashcard_count: number; quiz_count: number; content_id: string | null;
  visual_schema: Record<string, unknown> | null;
}

interface CombinedImage {
  id: string; filename: string; alt_text: string | null;
  page_number: number | null; source: 'chapter_images' | 'learning_images';
  file_path: string | null; topic_title: string | null;
}

async function getChapter(id: string) {
  // Critical query — if this fails the chapter page is genuinely unavailable.
  let chapter: Chapter | undefined;
  try {
    [chapter] = await query<Chapter>(
      `SELECT c.*, t.title AS textbook_title, t.subject, t.grade, t.part, t.id AS textbook_id
       FROM chapters c
       JOIN textbooks t ON c.textbook_id = t.id
       WHERE c.id = $1`,
      [id]
    );
  } catch (err) {
    console.error('[getChapter] chapter query failed:', err);
    return null;
  }
  if (!chapter) return null;

  // Optional: legacy table — may not exist in all deployments.
  let legacyImages: CombinedImage[] = [];
  try {
    legacyImages = await query<CombinedImage>(
      `SELECT id, filename, alt_text, page_number, NULL AS file_path, NULL AS topic_title,
              'chapter_images' AS source
       FROM chapter_images WHERE chapter_id = $1
       ORDER BY page_number NULLS LAST, filename`,
      [id]
    );
  } catch { /* table not created yet — safe to skip */ }

  // Optional: new learning_images pipeline — table created by migration.
  let learningImages: CombinedImage[] = [];
  try {
    learningImages = await query<CombinedImage>(
      `SELECT li.id, li.file_name AS filename, li.alt_text, NULL AS page_number,
              li.file_path, t.title AS topic_title, 'learning_images' AS source
       FROM learning_images li
       LEFT JOIN topics t ON li.topic_id = t.id
       WHERE li.chapter_id = $1
       ORDER BY li.created_at DESC`,
      [id]
    );
  } catch { /* table not created yet — safe to skip */ }

  // Optional: topics with generated-content counts — tables created by migration.
  let topics: Topic[] = [];
  try {
    topics = await query<Topic>(
      `SELECT t.id, t.title, t.order_index, t.source_markdown,
              t.difficulty_level, t.is_key_concept, t.is_formula,
              gc.id AS content_id,
              COALESCE((SELECT COUNT(*)::int FROM global_generated_flashcards WHERE global_content_id = gc.id), 0) AS flashcard_count,
              COALESCE((SELECT COUNT(*)::int FROM global_generated_quiz_questions WHERE global_content_id = gc.id), 0) AS quiz_count,
              (gc.metadata->>'visual_schema')::jsonb AS visual_schema
       FROM topics t
       LEFT JOIN global_generated_content gc ON t.id = gc.topic_id AND gc.is_latest = true
       WHERE t.chapter_id = $1
       ORDER BY t.order_index`,
      [id]
    );
  } catch { /* tables not created yet — safe to skip */ }

  return { chapter, images: [...legacyImages, ...learningImages], topics };
}

export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getChapter(id);
  if (!data) notFound();

  const { chapter, images, topics } = data;
  const topicsWithContent = topics.filter(t => t.source_markdown);
  const totalFlashcards = topics.reduce((s, t) => s + t.flashcard_count, 0);
  const totalQuiz = topics.reduce((s, t) => s + t.quiz_count, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/chapters">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Chapters
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-[hsl(var(--muted))] px-2 py-0.5 rounded">
                Ch. {chapter.chapter_number}
              </span>
              <h1 className="text-xl font-bold">{chapter.title}</h1>
              <Badge variant={chapter.is_published ? 'default' : 'secondary'}>
                {chapter.is_published ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {chapter.textbook_title} • {chapter.subject} • Grade {chapter.grade}
              {chapter.part && ` • ${chapter.part}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/dashboard/chapters/${chapter.id}`} target="_blank">
              <Button variant="outline" size="sm">Preview</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Meta stats */}
      <div className="flex items-center flex-wrap gap-x-6 gap-y-1 mb-6 text-sm text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {chapter.estimated_read_time_minutes || 0} min read
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {topics.length} topics ({topicsWithContent.length} with content)
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {chapter.content_length ? `${(chapter.content_length / 1000).toFixed(1)}k chars` : 'No content'}
        </span>
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" />
          {images.length} image{images.length !== 1 ? 's' : ''}
        </span>
        {totalFlashcards > 0 && (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-3.5 h-3.5" />{totalFlashcards} flashcards
          </span>
        )}
        {totalQuiz > 0 && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <CheckCircle2 className="w-3.5 h-3.5" />{totalQuiz} quiz Q
          </span>
        )}
        <span>Updated {formatDate(chapter.updated_at)}</span>
      </div>

      {/* Content tabs */}
      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
          <TabsTrigger value="generated">
            Generated Content
            {(totalFlashcards + totalQuiz) > 0 && (
              <span className="ml-1.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[9px] px-1.5 py-0.5 rounded-full">
                {totalFlashcards + totalQuiz}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="visuals">Visuals</TabsTrigger>
          <TabsTrigger value="content">Chapter Content</TabsTrigger>
          <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
          <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
        </TabsList>

        {/* ── Topics tab ── */}
        <TabsContent value="topics">
          {topics.length === 0 ? (
            <div className="rounded-xl border border-[hsl(var(--border))] p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No topics yet. Go to Textbooks page to create topics for this chapter.
              </p>
              <Link href="/admin/textbooks" className="mt-3 inline-block">
                <Button variant="outline" size="sm">Go to Textbooks</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                  {/* Topic header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] sticky top-0 z-10">
                    <span className="h-6 w-6 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-xs font-bold text-[hsl(var(--primary))] shrink-0">
                      {topic.order_index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{topic.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                          <Hash className="h-2.5 w-2.5" />{topic.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {topic.content_id && <Badge variant="default" className="text-[10px] h-4 px-1.5">AI Ready</Badge>}
                      {topic.quiz_count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{topic.quiz_count} Q</Badge>}
                      {topic.flashcard_count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{topic.flashcard_count} FC</Badge>}
                      {topic.is_key_concept && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Key</Badge>}
                    </div>
                  </div>

                  {/* Topic markdown — no fixed height, shows fully */}
                  {topic.source_markdown ? (
                    <div className="p-6">
                      <ChapterMarkdownView
                        content={topic.source_markdown}
                        imageBaseUrl={`/uploads/chapters/${chapter.id}/`}
                      />
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No markdown content. Upload via Textbooks → Topics.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Generated Content tab ── */}
        <TabsContent value="generated">
          <ContentGeneratedTab
            topics={topics.map(t => ({
              id: t.id, title: t.title, order_index: t.order_index,
              flashcard_count: t.flashcard_count, quiz_count: t.quiz_count,
            }))}
          />
        </TabsContent>

        {/* ── Visuals tab ── */}
        <TabsContent value="visuals">
          <GenerateVisualTab
            topics={topics.map(t => ({
              id: t.id,
              title: t.title,
              order_index: t.order_index,
              has_content: !!t.source_markdown,
              existing_visual: t.visual_schema
                ? (t.visual_schema as unknown as import('@/components/visuals/VisualRenderer').VisualSchema)
                : null,
            }))}
          />
        </TabsContent>

        {/* ── Chapter Content (legacy) ── */}
        <TabsContent value="content">
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            {chapter.content_markdown ? (
              <div className="p-6">
                <ScrollArea className="h-[600px]">
                    <ChapterMarkdownView
                    content={chapter.content_markdown}
                    imageBaseUrl={`/uploads/chapters/${chapter.id}/`}
                  />
                </ScrollArea>
              </div>
            ) : (
              <p className="text-[hsl(var(--muted-foreground))] text-center py-10 text-sm">
                No chapter-level content. Content lives in individual topics above.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── Images ── */}
        <TabsContent value="images">
          <ImagesTabClient
            chapterId={chapter.id}
            images={images.map(img => ({
              id: img.id,
              filename: img.filename,
              file_path: img.file_path,
              alt_text: img.alt_text,
              topic_title: img.topic_title,
              source: img.source,
              chapter_id: chapter.id,
            }))}
          />
        </TabsContent>

        {/* ── Raw Markdown ── */}
        <TabsContent value="raw">
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <ScrollArea className="h-[600px]">
              <pre className="p-6 text-xs font-mono whitespace-pre-wrap break-words text-[hsl(var(--muted-foreground))]">
                {chapter.content_markdown ||
                  topics.map(t => `## ${t.title}\n\nTopic ID: ${t.id}\n\n${t.source_markdown ?? '(no content)'}`).join('\n\n---\n\n') ||
                  '(empty)'}
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
