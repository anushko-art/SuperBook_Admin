'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Upload, Plus, FileText, ImageIcon, CheckCircle2, Clock,
  Loader2, RefreshCw, X, HelpCircle, Trash2, ChevronUp, ChevronDown,
  Pencil, Check, ChevronRight, BookMarked, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ReferenceBooksTab from './_components/ReferenceBooksTab';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Textbook { id: string; title: string; subject: string; grade: string; part: string; total_chapters: number }
interface Chapter  { id: string; title: string; chapter_number: number; content_length: number; is_published: boolean }
interface Topic    { id: string; title: string; order_index: number; content_id: string | null; source_markdown: string | null; flashcard_count: number; quiz_count: number }
interface Subtopic { id: string; topic_id: string; title: string; source_markdown: string | null; order_index: number }
interface IndexedImage { id: string; file_name: string; file_path: string }
interface PreviewItem { type: 'topic' | 'subtopic'; id: string; title: string; source_markdown: string | null }

/* ─── Helper ─────────────────────────────────────────────────────────────── */
function extractImageRefs(markdown: string): string[] {
  const matches = markdown.match(/img_[a-f0-9]+\.(jpe?g|png|gif|webp)/gi) ?? [];
  return [...new Set(matches)];
}

/* ─── Create Textbook dialog ─────────────────────────────────────────────── */
const GRADE_OPTIONS   = [{ label: 'XI',    value: '11' }, { label: 'XII',    value: '12' }, { label: 'Merged', value: '11-12' }];
const SUBJECT_OPTIONS = [{ label: 'Phy',   value: 'Physics' }, { label: 'Chem',   value: 'Chemistry' }, { label: 'Bio',    value: 'Biology' }, { label: 'Math',   value: 'Mathematics' }];

function CreateTextbookDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title,     setTitle]     = useState('');
  const [grade,     setGrade]     = useState('');
  const [subject,   setSubject]   = useState('');
  const [part,      setPart]      = useState('');
  const [publisher, setPublisher] = useState('NCERT');
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !subject || !grade) { toast.error('Title, subject and grade are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/textbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), subject, grade, part: part || null, publisher: publisher || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Textbook created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
            New Text Book
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Book name <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Physics Part I" className="h-8 text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Grade <span className="text-[hsl(var(--destructive))]">*</span></label>
            <div className="flex gap-1.5 flex-wrap">
              {GRADE_OPTIONS.map(g => (
                <button key={g.value} onClick={() => setGrade(g.value)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                    grade === g.value
                      ? 'bg-amber-400 border-amber-400 text-amber-950'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Subject <span className="text-[hsl(var(--destructive))]">*</span></label>
            <div className="flex gap-1.5 flex-wrap">
              {SUBJECT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSubject(s.value)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                    subject === s.value
                      ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Part</label>
              <Input value={part} onChange={e => setPart(e.target.value)} placeholder="e.g. Part I" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Publisher</label>
              <Input value={publisher} onChange={e => setPublisher(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || !subject || !grade}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Chapter dialog ──────────────────────────────────────────────── */
function CreateChapterDialog({
  textbookId, nextNumber, onClose, onCreated,
}: { textbookId: string; nextNumber: number; onClose: () => void; onCreated: () => void }) {
  const [num,   setNum]   = useState(String(nextNumber));
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const n = parseInt(num);
    if (!title.trim() || isNaN(n)) { toast.error('Chapter number and title are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textbook_id: textbookId, title: title.trim(), chapter_number: n }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Chapter created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
            Add Chapter
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-3">
          <div className="space-y-1.5 w-20 shrink-0">
            <label className="text-xs font-medium"># <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={num} onChange={e => setNum(e.target.value)} type="number" min={1} className="h-8 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <label className="text-xs font-medium">Chapter name <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Units and Measurements" className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || !num}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Chapter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Topic dialog ────────────────────────────────────────────────── */
function CreateTopicDialog({
  chapterId, nextIndex, onClose, onCreated,
}: { chapterId: string; nextIndex: number; onClose: () => void; onCreated: () => void }) {
  const [title,    setTitle]    = useState('');
  const [markdown, setMarkdown] = useState('');
  const [saving,   setSaving]   = useState(false);
  const detectedImages = useMemo(() => markdown ? extractImageRefs(markdown) : [], [markdown]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) setTitle(file.name.replace(/\.(md|txt)$/i, '').replace(/_/g, ' '));
    const reader = new FileReader();
    reader.onload = ev => setMarkdown(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, title: title.trim(), source_markdown: markdown || null, order_index: nextIndex }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Topic created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />Create Topic
          </DialogTitle>
          <DialogDescription>Enter a title and optionally paste or upload the markdown source.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Topic title <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2.1 Introduction" className="h-8 text-sm" autoFocus />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .md file (optional)</span>
            <input type="file" accept=".md,.txt" className="sr-only" onChange={handleFileRead} />
          </label>
          <Textarea
            value={markdown} onChange={e => setMarkdown(e.target.value)}
            placeholder="## Section Title&#10;&#10;Paste markdown here…"
            className="flex-1 min-h-[220px] font-mono text-xs resize-none"
          />
          {detectedImages.length > 0 && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                {detectedImages.length} image{detectedImages.length !== 1 ? 's' : ''} referenced
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedImages.map(img => (
                  <span key={img} className="inline-flex items-center gap-1 text-[10px] font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
                    <ImageIcon className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />{img}
                  </span>
                ))}
              </div>
            </div>
          )}
          {markdown && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{markdown.length.toLocaleString()} characters</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Subtopic dialog ─────────────────────────────────────────────── */
function CreateSubtopicDialog({
  topics, defaultTopicId, onClose, onCreated,
}: { topics: Topic[]; defaultTopicId?: string; onClose: () => void; onCreated: () => void }) {
  const [topicId,  setTopicId]  = useState(defaultTopicId ?? topics[0]?.id ?? '');
  const [title,    setTitle]    = useState('');
  const [markdown, setMarkdown] = useState('');
  const [saving,   setSaving]   = useState(false);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) setTitle(file.name.replace(/\.(md|txt)$/i, '').replace(/_/g, ' '));
    const reader = new FileReader();
    reader.onload = ev => setMarkdown(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!title.trim() || !topicId) { toast.error('Title and topic are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/subtopics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, title: title.trim(), source_markdown: markdown || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Subtopic created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />Create Subtopic
          </DialogTitle>
          <DialogDescription>Select the parent topic, then provide a title and optional markdown content.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Parent topic <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select topic…" /></SelectTrigger>
              <SelectContent>
                {topics.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-sm">
                    {t.order_index + 1}. {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Subtopic title <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2.3.1 Scalar and Vector Quantities" className="h-8 text-sm" autoFocus />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .md file (optional)</span>
            <input type="file" accept=".md,.txt" className="sr-only" onChange={handleFileRead} />
          </label>
          <Textarea
            value={markdown} onChange={e => setMarkdown(e.target.value)}
            placeholder="Paste markdown content here…"
            className="flex-1 min-h-[200px] font-mono text-xs resize-none"
          />
          {markdown && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{markdown.length.toLocaleString()} characters</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || !topicId}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Subtopic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit markdown dialog (topic or subtopic) ───────────────────────────── */
function EditMarkdownDialog({
  label, currentMarkdown, onClose, onSave,
}: { label: string; currentMarkdown: string | null; onClose: () => void; onSave: (md: string) => Promise<void> }) {
  const [markdown, setMarkdown] = useState(currentMarkdown ?? '');
  const [saving,   setSaving]   = useState(false);
  const detectedImages = useMemo(() => extractImageRefs(markdown), [markdown]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setMarkdown(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(markdown);
      onClose();
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />Edit: {label}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .md file</span>
            <input type="file" accept=".md,.txt" className="sr-only" onChange={handleFileRead} />
          </label>
          <Textarea
            value={markdown} onChange={e => setMarkdown(e.target.value)}
            className="flex-1 min-h-[300px] font-mono text-xs resize-none"
          />
          {detectedImages.length > 0 && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                {detectedImages.length} image{detectedImages.length !== 1 ? 's' : ''} referenced
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedImages.map(img => (
                  <span key={img} className="text-[10px] font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">{img}</span>
                ))}
              </div>
            </div>
          )}
          {markdown && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{markdown.length.toLocaleString()} characters</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Quiz dialog ─────────────────────────────────────────────────── */
function CreateQuizDialog({
  topics, defaultTopicId, onClose, onCreated,
}: { topics: Topic[]; defaultTopicId?: string; onClose: () => void; onCreated: () => void }) {
  const [topicId, setTopicId] = useState(defaultTopicId ?? topics[0]?.id ?? '');
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving]    = useState(false);
  const [parseError, setParseError] = useState('');

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string ?? '';
      setJsonText(text);
      setParseError('');
      try { JSON.parse(text); } catch { setParseError('Invalid JSON'); }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!topicId) { toast.error('Select a topic'); return; }
    let questions: unknown[];
    try { questions = JSON.parse(jsonText); } catch { toast.error('Invalid JSON'); return; }
    if (!Array.isArray(questions)) { toast.error('JSON must be an array'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Created ${data.inserted} question${data.inserted !== 1 ? 's' : ''}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[hsl(var(--primary))]" />Upload Quiz Questions
          </DialogTitle>
          <DialogDescription>Select a topic and paste a JSON array of MCQ questions.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Topic <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select topic…" /></SelectTrigger>
              <SelectContent>
                {topics.map(t => <SelectItem key={t.id} value={t.id} className="text-sm">{t.order_index + 1}. {t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .json file</span>
            <input type="file" accept=".json" className="sr-only" onChange={handleFileRead} />
          </label>
          <Textarea
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setParseError(''); if (e.target.value.trim()) { try { JSON.parse(e.target.value); } catch { setParseError('Invalid JSON'); } } }}
            placeholder={'[\n  { "question_text": "...", "options": [...], "correct_answer_id": 1 }\n]'}
            className="flex-1 min-h-[240px] font-mono text-xs resize-none"
          />
          {parseError && <p className="text-xs text-[hsl(var(--destructive))]">{parseError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !jsonText.trim() || !!parseError || !topicId}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : 'Upload Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminTextbooksPage() {
  const [textbooks, setTextbooks]             = useState<Textbook[]>([]);
  const [chapters,  setChapters]              = useState<Chapter[]>([]);
  const [topics,    setTopics]                = useState<Topic[]>([]);
  const [subtopics, setSubtopics]             = useState<Subtopic[]>([]);
  const [indexedImages, setIndexedImages]     = useState<IndexedImage[]>([]);
  const [selectedSubject,  setSelectedSubject]  = useState('');
  const [selectedGrade,    setSelectedGrade]    = useState('');
  const [selectedTextbook, setSelectedTextbook] = useState('');
  const [selectedChapter,  setSelectedChapter]  = useState('');
  const [expandedTopics,   setExpandedTopics]   = useState<Set<string>>(new Set());
  const [previewItem,      setPreviewItem]      = useState<PreviewItem | null>(null);
  const [loadingTopics,    setLoadingTopics]    = useState(false);

  /* dialogs */
  const [showCreateBook,     setShowCreateBook]     = useState(false);
  const [showCreateChapter,  setShowCreateChapter]  = useState(false);
  const [showCreateTopic,    setShowCreateTopic]    = useState(false);
  const [showCreateSubtopic, setShowCreateSubtopic] = useState(false);
  const [showCreateQuiz,     setShowCreateQuiz]     = useState(false);
  const [editMarkdownItem,   setEditMarkdownItem]   = useState<{ type: 'topic' | 'subtopic'; id: string; title: string; source_markdown: string | null } | null>(null);

  /* inline editing */
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editingType,   setEditingType]   = useState<'topic' | 'subtopic'>('topic');
  const [editingTitle,  setEditingTitle]  = useState('');
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [deletingType,  setDeletingType]  = useState<'topic' | 'subtopic' | 'image'>('topic');

  /* image upload */
  const [uploadFiles,   setUploadFiles]   = useState<File[]>([]);
  const [uploading,     setUploading]     = useState(false);
  const [uploadTopicId, setUploadTopicId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── loaders ── */
  const loadTextbooks = useCallback(() => {
    fetch('/api/textbooks').then(r => r.json()).then(d => setTextbooks(d.textbooks ?? []));
  }, []);
  useEffect(() => { loadTextbooks(); }, [loadTextbooks]);

  useEffect(() => {
    setChapters([]); setSelectedChapter(''); setTopics([]); setSubtopics([]); setIndexedImages([]);
    if (!selectedTextbook) return;
    fetch(`/api/chapters?textbook_id=${selectedTextbook}`).then(r => r.json()).then(d => setChapters(d.chapters ?? []));
  }, [selectedTextbook]);

  const loadTopics = useCallback(async () => {
    setTopics([]); setSubtopics([]);
    if (!selectedChapter) return;
    setLoadingTopics(true);
    try {
      const [td, sd] = await Promise.all([
        fetch(`/api/topics?chapter_id=${selectedChapter}`).then(r => r.json()),
        fetch(`/api/subtopics?chapter_id=${selectedChapter}`).then(r => r.json()),
      ]);
      setTopics(td.topics ?? []);
      setSubtopics(sd.subtopics ?? []);
    } finally { setLoadingTopics(false); }
  }, [selectedChapter]);
  useEffect(() => { loadTopics(); }, [loadTopics]);

  const loadIndexedImages = useCallback(async () => {
    setIndexedImages([]);
    if (!selectedChapter) return;
    const d = await fetch(`/api/admin/images/index?chapter_id=${selectedChapter}`).then(r => r.json());
    setIndexedImages(d.images ?? []);
  }, [selectedChapter]);
  useEffect(() => { loadIndexedImages(); }, [loadIndexedImages]);

  /* ── derived ── */
  const subjectOptions = useMemo(() => Array.from(new Set(textbooks.map(t => t.subject))).sort(), [textbooks]);
  const gradeOptions   = useMemo(() =>
    selectedSubject ? Array.from(new Set(textbooks.filter(t => t.subject === selectedSubject).map(t => t.grade))).sort() : [],
  [textbooks, selectedSubject]);
  const bookOptions = useMemo(() => textbooks.filter(t =>
    (!selectedSubject || t.subject === selectedSubject) && (!selectedGrade || t.grade === selectedGrade)
  ), [textbooks, selectedSubject, selectedGrade]);

  const activeBook    = textbooks.find(t => t.id === selectedTextbook) ?? null;
  const activeChapter = chapters.find(c => c.id === selectedChapter) ?? null;
  const subtopicsByTopic = useMemo(() => {
    const map = new Map<string, Subtopic[]>();
    for (const s of subtopics) {
      if (!map.has(s.topic_id)) map.set(s.topic_id, []);
      map.get(s.topic_id)!.push(s);
    }
    return map;
  }, [subtopics]);
  const referencedImages = useMemo(() => {
    const refs = topics.flatMap(t => t.source_markdown ? extractImageRefs(t.source_markdown) : [])
      .concat(subtopics.flatMap(s => s.source_markdown ? extractImageRefs(s.source_markdown) : []));
    return [...new Set(refs)];
  }, [topics, subtopics]);
  const indexedSet = useMemo(() => new Set(indexedImages.map(i => i.file_name)), [indexedImages]);

  /* ── topic CRUD ── */
  const saveTitle = async (type: 'topic' | 'subtopic', id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingId(null); return; }
    const url = type === 'topic' ? `/api/topics/${id}` : `/api/subtopics/${id}`;
    try {
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: trimmed }) });
      if (!res.ok) throw new Error((await res.json()).error);
      if (type === 'topic') setTopics(prev => prev.map(t => t.id === id ? { ...t, title: trimmed } : t));
      else setSubtopics(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s));
    } catch (err) { toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err))); }
    setEditingId(null);
  };

  const moveTopic = async (id: string, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= topics.length) return;
    const a = topics[idx], b = topics[swapIdx];
    const reordered = [...topics];
    reordered[idx] = { ...a, order_index: b.order_index };
    reordered[swapIdx] = { ...b, order_index: a.order_index };
    reordered.sort((x, y) => x.order_index - y.order_index);
    setTopics(reordered);
    await Promise.all([
      fetch(`/api/topics/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: b.order_index }) }),
      fetch(`/api/topics/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: a.order_index }) }),
    ]);
  };

  const deleteItem = async () => {
    if (!deletingId) return;
    try {
      if (deletingType === 'image') {
        const res = await fetch(`/api/admin/images/${deletingId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        setIndexedImages(prev => prev.filter(img => img.id !== deletingId));
        toast.success('Image deleted');
      } else {
        const url = deletingType === 'topic' ? `/api/topics/${deletingId}` : `/api/subtopics/${deletingId}`;
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        if (deletingType === 'topic') setTopics(prev => prev.filter(t => t.id !== deletingId));
        else setSubtopics(prev => prev.filter(s => s.id !== deletingId));
        toast.success(`${deletingType === 'topic' ? 'Topic' : 'Subtopic'} deleted`);
      }
    } catch (err) { toast.error('Delete failed: ' + (err instanceof Error ? err.message : String(err))); }
    setDeletingId(null);
  };

  /* ── image upload ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadFiles(prev => { const s = new Set(prev.map(f => f.name)); return [...prev, ...files.filter(f => !s.has(f.name))]; });
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedChapter || uploadFiles.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('chapter_id', selectedChapter);
      if (uploadTopicId) fd.append('topic_id', uploadTopicId);
      uploadFiles.forEach(f => fd.append('files', f));
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${data.uploaded} image${data.uploaded !== 1 ? 's' : ''}${data.skipped ? ` (${data.skipped} skipped)` : ''}`);
      setUploadFiles([]);
      loadIndexedImages();
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setUploading(false); }
  };

  /* ── render ── */
  return (
    <div className="p-6 space-y-4">
      <Tabs defaultValue="textbooks">
        <TabsList className="mb-1">
          <TabsTrigger value="textbooks" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />Text Books
          </TabsTrigger>
          <TabsTrigger value="reference" className="gap-1.5">
            <BookMarked className="h-3.5 w-3.5" />Reference Books
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />Question Bank
          </TabsTrigger>
        </TabsList>

        {/* ══ TEXT BOOKS TAB ════════════════════════════════════════════════ */}
        <TabsContent value="textbooks" className="space-y-4 mt-3">

          {/* ── Selector bar ── */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Select Textbook box */}
            <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm">
              <Select value={selectedSubject || '__all__'} onValueChange={v => { setSelectedSubject(v === '__all__' ? '' : v); setSelectedGrade(''); setSelectedTextbook(''); }}>
                <SelectTrigger className="h-8 w-32 text-sm border-0 shadow-none px-2 focus:ring-0"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-sm">All subjects</SelectItem>
                  {subjectOptions.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedGrade || '__all__'} onValueChange={v => { setSelectedGrade(v === '__all__' ? '' : v); setSelectedTextbook(''); }} disabled={!selectedSubject}>
                <SelectTrigger className="h-8 w-24 text-sm border-0 shadow-none px-2 focus:ring-0"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-sm">All</SelectItem>
                  {gradeOptions.map(g => <SelectItem key={g} value={g} className="text-sm">Class {g}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedTextbook || '__none__'} onValueChange={v => { setSelectedTextbook(v === '__none__' ? '' : v); setSelectedChapter(''); }}>
                <SelectTrigger className="h-8 w-56 text-sm border-0 shadow-none px-2 focus:ring-0"><SelectValue placeholder="Text Book…" /></SelectTrigger>
                <SelectContent>
                  {bookOptions.length === 0
                    ? <SelectItem value="__no_books__" disabled className="text-sm text-[hsl(var(--muted-foreground))]">No books match</SelectItem>
                    : bookOptions.map(tb => (
                      <SelectItem key={tb.id} value={tb.id} className="text-sm">
                        {tb.subject} {tb.grade} — {tb.title}{tb.part ? ` (${tb.part})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" title="Add textbook" onClick={() => setShowCreateBook(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Select Chapter box */}
            {selectedTextbook && (
              <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm">
                <Select value={selectedChapter || '__none__'} onValueChange={v => setSelectedChapter(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-8 w-56 text-sm border-0 shadow-none px-2 focus:ring-0">
                    <SelectValue placeholder="Available Chapter…" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.length === 0
                      ? <SelectItem value="__no_ch__" disabled className="text-sm text-[hsl(var(--muted-foreground))]">No chapters yet</SelectItem>
                      : chapters.map(ch => (
                        <SelectItem key={ch.id} value={ch.id} className="text-sm">
                          Ch {ch.chapter_number} — {ch.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" title="Add chapter" onClick={() => setShowCreateChapter(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={loadTextbooks}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Active chapter header ── */}
          {activeBook && (
            <div className="flex items-center gap-2.5 flex-wrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 shadow-sm">
              <span className="text-base font-bold text-[hsl(var(--foreground))]">{activeBook.subject}</span>
              <Badge variant="outline" className="text-xs px-2 py-0.5 font-bold text-amber-600 border-amber-300">
                {activeBook.grade === '11' ? 'XI' : activeBook.grade === '12' ? 'XII' : activeBook.grade === '11-12' ? 'Merged' : activeBook.grade}
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-0.5 font-medium">
                {activeBook.subject}
              </Badge>
              {activeBook.part && <Badge variant="secondary" className="text-xs px-2 py-0.5">{activeBook.part}</Badge>}
              {activeChapter && (
                <>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-base font-semibold">
                    Ch {activeChapter.chapter_number}: {activeChapter.title}
                  </span>
                  <Badge variant={activeChapter.is_published ? 'default' : 'secondary'} className="text-xs px-2 py-0.5">
                    {activeChapter.is_published ? 'Live' : 'Draft'}
                  </Badge>
                </>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {!selectedTextbook && (
            <div className="py-24 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Select a textbook to get started, or click <strong>+</strong> to create one.</p>
            </div>
          )}

          {/* ── Chapter-level action buttons ── */}
          {selectedChapter && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCreateTopic(true)}>
                <Plus className="h-3.5 w-3.5" />Topic
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCreateSubtopic(true)} disabled={topics.length === 0}>
                <Plus className="h-3.5 w-3.5" />Subtopic
              </Button>
              {topics.length > 0 && (
                <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-amber-600 hover:bg-amber-50" onClick={() => setShowCreateQuiz(true)}>
                  <HelpCircle className="h-3.5 w-3.5" />Quiz
                </Button>
              )}
            </div>
          )}

          {/* ── 3-panel layout ── */}
          {selectedChapter && (
            <div className="grid lg:grid-cols-3 gap-4" style={{ minHeight: 520 }}>

              {/* ── Panel 1: Hierarchical topic list ── */}
              <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
                <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    Topic List {topics.length > 0 && <span className="font-normal text-[hsl(var(--muted-foreground))]">({topics.length})</span>}
                  </p>
                  {loadingTopics && <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--muted-foreground))]" />}
                </div>

                {loadingTopics ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
                  </div>
                ) : topics.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-[hsl(var(--muted-foreground))] p-4">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p className="text-center">No topics yet. Click <strong>+ Topic</strong> above.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {topics.map((t, i) => {
                      const subs = subtopicsByTopic.get(t.id) ?? [];
                      const isExpanded = expandedTopics.has(t.id);
                      const isSelected = previewItem?.id === t.id && previewItem?.type === 'topic';

                      return (
                        <div key={t.id}>
                          {/* Topic row */}
                          <div className={`flex items-center gap-1 px-2 py-2 hover:bg-[hsl(var(--accent)/0.5)] group border-b border-[hsl(var(--border)/0.5)] ${isSelected ? 'bg-[hsl(var(--accent))] border-l-2 border-l-[hsl(var(--primary))]' : ''}`}>
                            {/* Expand/collapse */}
                            <button
                              onClick={() => setExpandedTopics(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}
                              className="h-5 w-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0"
                            >
                              {subs.length > 0
                                ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
                                : <span className="w-3" />}
                            </button>

                            {/* Reorder */}
                            <div className="flex flex-col shrink-0">
                              <button onClick={() => moveTopic(t.id, 'up')} disabled={i === 0}
                                className="h-3.5 w-3.5 flex items-center justify-center text-[hsl(var(--muted-foreground))] disabled:opacity-20 hover:text-[hsl(var(--foreground))]">
                                <ChevronUp className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={() => moveTopic(t.id, 'down')} disabled={i === topics.length - 1}
                                className="h-3.5 w-3.5 flex items-center justify-center text-[hsl(var(--muted-foreground))] disabled:opacity-20 hover:text-[hsl(var(--foreground))]">
                                <ChevronDown className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono w-5 shrink-0 text-right">{i + 1}.</span>

                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewItem({ type: 'topic', id: t.id, title: t.title, source_markdown: t.source_markdown })}>
                              {editingId === t.id && editingType === 'topic' ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <input autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveTitle('topic', t.id); if (e.key === 'Escape') setEditingId(null); }}
                                    className="flex-1 text-xs border border-[hsl(var(--border))] rounded px-1.5 py-0.5 bg-[hsl(var(--background))] min-w-0" />
                                  <button onClick={() => saveTitle('topic', t.id)} className="text-emerald-600"><Check className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <p className="text-xs font-medium leading-snug truncate">{t.title}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {t.content_id
                                  ? <span className="text-[9px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />AI Ready</span>
                                  : <span className="text-[9px] text-[hsl(var(--muted-foreground))] flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />Pending</span>}
                                {subs.length > 0 && <span className="text-[9px] text-blue-500">{subs.length} sub</span>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => { setEditingId(t.id); setEditingType('topic'); setEditingTitle(t.title); }}
                                className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" title="Rename">
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={() => setEditMarkdownItem({ type: 'topic', id: t.id, title: t.title, source_markdown: t.source_markdown })}
                                className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" title="Edit markdown">
                                <FileText className="h-2.5 w-2.5" />
                              </button>
                              {deletingId === t.id && deletingType === 'topic' ? (
                                <div className="flex gap-0.5">
                                  <button onClick={deleteItem} className="h-5 px-1 rounded text-[9px] font-semibold bg-red-500 text-white hover:bg-red-600">Del</button>
                                  <button onClick={() => setDeletingId(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-[hsl(var(--accent))]"><X className="h-2.5 w-2.5" /></button>
                                </div>
                              ) : (
                                <button onClick={() => { setDeletingId(t.id); setDeletingType('topic'); }}
                                  className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50" title="Delete">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subtopic rows (when expanded) */}
                          {isExpanded && subs.map(s => {
                            const isSubSelected = previewItem?.id === s.id && previewItem?.type === 'subtopic';
                            return (
                              <div key={s.id} className={`flex items-center gap-1 pl-8 pr-2 py-1.5 hover:bg-[hsl(var(--accent)/0.3)] group border-b border-[hsl(var(--border)/0.3)] ${isSubSelected ? 'bg-[hsl(var(--accent))] border-l-2 border-l-blue-400' : ''}`}>
                                <span className="text-[9px] text-blue-400 font-mono w-8 shrink-0 text-right">{i + 1}.{s.order_index + 1}</span>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewItem({ type: 'subtopic', id: s.id, title: s.title, source_markdown: s.source_markdown })}>
                                  {editingId === s.id && editingType === 'subtopic' ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <input autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveTitle('subtopic', s.id); if (e.key === 'Escape') setEditingId(null); }}
                                        className="flex-1 text-[11px] border border-[hsl(var(--border))] rounded px-1.5 py-0.5 bg-[hsl(var(--background))] min-w-0" />
                                      <button onClick={() => saveTitle('subtopic', s.id)} className="text-emerald-600"><Check className="h-3 w-3" /></button>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] font-medium leading-snug truncate text-[hsl(var(--muted-foreground))]">{s.title}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={() => { setEditingId(s.id); setEditingType('subtopic'); setEditingTitle(s.title); }}
                                    className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button onClick={() => setEditMarkdownItem({ type: 'subtopic', id: s.id, title: s.title, source_markdown: s.source_markdown })}
                                    className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]">
                                    <FileText className="h-2.5 w-2.5" />
                                  </button>
                                  {deletingId === s.id && deletingType === 'subtopic' ? (
                                    <div className="flex gap-0.5">
                                      <button onClick={deleteItem} className="h-5 px-1 rounded text-[9px] font-semibold bg-red-500 text-white">Del</button>
                                      <button onClick={() => setDeletingId(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-[hsl(var(--accent))]"><X className="h-2.5 w-2.5" /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setDeletingId(s.id); setDeletingType('subtopic'); }}
                                      className="h-5 w-5 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50">
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Panel 2: Mini Preview ── */}
              <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
                <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Mini Preview</p>
                  {previewItem && (
                    <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[140px]">{previewItem.title}</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {!previewItem ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-[hsl(var(--muted-foreground))] gap-2">
                      <Eye className="h-8 w-8 opacity-20" />
                      <p>Click a topic or subtopic to preview</p>
                    </div>
                  ) : !previewItem.source_markdown ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-[hsl(var(--muted-foreground))] gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p className="text-center font-medium">{previewItem.title}</p>
                      <p>No markdown content yet.</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 mt-1"
                        onClick={() => setEditMarkdownItem({ type: previewItem.type, id: previewItem.id, title: previewItem.title, source_markdown: null })}>
                        <Upload className="h-3 w-3" />Add content
                      </Button>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                      <MarkdownRenderer content={previewItem.source_markdown} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Panel 3: Images ── */}
              <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
                <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />Upload img
                  </p>
                  {selectedChapter && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{indexedImages.length} in DB</span>}
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
                  {/* Referenced images */}
                  {referencedImages.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Referenced ({referencedImages.length})
                      </p>
                      <div className="max-h-28 overflow-y-auto space-y-0.5">
                        {referencedImages.map(img => (
                          <div key={img} className="flex items-center gap-1.5">
                            {indexedSet.has(img)
                              ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              : <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="text-[10px] font-mono truncate text-[hsl(var(--muted-foreground))]">{img}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {referencedImages.filter(img => indexedSet.has(img)).length}/{referencedImages.length} uploaded
                      </p>
                    </div>
                  )}

                  {/* Upload zone */}
                  <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-3 space-y-2">
                    {topics.length > 0 && (
                      <Select value={uploadTopicId || '__none__'} onValueChange={v => setUploadTopicId(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="Tag with topic (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">No topic tag</SelectItem>
                          {topics.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.order_index + 1}. {t.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <label className="flex items-center justify-center gap-2 text-xs cursor-pointer border border-[hsl(var(--border))] rounded-md px-3 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-full">
                      <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                      <span>Select images…</span>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />
                    </label>
                  </div>

                  {/* Queue */}
                  {uploadFiles.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Queued ({uploadFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {uploadFiles.map(f => (
                          <div key={f.name} className="flex items-center gap-1.5 group">
                            <ImageIcon className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                            <span className="text-[10px] font-mono flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{(f.size / 1024).toFixed(0)}k</span>
                            <button onClick={() => setUploadFiles(prev => prev.filter(x => x.name !== f.name))}
                              className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:text-[hsl(var(--destructive))]">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" className="w-full h-7 text-xs gap-1.5" onClick={handleUpload} disabled={uploading}>
                        {uploading ? <><Loader2 className="h-3 w-3 animate-spin" />Uploading…</> : <><Upload className="h-3 w-3" />Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}</>}
                      </Button>
                    </div>
                  )}

                  {/* In DB */}
                  {indexedImages.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">In database ({indexedImages.length})</p>
                        <button onClick={loadIndexedImages}><RefreshCw className="h-3 w-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" /></button>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {indexedImages.map(img => (
                          <div key={img.id} className="flex items-center gap-1.5 group">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-[10px] font-mono truncate flex-1 text-[hsl(var(--muted-foreground))]">{img.file_name}</span>
                            {deletingId === img.id && deletingType === 'image' ? (
                              <div className="flex gap-0.5 shrink-0">
                                <button onClick={deleteItem} className="h-5 px-1.5 rounded text-[9px] font-semibold bg-red-500 text-white hover:bg-red-600">Del</button>
                                <button onClick={() => setDeletingId(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-[hsl(var(--accent))]"><X className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => { setDeletingId(img.id); setDeletingType('image'); }}
                                className="h-5 w-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 shrink-0">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {referencedImages.length === 0 && indexedImages.length === 0 && uploadFiles.length === 0 && (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] text-center py-6">
                      Add topics with markdown content to see referenced images here.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </TabsContent>

        {/* ══ REFERENCE BOOKS TAB ══════════════════════════════════════════ */}
        <TabsContent value="reference" className="mt-3">
          <ReferenceBooksTab />
        </TabsContent>

        {/* ══ QUESTION BANK TAB ════════════════════════════════════════════ */}
        <TabsContent value="questions" className="mt-3">
          <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-[hsl(var(--foreground))]">Question Bank</p>
            <p className="mt-1 text-xs mb-4">Manage and ingest questions from the dedicated section.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/admin/questions" className="inline-flex items-center gap-1.5 text-xs border border-[hsl(var(--border))] rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors font-medium">
                <HelpCircle className="h-3.5 w-3.5" />Browse Questions
              </Link>
              <Link href="/admin/questions/ingest" className="inline-flex items-center gap-1.5 text-xs border border-[hsl(var(--border))] rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors font-medium">
                <Upload className="h-3.5 w-3.5" />Ingest Questions
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      {showCreateBook && (
        <CreateTextbookDialog onClose={() => setShowCreateBook(false)} onCreated={loadTextbooks} />
      )}
      {showCreateChapter && selectedTextbook && (
        <CreateChapterDialog
          textbookId={selectedTextbook}
          nextNumber={chapters.length + 1}
          onClose={() => setShowCreateChapter(false)}
          onCreated={() => {
            fetch(`/api/chapters?textbook_id=${selectedTextbook}`).then(r => r.json()).then(d => setChapters(d.chapters ?? []));
          }}
        />
      )}
      {showCreateTopic && selectedChapter && (
        <CreateTopicDialog chapterId={selectedChapter} nextIndex={topics.length} onClose={() => setShowCreateTopic(false)} onCreated={loadTopics} />
      )}
      {showCreateSubtopic && topics.length > 0 && (
        <CreateSubtopicDialog topics={topics} onClose={() => setShowCreateSubtopic(false)} onCreated={loadTopics} />
      )}
      {showCreateQuiz && topics.length > 0 && (
        <CreateQuizDialog topics={topics} onClose={() => setShowCreateQuiz(false)} onCreated={loadTopics} />
      )}
      {editMarkdownItem && (
        <EditMarkdownDialog
          label={editMarkdownItem.title}
          currentMarkdown={editMarkdownItem.source_markdown}
          onClose={() => setEditMarkdownItem(null)}
          onSave={async (md) => {
            const url = editMarkdownItem.type === 'topic'
              ? `/api/topics/${editMarkdownItem.id}`
              : `/api/subtopics/${editMarkdownItem.id}`;
            const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_markdown: md }) });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Content saved');
            loadTopics();
            // Update preview if this item is selected
            if (previewItem?.id === editMarkdownItem.id) {
              setPreviewItem(prev => prev ? { ...prev, source_markdown: md } : null);
            }
          }}
        />
      )}
    </div>
  );
}
