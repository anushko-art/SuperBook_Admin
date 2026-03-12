'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save, Eye, Edit3, Images, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// CodeMirror loaded client-side only (SSR-incompatible)
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });
import { markdown as mdLang } from '@codemirror/lang-markdown';

interface FolderData {
  folder: string;
  folder_path: string;
  images: string[];
  all_files: string[];
  markdown: string | null;
  exercises: string | null;
  chapter_title: string;
}

/* ─── Photo gallery modal ────────────────────────────────────────────────── */
function PhotoGallery({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-white text-sm font-medium">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[idx]}
          alt={`Page ${idx + 1}`}
          className="max-h-full max-w-full object-contain rounded shadow-2xl"
        />
      </div>
      <div className="flex items-center justify-center gap-3 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="sm" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
          className="bg-white/10 text-white border-white/20 hover:bg-white/20">← Prev</Button>
        <div className="flex gap-1 max-w-[200px] overflow-x-auto">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img} alt="" onClick={() => setIdx(i)}
              className={`h-10 w-10 object-cover rounded cursor-pointer transition-all shrink-0 ${i === idx ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'}`} />
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))} disabled={idx === images.length - 1}
          className="bg-white/10 text-white border-white/20 hover:bg-white/20">Next →</Button>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function DocViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<FolderData | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  useEffect(() => {
    fetch(`/api/admin/uploads/${id}/files`)
      .then((r) => r.json())
      .then((d: FolderData) => {
        setData(d);
        setContent(d.markdown ?? '');
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load document');
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save markdown content back to the chapter in DB
      const res = await fetch(`/api/admin/uploads/${id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Document saved');
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading document…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-[hsl(var(--muted-foreground))]">Document not found</div>
      </div>
    );
  }

  const Editor = (
    <div className="h-full overflow-hidden flex flex-col">
      <CodeMirror
        value={content}
        height="100%"
        extensions={[mdLang()]}
        onChange={(val) => setContent(val)}
        theme="dark"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
        }}
        style={{ height: '100%', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}
      />
    </div>
  );

  const Preview = (
    <div className="h-full overflow-y-auto p-6">
      <div className="prose max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content || '*No content yet*'}
        </ReactMarkdown>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <Link href="/admin/content">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </Button>
        </Link>
        <div className="h-4 w-px bg-[hsl(var(--border))]" />
        <span className="text-sm font-medium truncate max-w-[200px]">{data.chapter_title}</span>
        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate max-w-[160px]">{data.folder}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-[hsl(var(--border))] overflow-hidden">
            {[
              { val: 'editor', icon: Edit3, label: 'Editor' },
              { val: 'split',  icon: null,  label: 'Split' },
              { val: 'preview',icon: Eye,   label: 'Preview' },
            ].map(({ val, icon: Icon, label }) => (
              <button
                key={val}
                onClick={() => setViewMode(val as typeof viewMode)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors ${
                  viewMode === val
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>

          {/* Photo gallery */}
          {data.images.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowGallery(true)}>
              <Images className="h-3.5 w-3.5" />{data.images.length} images
            </Button>
          )}

          {/* Save */}
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Exercises tab strip */}
      {data.exercises && (
        <div className="shrink-0">
          <Tabs defaultValue="content">
            <TabsList className="rounded-none border-b border-[hsl(var(--border))] h-8 px-3">
              <TabsTrigger value="content" className="text-xs h-6">Content</TabsTrigger>
              <TabsTrigger value="exercises" className="text-xs h-6">Exercises</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-0">
              {/* main content below */}
            </TabsContent>
            <TabsContent value="exercises" className="mt-0 p-4 overflow-y-auto max-h-64">
              <div className="prose max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {data.exercises}
                </ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Main resizable area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'editor' && (
          <div className="h-full">{Editor}</div>
        )}
        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto">{Preview}</div>
        )}
        {viewMode === 'split' && (
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={20}>
              {Editor}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              {Preview}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Photo gallery overlay */}
      {showGallery && data.images.length > 0 && (
        <PhotoGallery images={data.images} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}
