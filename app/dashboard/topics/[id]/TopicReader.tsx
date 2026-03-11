'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Brain, FlaskConical, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, RotateCcw, Lightbulb, Star, Play,
  Image as ImageIcon, Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Topic {
  id: string; title: string; difficulty_level: string;
  is_key_concept: boolean; is_formula: boolean; source_markdown: string;
  chapter_id: string; chapter_title: string; chapter_number: number;
  textbook_id: string; textbook_title: string; subject: string;
}
interface Insight { title: string; content: string; summary: string; keywords: string[] }
interface KeyPoint { point: string; importance: number; explanation: string }
interface Formula { latex: string; explanation: string; applications: string[] }
interface Content {
  id: string;
  insight: Insight | null;
  key_points: KeyPoint[] | null;
  formulas: Formula[] | null;
  generation_model: string;
  updated_at: string;
}
interface Flashcard { id: string; question: string; answer: string; category: string; difficulty_level: string; order_index: number }
interface QuizOption { id: number; text: string; is_correct: boolean }
interface QuizQuestion {
  id: string; question_text: string; options: QuizOption[];
  correct_answer_id: number; explanation: string; difficulty_level: string;
}
interface Progress {
  status: string; completion_percentage: number;
  insight_read: boolean; key_points_read: boolean; formulas_read: boolean;
  quiz_attempted: boolean; quiz_score: number; time_spent_seconds: number;
}
interface RelatedImage { id: string; file_name: string; file_path: string; alt_text: string; caption: string; image_type: string }
interface RelatedVideo { id: string; title: string; youtube_id: string; youtube_url: string; description: string; channel_name: string; duration_seconds: number }

interface Props {
  topic: Topic;
  content: Content | null;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  relatedImages: RelatedImage[];
  relatedVideos: RelatedVideo[];
  progress: Progress | null;
  adjacentTopics: { id: string; title: string; order_index: number }[];
  userId: string | null;
}

/* ─── Flashcard component ─────────────────────────────────────────────────── */
function FlashcardView({ cards, userId }: { cards: Flashcard[]; userId: string | null }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return <p className="text-sm text-[hsl(var(--muted-foreground))]">No flashcards generated yet.</p>;

  const card = cards[index];

  const handleReview = async (quality: number) => {
    if (!userId) { toast.error('Sign in to track progress'); return; }
    try {
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcard_id: card.id, quality }),
      });
    } catch { /* silent */ }
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
        <span>{index + 1} / {cards.length}</span>
        <Badge variant="outline" className="text-xs">{card.category}</Badge>
      </div>

      {/* Card */}
      <div
        className="cursor-pointer rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-48 p-6 flex flex-col items-center justify-center text-center transition-all hover:border-[hsl(var(--primary)/0.5)] select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <>
            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Question</p>
            <p className="text-base font-medium leading-relaxed">{card.question}</p>
            <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">Click to reveal answer</p>
          </>
        ) : (
          <>
            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Answer</p>
            <p className="text-base leading-relaxed">{card.answer}</p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {flipped && (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => handleReview(1)} className="gap-1 text-red-600 border-red-200">
              <XCircle className="h-3.5 w-3.5" />Hard
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleReview(3)} className="gap-1 text-amber-600 border-amber-200">
              <RotateCcw className="h-3.5 w-3.5" />OK
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleReview(5)} className="gap-1 text-emerald-600 border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />Easy
            </Button>
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" size="sm" onClick={() => { setIndex((i) => Math.max(i - 1, 0)); setFlipped(false); }} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setIndex((i) => Math.min(i + 1, cards.length - 1)); setFlipped(false); }} disabled={index === cards.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Quiz component ──────────────────────────────────────────────────────── */
function QuizView({ questions, topicId, userId }: { questions: QuizQuestion[]; topicId: string; userId: string | null }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ is_correct: boolean; correct_answer_id: number; explanation: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  if (questions.length === 0) return <p className="text-sm text-[hsl(var(--muted-foreground))]">No quiz questions generated yet.</p>;

  const q = questions[qIndex];

  const submitAnswer = async () => {
    if (selected === null) return;
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_question_id: q.id, topic_id: topicId, user_answer_id: selected }),
      });
      const data = await res.json();
      setResult(data);
      setScore((s) => ({
        correct: s.correct + (data.is_correct ? 1 : 0),
        total: s.total + 1,
      }));
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-5xl font-bold text-[hsl(var(--primary))]">{pct}%</div>
        <p className="text-lg font-medium">{score.correct} / {score.total} correct</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {pct >= 80 ? 'Excellent! You mastered this topic.' : pct >= 60 ? 'Good work! Review the missed questions.' : 'Keep practicing — review the material and try again.'}
        </p>
        <Button onClick={() => { setQIndex(0); setSelected(null); setResult(null); setFinished(false); setScore({ correct: 0, total: 0 }); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Retry Quiz
        </Button>
      </div>
    );
  }

  const options = Array.isArray(q.options) ? q.options as QuizOption[] : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">Q{qIndex + 1} of {questions.length}</span>
        <Badge variant={q.difficulty_level === 'hard' ? 'destructive' : q.difficulty_level === 'easy' ? 'secondary' : 'outline'} className="text-xs">
          {q.difficulty_level}
        </Badge>
      </div>

      <p className="text-base font-medium leading-relaxed">{q.question_text}</p>

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const showCorrect = result && opt.id === result.correct_answer_id;
          const showWrong = result && isSelected && !result.is_correct;

          return (
            <button
              key={opt.id}
              disabled={!!result}
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                showCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' :
                showWrong   ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700' :
                isSelected  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]' :
                              'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <span className="font-medium mr-2">{opt.id}.</span>
              {opt.text}
              {showCorrect && <CheckCircle2 className="h-4 w-4 inline ml-2 text-emerald-600" />}
              {showWrong && <XCircle className="h-4 w-4 inline ml-2 text-red-600" />}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.is_correct ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200'}`}>
          <p className="font-medium mb-1">{result.is_correct ? 'Correct!' : 'Incorrect'}</p>
          <p className="text-[hsl(var(--muted-foreground))]">{result.explanation}</p>
        </div>
      )}

      <div className="flex gap-2">
        {!result ? (
          <Button onClick={submitAnswer} disabled={selected === null || loading} className="flex-1">
            {loading ? 'Checking…' : 'Submit Answer'}
          </Button>
        ) : (
          <Button onClick={next} className="flex-1">
            {qIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Main topic reader ───────────────────────────────────────────────────── */
export default function TopicReader({
  topic, content, flashcards, quizQuestions, relatedImages, relatedVideos,
  progress: initialProgress, adjacentTopics, userId,
}: Props) {
  const [progress, setProgress] = useState<Progress | null>(initialProgress);
  const startTime = useRef(Date.now());

  const markSection = useCallback(async (section: 'insight_read' | 'key_points_read' | 'formulas_read') => {
    if (!userId) return;
    try {
      const res = await fetch('/api/progress/topic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id, [section]: true }),
      });
      const data = await res.json();
      setProgress((p) => ({
        ...(p ?? { status: 'in_progress', completion_percentage: 0, insight_read: false, key_points_read: false, formulas_read: false, quiz_attempted: false, quiz_score: 0, time_spent_seconds: 0 }),
        completion_percentage: data.completion_percentage,
        status: data.status,
        [section]: true,
      }));
    } catch { /* silent */ }
  }, [topic.id, userId]);

  // Save time on unmount
  useEffect(() => {
    return () => {
      const secs = Math.round((Date.now() - startTime.current) / 1000);
      if (userId && secs > 5) {
        navigator.sendBeacon('/api/progress/topic',
          JSON.stringify({ topic_id: topic.id, time_spent_seconds: secs })
        );
      }
    };
  }, [topic.id, userId]);

  const currentIdx = adjacentTopics.findIndex((t) => t.id === topic.id);
  const prevTopic = currentIdx > 0 ? adjacentTopics[currentIdx - 1] : null;
  const nextTopic = currentIdx < adjacentTopics.length - 1 ? adjacentTopics[currentIdx + 1] : null;

  const insight = content?.insight as Insight | null;
  const keyPoints = (content?.key_points ?? []) as KeyPoint[];
  const formulas = (content?.formulas ?? []) as Formula[];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar: chapter topics */}
      <aside className="hidden xl:flex flex-col w-52 shrink-0 border-r border-[hsl(var(--border))] sticky top-0 h-screen overflow-y-auto p-4">
        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Topics</p>
        <nav className="space-y-0.5">
          {adjacentTopics.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/topics/${t.id}`}
              className={`block rounded-md px-2 py-1.5 text-xs leading-snug transition-colors ${
                t.id === topic.id
                  ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-medium'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
              }`}
            >
              {t.order_index + 1}. {t.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 p-6 lg:p-8 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] mb-5">
          <Link href={`/dashboard/books/${topic.textbook_id}`} className="hover:text-[hsl(var(--foreground))]">
            <ArrowLeft className="h-4 w-4 inline mr-1" />{topic.textbook_title}
          </Link>
          <span>/</span>
          <Link href={`/dashboard/chapters/${topic.chapter_id}`} className="hover:text-[hsl(var(--foreground))]">
            Ch. {topic.chapter_number}
          </Link>
          <span>/</span>
          <span className="text-[hsl(var(--foreground))] font-medium truncate">{topic.title}</span>
        </div>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline">{topic.subject}</Badge>
            <Badge variant={topic.difficulty_level === 'hard' ? 'destructive' : topic.difficulty_level === 'easy' ? 'secondary' : 'outline'}>
              {topic.difficulty_level}
            </Badge>
            {topic.is_key_concept && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Key Concept</Badge>}
            {topic.is_formula && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Formula</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{topic.title}</h1>
          {progress && (
            <div className="mt-3 flex items-center gap-3">
              <Progress value={progress.completion_percentage} className="h-1.5 flex-1" />
              <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">{progress.completion_percentage}%</span>
            </div>
          )}
        </div>

        {!content ? (
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-8 text-center">
            <Brain className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
            <p className="font-medium">Content not yet generated</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              An admin can generate AI content for this topic from the admin panel.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="learn">
            <TabsList className="mb-6 h-10">
              <TabsTrigger value="learn" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />Learn
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-1.5">
                <Brain className="h-3.5 w-3.5" />Flashcards
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{flashcards.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />Quiz
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{quizQuestions.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* ── LEARN TAB ── */}
            <TabsContent value="learn" className="space-y-6">
              {/* Insight */}
              {insight && (
                <Card className="border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.04)]">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">{insight.title}</p>
                        <p className="text-sm leading-relaxed">{insight.content}</p>
                        {insight.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {insight.keywords.map((kw: string) => (
                              <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {!progress?.insight_read && (
                      <Button size="sm" variant="ghost" className="mt-3 h-7 text-xs gap-1" onClick={() => markSection('insight_read')}>
                        <CheckCircle2 className="h-3 w-3" />Mark as read
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Key Points */}
              {keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />Key Points
                  </h3>
                  <div className="space-y-2">
                    {keyPoints.map((kp, i) => (
                      <div key={i} className="rounded-lg border border-[hsl(var(--border))] p-3">
                        <p className="text-sm font-medium">{kp.point}</p>
                        {kp.explanation && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{kp.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {!progress?.key_points_read && (
                    <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs gap-1" onClick={() => markSection('key_points_read')}>
                      <CheckCircle2 className="h-3 w-3" />Mark as read
                    </Button>
                  )}
                </div>
              )}

              {/* Formulas */}
              {formulas.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-blue-500" />Formulas
                  </h3>
                  <div className="space-y-3">
                    {formulas.map((f, i) => (
                      <div key={i} className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                        <code className="text-base font-mono font-bold text-blue-800 dark:text-blue-200">{f.latex}</code>
                        <p className="text-sm mt-2">{f.explanation}</p>
                        {f.applications?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {f.applications.map((a: string, j: number) => (
                              <Badge key={j} variant="outline" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!progress?.formulas_read && (
                    <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs gap-1" onClick={() => markSection('formulas_read')}>
                      <CheckCircle2 className="h-3 w-3" />Mark as read
                    </Button>
                  )}
                </div>
              )}

              {/* Related Images */}
              {relatedImages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />Related Images
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {relatedImages.map((img) => (
                      <div key={img.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                        {img.file_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.file_path} alt={img.alt_text ?? img.file_name} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="h-24 bg-[hsl(var(--muted))] flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                          </div>
                        )}
                        {img.caption && <p className="text-xs text-[hsl(var(--muted-foreground))] p-1.5 leading-tight">{img.caption}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Videos */}
              {relatedVideos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Video className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />Related Videos
                  </h3>
                  <div className="space-y-2">
                    {relatedVideos.map((v) => (
                      <a
                        key={v.id}
                        href={v.youtube_url ?? `https://youtube.com/watch?v=${v.youtube_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3 hover:bg-[hsl(var(--accent))] transition-colors"
                      >
                        {v.youtube_id && (
                          <img
                            src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                            alt={v.title}
                            className="w-20 h-14 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-2">{v.title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{v.channel_name}</p>
                        </div>
                        <Play className="h-4 w-4 text-[hsl(var(--primary))] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── FLASHCARDS TAB ── */}
            <TabsContent value="flashcards">
              <FlashcardView cards={flashcards} userId={userId} />
            </TabsContent>

            {/* ── QUIZ TAB ── */}
            <TabsContent value="quiz">
              <QuizView questions={quizQuestions} topicId={topic.id} userId={userId} />
            </TabsContent>
          </Tabs>
        )}

        {/* Prev / Next topic navigation */}
        <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-[hsl(var(--border))]">
          {prevTopic ? (
            <Link href={`/dashboard/topics/${prevTopic.id}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                {prevTopic.title}
              </Button>
            </Link>
          ) : <div />}
          {nextTopic ? (
            <Link href={`/dashboard/topics/${nextTopic.id}`}>
              <Button variant="outline" size="sm" className="gap-1">
                {nextTopic.title}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}
