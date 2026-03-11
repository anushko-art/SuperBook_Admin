'use client';

import { Check, X, Scale } from 'lucide-react';

const VISUAL_CUE_ICONS: Record<string, React.ReactNode> = {
  check_vs_cross: null, // handled inline
  scale_icon: <Scale className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />,
};

interface ComparisonRow {
  id: string;
  feature: string;
  item_a: string;
  item_b: string;
  visual_cue?: string;
}

interface ComparisonData {
  title?: string;
  categories: string[];   // [featureLabel, nameA, nameB]
  rows: ComparisonRow[];
}

export function ComparisonTableRenderer({ data }: { data: ComparisonData }) {
  const { title, categories, rows } = data;
  const [featureLabel, nameA, nameB] = categories;

  // Detect boolean-style rows (Yes/No, True/False, Present/Absent)
  const boolTrue = new Set(['yes', 'true', 'present', 'has', 'have', '✓', 'check']);
  const boolFalse = new Set(['no', 'false', 'absent', 'lacks', 'lack', '✗', 'cross']);

  function renderCell(val: string) {
    const lower = val.toLowerCase().trim();
    if (boolTrue.has(lower)) return <Check className="h-4 w-4 text-green-600 mx-auto" />;
    if (boolFalse.has(lower)) return <X className="h-4 w-4 text-red-500 mx-auto" />;
    return <span>{val}</span>;
  }

  return (
    <div className="p-4">
      {title && (
        <h3 className="text-sm font-bold text-center mb-4 text-[hsl(var(--foreground))]">{title}</h3>
      )}

      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)] w-1/3">
                {featureLabel ?? 'Feature'}
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 w-1/3">
                {nameA ?? 'A'}
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 w-1/3">
                {nameB ?? 'B'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-[hsl(var(--border))] last:border-0 ${
                  i % 2 === 0 ? '' : 'bg-[hsl(var(--muted)/0.3)]'
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-[hsl(var(--foreground))] text-xs">
                  {row.feature}
                </td>
                <td className="px-4 py-2.5 text-center text-xs text-[hsl(var(--foreground))]">
                  {renderCell(row.item_a)}
                </td>
                <td className="px-4 py-2.5 text-center text-xs text-[hsl(var(--foreground))]">
                  {renderCell(row.item_b)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />{nameA}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />{nameB}
        </span>
      </div>
    </div>
  );
}
