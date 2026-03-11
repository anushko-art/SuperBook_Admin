'use client';

import { ArrowDown } from 'lucide-react';

const BOX_COLORS: Record<string, string> = {
  rect_box_blue:   'bg-blue-50   dark:bg-blue-900/30   border-blue-400   text-blue-900   dark:text-blue-100',
  rect_box_green:  'bg-green-50  dark:bg-green-900/30  border-green-400  text-green-900  dark:text-green-100',
  rect_box_orange: 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 text-orange-900 dark:text-orange-100',
  rect_box_red:    'bg-red-50    dark:bg-red-900/30    border-red-400    text-red-900    dark:text-red-100',
  rect_box_purple: 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 text-purple-900 dark:text-purple-100',
};

const NODE_TYPE_SHAPE: Record<string, string> = {
  start_end:    'rounded-full px-6',
  process:      'rounded-lg',
  decision:     'rotate-0', // rendered as diamond via CSS clip
  input_output: 'rounded-lg skew-x-[-8deg]',
};

interface FlowNode {
  id: string;
  type?: string;
  text: string;
  subtext?: string;
  visual_style?: string;
}

interface FlowEdge {
  source: string;
  target: string;
  label?: string;
}

interface FlowchartData {
  title?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const { title, nodes, edges } = data;

  // Build edge label map: source → label
  const edgeLabels: Record<string, string> = {};
  edges.forEach((e) => {
    if (e.label) edgeLabels[e.source] = e.label;
  });

  return (
    <div className="flex flex-col items-center gap-1 p-4">
      {title && (
        <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))] mb-3">{title}</p>
      )}

      {nodes.map((node, i) => {
        const colorClass =
          BOX_COLORS[node.visual_style ?? ''] ??
          Object.values(BOX_COLORS)[i % Object.values(BOX_COLORS).length];
        const shapeClass = NODE_TYPE_SHAPE[node.type ?? 'process'] ?? 'rounded-lg';
        const isDecision = node.type === 'decision';
        const edgeLabel = edgeLabels[node.id];

        return (
          <div key={node.id} className="flex flex-col items-center w-full max-w-sm">
            {/* Node box */}
            {isDecision ? (
              /* Diamond shape for decision nodes */
              <div className="relative flex items-center justify-center w-40 h-20">
                <div
                  className="absolute inset-0 rotate-45 rounded-md border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
                />
                <span className="relative z-10 text-xs font-semibold text-yellow-900 dark:text-yellow-100 text-center px-2">
                  {node.text}
                </span>
              </div>
            ) : (
              <div
                className={`w-full border-2 ${colorClass} ${shapeClass} px-4 py-3 text-center shadow-sm`}
              >
                <p className="text-sm font-semibold">{node.text}</p>
                {node.subtext && (
                  <p className="text-xs opacity-70 mt-0.5">{node.subtext}</p>
                )}
              </div>
            )}

            {/* Arrow to next */}
            {i < nodes.length - 1 && (
              <div className="flex flex-col items-center my-1">
                {edgeLabel && (
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium mb-0.5">
                    {edgeLabel}
                  </span>
                )}
                <ArrowDown className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
