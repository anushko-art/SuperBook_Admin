'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Upload, Loader2, X, FileText, ImageIcon, BookMarked,
  ChevronRight, Trash2, RefreshCw, Eye,
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
import MarkdownRenderer from '@/components/MarkdownRenderer';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface RefBook    { id: string; name: string; author: string | null; publisher: string | null; subject: string | null }
interface RefChapter { id: string; reference_book_id: string; name: string; markdown_text: string | null }
interface RefImage   { id: string; image_path: string; storage_url: string | null; caption: string | null; page: number | null }

/* ─── Subject chips (same as textbook) ──────────────────────────────────── */
const SUBJECT_OPTIONS = [
  { label: 'Phy',  value: 'Physics' },
  { label: 'Bio',  value: 'Biology' },
  { label: 'Chem', value: 'Chemistry' },
  { label: 'Math', value: 'Mathematics' },
];

/* ─── Add New Book dialog ────────────────────────────────────────────────── */
function AddBookDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,      setName]      = useState('');
  const [subject,   setSubject]   = useState('');
  const [author,    setAuthor]    = useState('');
  const [publisher, setPublisher] = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Book name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/reference-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), subject: subject || null, author: author || null, publisher: publisher || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Reference book created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-[hsl(var(--primary))]" />Add New Book
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Book Name <span className="text-[hsl(var(--destructive))]">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. H.C. Verma Vol. 1" className="h-8 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Subject</label>
            <div className="flex gap-1.5 flex-wrap">
              {SUBJECT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSubject(subject === s.value ? '' : s.value)}
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Author</label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. H.C. Verma" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Publisher</label>
            <Input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="e.g. Bharati Bhawan" className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Creating…</> : 'Create Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Add Chapter dialog ─────────────────────────────────────────────────── */
function AddChapterDialog({ bookId, onClose, onCreated }: { bookId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Chapter name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/reference-books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Chapter created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />Add Chapter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Chapter name <span className="text-[hsl(var(--destructive))]">*</span></label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chapter 1: Vector Quantities" className="h-8 text-sm" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Creating…</> : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main tab ───────────────────────────────────────────────────────────── */
export default function ReferenceBooksTab() {
  const [books,          setBooks]          = useState<RefBook[]>([]);
  const [chapters,       setChapters]       = useState<RefChapter[]>([]);
  const [images,         setImages]         = useState<RefImage[]>([]);
  const [selectedBook,   setSelectedBook]   = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [previewImage,   setPreviewImage]   = useState<RefImage | null>(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingImages,   setLoadingImages]   = useState(false);

  /* dialogs */
  const [showAddBook,    setShowAddBook]    = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);

  /* upload state */
  const [uploadingText,  setUploadingText]  = useState(false);
  const [imageFiles,     setImageFiles]     = useState<File[]>([]);
  const [dictFile,       setDictFile]       = useState<File | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* delete confirm */
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  /* ── loaders ── */
  const loadBooks = useCallback(() => {
    fetch('/api/reference-books').then(r => r.json()).then(d => setBooks(d.books ?? []));
  }, []);
  useEffect(() => { loadBooks(); }, [loadBooks]);

  const loadChapters = useCallback(async () => {
    setChapters([]); setSelectedChapter(''); setImages([]); setPreviewImage(null);
    if (!selectedBook) return;
    setLoadingChapters(true);
    try {
      const d = await fetch(`/api/reference-books/${selectedBook}/chapters`).then(r => r.json());
      setChapters(d.chapters ?? []);
    } finally { setLoadingChapters(false); }
  }, [selectedBook]);
  useEffect(() => { loadChapters(); }, [loadChapters]);

  const loadImages = useCallback(async () => {
    setImages([]); setPreviewImage(null);
    if (!selectedChapter) return;
    setLoadingImages(true);
    try {
      const d = await fetch(`/api/reference-chapters/${selectedChapter}/images`).then(r => r.json());
      setImages(d.images ?? []);
    } finally { setLoadingImages(false); }
  }, [selectedChapter]);
  useEffect(() => { loadImages(); }, [loadImages]);

  const activeBook    = books.find(b => b.id === selectedBook) ?? null;
  const activeChapter = chapters.find(c => c.id === selectedChapter) ?? null;

  /* ── Upload text ── */
  const handleTextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChapter) return;
    e.target.value = '';
    setUploadingText(true);
    try {
      const text = await file.text();
      const res = await fetch(`/api/reference-chapters/${selectedChapter}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown_text: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setChapters(prev => prev.map(c => c.id === selectedChapter ? { ...c, markdown_text: text } : c));
      toast.success('Text content saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploadingText(false); }
  };

  /* ── Upload images ── */
  const handleImageUpload = async () => {
    if (!selectedChapter || imageFiles.length === 0) return;
    setUploadingImages(true);
    try {
      const fd = new FormData();
      imageFiles.forEach(f => fd.append('files', f));
      if (dictFile) fd.append('dict', dictFile);
      const res = await fetch(`/api/reference-chapters/${selectedChapter}/images`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${data.uploaded} image${data.uploaded !== 1 ? 's' : ''}`);
      setImageFiles([]);
      setDictFile(null);
      loadImages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploadingImages(false); }
  };

  /* ── Delete chapter ── */
  const deleteChapter = async (id: string) => {
    try {
      const res = await fetch(`/api/reference-chapters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setChapters(prev => prev.filter(c => c.id !== id));
      if (selectedChapter === id) { setSelectedChapter(''); setImages([]); }
      toast.success('Chapter deleted');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    setDeletingChapterId(null);
  };

  return (
    <div className="space-y-4 mt-3">

      {/* ── Selector bar ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Book box */}
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm">
          <Select value={selectedBook || '__none__'} onValueChange={v => setSelectedBook(v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-8 w-56 text-sm border-0 shadow-none px-2 focus:ring-0">
              <SelectValue placeholder="Book…" />
            </SelectTrigger>
            <SelectContent>
              {books.length === 0
                ? <SelectItem value="__empty__" disabled className="text-sm text-[hsl(var(--muted-foreground))]">No books yet</SelectItem>
                : books.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-sm">
                    {b.name}{b.subject ? ` — ${b.subject}` : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
            title="Add book" onClick={() => setShowAddBook(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Chapters box */}
        {selectedBook && (
          <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm">
            <Select value={selectedChapter || '__none__'} onValueChange={v => setSelectedChapter(v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 w-52 text-sm border-0 shadow-none px-2 focus:ring-0">
                <SelectValue placeholder="Chapters…" />
              </SelectTrigger>
              <SelectContent>
                {loadingChapters
                  ? <SelectItem value="__loading__" disabled className="text-sm">Loading…</SelectItem>
                  : chapters.length === 0
                    ? <SelectItem value="__empty__" disabled className="text-sm text-[hsl(var(--muted-foreground))]">No chapters yet</SelectItem>
                    : chapters.map((c, i) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {i + 1}. {c.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
              title="Add chapter" onClick={() => setShowAddChapter(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={loadChapters}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!selectedBook && (
        <div className="py-24 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Select a reference book, or click <strong>+</strong> to add one.</p>
        </div>
      )}

      {/* ── Active book + chapter header ── */}
      {activeBook && (
        <div className="flex items-center gap-2.5 flex-wrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 shadow-sm">
          <BookMarked className="h-4 w-4 text-[hsl(var(--primary))] shrink-0" />
          <span className="text-base font-bold">{activeBook.name}</span>
          {activeBook.subject && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-medium">{activeBook.subject}</Badge>
          )}
          {activeBook.author && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">by {activeBook.author}</span>
          )}
          {activeChapter && (
            <>
              <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <span className="text-base font-semibold">{activeChapter.name}</span>
            </>
          )}
        </div>
      )}

      {/* ── Upload section (when chapter selected) ── */}
      {selectedChapter && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">Upload</p>
          <div className="flex flex-wrap gap-2 items-start">

            {/* Upload Text */}
            <label className={`flex items-center gap-2 text-xs cursor-pointer border rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors font-medium ${uploadingText ? 'opacity-60 pointer-events-none' : ''}`}>
              {uploadingText
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              Upload Text
              <input type="file" accept=".md,.txt" className="sr-only" onChange={handleTextUpload} disabled={uploadingText} />
            </label>

            {/* Upload Images */}
            <label className="flex items-center gap-2 text-xs cursor-pointer border rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors font-medium">
              <ImageIcon className="h-3.5 w-3.5" />
              Upload Image{imageFiles.length > 0 ? ` (${imageFiles.length})` : ''}
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="sr-only"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  setImageFiles(prev => { const s = new Set(prev.map(f => f.name)); return [...prev, ...files.filter(f => !s.has(f.name))]; });
                  e.target.value = '';
                }} />
            </label>

            {/* Upload image_dict */}
            <label className={`flex items-center gap-2 text-xs cursor-pointer border rounded-lg px-4 py-2 hover:bg-[hsl(var(--accent))] transition-colors font-medium ${dictFile ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : ''}`}>
              <FileText className="h-3.5 w-3.5" />
              {dictFile ? dictFile.name : 'Upload image_dict'}
              <input type="file" accept=".json" className="sr-only"
                onChange={e => { setDictFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>

            {/* Upload button */}
            {imageFiles.length > 0 && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleImageUpload} disabled={uploadingImages}>
                {uploadingImages
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</>
                  : <><Upload className="h-3.5 w-3.5" />Upload {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''}</>}
              </Button>
            )}

            {/* Clear queued files */}
            {(imageFiles.length > 0 || dictFile) && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-[hsl(var(--muted-foreground))]"
                onClick={() => { setImageFiles([]); setDictFile(null); }}>
                <X className="h-3.5 w-3.5 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Queued image names */}
          {imageFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {imageFiles.map(f => (
                <span key={f.name} className="inline-flex items-center gap-1 text-[10px] font-mono border border-[hsl(var(--border))] rounded px-1.5 py-0.5 bg-[hsl(var(--muted))]">
                  {f.name}
                  <button onClick={() => setImageFiles(prev => prev.filter(x => x.name !== f.name))} className="hover:text-[hsl(var(--destructive))]">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3-panel layout ── */}
      {selectedBook && (
        <div className="grid lg:grid-cols-3 gap-4" style={{ minHeight: 500 }}>

          {/* Panel 1: Chapter List */}
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
            <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider">
                Chapter List {chapters.length > 0 && <span className="font-normal text-[hsl(var(--muted-foreground))]">({chapters.length})</span>}
              </p>
              {loadingChapters && <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--muted-foreground))]" />}
            </div>
            {chapters.length === 0 && !loadingChapters ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))] p-4">
                <FileText className="h-8 w-8 opacity-20" />
                <p className="text-center">No chapters. Click <strong>+</strong> to add one.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border)/0.5)]">
                {chapters.map((c, i) => {
                  const isSelected = selectedChapter === c.id;
                  return (
                    <div key={c.id}
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[hsl(var(--accent)/0.5)] group transition-colors ${isSelected ? 'bg-[hsl(var(--accent))] border-l-2 border-l-[hsl(var(--primary))]' : ''}`}
                      onClick={() => setSelectedChapter(c.id)}
                    >
                      <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono w-5 shrink-0 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.markdown_text && (
                            <span className="text-[9px] text-blue-500">{(c.markdown_text.length / 1000).toFixed(1)}k chars</span>
                          )}
                        </div>
                      </div>
                      {/* Delete */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                        {deletingChapterId === c.id ? (
                          <div className="flex gap-0.5">
                            <button onClick={() => deleteChapter(c.id)} className="h-5 px-1 rounded text-[9px] font-semibold bg-red-500 text-white">Del</button>
                            <button onClick={() => setDeletingChapterId(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-[hsl(var(--accent))]"><X className="h-2.5 w-2.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingChapterId(c.id)}
                            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel 2: Mini Preview */}
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
            <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <p className="text-xs font-semibold uppercase tracking-wider">Mini Preview</p>
              {activeChapter && (
                <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[140px]">{activeChapter.name}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {!selectedChapter ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <Eye className="h-8 w-8 opacity-20" />
                  <p>Select a chapter to preview</p>
                </div>
              ) : !activeChapter?.markdown_text ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <FileText className="h-8 w-8 opacity-20" />
                  <p className="text-center font-medium">{activeChapter?.name}</p>
                  <p>No text content yet.</p>
                  <p className="text-[10px]">Use <strong>Upload Text</strong> above to add markdown.</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                  <MarkdownRenderer content={activeChapter.markdown_text} />
                </div>
              )}
            </div>
          </div>

          {/* Panel 3: Image Preview */}
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden flex flex-col">
            <div className="bg-[hsl(var(--muted))] px-3 py-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />Image Preview
              </p>
              {images.length > 0 && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{images.length} image{images.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              {!selectedChapter ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">
                  Select a chapter
                </div>
              ) : loadingImages ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
                </div>
              ) : images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))] p-4">
                  <ImageIcon className="h-8 w-8 opacity-20" />
                  <p className="text-center">No images yet. Use <strong>Upload Image</strong> above.</p>
                </div>
              ) : (
                <>
                  {/* Large preview of selected image */}
                  {previewImage && (
                    <div className="p-3 border-b border-[hsl(var(--border))]">
                      <div className="rounded-lg overflow-hidden bg-[hsl(var(--muted))] aspect-video flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewImage.storage_url ?? `/uploads/reference/${selectedChapter}/${previewImage.image_path}`}
                          alt={previewImage.caption ?? previewImage.image_path}
                          className="max-h-full max-w-full object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      {previewImage.caption && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 flex items-start gap-1">
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />{previewImage.caption}
                        </p>
                      )}
                      {previewImage.page && (
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Page {previewImage.page}</p>
                      )}
                    </div>
                  )}

                  {/* Image thumbnails grid */}
                  <div className="p-2 grid grid-cols-3 gap-1.5 overflow-y-auto">
                    {images.map(img => (
                      <button
                        key={img.id}
                        onClick={() => setPreviewImage(previewImage?.id === img.id ? null : img)}
                        className={`rounded-md overflow-hidden aspect-square bg-[hsl(var(--muted))] flex items-center justify-center border-2 transition-colors ${
                          previewImage?.id === img.id ? 'border-[hsl(var(--primary))]' : 'border-transparent hover:border-[hsl(var(--border))]'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.storage_url ?? `/uploads/reference/${selectedChapter}/${img.image_path}`}
                          alt={img.caption ?? img.image_path}
                          className="w-full h-full object-cover"
                          onError={e => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.parentElement!.innerHTML = `<span class="text-[9px] text-center p-1 text-muted-foreground">${img.image_path}</span>`;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Dialogs */}
      {showAddBook    && <AddBookDialog    onClose={() => setShowAddBook(false)}    onCreated={loadBooks} />}
      {showAddChapter && selectedBook && (
        <AddChapterDialog bookId={selectedBook} onClose={() => setShowAddChapter(false)} onCreated={loadChapters} />
      )}
    </div>
  );
}
