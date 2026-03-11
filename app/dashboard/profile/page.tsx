import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { User, Clock, CheckCircle2, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { query } from '@/lib/db';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/auth/signin?from=/dashboard/profile');

  const [user] = await query<{ id: string; email: string; display_name: string; role: string; created_at: string }>(
    `SELECT id, email, display_name, role, created_at FROM users WHERE id = $1`,
    [session.userId]
  );

  const [stats] = await query<{
    topics_completed: number; avg_score: number; total_hours: number; topics_this_week: number;
  }>(
    `SELECT
       COUNT(CASE WHEN status = 'completed' THEN 1 END)::int           AS topics_completed,
       ROUND(AVG(quiz_score)::numeric, 1)::float                       AS avg_score,
       ROUND((SUM(time_spent_seconds)/3600.0)::numeric, 2)::float      AS total_hours,
       COUNT(CASE WHEN status='completed' AND updated_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS topics_this_week
     FROM user_topic_progress WHERE user_id = $1`,
    [session.userId]
  );

  const weakTopics = await query<{ id: string; title: string; avg_score: number }>(
    `SELECT t.id, t.title, ROUND(AVG(uqa.score * 100)::numeric,1) AS avg_score
     FROM user_quiz_attempts uqa JOIN topics t ON uqa.topic_id = t.id
     WHERE uqa.user_id = $1 GROUP BY t.id, t.title HAVING AVG(uqa.score) < 0.6
     ORDER BY AVG(uqa.score) ASC LIMIT 5`,
    [session.userId]
  );

  const strongTopics = await query<{ id: string; title: string; avg_score: number }>(
    `SELECT t.id, t.title, ROUND(AVG(uqa.score * 100)::numeric,1) AS avg_score
     FROM user_quiz_attempts uqa JOIN topics t ON uqa.topic_id = t.id
     WHERE uqa.user_id = $1 GROUP BY t.id, t.title HAVING AVG(uqa.score) > 0.8
     ORDER BY AVG(uqa.score) DESC LIMIT 5`,
    [session.userId]
  );

  const recentTopics = await query<{ id: string; title: string; status: string; completion_percentage: number; last_accessed_at: string }>(
    `SELECT t.id, t.title, utp.status, utp.completion_percentage, utp.last_accessed_at
     FROM user_topic_progress utp JOIN topics t ON utp.topic_id = t.id
     WHERE utp.user_id = $1 AND utp.last_accessed_at IS NOT NULL
     ORDER BY utp.last_accessed_at DESC LIMIT 8`,
    [session.userId]
  );

  const s = stats ?? { topics_completed: 0, avg_score: 0, total_hours: 0, topics_this_week: 0 };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
          <User className="h-7 w-7 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{user?.display_name ?? session.email}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{session.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs capitalize">{session.role}</Badge>
            {user?.created_at && <span className="text-xs text-[hsl(var(--muted-foreground))]">Joined {formatDate(user.created_at)}</span>}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Topics Done', value: s.topics_completed, color: 'text-emerald-600' },
          { icon: TrendingUp, label: 'Avg Quiz Score', value: s.avg_score ? `${s.avg_score}%` : '—', color: 'text-blue-600' },
          { icon: Clock, label: 'Hours Studied', value: s.total_hours ?? 0, color: 'text-amber-600' },
          { icon: BookOpen, label: 'This Week', value: s.topics_this_week, color: 'text-[hsl(var(--primary))]' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <Icon className={`h-5 w-5 ${color} mb-2`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div>
          <h2 className="font-semibold mb-3">Recently Studied</h2>
          {recentTopics.length === 0
            ? <p className="text-sm text-[hsl(var(--muted-foreground))]">No recent activity</p>
            : (
              <div className="space-y-2">
                {recentTopics.map((t) => (
                  <Link key={t.id} href={`/dashboard/topics/${t.id}`}>
                    <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Progress value={t.completion_percentage} className="h-1 w-20" />
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{t.completion_percentage}%</span>
                        </div>
                      </div>
                      <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] h-5 shrink-0">
                        {t.status === 'completed' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : 'Started'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Weak/Strong */}
        <div className="space-y-4">
          {weakTopics.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-red-500" />Needs Review
              </h2>
              <div className="space-y-1.5">
                {weakTopics.map((t) => (
                  <Link key={t.id} href={`/dashboard/topics/${t.id}`}>
                    <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 hover:bg-[hsl(var(--accent))] transition-colors">
                      <p className="text-sm truncate flex-1">{t.title}</p>
                      <Badge variant="destructive" className="text-xs ml-2 shrink-0">{t.avg_score}%</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {strongTopics.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />Strengths
              </h2>
              <div className="space-y-1.5">
                {strongTopics.map((t) => (
                  <Link key={t.id} href={`/dashboard/topics/${t.id}`}>
                    <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 hover:bg-[hsl(var(--accent))] transition-colors">
                      <p className="text-sm truncate flex-1">{t.title}</p>
                      <Badge className="text-xs ml-2 shrink-0 bg-emerald-600">{t.avg_score}%</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {weakTopics.length === 0 && strongTopics.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Take quizzes to see your strengths and weak areas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
