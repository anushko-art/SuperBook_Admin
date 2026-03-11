'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { VisualRenderer, type VisualSchema } from '@/components/visuals/VisualRenderer';

interface TopicItem {
  id: string;
  title: string;
  order_index: number;
  has_content: boolean;
  existing_visual?: VisualSchema | null;
}

interface Props {
  topics: TopicItem[];
}

export function GenerateVisualTab({ topics }: Props) {
  const [visuals, setVisuals] = useState<Record<string, VisualSchema>>(() => {
    // Pre-populate from existing visuals passed in props
    const map: Record<string, VisualSchema> = {};
    topics.forEach((t) => {
      if (t.existing_visual) map[t.id] = t.existing_visual;
    });
    return map;
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function generateVisual(topicId: string) {
    setLoading((l) => ({ ...l, [topicId]: true }));
    setErrors((e) => { const n = { ...e }; delete n[topicId]; return n; });

    try {
      const res = await fetch('/api/admin/generate/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      setVisuals((v) => ({ ...v, [topicId]: json.visual_schema as VisualSchema }));
    } catch (err) {
      setErrors((e) => ({ ...e, [topicId]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setLoading((l) => ({ ...l, [topicId]: false }));
    }
  }

  async function generateAll() {
    for (const topic of topics.filter((t) => t.has_content)) {
      await generateVisual(topic.id);
    }
  }

  const topicsWithContent = topics.filter((t) => t.has_content);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Generate visual diagrams (Mind Maps, Flowcharts, Comparison Tables, Infographics)
            from topic content using the Nano-Banana Visual Architect.
          </p>
        </div>
        {topicsWithContent.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={generateAll}
            disabled={Object.values(loading).some(Boolean)}
            className="shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generate All
          </Button>
        )}
      </div>

      {topics.length === 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No topics in this chapter yet.</p>
        </div>
      )}

      {topics.map((topic) => {
        const visual = visuals[topic.id];
        const isLoading = loading[topic.id];
        const error = errors[topic.id];

        return (
          <div key={topic.id} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            {/* Topic header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
              <span className="h-6 w-6 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-xs font-bold text-[hsl(var(--primary))] shrink-0">
                {topic.order_index + 1}
              </span>
              <p className="text-sm font-semibold flex-1 min-w-0 truncate">{topic.title}</p>
              <div className="flex items-center gap-2 shrink-0">
                {!topic.has_content && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">No content</Badge>
                )}
                {visual && (
                  <Badge variant="default" className="text-[10px] h-4 px-1.5">
                    {visual.componentType.replace(/_GENERATION$/, '').replace(/_/g, ' ')}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={visual ? 'outline' : 'default'}
                  className="h-7 text-xs"
                  disabled={isLoading || !topic.has_content}
                  onClick={() => generateVisual(topic.id)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : visual ? (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {isLoading ? 'Generating…' : visual ? 'Regenerate' : 'Generate'}
                </Button>
              </div>
            </div>

            {/* Content area */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[hsl(var(--muted-foreground))]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing content…
              </div>
            )}

            {error && !isLoading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {visual && !isLoading && (
              <div className="p-4">
                <VisualRenderer schema={visual} />
              </div>
            )}

            {!visual && !isLoading && !error && (
              <div className="px-4 py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                {topic.has_content
                  ? 'Click Generate to create a visual diagram for this topic.'
                  : 'Upload markdown content for this topic to enable visual generation.'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
