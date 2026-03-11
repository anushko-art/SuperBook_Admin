import { query } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';

interface Textbook {
  id: string;
  title: string;
  subject: string;
  grade: string;
  part: string;
  publisher: string;
  slug: string;
  total_chapters: number;
}

async function getTextbooks(): Promise<Textbook[]> {
  try {
    return await query<Textbook>(
      `SELECT id, title, subject, grade, part, publisher, slug, total_chapters
       FROM textbooks
       WHERE is_published = TRUE
       ORDER BY grade, part`
    );
  } catch {
    return [];
  }
}

export default async function DashboardHomePage() {
  const textbooks = await getTextbooks();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome to Superbook</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          NCERT Physics Class 11 — Interactive Study Platform
        </p>
      </div>

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-2">NCERT Physics Class 11</h2>
            <p className="text-blue-100 text-sm max-w-md">
              Complete study material covering {textbooks.reduce((a, b) => a + b.total_chapters, 0)} chapters
              across {textbooks.length} parts. Read, explore, and master physics.
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              {textbooks.map((tb) => (
                <Link key={tb.id} href={`/dashboard/books/${tb.id}`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  >
                    {tb.part} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          <BookOpen className="w-16 h-16 opacity-30 shrink-0 hidden md:block" />
        </div>
      </div>

      {/* Textbooks grid */}
      <h2 className="text-lg font-semibold mb-4">Available Textbooks</h2>
      {textbooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
            <h3 className="font-semibold mb-2">No content available yet</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              The database has no published textbooks. Please run the seed script first.
            </p>
            <Link href="/admin">
              <Button variant="outline" size="sm">Go to Admin Panel</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {textbooks.map((tb) => (
            <Card key={tb.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
                  </div>
                  <Badge variant="secondary">{tb.part}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{tb.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  <span>{tb.total_chapters} chapters</span>
                  <span>•</span>
                  <span>{tb.publisher}</span>
                </div>
                <Link href={`/dashboard/books/${tb.id}`}>
                  <Button className="w-full" size="sm">
                    Start Reading <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
