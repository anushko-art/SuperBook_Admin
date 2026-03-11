'use client';

import {
  Atom, Beaker, BookOpen, Brain, Calculator, ChevronRight,
  Dna, FlaskConical, Globe, Lightbulb, Microscope, Sparkles,
  Zap, Target, Layers, Activity, Star,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  atom: <Atom className="h-5 w-5" />,
  beaker: <Beaker className="h-5 w-5" />,
  book: <BookOpen className="h-5 w-5" />,
  brain: <Brain className="h-5 w-5" />,
  calculator: <Calculator className="h-5 w-5" />,
  dna: <Dna className="h-5 w-5" />,
  flask: <FlaskConical className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
  microscope: <Microscope className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  layers: <Layers className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  electron_icon: <Atom className="h-5 w-5" />,
  microscope_icon: <Microscope className="h-5 w-5" />,
  default: <ChevronRight className="h-5 w-5" />,
};

const CARD_COLORS = [
  'bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-700   text-blue-700   dark:text-blue-300',
  'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300',
  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-700  text-green-700  dark:text-green-300',
  'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300',
  'bg-teal-50   dark:bg-teal-900/20   border-teal-200   dark:border-teal-700   text-teal-700   dark:text-teal-300',
  'bg-rose-50   dark:bg-rose-900/20   border-rose-200   dark:border-rose-700   text-rose-700   dark:text-rose-300',
];

interface InfographicSection {
  id: string;
  title: string;
  content: string;
  icon?: string;
  highlight?: string;
}

interface InfographicData {
  title?: string;
  layout?: string;
  sections: InfographicSection[];
}

export function InfographicRenderer({ data }: { data: InfographicData }) {
  const { title, sections, layout } = data;
  const isListView = layout === 'list_view';

  return (
    <div className="p-4">
      {title && (
        <h3 className="text-base font-bold text-center mb-5 text-[hsl(var(--foreground))]">{title}</h3>
      )}

      {isListView ? (
        <div className="space-y-3">
          {sections.map((sec, i) => {
            const colorClass = CARD_COLORS[i % CARD_COLORS.length];
            const icon = ICON_MAP[sec.icon ?? ''] ?? ICON_MAP.default;

            return (
              <div key={sec.id} className={`flex gap-3 rounded-xl border ${colorClass} p-4`}>
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{sec.title}</p>
                  <p className="text-xs opacity-80 leading-relaxed">
                    {sec.content}
                    {sec.highlight && (
                      <strong className="ml-1 font-semibold">{sec.highlight}</strong>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* grid_cards (default) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((sec, i) => {
            const colorClass = CARD_COLORS[i % CARD_COLORS.length];
            const icon = ICON_MAP[sec.icon ?? ''] ?? ICON_MAP.default;

            return (
              <div key={sec.id} className={`rounded-xl border ${colorClass} p-4 flex flex-col gap-2`}>
                <div className="flex items-center gap-2">
                  <div className="shrink-0">{icon}</div>
                  <p className="font-semibold text-sm leading-tight">{sec.title}</p>
                </div>
                <p className="text-xs opacity-80 leading-relaxed flex-1">{sec.content}</p>
                {sec.highlight && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-current/10 px-2 py-0.5 rounded-full self-start">
                    {sec.highlight}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
