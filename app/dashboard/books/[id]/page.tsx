import { query } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  display_order: number;
  estimated_read_time_minutes: number;
  content_length: number;
  source_folder: string;
  is_published: boolean;
}

interface Textbook {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  part: string;
  publisher: string;
  total_chapters: number;
  chapters: Chapter[];
}

async function getTextbook(id: string): Promise<Textbook | null> {
  try {
    const [tb] = await query<Textbook>(
      `SELECT t.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', c.id,
                  'title', c.title,
                  'chapter_number', c.chapter_number,
                  'display_order', c.display_order,
                  'estimated_read_time_minutes', c.estimated_read_time_minutes,
                  'content_length', c.content_length,
                  'source_folder', c.source_folder,
                  'is_published', c.is_published
                ) ORDER BY c.display_order
              ) FILTER (WHERE c.id IS NOT NULL), '[]') AS chapters
       FROM textbooks t
       LEFT JOIN chapters c ON c.textbook_id = t.id AND c.is_published = TRUE
       WHERE t.id = $1 AND t.is_published = TRUE
       GROUP BY t.id`,
      [id]
    );
    return tb || null;
  } catch {
    return null;
  }
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const textbook = await getTextbook(id);
  if (!textbook) notFound();

  const chapters: Chapter[] = Array.isArray(textbook.chapters) ? textbook.chapters : [];
  const totalMinutes = chapters.reduce((a, c) => a + (c.estimated_read_time_minutes || 0), 0);

  return (
    <div className="p-8">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </Link>

      {/* Book header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{textbook.subject}</Badge>
          <Badge variant="secondary">Grade {textbook.grade}</Badge>
          <Badge variant="secondary">{textbook.part}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{textbook.title}</h1>
        {textbook.description && (
          <p className="text-[hsl(var(--muted-foreground))] mt-2 max-w-2xl text-sm">
            {textbook.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-[hsl(var(--muted-foreground))]">
          <span>{chapters.length} chapters</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ~{totalMinutes} min total
          </span>
          {textbook.publisher && (
            <>
              <span>•</span>
              <span>{textbook.publisher}</span>
            </>
          )}
        </div>
      </div>

      {/* Chapters list */}
      <h2 className="text-lg font-semibold mb-4">Chapters</h2>
      {chapters.length === 0 ? (
        <p className="text-[hsl(var(--muted-foreground))]">No chapters available.</p>
      ) : (
        <div className="grid gap-3">
          {chapters.map((ch, idx) => (
            <Link key={ch.id} href={`/dashboard/chapters/${ch.id}`}>
              <Card className="hover:shadow-md hover:border-[hsl(var(--primary)/0.4)] transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.08)] flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[hsl(var(--primary))]">
                          {ch.chapter_number}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ch.title}</p>
                        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {ch.estimated_read_time_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ch.estimated_read_time_minutes} min
                            </span>
                          )}
                          {ch.content_length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {(ch.content_length / 1000).toFixed(1)}k chars
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
