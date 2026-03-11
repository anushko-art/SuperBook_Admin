import { query } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Brain, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { getSession } from '@/lib/auth';

interface Chapter {
  id: string;
  textbook_id: string;
  title: string;
  chapter_number: number;
  content_markdown: string;
  exercises_markdown: string;
  source_folder: string;
  is_published: boolean;
  estimated_read_time_minutes: number;
  content_length: number;
  toc_json: Array<{ title: string; page_id: number }> | null;
  textbook_title: string;
  subject: string;
  grade: string;
  part: string;
  textbook_slug: string;
}

interface AdjacentChapter {
  id: string;
  title: string;
  chapter_number: number;
}

async function getChapterData(id: string) {
  try {
    const [chapter] = await query<Chapter>(
      `SELECT c.*, t.title AS textbook_title, t.subject, t.grade, t.part, t.slug AS textbook_slug
       FROM chapters c
       JOIN textbooks t ON c.textbook_id = t.id
       WHERE c.id = $1 AND c.is_published = TRUE`,
      [id]
    );
    if (!chapter) return null;

    // Get prev/next chapters
    const [prev] = await query<AdjacentChapter>(
      `SELECT id, title, chapter_number FROM chapters
       WHERE textbook_id = $1 AND display_order < (
         SELECT display_order FROM chapters WHERE id = $2
       )
       ORDER BY display_order DESC LIMIT 1`,
      [chapter.textbook_id, id]
    );
    const [next] = await query<AdjacentChapter>(
      `SELECT id, title, chapter_number FROM chapters
       WHERE textbook_id = $1 AND display_order > (
         SELECT display_order FROM chapters WHERE id = $2
       )
       ORDER BY display_order ASC LIMIT 1`,
      [chapter.textbook_id, id]
    );

    // Get topics for this chapter
    const topics = await query<{ id: string; title: string; order_index: number; content_id: string | null }>(
      `SELECT t.id, t.title, t.order_index, gc.id AS content_id
       FROM topics t
       LEFT JOIN global_generated_content gc ON t.id = gc.topic_id AND gc.is_latest = true
       WHERE t.chapter_id = $1
       ORDER BY t.order_index`,
      [id]
    );

    return { chapter, prev: prev || null, next: next || null, topics };
  } catch {
    return null;
  }
}

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getChapterData(id);
  if (!data) notFound();

  const { chapter, prev, next, topics } = data;
  const hasToc = chapter.toc_json && Array.isArray(chapter.toc_json) && chapter.toc_json.length > 0;

  return (
    <div className="flex min-h-screen">
      {/* Table of Contents — fixed sidebar on large screens */}
      {hasToc && (
        <aside className="hidden xl:block w-56 shrink-0 border-r border-[hsl(var(--border))] p-4 sticky top-0 h-screen overflow-y-auto">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
            Contents
          </p>
          <nav className="space-y-1">
            {chapter.toc_json!.slice(0, 20).map((item, i) => (
              <p
                key={i}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] leading-relaxed py-0.5 cursor-default"
              >
                {item.title.replace(/\n/g, ' ')}
              </p>
            ))}
          </nav>
        </aside>
      )}

      {/* Main reader */}
      <div className="flex-1 min-w-0 p-6 lg:p-8 max-w-4xl">
        {/* Back */}
        <Link href={`/dashboard/books/${chapter.textbook_id}`}>
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> {chapter.textbook_title}
          </Button>
        </Link>

        {/* Chapter header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="secondary">Chapter {chapter.chapter_number}</Badge>
            <Badge variant="outline">{chapter.subject}</Badge>
            {chapter.estimated_read_time_minutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="w-3 h-3" />
                {chapter.estimated_read_time_minutes} min read
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{chapter.title}</h1>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="content">
          <TabsList className="mb-6">
            <TabsTrigger value="content">Chapter</TabsTrigger>
            {topics.length > 0 && (
              <TabsTrigger value="topics" className="gap-1.5">
                <Brain className="h-3.5 w-3.5" />
                Topics
                <span className="ml-1 rounded-full bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-medium">{topics.length}</span>
              </TabsTrigger>
            )}
            {chapter.exercises_markdown && (
              <TabsTrigger value="exercises">Exercises</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content">
            {chapter.content_markdown ? (
              <MarkdownRenderer content={chapter.content_markdown} />
            ) : (
              <p className="text-[hsl(var(--muted-foreground))]">
                Content not available for this chapter.
              </p>
            )}
          </TabsContent>

          {topics.length > 0 && (
            <TabsContent value="topics">
              <div className="space-y-2">
                {topics.map((t) => (
                  <Link key={t.id} href={`/dashboard/topics/${t.id}`}>
                    <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))] transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] w-5 shrink-0">{t.order_index + 1}</span>
                        <span className="text-sm font-medium group-hover:text-[hsl(var(--primary))] transition-colors">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.content_id
                          ? <Badge variant="secondary" className="text-[10px] h-5 gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />AI Ready</Badge>
                          : <Badge variant="outline" className="text-[10px] h-5 text-[hsl(var(--muted-foreground))]">Pending</Badge>
                        }
                        <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>
          )}

          {chapter.exercises_markdown && (
            <TabsContent value="exercises">
              <MarkdownRenderer content={chapter.exercises_markdown} />
            </TabsContent>
          )}
        </Tabs>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-4 mt-12 pt-6 border-t border-[hsl(var(--border))]">
          {prev ? (
            <Link href={`/dashboard/chapters/${prev.id}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Ch. {prev.chapter_number}: {prev.title}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`/dashboard/chapters/${next.id}`}>
              <Button variant="outline" size="sm">
                Ch. {next.chapter_number}: {next.title}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
