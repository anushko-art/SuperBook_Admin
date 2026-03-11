'use client';

import Image from 'next/image';

interface GalleryImage {
  path: string;
  caption: string;
  relevance: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  if (!images.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {images.map((img, i) => (
        <div
          key={img.path}
          className="rounded-lg border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--muted)/0.3)] overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Image container — fixed height, object-contain for diagrams */}
          <div className="relative h-32 bg-[hsl(var(--muted)/0.2)]">
            <Image
              src={img.path}
              alt={img.caption}
              fill
              style={{ objectFit: 'contain' }}
              sizes="(max-width: 640px) 50vw, 33vw"
              loading="lazy"
            />
            {/* Relevance badge */}
            <div className="absolute bottom-1 right-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              {Math.round(img.relevance * 100)}%
            </div>
          </div>

          {/* Caption */}
          <div className="px-2 py-1.5">
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic leading-tight line-clamp-2">
              Fig {i + 1}: {img.caption}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
