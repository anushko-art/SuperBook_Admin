'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen, FlaskConical, Search, Save, Eye, RefreshCw,
  CheckCircle2, Clock, AlertCircle, ChevronDown, Plus, ChevronUp, FileText, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';

/* ─── Add Book form ──────────────────────────────────────────────────────── */
const SUBJECTS_LIST = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Zoology', 'Botany', 'Other'];
const GRADES_LIST   = ['9', '10', '11', '12'];
const SOURCES_LIST  = ['NCERT', 'CBSE', 'State Board', 'Other'];

function AddBookForm({ onCreated }: { onCreated: (id: string, title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', grade: '', part: '', publisher: '', slug: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subject) return;
    setSaving(true);
    try {
      const res = await fetch('/api/textbooks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Book "${form.title}" created`);
      onCreated(data.textbook.id, form.title);
      setForm({ title: '', subject: '', grade: '', part: '', publisher: '', slug: '' });
      setOpen(false);
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-[hsl(var(--accent))] transition-colors"
      >
        <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-[hsl(var(--primary))]" />Add New Book</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-[hsl(var(--border))] pt-3">
          <div className="col-span-2 md:col-span-3">
            <label className="text-xs font-medium mb-1 block">Book Title *</label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Physics Part I" className="h-8 text-sm" required />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Subject *</label>
            <Select value={form.subject} onValueChange={v => set('subject', v)} required>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{SUBJECTS_LIST.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Grade / Class</label>
            <Select value={form.grade} onValueChange={v => set('grade', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>{GRADES_LIST.map(g => <SelectItem key={g} value={g} className="text-sm">Class {g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Part</label>
            <Input value={form.part} onChange={e => set('part', e.target.value)} placeholder="e.g. Part I" className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Publisher</label>
            <Select value={form.publisher} onValueChange={v => set('publisher', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Publisher" /></SelectTrigger>
              <SelectContent>{SOURCES_LIST.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Slug (optional)</label>
            <Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated if blank" className="h-8 text-sm" />
          </div>
          <div className="col-span-2 md:col-span-3 flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !form.title || !form.subject} className="h-8">
              {saving ? 'Creating…' : 'Create Book'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Add Chapter form ───────────────────────────────────────────────────── */
interface BookOption { id: string; title: string; subject: string; grade: string }

function AddChapterForm({ books, onCreated }: { books: BookOption[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ textbook_id: '', title: '', chapter_number: '', content_markdown: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.textbook_id || !form.title || !form.chapter_number) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textbook_id: form.textbook_id,
          title: form.title,
          chapter_number: Number(form.chapter_number),
          content_markdown: form.content_markdown || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Chapter "${form.title}" created`);
      onCreated();
      setForm({ textbook_id: '', title: '', chapter_number: '', content_markdown: '' });
      setOpen(false);
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-[hsl(var(--accent))] transition-colors"
      >
        <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-[hsl(var(--primary))]" />Add Chapter to Book</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--border))] pt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs font-medium mb-1 block">Book *</label>
              <Select value={form.textbook_id} onValueChange={v => set('textbook_id', v)} required>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select book…" /></SelectTrigger>
                <SelectContent>
                  {books.map(b => (
                    <SelectItem key={b.id} value={b.id} className="text-sm">
                      {b.subject} {b.grade} — {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1 block">Chapter Title *</label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Introduction to Motion" className="h-8 text-sm" required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Chapter # *</label>
              <Input type="number" min={1} max={99} value={form.chapter_number} onChange={e => set('chapter_number', e.target.value)} placeholder="1" className="h-8 text-sm" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Markdown Content (optional)</label>
            <Textarea
              value={form.content_markdown}
              onChange={e => set('content_markdown', e.target.value)}
              placeholder="Paste chapter markdown here to populate content immediately…"
              className="min-h-[120px] text-xs font-mono resize-y"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !form.textbook_id || !form.title || !form.chapter_number} className="h-8">
              {saving ? 'Creating…' : 'Create Chapter'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MetaJson {
  doc_type?: string;
  subject?: string;
  class_level?: string;
  source?: string;
  chapter_no?: number | null;
  chapter_name?: string;
}

interface Upload {
  id: string;
  original_filename: string;
  file_path: string;
  file_size_bytes: number | null;
  status: string;
  created_at: string;
  meta_json: MetaJson | null;
  linked_chapter_id: string | null;
  linked_textbook_id: string | null;
  chapter_title: string | null;
  chapter_number: number | null;
  textbook_title: string | null;
  subject: string | null;
  grade: string | null;
  part: string | null;
}

/* ─── Status config ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  uploaded:  { label: 'Uploaded',  icon: Clock,         color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
  ingested:  { label: 'Ingested',  icon: RefreshCw,     color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  review:    { label: 'For Review',icon: AlertCircle,   color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
  approved:  { label: 'Approved',  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  failed:    { label: 'Failed',    icon: AlertCircle,   color: 'text-red-500',     bg: 'bg-red-100 dark:bg-red-900/30' },
} as const;

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Zoology', 'Botany', 'Other'];
const CLASS_LEVELS = ['XI', 'XII', 'Compiled', 'Other'];
const DOC_TYPES = ['Textbook', 'Question Bank', 'Notes', 'Other'];
const SOURCES = ['NCERT', 'CBSE', 'State Board'];

/* ─── Editable row state ─────────────────────────────────────────────────── */
type RowEdit = Partial<MetaJson & { status: string; source_custom: string }>;

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return <span className="text-xs text-[hsl(var(--muted-foreground))]">{status}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

interface ChapterRow {
  id: string; title: string; chapter_number: number; is_published: boolean;
  content_length: number; estimated_read_time_minutes: number;
  textbook_title: string; subject: string; grade: string; part: string;
  topic_count: number; topics_with_content: number;
  updated_at: string;
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ContentManagementPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [books, setBooks]     = useState<BookOption[]>([]);
  const [allChapters, setAllChapters] = useState<ChapterRow[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Run migration on mount */
  useEffect(() => {
    fetch('/api/admin/migrate', { method: 'POST' }).catch(() => {});
  }, []);

  const fetchBooks = useCallback(async () => {
    const d = await fetch('/api/textbooks').then(r => r.json());
    setBooks((d.textbooks ?? []).map((t: { id: string; title: string; subject: string; grade: string }) => ({
      id: t.id, title: t.title, subject: t.subject, grade: t.grade,
    })));
  }, []);
  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const fetchUploads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/uploads');
      const data = await res.json();
      setUploads(data.uploads ?? []);
      // Pre-populate edits from existing meta_json
      const initial: Record<string, RowEdit> = {};
      (data.uploads ?? []).forEach((u: Upload) => {
        initial[u.id] = {
          doc_type: u.meta_json?.doc_type ?? 'Textbook',
          subject: u.meta_json?.subject ?? u.subject ?? '',
          class_level: u.meta_json?.class_level ?? (u.grade === '11' ? 'XI' : u.grade === '12' ? 'XII' : ''),
          source: u.meta_json?.source ?? '',
          chapter_no: u.meta_json?.chapter_no ?? u.chapter_number ?? undefined,
          chapter_name: u.meta_json?.chapter_name ?? u.chapter_title ?? '',
          source_custom: '',
          status: u.status,
        };
      });
      setEdits(initial);
    } catch {
      toast.error('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const fetchAllChapters = useCallback(async () => {
    setLoadingChapters(true);
    try {
      const res = await fetch('/api/admin/chapters-overview');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllChapters(data.chapters ?? []);
    } catch {
      /* fallback: use /api/chapters without textbook_id filter */
      const res = await fetch('/api/chapters').catch(() => null);
      const data = res ? await res.json() : {};
      setAllChapters(data.chapters ?? []);
    } finally { setLoadingChapters(false); }
  }, []);
  useEffect(() => { fetchAllChapters(); }, [fetchAllChapters]);

  const updateEdit = (id: string, field: keyof RowEdit, value: string | number | null) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveRow = async (id: string, mapChapter = false) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    const edit = edits[id] ?? {};
    const source = edit.source === 'Other' ? (edit.source_custom || 'Other') : edit.source;
    try {
      const res = await fetch(`/api/admin/uploads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: edit.doc_type,
          subject: edit.subject,
          class_level: edit.class_level,
          source,
          chapter_no: edit.chapter_no ? Number(edit.chapter_no) : null,
          chapter_name: edit.chapter_name,
          status: edit.status,
          map_chapter: mapChapter,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(mapChapter ? 'Chapter mapped successfully!' : 'Metadata saved');
      await fetchUploads();
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = uploads.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.original_filename.toLowerCase().includes(q) ||
      (u.chapter_title ?? '').toLowerCase().includes(q) ||
      (edits[u.id]?.subject ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Content Management</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Add books &amp; chapters, map uploaded folders to textbooks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchUploads(); fetchBooks(); }} className="h-8 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Search folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="chapters">
        <TabsList>
          <TabsTrigger value="chapters" className="text-xs gap-1"><FileText className="h-3 w-3" />Chapters</TabsTrigger>
          <TabsTrigger value="add" className="text-xs gap-1"><Plus className="h-3 w-3" />Add Books &amp; Chapters</TabsTrigger>
        </TabsList>

        {/* ── Add Books & Chapters tab ── */}
        <TabsContent value="add" className="mt-4 space-y-4">
          <AddBookForm
            onCreated={(id, title) => {
              setBooks(prev => [...prev, { id, title, subject: '', grade: '' }]);
              fetchBooks();
            }}
          />
          <AddChapterForm books={books} onCreated={fetchBooks} />
        </TabsContent>

        {/* ── Chapters tab ── */}
        <TabsContent value="chapters" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search chapters…"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={fetchAllChapters}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>

          {loadingChapters ? (
            <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">Loading chapters…</div>
          ) : allChapters.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="h-10 w-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">No chapters in database</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Use <strong>Add Books &amp; Chapters</strong> tab to create chapters.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <table className="w-full striped-table text-sm">
                <thead>
                  <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                    {['Ch.', 'Title', 'Textbook', 'Subject', 'Grade', 'Topics', 'Content', 'Status', 'Updated', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allChapters
                    .filter(c => !chapterSearch || c.title.toLowerCase().includes(chapterSearch.toLowerCase()) || c.textbook_title?.toLowerCase().includes(chapterSearch.toLowerCase()))
                    .map(ch => (
                    <tr key={ch.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent)/0.4)] transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="h-6 w-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-mono">
                          {ch.chapter_number}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-sm font-medium truncate">{ch.title}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[hsl(var(--muted-foreground))] max-w-[160px]">
                        <span className="truncate block">{ch.textbook_title}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{ch.subject}</td>
                      <td className="px-3 py-2.5 text-xs">{ch.grade}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Hash className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                          {ch.topic_count ?? 0}
                          {(ch.topics_with_content ?? 0) > 0 && (
                            <span className="text-emerald-600 text-[10px]">({ch.topics_with_content} md)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {ch.content_length > 0 ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />{(ch.content_length / 1000).toFixed(1)}k
                          </span>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                            <Clock className="h-3 w-3" />Empty
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={ch.is_published ? 'default' : 'secondary'} className="text-[10px] h-4">
                          {ch.is_published ? 'Live' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {formatDate(ch.updated_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/chapters/${ch.id}`}>
                          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1">
                            <Eye className="h-2.5 w-2.5" />View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
