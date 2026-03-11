import { query } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ChevronRight, Clock, Layers, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface Textbook {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  part: string;
  publisher: string;
  total_chapters: number;
}

const PART_COLORS: Record<string, string> = {
  'Part 1': 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
  'Part 2': 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
};

async function getTextbooks(): Promise<Textbook[]> {
  try {
    return await query<Textbook>(
      `SELECT id, title, description, subject, grade, part, publisher, total_chapters
       FROM textbooks WHERE is_published = TRUE
       ORDER BY grade, part`
    );
  } catch {
    return [];
  }
}

export default async function BooksListPage() {
  const textbooks = await getTextbooks();

  if (textbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No books available</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
          Seed the database first using{' '}
          <code className="font-mono text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">
            node seed.mjs
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.12)] to-[hsl(var(--accent))] p-6 border border-[hsl(var(--primary)/0.15)]">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6 text-[hsl(var(--primary-foreground))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Physics Class 11</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1 text-sm">
              {textbooks.length} textbook{textbooks.length !== 1 ? 's' : ''} &bull; NCERT curriculum
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal card scroll — "Continue Reading" */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Your Library
          </h2>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{textbooks.length} books</span>
        </div>

        {/* Horizontal scroll row */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
          {textbooks.map((tb) => (
            <div
              key={tb.id}
              className="snap-start shrink-0 w-64 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group"
            >
              {/* Card cover area */}
              <div className="h-28 bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent))] flex items-center justify-center relative">
                <BookOpen className="h-10 w-10 text-[hsl(var(--primary)/0.6)]" />
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${PART_COLORS[tb.part] ?? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                    {tb.part}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="text-sm font-semibold leading-tight line-clamp-2 mb-2">{tb.title}</h3>
                {tb.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mb-3">
                    {tb.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  <Layers className="h-3 w-3" />
                  <span>{tb.total_chapters} chapters</span>
                  <span className="mx-1">·</span>
                  <Clock className="h-3 w-3" />
                  <span>~{tb.total_chapters * 20}m</span>
                </div>

                {/* Progress bar (placeholder) */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] mb-1">
                    <span>Progress</span>
                    <span>0%</span>
                  </div>
                  <Progress value={0} className="h-1" />
                </div>

                <Link href={`/dashboard/books/${tb.id}`}>
                  <Button size="sm" className="w-full h-8 text-xs group-hover:bg-[hsl(var(--primary))]">
                    Read Now <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed list — Article Settings Layout */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Detailed View
          </h2>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {textbooks.map((tb) => (
            <div
              key={tb.id}
              className="flex items-center gap-4 p-4 hover:bg-[hsl(var(--accent)/0.5)] transition-colors"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{tb.title}</p>
                  <Badge variant="secondary" className="text-[10px] py-0 h-4">{tb.part}</Badge>
                </div>
                {tb.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-lg">
                    {tb.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{tb.subject}</span>
                  <span>·</span>
                  <span>Grade {tb.grade}</span>
                  <span>·</span>
                  <span>{tb.total_chapters} chapters</span>
                  {tb.publisher && (
                    <>
                      <span>·</span>
                      <span>{tb.publisher}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action */}
              <Link href={`/dashboard/books/${tb.id}`} className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Open <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
