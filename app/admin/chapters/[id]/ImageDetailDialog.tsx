'use client';

import { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Upload, Sparkles, Save, Trash2, Loader2,
  ImageIcon, BookOpen, AlertCircle, CheckCircle2, ClipboardPaste,
} from 'lucide-react';

export interface ImageRecord {
  id: string;
  filename: string;
  file_path: string | null;
  alt_text: string | null;
  topic_title: string | null;
  source: 'chapter_images' | 'learning_images';
  chapter_id: string;
}

interface Props {
  image: ImageRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: (id: string) => void;
  onSaved: (id: string, altText: string) => void;
  /** Called after a successful re-upload so parent can cache-bust the thumbnail */
  onReuploaded?: (id: string) => void;
}

type Status =
  | { type: 'idle' }
  | { type: 'loading'; msg: string }
  | { type: 'success'; msg: string }
  | { type: 'error'; msg: string };

// ── Inner content component receives non-null image ───────────────────────────
function DialogContent({
  image,
  onOpenChange,
  onDeleted,
  onSaved,
  onReuploaded,
}: {
  image: ImageRecord;
  onOpenChange: (v: boolean) => void;
  onDeleted: (id: string) => void;
  onSaved: (id: string, altText: string) => void;
  onReuploaded?: (id: string) => void;
}) {
  const [altText, setAltText] = useState(image.alt_text ?? '');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLegacy = image.source === 'chapter_images';
  const displaySrc = previewUrl ?? image.file_path ?? '';
  const isLoading = status.type === 'loading';

  // ── Clipboard paste listener ────────────────────────────────────────────────
  useEffect(() => {
    if (isLegacy) return;

    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          // Rename the file blob to keep the original filename
          const renamed = new File([file], image.filename, { type: file.type });
          setReuploadFile(renamed);
          setPreviewUrl(URL.createObjectURL(renamed));
          setStatus({ type: 'idle' });
          setPasteHint(false);
          e.preventDefault();
          break;
        }
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isLegacy, image.filename]);

  // Revoke object URL on unmount / when replaced
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── AI Generate ─────────────────────────────────────────────────────────────
  async function handleAiGenerate() {
    setStatus({ type: 'loading', msg: 'Analyzing image with Gemini Vision…' });
    try {
      const res = await fetch(`/api/admin/images/${image.id}/ai-alt`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI generation failed');
      setAltText(json.alt_text ?? '');
      setDescription(json.description ?? '');
      setCaption(json.caption ?? '');
      setStatus({ type: 'success', msg: 'Generated! Review and click Save.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error' });
    }
  }

  // ── Re-upload ────────────────────────────────────────────────────────────────
  function stageFile(file: File) {
    const renamed = file.name !== image.filename
      ? new File([file], image.filename, { type: file.type })
      : file;
    setReuploadFile(renamed);
    setPreviewUrl(URL.createObjectURL(renamed));
    setStatus({ type: 'idle' });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  }

  async function handleReupload() {
    if (!reuploadFile) return;
    setStatus({ type: 'loading', msg: 'Uploading…' });
    const fd = new FormData();
    fd.append('file', reuploadFile, image.filename);
    try {
      const res = await fetch(`/api/admin/images/${image.id}/reupload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setReuploadFile(null);
      // Switch preview to a cache-busted URL so the new image is shown immediately
      setPreviewUrl(`${image.file_path}?t=${Date.now()}`);
      onReuploaded?.(image.id);
      setStatus({ type: 'success', msg: 'Re-uploaded! Markdown refs preserved.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setStatus({ type: 'loading', msg: 'Saving…' });
    try {
      const res = await fetch(`/api/admin/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: altText, description, caption }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setStatus({ type: 'success', msg: 'Saved!' });
      onSaved(image.id, altText);
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error' });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setStatus({ type: 'loading', msg: 'Deleting…' });
    try {
      const res = await fetch(`/api/admin/images/${image.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDeleted(image.id);
      onOpenChange(false);
    } catch (err) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error' });
    }
  }

  return (
    <>
      {/* Dialog header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          <span className="text-sm font-semibold truncate">{image.filename}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">
            {isLegacy ? 'legacy' : 'uploaded'}
          </Badge>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </Dialog.Close>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left: Image preview + upload controls ── */}
        <div className="w-[45%] shrink-0 bg-[hsl(var(--muted)/0.3)] flex flex-col border-r border-[hsl(var(--border))]">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt={altText || image.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <ImageIcon className="h-12 w-12 opacity-20" />
                <p className="text-xs">No preview available</p>
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="px-4 pb-4 border-t border-[hsl(var(--border))] pt-3 space-y-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {reuploadFile ? (
              /* Staged file: show name + upload/cancel */
              <div className="space-y-2">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] break-all">
                  <span className="font-mono font-medium">{reuploadFile.name}</span>
                  {reuploadFile.name !== image.filename && (
                    <span className="ml-1 text-amber-600">
                      ⚠ Will be saved as <strong>{image.filename}</strong>
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm" className="flex-1 h-7 text-xs"
                    onClick={handleReupload} disabled={isLoading}
                  >
                    {isLoading
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      : <Upload className="h-3 w-3 mr-1" />}
                    Upload
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => { setReuploadFile(null); setPreviewUrl(null); }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* No staged file: show Re-upload + Paste buttons */
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <Button
                    size="sm" variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLegacy}
                  >
                    <Upload className="h-3 w-3 mr-1.5" /> Re-upload
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="flex-1 h-8 text-xs"
                    disabled={isLegacy}
                    onClick={() => setPasteHint(true)}
                    title="Copy an image, then paste with Ctrl+V / Cmd+V"
                  >
                    <ClipboardPaste className="h-3 w-3 mr-1.5" /> Paste
                  </Button>
                </div>
                {pasteHint && !isLegacy && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 text-center animate-pulse">
                    Press Ctrl+V / ⌘+V to paste image from clipboard
                  </p>
                )}
                {isLegacy && (
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))] text-center">
                    Legacy image — re-upload via Textbooks page
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Metadata & actions ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Topic context */}
            <div className="rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Topic</span>
              </div>
              <p className="text-sm font-medium">
                {image.topic_title ?? (
                  <span className="text-[hsl(var(--muted-foreground))] italic text-sm font-normal">
                    Not assigned to a topic
                  </span>
                )}
              </p>
            </div>

            {/* Status banner */}
            {status.type !== 'idle' && (
              <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                status.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700 dark:text-green-300'
                : status.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-700 dark:text-blue-300'
              }`}>
                {status.type === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-px" />}
                {status.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />}
                {status.type === 'error'   && <AlertCircle  className="h-3.5 w-3.5 shrink-0 mt-px" />}
                {status.msg}
              </div>
            )}

            {/* Alt text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Alt Text</label>
              <textarea
                rows={2}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Concise accessibility description…"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              />
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Caption</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Short figure caption…"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Educational Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed educational context for this image…"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              />
            </div>

            {/* Delete */}
            <div className="pt-1 border-t border-[hsl(var(--border))]">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete image
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Delete permanently?</p>
                  <Button
                    size="sm" variant="destructive" className="h-7 text-xs"
                    onClick={handleDelete} disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Yes, delete
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
            <Button
              size="sm" variant="outline" className="flex-1 h-9"
              onClick={handleAiGenerate}
              disabled={isLoading || isLegacy}
              title={isLegacy ? 'Only works with uploaded images' : 'Gemini Vision — auto-fill alt text & description'}
            >
              {isLoading && status.msg.includes('Analyzing')
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              AI Generate
            </Button>
            <Button
              size="sm" className="flex-1 h-9"
              onClick={handleSave} disabled={isLoading}
            >
              {isLoading && status.msg === 'Saving…'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Public wrapper ────────────────────────────────────────────────────────────
export function ImageDetailDialog({ image, open, onOpenChange, onDeleted, onSaved, onReuploaded }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl flex flex-col data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <Dialog.Title className="sr-only">
            {image ? image.filename : 'Image'}
          </Dialog.Title>
          {image && (
            <DialogContent
              key={image.id}
              image={image}
              onOpenChange={onOpenChange}
              onDeleted={onDeleted}
              onSaved={onSaved}
              onReuploaded={onReuploaded}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
