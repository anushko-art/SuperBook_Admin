'use client';

import { MindMapRenderer } from './MindMapRenderer';
import { FlowchartRenderer } from './FlowchartRenderer';
import { ComparisonTableRenderer } from './ComparisonTableRenderer';
import { InfographicRenderer } from './InfographicRenderer';

export interface VisualSchema {
  componentType:
    | 'MIND_MAP_GENERATION'
    | 'FLOWCHART_GENERATION'
    | 'COMPARISON_TABLE'
    | 'INFOGRAPHIC_GENERATION'
    | string;
  fidelity?: string;
  data: Record<string, unknown>;
  style_constraints?: Record<string, string>;
}

interface Props {
  schema: VisualSchema;
  className?: string;
}

export function VisualRenderer({ schema, className }: Props) {
  const { componentType, data } = schema;

  const inner = (() => {
    switch (componentType) {
      case 'MIND_MAP_GENERATION':
        return <MindMapRenderer data={data as unknown as Parameters<typeof MindMapRenderer>[0]['data']} />;
      case 'FLOWCHART_GENERATION':
        return <FlowchartRenderer data={data as unknown as Parameters<typeof FlowchartRenderer>[0]['data']} />;
      case 'COMPARISON_TABLE':
        return <ComparisonTableRenderer data={data as unknown as Parameters<typeof ComparisonTableRenderer>[0]['data']} />;
      case 'INFOGRAPHIC_GENERATION':
        return <InfographicRenderer data={data as unknown as Parameters<typeof InfographicRenderer>[0]['data']} />;
      default:
        return (
          <div className="p-4 text-sm text-[hsl(var(--muted-foreground))] text-center">
            Unknown visual type: <code className="font-mono">{componentType}</code>
          </div>
        );
    }
  })();

  return (
    <div className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden ${className ?? ''}`}>
      {/* Header badge */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)]">
        <span className="text-[10px] font-mono font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          {componentType.replace(/_GENERATION$/, '').replace(/_/g, ' ')}
        </span>
        <span className="text-[9px] text-[hsl(var(--muted-foreground))] opacity-60">
          Nano-Banana Visual
        </span>
      </div>
      {inner}
    </div>
  );
}
