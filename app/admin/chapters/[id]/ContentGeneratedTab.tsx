'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, Pencil, Check, X, Loader2, BookOpen,
  HelpCircle, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

interface Topic { id: string; title: string; order_index: number; flashcard_count: number; quiz_count: number }

interface Flashcard {
  id: string; question: string; answer: string;
  category: string | null; difficulty_level: string | null; order_index: number;
}

interface QuizOption { id: number; text: string; is_correct: boolean }
interface QuizQuestion {
  id: string; question_text: string; question_type: string;
  options: QuizOption[]; correct_answer_id: number | null;
  explanation: string | null; difficulty_level: string | null; order_index: number;
}

const DIFF_OPTIONS = ['easy', 'medium', 'hard'];

/* ─── Flashcard card ─────────────────────────────────────────────────────── */
function FlashcardCard({ fc, onUpdated, onDeleted }: {
  fc: Flashcard; onUpdated: (updated: Flashcard) => void; onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(fc.question);
  const [answer, setAnswer] = useState(fc.answer);
  const [category, setCategory] = useState(fc.category ?? '');
  const [difficulty, setDifficulty] = useState(fc.difficulty_level ?? 'medium');
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/flashcards/${fc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category: category || null, difficulty_level: difficulty }),
      });
      if (!res.ok) throw new Error();
      toast.success('Flashcard updated');
      onUpdated({ ...fc, question, answer, category: category || null, difficulty_level: difficulty });
      setEditing(false);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this flashcard?')) return;
    const res = await fetch(`/api/admin/flashcards/${fc.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); onDeleted(); }
    else toast.error('Failed to delete');
  };

  if (editing) return (
    <div className="border border-[hsl(var(--primary)/0.3)] rounded-xl p-4 space-y-3 bg-[hsl(var(--primary)/0.02)]">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Question</label>
        <Textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3} className="text-sm resize-none" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Answer</label>
        <Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={4} className="text-sm resize-none" />
      </div>
      <div className="flex gap-2">
        <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" className="h-8 text-xs flex-1" />
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{DIFF_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {fc.difficulty_level && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {fc.difficulty_level}
                </Badge>
              )}
              {fc.category && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{fc.category}</span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug">{fc.question}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={handleDelete} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--accent))] transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowAnswer(v => !v)}
          className="mt-2 flex items-center gap-1 text-[11px] text-[hsl(var(--primary))] hover:underline"
        >
          {showAnswer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showAnswer ? 'Hide answer' : 'Show answer'}
        </button>
        {showAnswer && (
          <div className="mt-2 bg-[hsl(var(--muted)/0.5)] rounded-lg px-3 py-2">
            <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap leading-relaxed">{fc.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Add Flashcard form ─────────────────────────────────────────────────── */
function AddFlashcardForm({ topicId, onAdded }: { topicId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) { toast.error('Question and answer required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, question: question.trim(), answer: answer.trim(), category: category || null, difficulty_level: difficulty }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Flashcard added');
      setQuestion(''); setAnswer(''); setCategory(''); setDifficulty('medium'); setOpen(false);
      onAdded();
    } catch (err) { toast.error(String(err)); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setOpen(true)}>
      <Plus className="h-3 w-3" />Add Flashcard
    </Button>
  );

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold">New Flashcard</p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Question</label>
        <Textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} className="text-sm resize-none" autoFocus />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Answer</label>
        <Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} className="text-sm resize-none" />
      </div>
      <div className="flex gap-2">
        <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (optional)" className="h-8 text-xs flex-1" />
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{DIFF_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Add
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ─── Quiz question card ─────────────────────────────────────────────────── */
function QuizCard({ q, onUpdated, onDeleted }: {
  q: QuizQuestion; onUpdated: (u: QuizQuestion) => void; onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [questionText, setQuestionText] = useState(q.question_text);
  const [explanation, setExplanation] = useState(q.explanation ?? '');
  const [difficulty, setDifficulty] = useState(q.difficulty_level ?? 'medium');
  const [options, setOptions] = useState<QuizOption[]>(q.options);
  const [correctId, setCorrectId] = useState(q.correct_answer_id ?? 1);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedOptions = options.map(o => ({ ...o, is_correct: o.id === correctId }));
      const res = await fetch(`/api/admin/quiz-questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText, options: updatedOptions,
          correct_answer_id: correctId, explanation: explanation || null, difficulty_level: difficulty,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Question updated');
      onUpdated({ ...q, question_text: questionText, options: updatedOptions, correct_answer_id: correctId, explanation: explanation || null, difficulty_level: difficulty });
      setEditing(false);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/admin/quiz-questions/${q.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); onDeleted(); }
    else toast.error('Failed to delete');
  };

  if (editing) return (
    <div className="border border-[hsl(var(--primary)/0.3)] rounded-xl p-4 space-y-3 bg-[hsl(var(--primary)/0.02)]">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Question</label>
        <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={2} className="text-sm resize-none" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Options</label>
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              type="radio" name={`correct-${q.id}`} checked={correctId === opt.id}
              onChange={() => setCorrectId(opt.id)}
              className="shrink-0"
            />
            <Input
              value={opt.text}
              onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
              className="h-7 text-xs flex-1"
            />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Explanation</label>
        <Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} className="text-xs resize-none" />
      </div>
      <Select value={difficulty} onValueChange={setDifficulty}>
        <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
        <SelectContent>{DIFF_OPTIONS.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">#{q.order_index + 1}</span>
              {q.difficulty_level && <Badge variant="outline" className="text-[9px] h-4 px-1">{q.difficulty_level}</Badge>}
            </div>
            <p className="text-sm font-medium leading-snug">{q.question_text}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={handleDelete} className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--accent))] transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 flex items-center gap-1 text-[11px] text-[hsl(var(--primary))] hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide options' : 'Show options'}
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {q.options.map(opt => (
              <div key={opt.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${opt.id === q.correct_answer_id ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-[hsl(var(--muted)/0.4)]'}`}>
                <span className={`text-[10px] font-bold w-5 shrink-0 ${opt.id === q.correct_answer_id ? 'text-emerald-600' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {String.fromCharCode(64 + opt.id)}
                </span>
                <span className="flex-1 text-xs">{opt.text}</span>
                {opt.id === q.correct_answer_id && (
                  <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                )}
              </div>
            ))}
            {q.explanation && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">Explanation</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{q.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ContentGeneratedTab ────────────────────────────────────────────── */
export function ContentGeneratedTab({ topics }: { topics: Topic[] }) {
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? '');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContent = useCallback(async () => {
    if (!selectedTopicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/topic-content?topic_id=${selectedTopicId}`);
      const data = await res.json();
      setFlashcards(data.flashcards ?? []);
      setQuizQuestions(data.quiz_questions ?? []);
    } finally { setLoading(false); }
  }, [selectedTopicId]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  if (topics.length === 0) return (
    <div className="rounded-xl border border-[hsl(var(--border))] p-12 text-center">
      <BookOpen className="w-10 h-10 mx-auto opacity-20 mb-3" />
      <p className="text-sm text-[hsl(var(--muted-foreground))]">No topics yet — create topics first.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Topic selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] shrink-0">Topic:</label>
        <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
          <SelectTrigger className="h-9 text-sm max-w-md flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {topics.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-sm">
                {t.order_index + 1}. {t.title}
                {(t.flashcard_count > 0 || t.quiz_count > 0) && (
                  <span className="ml-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {t.flashcard_count > 0 && `${t.flashcard_count} FC`}
                    {t.flashcard_count > 0 && t.quiz_count > 0 && ' · '}
                    {t.quiz_count > 0 && `${t.quiz_count} Q`}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />}
      </div>

      {selectedTopic && !loading && (
        <div className="grid grid-cols-2 gap-4">

          {/* ── Flashcards ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
                Flashcards
                <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">({flashcards.length})</span>
              </h3>
            </div>

            {flashcards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">No flashcards yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {flashcards.map(fc => (
                  <FlashcardCard
                    key={fc.id}
                    fc={fc}
                    onUpdated={(u) => setFlashcards(prev => prev.map(f => f.id === u.id ? u : f))}
                    onDeleted={() => setFlashcards(prev => prev.filter(f => f.id !== fc.id))}
                  />
                ))}
              </div>
            )}
            <AddFlashcardForm topicId={selectedTopicId} onAdded={loadContent} />
          </div>

          {/* ── Quiz Questions ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-500" />
                Quiz Questions
                <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">({quizQuestions.length})</span>
              </h3>
              {quizQuestions.length === 0 && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Upload JSON via Textbooks → Quiz</span>
              )}
            </div>

            {quizQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                <AlertCircle className="h-6 w-6 mx-auto opacity-20 mb-2" />
                <p className="text-xs text-[hsl(var(--muted-foreground))]">No quiz questions yet</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                  Upload from Textbooks page → + Quiz button
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {quizQuestions.map(q => (
                  <QuizCard
                    key={q.id}
                    q={q}
                    onUpdated={(u) => setQuizQuestions(prev => prev.map(x => x.id === u.id ? u : x))}
                    onDeleted={() => setQuizQuestions(prev => prev.filter(x => x.id !== q.id))}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
