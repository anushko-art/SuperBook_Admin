'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ImageIcon } from 'lucide-react';
import { ImageDetailDialog, type ImageRecord } from './ImageDetailDialog';

/** Rewrite legacy /uploads/chapters/… paths to Supabase Storage URL. */
function resolveThumbSrc(src: string | null): string | null {
  if (!src) return null;
  if (!src.startsWith('/uploads/chapters/')) return src;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return src;
  const rest = src.replace('/uploads/', '');
  return `${supabaseUrl}/storage/v1/object/public/chapter-images/${rest}`;
}

interface Props {
  images: ImageRecord[];
  chapterId: string;
}

export function ImagesTabClient({ images: initialImages }: Props) {
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [selected, setSelected] = useState<ImageRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Cache-bust map: image id → timestamp string appended to src
  const [cacheBusters, setCacheBusters] = useState<Record<string, number>>({});

  const handleOpen = useCallback((img: ImageRecord) => {
    setSelected(img);
    setDialogOpen(true);
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setDialogOpen(false);
  }, []);

  const handleSaved = useCallback((id: string, altText: string) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, alt_text: altText } : img));
  }, []);

  const handleReuploaded = useCallback((id: string) => {
    setCacheBusters((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] p-8 text-center">
        <ImageIcon className="h-10 w-10 mx-auto opacity-20 mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          No images for this chapter. Upload images via the Textbooks page.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-[hsl(var(--border))] p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => handleOpen(img)}
              className="border border-[hsl(var(--border))] rounded-lg overflow-hidden group text-left hover:border-[hsl(var(--primary))] hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square bg-[hsl(var(--muted))]">
                {img.file_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(() => {
                      const base = resolveThumbSrc(img.file_path);
                      return cacheBusters[img.id] ? `${base}?t=${cacheBusters[img.id]}` : base ?? undefined;
                    })()}
                    alt={img.alt_text ?? img.filename}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      const fb = el.nextElementSibling as HTMLElement | null;
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full items-center justify-center absolute inset-0"
                  style={{ display: img.file_path ? 'none' : 'flex' }}
                >
                  <ImageIcon className="h-6 w-6 opacity-20" />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[hsl(var(--primary)/0.08)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-[hsl(var(--primary))] bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded-full">
                    View
                  </span>
                </div>
              </div>

              {/* Caption */}
              <div className="p-2">
                <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate" title={img.filename}>
                  {img.filename}
                </p>
                {img.topic_title && (
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))] truncate mt-0.5" title={img.topic_title}>
                    {img.topic_title}
                  </p>
                )}
                <Badge variant="outline" className="text-[8px] h-3.5 px-1 mt-1">
                  {img.source === 'learning_images' ? 'uploaded' : 'legacy'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <ImageDetailDialog
        image={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDeleted={handleDeleted}
        onSaved={handleSaved}
        onReuploaded={handleReuploaded}
      />
    </>
  );
}
