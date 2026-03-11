'use client';

import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SourceCardSource {
  chapter_num: number;
  chapter_title: string;
  section: string;
  section_title: string;
  part: string;
  image_paths: string[];
  similarity: number;
}

interface SourceCardProps {
  source: SourceCardSource;
}

export function SourceCard({ source }: SourceCardProps) {
  const partLabel = source.part === 'P1' ? 'Part 1' : 'Part 2';

  return (
    <Card className="overflow-hidden border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors">
      <div className="flex items-start gap-2.5 p-3">
        <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug">
            Ch.{source.chapter_num} §{source.section} — {source.section_title}
          </p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
            {source.chapter_title} · {partLabel}
          </p>
          {source.image_paths.length > 0 && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              📸 {source.image_paths.length} figure{source.image_paths.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0 ml-auto tabular-nums">
          {source.similarity}%
        </Badge>
      </div>

      {/* Thumbnail strip — up to 3 images */}
      {source.image_paths.length > 0 && (
        <div className="flex gap-1.5 px-3 pb-3 flex-wrap">
          {source.image_paths.slice(0, 3).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="h-16 rounded object-contain border border-[hsl(var(--border))] bg-white"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </Card>
  );
}
