'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, RefreshCw, CheckCircle2, Clock, AlertCircle, Zap, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Textbook {
  id: string;
  title: string;
  subject: string;
  grade: string;
  part: string;
}
interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  textbook_id: string;
}
interface Topic {
  id: string;
  title: string;
  order_index: number;
  difficulty_level: string;
  is_key_concept: boolean;
  content_id: string | null;
  generated_at: string | null;
  generation_model: string | null;
  flashcard_count: number;
  quiz_count: number;
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ topic }: { topic: Topic }) {
  if (topic.content_id) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />Generated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      <Clock className="h-3 w-3" />Pending
    </span>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function GeneratePage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [batchRunning, setBatchRunning] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Load textbooks on mount
  useEffect(() => {
    fetch('/api/textbooks')
      .then((r) => r.json())
      .then((d) => setTextbooks(d.textbooks ?? []))
      .catch(() => toast.error('Failed to load textbooks'));
  }, []);

  // Load chapters when textbook changes
  useEffect(() => {
    if (!selectedTextbook) { setChapters([]); setSelectedChapter(''); return; }
    fetch(`/api/chapters?textbook_id=${selectedTextbook}`)
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []))
      .catch(() => toast.error('Failed to load chapters'));
  }, [selectedTextbook]);

  // Load topics when chapter changes
  const fetchTopics = useCallback(async () => {
    if (!selectedChapter) { setTopics([]); return; }
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/topics?chapter_id=${selectedChapter}`);
      const data = await res.json();
      setTopics(data.topics ?? []);
    } catch {
      toast.error('Failed to load topics');
    } finally {
      setLoadingTopics(false);
    }
  }, [selectedChapter]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // Extract topics from chapter markdown
  const extractTopics = async () => {
    if (!selectedChapter) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/admin/topics/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: selectedChapter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Extracted ${data.total_created} topics (${data.total_skipped} skipped)`);
      await fetchTopics();
    } catch (err) {
      toast.error('Extraction failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExtracting(false);
    }
  };

  // Generate for a single topic
  const generateTopic = async (topicId: string) => {
    setGenerating((prev) => ({ ...prev, [topicId]: true }));
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Generated: ${data.counts.flashcards} flashcards, ${data.counts.quiz_questions} questions`);
      await fetchTopics();
    } catch (err) {
      toast.error('Generation failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  // Batch generate all topics in chapter
  const generateAll = async () => {
    if (!selectedChapter) return;
    setBatchRunning(true);
    try {
      const res = await fetch('/api/admin/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: selectedChapter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Batch complete: ${data.generated}/${data.total} generated, ${data.failed} failed`);
      await fetchTopics();
    } catch (err) {
      toast.error('Batch failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBatchRunning(false);
    }
  };

  const pending = topics.filter((t) => !t.content_id).length;
  const generated = topics.filter((t) => t.content_id).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
            AI Content Generation
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Phase 2 — Generate insights, flashcards &amp; quiz questions per topic using Gemini AI
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedTextbook} onValueChange={(v) => { setSelectedTextbook(v); setSelectedChapter(''); }}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder="Select textbook…" />
          </SelectTrigger>
          <SelectContent>
            {textbooks.map((tb) => (
              <SelectItem key={tb.id} value={tb.id} className="text-sm">
                {tb.subject} {tb.grade} — {tb.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedTextbook}>
          <SelectTrigger className="h-9 w-64 text-sm">
            <SelectValue placeholder="Select chapter…" />
          </SelectTrigger>
          <SelectContent>
            {chapters.map((ch) => (
              <SelectItem key={ch.id} value={ch.id} className="text-sm">
                Ch. {ch.chapter_number} — {ch.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedChapter && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={extractTopics}
              disabled={extracting}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {extracting ? 'Extracting…' : 'Extract Topics'}
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={generateAll}
              disabled={batchRunning || topics.length === 0}
            >
              <Zap className="h-3.5 w-3.5" />
              {batchRunning ? 'Generating…' : `Generate All (${pending} pending)`}
            </Button>

            <Button variant="ghost" size="sm" className="h-9" onClick={fetchTopics}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Stats */}
      {topics.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Total: <strong>{topics.length}</strong></span>
          <span className="text-emerald-600">Generated: <strong>{generated}</strong></span>
          <span className="text-amber-600">Pending: <strong>{pending}</strong></span>
        </div>
      )}

      {/* Topics table */}
      {!selectedChapter ? (
        <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Select a textbook and chapter to begin
        </div>
      ) : loadingTopics ? (
        <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">Loading topics…</div>
      ) : topics.length === 0 ? (
        <div className="py-20 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
          <p className="text-sm font-medium">No topics found</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Click <strong>Extract Topics</strong> to parse this chapter's headings into topics
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                {['#', 'Topic', 'Difficulty', 'Status', 'Flashcards', 'Quiz Qs', 'Generated At', 'Action'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => {
                const isGen = generating[topic.id];
                return (
                  <tr key={topic.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent)/0.4)] transition-colors">
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--muted-foreground))]">{topic.order_index + 1}</td>
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <p className="font-medium leading-snug">{topic.title}</p>
                      {topic.is_key_concept && (
                        <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1.5">Key Concept</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${
                        topic.difficulty_level === 'hard' ? 'text-red-600' :
                        topic.difficulty_level === 'easy' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {topic.difficulty_level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge topic={topic} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {topic.content_id ? (
                        <Badge variant="secondary" className="text-xs">{topic.flashcard_count}</Badge>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {topic.content_id ? (
                        <Badge variant="secondary" className="text-xs">{topic.quiz_count}</Badge>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {topic.generated_at ? formatDate(topic.generated_at) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant={topic.content_id ? 'outline' : 'default'}
                        className="h-7 text-xs px-2.5 gap-1"
                        disabled={isGen || batchRunning}
                        onClick={() => generateTopic(topic.id)}
                      >
                        <Sparkles className="h-3 w-3" />
                        {isGen ? 'Generating…' : topic.content_id ? 'Regenerate' : 'Generate'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
