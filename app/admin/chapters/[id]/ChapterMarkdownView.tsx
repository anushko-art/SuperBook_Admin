'use client';

import MarkdownRenderer from '@/components/MarkdownRenderer';

export function ChapterMarkdownView({
  content,
  imageBaseUrl,
}: {
  content: string;
  imageBaseUrl?: string;
}) {
  return <MarkdownRenderer content={content} imageBaseUrl={imageBaseUrl} />;
}

/** Client component for image thumbnails with error fallback */
export function ImageThumb({
  src,
  alt,
  filename,
}: {
  src: string | null;
  alt: string;
  filename: string;
}) {
  if (!src) {
    return (
      <div className="w-full aspect-square bg-[hsl(var(--muted))] flex items-center justify-center">
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">no preview</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full aspect-square object-cover bg-[hsl(var(--muted))]"
      loading="lazy"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        const fallback = el.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = 'flex';
      }}
    />
  );
}
