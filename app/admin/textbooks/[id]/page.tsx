import { query } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
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
  created_at: string;
}

interface Textbook {
  id: string;
  title: string;
  subject: string;
  grade: string;
  part: string;
  publisher: string;
  slug: string;
  description: string;
  is_published: boolean;
  total_chapters: number;
  created_at: string;
  updated_at: string;
  chapters: Chapter[];
}

async function getTextbook(id: string): Promise<Textbook | null> {
  try {
    const [textbook] = await query<Textbook>(
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
                  'is_published', c.is_published,
                  'created_at', c.created_at
                ) ORDER BY c.display_order
              ) FILTER (WHERE c.id IS NOT NULL), '[]') AS chapters
       FROM textbooks t
       LEFT JOIN chapters c ON c.textbook_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );
    return textbook || null;
  } catch {
    return null;
  }
}

export default async function AdminTextbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const textbook = await getTextbook(id);
  if (!textbook) notFound();

  const chapters: Chapter[] = Array.isArray(textbook.chapters) ? textbook.chapters : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/textbooks">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Textbooks
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{textbook.title}</h1>
              <Badge variant={textbook.is_published ? 'default' : 'secondary'}>
                {textbook.is_published ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">
              {textbook.subject} • Grade {textbook.grade} • {textbook.part}
              {textbook.publisher && ` • ${textbook.publisher}`}
            </p>
          </div>
        </div>
        {textbook.description && (
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] max-w-2xl">
            {textbook.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Chapters</p>
            <p className="text-2xl font-bold mt-1">{chapters.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Read Time</p>
            <p className="text-2xl font-bold mt-1">
              {chapters.reduce((a, c) => a + (c.estimated_read_time_minutes || 0), 0)} min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Last Updated</p>
            <p className="text-sm font-semibold mt-2">{formatDate(textbook.updated_at)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chapters table */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters ({chapters.length})</CardTitle>
          <CardDescription>All chapters in this textbook</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[hsl(var(--border))]">
            {chapters.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] p-6 text-center">
                No chapters found.
              </p>
            ) : (
              chapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[hsl(var(--accent)/0.5)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-mono shrink-0">
                      {ch.chapter_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ch.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                        {ch.source_folder}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ch.estimated_read_time_minutes > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <Clock className="w-3 h-3" />
                        {ch.estimated_read_time_minutes}m
                      </span>
                    )}
                    {ch.content_length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <FileText className="w-3 h-3" />
                        {(ch.content_length / 1000).toFixed(1)}k
                      </span>
                    )}
                    <Badge variant={ch.is_published ? 'default' : 'secondary'} className="text-xs">
                      {ch.is_published ? 'Live' : 'Draft'}
                    </Badge>
                    <Link href={`/admin/chapters/${ch.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
