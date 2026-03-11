'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, BookOpen, Image as ImageIcon, Video, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface TopicResult {
  id: string;
  title: string;
  chapter_title: string;
  subject: string;
  grade: string;
  has_content: boolean;
}
interface ImageResult {
  id: string;
  file_name: string;
  file_path: string;
  alt_text: string;
  caption: string;
  topic_title: string | null;
  chapter_title: string;
}
interface VideoResult {
  id: string;
  title: string;
  youtube_id: string;
  youtube_url: string;
  channel_name: string;
  description: string;
  topic_title: string | null;
}
interface SearchResults {
  topics: TopicResult[];
  images: ImageResult[];
  videos: VideoResult[];
  total: number;
}

/* ─── Search content ─────────────────────────────────────────────────────── */
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('topics');

  /* Debounce input */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* Update URL param */
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    router.replace(`/dashboard/search${debouncedQ ? `?${params}` : ''}`);
  }, [debouncedQ, router]);

  /* Fetch results */
  const fetchResults = useCallback(async () => {
    if (!debouncedQ) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}&type=all`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const topicsCount = results?.topics.length ?? 0;
  const imagesCount = results?.images.length ?? 0;
  const videosCount = results?.videos.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Search bar */}
      <div>
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, images, videos…"
            className="pl-9 pr-9 h-11 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Loader2 className="h-4 w-4 animate-spin" />Searching…
        </div>
      )}

      {/* Empty state */}
      {!debouncedQ && !loading && (
        <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Type to search across topics, images, and videos</p>
        </div>
      )}

      {/* No results */}
      {debouncedQ && !loading && results && results.total === 0 && (
        <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p className="font-medium">No results for &ldquo;{debouncedQ}&rdquo;</p>
          <p className="mt-1">Try different keywords or check spelling</p>
        </div>
      )}

      {/* Results */}
      {results && results.total > 0 && !loading && (
        <>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {results.total} result{results.total !== 1 ? 's' : ''} for <strong>&ldquo;{debouncedQ}&rdquo;</strong>
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="topics" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />Topics
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{topicsCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />Images
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{imagesCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5">
                <Video className="h-3.5 w-3.5" />Videos
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{videosCount}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Topics */}
            <TabsContent value="topics" className="mt-4 space-y-2">
              {topicsCount === 0 ? (
                <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No topics found</p>
              ) : results.topics.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/topics/${t.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] p-4 hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-snug">{t.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {t.subject} {t.grade} &mdash; {t.chapter_title}
                    </p>
                  </div>
                  {t.has_content && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">AI Ready</Badge>
                  )}
                </Link>
              ))}
            </TabsContent>

            {/* Images */}
            <TabsContent value="images" className="mt-4">
              {imagesCount === 0 ? (
                <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No images found</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.images.map((img) => (
                    <div key={img.id} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                      {img.file_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.file_path} alt={img.alt_text ?? img.file_name} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-[hsl(var(--muted))] flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{img.alt_text || img.file_name}</p>
                        {img.caption && <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{img.caption}</p>}
                        <p className="text-[10px] text-[hsl(var(--primary))] mt-1 truncate">{img.chapter_title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Videos */}
            <TabsContent value="videos" className="mt-4 space-y-3">
              {videosCount === 0 ? (
                <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No videos found</p>
              ) : results.videos.map((v) => (
                <a
                  key={v.id}
                  href={v.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-xl border border-[hsl(var(--border))] p-3 hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  {v.youtube_id && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                      alt={v.title}
                      className="h-16 w-28 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-snug">{v.title}</p>
                    {v.channel_name && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{v.channel_name}</p>
                    )}
                    {v.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">{v.description}</p>
                    )}
                    {v.topic_title && (
                      <Badge variant="secondary" className="mt-1.5 text-[10px]">{v.topic_title}</Badge>
                    )}
                  </div>
                </a>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
