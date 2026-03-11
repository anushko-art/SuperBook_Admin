'use client';

import { useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, Video, Plus, Trash2, RefreshCw, Search, Link as LinkIcon, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Textbook { id: string; title: string; subject: string; grade: string }
interface Chapter { id: string; title: string; chapter_number: number; textbook_id: string }
interface Topic { id: string; title: string; order_index: number }
interface LearningImage { id: string; file_name: string; file_path: string; alt_text: string; caption: string; topic_title: string | null; chapter_id: string }
interface LearningVideo { id: string; title: string; youtube_id: string; youtube_url: string; description: string; channel_name: string; duration_seconds: number; topic_title: string | null }

/* ─── Add Video Form ─────────────────────────────────────────────────────── */
function AddVideoForm({ topics, onAdded }: { topics: Topic[]; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [topicId, setTopicId] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, youtube_url: url, topic_id: topicId || undefined, channel_name: channel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Video added');
      setTitle(''); setUrl(''); setTopicId(''); setChannel('');
      onAdded();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAdd} className="rounded-xl border border-[hsl(var(--border))] p-4 space-y-3">
      <p className="font-medium text-sm flex items-center gap-1.5"><Plus className="h-4 w-4" />Add YouTube Video</p>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Video title *" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" required />
        <Input placeholder="YouTube URL *" value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-sm" required />
        <Input placeholder="Channel name" value={channel} onChange={(e) => setChannel(e.target.value)} className="h-8 text-sm" />
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Link to topic (optional)" /></SelectTrigger>
          <SelectContent>
            {topics.map((t) => <SelectItem key={t.id} value={t.id} className="text-sm">{t.order_index + 1}. {t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={loading} className="h-8">{loading ? 'Adding…' : 'Add Video'}</Button>
    </form>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function MediaPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [images, setImages] = useState<LearningImage[]>([]);
  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    fetch('/api/textbooks').then(r => r.json()).then(d => setTextbooks(d.textbooks ?? []));
  }, []);

  useEffect(() => {
    if (!selectedTextbook) { setChapters([]); setSelectedChapter(''); return; }
    fetch(`/api/chapters?textbook_id=${selectedTextbook}`).then(r => r.json()).then(d => setChapters(d.chapters ?? []));
  }, [selectedTextbook]);

  const fetchMedia = useCallback(async () => {
    const [imgRes, vidRes, topicRes] = await Promise.all([
      fetch(selectedChapter ? `/api/admin/images/index?chapter_id=${selectedChapter}` : '/api/admin/images/index'),
      fetch(selectedChapter ? `/api/admin/videos?topic_id=skip` : '/api/admin/videos'),
      selectedChapter ? fetch(`/api/topics?chapter_id=${selectedChapter}`).then(r => r.json()) : Promise.resolve({ topics: [] }),
    ]);
    const imgData = await imgRes.json();
    const vidData = await vidRes.json();
    setImages(imgData.images ?? []);
    setVideos(vidData.videos ?? []);
    setTopics(topicRes.topics ?? []);
  }, [selectedChapter]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const indexImages = async () => {
    setIndexing(true);
    try {
      const res = await fetch('/api/admin/images/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedChapter ? { chapter_id: selectedChapter } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Indexed ${data.indexed} images (${data.skipped} skipped)`);
      await fetchMedia();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIndexing(false);
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await fetch(`/api/admin/videos?id=${id}`, { method: 'DELETE' });
      toast.success('Video removed');
      await fetchMedia();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[hsl(var(--primary))]" />Media Management
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Phase 4 — Index textbook images and link YouTube videos to topics
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedTextbook || '__all__'} onValueChange={v => {
          setSelectedTextbook(v === '__all__' ? '' : v); setSelectedChapter('');
        }}>
          <SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="All textbooks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-sm">All textbooks</SelectItem>
            {textbooks.map(tb => <SelectItem key={tb.id} value={tb.id} className="text-sm">{tb.subject} {tb.grade} — {tb.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedChapter || '__all__'} onValueChange={v => setSelectedChapter(v === '__all__' ? '' : v)} disabled={!selectedTextbook}>
          <SelectTrigger className="h-9 w-60 text-sm"><SelectValue placeholder="All chapters" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-sm">All chapters</SelectItem>
            {chapters.map(c => <SelectItem key={c.id} value={c.id} className="text-sm">Ch. {c.chapter_number} — {c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={indexImages} disabled={indexing}>
          <Database className="h-3.5 w-3.5" />{indexing ? 'Indexing…' : 'Index Images'}
        </Button>
        <Button size="sm" variant="ghost" className="h-9" onClick={fetchMedia}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="images">
        <TabsList>
          <TabsTrigger value="images" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />Images
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{images.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />Videos
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{videos.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Images tab */}
        <TabsContent value="images" className="mt-4">
          {images.length === 0 ? (
            <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No images indexed yet. Click <strong>Index Images</strong> to import from chapter_images.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((img) => (
                <div key={img.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                  {img.file_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.file_path} alt={img.alt_text ?? img.file_name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-[hsl(var(--muted))] flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 opacity-30" />
                    </div>
                  )}
                  <div className="p-1.5">
                    <p className="text-[10px] font-mono truncate text-[hsl(var(--muted-foreground))]">{img.file_name}</p>
                    {img.topic_title && <p className="text-[10px] text-[hsl(var(--primary))] truncate">{img.topic_title}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos tab */}
        <TabsContent value="videos" className="mt-4 space-y-4">
          <AddVideoForm topics={topics} onAdded={fetchMedia} />

          {videos.length === 0 ? (
            <div className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">No videos added yet.</div>
          ) : (
            <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                    {['Thumbnail', 'Title', 'Channel', 'Topic', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent)/0.4)]">
                      <td className="px-3 py-2">
                        {v.youtube_id && (
                          <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt={v.title} className="h-12 w-20 object-cover rounded" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-[hsl(var(--primary))] flex items-center gap-1">
                          {v.title}<LinkIcon className="h-3 w-3 shrink-0" />
                        </a>
                        {v.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1">{v.description}</p>}
                      </td>
                      <td className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">{v.channel_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {v.topic_title ? <Badge variant="secondary" className="text-xs">{v.topic_title}</Badge> : <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteVideo(v.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
