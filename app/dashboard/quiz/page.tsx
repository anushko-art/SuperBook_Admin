import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, BookOpen, FlaskConical } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AttemptRow {
  id: string;
  question_text: string;
  is_correct: boolean;
  user_answer_id: number;
  correct_answer_id: number;
  score: number;
  time_taken_seconds: number;
  attempted_at: string;
  topic_title: string;
  topic_id: string;
  subject: string;
  difficulty_level: string;
}

export default async function QuizHistoryPage() {
  const session = await getSession();
  if (!session) redirect('/auth/signin?from=/dashboard/quiz');

  const attempts = await query<AttemptRow>(
    `SELECT uqa.id, q.question_text, uqa.is_correct, uqa.user_answer_id,
            q.correct_answer_id, uqa.score, uqa.time_taken_seconds, uqa.attempted_at,
            t.title AS topic_title, t.id AS topic_id,
            tb.subject, q.difficulty_level
     FROM user_quiz_attempts uqa
     JOIN global_generated_quiz_questions q ON uqa.quiz_question_id = q.id
     JOIN topics t ON uqa.topic_id = t.id
     JOIN chapters c ON t.chapter_id = c.id
     JOIN textbooks tb ON c.textbook_id = tb.id
     WHERE uqa.user_id = $1
     ORDER BY uqa.attempted_at DESC
     LIMIT 100`,
    [session.userId]
  );

  const totalCorrect = attempts.filter((a) => a.is_correct).length;
  const accuracy = attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : 0;

  // Group by topic
  const byTopic = new Map<string, { title: string; subject: string; topic_id: string; correct: number; total: number }>();
  for (const a of attempts) {
    const prev = byTopic.get(a.topic_id) ?? { title: a.topic_title, subject: a.subject, topic_id: a.topic_id, correct: 0, total: 0 };
    byTopic.set(a.topic_id, { ...prev, correct: prev.correct + (a.is_correct ? 1 : 0), total: prev.total + 1 });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-[hsl(var(--primary))]" />Quiz History
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Your quiz performance across all topics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Attempts', value: attempts.length },
          { label: 'Correct', value: totalCorrect },
          { label: 'Accuracy', value: `${accuracy}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {attempts.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <p className="font-medium">No quiz attempts yet</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Visit a topic page and take a quiz to get started
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* By topic */}
          <div>
            <h2 className="font-semibold mb-3">Performance by Topic</h2>
            <div className="space-y-2">
              {Array.from(byTopic.values()).sort((a, b) => b.total - a.total).map((t) => {
                const pct = Math.round((t.correct / t.total) * 100);
                return (
                  <Link key={t.topic_id} href={`/dashboard/topics/${t.topic_id}`}>
                    <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 hover:bg-[hsl(var(--accent))] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.subject} · {t.total} attempts</p>
                      </div>
                      <Badge variant={pct >= 80 ? 'default' : pct >= 60 ? 'secondary' : 'destructive'} className="text-xs shrink-0">
                        {pct}%
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent attempts */}
          <div>
            <h2 className="font-semibold mb-3">Recent Attempts</h2>
            <div className="space-y-2">
              {attempts.slice(0, 15).map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
                  {a.is_correct
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium line-clamp-2">{a.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{a.topic_title}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">·</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatDate(a.attempted_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
