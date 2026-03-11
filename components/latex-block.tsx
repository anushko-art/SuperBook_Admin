'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexBlockProps {
  latex: string;
  /** Render as inline (span) vs display-block (div) */
  inline?: boolean;
  className?: string;
}

export function LatexBlock({ latex, inline = false, className }: LatexBlockProps) {
  const ref = useRef<HTMLDivElement & HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
        displayMode: !inline,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex, inline]);

  if (inline) {
    return (
      <span
        ref={ref as React.RefObject<HTMLSpanElement>}
        className={className}
        aria-label={latex}
      />
    );
  }

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={[
        'flex justify-center my-3 px-4 py-3 overflow-x-auto',
        'bg-[hsl(var(--muted)/0.5)] rounded-lg border border-[hsl(var(--border))]',
        className ?? '',
      ].join(' ')}
      aria-label={latex}
    />
  );
}
