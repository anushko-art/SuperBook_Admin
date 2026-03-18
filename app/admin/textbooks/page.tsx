'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, ChevronRight, Upload, Plus, FileText,
  ImageIcon, CheckCircle2, Clock, Loader2, RefreshCw, X, HelpCircle,
  Trash2, ChevronUp, ChevronDown, Pencil, Check,
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

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Textbook { id: string; title: string; subject: string; grade: string; part: string; total_chapters: number }
interface Chapter  { id: string; title: string; chapter_number: number; content_length: number; is_published: boolean }
interface Topic    { id: string; title: string; order_index: number; content_id: string | null; source_markdown: string | null; flashcard_count: number; quiz_count: number }
interface IndexedImage { id: string; file_name: string; file_path: string }

/* ─── Helper ─────────────────────────────────────────────────────────────── */
function extractImageRefs(markdown: string): string[] {
  const matches = markdown.match(/img_[a-f0-9]+\.(jpe?g|png|gif|webp)/gi) ?? [];
  return [...new Set(matches)];
}

/* ─── Create Topic dialog ────────────────────────────────────────────────── */
function CreateTopicDialog({
  chapterId, nextIndex, onClose, onCreated,
}: {
  chapterId: string;
  nextIndex: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [markdown, setMarkdown] = useState('');
  const [saving, setSaving]     = useState(false);
  const detectedImages = useMemo(() => markdown ? extractImageRefs(markdown) : [], [markdown]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    /* auto-fill title from filename if not set */
    if (!title.trim()) {
      const base = file.name.replace(/\.(md|txt)$/i, '').replace(/_/g, ' ');
      setTitle(base);
    }
    const reader = new FileReader();
    reader.onload = (ev) => setMarkdown(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          title: title.trim(),
          source_markdown: markdown || null,
          order_index: nextIndex,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Topic created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />
            Create Topic
          </DialogTitle>
          <DialogDescription>
            Enter a title and optionally upload or paste the markdown source for this topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Topic title <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2.1 Introduction"
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* MD file import */}
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .md file (optional)</span>
            <input type="file" accept=".md,.txt" className="sr-only" onChange={handleFileRead} />
          </label>

          {/* Markdown textarea */}
          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="## Section Title&#10;&#10;Paste markdown content here…"
            className="flex-1 min-h-[220px] font-mono text-xs resize-none"
          />

          {/* Detected images */}
          {detectedImages.length > 0 && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                {detectedImages.length} image{detectedImages.length !== 1 ? 's' : ''} referenced
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedImages.map((img) => (
                  <span key={img} className="inline-flex items-center gap-1 text-[10px] font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
                    <ImageIcon className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                    {img}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5">
                Upload these images in the Images panel after saving.
              </p>
            </div>
          )}

          {markdown && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{markdown.length.toLocaleString()} characters</p>
          )}
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

/* ─── Create Quiz dialog ─────────────────────────────────────────────────── */
function CreateQuizDialog({
  topics, defaultTopicId, onClose, onCreated,
}: {
  topics: Topic[];
  defaultTopicId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [topicId, setTopicId] = useState(defaultTopicId ?? topics[0]?.id ?? '');
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving]     = useState(false);
  const [parseError, setParseError] = useState('');

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string ?? '';
      setJsonText(text);
      setParseError('');
      try { JSON.parse(text); } catch { setParseError('Invalid JSON'); }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (v: string) => {
    setJsonText(v);
    setParseError('');
    if (v.trim()) { try { JSON.parse(v); } catch { setParseError('Invalid JSON'); } }
  };

  const handleSave = async () => {
    if (!topicId) { toast.error('Select a topic'); return; }
    let questions: unknown[];
    try { questions = JSON.parse(jsonText); } catch { toast.error('Invalid JSON'); return; }
    if (!Array.isArray(questions)) { toast.error('JSON must be an array of questions'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Created ${data.inserted} quiz question${data.inserted !== 1 ? 's' : ''}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  const exampleJson = JSON.stringify([
    {
      question_text: "What is the SI unit of velocity?",
      question_type: "mcq",
      options: [
        { id: 1, text: "m/s²", is_correct: false },
        { id: 2, text: "m/s", is_correct: true },
        { id: 3, text: "km/h", is_correct: false },
        { id: 4, text: "N", is_correct: false },
      ],
      correct_answer_id: 2,
      explanation: "Velocity is displacement per unit time, so its SI unit is m/s.",
      difficulty_level: "easy",
    },
  ], null, 2);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[hsl(var(--primary))]" />
            Upload Quiz Questions
          </DialogTitle>
          <DialogDescription>
            Select a topic and upload or paste a JSON array of MCQ questions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Topic selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Topic <span className="text-[hsl(var(--destructive))]">*</span></label>
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

          {/* File import */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors">
              <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[hsl(var(--muted-foreground))]">Import .json file</span>
              <input type="file" accept=".json" className="sr-only" onChange={handleFileRead} />
            </label>
            <button
              className="text-xs text-[hsl(var(--primary))] hover:underline"
              onClick={() => { setJsonText(exampleJson); setParseError(''); }}
            >
              Load example
            </button>
          </div>

          {/* JSON textarea */}
          <Textarea
            value={jsonText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={'[\n  {\n    "question_text": "...",\n    "options": [...],\n    "correct_answer_id": 1\n  }\n]'}
            className="flex-1 min-h-[240px] font-mono text-xs resize-none"
          />

          {parseError && (
            <p className="text-xs text-[hsl(var(--destructive))]">{parseError}</p>
          )}
          {jsonText && !parseError && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {(() => { try { const a = JSON.parse(jsonText); return Array.isArray(a) ? `${a.length} question${a.length !== 1 ? 's' : ''} ready` : 'JSON is not an array'; } catch { return ''; } })()}
            </p>
          )}
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

/* ─── Edit Topic markdown dialog ─────────────────────────────────────────── */
function EditTopicDialog({
  topic, onClose, onSaved,
}: {
  topic: Topic;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [markdown, setMarkdown] = useState(topic.source_markdown ?? '');
  const [saving, setSaving]     = useState(false);
  const detectedImages = useMemo(() => extractImageRefs(markdown), [markdown]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setMarkdown(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_markdown: markdown }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Topic content saved');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
            Edit Markdown — {topic.order_index + 1}. {topic.title}
          </DialogTitle>
          <DialogDescription>
            Import or paste the markdown source for this topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <label className="flex items-center gap-2 text-xs cursor-pointer border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-2.5 hover:bg-[hsl(var(--accent))] transition-colors w-fit">
            <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Import .md file</span>
            <input type="file" accept=".md,.txt" className="sr-only" onChange={handleFileRead} />
          </label>

          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="## Section Title&#10;&#10;Paste markdown…"
            className="flex-1 min-h-[260px] font-mono text-xs resize-none"
          />

          {detectedImages.length > 0 && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2">
              <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                {detectedImages.length} image{detectedImages.length !== 1 ? 's' : ''} referenced
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedImages.map((img) => (
                  <span key={img} className="inline-flex items-center gap-1 text-[10px] font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
                    <ImageIcon className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                    {img}
                  </span>
                ))}
              </div>
            </div>
          )}

          {markdown && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{markdown.length.toLocaleString()} characters</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !markdown.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : 'Save Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminTextbooksPage() {
  const [textbooks, setTextbooks]               = useState<Textbook[]>([]);
  const [chapters, setChapters]                 = useState<Chapter[]>([]);
  const [topics, setTopics]                     = useState<Topic[]>([]);
  const [indexedImages, setIndexedImages]       = useState<IndexedImage[]>([]);
  const [selectedSubject, setSelectedSubject]   = useState('');
  const [selectedGrade, setSelectedGrade]       = useState('');
  const [selectedTextbook, setSelectedTextbook] = useState('');
  const [selectedChapter, setSelectedChapter]   = useState('');
  const [showCreateTopic, setShowCreateTopic]   = useState(false);
  const [showCreateQuiz, setShowCreateQuiz]     = useState(false);
  const [editTopicDialog, setEditTopicDialog]   = useState<Topic | null>(null);
  const [loadingTopics, setLoadingTopics]       = useState(false);

  /* topic inline editing */
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle]     = useState('');
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  /* bulk image upload */
  const [uploadFiles, setUploadFiles]     = useState<File[]>([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadTopicId, setUploadTopicId] = useState('');
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const loadTextbooks = useCallback(() => {
    fetch('/api/textbooks').then(r => r.json()).then(d => setTextbooks(d.textbooks ?? []));
  }, []);
  useEffect(() => { loadTextbooks(); }, [loadTextbooks]);

  /* derived filter options */
  const subjectOptions = useMemo(() => Array.from(new Set(textbooks.map(t => t.subject))).sort(), [textbooks]);
  const gradeOptions   = useMemo(() =>
    selectedSubject
      ? Array.from(new Set(textbooks.filter(t => t.subject === selectedSubject).map(t => t.grade))).sort()
      : [],
  [textbooks, selectedSubject]);
  const bookOptions = useMemo(() => textbooks.filter(t =>
    (!selectedSubject || t.subject === selectedSubject) &&
    (!selectedGrade   || t.grade   === selectedGrade)
  ), [textbooks, selectedSubject, selectedGrade]);

  /* load chapters when book changes */
  useEffect(() => {
    setChapters([]); setSelectedChapter(''); setTopics([]); setIndexedImages([]);
    if (!selectedTextbook) return;
    fetch(`/api/chapters?textbook_id=${selectedTextbook}`)
      .then(r => r.json()).then(d => setChapters(d.chapters ?? []));
  }, [selectedTextbook]);

  /* load topics */
  const loadTopics = useCallback(async () => {
    setTopics([]);
    if (!selectedChapter) return;
    setLoadingTopics(true);
    try {
      const d = await fetch(`/api/topics?chapter_id=${selectedChapter}`).then(r => r.json());
      setTopics(d.topics ?? []);
    } finally { setLoadingTopics(false); }
  }, [selectedChapter]);
  useEffect(() => { loadTopics(); }, [loadTopics]);

  /* load indexed images */
  const loadIndexedImages = useCallback(async () => {
    setIndexedImages([]);
    if (!selectedChapter) return;
    const d = await fetch(`/api/admin/images/index?chapter_id=${selectedChapter}`).then(r => r.json());
    setIndexedImages(d.images ?? []);
  }, [selectedChapter]);
  useEffect(() => { loadIndexedImages(); }, [loadIndexedImages]);

  /* image refs referenced in any topic markdown */
  const referencedImages = useMemo(() => {
    const refs = topics.flatMap(t => t.source_markdown ? extractImageRefs(t.source_markdown) : []);
    return [...new Set(refs)];
  }, [topics]);

  const indexedSet = useMemo(() => new Set(indexedImages.map(i => i.file_name)), [indexedImages]);

  const activeChapter = chapters.find(c => c.id === selectedChapter) ?? null;
  const activeBook    = textbooks.find(t => t.id === selectedTextbook) ?? null;

  /* topic: save inline title edit */
  const saveTopicTitle = async (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingTitleId(null); return; }
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTopics(prev => prev.map(t => t.id === id ? { ...t, title: trimmed } : t));
    } catch (err) { toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err))); }
    setEditingTitleId(null);
  };

  /* topic: reorder */
  const moveTopic = async (id: string, direction: 'up' | 'down') => {
    const idx = topics.findIndex(t => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= topics.length) return;
    const a = topics[idx];
    const b = topics[swapIdx];
    // Optimistic UI update
    const reordered = [...topics];
    reordered[idx] = { ...a, order_index: b.order_index };
    reordered[swapIdx] = { ...b, order_index: a.order_index };
    reordered.sort((x, y) => x.order_index - y.order_index);
    setTopics(reordered);
    // Persist both
    await Promise.all([
      fetch(`/api/topics/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: b.order_index }) }),
      fetch(`/api/topics/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: a.order_index }) }),
    ]);
  };

  /* topic: delete */
  const deleteTopic = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setTopics(prev => prev.filter(t => t.id !== id));
      toast.success('Topic deleted');
    } catch (err) { toast.error('Delete failed: ' + (err instanceof Error ? err.message : String(err))); }
    setDeletingTopicId(null);
  };

  /* image: delete */
  const deleteImage = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setIndexedImages(prev => prev.filter(img => img.id !== id));
      toast.success('Image deleted');
    } catch (err) { toast.error('Delete failed: ' + (err instanceof Error ? err.message : String(err))); }
    setDeletingImageId(null);
  };

  /* bulk image upload */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !existingNames.has(f.name))];
    });
    e.target.value = '';
  };
  const removeFile = (name: string) => setUploadFiles(prev => prev.filter(f => f.name !== name));

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
      toast.success(`Uploaded ${data.uploaded} image${data.uploaded !== 1 ? 's' : ''}${data.skipped ? ` (${data.skipped} already existed)` : ''}`);
      setUploadFiles([]);
      loadIndexedImages();
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setUploading(false); }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />Textbooks
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          {textbooks.length} textbook{textbooks.length !== 1 ? 's' : ''} in database
        </p>
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedSubject || '__all__'} onValueChange={v => {
          setSelectedSubject(v === '__all__' ? '' : v); setSelectedGrade(''); setSelectedTextbook('');
        }}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-sm">All subjects</SelectItem>
            {subjectOptions.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedGrade || '__all__'} onValueChange={v => {
          setSelectedGrade(v === '__all__' ? '' : v); setSelectedTextbook('');
        }} disabled={!selectedSubject}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-sm">All classes</SelectItem>
            {gradeOptions.map(g => <SelectItem key={g} value={g} className="text-sm">Class {g}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedTextbook || '__none__'} onValueChange={v => {
          setSelectedTextbook(v === '__none__' ? '' : v); setSelectedChapter('');
        }}>
          <SelectTrigger className="h-9 w-64 text-sm"><SelectValue placeholder="Select book…" /></SelectTrigger>
          <SelectContent>
            {bookOptions.length === 0 ? (
              <SelectItem value="__no_books__" disabled className="text-sm text-[hsl(var(--muted-foreground))]">No books match</SelectItem>
            ) : bookOptions.map(tb => (
              <SelectItem key={tb.id} value={tb.id} className="text-sm">
                {tb.subject} {tb.grade} — {tb.title}{tb.part ? ` (${tb.part})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTextbook && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={loadTextbooks}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Empty state ── */}
      {!selectedTextbook && (
        <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-25" />
          <p>Select a subject and class to browse textbooks</p>
        </div>
      )}

      {/* ── 3-column layout ── */}
      {selectedTextbook && (
        <>
          {activeBook && (
            <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5">
              <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{activeBook.title}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {activeBook.subject} · Class {activeBook.grade}
                  {activeBook.part && ` · ${activeBook.part}`} · {activeBook.total_chapters} chapters
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4" style={{ minHeight: 520 }}>

            {/* ── Chapters ── */}
            <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
              <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))]">
                <p className="text-xs font-semibold uppercase tracking-wider">Chapters</p>
              </div>
              {chapters.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No chapters</div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
                  {chapters.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChapter(ch.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[hsl(var(--accent))] transition-colors ${
                        selectedChapter === ch.id ? 'bg-[hsl(var(--accent))] border-l-2 border-[hsl(var(--primary))]' : ''
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-mono shrink-0">
                        {ch.chapter_number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug truncate">{ch.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={ch.is_published ? 'default' : 'secondary'} className="text-[9px] h-3.5 px-1">
                            {ch.is_published ? 'Live' : 'Draft'}
                          </Badge>
                          {ch.content_length > 0 && (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              {(ch.content_length / 1000).toFixed(1)}k
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Topics ── */}
            <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
              <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Topics {selectedChapter && topics.length > 0 && <span className="font-normal text-[hsl(var(--muted-foreground))]">({topics.length})</span>}
                </p>
                {selectedChapter && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 text-[10px] px-2 gap-0.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
                      onClick={() => setShowCreateTopic(true)}
                    >
                      <Plus className="h-3 w-3" />Topic
                    </Button>
                    {topics.length > 0 && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 text-[10px] px-2 gap-0.5 text-amber-600 hover:bg-amber-50"
                        onClick={() => setShowCreateQuiz(true)}
                      >
                        <HelpCircle className="h-3 w-3" />Quiz
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {!selectedChapter ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">
                  Select a chapter
                </div>
              ) : loadingTopics ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
                </div>
              ) : topics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-[hsl(var(--muted-foreground))] p-4">
                  <FileText className="h-8 w-8 opacity-20" />
                  <p className="text-center">No topics yet.<br/>Click <strong>+ Create Topic</strong> to add topics one by one.</p>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowCreateTopic(true)}>
                    <Plus className="h-3.5 w-3.5" />Create First Topic
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
                  {topics.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-1.5 px-2 py-2 hover:bg-[hsl(var(--accent)/0.5)] group">
                      {/* Reorder arrows */}
                      <div className="flex flex-col shrink-0">
                        <button onClick={() => moveTopic(t.id, 'up')} disabled={i === 0}
                          className="h-4 w-4 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 transition-colors">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveTopic(t.id, 'down')} disabled={i === topics.length - 1}
                          className="h-4 w-4 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 transition-colors">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-4 shrink-0 text-right font-mono">{i + 1}.</span>

                      <div className="flex-1 min-w-0">
                        {editingTitleId === t.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveTopicTitle(t.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                              className="flex-1 text-xs border border-[hsl(var(--border))] rounded px-1.5 py-0.5 bg-[hsl(var(--background))] min-w-0"
                            />
                            <button onClick={() => saveTopicTitle(t.id)} className="h-5 w-5 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-medium leading-snug truncate">{t.title}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.content_id
                            ? <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600"><CheckCircle2 className="h-2.5 w-2.5" />AI Ready</span>
                            : <span className="inline-flex items-center gap-0.5 text-[9px] text-[hsl(var(--muted-foreground))]"><Clock className="h-2.5 w-2.5" />Pending</span>
                          }
                          {t.source_markdown && (
                            <span className="text-[9px] text-blue-500">md · {extractImageRefs(t.source_markdown).length} img</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (visible on hover) */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {/* Rename */}
                        <button onClick={() => { setEditingTitleId(t.id); setEditingTitle(t.title); }}
                          className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] transition-colors"
                          title="Rename topic">
                          <Pencil className="h-3 w-3" />
                        </button>
                        {/* Edit markdown */}
                        <button onClick={() => setEditTopicDialog(t)}
                          className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] transition-colors"
                          title="Edit markdown content">
                          <Upload className="h-3 w-3" />
                        </button>
                        {/* Delete */}
                        {deletingTopicId === t.id ? (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => deleteTopic(t.id)}
                              className="h-6 px-1.5 rounded text-[9px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                              Delete
                            </button>
                            <button onClick={() => setDeletingTopicId(null)}
                              className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingTopicId(t.id)}
                            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete topic">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Images column ── */}
            <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
              <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider">Images</p>
                {selectedChapter && (
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{indexedImages.length} in DB</span>
                )}
              </div>

              {!selectedChapter ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))] p-4">
                  Select a chapter
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">

                  {/* Referenced images from topic markdowns */}
                  {referencedImages.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Referenced in topics ({referencedImages.length})
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {referencedImages.map(img => (
                          <div key={img} className="flex items-center gap-1.5">
                            {indexedSet.has(img)
                              ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              : <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                            }
                            <span className="text-[10px] font-mono truncate text-[hsl(var(--muted-foreground))]">{img}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {referencedImages.filter(img => indexedSet.has(img)).length}/{referencedImages.length} uploaded
                      </p>
                    </div>
                  )}

                  {/* File picker */}
                  <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                      Bulk image upload
                    </p>
                    {/* Topic tag selector */}
                    {topics.length > 0 && (
                      <Select value={uploadTopicId || '__none__'} onValueChange={v => setUploadTopicId(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Tag with topic (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">No topic tag</SelectItem>
                          {topics.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.order_index + 1}. {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer border border-[hsl(var(--border))] rounded-md px-3 py-2 hover:bg-[hsl(var(--accent))] transition-colors w-full justify-center">
                      <Upload className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                      <span>Select images…</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.jpeg,.jpg,.png,.gif,.webp"
                        multiple
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  {/* Upload queue */}
                  {uploadFiles.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Queued ({uploadFiles.length})
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {uploadFiles.map(f => (
                          <div key={f.name} className="flex items-center gap-1.5 group">
                            <ImageIcon className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                            <span className="text-[10px] font-mono flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{(f.size / 1024).toFixed(0)}k</span>
                            <button
                              onClick={() => removeFile(f.name)}
                              className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:text-[hsl(var(--destructive))] transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs gap-1.5 mt-1"
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading
                          ? <><Loader2 className="h-3 w-3 animate-spin" />Uploading…</>
                          : <><Upload className="h-3 w-3" />Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}</>
                        }
                      </Button>
                    </div>
                  )}

                  {/* Already in DB */}
                  {indexedImages.length > 0 && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          In database ({indexedImages.length})
                        </p>
                        <button onClick={loadIndexedImages}>
                          <RefreshCw className="h-3 w-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors" />
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {indexedImages.map(img => (
                          <div key={img.id} className="flex items-center gap-1.5 group">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-[10px] font-mono truncate flex-1 text-[hsl(var(--muted-foreground))]">{img.file_name}</span>
                            {deletingImageId === img.id ? (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => deleteImage(img.id)}
                                  className="h-5 px-1.5 rounded text-[9px] font-semibold bg-red-500 text-white hover:bg-red-600">
                                  Del
                                </button>
                                <button onClick={() => setDeletingImageId(null)}
                                  className="h-5 w-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] rounded">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingImageId(img.id)}
                                className="h-5 w-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                title="Delete image">
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
                      Create topics with markdown content to see referenced images here.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── Create Topic dialog ── */}
      {showCreateTopic && selectedChapter && (
        <CreateTopicDialog
          chapterId={selectedChapter}
          nextIndex={topics.length}
          onClose={() => setShowCreateTopic(false)}
          onCreated={loadTopics}
        />
      )}

      {/* ── Edit Topic markdown dialog ── */}
      {editTopicDialog && (
        <EditTopicDialog
          topic={editTopicDialog}
          onClose={() => setEditTopicDialog(null)}
          onSaved={loadTopics}
        />
      )}

      {/* ── Create Quiz dialog ── */}
      {showCreateQuiz && topics.length > 0 && (
        <CreateQuizDialog
          topics={topics}
          onClose={() => setShowCreateQuiz(false)}
          onCreated={loadTopics}
        />
      )}
    </div>
  );
}
