'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, BookOpen, ChevronDown, ChevronUp,
  Loader2, RotateCcw, FlaskConical, Zap, Brain,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { LatexBlock } from '@/components/latex-block';
import { ImageGallery } from '@/components/image-gallery';
import { SourceCard } from '@/components/source-card';
import { MisconceptionAlert } from '@/components/misconception-alert';
import type { RankedImage, OrchestratorMetrics } from '@/lib/multiagent-orchestrator';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface SourceData {
  chapter_num: number;
  chapter_title: string;
  section: string;
  section_title: string;
  part: string;
  image_paths: string[];
  similarity: number;
}

interface Equation {
  latex: string;
  context: string;
}

type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  narrative?: string;
  images?: RankedImage[];
  equations?: Equation[];
  sources?: SourceData[];
  misconceptions?: string[];
  metrics?: OrchestratorMetrics;
  isLoading?: boolean;
}

interface Chunk {
  id: string;
  part: string;
  chapter_num: number;
  chapter_title: string;
  section: string;
  section_title: string;
  content: string;
  has_images: boolean;
  has_equations: boolean;
  word_count: number;
  image_paths: string[] | null;
  similarity: number;
}

/* ─── Suggestions ────────────────────────────────────────────────────────── */

const SUGGESTIONS = [
  "What is Newton's second law of motion?",
  "Explain Bernoulli's principle",
  "What is simple harmonic motion?",
  "Explain the law of conservation of energy",
  "What are Kepler's laws of planetary motion?",
  "Explain the difference between stress and strain",
];

/* ─── Reasoning step indicator ──────────────────────────────────────────── */

const REASONING_STEPS = [
  { icon: Brain, label: 'Classifying intent…' },
  { icon: BookOpen, label: 'Retrieving passages…' },
  { icon: Sparkles, label: 'Generating answer…' },
];

function ReasoningStep() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, REASONING_STEPS.length - 1));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const { icon: Icon, label } = REASONING_STEPS[step];

  return (
    <div className="rounded-2xl rounded-tl-sm bg-[hsl(var(--muted))] px-4 py-3">
      <div className="space-y-1.5">
        {REASONING_STEPS.map(({ icon: StepIcon, label: stepLabel }, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-opacity ${
              i <= step ? 'opacity-100' : 'opacity-25'
            }`}
          >
            <StepIcon className={`h-3 w-3 shrink-0 ${i === step ? 'animate-pulse text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
            <span className={i === step ? 'font-medium text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}>
              {stepLabel}
            </span>
            {i < step && <span className="text-green-500 ml-auto">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Metrics panel ──────────────────────────────────────────────────────── */

function MetricsPanel({ metrics }: { metrics: OrchestratorMetrics }) {
  return (
    <div className="flex items-center gap-1.5 pt-2.5 border-t border-[hsl(var(--border))] flex-wrap">
      <Zap className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
        {metrics.totalMs}ms total
      </span>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-60">·</span>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-60">
        {metrics.textRetrieverMs}ms retrieval
      </span>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-60">·</span>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-60">
        {metrics.answerGenerationMs}ms LLM
      </span>
    </div>
  );
}

/* ─── Equations panel ────────────────────────────────────────────────────── */

function EquationsPanel({ equations }: { equations: Equation[] }) {
  const [open, setOpen] = useState(false);
  if (!equations.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <FlaskConical className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex-1">
          Key Equations ({equations.length})
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-4 border-t border-amber-200 dark:border-amber-800">
          {equations.map((eq, i) => (
            <div key={i} className="pt-3">
              <LatexBlock latex={eq.latex} />
              {eq.context && (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
                  {eq.context.slice(0, 200)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Assistant bubble ───────────────────────────────────────────────────── */

function AssistantBubble({ msg }: { msg: Message }) {
  if (msg.isLoading) return <ReasoningStep />;

  return (
    <div className="space-y-0">
      {/* Narrative — MarkdownRenderer handles inline LaTeX via KaTeX */}
      <div className="rounded-2xl rounded-tl-sm bg-[hsl(var(--muted))] px-4 py-3 text-sm">
        <MarkdownRenderer content={msg.narrative ?? msg.content} />
      </div>

      {/* Image gallery */}
      {msg.images && msg.images.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
            Figures
          </p>
          <ImageGallery images={msg.images} />
        </div>
      )}

      {/* Equations */}
      {msg.equations && msg.equations.length > 0 && (
        <EquationsPanel equations={msg.equations} />
      )}

      {/* Misconceptions */}
      {msg.misconceptions && msg.misconceptions.length > 0 && (
        <div className="mt-3 space-y-2">
          {msg.misconceptions.map((m, i) => (
            <MisconceptionAlert key={i} misconception={m} />
          ))}
        </div>
      )}

      {/* Sources */}
      {msg.sources && msg.sources.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Sources:</p>
          {msg.sources.slice(0, 3).map((s, i) => (
            <SourceCard key={i} source={s} />
          ))}
        </div>
      )}

      {/* Metrics */}
      {msg.metrics && <MetricsPanel metrics={msg.metrics} />}
    </div>
  );
}

/* ─── Explore chunk panel ────────────────────────────────────────────────── */

function ChunkPanel({ chunks }: { chunks: Chunk[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!chunks.length) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
        Relevant Passages ({chunks.length})
      </p>
      <div className="space-y-2">
        {chunks.map((c) => (
          <div key={c.id} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">
                    Ch.{c.chapter_num} §{c.section} — {c.section_title}
                  </span>
                  {c.has_equations && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">Eq</Badge>
                  )}
                  {c.has_images && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">Img</Badge>
                  )}
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {c.chapter_title} · {c.word_count}w · {Math.round(c.similarity * 100)}% match
                </p>
              </div>
              {expanded === c.id
                ? <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                : <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />}
            </button>

            {expanded === c.id && (
              <div className="px-3 pb-3 border-t border-[hsl(var(--border))]">
                {c.image_paths && c.image_paths.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {c.image_paths.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="max-h-48 rounded-lg object-contain border border-[hsl(var(--border))] bg-white"
                      />
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <MarkdownRenderer content={c.content.slice(0, 1500)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Level selector ─────────────────────────────────────────────────────── */

const LEVELS: StudentLevel[] = ['beginner', 'intermediate', 'advanced'];

function LevelSelector({
  value,
  onChange,
}: {
  value: StudentLevel;
  onChange: (l: StudentLevel) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] p-0.5">
      {LEVELS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
            value === l
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function SuperRAGPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchChunks, setSearchChunks] = useState<Chunk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'chat' | 'search'>('chat');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('intermediate');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildHistory(msgs: Message[]) {
    return msgs
      .filter((m) => !m.isLoading)
      .map((m) => ({ role: m.role, content: m.role === 'user' ? m.content : (m.narrative ?? m.content) }));
  }

  async function handleChat(question: string) {
    if (!question.trim() || isLoading) return;
    setInput('');
    setIsLoading(true);

    const userMsg: Message = { role: 'user', content: question };
    const loadingMsg: Message = { role: 'assistant', content: '', isLoading: true };
    setMessages((m) => [...m, userMsg, loadingMsg]);

    try {
      const res = await fetch('/api/rag/super-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationHistory: buildHistory([...messages, userMsg]),
          studentLevel,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: data.error ?? 'Error.' }]);
        return;
      }

      setMessages((m) => [
        ...m.slice(0, -1),
        {
          role: 'assistant',
          content: data.narrative ?? '',
          narrative: data.narrative,
          images: data.images ?? [],
          equations: data.equations ?? [],
          sources: data.sources ?? [],
          misconceptions: data.misconceptions ?? [],
          metrics: data.metrics,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: 'assistant', content: 'Connection error. Is Ollama running?' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(q: string) {
    if (!q.trim() || isLoading) return;
    setInput('');
    setIsLoading(true);
    setSearchQuery(q);
    try {
      const res = await fetch(`/api/rag/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setSearchChunks(data.chunks ?? []);
    } catch {
      setSearchChunks([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'chat') handleChat(input);
    else handleSearch(input);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] px-6 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">SuperRAG</h1>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                5-agent pipeline · NCERT Physics 11 · 128 passages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Level selector */}
            {mode === 'chat' && (
              <LevelSelector value={studentLevel} onChange={setStudentLevel} />
            )}

            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] p-0.5">
              <button
                onClick={() => setMode('chat')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === 'chat'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                Ask AI
              </button>
              <button
                onClick={() => setMode('search')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === 'search'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat mode */}
      {mode === 'chat' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {messages.length === 0 && (
              <div className="py-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-[hsl(var(--primary))]" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Ask anything about Physics</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
                  NCERT Class 11 · Parts 1 &amp; 2
                </p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-6">
                  LaTeX equations · Textbook figures · Misconception alerts · Conversation memory
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleChat(s)}
                      className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm text-left hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--primary)/0.3)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]" />
                  </div>
                )}

                {msg.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <AssistantBubble msg={msg} />
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">S</span>
                  </div>
                )}
              </div>
            ))}

            {messages.filter((m) => !m.isLoading).length > 0 && !isLoading && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"
                  onClick={() => setMessages([])}
                >
                  <RotateCcw className="h-3 w-3" /> New conversation
                </Button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Explore mode */}
      {mode === 'search' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {!searchQuery && (
              <div className="py-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))] opacity-40" />
                <h2 className="text-base font-semibold mb-1">Explore the Textbook</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                  Semantic search across 128 passages
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSearch(s)}
                      className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm text-left hover:bg-[hsl(var(--accent))] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 py-8 justify-center text-sm text-[hsl(var(--muted-foreground))]">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            )}

            {!isLoading && searchQuery && (
              <>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {searchChunks.length} results for{' '}
                  <strong>&ldquo;{searchQuery}&rdquo;</strong>
                </p>
                <ChunkPanel chunks={searchChunks} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-[hsl(var(--border))] px-4 py-3 shrink-0 bg-[hsl(var(--background))]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'chat' ? 'Ask a question about Physics…' : 'Search passages…'}
            className="flex-1 h-11"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={isLoading || !input.trim()}
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))] mt-2">
          5-agent pipeline · Gemini 2.0 Flash · NCERT Physics · May contain errors
        </p>
      </div>
    </div>
  );
}
