'use client';

import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /**
   * Base URL for resolving bare image filenames.
   * e.g. "/uploads/chapters/abc-123/" so that "img_foo.jpeg"
   * becomes "/uploads/chapters/abc-123/img_foo.jpeg"
   */
  imageBaseUrl?: string;
}

function resolveImageSrc(src: string, baseUrl?: string): string {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:')) return src;
  if (baseUrl) return baseUrl.replace(/\/?$/, '/') + src;
  return src;
}

/**
 * Heuristic: does this string look like actual LaTeX math?
 * Plain-English sentences copied from Ollama responses fail this check,
 * so we don't accidentally wrap them in $$ and send them to KaTeX.
 */
function looksLikeMath(s: string): boolean {
  return (
    /\\[a-zA-Z]/.test(s) ||          // any \command  e.g. \frac, \text, \begin
    /\^[\{0-9a-zA-Z]/.test(s) ||     // superscript   e.g. x^2, x^{n}
    /_[\{0-9a-zA-Z]/.test(s)         // subscript     e.g. x_i, x_{ij}
  );
}

/**
 * Convert LaTeX-style math delimiters to remark-math compatible ones.
 *
 * remark-math v6 only recognises $ and $$ delimiters, so we rewrite:
 *   \[...\]  → $$...$$ (only when content looks like actual LaTeX)
 *   \(...\)  → $...$
 *
 * We intentionally skip \[plain English text\] blocks — Ollama sometimes
 * wraps explanatory callouts in \[...\] for visual effect, and passing
 * those through KaTeX squashes all spaces and italicises every word.
 *
 * Standalone \boxed{expr} lines (outside math) are wrapped in $$...$$.
 */
function preprocessMath(text: string): string {
  // Display math \[...\] — only convert when content is actually LaTeX
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_: string, m: string) => {
    if (looksLikeMath(m)) return `$$\n${m}\n$$`;
    // Plain-text "callout" — strip the \[...\] wrapper and render as normal markdown
    return m.trim();
  });

  // Inline math \(...\) — these are almost always genuine formulas
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_: string, m: string) => `$${m}$`);

  // Standalone \boxed{...} lines that aren't inside a math block
  // e.g.  \boxed{62.2}  on its own line → $$\boxed{62.2}$$
  text = text.replace(/^\\boxed\{([^}]+)\}\s*$/mg, (_: string, m: string) => `$$\\boxed{${m}}$$`);

  return text;
}

export default function MarkdownRenderer({ content, className, imageBaseUrl }: MarkdownRendererProps) {
  const processed = preprocessMath(content);
  return (
    <div
      className={[
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:font-semibold prose-headings:text-[hsl(var(--foreground))]',
        'prose-p:text-[hsl(var(--foreground))] prose-p:leading-relaxed',
        'prose-code:text-[hsl(var(--primary))] prose-code:bg-[hsl(var(--muted))] prose-code:px-1 prose-code:rounded',
        'prose-pre:bg-[hsl(var(--muted))] prose-pre:text-xs',
        '[&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2',
        className ?? '',
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, {
          throwOnError: false,   // never crash — show the raw source instead
          strict: false,         // tolerate non-standard but common LaTeX idioms
          errorColor: 'inherit', // failed math uses normal text color, not red
        }]]}

        components={{
          img: ({ src, alt }) => {
            const resolved = resolveImageSrc(typeof src === 'string' ? src : '', imageBaseUrl);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolved}
                alt={alt ?? ''}
                className="max-w-full h-auto rounded-lg my-4 mx-auto block border border-[hsl(var(--border))]"
                loading="lazy"
              />
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
